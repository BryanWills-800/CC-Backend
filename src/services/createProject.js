const Project = require("../models/projectModel");
const Team = require("../models/teamModel");
const TeamMembership = require("../models/teamMembershipModel");
const ActivityLog = require("../models/activityLogModel");

const DEFAULT_PROJECT_STATUS = "active";
const PROJECT_CREATOR_ROLES = ["owner", "maintainer"];

const createProjectError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

const normalizeProjectInput = (input = {}) => ({
    teamId: input.teamId || input.team,
    userId: input.userId || input.createdBy,
    name: typeof input.name === "string" ? input.name.trim() : "",
    description: typeof input.description === "string" ? input.description.trim() : "",
    dueDate: input.dueDate || null,
});

const validateProjectInput = (input) => {
    if (!input.teamId) throw createProjectError(400, "Team is required");
    if (!input.userId) throw createProjectError(401, "Authenticated user is required");
    if (!input.name) throw createProjectError(400, "Project name is required");

    return input;
}

const assertTeamExists = async (teamId, deps) => {
    const team = await deps.Team.findById(teamId);
    if (!team || team.isArchived) {
        throw createProjectError(404, "Team not found");
    }

    return team;
}

const assertCanCreateProject = async ({ teamId, userId }, deps) => {
    const membership = await deps.TeamMembership.findOne({ team: teamId, user: userId });
    if (!membership || !PROJECT_CREATOR_ROLES.includes(membership.role)) {
        throw createProjectError(403, "Only owners and maintainers can create projects");
    }

    return membership;
}

const buildProjectPayload = (input) => ({
    team: input.teamId,
    name: input.name,
    description: input.description,
    status: DEFAULT_PROJECT_STATUS,
    createdBy: input.userId,
    dueDate: input.dueDate,
});

const logProjectCreated = async ({ project, input, ipAddress }, deps) => {
    if (!deps.ActivityLog) return null;

    return deps.ActivityLog.create({
        team: input.teamId,
        actor: input.userId,
        action: "project.created",
        entityType: "project",
        entityId: project._id,
        metadata: { name: project.name },
        ipAddress: ipAddress || null,
    });
}

const createProjectService = async (input, deps = defaultDeps) => {
    const projectInput = validateProjectInput(normalizeProjectInput(input));

    await assertTeamExists(projectInput.teamId, deps);
    await assertCanCreateProject(projectInput, deps);

    const project = await deps.Project.create(buildProjectPayload(projectInput));
    await logProjectCreated({ project, input: projectInput, ipAddress: input && input.ipAddress }, deps);

    return project;
}

const defaultDeps = {
    Project,
    Team,
    TeamMembership,
    ActivityLog,
};

module.exports = {
    PROJECT_CREATOR_ROLES,
    buildProjectPayload,
    createProjectError,
    createProjectService,
    normalizeProjectInput,
    validateProjectInput,
};
