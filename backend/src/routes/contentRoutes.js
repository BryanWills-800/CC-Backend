const express = require("express")
const { actionController } = require("../controllers/actionController");
const { authenticateUser, authorizeUserRole } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const router = express.Router()
const authorizeActionRole = (req, res, next) => {
    const action = (req.body && req.body.action) || (req.query && req.query.action);

    if (action === "createTeam") {
        return next();
    }

    return authorizeUserRole(req, res, next);
};

// Admin Level Access
router.get(
    "/admin",
    authenticateUser,
    authorizeUserRole,
    authorizeRoles("admin"),
    (req, res) => {
        res.send("Admin Content");
    })

// Manager Level
router.get(
    "/manager",
    authenticateUser,
    authorizeUserRole,
    authorizeRoles("admin", "manager"),
    (req, res) => {
        res.send("Manager Content");
    })

// User Level
router.get(
    "/user",
    authenticateUser,
    authorizeUserRole,
    authorizeRoles("admin", "manager", "user"),
    (req, res) => {
        res.send("User Content");
    })

router.get('/actions', authenticateUser, authorizeActionRole, actionController)
router.post('/actions', authenticateUser, authorizeActionRole, actionController)

// router.post

module.exports = router

