import { uploadDocument } from "@/app/(app)/documents/actions";
import { CATEGORIES } from "@/lib/documents";
import { linkButtonClass, linkButtonStyle } from "@/components/ui";

const cls = "mt-1 block w-full rounded-xl border bg-transparent px-3 py-2 text-sm";
const bd = { borderColor: "var(--border)" } as const;

export function UploadForm({ entityType = "general", entityId = "", defaultCategory = "other", returnTo, label = "Upload" }: { entityType?: string; entityId?: string; defaultCategory?: string; returnTo: string; label?: string }) {
  return (
    <form action={uploadDocument} encType="multipart/form-data" className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="entity_type" value={entityType} />
      <input type="hidden" name="entity_id" value={entityId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <label className="text-xs sm:col-span-2">File (PDF, JPG, PNG or WebP, up to 4 MB)
        <input type="file" name="file" required accept="application/pdf,image/jpeg,image/png,image/webp" className={cls} style={bd} />
      </label>
      <label className="text-xs">Title<input name="title" maxLength={200} className={cls} style={bd} /></label>
      <label className="text-xs">Type
        <select name="category" defaultValue={defaultCategory} className={cls} style={bd}>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
      </label>
      <label className="text-xs">Expiry date (optional)<input type="date" name="expiry_date" className={cls} style={bd} /></label>
      <div className="flex items-end"><button className={linkButtonClass} style={linkButtonStyle}>{label}</button></div>
    </form>
  );
}
