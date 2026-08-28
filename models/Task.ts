import mongoose, { Schema } from "mongoose";
import { TASK_STATUSES, PRIORITIES } from "@/types";

const TaskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    deliverableId: { type: Schema.Types.ObjectId, ref: "Deliverable", required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: TASK_STATUSES, default: "NOT_STARTED" },
    priority: { type: String, enum: PRIORITIES, default: "MEDIUM" },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    weight: { type: Number, min: 1, default: 1 },
    startDate: { type: Date },
    dueDate: { type: Date },
    completedAt: { type: Date },
    actionsTaken: [{ type: String }],
    nextAction: { type: String, default: "" },
    nextActions: [{ type: String }],
    supportNeeded: { type: Boolean, default: false },
    supportDescription: { type: String, default: "" },
    blocker: { type: String, default: "" },
    blockedBy: { type: Schema.Types.ObjectId, ref: "User" },
    dependencyIds: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    tags: [{ type: String }],
    workPlanMonth: { type: String, required: true },
    talkingPoints: [{ type: String }],
    meetingId: { type: Schema.Types.ObjectId, ref: "Meeting" },
  },
  { timestamps: true },
);

TaskSchema.index({ assignedTo: 1, workPlanMonth: 1, status: 1 });
TaskSchema.index({ projectId: 1, deliverableId: 1 });
TaskSchema.index({ dueDate: 1, status: 1 });
TaskSchema.index({ title: "text", description: "text", nextAction: "text" });

export const Task = mongoose.models.Task || mongoose.model("Task", TaskSchema);
