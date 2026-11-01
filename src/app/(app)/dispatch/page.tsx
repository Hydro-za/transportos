import Link from "next/link";
import { requireAccess } from "@/server/auth/session";
import { Badge, Card, EmptyState, Notice, PageHeader } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/forms";
import { JOB_LABEL, TRIP_TONE } from "@/lib/status";
import { setTripStatus } from "../jobs/actions";

const NEXT: Record<string, { to: string; label: string }[]> = {
  planned: [{ to: "dispatched", label: "Confirm dispatch" }],
  dispatched: [{ to: "in_transit", label: "In transit" }],
  in_transit: [{ to: "completed", label: "Delivered" }],
};

export default async function DispatchPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const ctx = await requireAccess("dispatch.read");
  const { error } = await searchParams;
  const canManage = ctx.permissions.has("dispatch.manage");
  const nowIso = new Date().toISOString();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });

  const [{ data: waiting }, { data: trips }, { data: late }, { data: vehicles }, { data: drivers }] = await Promise.all([
    ctx.supabase.from("jobs").select("id, number, title, delivery_deadline, status, customers(name)").in("status", ["new", "awaiting_allocation"]).order("delivery_deadline", { nullsFirst: false }),
    ctx.supabase
      .from("trips")
      .select("id, status, planned_start, planned_end, job_id, jobs(number, title), vehicles(id, registration_no), drivers(id, full_name), trailers(registration_no)")
      .in("status", ["planned", "dispatched", "in_transit"])
      .order("planned_start"),
    ctx.supabase.from("jobs").select("id, number, title, delivery_deadline, status").lt("delivery_deadline", today).not("status", "in", "(completed,cancelled,delivered,awaiting_pod)").order("delivery_deadline"),
    ctx.supabase.from("vehicles").select("id, registration_no, status").in("status", ["available", "assigned", "on_trip"]),
    ctx.supabase.from("drivers").select("id, full_name").eq("status", "active"),
  ]);

  const busyNow = (trips ?? []).filter((t) => t.planned_start <= nowIso && t.planned_end >= nowIso);
  const busyVehicles = new Set(busyNow.map((t) => (t.vehicles as unknown as { id: string } | null)?.id).filter(Boolean));
  const busyDrivers = new Set(busyNow.map((t) => (t.drivers as unknown as { id: string } | null)?.id).filter(Boolean));
  const freeVehicles = (vehicles ?? []).filter((v) => !busyVehicles.has(v.id));
  const freeDrivers = (drivers ?? []).filter((d) => !busyDrivers.has(d.id));

  return (
    <div>
      <PageHeader title="Dispatch" subtitle="Allocate trucks and drivers, then follow each trip." />
      {error ? <Notice kind="error">{error}</Notice> : null}

      <Card title={`Awaiting allocation (${waiting?.length ?? 0})`}>
        {waiting && waiting.length > 0 ? (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {waiting.map((j) => (
              <li key={j.id}>
                <Link href={`/jobs/${j.id}`} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                  <span><span className="font-medium">{j.number}</span> {j.title}</span>
                  <span style={{ color: "var(--muted)" }}>{j.delivery_deadline ? `deadline ${formatDate(j.delivery_deadline)}` : "no deadline"}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>Nothing waiting for allocation.</EmptyState>
        )}
      </Card>

      <Card title={`Active and upcoming trips (${trips?.length ?? 0})`}>
        {trips && trips.length > 0 ? (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {trips.map((t) => {
              const j = t.jobs as unknown as { number: string; title: string } | null;
              const v = t.vehicles as unknown as { registration_no: string } | null;
              const d = t.drivers as unknown as { full_name: string } | null;
              const tr = t.trailers as unknown as { registration_no: string } | null;
              return (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span>
                    <Link href={`/jobs/${t.job_id}`} className="font-medium">{j?.number} {j?.title}</Link>
                    <span className="block" style={{ color: "var(--muted)" }}>
                      {[v?.registration_no, tr?.registration_no, d?.full_name].filter(Boolean).join(" · ")} · {formatDateTime(t.planned_start)} → {formatDateTime(t.planned_end)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge tone={TRIP_TONE[t.status] ?? "neutral"}>{t.status}</Badge>
                    {canManage
                      ? (NEXT[t.status] ?? []).map((n) => (
                          <form key={n.to} action={setTripStatus}>
                            <input type="hidden" name="id" value={t.id} />
                            <input type="hidden" name="status" value={n.to} />
                            <input type="hidden" name="back" value="/dispatch" />
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
          <EmptyState>No trips planned.</EmptyState>
        )}
      </Card>

      <Card title={`Delayed jobs (${late?.length ?? 0})`}>
        {late && late.length > 0 ? (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {late.map((j) => (
              <li key={j.id}>
                <Link href={`/jobs/${j.id}`} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                  <span><span className="font-medium">{j.number}</span> {j.title}</span>
                  <span style={{ color: "#d70015" }}>deadline {formatDate(j.delivery_deadline)} · {JOB_LABEL[j.status] ?? j.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>No jobs are past their delivery deadline.</EmptyState>
        )}
      </Card>

      <Card title="Free right now">
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="mb-1 font-medium">Trucks ({freeVehicles.length})</p>
            <p style={{ color: "var(--muted)" }}>{freeVehicles.map((v) => v.registration_no).join(", ") || "None"}</p>
          </div>
          <div>
            <p className="mb-1 font-medium">Drivers ({freeDrivers.length})</p>
            <p style={{ color: "var(--muted)" }}>{freeDrivers.map((d) => d.full_name).join(", ") || "None"}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
