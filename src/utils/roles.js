const resolveMainRole = (requestedRole) => {
    const role = String(requestedRole || "").trim().toLowerCase();
    const roleAliases = { owner: "admin" };
    const normalizedRole = roleAliases[role] || role;
    const allowedRoles = ["admin", "maintainer", "member", "viewer"];

    return allowedRoles.includes(normalizedRole) ? normalizedRole : "viewer";
}

module.exports = { resolveMainRole };
