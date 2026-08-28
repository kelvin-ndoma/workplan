import mongoose, { Schema } from "mongoose";
import { MEETING_STATUSES } from "@/types";

const MeetingSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    startTime: { type: String, default: "15:30" },
    endTime: { type: String, default: "16:30" },
    participantIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    departmentIds: [{ type: Schema.Types.ObjectId, ref: "Department" }],
    projectIds: [{ type: Schema.Types.ObjectId, ref: "Project" }],
    agenda: [{ type: String }],
    notes: { type: String, default: "" },
    summary: { type: String, default: "" },
    status: { type: String, enum: MEETING_STATUSES, default: "SCHEDULED" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    hostId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    workPlanMonth: { type: String, required: true },
    liveState: {
      currentSlideIndex: { type: Number, default: 0 },
      currentPresenterId: { type: Schema.Types.ObjectId, ref: "User" },
      isPaused: { type: Boolean, default: false },
      startedAt: { type: Date },
      endedAt: { type: Date },
    },
    durationMinutes: { type: Number },
  },
  { timestamps: true },
);

MeetingSchema.index({ date: -1, status: 1 });
MeetingSchema.index({ participantIds: 1, date: -1 });
MeetingSchema.index({ title: "text", notes: "text", summary: "text" });

export const Meeting =
  mongoose.models.Meeting || mongoose.model("Meeting", MeetingSchema);
