import mongoose, { Schema } from "mongoose";
import { PROJECT_STATUSES, PRIORITIES } from "@/types";

const DeliverableSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    status: { type: String, enum: PROJECT_STATUSES, default: "ACTIVE" },
    priority: { type: String, enum: PRIORITIES, default: "MEDIUM" },
    startDate: { type: Date },
    dueDate: { type: Date },
  },
  { timestamps: true },
);

DeliverableSchema.index({ projectId: 1, ownerId: 1 });
DeliverableSchema.index({ name: "text", description: "text" });

export const Deliverable =
  mongoose.models.Deliverable || mongoose.model("Deliverable", DeliverableSchema);
