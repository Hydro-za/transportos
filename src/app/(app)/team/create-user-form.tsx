"use client";

import { useActionState } from "react";
import { createUserAccount, type CreateUserState } from "./actions";
import { Field, Notice, SelectField, SubmitButton } from "@/components/ui";

export function CreateUserForm() {
  const [state, action] = useActionState<CreateUserState, FormData>(createUserAccount, null);
  return (
    <div>
      {state?.error ? <Notice kind="error">{state.error}</Notice> : null}
      {state?.success ? (
        <div className="mb-6 rounded-2xl border p-4 text-sm" style={{ borderColor: "var(--border)" }}>
          <p className="font-medium">
            {state.success.name} can now sign in as {state.success.role}. Send them:
          </p>
          <dl className="mt-3 space-y-1 font-mono">
            <div>Email: {state.success.email}</div>
            <div>Temporary password: {state.success.password}</div>
          </dl>
          <p className="mt-3" style={{ color: "var(--muted)" }}>
            Shown once. They must choose their own password on first sign-in.
          </p>
        </div>
      ) : null}
      <form action={action} className="space-y-4">
        <Field label="Full name" name="fullName" autoComplete="off" />
        <Field label="Email (their login)" name="email" type="email" autoComplete="off" />
        <SelectField
          label="Role"
          name="role"
          options={[
            { value: "Dispatcher", label: "Dispatcher" },
            { value: "Owner", label: "Owner" },
          ]}
        />
        <SubmitButton>Create login</SubmitButton>
      </form>
    </div>
  );
}
