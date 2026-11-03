"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAccess } from "@/server/auth/session";
import { ALLOWED_MIME, CATEGORIES, ENTITY_TYPES, MAX_UPLOAD_BYTES, safeFileName, safeReturnTo } from "@/lib/documents";

const withMsg = (to: string, key: "error" | "saved", msg: string) => redirect(`${to}${to.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(msg)}`);

const schema = z.object({
  title: z.string().trim().max(200),
  category: z.enum(CATEGORIES.map((c) => c.value) as [string, ...string[]]),
  entity_type: z.enum(ENTITY_TYPES),
  entity_id: z.string(),
  expiry_date: z.string(),
});

export async function uploadDocument(fd: FormData): Promise<void> {
  const to = safeReturnTo(fd.get("return_to"), "/documents");
  const ctx = await requireAccess("documents.write");
  const p = schema.safeParse({
    title: fd.get("title") ?? "", category: fd.get("category"), entity_type: fd.get("entity_type") ?? "general",
    entity_id: String(fd.get("entity_id") ?? ""), expiry_date: String(fd.get("expiry_date") ?? ""),
  });
  if (!p.success) return withMsg(to, "error", "Check the document details.");
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return withMsg(to, "error", "Choose a file to upload.");
  if (file.size > MAX_UPLOAD_BYTES) return withMsg(to, "error", "That file is larger than 4 MB. Reduce the photo size or scan at lower quality.");
  if (!ALLOWED_MIME.includes(file.type)) return withMsg(to, "error", "Only PDF, JPG, PNG or WebP files are allowed.");
  const d = p.data;
  const entityId = d.entity_type === "general" ? null : z.string().uuid().safeParse(d.entity_id).data ?? null;
  if (d.entity_type !== "general" && !entityId) return withMsg(to, "error", "Missing record to attach to.");
  if (d.expiry_date && !/^\d{4}-\d{2}-\d{2}$/.test(d.expiry_date)) return withMsg(to, "error", "Enter a valid expiry date.");

  const path = `${ctx.organizationId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error: upErr } = await ctx.supabase.storage.from("documents").upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return withMsg(to, "error", "Could not upload the file. Please try again.");
  const { error } = await ctx.supabase.from("documents").insert({
    organization_id: ctx.organizationId, entity_type: d.entity_type, entity_id: entityId, category: d.category,
    title: d.title || file.name.slice(0, 200), storage_path: path, mime_type: file.type, size_bytes: file.size, expiry_date: d.expiry_date || null,
  });
  if (error) {
    await ctx.supabase.storage.from("documents").remove([path]);
    return withMsg(to, "error", "Could not save the document record.");
  }
  if (d.entity_type === "job" && entityId && d.category === "pod") {
    await ctx.supabase.from("job_events").insert({ organization_id: ctx.organizationId, job_id: entityId, kind: "note", note: `Proof of delivery uploaded: ${d.title || file.name}` });
  }
  revalidatePath("/documents");
  return withMsg(to, "saved", "1");
}

export async function deleteDocument(fd: FormData): Promise<void> {
  const to = safeReturnTo(fd.get("return_to"), "/documents");
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) redirect(to);
  const ctx = await requireAccess("documents.write");
  const { data: doc } = await ctx.supabase.from("documents").select("id, storage_path").eq("id", id.data).maybeSingle();
  if (!doc) redirect(to);
  const { error } = await ctx.supabase.from("documents").delete().eq("id", doc.id);
  if (error) return withMsg(to, "error", "Could not delete the document.");
  await ctx.supabase.storage.from("documents").remove([doc.storage_path]);
  revalidatePath("/documents");
  return withMsg(to, "saved", "1");
}
