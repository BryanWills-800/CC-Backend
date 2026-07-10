// This is Legacy code.

const express = require("express");
const {
    createProjectController,
    updateProjectController,
    deleteProjectController,
    changeRolesController,
    viewTasksController,
    commentController,
    createTaskController,
    updateAssignedTaskController,
    inviteMembersController,
    editProjectController,
    assignTaskController,
    deleteTaskController
} = require("../controllers/buttonController");
const { authenticateUser, authorizeUserRole } = require("../middlewares/authMiddleware");
const router = express.Router();

// Legacy button architecture. This router is currently not mounted in index.js.

// router.get("/", (req, res) => { res.redirect("/home") })
// router.get("/home", homeController);
// router.get("/login", loginController);
// router.get("/signup", signupController);
// router.get('/main', authenticateUser, authorizeUserRole, mainController)

router.post('/createProject', authenticateUser, authorizeUserRole, createProjectController)
router.post('/updateProject', authenticateUser, authorizeUserRole, updateProjectController)
router.post('/deleteProject', authenticateUser, authorizeUserRole, deleteProjectController)
router.post('/changeRoles', authenticateUser, authorizeUserRole, changeRolesController)
router.post('/viewTasks', authenticateUser, authorizeUserRole, viewTasksController)
router.post('/comment', authenticateUser, authorizeUserRole, commentController)
router.post('/createTask', authenticateUser, authorizeUserRole, createTaskController)
router.post('/updateAssignedTask', authenticateUser, authorizeUserRole, updateAssignedTaskController)
router.post('/inviteMembers', authenticateUser, authorizeUserRole, inviteMembersController)
router.post('/editProject', authenticateUser, authorizeUserRole, editProjectController)
router.post('/deleteProject', authenticateUser, authorizeUserRole, deleteProjectController)
router.post('/assignTask', authenticateUser, authorizeUserRole, assignTaskController)
router.post('/deleteTask', authenticateUser, authorizeUserRole, deleteTaskController)

module.exports = router;

