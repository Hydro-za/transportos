import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/server/auth/platform";
import { signOut } from "@/app/login/actions";
import { ProvisionForm } from "./provision-form";

export default async function PlatformPage() {
  await requirePlatformAdmin();
  const admin = createAdminClient();
  const { data: companies } = await admin
    .from("organizations")
    .select("id, name, slug, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Platform administration</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Create a company and its owner login after a sale.
          </p>
        </div>
        <form action={signOut}>
          <button type="submit" className="rounded-xl border px-3 py-2 text-sm font-medium" style={{ borderColor: "var(--border)" }}>
            Sign out
          </button>
        </form>
      </header>

      <section className="mt-8 rounded-3xl border p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <h2 className="mb-4 text-lg font-medium">New company</h2>
        <ProvisionForm />
      </section>

      <section className="mt-8 rounded-3xl border p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <h2 className="mb-4 text-lg font-medium">Companies ({companies?.length ?? 0})</h2>
        {companies && companies.length > 0 ? (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {companies.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3 text-sm">
                <span className="font-medium">{c.name}</span>
                <span style={{ color: "var(--muted)" }}>
                  {c.status} · {new Date(c.created_at).toLocaleDateString("en-ZA")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>No companies yet.</p>
        )}
      </section>
      <p className="mt-6 text-sm">
        <Link href="/dashboard" style={{ color: "var(--accent)" }}>Go to dashboard</Link>
      </p>
    </main>
  );
}
