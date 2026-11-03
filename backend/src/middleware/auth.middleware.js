const jwt = require('jsonwebtoken');
const { isTokenRevoked, isUserActive } = require('../services/tokenRevocation.service');
const { isDatabaseError } = require('../db');

async function authRequired(req, res, next){
    try{
        const auth = req.headers.authorization || "";
        const [type, token] = auth.split(" ");

        if (type !== "Bearer" || !token){
            return res.status(401).json({message: "Authorization token required"});
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET);
        if (!(await isUserActive(payload.user_id))) {
            return res.status(401).json({ message: "Account is inactive or deleted" });
        }
        if (await isTokenRevoked(token)) {
            return res.status(401).json({ message: "Token has been revoked" });
        }
        req.user = payload;
        req.authToken = token;
        next();

    }
    catch(err){
        if (isDatabaseError(err)) {
            console.error("Database error in authRequired middleware:", err);
            return res.status(503).json({
                message: "Dịch vụ cơ sở dữ liệu tạm thời không khả dụng. Vui lòng thử lại sau.",
                error: process.env.NODE_ENV === "development" ? err.message : undefined
            });
        }
        return res.status(401).json({ message: "Invalid Token or expired! "});
    }
}

module.exports = { authRequired };
