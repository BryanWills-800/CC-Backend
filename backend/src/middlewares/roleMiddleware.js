const authorizeRoles = (...allowedRoles) => (req, res, next) => {
    const requestedRole = req.user && req.user.role ? req.user.role : process.env.ROLE;
    const role = String(requestedRole || "").trim().toLowerCase();

    if (!allowedRoles.includes(role)) {
        return res.status(403).json({ message: "Forbidden" });
    }

    return next();
};

module.exports = authorizeRoles;
