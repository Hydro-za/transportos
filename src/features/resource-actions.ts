"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAccess } from "@/server/auth/session";
import { readValues, type FormState } from "@/lib/forms";
import { parseFields } from "./parse";
import { RESOURCES } from "./resources";

function errorMessage(code: string | undefined, unique?: string) {
  if (code === "23505") return unique ?? "That record already exists.";
  if (code === "23514") return "One of the values is out of the allowed range.";
  if (code === "23503") return "One of the selected records is not valid.";
  if (code === "42501") return "You are not allowed to do that.";
  return "Could not save. Please try again.";
}

export async function createResource(_prev: FormState, fd: FormData): Promise<FormState> {
  const key = String(fd.get("resource") ?? "");
  const def = RESOURCES[key];
  if (!def) return { error: "Unknown record type." };
  const ctx = await requireAccess(def.writePerm);
  const fields = await def.fields(ctx);
  const values = readValues(fd, fields.map((f) => f.name));
  const { row, error } = parseFields(fields, values);
  if (!row) return { error, values };

  const { data, error: dbError } = await ctx.supabase.from(def.table).insert({ ...row, organization_id: ctx.organizationId }).select("id").single();
  if (dbError || !data) return { error: errorMessage(dbError?.code, def.unique), values };
  await def.afterSave?.(ctx, row);
  revalidatePath(def.path);
  redirect(`${def.path}/${data.id}`);
}

export async function updateResource(_prev: FormState, fd: FormData): Promise<FormState> {
  const key = String(fd.get("resource") ?? "");
  const def = RESOURCES[key];
  if (!def) return { error: "Unknown record type." };
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) return { error: "Invalid record." };
  const ctx = await requireAccess(def.writePerm);
  const fields = await def.fields(ctx);
  const values = readValues(fd, fields.map((f) => f.name));
  const { row, error } = parseFields(fields, values);
  if (!row) return { error, values };

  const { error: dbError } = await ctx.supabase.from(def.table).update(row).eq("id", id.data);
  if (dbError) return { error: errorMessage(dbError.code, def.unique), values };
  await def.afterSave?.(ctx, row);
  revalidatePath(def.path);
  redirect(`${def.path}/${id.data}?saved=1`);
}
