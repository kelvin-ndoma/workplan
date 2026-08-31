import mongoose, { Schema } from "mongoose";
import { ROLES } from "@/types";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true, default: "TEAM_MEMBER" },
    avatar: { type: String, default: "" },
    jobTitle: { type: String, default: "" },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    managerId: { type: Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
    invitePending: { type: Boolean, default: false },
    credentialsVersion: { type: Number, default: 0 },
    passwordResetToken: { type: String, default: "" },
    passwordResetExpires: { type: Date },
  },
  { timestamps: true },
);

UserSchema.index({ departmentId: 1, isActive: 1 });
UserSchema.index({ role: 1 });

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
