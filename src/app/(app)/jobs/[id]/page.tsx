import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAccess } from "@/server/auth/session";
import { Badge, Card, EmptyState, Notice, PageHeader, ghostButtonClass, ghostButtonStyle } from "@/components/ui";
import { EntityForm } from "@/components/entity-form";
import { centsToRandsString, formatZar } from "@/lib/money";
import { formatDateTime } from "@/lib/forms";
import { JOB_LABEL, JOB_STATUSES, JOB_TONE, TRIP_TONE } from "@/lib/status";
import type { FieldDef } from "@/lib/forms";
import { JOB_FIELDS } from "../fields";
import { createInvoiceFromJob } from "../../invoices/actions";
import { addJobEvent, allocateTrip, setJobStatus, setTripStatus, updateJob } from "../actions";

const NEXT_TRIP: Record<string, { to: string; label: string }[]> = {
  planned: [{ to: "dispatched", label: "Confirm dispatch" }, { to: "cancelled", label: "Cancel" }],
  dispatched: [{ to: "in_transit", label: "Mark in transit" }, { to: "cancelled", label: "Cancel" }],
  in_transit: [{ to: "completed", label: "Mark delivered" }],
};

export default async function JobPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const ctx = await requireAccess("jobs.read");
  const { id } = await params;
  const { saved, error } = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const { data: job } = await ctx.supabase.from("jobs").select("*, customers(name)").eq("id", id).maybeSingle();
  if (!job) notFound();
  const { data: events } = await ctx.supabase.from("job_events").select("*").eq("job_id", id).order("created_at", { ascending: false });
  const canWrite = ctx.permissions.has("jobs.write");
  const canDispatch = ctx.permissions.has("dispatch.manage");

  const canSeeDispatch = ctx.permissions.has("dispatch.read");
  const { data: trips } = canSeeDispatch
    ? await ctx.supabase
        .from("trips")
        .select("id, status, planned_start, planned_end, override_reason, vehicles(registration_no), trailers(registration_no), drivers(full_name)")
        .eq("job_id", id)
        .order("planned_start")
    : { data: [] };

  let allocFields: FieldDef[] = [];
  if (canDispatch) {
    const [{ data: vehicles }, { data: trailers }, { data: drivers }] = await Promise.all([
      ctx.supabase.from("vehicles").select("id, registration_no, fleet_no, status").neq("status", "out_of_service").order("registration_no"),
      ctx.supabase.from("trailers").select("id, registration_no, status").neq("status", "out_of_service").order("registration_no"),
      ctx.supabase.from("drivers").select("id, full_name").eq("status", "active").order("full_name"),
    ]);
    allocFields = [
      { name: "vehicle_id", label: "Truck", type: "select", options: (vehicles ?? []).map((v) => ({ value: v.id, label: `${v.registration_no}${v.fleet_no ? ` (${v.fleet_no})` : ""}` })) },
      { name: "trailer_id", label: "Trailer", type: "select", options: (trailers ?? []).map((t) => ({ value: t.id, label: t.registration_no })) },
      { name: "driver_id", label: "Driver", type: "select", options: (drivers ?? []).map((d) => ({ value: d.id, label: d.full_name })) },
      { name: "planned_start", label: "Departure", type: "datetime", required: true },
      { name: "planned_end", label: "Estimated arrival", type: "datetime", required: true },
    ];
    if (ctx.permissions.has("dispatch.override")) {
      allocFields.push({ name: "override_reason", label: "Override reason", wide: true, help: "Only fill this in to knowingly allow a double booking. It is recorded." });
    }
  }

  return (
    <div>
      <PageHeader
        title={`${job.number}: ${job.title}`}
        subtitle={`${(job.customers as unknown as { name: string } | null)?.name ?? ""}${job.agreed_price_cents ? ` · agreed ${formatZar(job.agreed_price_cents)}` : ""}`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={JOB_TONE[job.status] ?? "neutral"}>{JOB_LABEL[job.status] ?? job.status}</Badge>
            {ctx.permissions.has("invoices.write") && job.status !== "cancelled" ? (
              <form action={createInvoiceFromJob}><input type="hidden" name="job_id" value={job.id} /><button className={ghostButtonClass} style={ghostButtonStyle}>Create invoice</button></form>
            ) : null}
            <Link href="/jobs" className={ghostButtonClass} style={ghostButtonStyle}>Back</Link>
          </div>
        }
      />
      {error ? <Notice kind="error">{error}</Notice> : null}
      {saved ? <Notice kind="info">Saved.</Notice> : null}

      {canWrite ? (
        <Card title="Status">
          <form action={setJobStatus} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={job.id} />
            <select name="status" defaultValue={job.status} className="rounded-xl border bg-transparent px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
              {JOB_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <button type="submit" className={ghostButtonClass} style={ghostButtonStyle}>Update status</button>
          </form>
        </Card>
      ) : null}

      {canSeeDispatch ? (
        <Card title="Allocation">
          {trips && trips.length > 0 ? (
            <ul className="mb-4 divide-y" style={{ borderColor: "var(--border)" }}>
              {trips.map((t) => {
                const v = t.vehicles as unknown as { registration_no: string } | null;
                const tr = t.trailers as unknown as { registration_no: string } | null;
                const d = t.drivers as unknown as { full_name: string } | null;
                return (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <span>
                      <span className="font-medium">{[v?.registration_no, tr?.registration_no, d?.full_name].filter(Boolean).join(" · ")}</span>
                      <span className="block" style={{ color: "var(--muted)" }}>
                        {formatDateTime(t.planned_start)} → {formatDateTime(t.planned_end)}
                        {t.override_reason ? ` · override: ${t.override_reason}` : ""}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge tone={TRIP_TONE[t.status] ?? "neutral"}>{t.status}</Badge>
                      {canDispatch
                        ? (NEXT_TRIP[t.status] ?? []).map((n) => (
                            <form key={n.to} action={setTripStatus}>
                              <input type="hidden" name="id" value={t.id} />
                              <input type="hidden" name="status" value={n.to} />
                              <input type="hidden" name="back" value={`/jobs/${job.id}`} />
                              <button type="submit" className="rounded-lg border px-2.5 py-1.5 text-xs font-medium" style={{ borderColor: "var(--border)" }}>{n.label}</button>
                            </form>
                          ))
                        : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState>No truck or driver allocated yet.</EmptyState>
          )}
          {canDispatch ? <EntityForm fields={allocFields} action={allocateTrip} hidden={{ job_id: job.id }} submitLabel="Allocate" /> : null}
        </Card>
      ) : null}

      <Card title={canWrite ? "Job details" : "Job details (read only)"}>
        {canWrite ? (
          <EntityForm fields={JOB_FIELDS} action={updateJob} hidden={{ id: job.id }} submitLabel="Save changes" initial={{ ...job, agreed_price: centsToRandsString(job.agreed_price_cents) }} />
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {JOB_FIELDS.map((f) => (
              <div key={f.name}>
                <dt style={{ color: "var(--muted)" }}>{f.label}</dt>
                <dd className="whitespace-pre-wrap">{String((f.name === "agreed_price" ? formatZar(job.agreed_price_cents) : (job as Record<string, unknown>)[f.name]) ?? "") || "-"}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>

      <Card title="Timeline">
        {canWrite ? (
          <form action={addJobEvent} className="mb-4 flex flex-wrap gap-2">
            <input type="hidden" name="id" value={job.id} />
            <select name="kind" className="rounded-xl border bg-transparent px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
              <option value="note">Note</option>
              <option value="delay">Delay</option>
              <option value="location">Location update</option>
            </select>
            <input name="note" required maxLength={1000} placeholder="What happened?" className="min-w-0 flex-1 rounded-xl border bg-transparent px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }} />
            <button type="submit" className={ghostButtonClass} style={ghostButtonStyle}>Add</button>
          </form>
        ) : null}
        <ul className="space-y-2 text-sm">
          {(events ?? []).map((e) => (
            <li key={e.id}>
              <span style={{ color: "var(--muted)" }}>{formatDateTime(e.created_at)} · {e.kind}</span>
              <br />
              {e.note}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
