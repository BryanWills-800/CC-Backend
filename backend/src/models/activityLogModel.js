const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
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
        "comment.deleted",
      ],
      index: true,
    },
    entityType: {
      type: String,
      enum: ["team", "project", "task", "comment", "user"],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

activityLogSchema.index({ team: 1, createdAt: -1 });
activityLogSchema.index({ actor: 1, createdAt: -1 });

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
const eventBuffer = [];

ActivityLog.flushEvents = async () => {
  if (!eventBuffer.length) return;

  const events = eventBuffer.splice(0, eventBuffer.length);

  try {
    await ActivityLog.insertMany(events);
  } catch (error) {
    console.error("Failed to flush activity events", error);
  }
};

ActivityLog.addEvent = (event) => {
  eventBuffer.push({
    ...event,
    createdAt: event.createdAt || new Date(),
  });

  if (eventBuffer.length >= 20) {
    return ActivityLog.flushEvents();
  }

  return null;
};

const flushInterval = setInterval(ActivityLog.flushEvents, 5000);
if (typeof flushInterval.unref === "function") flushInterval.unref();

module.exports = ActivityLog;
