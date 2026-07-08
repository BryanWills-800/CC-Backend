const mongoose = require("mongoose");

const teamInvitationSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: ["maintainer", "member", "viewer"], default: "member" },
    tokenHash: { type: String, required: true, select: false },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "revoked", "expired"], default: "pending", index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    acceptedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

teamInvitationSchema.index({ team: 1, email: 1, status: 1 });

module.exports = mongoose.model("TeamInvitation", teamInvitationSchema);
