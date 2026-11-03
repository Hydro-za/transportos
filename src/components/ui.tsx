import type { ReactNode } from "react";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-[28px] border p-6 shadow-xl backdrop-blur sm:p-8" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm leading-6" style={{ color: "var(--muted)" }}>{subtitle}</p> : null}
        <div className="mt-7">{children}</div>
      </div>
    </main>
  );
}

export function Field({
  label, name, type = "text", autoComplete, placeholder, minLength,
}: {
  label: string; name: string; type?: string; autoComplete?: string; placeholder?: string; minLength?: number;
}) {
  return (
    <label className="block text-sm font-medium" style={{ color: "var(--text)" }}>
      {label}
      <input
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={minLength}
        className="mt-2 block w-full rounded-xl border px-4 py-3 text-[15px] outline-none transition focus:ring-4"
        style={{ background: "var(--surface-soft)", borderColor: "var(--border)", color: "var(--text)", "--tw-ring-color": "var(--accent-soft)" } as React.CSSProperties}
      />
    </label>
  );
}

export function SubmitButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="submit"
      className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
      className="mb-4 rounded-xl border px-4 py-3 text-sm leading-5"
      style={{
        borderColor: kind === "error" ? "color-mix(in srgb, var(--danger) 35%, transparent)" : "var(--border)",
        background: kind === "error" ? "color-mix(in srgb, var(--danger) 8%, var(--surface))" : "var(--surface-soft)",
        color: kind === "error" ? "var(--danger)" : "var(--text)",
      }}
    >
      {children}
    </p>
  );
}

export function SelectField({ label, name, options }: { label: string; name: string; options: { value: string; label: string }[] }) {
  return (
    <label className="block text-sm font-medium" style={{ color: "var(--text)" }}>
      {label}
      <select name={name} required className="mt-2 block w-full rounded-xl border px-4 py-3 text-[15px] outline-none focus:ring-4" style={{ background: "var(--surface-soft)", borderColor: "var(--border)", color: "var(--text)" }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.04em] sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-sm leading-6" style={{ color: "var(--muted)" }}>{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mb-6 rounded-2xl border p-5 shadow-sm transition-shadow sm:p-6" style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}>
      {title ? <h2 className="mb-4 text-base font-semibold tracking-tight">{title}</h2> : null}
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm" style={{ color: "var(--muted)" }}>{children}</p>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" }) {
  const colors = {
    neutral: "var(--muted)",
    good: "var(--success)",
    warn: "var(--warning)",
    bad: "var(--danger)",
  } as const;
  return (
    <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide" style={{ borderColor: `color-mix(in srgb, ${colors[tone]} 35%, transparent)`, color: colors[tone], background: `color-mix(in srgb, ${colors[tone]} 8%, transparent)` }}>
      {children}
    </span>
  );
}

export const linkButtonClass = "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105";
export const linkButtonStyle = { background: "var(--accent)" } as const;
export const ghostButtonClass = "inline-flex items-center justify-center rounded-xl border px-3.5 py-2.5 text-sm font-medium transition hover:bg-[var(--surface-soft)]";
export const ghostButtonStyle = { borderColor: "var(--border)" } as const;
