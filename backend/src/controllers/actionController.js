const {
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
} = require("../helpers/actionRenderers");

const actionController = async (req, res) => {
    const action = (req.body && req.body.action) || (req.query && req.query.action);

    switch (action) {
        case "viewTasks":
            return renderViewTasks(req, res);

        case "comment":
            return renderComment(req, res);

        case "createTask":
            return renderCreateTask(req, res);

        case "updateAssignedTask":
            return renderUpdateAssignedTask(req, res);

        case "inviteMembers":
            return renderInviteMembers(req, res);

        case "createProject":
            return renderCreateProject(req, res);

        case "editProject":
            return renderEditProject(req, res);

        case "updateProject":
            return renderUpdateProject(req, res);

        case "deleteProject":
            return renderDeleteProject(req, res);

        case "assignTask":
            return renderAssignTask(req, res);

        case "deleteTask":
            return renderDeleteTask(req, res);

        case "changeRoles":
            return renderChangeRoles(req, res);

        default:
            return renderUnknownAction(res);
    }
}

module.exports = { actionController };
