const { defaultDeps } = require("../actions/shared");
const { requireTeamMember } = require("./queryAccess");

const listActivityQuery = async ({ teamId, userId }, deps = defaultDeps) => {
    await requireTeamMember({ teamId, userId }, deps);
    const activity = await deps.ActivityLog.findForTeam(teamId);

    return { message: `Found ${activity.length} activity item(s).`, data: activity };
};

module.exports = {
    listActivityQuery,
};
