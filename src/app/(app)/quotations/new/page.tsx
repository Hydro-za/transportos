import Link from "next/link";
import { z } from "zod";
import { requireAccess, getBusinessSettings } from "@/server/auth/session";
import { Card, PageHeader, ghostButtonClass, ghostButtonStyle } from "@/components/ui";
import { EntityForm } from "@/components/entity-form";
import { QuotationCustomerChooser } from "@/components/quotation-customer-chooser";
import { QUOTATION_FIELDS } from "../fields";
import { createQuotation } from "../actions";

export default async function NewQuotationPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const ctx = await requireAccess("quotations.write");
  const { customer } = await searchParams;
  const customerId = z.string().uuid().safeParse(customer);
  const back = <Link href="/quotations" className={ghostButtonClass} style={ghostButtonStyle}>Back</Link>;

  if (!customerId.success) {
    const { data: customers } = await ctx.supabase.from("customers").select("id, name").eq("status", "active").order("name").limit(500);
    return (
      <div className="page-enter">
        <PageHeader title="New quotation" subtitle="Start by selecting a customer. You can also add one in seconds." action={back} />
        <QuotationCustomerChooser customers={customers ?? []} canCreate={ctx.permissions.has("customers.write")} />
      </div>
    );
  }

  const { data: c } = await ctx.supabase.from("customers").select("id, name, collection_address, delivery_address, payment_terms_days").eq("id", customerId.data).eq("status", "active").maybeSingle();
  if (!c) return <PageHeader title="Customer not found" action={back} />;
  const s = await getBusinessSettings(ctx);
  const valid = new Date(Date.now() + s.quotationValidityDays * 86400000).toISOString().slice(0, 10);

  return (
    <div className="page-enter">
      <PageHeader title={`New quotation for ${c.name}`} subtitle="Transport details, freight pricing and terms." action={back} />
      <Card title="Quotation details">
        <EntityForm fields={QUOTATION_FIELDS} action={createQuotation} hidden={{ customer_id: c.id }} submitLabel="Save quotation" initial={{
          collection_address: c.collection_address,
          delivery_address: c.delivery_address,
          pricing_method: "fixed",
          vat_treatment: "standard",
          valid_until: valid,
          payment_terms: s.paymentTerms || `Payment within ${c.payment_terms_days} days of invoice date.`,
          conditions: s.conditions,
        }} />
      </Card>
    </div>
  );
}
