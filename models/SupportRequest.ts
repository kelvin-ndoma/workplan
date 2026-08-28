import mongoose, { Schema } from "mongoose";
import { SUPPORT_STATUSES } from "@/types";

const SupportRequestSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    description: { type: String, required: true },
    status: { type: String, enum: SUPPORT_STATUSES, default: "OPEN" },
    resolution: { type: String, default: "" },
    resolvedAt: { type: Date },
    meetingId: { type: Schema.Types.ObjectId, ref: "Meeting" },
  },
  { timestamps: true },
);

SupportRequestSchema.index({ status: 1, createdAt: -1 });
SupportRequestSchema.index({ taskId: 1 });
SupportRequestSchema.index({ requestedBy: 1, status: 1 });

export const SupportRequest =
  mongoose.models.SupportRequest ||
  mongoose.model("SupportRequest", SupportRequestSchema);
