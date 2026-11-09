require("dotenv").config();
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { createClient } = require("redis");
const userRoute=require("./routes/user");
const blogRoute=require("./routes/blog");
const mongoose=require("mongoose");
const Blog=require("./models/blog");
const cookieParser=require("cookie-parser");
const{checkForAuthenticationCookie}=require("./middlewares/authentication");

const app = express();
const PORT = process.env.PORT || 8000;

// Setup HTTP Server & Socket.io
const server = http.createServer(app);
const io = new Server(server);

io.on("connection", (socket) => {
    console.log("A user connected via WebSocket");
});

// Setup Redis
const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.connect().catch(console.error);

mongoose.connect(process.env.MONGO_URL || "mongodb://localhost:27017/blogapplication")
.then(()=>console.log("MongoDB connected"))
.catch((err)=>console.log(err));

//viewEngine
app.set("view engine","ejs");
app.set("views",path.resolve("./views"));

//Middlewares
app.use(express.urlencoded({extended:false}));
app.use(cookieParser());
app.use(express.json());
app.use(checkForAuthenticationCookie("token"));
app.use(express.static(path.resolve('./public')));

// Attach io and redisClient to req for emitting events & invalidating cache in routes
app.use((req, res, next) => {
    req.io = io;
    req.redisClient = redisClient;
    next();
});

//Routes
app.get("/",async(req,res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    const cacheKey = `blogs:page:${page}:limit:${limit}:search:${search}`;
    try {
        if (redisClient.isOpen) {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                const parsedData = JSON.parse(cachedData);
                return res.render("home", {
                    user: req.user,
                    blogs: parsedData.blogs,
                    currentPage: parsedData.currentPage,
                    totalPages: parsedData.totalPages,
                    search: search
                });
            }
        }
    } catch (err) { console.error("Redis Error:", err); }

    const query = search ? { title: { $regex: search, $options: "i" } } : {};
    const totalBlogs = await Blog.countDocuments(query);
    const totalPages = Math.ceil(totalBlogs / limit) || 1;

    const allBlogs = await Blog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy');

    const responseData = {
        blogs: allBlogs,
        currentPage: page,
        totalPages: totalPages
    };

    try {
        if (redisClient.isOpen) {
            await redisClient.setEx(cacheKey, 60, JSON.stringify(responseData));
        }
    } catch (err) { console.error("Redis Error:", err); }

    return res.render("home", {
        user: req.user,
        blogs: allBlogs,
        currentPage: page,
        totalPages: totalPages,
        search: search
    });
});

app.use("/user",userRoute);
app.use("/blog",blogRoute);

server.listen(PORT, () => console.log(`server is running on port ${PORT}`));