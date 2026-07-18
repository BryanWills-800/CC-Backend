const { defaultDeps } = require("../actions/shared");
const { requireProjectMember, requireTeamMember } = require("./queryAccess");

const listProjectsQuery = async ({ teamId, userId }, deps = defaultDeps) => {
    await requireTeamMember({ teamId, userId }, deps);
    const projects = await deps.Project.findForTeam(teamId);

    return { message: `Found ${projects.length} project(s).`, data: projects };
};

const getProjectQuery = async ({ projectId, userId }, deps = defaultDeps) => {
    const project = await requireProjectMember({ projectId, userId }, deps);

    return { message: "Project retrieved successfully.", data: project };
};

module.exports = {
    getProjectQuery,
    listProjectsQuery,
};
