import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { isAllowedWorkEmail } from "@/lib/allowed-email";
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

        await connectDB();
        const user = await User.findOne({ email, isActive: true });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

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
        };
      },
    }),
  ],
});
