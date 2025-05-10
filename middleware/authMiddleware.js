const jwt = require("jsonwebtoken");
require("dotenv").config();

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer')) {
        return res.status(401).json({ message: "Invalid or missing token" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decodedToken = await jwt.verify(token, process.env.JWT_SECRET);
        req.decodedToken = decodedToken;
        next();
    } catch (error) {
        return res.status(401).json({message: "Invalid Token"});
    }
}

module.exports = {verifyToken};