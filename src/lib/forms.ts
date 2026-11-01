import { parseRandsToCents } from "@/lib/money";

export type FormState = { error?: string; values?: Record<string, string> } | null;

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "date" | "number" | "textarea" | "select" | "money" | "checkbox" | "datetime";
  options?: { value: string; label: string }[];
  required?: boolean;
  step?: string;
  placeholder?: string;
  wide?: boolean;
  help?: string;
};

/** Reads trimmed string values for the named fields (checkboxes become "on"/""). */
export function readValues(fd: FormData, names: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const n of names) {
    const v = fd.get(n);
    out[n] = typeof v === "string" ? v.trim() : "";
  }
  return out;
}

export const nullIfEmpty = (v: string | undefined) => (v && v.trim() !== "" ? v.trim() : null);

export function numberOrNull(v: string | undefined): number | null {
  if (!v || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Money text -> cents. Empty -> null. Invalid -> undefined (caller reports the error). */
export function moneyOrNull(v: string | undefined): number | null | undefined {
  if (!v || v.trim() === "") return null;
  const c = parseRandsToCents(v);
  return c === null ? undefined : c;
}

/** Converts a datetime-local value (Africa/Johannesburg, UTC+2, no DST) to an ISO timestamp. */
export function sastToIso(v: string | undefined): string | null {
  if (!v) return null;
  const d = new Date(v + ":00+02:00");
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d.length <= 10 ? d + "T00:00:00+02:00" : d);
  return dt.toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg" });
}

export function formatDateTime(d: string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "short", timeStyle: "short" });
}
