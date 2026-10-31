import "server-only";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/server/auth/session";

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  return Boolean(data);
}

/** Must be called at the top of every platform page AND every platform server action. */
export async function requirePlatformAdmin() {
  const { user } = await requireUser();
  if (!(await isPlatformAdmin(user.id))) redirect("/dashboard");
  return user;
}
