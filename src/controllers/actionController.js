const actionController = async (req, res) => {
    const action = (req.body && req.body.action) || (req.query && req.query.action);

    switch (action) {
        case "viewTasks":
            return res.send("View Tasks action selected");

        case "comment":
            return res.send("Comment action selected");

        case "createTask":
            return res.send("Create Task action selected");

        case "updateAssignedTask":
            return res.send("Update Assigned Task action selected");

        case "inviteMembers":
            return res.send("Invite Members action selected");

        case "createProject":
            return res.send("Create Project action selected");

        case "editProject":
            return res.send("Edit Project action selected");

        case "updateProject":
            return res.send("Update Project action selected");

        case "deleteProject":
            return res.send("Delete Project action selected");

        case "assignTask":
            return res.send("Assign Task action selected");

        case "deleteTask":
            return res.send("Delete Task action selected");

        case "changeRoles":
            return res.send("Change Roles action selected");

        default:
            return res.status(400).send("Unknown action");
    }
}

module.exports = { actionController };