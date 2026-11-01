import type { FieldDef } from "@/lib/forms";
import { moneyOrNull, numberOrNull } from "@/lib/forms";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Turns submitted form values into a database row using the field definitions.
 * Money field `x` is stored in column `x_cents`. Numbers must be >= 0. Selects must match an option.
 */
export function parseFields(fields: FieldDef[], values: Record<string, string>): { row?: Record<string, unknown>; error?: string } {
  const row: Record<string, unknown> = {};
  for (const f of fields) {
    const raw = (values[f.name] ?? "").trim();
    const type = f.type ?? "text";

    if (type === "checkbox") {
      row[f.name] = raw === "on" || raw === "true";
      continue;
    }
    if (raw === "") {
      if (f.required) return { error: `${f.label} is required.` };
      row[type === "money" ? `${f.name}_cents` : f.name] = null;
      continue;
    }
    switch (type) {
      case "money": {
        const c = moneyOrNull(raw);
        if (c === undefined || c === null) return { error: `${f.label}: enter an amount like 1250.00.` };
        row[`${f.name}_cents`] = c;
        break;
      }
      case "number": {
        const n = numberOrNull(raw);
        if (n === null) return { error: `${f.label}: enter a number.` };
        if (n < 0) return { error: `${f.label} cannot be negative.` };
        if (f.step === "1" && !Number.isInteger(n)) return { error: `${f.label} must be a whole number.` };
        row[f.name] = n;
        break;
      }
      case "date":
        if (!DATE_RE.test(raw) || Number.isNaN(new Date(raw).getTime())) return { error: `${f.label}: enter a valid date.` };
        row[f.name] = raw;
        break;
      case "email":
        if (!EMAIL_RE.test(raw) || raw.length > 254) return { error: `${f.label}: enter a valid email.` };
        row[f.name] = raw;
        break;
      case "select":
        if (!f.options?.some((o) => o.value === raw)) return { error: `${f.label}: choose a valid option.` };
        row[f.name] = raw;
        break;
      default:
        if (raw.length > 2000) return { error: `${f.label} is too long.` };
        row[f.name] = raw;
    }
  }
  return { row };
}
