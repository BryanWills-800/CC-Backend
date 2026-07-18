const {
    PROJECT_STATUSES,
    MAINTAINER_LEVEL_ROLES,
    assertAllowedValue,
    assertMembership,
    assertProjectExists,
    assertRequired,
    assertTeamExists,
    defaultDeps,
    getAuditIpAddress,
    logActivity,
    normalizeDate,
    normalizeText,
} = require("./shared");

const DEFAULT_PROJECT_STATUS = "active";

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
    if (!membership || !MAINTAINER_LEVEL_ROLES.includes(membership.role)) {
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

const normalizeProjectMutationInput = (input = {}) => ({
    projectId: input.projectId || input.project || "",
    userId: input.userId || input.updatedBy,
    name: normalizeText(input.name),
    description: normalizeText(input.description),
    status: normalizeText(input.status),
    dueDate: normalizeDate(input.dueDate),
    auditContext: input.auditContext,
});

const getProjectTeamId = (project) => project.teamId || project.team;

const editProjectService = async (input, deps = defaultDeps) => {
    const projectInput = normalizeProjectMutationInput(input);
    assertRequired(projectInput.projectId, "Project is required");

    const project = await assertProjectExists(projectInput.projectId, deps);
    const teamId = getProjectTeamId(project);
    await assertTeamExists(teamId, deps);
    await assertMembership({ teamId, userId: projectInput.userId, allowedRoles: MAINTAINER_LEVEL_ROLES }, deps);

    return { message: `Project "${project.name}" is ready to edit.`, data: project };
};

const updateProjectService = async (input, deps = defaultDeps) => {
    const projectInput = normalizeProjectMutationInput(input);
    assertRequired(projectInput.projectId, "Project is required");
    assertAllowedValue(projectInput.status, PROJECT_STATUSES, "Project status is invalid");

    const project = await assertProjectExists(projectInput.projectId, deps);
    const teamId = getProjectTeamId(project);
    await assertTeamExists(teamId, deps);
    await assertMembership({ teamId, userId: projectInput.userId, allowedRoles: MAINTAINER_LEVEL_ROLES }, deps);

    const data = { updatedById: projectInput.userId };
    if (projectInput.name) data.name = projectInput.name;
    if (projectInput.description) data.description = projectInput.description;
    if (projectInput.status) data.status = projectInput.status;
    if (projectInput.dueDate !== null) data.dueDate = projectInput.dueDate;

    const updatedProject = await deps.Project.update(projectInput.projectId, data);

    await logActivity({
        teamId,
        actorId: projectInput.userId,
        action: "project.updated",
        entityType: "project",
        entityId: project.id,
        metadata: { name: updatedProject.name, status: updatedProject.status },
        ipAddress: getAuditIpAddress(projectInput),
    }, deps);

    return { message: `Project "${updatedProject.name}" updated successfully.`, data: updatedProject };
};

const deleteProjectService = async (input, deps = defaultDeps) => {
    const projectInput = normalizeProjectMutationInput(input);
    assertRequired(projectInput.projectId, "Project is required");

    const project = await assertProjectExists(projectInput.projectId, deps);
    const teamId = getProjectTeamId(project);
    await assertTeamExists(teamId, deps);
    await assertMembership({ teamId, userId: projectInput.userId, allowedRoles: MAINTAINER_LEVEL_ROLES }, deps);

    const deletedProject = await deps.Project.softDelete(projectInput.projectId, projectInput.userId);

    await logActivity({
        teamId,
        actorId: projectInput.userId,
        action: "project.deleted",
        entityType: "project",
        entityId: project.id,
        metadata: { name: project.name },
        ipAddress: getAuditIpAddress(projectInput),
    }, deps);

    return { message: `Project "${deletedProject.name}" deleted successfully.`, data: deletedProject };
};

module.exports = {
    DEFAULT_PROJECT_STATUS,
    buildProjectPayload,
    createProjectError,
    createProjectService,
    deleteProjectService,
    editProjectService,
    normalizeProjectInput,
    updateProjectService,
    validateProjectInput,
};
