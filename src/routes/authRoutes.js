const express = require("express");
const router = express.Router();
const { signup, login, update, logout, deleteUser } = require("../controllers/authController");
const verifyToken = require("../middlewares/authMiddleware");

// Submit Details
router.post("/signup", signup);
router.post("/login", login);

// Update Details
router.patch("/update", verifyToken, update);
router.post("/update", verifyToken, update);

// Logout
router.post("/logout", logout);

// Delete an account
router.delete("/delete", verifyToken, deleteUser);
router.post("/delete", verifyToken, deleteUser);

module.exports = router;