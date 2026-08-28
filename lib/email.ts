import { Resend } from "resend";
import { isAllowedWorkEmail } from "@/lib/allowed-email";
import { appUrl } from "@/lib/app-url";

export { appUrl };

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

function client() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendEmail(input: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}) {
  if (!isEmailConfigured()) return { skipped: true as const };
  const recipients = (Array.isArray(input.to) ? input.to : [input.to]).map((item) => item.trim().toLowerCase());
  if (recipients.some((item) => !isAllowedWorkEmail(item))) {
    return { error: "Invites can only go to Burns Brothers email addresses." };
  }
  const from = process.env.EMAIL_FROM || "WorkPlan <onboarding@resend.dev>";
  try {
    const { error } = await client().emails.send({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html ?? `<p>${input.text.replaceAll("\n", "<br/>")}</p>`,
    });
    if (error) {
      console.error("Resend error", error);
      return { error: error.message };
    }
    return { sent: true as const };
  } catch (error) {
    console.error("Email send failed", error);
    return { error: error instanceof Error ? error.message : "Email failed" };
  }
}

export function assignmentEmail(input: {
  assigneeName: string;
  assignerName: string;
  title: string;
  monthLabel: string;
  taskUrl: string;
  statusUrl: string;
}) {
  const subject = `${input.assignerName} assigned you: ${input.title}`;
  const text = [
    `Hi ${input.assigneeName},`,
    "",
    `${input.assignerName} assigned you a piece of the ${input.monthLabel} focus:`,
    input.title,
    "",
    `Update your status here: ${input.statusUrl}`,
    `Open the piece: ${input.taskUrl}`,
    "",
    "WorkPlan",
  ].join("\n");
  const html = `
    <p>Hi ${input.assigneeName},</p>
    <p><strong>${input.assignerName}</strong> assigned you a piece of the ${input.monthLabel} focus:</p>
    <p style="font-size:18px;font-weight:600">${input.title}</p>
    <p><a href="${input.statusUrl}">Update your status</a> · <a href="${input.taskUrl}">Open the piece</a></p>
    <p style="color:#667">WorkPlan · TBB Africa</p>
  `;
  return { subject, text, html };
}

export function callReminderEmail(input: {
  name: string;
  dayName: string;
  dateLabel: string;
  kind: "CALL_DAY_BEFORE" | "CALL_DAY_OF" | "CALL_HOUR_BEFORE" | "UPDATE_STATUS";
  statusUrl: string;
  shareUrl: string;
  note?: string;
  senderName?: string;
}) {
  const when =
    input.kind === "CALL_HOUR_BEFORE"
      ? `in about an hour (${input.dayName} at 3:30 PM EAT / 8:30 AM ET)`
      : input.kind === "CALL_DAY_OF"
        ? `today (${input.dayName}) at 3:30 PM EAT / 8:30 AM ET`
        : `${input.dayName}, ${input.dateLabel} at 3:30 PM EAT / 8:30 AM ET`;
  const subject =
    input.kind === "CALL_HOUR_BEFORE"
      ? `Call in 1 hour — please update your WorkPlan status`
      : input.kind === "CALL_DAY_OF"
        ? `Update your status before today's ${input.dayName} call`
        : `Please update your WorkPlan status before the ${input.dayName} call`;
  const note = input.note?.trim();
  const from = input.senderName ? `${input.senderName} asked` : "Please";
  const text = [
    `Hi ${input.name},`,
    "",
    `${from} the team to update their WorkPlan status before the upcoming session.`,
    `The next call is ${when}.`,
    "",
    ...(note ? [`Note: ${note}`, ""] : []),
    "Open My status and save your update for that call so Share screen is current.",
    input.statusUrl,
    "",
    `If you are driving the call, open Share screen: ${input.shareUrl}`,
    "One person shares that tab in Teams. Nobody else shares their laptop.",
    "",
    "WorkPlan",
  ].join("\n");
  const html = `
    <p>Hi ${input.name},</p>
    <p>${from} the team to <strong>update their WorkPlan status</strong> before the upcoming session.</p>
    <p>The next call is <strong>${when}</strong>.</p>
    ${note ? `<p style="background:#fff8e8;border:1px solid #f3e0a8;padding:12px;border-radius:8px">${note}</p>` : ""}
    <p><a href="${input.statusUrl}">Update your status for this call</a></p>
    <p>If you are driving the call, open <a href="${input.shareUrl}">Share screen</a> and share that tab in Teams.</p>
    <p style="color:#667">WorkPlan · TBB Africa</p>
  `;
  return { subject, text, html };
}

export function passwordResetEmail(input: { name: string; resetUrl: string }) {
  const subject = "Reset your WorkPlan password";
  const text = [
    `Hi ${input.name},`,
    "",
    "Use this link to choose a new WorkPlan password. It expires in one hour.",
    input.resetUrl,
    "",
    "If you did not ask for this, you can ignore the email.",
    "",
    "WorkPlan",
  ].join("\n");
  const html = `
    <p>Hi ${input.name},</p>
    <p>Use this link to choose a new WorkPlan password. It expires in one hour.</p>
    <p><a href="${input.resetUrl}">Reset password</a></p>
    <p style="color:#667">If you did not ask for this, you can ignore the email.</p>
  `;
  return { subject, text, html };
}

export function accountInviteEmail(input: { name: string; resetUrl: string; signInUrl?: string }) {
  const subject = "You’re invited to WorkPlan";
  const text = [
    `Hi ${input.name},`,
    "",
    "You’ve been invited to WorkPlan, the Burns Brothers team status board.",
    "Use this link to set your password. It expires in 24 hours.",
    input.resetUrl,
    "",
    "After that, sign in with your work email.",
    "",
    "WorkPlan",
  ].join("\n");
  const html = `
    <p>Hi ${input.name},</p>
    <p>You’ve been invited to <strong>WorkPlan</strong>, the Burns Brothers team status board.</p>
    <p>Set your password to sign in. This link expires in 24 hours.</p>
    <p><a href="${input.resetUrl}">Set your password</a></p>
    <p style="color:#667">WorkPlan · Burns Brothers</p>
  `;
  return { subject, text, html };
}
