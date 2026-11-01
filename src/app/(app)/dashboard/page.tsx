import { getContext } from "@/server/auth/session";

export default async function DashboardPage() {
  const ctx = await getContext();

  if (!ctx.organizationId) {
    return (
      <div className="max-w-md">
        <h1 className="text-xl font-semibold">No access yet</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Your login is not linked to the business. Please contact an owner.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{ctx.businessName}</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
        Signed in as {ctx.user.email} · Role: {ctx.roleName}
      </p>
      <section className="mt-8 rounded-3xl border p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <h2 className="text-lg font-medium">Your workspace is ready</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Figures will appear here as real records are captured.
        </p>
      </section>
    </div>
  );
}
