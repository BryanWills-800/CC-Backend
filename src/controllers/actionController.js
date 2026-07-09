const { PROJECT_CREATOR_ROLES, createProjectService } = require("../services/createProject");

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

        case "createProject": {
            const body = req.body || {};
            const project = {
                teamId: body.teamId || "",
                name: body.name || "",
                description: body.description || "",
                dueDate: body.dueDate || "",
            };

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
        }

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



