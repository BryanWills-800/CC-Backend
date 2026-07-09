const {
    PROJECT_CREATOR_ROLES,
    createProjectService,
} = require("../services/createProject");
const {
    assignTaskService,
    changeRolesService,
    commentService,
    createTaskService,
    deleteProjectService,
    deleteTaskService,
    editProjectService,
    inviteMembersService,
    updateAssignedTaskService,
    updateProjectService,
    viewTasksService,
} = require("../services/actionServices");

const renderActionMessage = (res, result) => res.send(result.message);

const renderCreateProjectForm = (res, options = {}) => res
    .status(options.statusCode || 200)
    .render("projectView/createProject", {
        serviceName: "createProjectService",
        creatorRoles: PROJECT_CREATOR_ROLES,
        project: options.project || {
            teamId: "",
            name: "",
            description: "",
            dueDate: "",
        },
        errorMessage: options.errorMessage || null,
        successMessage: options.successMessage || null,
    });

const getProjectInput = (req) => {
    const body = req.body || {};

    return {
        teamId: body.teamId || "",
        name: body.name || "",
        description: body.description || "",
        dueDate: body.dueDate || "",
    };
};

const renderViewTasks = async (req, res) => renderActionMessage(res, await viewTasksService(req));

const renderComment = async (req, res) => renderActionMessage(res, await commentService(req));

const renderCreateTask = async (req, res) => renderActionMessage(res, await createTaskService(req));

const renderUpdateAssignedTask = async (req, res) => renderActionMessage(res, await updateAssignedTaskService(req));

const renderInviteMembers = async (req, res) => renderActionMessage(res, await inviteMembersService(req));

const renderEditProject = async (req, res) => renderActionMessage(res, await editProjectService(req));

const renderUpdateProject = async (req, res) => renderActionMessage(res, await updateProjectService(req));

const renderDeleteProject = async (req, res) => renderActionMessage(res, await deleteProjectService(req));

const renderAssignTask = async (req, res) => renderActionMessage(res, await assignTaskService(req));

const renderDeleteTask = async (req, res) => renderActionMessage(res, await deleteTaskService(req));

const renderChangeRoles = async (req, res) => renderActionMessage(res, await changeRolesService(req));

const renderCreateProject = async (req, res) => {
    const project = getProjectInput(req);

    if (req.method !== "POST" || !project.name) {
        return renderCreateProjectForm(res, { project });
    }

    try {
        const createdProject = await createProjectService({
            ...project,
            userId: req.user && req.user.userId,
            ipAddress: req.ip,
        });

        return renderCreateProjectForm(res, {
            statusCode: 201,
            successMessage: `Project "${createdProject.name}" created successfully.`,
        });
    } catch (error) {
        return renderCreateProjectForm(res, {
            statusCode: error.statusCode || 500,
            project,
            errorMessage: error.message,
        });
    }
};

const renderUnknownAction = (res) => res.status(400).send("Unknown action");

module.exports = {
    renderAssignTask,
    renderChangeRoles,
    renderComment,
    renderCreateProject,
    renderCreateTask,
    renderDeleteProject,
    renderDeleteTask,
    renderEditProject,
    renderInviteMembers,
    renderUnknownAction,
    renderUpdateAssignedTask,
    renderUpdateProject,
    renderViewTasks,
};
