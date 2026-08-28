import mongoose, { Schema } from "mongoose";

const ReminderLogSchema = new Schema(
  {
    kind: {
      type: String,
      enum: ["CALL_DAY_BEFORE", "CALL_DAY_OF", "CALL_HOUR_BEFORE", "UPDATE_STATUS"],
      required: true,
    },
    meetingDate: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    recipientCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

ReminderLogSchema.index({ kind: 1, meetingDate: 1 }, { unique: true });

export const ReminderLog =
  mongoose.models.ReminderLog || mongoose.model("ReminderLog", ReminderLogSchema);
