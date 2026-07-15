const { prismaRepositories } = require("../db/prismaRepositories");
const { actionMessageServices } = require("../services/actionMessageServices");
const { createProjectService } = require("../services/actions/createProjectServices");
const { MAINTAINER_LEVEL_ROLES } = require("../services/actions/shared");

const ACTION_FORMS = {
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
            `Allowed roles: ${MAINTAINER_LEVEL_ROLES.join(", ")}`,
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

const defaultOptionDeps = prismaRepositories;

const toOptionValue = (value) => String(value || "");

const memberLabel = (membership) => {
    const user = membership.user || {};
    const displayName = user.name || user.email || "Unnamed member";
    return `${displayName} (${membership.role})`;
}

const loadProjectOptions = async (teamId, deps) => {
    if (!teamId) return [];

    const projects = await deps.Project.findForTeam(teamId);

    return projects.map((project) => ({
        value: toOptionValue(project.id),
        label: project.name || "Unnamed project",
    }));
}

const loadTaskOptions = async (teamId, deps) => {
    if (!teamId) return [];

    const tasks = await deps.Task.findForTeam(teamId);

    return tasks.map((task) => ({
        value: toOptionValue(task.id),
        label: task.title || "Untitled task",
    }));
}

const loadMemberOptions = async (teamId, deps) => {
    if (!teamId) return [];

    const memberships = await deps.TeamMembership.findForTeam(teamId);

    return memberships.map((membership) => ({
        value: toOptionValue(membership.user && membership.user.id ? membership.user.id : membership.userId),
        label: memberLabel(membership),
    }));
}

const getActionInput = (req) => ({
    ...(req.query || {}),
    ...(req.body || {}),
    userId: req.user && req.user.userId,
    teamId: (req.body && req.body.teamId) || (req.query && req.query.teamId) || (req.user && req.user.teamId),
    auditContext: {
        ipAddress: req.ip,
    },
});

const withDynamicOptions = async (form, values, deps = defaultOptionDeps) => {
    const teamId = values.teamId;
    const optionCache = {};

    const fields = await Promise.all(form.fields.map(async (field) => {
        if (!field.source) return field;

        if (field.source === "currentTeam") {
            return {
                ...field,
                options: teamId ? [{ value: toOptionValue(teamId), label: values.teamName || "Selected team" }] : [],
            };
        }

        if (!optionCache[field.source]) {
            if (field.source === "projects") optionCache[field.source] = await loadProjectOptions(teamId, deps);
            if (field.source === "tasks") optionCache[field.source] = await loadTaskOptions(teamId, deps);
            if (field.source === "members") optionCache[field.source] = await loadMemberOptions(teamId, deps);
        }

        return {
            ...field,
            options: optionCache[field.source] || [],
        };
    }));

    return { ...form, fields };
}

const getSuccessMessage = (form, result) => form.successMessage
    ? form.successMessage(result)
    : result.message;

const renderActionForm = (res, form, options = {}) => res
    .status(options.statusCode || 200)
    .render("actionView/actionForm", {
        action: form.action,
        title: form.title,
        eyebrow: form.eyebrow || "Action workflow",
        description: form.description || "Complete this action through the shared action service layer.",
        submitLabel: form.submitLabel || "Submit",
        notesTitle: form.notesTitle || "Action service notes",
        notes: form.notes || [
            "Request input is collected by the renderer.",
            "Validation, authorization, PostgreSQL writes, and audit logging stay in the service layer.",
        ],
        fields: form.fields,
        values: options.values || {},
        errorMessage: options.errorMessage || null,
        successMessage: options.successMessage || null,
    });

const renderServiceAction = async (req, res, formName, service) => {
    const values = {
        ...getActionInput(req),
        teamName: req.user && req.user.teamName,
    };
    const form = await withDynamicOptions(ACTION_FORMS[formName], values);

    if (req.method !== "POST") {
        return renderActionForm(res, form, { values });
    }

    try {
        const result = await service(values);

        return renderActionForm(res, form, {
            statusCode: form.successStatusCode || 200,
            successMessage: getSuccessMessage(form, result),
            values,
        });
    } catch (error) {
        return renderActionForm(res, form, {
            statusCode: error.statusCode || 500,
            values,
            errorMessage: error.message,
        });
    }
}

const actionRenderers = {
    renderAssignTask: async (req, res) => renderServiceAction(req, res, "assignTask", actionMessageServices.assignTask),
    renderChangeRoles: async (req, res) => renderServiceAction(req, res, "changeRoles", actionMessageServices.changeRoles),
    renderComment: async (req, res) => renderServiceAction(req, res, "comment", actionMessageServices.comment),
    renderCreateProject: async (req, res) => renderServiceAction(req, res, "createProject", createProjectService),
    renderCreateTeam: async (req, res) => renderServiceAction(req, res, "createTeam", actionMessageServices.createTeam),
    renderCreateTask: async (req, res) => renderServiceAction(req, res, "createTask", actionMessageServices.createTask),
    renderDeleteProject: async (req, res) => renderServiceAction(req, res, "deleteProject", actionMessageServices.deleteProject),
    renderDeleteTask: async (req, res) => renderServiceAction(req, res, "deleteTask", actionMessageServices.deleteTask),
    renderEditProject: async (req, res) => renderServiceAction(req, res, "editProject", actionMessageServices.editProject),
    renderInviteMembers: async (req, res) => renderServiceAction(req, res, "inviteMembers", actionMessageServices.inviteMembers),
    renderUnknownAction: (res) => res.status(400).send("Unknown action"),
    renderUpdateAssignedTask: async (req, res) => renderServiceAction(req, res, "updateAssignedTask", actionMessageServices.updateAssignedTask),
    renderUpdateProject: async (req, res) => renderServiceAction(req, res, "updateProject", actionMessageServices.updateProject),
    renderViewTasks: async (req, res) => renderServiceAction(req, res, "viewTasks", actionMessageServices.viewTasks),
};

module.exports = { actionRenderers };





