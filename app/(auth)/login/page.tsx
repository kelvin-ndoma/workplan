import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { safeInternalPath } from "@/lib/safe-path";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string; reset?: string }>;
}) {
  const { callbackUrl, error, reset } = await searchParams;

  return (
    <AuthShell>
      <p className="text-lg font-semibold lg:hidden">WorkPlan</p>
      <h2 className="mt-2 text-2xl font-semibold">Sign in</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your Burns Brothers email and password. If you were invited today, open the email first and set your password.
      </p>
      <LoginForm callbackUrl={safeInternalPath(callbackUrl)} error={error} reset={reset} />
    </AuthShell>
  );
}
