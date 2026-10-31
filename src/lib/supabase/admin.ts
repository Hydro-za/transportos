import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. BYPASSES RLS. Only for platform operations that have
 * already passed requirePlatformAdmin(). Never import from client code.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server is missing Supabase admin configuration");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
