import Link from "next/link";
import { AuthCard, Field, Notice, SubmitButton } from "@/components/ui";
import { signUp } from "./actions";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AuthCard title="Create your account" subtitle="You will set up your company next.">
      {error ? <Notice kind="error">{error}</Notice> : null}
      <form action={signUp} className="space-y-4">
        <Field label="Full name" name="fullName" autoComplete="name" />
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field label="Password" name="password" type="password" autoComplete="new-password" minLength={8} />
        <SubmitButton>Create account</SubmitButton>
      </form>
      <p className="mt-6 text-sm" style={{ color: "var(--muted)" }}>
        Already have an account?{" "}
        <Link href="/login" className="font-medium" style={{ color: "var(--accent)" }}>
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
