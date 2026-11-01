import Link from "next/link";
import { requireAccess } from "@/server/auth/session";
import { Card, PageHeader, ghostButtonClass, ghostButtonStyle } from "@/components/ui";
import { EntityForm } from "@/components/entity-form";
import { CUSTOMER_FIELDS } from "../fields";
import { createCustomer } from "../actions";

export default async function NewCustomerPage() {
  await requireAccess("customers.write");
  return (
    <div>
      <PageHeader
        title="New customer"
        action={
          <Link href="/customers" className={ghostButtonClass} style={ghostButtonStyle}>
            Back
          </Link>
        }
      />
      <Card>
        <EntityForm fields={CUSTOMER_FIELDS} action={createCustomer} initial={{ payment_terms_days: 30, status: "active" }} submitLabel="Save customer" />
      </Card>
    </div>
  );
}
