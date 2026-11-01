"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAccess } from "@/server/auth/session";
import { moneyOrNull, nullIfEmpty, numberOrNull, readValues, sastToIso, type FormState } from "@/lib/forms";
import { JOB_STATUSES } from "@/lib/status";
import { JOB_FIELD_NAMES } from "./fields";

const dateText = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")]);
const jobSchema = z.object({
  title: z.string().min(2, "Enter a job title").max(200),
  collection_address: z.string().max(500),
  delivery_address: z.string().max(500),
  collection_date: dateText,
  delivery_deadline: dateText,
  cargo_description: z.string().max(1000),
  weight_kg: z.string(),
  packages: z.string(),
  customer_instructions: z.string().max(2000),
  internal_notes: z.string().max(2000),
});

function jobRow(values: Record<string, string>): { row?: Record<string, unknown>; error?: string } {
  const p = jobSchema.safeParse(values);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the form." };
  const price = moneyOrNull(values.agreed_price);
  if (price === undefined) return { error: "Enter the price like 12500.00" };
  const w = numberOrNull(p.data.weight_kg);
  const pk = numberOrNull(p.data.packages);
  if ((w ?? 0) < 0 || (pk ?? 0) < 0) return { error: "Weight and packages cannot be negative." };
  return {
    row: {
      title: p.data.title,
      collection_address: nullIfEmpty(p.data.collection_address),
      delivery_address: nullIfEmpty(p.data.delivery_address),
      collection_date: nullIfEmpty(p.data.collection_date),
      delivery_deadline: nullIfEmpty(p.data.delivery_deadline),
      cargo_description: nullIfEmpty(p.data.cargo_description),
      weight_kg: w,
      packages: pk === null ? null : Math.round(pk),
      agreed_price_cents: price ?? 0,
      customer_instructions: nullIfEmpty(p.data.customer_instructions),
      internal_notes: nullIfEmpty(p.data.internal_notes),
    },
  };
}

export async function createJob(_prev: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireAccess("jobs.write");
  const customerId = z.string().uuid().safeParse(fd.get("customer_id"));
  const values = readValues(fd, JOB_FIELD_NAMES);
  if (!customerId.success) return { error: "Choose a customer first.", values };
  const { row, error } = jobRow(values);
  if (!row) return { error, values };
  const { data, error: dbError } = await ctx.supabase
    .from("jobs")
    .insert({ ...row, organization_id: ctx.organizationId, customer_id: customerId.data, status: "new" })
    .select("id")
    .single();
  if (dbError || !data) return { error: "Could not save the job.", values };
  revalidatePath("/jobs");
  redirect(`/jobs/${data.id}`);
}

export async function updateJob(_prev: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireAccess("jobs.write");
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) return { error: "Invalid job." };
  const values = readValues(fd, JOB_FIELD_NAMES);
  const { row, error } = jobRow(values);
  if (!row) return { error, values };
  const { error: dbError } = await ctx.supabase.from("jobs").update(row).eq("id", id.data);
  if (dbError) return { error: "Could not save the job.", values };
  revalidatePath(`/jobs/${id.data}`);
  redirect(`/jobs/${id.data}?saved=1`);
}

export async function setJobStatus(fd: FormData) {
  const ctx = await requireAccess("jobs.write");
  const id = z.string().uuid().safeParse(fd.get("id"));
  const status = z.enum(JOB_STATUSES.map((s) => s.value) as [string, ...string[]]).safeParse(fd.get("status"));
  if (!id.success || !status.success) redirect("/jobs");
  if (status.data === "completed" && !ctx.permissions.has("jobs.complete")) {
    redirect(`/jobs/${id.data}?error=${encodeURIComponent("You are not allowed to complete jobs.")}`);
  }
  const { error } = await ctx.supabase
    .from("jobs")
    .update({ status: status.data, completed_at: status.data === "completed" ? new Date().toISOString() : null })
    .eq("id", id.data);
  if (error) redirect(`/jobs/${id.data}?error=${encodeURIComponent("Could not change the status.")}`);
  revalidatePath(`/jobs/${id.data}`);
  redirect(`/jobs/${id.data}`);
}

export async function addJobEvent(fd: FormData) {
  const ctx = await requireAccess("jobs.write");
  const id = z.string().uuid().safeParse(fd.get("id"));
  const kind = z.enum(["note", "delay", "location"]).safeParse(fd.get("kind"));
  const note = z.string().trim().min(1).max(1000).safeParse(fd.get("note"));
  if (!id.success || !kind.success || !note.success) {
    redirect(`/jobs/${id.success ? id.data : ""}?error=${encodeURIComponent("Enter a note.")}`);
  }
  await ctx.supabase.from("job_events").insert({ organization_id: ctx.organizationId, job_id: id.data, kind: kind.data, note: note.data });
  revalidatePath(`/jobs/${id.data}`);
  redirect(`/jobs/${id.data}`);
}

const optionalUuid = z.union([z.literal(""), z.string().uuid()]);

export async function allocateTrip(_prev: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireAccess("dispatch.manage");
  const values = readValues(fd, ["vehicle_id", "trailer_id", "driver_id", "planned_start", "planned_end", "override_reason"]);
  const jobId = z.string().uuid().safeParse(fd.get("job_id"));
  if (!jobId.success) return { error: "Invalid job.", values };
  const ids = z.object({ vehicle_id: optionalUuid, trailer_id: optionalUuid, driver_id: optionalUuid }).safeParse(values);
  if (!ids.success) return { error: "Invalid selection.", values };
  if (!ids.data.vehicle_id && !ids.data.driver_id) return { error: "Choose at least a truck or a driver.", values };
  const start = sastToIso(values.planned_start);
  const end = sastToIso(values.planned_end);
  if (!start || !end) return { error: "Enter the departure and estimated arrival date and time.", values };
  if (new Date(end) <= new Date(start)) return { error: "Arrival must be after departure.", values };

  const { data: trip, error } = await ctx.supabase
    .from("trips")
    .insert({
      organization_id: ctx.organizationId,
      job_id: jobId.data,
      vehicle_id: nullIfEmpty(ids.data.vehicle_id),
      trailer_id: nullIfEmpty(ids.data.trailer_id),
      driver_id: nullIfEmpty(ids.data.driver_id),
      planned_start: start,
      planned_end: end,
      override_reason: nullIfEmpty(values.override_reason),
    })
    .select("id")
    .single();

  if (error || !trip) {
    const msg = error?.message ?? "";
    if (error?.code === "23P01") {
      const what = msg.includes("vehicle") ? "That truck" : msg.includes("trailer") ? "That trailer" : "That driver";
      return { error: `${what} is already booked for part of that time. Choose another time or resource${ctx.permissions.has("dispatch.override") ? ", or enter an override reason" : ""}.`, values };
    }
    if (error?.code === "42501") return { error: "You are not allowed to override allocation conflicts.", values };
    return { error: "Could not save the allocation.", values };
  }

  const { data: job } = await ctx.supabase.from("jobs").select("status").eq("id", jobId.data).maybeSingle();
  if (job && (job.status === "new" || job.status === "awaiting_allocation")) {
    await ctx.supabase.from("jobs").update({ status: "scheduled" }).eq("id", jobId.data);
  }
  await ctx.supabase.from("job_events").insert({
    organization_id: ctx.organizationId,
    job_id: jobId.data,
    kind: "allocation",
    note: values.override_reason ? `Allocation saved with override: ${values.override_reason}` : "Truck/driver allocated",
  });
  revalidatePath(`/jobs/${jobId.data}`);
  revalidatePath("/dispatch");
  redirect(`/jobs/${jobId.data}?saved=1`);
}

const JOB_FOR_TRIP: Record<string, string> = { dispatched: "dispatched", in_transit: "in_transit", completed: "delivered", cancelled: "awaiting_allocation" };

export async function setTripStatus(fd: FormData) {
  const ctx = await requireAccess("dispatch.manage");
  const id = z.string().uuid().safeParse(fd.get("id"));
  const status = z.enum(["dispatched", "in_transit", "completed", "cancelled"]).safeParse(fd.get("status"));
  const back = z.string().regex(/^\/(jobs\/[0-9a-f-]{36}|dispatch)$/).safeParse(fd.get("back"));
  const dest = back.success ? back.data : "/dispatch";
  if (!id.success || !status.success) redirect(dest);

  const { data: trip } = await ctx.supabase.from("trips").select("id, job_id").eq("id", id.data).maybeSingle();
  if (!trip) redirect(dest);
  const { error } = await ctx.supabase.from("trips").update({ status: status.data }).eq("id", id.data);
  if (error) redirect(`${dest}?error=${encodeURIComponent("Could not update the trip.")}`);

  await ctx.supabase.from("jobs").update({ status: JOB_FOR_TRIP[status.data] }).eq("id", trip.job_id);
  await ctx.supabase.from("job_events").insert({ organization_id: ctx.organizationId, job_id: trip.job_id, kind: "allocation", note: `Trip ${status.data}` });
  revalidatePath("/dispatch");
  revalidatePath(`/jobs/${trip.job_id}`);
  redirect(dest);
}
