const express = require("express")
const { actionController } = require("../controllers/actionController");
const verifyToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const router = express.Router()

// Admin Level Access
router.get(
    "/admin",
    verifyToken,
    authorizeRoles("admin"),
    (req, res) => {
        res.send("Admin Content");
    })

// Manager Level
router.get(
    "/manager",
    verifyToken,
    authorizeRoles("admin", "manager"),
    (req, res) => {
        res.send("Manager Content");
    })

// User Level
router.get(
    "/user",
    verifyToken,
    authorizeRoles("admin", "manager", "user"),
    (req, res) => {
        res.send("User Content");
    })

router.get('/actions', verifyToken, actionController)
router.post('/actions', verifyToken, actionController)

// router.post

module.exports = router
