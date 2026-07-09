const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    const token = req.cookies && req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: "Authentication required" });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        return next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

module.exports = verifyToken;
