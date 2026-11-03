export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // Vercel functions accept request bodies up to 4.5 MB
export const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const ENTITY_TYPES = ["general", "job", "vehicle", "trailer", "driver", "customer", "invoice"] as const;
export const CATEGORIES: { value: string; label: string }[] = [
  { value: "pod", label: "Proof of delivery" },
  { value: "licence", label: "Licence / permit" },
  { value: "insurance", label: "Insurance" },
  { value: "registration", label: "Vehicle registration" },
  { value: "roadworthy", label: "Roadworthy" },
  { value: "contract", label: "Contract" },
  { value: "invoice", label: "Invoice / receipt" },
  { value: "photo", label: "Photo" },
  { value: "other", label: "Other" },
];

export function safeFileName(name: string): string {
  const cleaned = name.normalize("NFKD").replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "_").replace(/^\.+/, "");
  return (cleaned || "file").slice(-80);
}

/** Only same-site relative paths are allowed as redirect targets. */
export function safeReturnTo(v: unknown, fallback: string): string {
  return typeof v === "string" && /^\/[A-Za-z0-9_\-\/?=&.]*$/.test(v) && !v.startsWith("//") ? v : fallback;
}
