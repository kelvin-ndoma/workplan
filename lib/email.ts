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

export function firstNameFrom(name?: string | null, email?: string | null) {
  const fromName = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0];
  if (fromName) return fromName;
  const local = String(email ?? "")
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim();
  if (local) return local.charAt(0).toUpperCase() + local.slice(1);
  return "there";
}

function addressedTo(email: string, name?: string | null) {
  const safeName = String(name ?? "")
    .replace(/[<>\r\n"]/g, "")
    .trim();
  return safeName ? `${safeName} <${email}>` : email;
}

export async function sendEmail(input: {
  to: string;
  toName?: string | null;
  subject: string;
  text: string;
  html?: string;
}) {
  if (!isEmailConfigured()) return { skipped: true as const };
  const email = input.to.trim().toLowerCase();
  if (!isAllowedWorkEmail(email)) {
    return { error: "Invites can only go to Burns Brothers email addresses." };
  }
  const from = process.env.EMAIL_FROM || "WorkPlan <onboarding@resend.dev>";
  try {
    const { error } = await client().emails.send({
      from,
      to: [addressedTo(email, input.toName)],
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
        : input.kind === "CALL_DAY_BEFORE"
          ? `tomorrow (${input.dayName}, ${input.dateLabel}) at 3:30 PM EAT / 8:30 AM ET`
          : `${input.dayName}, ${input.dateLabel} at 3:30 PM EAT / 8:30 AM ET`;
  const subject =
    input.kind === "CALL_HOUR_BEFORE"
      ? `Call in 1 hour — please update your WorkPlan status`
      : input.kind === "CALL_DAY_OF"
        ? `Update your status before today's ${input.dayName} call`
        : input.kind === "CALL_DAY_BEFORE"
          ? `Reminder: ${input.dayName} call tomorrow — update your WorkPlan status`
          : `Please update your WorkPlan status before the ${input.dayName} call`;
  const note = input.note?.trim();
  const ask = input.senderName
    ? `${input.senderName} asked me to remind you: remember to update your WorkPlan status before the next call.`
    : input.kind === "CALL_DAY_BEFORE"
      ? "This is a reminder: the team call is tomorrow. Remember to update your WorkPlan status."
      : "Remember to update your WorkPlan status before the next call.";
  const text = [
    `Hi ${input.name},`,
    "",
    ask,
    `The next call is ${when}.`,
    "",
    ...(note ? [`Note: ${note}`, ""] : []),
    "Open My status and save your update for that call:",
    input.statusUrl,
    "",
    `If you are sharing in Teams, open Share screen: ${input.shareUrl}`,
    "One person shares that tab. Nobody else shares their laptop.",
    "",
    "WorkPlan",
  ].join("\n");
  const html = `
    <p>Hi ${input.name},</p>
    <p>${ask.replace("WorkPlan status", "<strong>WorkPlan status</strong>")}</p>
    <p>The next call is <strong>${when}</strong>.</p>
    ${note ? `<p style="background:#fff8e8;border:1px solid #f3e0a8;padding:12px;border-radius:8px">${note}</p>` : ""}
    <p><a href="${input.statusUrl}">Update your status for this call</a></p>
    <p>If you are sharing in Teams, open <a href="${input.shareUrl}">Share screen</a>.</p>
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
  const signInUrl = input.signInUrl || input.resetUrl.replace(/\/reset-password.*$/, "/login");
  const subject = "You’ve been invited to the Africa WorkPlan team brief";
  const text = [
    `Hi ${input.name},`,
    "",
    "You have been invited to the Africa WorkPlan team brief.",
    "Use it to update your work before the Tuesday and Friday calls (3:30 PM EAT / 8:30 AM ET).",
    "",
    "What to do now",
    "",
    "1. Open this link on your computer (it expires in 24 hours):",
    input.resetUrl,
    "2. Choose a password of at least 10 characters, with letters and a number. You will be asked to type it twice.",
    "3. You’ll be taken to the sign-in page. Sign in with this work email and the password you just set.",
    `   Sign in: ${signInUrl}`,
    "4. Open My status, update your row, and save. That is what the team walks through on the call.",
    "",
    "If the link has expired",
    "Ask the person who invited you to resend it from Admin, or go to Sign in → Forgot password? and we’ll email a new link.",
    "",
    "If anything does not work, or you are not sure what to do, reach out to Kelvin at kelvin@theburnsbrothers.com.",
    "",
    "Do not share this email or the link. Only you should set this password.",
    "If you did not expect this invite, you can ignore this message.",
    "",
    "WorkPlan · TBB Africa",
  ].join("\n");
  const html = `
    <div style="font-family:Georgia,Times,serif;font-size:16px;line-height:1.55;color:#1a1a1a;max-width:560px">
      <p>Hi ${input.name},</p>
      <p>You have been invited to the <strong>Africa WorkPlan team brief</strong>.</p>
      <p>Use it to update your work before the Tuesday and Friday calls (3:30 PM EAT / 8:30 AM ET).</p>
      <p style="margin:24px 0 8px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#555">What to do now</p>
      <ol style="padding-left:20px">
        <li style="margin-bottom:10px">Open the button below on your computer. The link expires in <strong>24 hours</strong>.</li>
        <li style="margin-bottom:10px">Choose a password of at least <strong>10 characters</strong>, with letters and a number. You will be asked to type it twice.</li>
        <li style="margin-bottom:10px">You’ll land on the sign-in page. Sign in with <strong>this work email</strong> and the password you just set.</li>
        <li style="margin-bottom:10px">Open <strong>My status</strong>, update your row, and save. That is what the team walks through on the call.</li>
      </ol>
      <p style="margin:24px 0">
        <a href="${input.resetUrl}" style="display:inline-block;background:#1e3a5f;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600">Set your password</a>
      </p>
      <p style="font-size:14px;color:#444">After that, sign in anytime at <a href="${signInUrl}">${signInUrl}</a>.</p>
      <p style="margin-top:24px;font-size:14px;color:#444"><strong>If the link has expired</strong><br/>Ask the person who invited you to resend it from Admin, or go to Sign in → Forgot password? and we’ll email a new link.</p>
      <p style="font-size:14px;color:#444">If anything does not work, or you are not sure what to do, reach out to Kelvin at <a href="mailto:kelvin@theburnsbrothers.com">kelvin@theburnsbrothers.com</a>.</p>
      <p style="font-size:13px;color:#667">Do not share this email or the link. Only you should set this password. If you did not expect this invite, you can ignore this message.</p>
      <p style="color:#667;font-size:13px">WorkPlan · TBB Africa</p>
    </div>
  `;
  return { subject, text, html };
}
