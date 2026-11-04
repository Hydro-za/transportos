"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAccess } from "@/server/auth/session";
import { ALLOWED_MIME, MAX_UPLOAD_BYTES, safeFileName } from "@/lib/documents";

const uuid = z.string().uuid();
const go = (key: "error" | "saved", msg: string) => redirect(`/driver?${key}=${encodeURIComponent(msg)}`);

export async function driverSetStatus(fd: FormData): Promise<void> {
  const ctx = await requireAccess("driver.access");
  const trip = uuid.safeParse(fd.get("trip"));
  const to = z.enum(["in_transit", "completed"]).safeParse(fd.get("to"));
  if (!trip.success || !to.success) return go("error", "Invalid request.");
  const { error } = await ctx.supabase.rpc("driver_set_trip_status", { p_trip: trip.data, p_to: to.data });
  if (error) return go("error", "Could not update the trip. It may have changed, please refresh.");
  revalidatePath("/driver");
  return go("saved", "Trip updated.");
}

export async function driverAddNote(fd: FormData): Promise<void> {
  const ctx = await requireAccess("driver.access");
  const trip = uuid.safeParse(fd.get("trip"));
  const note = z.string().trim().min(1).max(1000).safeParse(fd.get("note"));
  if (!trip.success || !note.success) return go("error", "Write a note first.");
  const { error } = await ctx.supabase.rpc("driver_add_note", { p_trip: trip.data, p_note: note.data });
  if (error) return go("error", "Could not save the note.");
  return go("saved", "Note sent to the office.");
}

export async function driverUploadPod(fd: FormData): Promise<void> {
  const ctx = await requireAccess("driver.access");
  const trip = uuid.safeParse(fd.get("trip"));
  const job = uuid.safeParse(fd.get("job"));
  const file = fd.get("file");
  if (!trip.success || !job.success) return go("error", "Invalid request.");
  if (!(file instanceof File) || file.size === 0) return go("error", "Choose or take a photo first.");
  if (file.size > MAX_UPLOAD_BYTES) return go("error", "That photo is larger than 4 MB. Lower the camera quality or send a PDF scan.");
  if (!ALLOWED_MIME.includes(file.type)) return go("error", "Only PDF, JPG, PNG or WebP files are allowed.");
  const path = `${ctx.organizationId}/pod/${job.data}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error: up } = await ctx.supabase.storage.from("documents").upload(path, file, { contentType: file.type, upsert: false });
  if (up) return go("error", "Upload failed. Check that this is your job and try again.");
  const { error } = await ctx.supabase.rpc("driver_register_pod", { p_trip: trip.data, p_path: path, p_mime: file.type, p_size: file.size, p_title: "Proof of delivery" });
  if (error) {
    await ctx.supabase.storage.from("documents").remove([path]);
    return go("error", "Could not save the proof of delivery.");
  }
  revalidatePath("/driver");
  return go("saved", "Proof of delivery uploaded.");
}
