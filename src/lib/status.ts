export type Tone = "neutral" | "good" | "warn" | "bad";

export const QUOTE_TONE: Record<string, Tone> = {
  draft: "neutral", sent: "warn", viewed: "warn", accepted: "good", converted: "good", rejected: "bad", expired: "bad",
};

export const JOB_STATUSES: { value: string; label: string }[] = [
  { value: "new", label: "New" },
  { value: "awaiting_allocation", label: "Awaiting allocation" },
  { value: "scheduled", label: "Scheduled" },
  { value: "ready_for_dispatch", label: "Ready for dispatch" },
  { value: "dispatched", label: "Dispatched" },
  { value: "in_transit", label: "In transit" },
  { value: "at_collection", label: "At collection" },
  { value: "collected", label: "Collected" },
  { value: "at_delivery", label: "At delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "awaiting_pod", label: "Awaiting proof of delivery" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "on_hold", label: "On hold" },
];
export const JOB_LABEL: Record<string, string> = Object.fromEntries(JOB_STATUSES.map((s) => [s.value, s.label]));

export const JOB_TONE: Record<string, Tone> = {
  new: "neutral", awaiting_allocation: "warn", scheduled: "neutral", ready_for_dispatch: "neutral",
  dispatched: "warn", in_transit: "warn", at_collection: "warn", collected: "warn", at_delivery: "warn",
  delivered: "good", awaiting_pod: "warn", completed: "good", cancelled: "bad", on_hold: "bad",
};

export const TRIP_TONE: Record<string, Tone> = { planned: "neutral", dispatched: "warn", in_transit: "warn", completed: "good", cancelled: "bad" };
export const INVOICE_TONE: Record<string, Tone> = { draft: "neutral", sent: "warn", partially_paid: "warn", paid: "good", overdue: "bad", cancelled: "bad" };
