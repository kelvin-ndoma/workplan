import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <AuthShell>
      <p className="text-lg font-semibold lg:hidden">WorkPlan</p>
      <h2 className="mt-2 text-2xl font-semibold">Reset password</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your email and we will send a reset link if an account exists.
      </p>
      <ForgotPasswordForm defaultEmail={email} />
    </AuthShell>
  );
}
