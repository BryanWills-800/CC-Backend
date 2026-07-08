const homeController = (req, res) => {
    res.render("home");
}

const loginController = (req, res) => {
    res.render("login");
}

const signupController = (req, res) => {
    res.render("signup");
}

const logoutController = (req, res) => {
    res.render("logout");
}

const updateController = (req, res) => {
    res.render("update");
}

const deleteController = (req, res) => {
    res.render("delete");
}

const mainController = (req, res) => {
    const allowedRoles = ["admin", "maintainer", "member", "viewer"];
    const role = allowedRoles.includes(req.user && req.user.role)
        ? req.user.role
        : "viewer";

    res.render("main", { role });
}

module.exports = {
    homeController,
    loginController,
    signupController,
    logoutController,
    updateController,
    deleteController,
    mainController
};

