"use server";

import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { addHours } from "date-fns";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { connectDB } from "@/lib/db";
import { appUrl, firstNameFrom, isEmailConfigured, passwordResetEmail, sendEmail } from "@/lib/email";
import { isAllowedWorkEmail } from "@/lib/allowed-email";
import { hashPassword, passwordPolicyError } from "@/lib/password";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { safeInternalPath } from "@/lib/safe-path";
import { requireUser } from "@/lib/session";
import { User } from "@/models/User";

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";
  const redirectTo = safeInternalPath(String(formData.get("callbackUrl") ?? "/"));

  if (!email || !password || !isAllowedWorkEmail(email)) {
    redirect("/login?error=1");
  }

  try {
    await signIn("credentials", { email, password, remember: remember ? "true" : "false", redirectTo });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=1");
    }
    if (typeof error === "object" && error && "digest" in error) {
      throw error;
    }
    console.error("Login action failed", error);
    redirect("/login?error=1");
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return { error: "Enter your email." };
  const resetGate = await rateLimit(await clientKey("reset", email), 5, 15 * 60 * 1000);
  if (!resetGate.ok) {
    return { ok: true as const };
  }
  if (!isEmailConfigured()) {
    return { error: "Password reset email is not set up yet. Ask Kelvin to add the Resend API key." };
  }
  if (!isAllowedWorkEmail(email)) {
    return { ok: true as const };
  }

  try {
    await connectDB();
    const user = await User.findOne({ email, isActive: true }).select("name email");
    if (user) {
      const token = randomBytes(32).toString("hex");
      user.passwordResetToken = hashResetToken(token);
      user.passwordResetExpires = addHours(new Date(), 1);
      await user.save();
      const mail = passwordResetEmail({
        name: firstNameFrom(user.name, user.email),
        resetUrl: `${appUrl()}/reset-password?token=${token}`,
      });
      const result = await sendEmail({
        to: String(user.email),
        toName: String(user.name),
        ...mail,
      });
      if (result && "error" in result && result.error) {
        return { error: "Could not send the reset email. Try again in a minute." };
      }
    }
    return { ok: true as const };
  } catch (error) {
    console.error("Password reset failed", error);
    return { error: "Could not send the reset email. Check that the database and Resend key are set on Vercel, then try again." };
  }
}

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token) return { error: "This reset link is invalid." };
  const policy = passwordPolicyError(password);
  if (policy) return { error: policy };
  if (password !== confirm) return { error: "Passwords do not match." };

  const useGate = await rateLimit(`reset-token:${hashResetToken(token).slice(0, 16)}`, 8, 15 * 60 * 1000);
  if (!useGate.ok) return { error: "Too many tries. Request a new link." };

  await connectDB();
  const user = await User.findOne({
    passwordResetToken: hashResetToken(token),
    passwordResetExpires: { $gt: new Date() },
    isActive: true,
  });
  if (!user) return { error: "This reset link is invalid or has expired." };

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordHash: await hashPassword(password),
        passwordResetToken: "",
        invitePending: false,
        credentialsVersion: Number(user.credentialsVersion ?? 0) + 1,
      },
      $unset: { passwordResetExpires: 1 },
    },
  );
  redirect("/login?reset=1");
}

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!current) return { error: "Enter your current password." };
  const policy = passwordPolicyError(password);
  if (policy) return { error: policy };
  if (password !== confirm) return { error: "Passwords do not match." };
  if (password === current) return { error: "Choose a different password." };

  await connectDB();
  const account = await User.findById(user.id);
  if (!account) return { error: "Account not found." };
  const valid = await bcrypt.compare(current, account.passwordHash);
  if (!valid) return { error: "Current password is incorrect." };

  await User.updateOne(
    { _id: account._id },
    {
      $set: {
        passwordHash: await hashPassword(password),
        passwordResetToken: "",
        invitePending: false,
        credentialsVersion: Number(account.credentialsVersion ?? 0) + 1,
      },
      $unset: { passwordResetExpires: 1 },
    },
  );
  redirect("/login?reset=1");
}
