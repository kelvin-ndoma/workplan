import { createHash, randomBytes } from "crypto";
import { addHours } from "date-fns";
import { connectDB } from "@/lib/db";
import { accountInviteEmail, appUrl, firstNameFrom, isEmailConfigured, sendEmail } from "@/lib/email";
import { hashMatchesBlockedPassword } from "@/lib/password";
import { User } from "@/models";

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function needsActivationInvite(user: {
  invitePending?: boolean | null;
  passwordHash?: string | null;
}) {
  if (user.invitePending) return true;
  return hashMatchesBlockedPassword(user.passwordHash);
}

export async function sendAccountInvite(userId: string) {
  if (!isEmailConfigured()) {
    return { error: "Email is not set up yet. Add RESEND_API_KEY to send invites." };
  }

  await connectDB();
  const user = await User.findById(userId);
  if (!user || !user.isActive) return { error: "Person not found." };
  if (!(await needsActivationInvite(user))) {
    return { error: "This person already activated their account. No new invite was sent." };
  }

  const token = randomBytes(32).toString("hex");
  user.passwordResetToken = hashResetToken(token);
  user.passwordResetExpires = addHours(new Date(), 24);
  user.invitePending = true;
  user.credentialsVersion = Number(user.credentialsVersion ?? 0) + 1;
  await user.save();

  const result = await sendEmail({
    to: String(user.email),
    toName: String(user.name),
    ...accountInviteEmail({
      name: firstNameFrom(user.name, user.email),
      resetUrl: `${appUrl()}/reset-password?token=${token}`,
      signInUrl: `${appUrl()}/login`,
    }),
  });
  if (result && "error" in result && result.error) {
    return { error: "Could not send the invite. Try again in a minute." };
  }
  return { ok: true as const, email: String(user.email) };
}
