import { connectDB } from "@/lib/db";
import { RateLimit } from "@/models/RateLimit";

export async function rateLimit(key: string, limit: number, windowMs: number) {
  const now = new Date();
  try {
    await connectDB();
    const bumped = await RateLimit.findOneAndUpdate(
      { key, resetAt: { $gt: now }, count: { $lt: limit } },
      { $inc: { count: 1 } },
      { new: true },
    );
    if (bumped) {
      return { ok: true as const, remaining: Math.max(0, limit - bumped.count) };
    }

    const existing = await RateLimit.findOne({ key }).lean();
    if (existing && existing.resetAt > now) {
      return { ok: false as const, remaining: 0, retryAt: existing.resetAt.getTime() };
    }

    await RateLimit.findOneAndUpdate(
      { key },
      { $set: { count: 1, resetAt: new Date(now.getTime() + windowMs) } },
      { upsert: true },
    );
    return { ok: true as const, remaining: limit - 1 };
  } catch (error) {
    console.error("Rate limit failed closed", error);
    return { ok: false as const, remaining: 0, retryAt: now.getTime() + windowMs };
  }
}

export async function clientKey(prefix: string, extra: string) {
  const { headers } = await import("next/headers");
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  return `${prefix}:${ip}:${extra.toLowerCase()}`;
}
