"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});

export async function signIn(formData: FormData) {
  const parsed = schema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) redirect("/login?error=Enter+a+valid+email+and+password");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      redirect("/login?error=" + encodeURIComponent("Please confirm your email first. Check your inbox for the confirmation link."));
    }
    if (error.code === "invalid_credentials") redirect("/login?error=Incorrect+email+or+password");
    redirect("/login?error=" + encodeURIComponent("Could not sign in right now. Please try again."));
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
