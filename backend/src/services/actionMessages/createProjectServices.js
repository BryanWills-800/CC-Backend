const {
    TEAM_MANAGER_ROLES,
    assertRequired,
    assertTeamExists,
    defaultDeps,
    logActivity,
    normalizeDate,
    normalizeText,
} = require("./shared");

const DEFAULT_PROJECT_STATUS = "active";
const PROJECT_CREATOR_ROLES = TEAM_MANAGER_ROLES;

const createProjectError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const normalizeProjectInput = (input = {}) => ({
    teamId: input.teamId || input.team,
    userId: input.userId || input.createdBy,
    name: normalizeText(input.name),
    description: normalizeText(input.description),
    dueDate: normalizeDate(input.dueDate),
});

const validateProjectInput = (input) => {
    assertRequired(input.teamId, "Team is required");
    if (!input.userId) throw createProjectError(401, "Authenticated user is required");
    assertRequired(input.name, "Project name is required");

    return input;
};

const assertCanCreateProject = async ({ teamId, userId }, deps) => {
    const membership = await deps.TeamMembership.findForUserTeam({ teamId, userId });
    if (!membership || !PROJECT_CREATOR_ROLES.includes(membership.role)) {
        throw createProjectError(403, "Only owners and maintainers can create projects");
    }

    return membership;
};

const buildProjectPayload = (input) => ({
    teamId: input.teamId,
    name: input.name,
    description: input.description,
    status: DEFAULT_PROJECT_STATUS,
    createdById: input.userId,
    dueDate: input.dueDate,
});

const logProjectCreated = async ({ project, input, auditContext }, deps) => logActivity({
    teamId: input.teamId,
    actorId: input.userId,
    action: "project.created",
    entityType: "project",
    entityId: project.id,
    metadata: { name: project.name },
    ipAddress: auditContext && auditContext.ipAddress ? auditContext.ipAddress : null,
}, deps);

const createProjectService = async (input, deps = defaultDeps) => {
    const projectInput = validateProjectInput(normalizeProjectInput(input));

    await assertTeamExists(projectInput.teamId, deps);
    await assertCanCreateProject(projectInput, deps);

    const project = await deps.Project.create(buildProjectPayload(projectInput));
    await logProjectCreated({ project, input: projectInput, auditContext: input && input.auditContext }, deps);

    return project;
};

module.exports = {
    DEFAULT_PROJECT_STATUS,
    PROJECT_CREATOR_ROLES,
    buildProjectPayload,
    createProjectError,
    createProjectService,
    normalizeProjectInput,
    validateProjectInput,
};
