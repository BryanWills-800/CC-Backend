const express = require("express");
const router = express.Router();
const { signup, login, refresh, update, logout, deleteUser } = require("../controllers/authController");
const { authenticateUser } = require("../middlewares/authMiddleware");

// Submit Details
router.post("/signup", signup);
router.post("/login", login);
router.post("/refresh", refresh);

// Update Details
router.patch("/update", authenticateUser, update);
router.post("/update", authenticateUser, update);

// Logout
router.post("/logout", logout);

// Delete an account
router.delete("/delete", authenticateUser, deleteUser);
router.post("/delete", authenticateUser, deleteUser);

module.exports = router;

