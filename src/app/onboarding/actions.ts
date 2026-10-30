"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ name: z.string().trim().min(2).max(120) });

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base.length >= 2 ? base : "company";
}

export async function createCompany(formData: FormData) {
  const parsed = schema.safeParse({ name: formData.get("name") });
  if (!parsed.success) redirect("/onboarding?error=Enter+your+company+name");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const base = slugify(parsed.data.name);
  // Slug must be unique; retry with a short random suffix on collision.
  for (let attempt = 0; attempt < 4; attempt++) {
    const suffix = attempt === 0 ? "" : "-" + Math.random().toString(36).slice(2, 6);
    const { error } = await supabase.rpc("create_organization", {
      p_name: parsed.data.name,
      p_slug: base + suffix,
    });
    if (!error) redirect("/dashboard");
    if (error.code !== "23505") break; // not a unique violation
  }
  redirect("/onboarding?error=" + encodeURIComponent("Could not create the company. Please try again."));
}
