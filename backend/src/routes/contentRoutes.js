const express = require("express");
const { actionController } = require("../controllers/actionController");
const { authenticateUser, authorizeUserRole } = require("../middlewares/authMiddleware");

const router = express.Router();

const authorizeActionRole = (req, res, next) => {
    const action = (req.body && req.body.action) || (req.query && req.query.action);

    if (action === "createTeam") {
        return next();
    }

    return authorizeUserRole(req, res, next);
};

router.get("/actions", authenticateUser, authorizeActionRole, actionController);
router.post("/actions", authenticateUser, authorizeActionRole, actionController);

module.exports = router;