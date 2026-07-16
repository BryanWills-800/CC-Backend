const actionForms = {
    assignTask: {
        action: "assignTask",
        title: "Assign task",
        fields: [
            { name: "taskId", label: "Task", required: true, type: "select", source: "tasks" },
            { name: "assigneeId", label: "Assignee", required: true, type: "select", source: "members" },
        ],
    },
    changeRoles: {
        action: "changeRoles",
        title: "Change team role",
        fields: [
            { name: "teamId", label: "Team", required: true, type: "select", source: "currentTeam" },
            { name: "memberUserId", label: "Team member", required: true, type: "select", source: "members" },
            { name: "role", label: "New role", required: true, type: "select", options: ["maintainer", "member", "viewer"] },
        ],
    },
    comment: {
        action: "comment",
        title: "Create comment",
        fields: [
            { name: "taskId", label: "Task", required: true, type: "select", source: "tasks" },
            { name: "content", label: "Comment", required: true, type: "textarea", maxLength: 3000 },
        ],
    },
    createProject: {
        action: "createProject",
        title: "Create project",
        eyebrow: "Project action",
        description: "Create a team-scoped project through the action workflow.",
        submitLabel: "Create project",
        successStatusCode: 201,
        successMessage: (project) => `Project "${project.name}" created successfully.`,
        notesTitle: "Create project service",
        notes: [
            "Allowed roles: owner, maintainer",
            "Creates a project document connected to the selected team.",
            "Writes a project.created activity log with request audit context.",
        ],
        fields: [
            { name: "teamId", label: "Team", required: true, type: "select", source: "currentTeam", compact: true },
            { name: "dueDate", label: "Due date", type: "date", compact: true },
            { name: "name", label: "Project name", required: true, maxLength: 160, full: true },
            { name: "description", label: "Description", type: "textarea", maxLength: 3000, full: true },
        ],
    },
    createTeam: {
        action: "createTeam",
        title: "Create team",
        eyebrow: "Team action",
        description: "Create a team workspace and make yourself the owner.",
        submitLabel: "Create team",
        successStatusCode: 201,
        fields: [
            { name: "name", label: "Team name", required: true, maxLength: 120, full: true },
            { name: "description", label: "Description", type: "textarea", maxLength: 1000, full: true },
        ],
    },
    createTask: {
        action: "createTask",
        title: "Create task",
        fields: [
            { name: "projectId", label: "Project", required: true, type: "select", source: "projects" },
            { name: "title", label: "Task title", required: true, maxLength: 200 },
            { name: "description", label: "Description", type: "textarea", maxLength: 5000 },
            { name: "status", label: "Status", type: "select", options: ["todo", "in_progress", "blocked", "review", "done"] },
            { name: "priority", label: "Priority", type: "select", options: ["low", "medium", "high", "urgent"] },
            { name: "dueDate", label: "Due date", type: "date" },
        ],
    },
    deleteProject: {
        action: "deleteProject",
        title: "Delete project",
        fields: [
            { name: "projectId", label: "Project", required: true, type: "select", source: "projects" },
        ],
    },
    deleteTask: {
        action: "deleteTask",
        title: "Delete task",
        fields: [
            { name: "taskId", label: "Task", required: true, type: "select", source: "tasks" },
        ],
    },
    editProject: {
        action: "editProject",
        title: "Load project for editing",
        fields: [
            { name: "projectId", label: "Project", required: true, type: "select", source: "projects" },
        ],
    },
    inviteMembers: {
        action: "inviteMembers",
        title: "Invite member",
        fields: [
            { name: "teamId", label: "Team", required: true, type: "select", source: "currentTeam" },
            { name: "email", label: "Email", required: true, type: "email" },
            { name: "role", label: "Role", required: true, type: "select", options: ["maintainer", "member", "viewer"] },
        ],
    },
    updateAssignedTask: {
        action: "updateAssignedTask",
        title: "Update assigned task",
        fields: [
            { name: "taskId", label: "Task", required: true, type: "select", source: "tasks" },
            { name: "status", label: "Status", type: "select", options: ["todo", "in_progress", "blocked", "review", "done"] },
            { name: "description", label: "Description", type: "textarea", maxLength: 5000 },
            { name: "dueDate", label: "Due date", type: "date" },
        ],
    },
    updateProject: {
        action: "updateProject",
        title: "Update project",
        fields: [
            { name: "projectId", label: "Project", required: true, type: "select", source: "projects" },
            { name: "name", label: "Project name", maxLength: 160 },
            { name: "description", label: "Description", type: "textarea", maxLength: 3000 },
            { name: "status", label: "Status", type: "select", options: ["active", "on_hold", "completed", "archived"] },
            { name: "dueDate", label: "Due date", type: "date" },
        ],
    },
    viewTasks: {
        action: "viewTasks",
        title: "View tasks",
        fields: [
            { name: "teamId", label: "Team", type: "select", source: "currentTeam" },
            { name: "projectId", label: "Project", type: "select", source: "projects" },
            { name: "status", label: "Status", type: "select", options: ["todo", "in_progress", "blocked", "review", "done"] },
        ],
    },
};

module.exports = { actionForms };
