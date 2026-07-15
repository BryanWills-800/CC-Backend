const express = require("express");
const {
    assignTask,
    changeTeamMemberRole,
    createComment,
    createProject,
    createTask,
    createTeam,
    deleteProject,
    deleteTask,
    getProject,
    getTask,
    getTeam,
    inviteTeamMember,
    joinTeam,
    listActivity,
    listComments,
    listProjects,
    listTasks,
    listTeamMembers,
    updateProject,
    updateTask,
} = require("../controllers/restApiController");
const { authenticateUser } = require("../middlewares/authMiddleware");
const {
    validateEnumBody,
    validateEnumQuery,
    validatePagination,
    validateRequiredBody,
    validateRequiredParams,
} = require("../middlewares/apiValidation");
const { INVITABLE_ROLES, PROJECT_STATUSES, TASK_PRIORITIES, TASK_STATUSES } = require("../services/actions/shared");

const router = express.Router();

router.use(authenticateUser);

router.post("/teams", validateRequiredBody("name"), createTeam);
router.get("/teams/:teamId", validateRequiredParams("teamId"), getTeam);
router.post("/teams/:teamId/join", validateRequiredParams("teamId"), validateRequiredBody("token"), joinTeam);
router.get("/teams/:teamId/members", validateRequiredParams("teamId"), listTeamMembers);
router.post("/teams/:teamId/invitations", validateRequiredParams("teamId"), validateRequiredBody("email"), inviteTeamMember);
router.patch(
    "/teams/:teamId/members/:userId/role",
    validateRequiredParams("teamId", "userId"),
    validateRequiredBody("role"),
    validateEnumBody("role", INVITABLE_ROLES),
    changeTeamMemberRole,
);

router.get("/teams/:teamId/projects", validateRequiredParams("teamId"), listProjects);
router.post("/teams/:teamId/projects", validateRequiredParams("teamId"), validateRequiredBody("name"), createProject);
router.get("/projects/:projectId", validateRequiredParams("projectId"), getProject);
router.patch(
    "/projects/:projectId",
    validateRequiredParams("projectId"),
    validateEnumBody("status", PROJECT_STATUSES),
    updateProject,
);
router.delete("/projects/:projectId", validateRequiredParams("projectId"), deleteProject);

router.get(
    "/teams/:teamId/tasks",
    validateRequiredParams("teamId"),
    validateEnumQuery("status", TASK_STATUSES),
    validateEnumQuery("priority", TASK_PRIORITIES),
    validatePagination,
    listTasks,
);
router.post("/projects/:projectId/tasks", validateRequiredParams("projectId"), validateRequiredBody("title"), createTask);
router.get("/tasks/:taskId", validateRequiredParams("taskId"), getTask);
router.patch(
    "/tasks/:taskId",
    validateRequiredParams("taskId"),
    validateEnumBody("status", TASK_STATUSES),
    updateTask,
);
router.delete("/tasks/:taskId", validateRequiredParams("taskId"), deleteTask);
router.post("/tasks/:taskId/assignees", validateRequiredParams("taskId"), validateRequiredBody("assigneeId"), assignTask);

router.get("/tasks/:taskId/comments", validateRequiredParams("taskId"), listComments);
router.post("/tasks/:taskId/comments", validateRequiredParams("taskId"), validateRequiredBody("content"), createComment);

router.get("/teams/:teamId/activity", validateRequiredParams("teamId"), listActivity);

module.exports = router;
