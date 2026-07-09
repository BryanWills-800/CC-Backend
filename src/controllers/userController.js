const { resolveMainRole } = require("../utils/roles");

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
    const requestedRole = req.user && req.user.role ? req.user.role : process.env.ROLE;
    const role = resolveMainRole(requestedRole);

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





