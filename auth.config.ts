import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/types";

const secret = process.env.AUTH_SECRET;
if (!secret || secret.length < 32) {
  throw new Error("AUTH_SECRET is missing or too short. Use `openssl rand -base64 32`.");
}

const secure =
  (process.env.AUTH_URL ?? "").startsWith("https://") ||
  Boolean(process.env.VERCEL);

export const authConfig = {
  trustHost: true,
  secret,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30,
    updateAge: 60 * 60,
  },
  useSecureCookies: secure,
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
        token.avatar = user.avatar;
        token.jobTitle = user.jobTitle;
        token.departmentId = user.departmentId;
        token.managerId = user.managerId;
        token.remember = Boolean(user.remember);
        token.loginAt = Math.floor(Date.now() / 1000);
      }
      const maxAge = token.remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
      if (typeof token.loginAt === "number") {
        token.exp = token.loginAt + maxAge;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.role = token.role as Role;
        session.user.avatar = token.avatar as string | undefined;
        session.user.jobTitle = token.jobTitle as string | undefined;
        session.user.departmentId = token.departmentId as string | undefined;
        session.user.managerId = token.managerId as string | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
