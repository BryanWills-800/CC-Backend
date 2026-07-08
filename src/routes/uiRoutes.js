const express = require("express");
const { homeController, loginController, signupController, mainController } = require("../controllers/userController");
const verifyToken = require("../middlewares/authMiddleware");
const router = express.Router();

router.get("/", (req, res) => { res.redirect("/home") });
router.get("/home", homeController);
router.get("/login", loginController);
router.get("/signup", signupController);
router.get('/logout', (req, res) => { res.redirect("/login") });
router.get('/update', (req, res) => { res.redirect("/main") });
router.get('/delete', (req, res) => { res.redirect("/main") });
router.get('/main', verifyToken, mainController)

module.exports = router;