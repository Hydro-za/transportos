import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/server/auth/session";
import { Notice } from "@/components/ui";
import { CreateUserForm } from "./create-user-form";
import { ResetPassword } from "./reset-password";
import { setMemberStatus } from "./actions";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user, organizationId } = await requirePermission("members.manage");
  const { error } = await searchParams;
  const admin = createAdminClient();

  const { data: members } = await admin
    .from("organization_members")
    .select("id, user_id, status, created_at, roles(name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  const ids = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = await admin.from("user_profiles").select("id, full_name").in("id", ids);
  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 200 });
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name as string | null]));
  const emailById = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Create owner and dispatcher logins. Each person gets a temporary password to change on first sign-in.
          </p>
        </div>
        <Link href="/dashboard" className="rounded-xl border px-3 py-2 text-sm font-medium" style={{ borderColor: "var(--border)" }}>
          Back
        </Link>
      </header>

      {error ? (
        <div className="mt-6">
          <Notice kind="error">{error}</Notice>
        </div>
      ) : null}

      <section className="mt-8 rounded-3xl border p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <h2 className="mb-4 text-lg font-medium">New login</h2>
        <CreateUserForm />
      </section>

      <section className="mt-8 rounded-3xl border p-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <h2 className="mb-4 text-lg font-medium">People ({members?.length ?? 0})</h2>
        <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
          {(members ?? []).map((m) => {
            const role = (m.roles as unknown as { name: string } | null)?.name ?? "Member";
            const isSelf = m.user_id === user.id;
            return (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <div className="font-medium">
                    {nameById.get(m.user_id) || emailById.get(m.user_id) || "User"} {isSelf ? "(you)" : ""}
                  </div>
                  <div style={{ color: "var(--muted)" }}>
                    {emailById.get(m.user_id)} · {role} · {m.status}
                  </div>
                </div>
                {isSelf ? null : (
                  <div className="flex items-start gap-2">
                    <ResetPassword memberId={m.id} />
                    <form action={setMemberStatus}>
                      <input type="hidden" name="memberId" value={m.id} />
                      <input type="hidden" name="status" value={m.status === "active" ? "disabled" : "active"} />
                      <button type="submit" className="rounded-lg border px-2.5 py-1.5 text-xs font-medium" style={{ borderColor: "var(--border)" }}>
                        {m.status === "active" ? "Disable" : "Enable"}
                      </button>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
