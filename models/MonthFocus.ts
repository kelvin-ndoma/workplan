import mongoose, { Schema } from "mongoose";

const MonthFocusSchema = new Schema(
  {
    month: { type: String, required: true, unique: true },
    summary: { type: String, default: "" },
    setBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const MonthFocus =
  mongoose.models.MonthFocus || mongoose.model("MonthFocus", MonthFocusSchema);
