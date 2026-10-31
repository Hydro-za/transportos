"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/server/auth/platform";

export type ProvisionState = {
  error?: string;
  success?: { company: string; email: string; password: string };
} | null;

const schema = z.object({
  companyName: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(100),
  ownerEmail: z.string().trim().toLowerCase().email().max(254),
});

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base.length >= 2 ? base : "company";
}

export async function provisionCompany(_prev: ProvisionState, formData: FormData): Promise<ProvisionState> {
  await requirePlatformAdmin(); // authorise inside the action, not only on the page

  const parsed = schema.safeParse({
    companyName: formData.get("companyName"),
    ownerName: formData.get("ownerName"),
    ownerEmail: formData.get("ownerEmail"),
  });
  if (!parsed.success) return { error: "Enter the company name, the owner's name and a valid email." };

  const admin = createAdminClient();
  const password = randomBytes(9).toString("base64url"); // 12 characters, shown once

  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email: parsed.data.ownerEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.ownerName, must_change_password: true },
  });
  if (userError || !created.user) {
    const exists = userError?.code === "email_exists" || /already/i.test(userError?.message ?? "");
    return { error: exists ? "A user with that email already exists." : "Could not create the owner login." };
  }

  const base = slugify(parsed.data.companyName);
  let provisioned = false;
  for (let attempt = 0; attempt < 4 && !provisioned; attempt++) {
    const suffix = attempt === 0 ? "" : "-" + Math.random().toString(36).slice(2, 6);
    const { error } = await admin.rpc("provision_organization", {
      p_name: parsed.data.companyName,
      p_slug: base + suffix,
      p_owner: created.user.id,
    });
    if (!error) provisioned = true;
    else if (error.code !== "23505") break;
  }

  if (!provisioned) {
    await admin.auth.admin.deleteUser(created.user.id); // roll back the login
    return { error: "Could not create the company. Nothing was saved, please try again." };
  }

  revalidatePath("/platform");
  return { success: { company: parsed.data.companyName, email: parsed.data.ownerEmail, password } };
}
