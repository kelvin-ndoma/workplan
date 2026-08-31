import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthShell>
      <p className="text-lg font-semibold lg:hidden">WorkPlan</p>
      <h2 className="mt-2 text-2xl font-semibold">Choose a new password</h2>
      <p className="mt-1 text-sm text-muted-foreground">Use at least 10 characters, with letters and a number.</p>
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
