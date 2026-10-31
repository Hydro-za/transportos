"use client";

import { useActionState } from "react";
import { provisionCompany, type ProvisionState } from "./actions";
import { Field, Notice, SubmitButton } from "@/components/ui";

export function ProvisionForm() {
  const [state, action] = useActionState<ProvisionState, FormData>(provisionCompany, null);
  return (
    <div>
      {state?.error ? <Notice kind="error">{state.error}</Notice> : null}
      {state?.success ? (
        <div className="mb-6 rounded-2xl border p-4 text-sm" style={{ borderColor: "var(--border)" }}>
          <p className="font-medium">{state.success.company} is ready. Send these login details to the owner:</p>
          <dl className="mt-3 space-y-1 font-mono">
            <div>Email: {state.success.email}</div>
            <div>Temporary password: {state.success.password}</div>
          </dl>
          <p className="mt-3" style={{ color: "var(--muted)" }}>
            This password is shown once. The owner must choose a new one on first sign-in.
          </p>
        </div>
      ) : null}
      <form action={action} className="space-y-4">
        <Field label="Company name" name="companyName" autoComplete="off" placeholder="e.g. Cape Freight (Pty) Ltd" />
        <Field label="Owner's full name" name="ownerName" autoComplete="off" />
        <Field label="Owner's email (their login)" name="ownerEmail" type="email" autoComplete="off" />
        <SubmitButton>Create company and login</SubmitButton>
      </form>
    </div>
  );
}
