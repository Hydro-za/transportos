import { AuthCard, Field, Notice, SubmitButton } from "@/components/ui";
import { requireUser } from "@/server/auth/session";
import { changePassword } from "./actions";

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser();
  const { error } = await searchParams;
  return (
    <AuthCard title="Choose your password" subtitle="Replace the temporary password you were given.">
      {error ? <Notice kind="error">{error}</Notice> : null}
      <form action={changePassword} className="space-y-4">
        <Field label="New password (10+ characters)" name="password" type="password" autoComplete="new-password" minLength={10} />
        <Field label="Repeat new password" name="confirm" type="password" autoComplete="new-password" minLength={10} />
        <SubmitButton>Save and continue</SubmitButton>
      </form>
    </AuthCard>
  );
}
