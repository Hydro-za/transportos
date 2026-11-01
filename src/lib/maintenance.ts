export type LatestService = {
  vehicle_id: string;
  registration_no: string;
  odometer_km: number;
  next_service_km: number | null;
  next_service_date: string | null;
};

export type MaintenanceAlert = { vehicle_id: string; registration_no: string; message: string; overdue: boolean };

/** Alerts from each vehicle's latest completed service: due by date (within 30 days) or by odometer (within 1 000 km). */
export function maintenanceAlerts(rows: LatestService[], today: string, dateWindowDays = 30, kmWindow = 1000): MaintenanceAlert[] {
  const limit = new Date(today + "T00:00:00Z").getTime() + dateWindowDays * 86400000;
  const alerts: MaintenanceAlert[] = [];
  for (const r of rows) {
    if (r.next_service_date) {
      const due = new Date(r.next_service_date + "T00:00:00Z").getTime();
      if (due < new Date(today + "T00:00:00Z").getTime()) {
        alerts.push({ vehicle_id: r.vehicle_id, registration_no: r.registration_no, message: `Service overdue since ${r.next_service_date}`, overdue: true });
      } else if (due <= limit) {
        alerts.push({ vehicle_id: r.vehicle_id, registration_no: r.registration_no, message: `Service due ${r.next_service_date}`, overdue: false });
      }
    }
    if (r.next_service_km !== null) {
      if (r.odometer_km >= r.next_service_km) {
        alerts.push({ vehicle_id: r.vehicle_id, registration_no: r.registration_no, message: `Service overdue at ${r.next_service_km} km (now ${r.odometer_km} km)`, overdue: true });
      } else if (r.odometer_km >= r.next_service_km - kmWindow) {
        alerts.push({ vehicle_id: r.vehicle_id, registration_no: r.registration_no, message: `Service due at ${r.next_service_km} km (now ${r.odometer_km} km)`, overdue: false });
      }
    }
  }
  return alerts;
}

/** Expiring or expired document dates (licences, PDP, trailer licence) within the window. */
export function expiryAlerts(items: { label: string; date: string | null }[], today: string, windowDays = 60): { label: string; date: string; expired: boolean }[] {
  const t = new Date(today + "T00:00:00Z").getTime();
  const limit = t + windowDays * 86400000;
  const out: { label: string; date: string; expired: boolean }[] = [];
  for (const i of items) {
    if (!i.date) continue;
    const d = new Date(i.date + "T00:00:00Z").getTime();
    if (d < t) out.push({ label: i.label, date: i.date, expired: true });
    else if (d <= limit) out.push({ label: i.label, date: i.date, expired: false });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
