const crypto = require("crypto");
const { prismaHealthCheck } = require("../db/prismaConnect");
const {
    createProjectService,
    deleteProjectService,
    updateProjectService,
} = require("../services/actions/projectServices");
const {
    assignTaskService,
    commentService,
    createTaskService,
    deleteTaskService,
    updateTaskService,
} = require("../services/actions/taskServices");
const {
    changeRolesService,
    createTeamService,
    inviteMembersService,
    joinTeamService,
} = require("../services/actions/teamServices");
const { listActivityQuery } = require("../services/queries/activityQueries");
const { listCommentsQuery } = require("../services/queries/commentQueries");
const { listTeamMembersQuery } = require("../services/queries/memberQueries");
const { getProjectQuery, listProjectsQuery } = require("../services/queries/projectQueries");
const { getTaskQuery, listTasksQuery } = require("../services/queries/taskQueries");
const { getTeamQuery } = require("../services/queries/teamQueries");
const { sendError, sendNoContent, sendSuccess } = require("../utils/apiResponses");

const getUserId = (req) => req.user && req.user.userId;
const getAuditContext = (req) => ({ ipAddress: req.ip });
const runApi = (handler) => async (req, res) => {
    try {
        return await handler(req, res);
    } catch (error) {
        return sendError(res, error);
    }
};

const createTeam = runApi(async (req, res) => {
    const result = await createTeamService({
        ...req.body,
        userId: getUserId(req),
        auditContext: getAuditContext(req),
    });

    return sendSuccess(res, { statusCode: 201, message: result.message, data: result.data });
});

const getTeam = runApi(async (req, res) => {
    const result = await getTeamQuery({ teamId: req.params.teamId, userId: getUserId(req) });
    return sendSuccess(res, { message: result.message, data: result.data });
});

const joinTeam = runApi(async (req, res) => {
    const result = await joinTeamService({
        teamId: req.params.teamId,
        userId: getUserId(req),
        token: req.body.token,
        auditContext: getAuditContext(req),
    });

    return sendSuccess(res, { statusCode: 201, message: result.message, data: result.data });
});

const listTeamMembers = runApi(async (req, res) => {
    const result = await listTeamMembersQuery({ teamId: req.params.teamId, userId: getUserId(req) });
    return sendSuccess(res, { message: result.message, data: result.data });
});

const inviteTeamMember = runApi(async (req, res) => {
    const result = await inviteMembersService({
        ...req.body,
        teamId: req.params.teamId,
        userId: getUserId(req),
        auditContext: getAuditContext(req),
    });

    return sendSuccess(res, { statusCode: 201, message: result.message, data: result.data });
});

const changeTeamMemberRole = runApi(async (req, res) => {
    const result = await changeRolesService({
        teamId: req.params.teamId,
        memberUserId: req.params.userId,
        userId: getUserId(req),
        role: req.body.role,
        auditContext: getAuditContext(req),
    });

    return sendSuccess(res, { message: result.message, data: result.data });
});

const listProjects = runApi(async (req, res) => {
    const result = await listProjectsQuery({ teamId: req.params.teamId, userId: getUserId(req) });
    return sendSuccess(res, { message: result.message, data: result.data });
});

const createProject = runApi(async (req, res) => {
    const project = await createProjectService({
        ...req.body,
        teamId: req.params.teamId,
        userId: getUserId(req),
        auditContext: getAuditContext(req),
    });

    return sendSuccess(res, { statusCode: 201, message: `Project "${project.name}" created successfully.`, data: project });
});

const getProject = runApi(async (req, res) => {
    const result = await getProjectQuery({ projectId: req.params.projectId, userId: getUserId(req) });
    return sendSuccess(res, { message: result.message, data: result.data });
});

const updateProject = runApi(async (req, res) => {
    const result = await updateProjectService({
        ...req.body,
        projectId: req.params.projectId,
        userId: getUserId(req),
        auditContext: getAuditContext(req),
    });

    return sendSuccess(res, { message: result.message, data: result.data });
});

const deleteProject = runApi(async (req, res) => {
    await deleteProjectService({
        projectId: req.params.projectId,
        userId: getUserId(req),
        auditContext: getAuditContext(req),
    });

    return sendNoContent(res);
});

const listTasks = runApi(async (req, res) => {
    const result = await listTasksQuery({
        teamId: req.params.teamId,
        projectId: req.query.projectId,
        status: req.query.status,
        priority: req.query.priority,
        search: req.query.search,
        page: req.pagination.page,
        limit: req.pagination.limit,
        userId: getUserId(req),
    });

    return sendSuccess(res, { message: result.message, data: result.data, pagination: result.pagination });
});

const createTask = runApi(async (req, res) => {
    const result = await createTaskService({
        ...req.body,
        projectId: req.params.projectId,
        userId: getUserId(req),
        auditContext: getAuditContext(req),
    });

    return sendSuccess(res, { statusCode: 201, message: result.message, data: result.data });
});

const getTask = runApi(async (req, res) => {
    const result = await getTaskQuery({ taskId: req.params.taskId, userId: getUserId(req) });
    return sendSuccess(res, { message: result.message, data: result.data });
});

const updateTask = runApi(async (req, res) => {
    const result = await updateTaskService({
        ...req.body,
        taskId: req.params.taskId,
        userId: getUserId(req),
        auditContext: getAuditContext(req),
    });

    return sendSuccess(res, { message: result.message, data: result.data });
});

const deleteTask = runApi(async (req, res) => {
    await deleteTaskService({
        taskId: req.params.taskId,
        userId: getUserId(req),
        auditContext: getAuditContext(req),
    });

    return sendNoContent(res);
});

const assignTask = runApi(async (req, res) => {
    const result = await assignTaskService({
        taskId: req.params.taskId,
        assigneeId: req.body.assigneeId,
        userId: getUserId(req),
        auditContext: getAuditContext(req),
    });

    return sendSuccess(res, { message: result.message, data: result.data });
});

const listComments = runApi(async (req, res) => {
    const result = await listCommentsQuery({ taskId: req.params.taskId, userId: getUserId(req) });
    return sendSuccess(res, { message: result.message, data: result.data });
});

const createComment = runApi(async (req, res) => {
    const result = await commentService({
        taskId: req.params.taskId,
        userId: getUserId(req),
        content: req.body.content,
        auditContext: getAuditContext(req),
    });

    return sendSuccess(res, { statusCode: 201, message: result.message, data: result.data });
});

const listActivity = runApi(async (req, res) => {
    const result = await listActivityQuery({ teamId: req.params.teamId, userId: getUserId(req) });
    return sendSuccess(res, { message: result.message, data: result.data });
});

const health = async (req, res) => {
    try {
        await prismaHealthCheck();
        return res.status(200).json({
            status: "healthy",
            database: "connected",
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return res.status(503).json({
            code: "DATABASE_UNAVAILABLE",
            message: "Database health check failed",
        });
    }
};

module.exports = {
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
    health,
    inviteTeamMember,
    joinTeam,
    listActivity,
    listComments,
    listProjects,
    listTasks,
    listTeamMembers,
    updateProject,
    updateTask,
};
