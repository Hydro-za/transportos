import { requireAccess } from "@/server/auth/session";
import { Card, Notice, PageHeader } from "@/components/ui";
import { UploadForm } from "@/components/upload-form";
import { DocumentList } from "@/components/document-list";
import { CATEGORIES } from "@/lib/documents";

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ category?: string; saved?: string; error?: string }> }) {
  const ctx = await requireAccess("documents.read");
  const { category, saved, error } = await searchParams;
  let q = ctx.supabase.from("documents").select("id, title, category, size_bytes, expiry_date, created_at, entity_type").order("created_at", { ascending: false }).limit(300);
  if (category && CATEGORIES.some((c) => c.value === category)) q = q.eq("category", category);
  const { data } = await q;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
  return (
    <div>
      <PageHeader title="Documents" subtitle="Licences, insurance, contracts and proof of delivery. Stored privately; links expire after one minute." />
      {error ? <Notice kind="error">{error}</Notice> : null}
      {saved ? <Notice kind="info">Saved.</Notice> : null}
      {ctx.permissions.has("documents.write") ? <div className="mb-4"><Card title="Upload a document"><UploadForm returnTo="/documents" /></Card></div> : null}
      <Card title="All documents">
        <DocumentList docs={data ?? []} returnTo="/documents" canDelete={ctx.permissions.has("documents.write")} today={today} />
      </Card>
    </div>
  );
}
