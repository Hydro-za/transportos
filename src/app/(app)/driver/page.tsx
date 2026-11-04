import { requireAccess } from "@/server/auth/session";
import { Badge, Card, EmptyState, Notice, PageHeader, linkButtonClass, linkButtonStyle, ghostButtonClass, ghostButtonStyle } from "@/components/ui";
import { formatDateTime } from "@/lib/forms";
import { TRIP_TONE } from "@/lib/status";
import { driverAddNote, driverSetStatus, driverUploadPod } from "./actions";

const bd = { borderColor: "var(--border)" } as const;
const maps = (a: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;

export default async function DriverPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const ctx = await requireAccess("driver.access");
  const { saved, error } = await searchParams;
  const { data: trips } = await ctx.supabase.rpc("driver_trips");
  const rows = trips ?? [];
  return (
    <div className="max-w-xl">
      <PageHeader title="My trips" subtitle="Jobs allocated to you. Tap to update progress." />
      {error ? <Notice kind="error">{error}</Notice> : null}
      {saved ? <Notice kind="info">{saved}</Notice> : null}
      {rows.length === 0 ? <Card><EmptyState>No trips for you right now. The office will dispatch your next job.</EmptyState></Card> : null}
      <div className="space-y-4">
        {rows.map((t) => (
          <Card key={t.trip_id} title={`${t.job_number}: ${t.job_title}`}>
            <div className="mb-3 flex items-center justify-between text-sm">
              <span style={{ color: "var(--muted)" }}>{t.customer_name}</span>
              <Badge tone={TRIP_TONE[t.trip_status] ?? "neutral"}>{t.trip_status.replace(/_/g, " ")}</Badge>
            </div>
            <dl className="space-y-2 text-sm">
              <div><dt style={{ color: "var(--muted)" }}>Collect</dt><dd>{t.collection_address ? <a href={maps(t.collection_address)} target="_blank" rel="noopener noreferrer" className="underline">{t.collection_address}</a> : "-"}</dd></div>
              <div><dt style={{ color: "var(--muted)" }}>Deliver</dt><dd>{t.delivery_address ? <a href={maps(t.delivery_address)} target="_blank" rel="noopener noreferrer" className="underline">{t.delivery_address}</a> : "-"}</dd></div>
              <div><dt style={{ color: "var(--muted)" }}>Departure / arrival</dt><dd>{formatDateTime(t.planned_start)} to {formatDateTime(t.planned_end)}</dd></div>
              <div><dt style={{ color: "var(--muted)" }}>Cargo</dt><dd>{[t.cargo_description, t.weight_kg ? `${t.weight_kg} kg` : null].filter(Boolean).join(" · ") || "-"}</dd></div>
              <div><dt style={{ color: "var(--muted)" }}>Truck / trailer</dt><dd>{[t.vehicle_registration, t.trailer_registration].filter(Boolean).join(" / ") || "-"}</dd></div>
              {t.customer_instructions ? <div><dt style={{ color: "var(--muted)" }}>Customer instructions</dt><dd className="whitespace-pre-wrap">{t.customer_instructions}</dd></div> : null}
            </dl>

            {t.trip_status === "dispatched" ? (
              <form action={driverSetStatus} className="mt-4"><input type="hidden" name="trip" value={t.trip_id} /><input type="hidden" name="to" value="in_transit" /><button className={`${linkButtonClass} w-full py-3 text-base`} style={linkButtonStyle}>Start trip</button></form>
            ) : null}
            {t.trip_status === "in_transit" ? (
              <form action={driverSetStatus} className="mt-4"><input type="hidden" name="trip" value={t.trip_id} /><input type="hidden" name="to" value="completed" /><button className={`${linkButtonClass} w-full py-3 text-base`} style={linkButtonStyle}>Mark delivered</button></form>
            ) : null}

            {t.trip_status !== "dispatched" ? (
              <form action={driverUploadPod} encType="multipart/form-data" className="mt-4 space-y-2">
                <input type="hidden" name="trip" value={t.trip_id} />
                <input type="hidden" name="job" value={t.job_id} />
                <label className="block text-xs">Proof of delivery ({Number(t.pod_count)} uploaded)
                  <input type="file" name="file" required accept="image/*,application/pdf" capture="environment" className="mt-1 block w-full rounded-xl border bg-transparent px-3 py-2 text-sm" style={bd} />
                </label>
                <button className={ghostButtonClass} style={ghostButtonStyle}>Upload proof of delivery</button>
              </form>
            ) : null}

            <form action={driverAddNote} className="mt-4 flex gap-2">
              <input type="hidden" name="trip" value={t.trip_id} />
              <input name="note" required maxLength={1000} placeholder="Message to the office (delay, issue)" className="min-w-0 flex-1 rounded-xl border bg-transparent px-3 py-2 text-sm" style={bd} />
              <button className={ghostButtonClass} style={ghostButtonStyle}>Send</button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
