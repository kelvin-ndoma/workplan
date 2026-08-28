const DEFAULT_DOMAIN = "theburnsbrothers.com";

export function allowedEmailDomain() {
  return (process.env.ALLOWED_EMAIL_DOMAIN || DEFAULT_DOMAIN).replace(/^@/, "").toLowerCase();
}

export function isAllowedWorkEmail(email: string) {
  const value = email.trim().toLowerCase();
  if (!value.includes("@")) return false;
  return value.endsWith(`@${allowedEmailDomain()}`);
}
