import mongoose, { Schema } from "mongoose";

const DecisionSchema = new Schema(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: "Meeting", required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    decision: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

DecisionSchema.index({ meetingId: 1, createdAt: -1 });

export const Decision =
  mongoose.models.Decision || mongoose.model("Decision", DecisionSchema);
