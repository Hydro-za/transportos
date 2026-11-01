"use client";

import { useActionState } from "react";
import type { FieldDef, FormState } from "@/lib/forms";
import { Notice } from "@/components/ui";

type Initial = Record<string, string | number | boolean | null | undefined>;

export function EntityForm({
  fields,
  action,
  initial = {},
  hidden = {},
  submitLabel,
}: {
  fields: FieldDef[];
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial?: Initial;
  hidden?: Record<string, string>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null);
  const val = (name: string) => {
    const v = state?.values?.[name] ?? initial[name];
    return v == null ? "" : String(v);
  };

  const inputClass = "mt-1 block w-full rounded-xl border bg-transparent px-3 py-2.5 text-base outline-none focus:ring-2";
  const inputStyle = { borderColor: "var(--border)" } as const;

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? <Notice kind="error">{state.error}</Notice> : null}
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => {
          const span = f.wide || f.type === "textarea" ? "sm:col-span-2" : "";
          if (f.type === "checkbox") {
            return (
              <label key={f.name} className={`flex items-center gap-2 text-sm font-medium ${span}`}>
                <input type="checkbox" name={f.name} defaultChecked={val(f.name) === "on" || val(f.name) === "true"} />
                {f.label}
              </label>
            );
          }
          return (
            <label key={f.name} className={`block text-sm font-medium ${span}`}>
              {f.label}
              {f.required ? " *" : ""}
              {f.type === "textarea" ? (
                <textarea name={f.name} rows={3} defaultValue={val(f.name)} placeholder={f.placeholder} className={inputClass} style={inputStyle} />
              ) : f.type === "select" ? (
                <select name={f.name} required={f.required} defaultValue={val(f.name)} className={inputClass} style={inputStyle}>
                  {!f.required ? <option value="">-</option> : null}
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name={f.name}
                  type={f.type === "money" ? "text" : f.type === "datetime" ? "datetime-local" : (f.type ?? "text")}
                  inputMode={f.type === "money" ? "decimal" : undefined}
                  step={f.step}
                  required={f.required}
                  defaultValue={val(f.name)}
                  placeholder={f.type === "money" ? (f.placeholder ?? "0.00") : f.placeholder}
                  className={inputClass}
                  style={inputStyle}
                />
              )}
              {f.help ? (
                <span className="mt-1 block text-xs font-normal" style={{ color: "var(--muted)" }}>
                  {f.help}
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl px-5 py-2.5 text-base font-medium text-white transition disabled:opacity-60"
        style={{ background: "var(--accent)" }}
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
