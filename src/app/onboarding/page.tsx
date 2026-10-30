import { redirect } from "next/navigation";
import { AuthCard, Field, Notice, SubmitButton } from "@/components/ui";
import { getMemberships } from "@/server/auth/session";
import { createCompany } from "./actions";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { memberships } = await getMemberships();
  if (memberships.length > 0) redirect("/dashboard");
  const { error } = await searchParams;
  return (
    <AuthCard title="Set up your company" subtitle="This creates your private workspace. You will be its Owner.">
      {error ? <Notice kind="error">{error}</Notice> : null}
      <form action={createCompany} className="space-y-4">
        <Field label="Company name" name="name" autoComplete="organization" placeholder="e.g. Cape Freight (Pty) Ltd" />
        <SubmitButton>Create company</SubmitButton>
      </form>
    </AuthCard>
  );
}
