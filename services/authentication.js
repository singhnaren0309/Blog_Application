const JWT=require("jsonwebtoken");
const secret="$uperMan";


function createUserToken(user){
    const payload={
        _id:user._id,
        fullName:user.fullName,
        email:user.email,
        profileImageURL:user.profileImageURL,
        role:user.role,
    };
    const token=JWT.sign(payload,secret);
    return token;
}
function validateToken(token){
    return JWT.verify(token,secret);
}

module.exports={createUserToken,validateToken};