import mongoose, { Schema } from "mongoose";

const RateLimitSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  resetAt: { type: Date, required: true },
});

RateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit =
  mongoose.models.RateLimit || mongoose.model("RateLimit", RateLimitSchema);
