const createActionResult = (message) => ({ message });

const viewTasksService = async () => createActionResult("View Tasks action selected");

const commentService = async () => createActionResult("Comment action selected");

const createTaskService = async () => createActionResult("Create Task action selected");

const updateAssignedTaskService = async () => createActionResult("Update Assigned Task action selected");

const inviteMembersService = async () => createActionResult("Invite Members action selected");

const editProjectService = async () => createActionResult("Edit Project action selected");

const updateProjectService = async () => createActionResult("Update Project action selected");

const deleteProjectService = async () => createActionResult("Delete Project action selected");

const assignTaskService = async () => createActionResult("Assign Task action selected");

const deleteTaskService = async () => createActionResult("Delete Task action selected");

const changeRolesService = async () => createActionResult("Change Roles action selected");

module.exports = {
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
};
