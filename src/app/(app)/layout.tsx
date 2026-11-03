import type { ReactNode } from "react";
import { getContext } from "@/server/auth/session";
import { signOut } from "@/app/login/actions";
import { APP_NAME } from "@/config/app";
import { NAV } from "@/config/nav";
import { SideNav } from "@/components/side-nav";
import { MobileNav } from "@/components/mobile-nav";
import { Truck } from "lucide-react";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await getContext();
  const items = NAV.filter((i) => !i.permission || ctx.permissions.has(i.permission));

  const signOutButton = (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-xl border px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--surface-soft)]"
        style={{ borderColor: "var(--border)", color: "var(--muted)" }}
      >
        Sign out
      </button>
    </form>
  );

  return (
    <div className="min-h-screen md:flex">
      <aside
        className="hidden border-r md:sticky md:top-0 md:flex md:h-screen md:w-[258px] md:shrink-0 md:flex-col md:justify-between md:px-4 md:py-5"
        style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}
      >
        <div>
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-sm" style={{ background: "var(--accent)" }}>
              <Truck size={20} strokeWidth={1.9} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">{APP_NAME}</p>
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>LOGISTICS WORKSPACE</p>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border px-3 py-3" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <p className="mb-1 text-[10px] font-semibold tracking-[0.12em]" style={{ color: "var(--muted)" }}>CURRENT ORGANISATION</p>
            <p className="truncate text-sm font-semibold">{ctx.businessName || "No business"}</p>
          </div>

          <SideNav items={items} />
        </div>

        <div className="rounded-2xl border p-3" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="mb-3 flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ background: "var(--surface-soft)", color: "var(--accent)" }}>
              {(ctx.user.email?.[0] ?? "U").toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{ctx.user.email}</p>
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>{ctx.roleName || "Team member"}</p>
            </div>
          </div>
          {signOutButton}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header
          className="sticky top-0 z-30 border-b px-4 py-3 md:hidden"
          style={{ background: "color-mix(in srgb, var(--surface) 94%, transparent)", borderColor: "var(--border)", backdropFilter: "blur(20px)" }}
        >
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "var(--accent)" }}>
                <Truck size={18} strokeWidth={1.9} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight">{APP_NAME}</p>
                <p className="truncate text-[11px]" style={{ color: "var(--muted)" }}>{ctx.businessName || "No business"}</p>
              </div>
            </div>
            {signOutButton}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-4 py-5 pb-28 sm:px-6 sm:py-8 sm:pb-32 lg:px-9 md:pb-8">
          {children}
        </main>
      </div>
      <MobileNav items={items} />
    </div>
  );
}
