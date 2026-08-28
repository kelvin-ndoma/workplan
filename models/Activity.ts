import mongoose, { Schema } from "mongoose";
import { ACTIVITY_TYPES, TASK_STATUSES } from "@/types";

const ActivitySchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    message: { type: String, required: true },
    previousProgress: { type: Number },
    newProgress: { type: Number },
    previousStatus: { type: String, enum: TASK_STATUSES },
    newStatus: { type: String, enum: TASK_STATUSES },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ActivitySchema.index({ taskId: 1, createdAt: -1 });
ActivitySchema.index({ userId: 1, createdAt: -1 });
ActivitySchema.index({ type: 1, createdAt: -1 });

export const Activity =
  mongoose.models.Activity || mongoose.model("Activity", ActivitySchema);
