"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z
  .object({ password: z.string().min(10).max(200), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"] });

export async function changePassword(formData: FormData) {
  const parsed = schema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) redirect("/change-password?error=" + encodeURIComponent("Use at least 10 characters and make both entries match."));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
    data: { must_change_password: false },
  });
  if (error) redirect("/change-password?error=" + encodeURIComponent("Could not update the password. Choose a different one and try again."));
  redirect("/dashboard");
}
