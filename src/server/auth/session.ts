import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
