const { prismaRepositories } = require("../db/prismaRepositories");

const defaultOptionDeps = prismaRepositories;

const toOptionValue = (value) => String(value || "");

const memberLabel = (membership) => {
    const user = membership.user || {};
    const displayName = user.name || user.email || "Unnamed member";
    return `${displayName} (${membership.role})`;
}

const loadProjectOptions = async (teamId, deps = defaultOptionDeps) => {
    if (!teamId) return [];

    const projects = await deps.Project.findForTeam(teamId);

    return projects.map((project) => ({
        value: toOptionValue(project.id),
        label: project.name || "Unnamed project",
    }));
}

const loadTaskOptions = async (teamId, deps = defaultOptionDeps) => {
    if (!teamId) return [];

    const tasks = await deps.Task.findForTeam(teamId);

    return tasks.map((task) => ({
        value: toOptionValue(task.id),
        label: task.title || "Untitled task",
    }));
}

const loadMemberOptions = async (teamId, deps = defaultOptionDeps) => {
    if (!teamId) return [];

    const memberships = await deps.TeamMembership.findForTeam(teamId);

    return memberships.map((membership) => ({
        value: toOptionValue(membership.user && membership.user.id ? membership.user.id : membership.userId),
        label: memberLabel(membership),
    }));
}

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

module.exports = {
    loadMemberOptions,
    loadProjectOptions,
    loadTaskOptions,
    withDynamicOptions,
};
