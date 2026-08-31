import bcrypt from "bcryptjs";

export const PASSWORD_MIN_LENGTH = 10;
export const BCRYPT_ROUNDS = 12;

const BLOCKED_PASSWORDS = new Set([
  "WorkPlan2026!",
  "password",
  "password1",
  "password123",
  "12345678",
  "1234567890",
]);

export function isBlockedPassword(password: string) {
  return BLOCKED_PASSWORDS.has(password);
}

export function passwordPolicyError(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (isBlockedPassword(password)) {
    return "Choose a different password. That one is not allowed.";
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Use letters and at least one number.";
  }
  return null;
}

export async function hashMatchesBlockedPassword(passwordHash?: string | null) {
  if (!passwordHash) return false;
  for (const candidate of BLOCKED_PASSWORDS) {
    if (await bcrypt.compare(candidate, passwordHash)) return true;
  }
  return false;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}
