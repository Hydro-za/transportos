"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartNoAxesCombined,
  ClipboardList,
  FileText,
  Fuel,
  LayoutDashboard,
  Package,
  Receipt,
  Route,
  Settings,
  Truck,
  Users,
  Wrench,
  FolderOpen,
  UserRound,
  Building2,
} from "lucide-react";
import type { NavItem } from "@/config/nav";

const ICONS = {
  "/dashboard": LayoutDashboard,
  "/quotations": FileText,
  "/jobs": Package,
  "/dispatch": Route,
  "/customers": Building2,
  "/invoices": Receipt,
  "/fleet": Truck,
  "/drivers": UserRound,
  "/maintenance": Wrench,
  "/expenses": Fuel,
  "/documents": FolderOpen,
  "/reports": ChartNoAxesCombined,
  "/team": Users,
  "/settings": Settings,
} as const;

const GROUPS = [
  { label: "WORKSPACE", hrefs: ["/dashboard", "/quotations", "/jobs", "/dispatch"] },
  { label: "DIRECTORY", hrefs: ["/customers", "/drivers", "/team"] },
  { label: "FLEET OPERATIONS", hrefs: ["/fleet", "/maintenance", "/expenses"] },
  { label: "FINANCE & RECORDS", hrefs: ["/invoices", "/documents", "/reports"] },
  { label: "PREFERENCES", hrefs: ["/settings"] },
];

export function SideNav({ items, horizontal = false }: { items: NavItem[]; horizontal?: boolean }) {
  const pathname = usePathname();

  if (horizontal) {
    return (
      <nav aria-label="Main" className="flex min-w-max gap-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = ICONS[item.href as keyof typeof ICONS] ?? ClipboardList;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-colors"
              style={active ? { background: "var(--accent-soft)", color: "var(--accent)" } : { color: "var(--muted)" }}
            >
              <Icon size={15} strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Main" className="space-y-5">
      {GROUPS.map((group) => {
        const groupItems = items.filter((item) => group.hrefs.includes(item.href));
        if (!groupItems.length) return null;
        return (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.13em]" style={{ color: "var(--muted)" }}>
              {group.label}
            </p>
            <div className="space-y-1">
              {groupItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = ICONS[item.href as keyof typeof ICONS] ?? ClipboardList;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors"
                    style={active
                      ? { background: "var(--accent-soft)", color: "var(--accent)" }
                      : { color: "var(--muted)" }}
                  >
                    <Icon size={17} strokeWidth={1.8} />
                    <span>{item.label}</span>
                    {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} /> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
