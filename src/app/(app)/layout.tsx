import type { ReactNode } from "react";
import { getContext } from "@/server/auth/session";
import { signOut } from "@/app/login/actions";
import { APP_NAME } from "@/config/app";
import { NAV } from "@/config/nav";
import { SideNav } from "@/components/side-nav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await getContext();
  const items = NAV.filter((i) => !i.permission || ctx.permissions.has(i.permission));

  const signOutButton = (
    <form action={signOut}>
      <button type="submit" className="w-full rounded-xl border px-3 py-2 text-sm font-medium" style={{ borderColor: "var(--border)" }}>
        Sign out
      </button>
    </form>
  );

  return (
    <div className="min-h-screen md:flex">
      <aside
        className="hidden border-r p-4 md:sticky md:top-0 md:flex md:h-screen md:w-60 md:flex-col md:justify-between"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div>
          <p className="px-3 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            {APP_NAME}
          </p>
          <p className="mb-4 px-3 text-base font-semibold">{ctx.businessName || "No business"}</p>
          <SideNav items={items} />
        </div>
        <div className="space-y-2">
          <p className="px-1 text-xs" style={{ color: "var(--muted)" }}>
            {ctx.user.email} · {ctx.roleName || "No role"}
          </p>
          {signOutButton}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div
          className="flex items-center justify-between gap-2 border-b px-3 py-2 md:hidden"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="min-w-0 flex-1 overflow-x-auto">
            <SideNav items={items} horizontal />
          </div>
          {signOutButton}
        </div>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </div>
    </div>
  );
}
