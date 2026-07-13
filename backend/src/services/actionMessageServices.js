const {
    changeRolesService,
    createTeamService,
    inviteMembersService,
} = require("./actionMessages/teamServices");
const {
    assignTaskService,
    commentService,
    createTaskService,
    deleteTaskService,
    updateAssignedTaskService,
    viewTasksService,
} = require("./actionMessages/taskServices");
const {
    deleteProjectService,
    editProjectService,
    updateProjectService,
} = require("./actionMessages/projectServices");

const actionMessageServices = {
    assignTask: assignTaskService,
    changeRoles: changeRolesService,
    comment: commentService,
    createTask: createTaskService,
    createTeam: createTeamService,
    deleteProject: deleteProjectService,
    deleteTask: deleteTaskService,
    editProject: editProjectService,
    inviteMembers: inviteMembersService,
    updateAssignedTask: updateAssignedTaskService,
    updateProject: updateProjectService,
    viewTasks: viewTasksService,
};

module.exports = { actionMessageServices };
