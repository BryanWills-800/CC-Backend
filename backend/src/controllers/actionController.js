const { actionRenderers } = require("../helpers/actionRenderers");

const actionController = async (req, res) => {
    const action = (req.body && req.body.action) || (req.query && req.query.action);

    switch (action) {
        case "viewTasks":
            return actionRenderers.renderViewTasks(req, res);

        case "comment":
            return actionRenderers.renderComment(req, res);

        case "createTask":
            return actionRenderers.renderCreateTask(req, res);

        case "updateAssignedTask":
            return actionRenderers.renderUpdateAssignedTask(req, res);

        case "inviteMembers":
            return actionRenderers.renderInviteMembers(req, res);

        case "createProject":
            return actionRenderers.renderCreateProject(req, res);

        case "editProject":
            return actionRenderers.renderEditProject(req, res);

        case "updateProject":
            return actionRenderers.renderUpdateProject(req, res);

        case "deleteProject":
            return actionRenderers.renderDeleteProject(req, res);

        case "assignTask":
            return actionRenderers.renderAssignTask(req, res);

        case "deleteTask":
            return actionRenderers.renderDeleteTask(req, res);

        case "changeRoles":
            return actionRenderers.renderChangeRoles(req, res);

        default:
            return actionRenderers.renderUnknownAction(res);
    }
}

module.exports = { actionController };
