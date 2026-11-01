
export type FuelRecord = {
  id: string;
  vehicle_id: string;
  fuel_date: string;
  litres: number;
  total_cents: number;
  odometer_km: number;
  full_tank: boolean;
};

export type FuelStats = { km: number; litres: number; costCents: number; litresPer100km: number; costPerKmCents: number };

/**
 * Full-tank method: consumption is only calculated between two consecutive full-tank fills of the
 * same vehicle, using all litres added since the previous full tank. Partial fills before the
 * first full tank are not enough data, so no figure is produced for them.
 */
export function fuelStatsByRecord(records: FuelRecord[]): Map<string, FuelStats> {
  const out = new Map<string, FuelStats>();
  const byVehicle = new Map<string, FuelRecord[]>();
  for (const r of records) {
    const list = byVehicle.get(r.vehicle_id) ?? [];
    list.push(r);
    byVehicle.set(r.vehicle_id, list);
  }
  for (const list of byVehicle.values()) {
    list.sort((a, b) => (a.odometer_km - b.odometer_km) || a.fuel_date.localeCompare(b.fuel_date));
    let lastFullOdo: number | null = null;
    let litres = 0;
    let cost = 0;
    for (const r of list) {
      litres += r.litres;
      cost += r.total_cents;
      if (!r.full_tank) continue;
      if (lastFullOdo !== null && r.odometer_km > lastFullOdo) {
        const km = r.odometer_km - lastFullOdo;
        out.set(r.id, { km, litres, costCents: cost, litresPer100km: (litres / km) * 100, costPerKmCents: cost / km });
      }
      lastFullOdo = r.odometer_km;
      litres = 0;
      cost = 0;
    }
  }
  return out;
}
