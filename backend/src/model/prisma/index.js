const activityLogModel = require("./activityLogModel");
const commentModel = require("./commentModel");
const projectModel = require("./projectModel");
const refreshTokenModel = require("./refreshTokenModel");
const taskModel = require("./taskModel");
const teamInvitationModel = require("./teamInvitationModel");
const teamMembershipModel = require("./teamMembershipModel");
const teamModel = require("./teamModel");
const tokenModel = require("./tokenModel");
const userModel = require("./userModel");

const prismaModelCopy = {
    activityLogModel,
    commentModel,
    projectModel,
    refreshTokenModel,
    taskModel,
    teamInvitationModel,
    teamMembershipModel,
    teamModel,
    tokenModel,
    userModel,
};

module.exports = { prismaModelCopy };
