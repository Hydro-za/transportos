export type NavItem = { href: string; label: string; permission?: string };

/** Only pages that exist are listed. Items are hidden when the user lacks the permission (the pages enforce it too). */
export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview" },
  { href: "/quotations", label: "Quotations", permission: "quotations.read" },
  { href: "/customers", label: "Customers", permission: "customers.read" },
  { href: "/team", label: "Team", permission: "members.manage" },
  { href: "/settings", label: "Settings", permission: "settings.update" },
];
