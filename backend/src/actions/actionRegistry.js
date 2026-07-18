const { actionForms } = require("./actionForms");
const {
    createProjectService,
    deleteProjectService,
    editProjectService,
    updateProjectService,
} = require("../services/actions/projectServices");
const {
    assignTaskService,
    commentService,
    createTaskService,
    deleteTaskService,
    updateAssignedTaskService,
    viewTasksService,
} = require("../services/actions/taskServices");
const {
    changeRolesService,
    createTeamService,
    inviteMembersService,
} = require("../services/actions/teamServices");

const registerAction = ({ form, service, requiresTeamRole = true }) => ({
    form,
    service,
    requiresTeamRole,
});

const actionRegistry = {
    assignTask: registerAction({ form: actionForms.assignTask, service: assignTaskService }),
    changeRoles: registerAction({ form: actionForms.changeRoles, service: changeRolesService }),
    comment: registerAction({ form: actionForms.comment, service: commentService }),
    createProject: registerAction({ form: actionForms.createProject, service: createProjectService }),
    createTask: registerAction({ form: actionForms.createTask, service: createTaskService }),
    createTeam: registerAction({ form: actionForms.createTeam, service: createTeamService, requiresTeamRole: false }),
    deleteProject: registerAction({ form: actionForms.deleteProject, service: deleteProjectService }),
    deleteTask: registerAction({ form: actionForms.deleteTask, service: deleteTaskService }),
    editProject: registerAction({ form: actionForms.editProject, service: editProjectService }),
    inviteMembers: registerAction({ form: actionForms.inviteMembers, service: inviteMembersService }),
    updateAssignedTask: registerAction({ form: actionForms.updateAssignedTask, service: updateAssignedTaskService }),
    updateProject: registerAction({ form: actionForms.updateProject, service: updateProjectService }),
    viewTasks: registerAction({ form: actionForms.viewTasks, service: viewTasksService }),
};

const getActionDefinition = (actionName) => actionRegistry[actionName] || null;

const actionRequiresTeamRole = (actionName) => {
    const definition = getActionDefinition(actionName);
    return definition ? definition.requiresTeamRole : false;
}

module.exports = {
    actionRegistry,
    actionRequiresTeamRole,
    getActionDefinition,
};
