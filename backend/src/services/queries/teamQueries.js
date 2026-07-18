const { defaultDeps } = require("../actions/shared");
const { requireTeamMember } = require("./queryAccess");

const getTeamQuery = async ({ teamId, userId }, deps = defaultDeps) => {
    const { team } = await requireTeamMember({ teamId, userId }, deps);

    return { message: "Team retrieved successfully.", data: team };
};

module.exports = {
    getTeamQuery,
};
