const {
    changeRolesService,
    createTeamService,
    inviteMembersService,
} = require("./actions/teamServices");
const {
    assignTaskService,
    commentService,
    createTaskService,
    deleteTaskService,
    updateAssignedTaskService,
    viewTasksService,
} = require("./actions/taskServices");
const {
    deleteProjectService,
    editProjectService,
    updateProjectService,
} = require("./actions/projectServices");

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

