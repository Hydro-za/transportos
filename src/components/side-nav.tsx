"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/config/nav";

export function SideNav({ items, horizontal = false }: { items: NavItem[]; horizontal?: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className={horizontal ? "flex gap-1" : "flex flex-col gap-1"}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition ${active ? "text-white" : ""}`}
            style={active ? { background: "var(--accent)" } : { color: "var(--text)" }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
