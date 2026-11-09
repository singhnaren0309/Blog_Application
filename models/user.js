const {createHmac,randomBytes}=require("crypto");
const{createUserToken}=require("../services/authentication");
const {Schema,model} = require("mongoose");
const userSchema=new Schema({
    fullName:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    salt:{
        type:String,
    },
    password:{
        type:String,
        required:true,
    },
    profileImageURL:{
        type:String,
        default:"/images/image.png"
    },
    role:{
        type:["admin","user"],
        default:"user"
    }
},{
    timestamps:true,
})
userSchema.pre("save", async function () {
  const user = this;

  if (!user.isModified("password")) return;
  const salt = randomBytes(16).toString("hex");
  const hashedPassword = createHmac("sha256", salt)
    .update(user.password)
    .digest("hex");
  user.salt = salt;
  user.password = hashedPassword;
});


userSchema.static("matchPasswordAndGenerateToken",async function(email,password){
    const user=await this.findOne({email});
    if(!user) throw new Error("User not found");
    
    const salt=user.salt;
    const hashedPassword=user.password;
    
    const userProvideHash=createHmac("sha256",salt).update(password).digest("hex");
    if (hashedPassword!==userProvideHash) throw new Error("Invalid password");

    const token=createUserToken(user);
    return token;
});



const User=model("User",userSchema);
module.exports={User}