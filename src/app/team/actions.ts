"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/server/auth/session";

export type CreateUserState = {
  error?: string;
  success?: { name: string; email: string; role: string; password: string };
} | null;

export type ResetState = { error?: string; memberId?: string; password?: string } | null;

const ASSIGNABLE_ROLES = ["Owner", "Dispatcher"] as const;

const createSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum(ASSIGNABLE_ROLES),
});

function tempPassword() {
  return randomBytes(9).toString("base64url"); // 12 characters, shown once
}

export async function createUserAccount(_prev: CreateUserState, formData: FormData): Promise<CreateUserState> {
  const { user, organizationId, roleName } = await requirePermission("members.manage");

  const parsed = createSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: "Enter a name, a valid email and choose Owner or Dispatcher." };
  if (parsed.data.role === "Owner" && roleName !== "Owner") return { error: "Only an owner can create another owner." };

  const admin = createAdminClient();

  const { data: role } = await admin
    .from("roles")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("name", parsed.data.role)
    .maybeSingle();
  if (!role) return { error: "That role is not available." };

  const password = tempPassword();
  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName, must_change_password: true },
  });
  if (userError || !created.user) {
    const exists = userError?.code === "email_exists" || /already/i.test(userError?.message ?? "");
    return { error: exists ? "A login with that email already exists." : "Could not create the login." };
  }

  const { error: memberError } = await admin.from("organization_members").insert({
    organization_id: organizationId,
    user_id: created.user.id,
    role_id: role.id,
    status: "active",
    invited_by: user.id,
  });
  if (memberError) {
    await admin.auth.admin.deleteUser(created.user.id); // roll back the login
    return { error: "Could not add the user. Nothing was saved, please try again." };
  }

  revalidatePath("/team");
  return { success: { name: parsed.data.fullName, email: parsed.data.email, role: parsed.data.role, password } };
}

const memberIdSchema = z.string().uuid();

export async function resetMemberPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const { organizationId } = await requirePermission("members.manage");
  const memberId = memberIdSchema.safeParse(formData.get("memberId"));
  if (!memberId.success) return { error: "Invalid user." };

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("id", memberId.data)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!member) return { error: "User not found." };

  const password = tempPassword();
  const { error } = await admin.auth.admin.updateUserById(member.user_id, {
    password,
    user_metadata: { must_change_password: true },
  });
  if (error) return { error: "Could not reset the password." };
  return { memberId: memberId.data, password };
}

export async function setMemberStatus(formData: FormData) {
  const { user, organizationId } = await requirePermission("members.manage");
  const memberId = memberIdSchema.safeParse(formData.get("memberId"));
  const status = z.enum(["active", "disabled"]).safeParse(formData.get("status"));
  if (!memberId.success || !status.success) redirect("/team?error=" + encodeURIComponent("Invalid request."));

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("organization_members")
    .select("id, user_id, status, role_id, roles(name)")
    .eq("id", memberId.data)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!target) redirect("/team?error=" + encodeURIComponent("User not found."));

  if (target.user_id === user.id) redirect("/team?error=" + encodeURIComponent("You cannot change your own access."));

  const targetRole = (target.roles as unknown as { name: string } | null)?.name;
  if (status.data === "disabled" && targetRole === "Owner") {
    const { count } = await admin
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("role_id", target.role_id)
      .eq("status", "active");
    if ((count ?? 0) <= 1) redirect("/team?error=" + encodeURIComponent("The last active owner cannot be disabled."));
  }

  const { error } = await admin.from("organization_members").update({ status: status.data }).eq("id", target.id);
  if (error) redirect("/team?error=" + encodeURIComponent("Could not update the user."));
  revalidatePath("/team");
  redirect("/team");
}
