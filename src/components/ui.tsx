import type { ReactNode } from "react";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <div
        className="rounded-3xl border p-6 shadow-sm backdrop-blur sm:p-8"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            {subtitle}
          </p>
        ) : null}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  placeholder,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  minLength?: number;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={minLength}
        className="mt-1 block w-full rounded-xl border bg-transparent px-3 py-2.5 text-base outline-none focus:ring-2"
        style={{ borderColor: "var(--border)" }}
      />
    </label>
  );
}

export function SubmitButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="submit"
      className="w-full rounded-xl px-4 py-2.5 text-base font-medium text-white transition active:scale-[0.99]"
      style={{ background: "var(--accent)" }}
    >
      {children}
    </button>
  );
}

export function Notice({ kind, children }: { kind: "error" | "info"; children: ReactNode }) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className="mb-4 rounded-xl border px-3 py-2 text-sm"
      style={{
        borderColor: kind === "error" ? "#d70015" : "var(--border)",
        color: kind === "error" ? "#d70015" : "var(--text)",
      }}
    >
      {children}
    </p>
  );
}

export function SelectField({ label, name, options }: { label: string; name: string; options: { value: string; label: string }[] }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <select
        name={name}
        required
        className="mt-1 block w-full rounded-xl border bg-transparent px-3 py-2.5 text-base outline-none focus:ring-2"
        style={{ borderColor: "var(--border)" }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
