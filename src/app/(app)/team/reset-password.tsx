"use client";

import { useActionState } from "react";
import { resetMemberPassword, type ResetState } from "./actions";

export function ResetPassword({ memberId }: { memberId: string }) {
  const [state, action] = useActionState<ResetState, FormData>(resetMemberPassword, null);
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="memberId" value={memberId} />
      <button type="submit" className="rounded-lg border px-2.5 py-1.5 text-xs font-medium" style={{ borderColor: "var(--border)" }}>
        Reset password
      </button>
      {state?.password ? (
        <span className="font-mono text-xs">New temporary password: {state.password}</span>
      ) : null}
      {state?.error ? (
        <span role="alert" className="text-xs" style={{ color: "#d70015" }}>
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
