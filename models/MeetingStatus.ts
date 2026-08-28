import mongoose, { Schema } from "mongoose";
import { TASK_STATUSES } from "@/types";

const MeetingStatusSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    meetingDate: { type: String, required: true },
    actionsTaken: [{ type: String }],
    nextActions: [{ type: String }],
    supportDescription: { type: String, default: "" },
    status: { type: String, enum: TASK_STATUSES, default: "NOT_STARTED" },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

MeetingStatusSchema.index({ taskId: 1, meetingDate: 1 }, { unique: true });
MeetingStatusSchema.index({ meetingDate: 1 });

export const MeetingStatus =
  mongoose.models.MeetingStatus || mongoose.model("MeetingStatus", MeetingStatusSchema);
