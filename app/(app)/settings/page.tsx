import { requireUser } from "@/lib/session";
import { updateProfileAction } from "@/app/actions/work";
import { PageHeader } from "@/components/work-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChangePasswordForm } from "@/components/change-password-form";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="max-w-lg space-y-6">
      <PageHeader title="Settings" description="Your profile and password. Role changes are managed in Admin." />
      <form
        action={async (formData) => {
          "use server";
          await updateProfileAction({
            name: String(formData.get("name") || ""),
            jobTitle: String(formData.get("jobTitle") || ""),
          });
        }}
        className="space-y-4 rounded-2xl border bg-card p-5"
      >
        <p className="text-sm font-semibold">Profile</p>
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={user.name} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="jobTitle">Job title</Label>
          <Input id="jobTitle" name="jobTitle" defaultValue={user.jobTitle} className="mt-1" />
        </div>
        <div>
          <Label>Email</Label>
          <Input defaultValue={user.email} disabled className="mt-1" />
        </div>
        <div>
          <Label>Role</Label>
          <Input defaultValue={user.role} disabled className="mt-1" />
        </div>
        <Button type="submit">Save profile</Button>
      </form>
      <ChangePasswordForm />
    </div>
  );
}
