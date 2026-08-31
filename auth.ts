import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { isAllowedWorkEmail } from "@/lib/allowed-email";
import { isBlockedPassword } from "@/lib/password";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { User } from "@/models/User";
import { authConfig } from "@/auth.config";
import type { Role } from "@/types";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember me", type: "text" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        if (!isAllowedWorkEmail(email)) return null;

        const emailGate = await rateLimit(`login:email:${email}`, 8, 10 * 60 * 1000);
        const ipGate = await rateLimit(await clientKey("login-ip", "all"), 40, 10 * 60 * 1000);
        if (!emailGate.ok || !ipGate.ok) return null;

        try {
          await connectDB();
          const user = await User.findOne({ email, isActive: true }).select(
            "name email role avatar jobTitle departmentId managerId passwordHash invitePending credentialsVersion",
          );
          if (!user) return null;

          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) return null;
          if (isBlockedPassword(password)) return null;
          if (user.invitePending) return null;

          return {
            id: String(user._id),
            name: user.name,
            email: user.email,
            role: user.role as Role,
            avatar: user.avatar,
            jobTitle: user.jobTitle,
            departmentId: user.departmentId ? String(user.departmentId) : undefined,
            managerId: user.managerId ? String(user.managerId) : undefined,
            remember: String(credentials?.remember ?? "") === "true",
            credentialsVersion: Number(user.credentialsVersion ?? 0),
          };
        } catch (error) {
          console.error("Login authorize failed", error);
          return null;
        }
      },
    }),
  ],
});
