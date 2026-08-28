import type { DefaultSession } from "next-auth";
import type { Role } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      avatar?: string;
      jobTitle?: string;
      departmentId?: string;
      managerId?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    avatar?: string;
    jobTitle?: string;
    departmentId?: string;
    managerId?: string;
    remember?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    avatar?: string;
    jobTitle?: string;
    departmentId?: string;
    managerId?: string;
    remember?: boolean;
    loginAt?: number;
  }
}
