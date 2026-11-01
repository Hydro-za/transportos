import Link from "next/link";
import { z } from "zod";
import { requireAccess } from "@/server/auth/session";
import { Card, PageHeader, SubmitButton, ghostButtonClass, ghostButtonStyle } from "@/components/ui";
import { EntityForm } from "@/components/entity-form";
import { JOB_FIELDS } from "../fields";
import { createJob } from "../actions";

export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const ctx = await requireAccess("jobs.write");
  const { customer } = await searchParams;
  const customerId = z.string().uuid().safeParse(customer);
  const back = (
    <Link href="/jobs" className={ghostButtonClass} style={ghostButtonStyle}>
      Back
    </Link>
  );

  if (!customerId.success) {
    const { data: customers } = await ctx.supabase.from("customers").select("id, name").eq("status", "active").order("name");
    return (
      <div>
        <PageHeader title="New job" subtitle="Step 1: choose the customer." action={back} />
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
              You need a customer first. <Link href="/customers/new" style={{ color: "var(--accent)" }}>Add a customer</Link>
            </p>
          )}
        </Card>
      </div>
    );
  }
  const { data: c } = await ctx.supabase.from("customers").select("id, name, collection_address, delivery_address").eq("id", customerId.data).maybeSingle();
  if (!c) return <PageHeader title="Customer not found" action={back} />;
  return (
    <div>
      <PageHeader title={`New job for ${c.name}`} subtitle="Step 2: job details." action={back} />
      <Card>
        <EntityForm
          fields={JOB_FIELDS}
          action={createJob}
          hidden={{ customer_id: c.id }}
          submitLabel="Create job"
          initial={{ collection_address: c.collection_address, delivery_address: c.delivery_address }}
        />
      </Card>
    </div>
  );
}
