import mongoose, { Schema } from "mongoose";
import { PROJECT_STATUSES, PRIORITIES } from "@/types";

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    status: { type: String, enum: PROJECT_STATUSES, default: "ACTIVE" },
    priority: { type: String, enum: PRIORITIES, default: "MEDIUM" },
    startDate: { type: Date },
    targetDate: { type: Date },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    color: { type: String, default: "#2563eb" },
  },
  { timestamps: true },
);

ProjectSchema.index({ status: 1, ownerId: 1 });
ProjectSchema.index({ memberIds: 1 });
ProjectSchema.index({ name: "text", description: "text" });

export const Project =
  mongoose.models.Project || mongoose.model("Project", ProjectSchema);
