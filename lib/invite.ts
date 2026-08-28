import { createHash, randomBytes } from "crypto";
import { addHours } from "date-fns";
import { connectDB } from "@/lib/db";
import { accountInviteEmail, appUrl, isEmailConfigured, sendEmail } from "@/lib/email";
import { User } from "@/models";

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function sendAccountInvite(userId: string) {
  if (!isEmailConfigured()) {
    return { error: "Email is not set up yet. Add RESEND_API_KEY to send invites." };
  }

  await connectDB();
  const user = await User.findById(userId);
  if (!user || !user.isActive) return { error: "Person not found." };

  const token = randomBytes(32).toString("hex");
  user.passwordResetToken = hashResetToken(token);
  user.passwordResetExpires = addHours(new Date(), 24);
  await user.save();

  const result = await sendEmail({
    to: user.email,
    ...accountInviteEmail({
      name: String(user.name).split(" ")[0],
      resetUrl: `${appUrl()}/reset-password?token=${token}`,
      signInUrl: `${appUrl()}/login`,
    }),
  });
  if (result && "error" in result && result.error) {
    return { error: "Could not send the invite. Try again in a minute." };
  }
  return { ok: true as const, email: String(user.email) };
}
