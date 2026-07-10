const jwt = require("jsonwebtoken");

const authenticateUser = (req, res, next) => {
    const loginToken = req.cookies && req.cookies.loginToken;

    if (!loginToken) {
        return res.status(401).json({ message: "Authentication required" });
    }

    try {
        req.user = jwt.verify(loginToken, process.env.JWT_SECRET);
        return next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired login token" });
    }
};

const authorizeUserRole = (req, res, next) => {
    const roleToken = req.cookies && req.cookies.roleToken;

    if (!roleToken) {
        return res.status(401).json({ message: "Team role authorization required" });
    }

    try {
        const rolePayload = jwt.verify(roleToken, process.env.JWT_SECRET);

        if (!req.user || String(rolePayload.userId) !== String(req.user.userId)) {
            return res.status(401).json({ message: "Invalid team role authorization" });
        }

        if (!rolePayload.teamId || !rolePayload.role) {
            return res.status(401).json({ message: "Invalid team role authorization" });
        }

        req.user = {
            userId: req.user.userId,
            name: req.user.name,
            email: req.user.email,
            avatarUrl: req.user.avatarUrl,
            teamId: rolePayload.teamId,
            teamName: rolePayload.teamName,
            role: rolePayload.role,
        };

        return next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired role token" });
    }
};

module.exports = { authenticateUser, authorizeUserRole };
