import type { ReactNode } from "react";
import type { FieldDef } from "@/lib/forms";
import { formatDate } from "@/lib/forms";
import { formatZar } from "@/lib/money";
import { fuelStatsByRecord, type FuelRecord } from "@/lib/fuel";
import { maintenanceAlerts, expiryAlerts } from "@/lib/maintenance";
import { Badge } from "@/components/ui";
import type { requireAccess } from "@/server/auth/session";
import type { Tone } from "@/lib/status";

export type AccessCtx = Awaited<ReturnType<typeof requireAccess>>;
export type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type ResourceDef = {
  key: string;
  table: string;
  path: string;
  singular: string;
  title: string;
  subtitle: string;
  readPerm: string;
  writePerm: string;
  fields: (ctx: AccessCtx) => Promise<FieldDef[]>;
  select: string;
  order: { column: string; ascending: boolean };
  search?: string[];
  unique?: string;
  defaults?: Record<string, unknown>;
  tabs?: { href: string; label: string }[];
  line: (r: Row) => { title: string; subtitle?: string; right?: string; badge?: { text: string; tone: Tone } };
  enrich?: (rows: Row[]) => Row[];
  extra?: (ctx: AccessCtx) => Promise<ReactNode>;
  afterSave?: (ctx: AccessCtx, row: Record<string, unknown>) => Promise<void>;
};

const opt = (values: string[]) => values.map((v) => ({ value: v, label: v.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) }));
const STATUS_TONE: Record<string, Tone> = { available: "good", active: "good", assigned: "warn", on_trip: "warn", maintenance: "warn", on_leave: "warn", out_of_service: "bad", inactive: "bad", completed: "good", scheduled: "neutral", in_progress: "warn", cancelled: "bad" };

async function vehicleOptions(ctx: AccessCtx) {
  const { data } = await ctx.supabase.from("vehicles").select("id, registration_no, fleet_no").order("registration_no");
  return (data ?? []).map((v) => ({ value: v.id as string, label: `${v.registration_no}${v.fleet_no ? ` (${v.fleet_no})` : ""}` }));
}
async function jobOptions(ctx: AccessCtx) {
  const { data } = await ctx.supabase.from("jobs").select("id, number, title").order("created_at", { ascending: false }).limit(150);
  return (data ?? []).map((j) => ({ value: j.id as string, label: `${j.number} ${j.title}` }));
}

async function bumpOdometer(ctx: AccessCtx, row: Record<string, unknown>) {
  const odo = row.odometer_km;
  const vehicle = row.vehicle_id;
  if (typeof odo === "number" && typeof vehicle === "string") {
    await ctx.supabase.from("vehicles").update({ odometer_km: odo }).eq("id", vehicle).lt("odometer_km", odo); // best effort
  }
}

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });

export const RESOURCES: Record<string, ResourceDef> = {
  vehicles: {
    key: "vehicles", table: "vehicles", path: "/fleet", singular: "vehicle", title: "Fleet", subtitle: "Trucks and their status.",
    readPerm: "fleet.read", writePerm: "fleet.write",
    tabs: [{ href: "/fleet", label: "Vehicles" }, { href: "/fleet/trailers", label: "Trailers" }],
    select: "id, registration_no, fleet_no, vehicle_type, make, model, year, status, odometer_km",
    order: { column: "registration_no", ascending: true },
    search: ["registration_no", "fleet_no", "make", "model"],
    unique: "A vehicle with that registration number already exists.",
    defaults: { status: "available", fuel_type: "diesel", odometer_km: 0 },
    fields: async () => [
      { name: "registration_no", label: "Registration number", required: true },
      { name: "fleet_no", label: "Fleet number" },
      { name: "vehicle_type", label: "Vehicle type", placeholder: "e.g. Truck tractor, Rigid" },
      { name: "make", label: "Make" },
      { name: "model", label: "Model" },
      { name: "year", label: "Year", type: "number", step: "1" },
      { name: "vin", label: "VIN / chassis number" },
      { name: "engine_no", label: "Engine number" },
      { name: "capacity_kg", label: "Carrying capacity (kg)", type: "number", step: "0.01" },
      { name: "fuel_type", label: "Fuel type", type: "select", required: true, options: opt(["diesel", "petrol", "other"]) },
      { name: "odometer_km", label: "Odometer (km)", type: "number", step: "0.1", required: true },
      { name: "acquisition_date", label: "Acquisition date", type: "date" },
      { name: "purchase_price", label: "Purchase price (R)", type: "money" },
      { name: "status", label: "Status", type: "select", required: true, options: opt(["available", "assigned", "on_trip", "maintenance", "out_of_service"]) },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
    line: (r) => ({
      title: `${r.registration_no}${r.fleet_no ? ` · fleet ${r.fleet_no}` : ""}`,
      subtitle: [r.make, r.model, r.year, r.vehicle_type].filter(Boolean).join(" ") || undefined,
      right: `${Number(r.odometer_km).toLocaleString("en-ZA")} km`,
      badge: { text: String(r.status).replace(/_/g, " "), tone: STATUS_TONE[r.status] ?? "neutral" },
    }),
  },
  trailers: {
    key: "trailers", table: "trailers", path: "/fleet/trailers", singular: "trailer", title: "Trailers", subtitle: "Trailers and their licence dates.",
    readPerm: "fleet.read", writePerm: "fleet.write",
    tabs: [{ href: "/fleet", label: "Vehicles" }, { href: "/fleet/trailers", label: "Trailers" }],
    select: "id, registration_no, trailer_type, capacity_kg, licence_expiry, status",
    order: { column: "registration_no", ascending: true },
    search: ["registration_no", "trailer_type"],
    unique: "A trailer with that registration number already exists.",
    defaults: { status: "available" },
    fields: async () => [
      { name: "registration_no", label: "Registration number", required: true },
      { name: "trailer_type", label: "Trailer type", placeholder: "e.g. Flatbed, Tautliner, Tanker" },
      { name: "capacity_kg", label: "Capacity (kg)", type: "number", step: "0.01" },
      { name: "licence_expiry", label: "Licence expiry", type: "date" },
      { name: "status", label: "Status", type: "select", required: true, options: opt(["available", "assigned", "on_trip", "maintenance", "out_of_service"]) },
      { name: "specifications", label: "Specifications", type: "textarea" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
    line: (r) => ({
      title: r.registration_no,
      subtitle: [r.trailer_type, r.capacity_kg ? `${r.capacity_kg} kg` : null, r.licence_expiry ? `licence expires ${formatDate(r.licence_expiry)}` : null].filter(Boolean).join(" · ") || undefined,
      badge: { text: String(r.status).replace(/_/g, " "), tone: STATUS_TONE[r.status] ?? "neutral" },
    }),
  },
  drivers: {
    key: "drivers", table: "drivers", path: "/drivers", singular: "driver", title: "Drivers & Staff", subtitle: "Drivers, licences and permits.",
    readPerm: "drivers.read", writePerm: "drivers.write",
    select: "id, full_name, phone, licence_code, licence_expiry, pdp_expiry, status",
    order: { column: "full_name", ascending: true },
    search: ["full_name", "phone", "email", "licence_no"],
    defaults: { status: "active" },
    fields: async () => [
      { name: "full_name", label: "Full name", required: true, wide: true },
      { name: "phone", label: "Telephone", type: "tel" },
      { name: "email", label: "Email", type: "email" },
      { name: "emergency_contact_name", label: "Emergency contact name" },
      { name: "emergency_contact_phone", label: "Emergency contact telephone", type: "tel" },
      { name: "licence_no", label: "Driver licence number" },
      { name: "licence_code", label: "Licence code", placeholder: "e.g. EC, C1" },
      { name: "licence_expiry", label: "Licence expiry", type: "date" },
      { name: "pdp_expiry", label: "Professional driving permit expiry", type: "date" },
      { name: "employment_start", label: "Employment start date", type: "date" },
      { name: "status", label: "Status", type: "select", required: true, options: opt(["active", "on_leave", "inactive"]) },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
    line: (r) => ({
      title: r.full_name,
      subtitle: [r.phone, r.licence_code && `Code ${r.licence_code}`, r.licence_expiry && `licence ${formatDate(r.licence_expiry)}`, r.pdp_expiry && `PDP ${formatDate(r.pdp_expiry)}`].filter(Boolean).join(" · ") || undefined,
      badge: { text: String(r.status).replace(/_/g, " "), tone: STATUS_TONE[r.status] ?? "neutral" },
    }),
    extra: async (ctx) => {
      const { data } = await ctx.supabase.from("drivers").select("full_name, licence_expiry, pdp_expiry").eq("status", "active");
      const alerts = expiryAlerts(
        (data ?? []).flatMap((d) => [
          { label: `${d.full_name}: driver licence`, date: d.licence_expiry as string | null },
          { label: `${d.full_name}: PDP`, date: d.pdp_expiry as string | null },
        ]),
        today(),
      );
      if (alerts.length === 0) return null;
      return (
        <div className="mb-4 rounded-2xl border p-4 text-sm" style={{ borderColor: "var(--border)" }}>
          <p className="mb-2 font-medium">Expiry notifications</p>
          <ul className="space-y-1">
            {alerts.map((a) => (
              <li key={a.label + a.date} style={{ color: a.expired ? "#d70015" : "#b36b00" }}>
                {a.label} {a.expired ? "expired" : "expires"} {formatDate(a.date)}
              </li>
            ))}
          </ul>
        </div>
      );
    },
  },
  maintenance: {
    key: "maintenance", table: "maintenance_records", path: "/maintenance", singular: "maintenance record", title: "Maintenance", subtitle: "Services, repairs and inspections.",
    readPerm: "maintenance.read", writePerm: "maintenance.write",
    select: "id, kind, description, status, service_date, parts_cost_cents, labour_cost_cents, vehicles(registration_no)",
    order: { column: "service_date", ascending: false },
    search: ["description", "supplier"],
    defaults: { kind: "service", status: "scheduled" },
    fields: async (ctx) => [
      { name: "vehicle_id", label: "Vehicle", type: "select", required: true, options: await vehicleOptions(ctx) },
      { name: "kind", label: "Type", type: "select", required: true, options: opt(["service", "repair", "inspection", "other"]) },
      { name: "description", label: "Description", required: true, wide: true },
      { name: "status", label: "Status", type: "select", required: true, options: opt(["scheduled", "in_progress", "completed", "cancelled"]) },
      { name: "service_date", label: "Date", type: "date" },
      { name: "odometer_km", label: "Odometer at service (km)", type: "number", step: "0.1" },
      { name: "parts_cost", label: "Parts cost (R)", type: "money" },
      { name: "labour_cost", label: "Labour cost (R)", type: "money" },
      { name: "supplier", label: "Supplier / workshop" },
      { name: "next_service_km", label: "Next service at (km)", type: "number", step: "0.1" },
      { name: "next_service_date", label: "Next service date", type: "date" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
    line: (r) => ({
      title: `${(r.vehicles as { registration_no: string } | null)?.registration_no ?? "Vehicle"}: ${r.description}`,
      subtitle: `${r.kind}${r.service_date ? ` · ${formatDate(r.service_date)}` : ""}`,
      right: formatZar((r.parts_cost_cents ?? 0) + (r.labour_cost_cents ?? 0)),
      badge: { text: String(r.status).replace(/_/g, " "), tone: STATUS_TONE[r.status] ?? "neutral" },
    }),
    afterSave: bumpOdometer,
    extra: async (ctx) => {
      const { data } = await ctx.supabase
        .from("maintenance_records")
        .select("vehicle_id, service_date, next_service_km, next_service_date, vehicles(registration_no, odometer_km)")
        .eq("status", "completed")
        .order("service_date", { ascending: false });
      const latest = new Map<string, Row>();
      for (const r of data ?? []) if (!latest.has(r.vehicle_id as string)) latest.set(r.vehicle_id as string, r);
      const alerts = maintenanceAlerts(
        [...latest.values()].map((r) => {
          const v = r.vehicles as { registration_no: string; odometer_km: number } | null;
          return { vehicle_id: r.vehicle_id, registration_no: v?.registration_no ?? "", odometer_km: Number(v?.odometer_km ?? 0), next_service_km: r.next_service_km === null ? null : Number(r.next_service_km), next_service_date: r.next_service_date };
        }),
        today(),
      );
      if (alerts.length === 0) return null;
      return (
        <div className="mb-4 rounded-2xl border p-4 text-sm" style={{ borderColor: "var(--border)" }}>
          <p className="mb-2 font-medium">Maintenance alerts</p>
          <ul className="space-y-1">
            {alerts.map((a, i) => (
              <li key={i} style={{ color: a.overdue ? "#d70015" : "#b36b00" }}>
                {a.registration_no}: {a.message}
              </li>
            ))}
          </ul>
        </div>
      );
    },
  },
  expenses: {
    key: "expenses", table: "expenses", path: "/expenses", singular: "expense", title: "Fuel & Expenses", subtitle: "Operating costs.",
    readPerm: "expenses.read", writePerm: "expenses.write",
    tabs: [{ href: "/expenses", label: "Expenses" }, { href: "/expenses/fuel", label: "Fuel" }],
    select: "id, category, description, amount_cents, expense_date, supplier, vehicles(registration_no), jobs(number)",
    order: { column: "expense_date", ascending: false },
    search: ["description", "supplier"],
    defaults: { category: "other", expense_date: today() },
    fields: async (ctx) => [
      { name: "category", label: "Category", type: "select", required: true, options: opt(["fuel", "tolls", "repairs", "tyres", "parts", "driver", "accommodation", "loading", "insurance", "licensing", "other"]) },
      { name: "description", label: "Description", required: true },
      { name: "amount", label: "Amount (R)", type: "money", required: true },
      { name: "expense_date", label: "Date", type: "date", required: true },
      { name: "supplier", label: "Supplier" },
      { name: "payment_method", label: "Payment method", type: "select", options: opt(["cash", "card", "eft", "account", "other"]) },
      { name: "vehicle_id", label: "Vehicle", type: "select", options: await vehicleOptions(ctx) },
      { name: "job_id", label: "Job", type: "select", options: await jobOptions(ctx) },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
    line: (r) => ({
      title: r.description,
      subtitle: [r.category, formatDate(r.expense_date), r.supplier, (r.vehicles as { registration_no: string } | null)?.registration_no, (r.jobs as { number: string } | null)?.number].filter(Boolean).join(" · "),
      right: formatZar(r.amount_cents),
    }),
  },
  fuel: {
    key: "fuel", table: "fuel_records", path: "/expenses/fuel", singular: "fuel record", title: "Fuel", subtitle: "Fills, consumption (L/100 km) and cost per km.",
    readPerm: "fuel.read", writePerm: "fuel.write",
    tabs: [{ href: "/expenses", label: "Expenses" }, { href: "/expenses/fuel", label: "Fuel" }],
    select: "id, vehicle_id, fuel_date, litres, total_cents, station, odometer_km, full_tank, vehicles(registration_no)",
    order: { column: "fuel_date", ascending: false },
    search: ["station"],
    defaults: { fuel_date: today(), full_tank: true },
    fields: async (ctx) => [
      { name: "vehicle_id", label: "Vehicle", type: "select", required: true, options: await vehicleOptions(ctx) },
      { name: "fuel_date", label: "Date", type: "date", required: true },
      { name: "litres", label: "Litres", type: "number", step: "0.01", required: true },
      { name: "total", label: "Total paid (R)", type: "money", required: true },
      { name: "station", label: "Fuel station" },
      { name: "odometer_km", label: "Odometer (km)", type: "number", step: "0.1", required: true },
      { name: "full_tank", label: "Filled the tank completely", type: "checkbox", help: "Consumption is only calculated between full-tank fills." },
    ],
    enrich: (rows) => {
      const stats = fuelStatsByRecord(
        rows.map((r) => ({ id: r.id, vehicle_id: r.vehicle_id, fuel_date: r.fuel_date, litres: Number(r.litres), total_cents: Number(r.total_cents), odometer_km: Number(r.odometer_km), full_tank: Boolean(r.full_tank) }) as FuelRecord),
      );
      return rows.map((r) => ({ ...r, _stats: stats.get(r.id) ?? null }));
    },
    line: (r) => {
      const s = r._stats as { litresPer100km: number; costPerKmCents: number } | null;
      return {
        title: `${(r.vehicles as { registration_no: string } | null)?.registration_no ?? "Vehicle"} · ${r.litres} L${r.station ? ` · ${r.station}` : ""}`,
        subtitle: `${formatDate(r.fuel_date)} · ${Number(r.odometer_km).toLocaleString("en-ZA")} km${s ? ` · ${s.litresPer100km.toFixed(1)} L/100 km · ${formatZar(Math.round(s.costPerKmCents))}/km` : r.full_tank ? " · no earlier full fill to compare" : " · partial fill"}`,
        right: formatZar(r.total_cents),
      };
    },
    afterSave: bumpOdometer,
  },
};
export const RESOURCE_KEYS = Object.keys(RESOURCES);

export function ResourceBadge({ text, tone }: { text: string; tone: Tone }) {
  return <Badge tone={tone}>{text}</Badge>;
}
