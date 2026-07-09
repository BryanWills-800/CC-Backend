const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }
        if (!token && req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }
        if (!token) {
            return res
                .status(401)
                .json({ message: "Unauthorized: No token provided" });
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            return res
                .status(401)
                .json({ message: "Unauthorized: Invalid token" });
        }
    } catch (error) {
        res
            .status(500)
            .json({ message: error.message });
    }
}

module.exports = verifyToken;