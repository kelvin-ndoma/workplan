import mongoose, { Schema } from "mongoose";

const DepartmentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    managerId: { type: Schema.Types.ObjectId, ref: "User" },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

DepartmentSchema.index({ name: 1 }, { unique: true });

export const Department =
  mongoose.models.Department || mongoose.model("Department", DepartmentSchema);
