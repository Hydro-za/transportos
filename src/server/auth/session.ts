import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type Membership = {
  organization_id: string;
  organizations: { name: string; slug: string } | null;
  roles: { name: string } | null;
};

/** Returns the signed-in user or redirects to /login. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Returns the user's active memberships (RLS limits rows to their own companies). */
export async function getMemberships(): Promise<{ user: { id: string; email?: string }; memberships: Membership[] }> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(name, slug), roles(name)")
    .eq("user_id", user.id)
    .eq("status", "active");
  if (error) throw new Error("Could not load company membership");
  return { user: { id: user.id, email: user.email }, memberships: (data ?? []) as unknown as Membership[] };
}

/**
 * Server-side permission gate for pages and server actions. Looks up the caller's
 * active membership and checks the role actually holds the permission in the database.
 */
export async function requirePermission(permission: string) {
  const { user } = await requireUser();
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("organization_members")
    .select("organization_id, role_id, roles(name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!member) redirect("/dashboard");
  const { data: allowed } = await admin
    .from("role_permissions")
    .select("permission_key")
    .eq("role_id", member.role_id)
    .eq("permission_key", permission)
    .maybeSingle();
  if (!allowed) redirect("/dashboard");
  const roleName = (member.roles as unknown as { name: string } | null)?.name ?? "";
  return { user, organizationId: member.organization_id as string, roleName };
}

export type AppContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email?: string };
  organizationId: string | null;
  businessName: string;
  roleName: string;
  permissions: Set<string>;
};

/** Signed-in user's business, role and permissions (user-scoped client, RLS applies). Cached per request. */
export const getContext = cache(async (): Promise<AppContext> => {
  const { supabase, user } = await requireUser();
  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id, role_id, organizations(name), roles(name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  const base = { supabase, user: { id: user.id, email: user.email } };
  if (!member) return { ...base, organizationId: null, businessName: "", roleName: "", permissions: new Set<string>() };
  const { data: perms } = await supabase.from("role_permissions").select("permission_key").eq("role_id", member.role_id);
  return {
    ...base,
    organizationId: member.organization_id as string,
    businessName: (member.organizations as unknown as { name: string } | null)?.name ?? "",
    roleName: (member.roles as unknown as { name: string } | null)?.name ?? "",
    permissions: new Set((perms ?? []).map((p) => p.permission_key as string)),
  };
});

/** Page/action gate: redirects unless the caller holds the permission. Returns a context with a guaranteed organizationId. */
export async function requireAccess(permission: string) {
  const ctx = await getContext();
  if (!ctx.organizationId || !ctx.permissions.has(permission)) redirect("/dashboard");
  return { ...ctx, organizationId: ctx.organizationId };
}

export type BusinessSettings = {
  name: string;
  registration_no: string | null;
  vat_no: string | null;
  phone: string | null;
  email: string | null;
  address: string;
  vatRatePct: number;
  quotationValidityDays: number;
  paymentTerms: string;
  conditions: string;
  bankDetails: string;
};

/** Business details and defaults used by quotations and invoices. */
export async function getBusinessSettings(ctx: AppContext): Promise<BusinessSettings> {
  const { data } = await ctx.supabase
    .from("organizations")
    .select("name, registration_no, vat_no, phone, email, address, settings")
    .maybeSingle();
  const s = (data?.settings ?? {}) as Record<string, unknown>;
  const a = (data?.address ?? {}) as Record<string, unknown>;
  return {
    name: data?.name ?? ctx.businessName,
    registration_no: data?.registration_no ?? null,
    vat_no: data?.vat_no ?? null,
    phone: data?.phone ?? null,
    email: data?.email ?? null,
    address: typeof a.text === "string" ? a.text : "",
    vatRatePct: typeof s.vat_rate_pct === "number" ? s.vat_rate_pct : 15,
    quotationValidityDays: typeof s.quotation_validity_days === "number" ? s.quotation_validity_days : 14,
    paymentTerms: typeof s.payment_terms === "string" ? s.payment_terms : "Payment within 30 days of invoice date.",
    conditions: typeof s.conditions === "string" ? s.conditions : "",
    bankDetails: typeof s.bank_details === "string" ? s.bank_details : "",
  };
}
