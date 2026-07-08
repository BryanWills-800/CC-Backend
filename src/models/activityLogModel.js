const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: {
      type: String,
      required: true,
      enum: [
        "team.created",
        "team.joined",
        "team.member_invited",
        "team.member_role_updated",
        "project.created",
        "project.updated",
        "project.deleted",
        "task.created",
        "task.updated",
        "task.assigned",
        "task.deleted",
        "comment.created",
        "comment.updated",
        "comment.deleted"
      ],
      index: true
    },
    entityType: { type: String, enum: ["team", "project", "task", "comment", "user"], required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: null }
  },
  { timestamps: true }
);

activityLogSchema.index({ team: 1, createdAt: -1 });
activityLogSchema.index({ actor: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
