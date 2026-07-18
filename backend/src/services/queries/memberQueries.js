const { defaultDeps } = require("../actions/shared");
const { requireTeamMember } = require("./queryAccess");

const listTeamMembersQuery = async ({ teamId, userId }, deps = defaultDeps) => {
    await requireTeamMember({ teamId, userId }, deps);
    const members = await deps.TeamMembership.findForTeam(teamId);

    return { message: `Found ${members.length} member(s).`, data: members };
};

module.exports = {
    listTeamMembersQuery,
};
