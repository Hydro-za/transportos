import Link from "next/link";
import { z } from "zod";
import { requireAccess, getBusinessSettings } from "@/server/auth/session";
import { Card, PageHeader, SubmitButton, ghostButtonClass, ghostButtonStyle } from "@/components/ui";
import { EntityForm } from "@/components/entity-form";
import { QUOTATION_FIELDS } from "../fields";
import { createQuotation } from "../actions";

export default async function NewQuotationPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const ctx = await requireAccess("quotations.write");
  const { customer } = await searchParams;
  const customerId = z.string().uuid().safeParse(customer);

  const back = (
    <Link href="/quotations" className={ghostButtonClass} style={ghostButtonStyle}>
      Back
    </Link>
  );

  if (!customerId.success) {
    const { data: customers } = await ctx.supabase.from("customers").select("id, name").eq("status", "active").order("name");
    return (
      <div>
        <PageHeader title="New quotation" subtitle="Step 1: choose the customer." action={back} />
        <Card>
          {customers && customers.length > 0 ? (
            <form className="space-y-4">
              <label className="block text-sm font-medium">
                Customer
                <select name="customer" required className="mt-1 block w-full rounded-xl border bg-transparent px-3 py-2.5 text-base" style={{ borderColor: "var(--border)" }}>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <SubmitButton>Continue</SubmitButton>
            </form>
          ) : (
            <p className="text-sm">
              You need a customer first.{" "}
              <Link href="/customers/new" style={{ color: "var(--accent)" }}>Add a customer</Link>
            </p>
          )}
        </Card>
      </div>
    );
  }

  const { data: c } = await ctx.supabase.from("customers").select("id, name, collection_address, delivery_address, payment_terms_days").eq("id", customerId.data).maybeSingle();
  if (!c) {
    return <PageHeader title="Customer not found" action={back} />;
  }
  const s = await getBusinessSettings(ctx);
  const valid = new Date(Date.now() + s.quotationValidityDays * 86400000).toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader title={`New quotation for ${c.name}`} subtitle="Step 2: transport, freight, pricing and terms." action={back} />
      <Card>
        <EntityForm
          fields={QUOTATION_FIELDS}
          action={createQuotation}
          hidden={{ customer_id: c.id }}
          submitLabel="Save quotation"
          initial={{
            collection_address: c.collection_address,
            delivery_address: c.delivery_address,
            pricing_method: "fixed",
            vat_treatment: "standard",
            valid_until: valid,
            payment_terms: s.paymentTerms || `Payment within ${c.payment_terms_days} days of invoice date.`,
            conditions: s.conditions,
          }}
        />
      </Card>
    </div>
  );
}
