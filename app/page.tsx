import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { homePathForRole } from "@/lib/permissions";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  redirect(homePathForRole(user.role));
}
