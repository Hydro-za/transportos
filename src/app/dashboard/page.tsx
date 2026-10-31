import { redirect } from "next/navigation";
import { getMemberships } from "@/server/auth/session";
import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { isPlatformAdmin } from "@/server/auth/platform";

export default async function DashboardPage() {
  const { user, memberships } = await getMemberships();
  const platformAdmin = await isPlatformAdmin(user.id);
  if (memberships.length === 0) {
    if (platformAdmin) redirect("/platform");
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-xl font-semibold">No company linked</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Your login is not linked to a company yet. Please contact your administrator.
        </p>
        <form action={signOut} className="mt-6">
          <button type="submit" className="rounded-xl border px-3 py-2 text-sm font-medium" style={{ borderColor: "var(--border)" }}>Sign out</button>
        </form>
      </main>
    );
  }
  const current = memberships[0];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{current.organizations?.name ?? "Your company"}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Signed in as {user.email} · Role: {current.roles?.name ?? "Member"}
          </p>
        </div>
        <div className="flex items-center gap-2">
        {platformAdmin ? (
          <Link href="/platform" className="rounded-xl border px-3 py-2 text-sm font-medium" style={{ borderColor: "var(--border)" }}>
            Platform
          </Link>
        ) : null}
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-xl border px-3 py-2 text-sm font-medium"
            style={{ borderColor: "var(--border)" }}
          >
            Sign out
          </button>
        </form>
        </div>
      </header>
      <section
        className="mt-8 rounded-3xl border p-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <h2 className="text-lg font-medium">Your workspace is ready</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Customers, quotations and jobs are the next modules. Nothing here shows figures until real records exist.
        </p>
      </section>
    </main>
  );
}
