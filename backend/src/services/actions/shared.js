const { prismaRepositories } = require("../../db/prismaRepositories");

const VIEWER_LEVEL_ROLES = ["owner", "maintainer", "member", "viewer"];
const MEMBER_LEVEL_ROLES = ["owner", "maintainer", "member"];
const MAINTAINER_LEVEL_ROLES = ["owner", "maintainer"];
const OWNER_LEVEL_ROLES = ["owner"];
const INVITABLE_ROLES = ["maintainer", "member", "viewer"];
const PROJECT_STATUSES = ["active", "on_hold", "completed", "archived"];
const TASK_STATUSES = ["todo", "in_progress", "blocked", "review", "done"];
const TASK_PRIORITIES = ["low", "medium", "high", "urgent"];

const defaultDeps = prismaRepositories;

const createActionError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const normalizeText = (value) => typeof value === "string" ? value.trim() : "";
const normalizeDate = (value) => value || null;
const buildSlug = (value) => normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const idMatches = (left, right) => String(left) === String(right);

const getAuditIpAddress = (input) => input && input.auditContext && input.auditContext.ipAddress
    ? input.auditContext.ipAddress
    : null;

const assertRequired = (value, message) => {
    if (!value) throw createActionError(400, message);
    return value;
};

const assertAllowedValue = (value, allowedValues, message) => {
    if (value && !allowedValues.includes(value)) throw createActionError(400, message);
    return value;
};

const assertTeamExists = async (teamId, deps) => {
    const team = await deps.Team.findById(teamId);
    if (!team || team.isArchived) throw createActionError(404, "Team not found");
    return team;
};

const assertProjectExists = async (projectId, deps) => {
    const project = await deps.Project.findById(projectId);
    if (!project || project.isDeleted) throw createActionError(404, "Project not found");
    return project;
};

const assertTaskExists = async (taskId, deps) => {
    const task = await deps.Task.findById(taskId);
    if (!task || task.isDeleted) throw createActionError(404, "Task not found");
    return task;
};

const assertMembership = async ({ teamId, userId, allowedRoles }, deps) => {
    assertRequired(userId, "Authenticated user is required");

    const membership = await deps.TeamMembership.findForUserTeam({ teamId, userId });
    if (!membership) throw createActionError(403, "Team membership is required");
    if (allowedRoles && !allowedRoles.includes(membership.role)) {
        throw createActionError(403, "You do not have permission to perform this action");
    }

    return membership;
};

const logActivity = async ({ teamId, actorId, action, entityType, entityId, metadata, ipAddress }, deps) => {
    if (!deps.ActivityLog) return null;

    const event = {
        teamId,
        actorId,
        action,
        entityType,
        entityId,
        metadata: metadata || {},
        ipAddress: ipAddress || null,
    };

    return deps.ActivityLog.create(event);
};

module.exports = {
    INVITABLE_ROLES,
    MAINTAINER_LEVEL_ROLES,
    MEMBER_LEVEL_ROLES,
    OWNER_LEVEL_ROLES,
    PROJECT_STATUSES,
    TASK_PRIORITIES,
    TASK_STATUSES,
    VIEWER_LEVEL_ROLES,
    defaultDeps,
    assertAllowedValue,
    assertMembership,
    assertProjectExists,
    assertRequired,
    assertTaskExists,
    assertTeamExists,
    buildSlug,
    createActionError,
    getAuditIpAddress,
    idMatches,
    logActivity,
    normalizeDate,
    normalizeText,
};
