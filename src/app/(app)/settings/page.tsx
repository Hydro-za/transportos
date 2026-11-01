import { requireAccess, getBusinessSettings } from "@/server/auth/session";
import { Card, Notice, PageHeader } from "@/components/ui";
import { EntityForm } from "@/components/entity-form";
import { SETTINGS_FIELDS } from "./fields";
import { saveSettings } from "./actions";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const ctx = await requireAccess("settings.update");
  const { saved } = await searchParams;
  const s = await getBusinessSettings(ctx);
  return (
    <div>
      <PageHeader title="Settings" subtitle="Business details and defaults used on quotations and invoices." />
      {saved ? <Notice kind="info">Settings saved.</Notice> : null}
      <Card>
        <EntityForm
          fields={SETTINGS_FIELDS}
          action={saveSettings}
          submitLabel="Save settings"
          initial={{
            name: s.name,
            registration_no: s.registration_no,
            vat_no: s.vat_no,
            phone: s.phone,
            email: s.email,
            address: s.address,
            vat_rate_pct: s.vatRatePct,
            quotation_validity_days: s.quotationValidityDays,
            payment_terms: s.paymentTerms,
            conditions: s.conditions,
            bank_details: s.bankDetails,
          }}
        />
      </Card>
    </div>
  );
}
