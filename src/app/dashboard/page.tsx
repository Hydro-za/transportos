import Link from "next/link";
import { getMemberships } from "@/server/auth/session";
import { signOut } from "@/app/login/actions";
import { APP_NAME } from "@/config/app";

export default async function DashboardPage() {
  const { user, memberships } = await getMemberships();
  const current = memberships[0];

  if (!current) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-xl font-semibold">No access yet</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Your login is not linked to the business. Please contact an owner.
        </p>
        <form action={signOut} className="mt-6">
          <button type="submit" className="rounded-xl border px-3 py-2 text-sm font-medium" style={{ borderColor: "var(--border)" }}>
            Sign out
          </button>
        </form>
      </main>
    );
  }

  const isOwner = current.roles?.name === "Owner";
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            {APP_NAME}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{current.organizations?.name ?? "Your business"}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Signed in as {user.email} · Role: {current.roles?.name ?? "Member"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner ? (
            <Link href="/team" className="rounded-xl border px-3 py-2 text-sm font-medium" style={{ borderColor: "var(--border)" }}>
              Team
            </Link>
          ) : null}
          <form action={signOut}>
            <button type="submit" className="rounded-xl border px-3 py-2 text-sm font-medium" style={{ borderColor: "var(--border)" }}>
              Sign out
            </button>
          </form>
        </div>
      </header>
      <section className="mt-8 rounded-3xl border p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <h2 className="text-lg font-medium">Your workspace is ready</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Customers, quotations and jobs are the next modules. Nothing here shows figures until real records exist.
        </p>
      </section>
    </main>
  );
}
