const defaultTeam = {
    teamId: "team-1",
    teamName: "Test Team",
    slug: "test-team",
};

const defaultUser = {
    userId: "user-1",
    name: "Test User",
    email: "test.user@example.test",
    avatarUrl: null,
};

const defaultMembership = {
    membershipId: "membership-1",
    role: "owner",
};

const teamMaker = (options = {}) => {
    const team = { ...defaultTeam, ...(options.team || {}) };
    const user = { ...defaultUser, ...(options.user || {}) };
    const membership = {
        ...defaultMembership,
        ...(options.membership || {}),
        teamId: team.teamId,
        userId: user.userId,
    };

    return (req, res, next) => {
        req.team = team;
        req.membership = membership;
        req.user = {
            ...user,
            teamId: team.teamId,
            teamName: team.teamName,
            role: membership.role,
        };

        return next();
    };
};

module.exports = { teamMaker };
