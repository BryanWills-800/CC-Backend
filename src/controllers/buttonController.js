const createProjectController = (req, res) => {
    res.render('createProject')
}
const updateProjectController = (req, res) => {
    res.render('updateProject')
}
const deleteProjectController = (req, res) => {
    res.render('deleteProject')
}
const changeRolesController = (req, res) => {
    res.render('changeRoles')
}
const viewTasksController = (req, res) => {
    res.render('viewTasks')
}
const commentController = (req, res) => {
    res.render('comment')
}
const createTaskController = (req, res) => {
    res.render('createTask')
}
const updateAssignedTaskController = (req, res) => {
    res.render('updateAssignedTask')
}
const inviteMembersController = (req, res) => {
    res.render('inviteMembers')
}
const editProjectController = (req, res) => {
    res.render('editProject')
}
const assignTaskController = (req, res) => {
    res.render('assignTask')

}
const deleteTaskController = (req, res) => {
    res.render('deleteTask')
}

module.exports = {
    createProjectController,
    updateProjectController,
    deleteProjectController,
    changeRolesController,
    viewTasksController,
    commentController,
    createTaskController,
    updateAssignedTaskController,
    inviteMembersController,
    editProjectController,
    assignTaskController,
    deleteTaskController
}