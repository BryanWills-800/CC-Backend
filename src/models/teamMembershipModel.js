const mongoose = require("mongoose");

const teamMembershipSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["owner", "maintainer", "member", "viewer"],
      required: true,
      default: "member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

teamMembershipSchema.index({ team: 1, user: 1 }, { unique: true });
teamMembershipSchema.index({ user: 1, role: 1 });

module.exports = mongoose.model("TeamMembership", teamMembershipSchema);
