const {validateToken}=require("../services/authentication");

function checkForAuthenticationCookie(cookieName){
    return (req,res,next)=>{
        const tokenCookie=req.cookies[cookieName];
        if(!tokenCookie) return next();
        try{
        const userpayload=validateToken(tokenCookie);
        req.user=userpayload;
        return next();
        }
        catch (error){
            return next();
        }
    }
}
module.exports={checkForAuthenticationCookie};