"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3, Building2, FileText, Fuel, LayoutDashboard, Menu, Package,
  Receipt, Route, Settings, Truck, UserRound, Users, Wrench, FolderOpen, X,
} from "lucide-react";
import type { NavItem } from "@/config/nav";

const ICONS: Record<string, typeof LayoutDashboard> = {
  "/dashboard": LayoutDashboard, "/quotations": FileText, "/jobs": Package,
  "/dispatch": Route, "/customers": Building2, "/invoices": Receipt,
  "/fleet": Truck, "/drivers": UserRound, "/maintenance": Wrench,
  "/expenses": Fuel, "/documents": FolderOpen, "/reports": BarChart3,
  "/team": Users, "/settings": Settings,
};

const PRIMARY = ["/dashboard", "/jobs", "/dispatch"];

export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const primaryItems = PRIMARY.map((href) => items.find((item) => item.href === href)).filter((item): item is NavItem => Boolean(item));
  const moreItems = items.filter((item) => !PRIMARY.includes(item.href));
  const moreActive = moreItems.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="presentation">
          <button aria-label="Close navigation menu" className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <section id="mobile-sections" role="dialog" aria-modal="true" aria-label="All sections" className="mobile-menu-sheet absolute inset-x-0 bottom-0 rounded-t-[28px] border px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-4 shadow-2xl" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: "var(--border)" }} />
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">All sections</h2>
                <p className="text-xs" style={{ color: "var(--muted)" }}>Everything in your workspace</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: "var(--surface-soft)" }}><X size={18} /></button>
            </div>
            <nav className="grid grid-cols-2 gap-2" aria-label="All sections">
              {moreItems.map((item) => {
                const Icon = ICONS[item.href] ?? Menu;
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
                    className="flex min-h-[62px] items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-medium transition-colors"
                    style={{ borderColor: active ? "var(--accent)" : "var(--border)", background: active ? "var(--accent-soft)" : "var(--surface)", color: active ? "var(--accent)" : "var(--text)" }}>
                    <Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </section>
        </div>
      )}

      <nav aria-label="Primary navigation" className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t md:hidden" style={{ background: "color-mix(in srgb, var(--surface) 94%, transparent)", borderColor: "var(--border)", backdropFilter: "blur(22px)" }}>
        <div className="mx-auto grid max-w-lg grid-cols-4 px-2 pt-2">
          {primaryItems.map((item) => {
            const Icon = ICONS[item.href] ?? Menu;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const label = item.href === "/dashboard" ? "Home" : item.href === "/jobs" ? "Jobs" : "Dispatch";
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
                className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium"
                style={{ color: active ? "var(--accent)" : "var(--muted)" }}>
                <Icon size={20} strokeWidth={active ? 2.2 : 1.7} />
                <span>{label}</span>
              </Link>
            );
          })}
          <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="mobile-sections"
            className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium"
            style={{ color: moreActive || open ? "var(--accent)" : "var(--muted)" }}>
            <Menu size={20} strokeWidth={moreActive || open ? 2.2 : 1.7} />
            <span>More</span>
          </button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </>
  );
}
