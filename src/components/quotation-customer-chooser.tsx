"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Plus, UserRound, X } from "lucide-react";
import { createCustomerForQuotation } from "@/app/(app)/customers/actions";

type Customer = { id: string; name: string };
export function QuotationCustomerChooser({ customers, canCreate }: { customers: Customer[]; canCreate: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState(customers[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({ name: "", contact_name: "", phone: "", email: "" });
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function continueWith(id = selected) {
    if (!id) return;
    router.push(`/quotations/new?customer=${encodeURIComponent(id)}`);
  }

  function saveCustomer() {
    setError("");
    startTransition(async () => {
      const result = await createCustomerForQuotation(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/quotations/new?customer=${encodeURIComponent(result.customer.id)}`);
    });
  }

  return (
    <section className="glass-panel rounded-3xl p-5 sm:p-7">
      <div className="mb-5 flex items-start gap-3">
        <div className="brand-icon"><UserRound size={19} /></div>
        <div>
          <h2 className="text-base font-semibold tracking-tight">Choose a customer</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Select an existing customer or add a new one without leaving this quotation.</p>
        </div>
      </div>
      {customers.length > 0 ? (
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium">Customer</label>
          <div className="relative">
            <select value={selected} onChange={(e) => setSelected(e.target.value)} className="app-input w-full appearance-none pr-10">
              <option value="">Choose a customer…</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
            </select>
            <ChevronDown size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
          </div>
        </div>
      ) : (
        <div className="mb-4 rounded-2xl border border-dashed p-4 text-sm" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>No active customers yet. Add your first customer below.</div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => continueWith()} disabled={!selected} className="primary-action" >Continue <Check size={16} /></button>
        {canCreate ? <button type="button" onClick={() => setOpen(true)} className="secondary-action"><Plus size={16} /> Quick add customer</button> : null}
      </div>
      {!canCreate ? <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>Your account does not have permission to create customers. Ask an administrator or use the Customers section.</p> : null}

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="quick-customer-title" className="glass-panel w-full max-w-lg rounded-t-[28px] p-5 shadow-2xl sm:rounded-[28px] sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--accent)" }}>Quick create</p><h2 id="quick-customer-title" className="mt-1 text-xl font-semibold tracking-tight">New customer</h2><p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>The customer will be saved and selected for this quotation.</p></div>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="icon-button"><X size={18} /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="field-label sm:col-span-2">Customer / company name *
                <input autoFocus className="app-input mt-1" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} placeholder="Business or customer name" />
              </label>
              <label className="field-label">Contact person
                <input className="app-input mt-1" value={values.contact_name} onChange={(e) => setValues({ ...values, contact_name: e.target.value })} />
              </label>
              <label className="field-label">Phone / WhatsApp
                <input type="tel" className="app-input mt-1" value={values.phone} onChange={(e) => setValues({ ...values, phone: e.target.value })} />
              </label>
              <label className="field-label sm:col-span-2">Email
                <input type="email" className="app-input mt-1" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />
              </label>
            </div>
            {error ? <p role="alert" className="mt-3 rounded-xl px-3 py-2 text-sm" style={{ color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 9%, transparent)" }}>{error}</p> : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setOpen(false)} className="secondary-action">Cancel</button>
              <button type="button" onClick={saveCustomer} disabled={pending || values.name.trim().length < 2} className="primary-action">{pending ? "Saving…" : "Save & use customer"} <Check size={16} /></button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
