const{Router}=require("express");
const router=Router();
const multer=require("multer");
const path=require("path");
const User=require("../models/user");
const Blog=require("../models/blog");
const Comment=require("../models/comment");


const storage =multer.diskStorage({
    destination: function (req, file, cb) {
        return cb(null,path.resolve(`./public/uploads/`));
    },
    filename: function (req, file, cb) {
        return cb(null,`${Date.now()}-${file.originalname}`);
    },
})
const upload = multer({ storage: storage })

router.get('/add-new',(req,res)=>{
    return res.render("addBlog",{user:req.user});
})
router.get('/:id',async(req,res)=>{
    const blog=await Blog.findById(req.params.id).populate("createdBy");
    console.log(blog.createdBy);
    const comments=await Comment.find({blogId:blog._id}).populate("createdBy");
    return res.render("blog",{user:req.user,blog,comments});
})
router.post('/comment/:blogId',async(req,res)=>{
    const comment = await Comment.create({
        content:req.body.content,
        blogId:req.params.blogId,
        createdBy:req.user._id,
    });
    
    // Real-time Notification via Socket.io
    const blog = await Blog.findById(req.params.blogId);
    if (req.io && blog) {
        req.io.emit("new_comment", {
            blogId: blog._id,
            blogTitle: blog.title,
            commentContent: comment.content
        });
    }

    return res.redirect(`/blog/${req.params.blogId}`);
})


router.post('/add-new',upload.single('coverImageURL'),async (req,res)=>{
    const {title,body}=req.body;
    const blog =await Blog.create({
        title,
        body,
        coverImageUrl:`/uploads/${req.file.filename}`,
        createdBy:req.user._id,
    });

    // Invalidate Redis cache to show new post on home page immediately
    try {
        if (req.redisClient && req.redisClient.isOpen) {
            await req.redisClient.flushAll();
        }
    } catch (e) {
        console.error("Redis Flush Error:", e);
    }

    return res.redirect(`/blog/${blog._id}`)
})


module.exports=router;
