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
const verifyToken = require("../middlewares/authMiddleware");
const router = express.Router();

// Legacy button architecture. This router is currently not mounted in index.js.

// router.get("/", (req, res) => { res.redirect("/home") })
// router.get("/home", homeController);
// router.get("/login", loginController);
// router.get("/signup", signupController);
// router.get('/main', verifyToken, mainController)

router.post('/createProject', verifyToken, createProjectController)
router.post('/updateProject', verifyToken, updateProjectController)
router.post('/deleteProject', verifyToken, deleteProjectController)
router.post('/changeRoles', verifyToken, changeRolesController)
router.post('/viewTasks', verifyToken, viewTasksController)
router.post('/comment', verifyToken, commentController)
router.post('/createTask', verifyToken, createTaskController)
router.post('/updateAssignedTask', verifyToken, updateAssignedTaskController)
router.post('/inviteMembers', verifyToken, inviteMembersController)
router.post('/editProject', verifyToken, editProjectController)
router.post('/deleteProject', verifyToken, deleteProjectController)
router.post('/assignTask', verifyToken, assignTaskController)
router.post('/deleteTask', verifyToken, deleteTaskController)

module.exports = router;
