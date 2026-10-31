import { AuthCard, Field, Notice, SubmitButton } from "@/components/ui";
import { signIn } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const { error, message } = await searchParams;
  return (
    <AuthCard title="Sign in" subtitle="Welcome back to TransportOS.">
      {error ? <Notice kind="error">{error}</Notice> : null}
      {message ? <Notice kind="info">{message}</Notice> : null}
      <form action={signIn} className="space-y-4">
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field label="Password" name="password" type="password" autoComplete="current-password" />
        <SubmitButton>Sign in</SubmitButton>
      </form>
      <p className="mt-6 text-sm" style={{ color: "var(--muted)" }}>
        Your login is provided by your company administrator.
      </p>
    </AuthCard>
  );
}
