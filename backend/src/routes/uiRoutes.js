const express = require("express");
const {
    homeController,
    loginController,
    signupController,
    mainController,
    teamSelectController,
    selectTeamController,
    overviewController,
    tasksController,
    projectsController,
    permissionsController,
    membersController,
    auditController,
    notesController,
    settingsController,
} = require("../controllers/userController");
const { authenticateUser, authorizeUserRole } = require("../middlewares/authMiddleware");
const router = express.Router();

router.get("/", (req, res) => { res.redirect("/home") });
router.get("/home", homeController);
router.get("/login", loginController);
router.get("/signup", signupController);
router.get('/logout', (req, res) => { res.redirect("/login") });
router.get('/team-select', authenticateUser, teamSelectController);
router.post('/team-select', authenticateUser, selectTeamController);
router.get('/main', authenticateUser, authorizeUserRole, mainController);
router.get('/overview', authenticateUser, authorizeUserRole, overviewController);
router.get('/tasks', authenticateUser, authorizeUserRole, tasksController);
router.get('/projects', authenticateUser, authorizeUserRole, projectsController);
router.get('/permissions', authenticateUser, authorizeUserRole, permissionsController);
router.get('/members', authenticateUser, authorizeUserRole, membersController);
router.get('/audit', authenticateUser, authorizeUserRole, auditController);
router.get('/notes', authenticateUser, authorizeUserRole, notesController);
router.get('/settings', authenticateUser, authorizeUserRole, settingsController);
router.get('/update', authenticateUser, authorizeUserRole, settingsController);
router.get('/delete', authenticateUser, authorizeUserRole, settingsController);

module.exports = router;



