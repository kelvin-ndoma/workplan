import mongoose, { Schema } from "mongoose";
import { COMMENT_TARGETS } from "@/types";

const CommentSchema = new Schema(
  {
    targetType: { type: String, enum: COMMENT_TARGETS, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true },
    mentions: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

CommentSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export const Comment =
  mongoose.models.Comment || mongoose.model("Comment", CommentSchema);
