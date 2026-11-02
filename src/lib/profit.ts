export type JobProfitRow = { id: string; number: string; title: string; customer: string; invoicedCents: number; costCents: number; profitCents: number; marginPct: number | null };

/** Revenue = invoice subtotals after discount (excl. VAT, cancelled/draft excluded); cost = expenses linked to the job. */
export function jobProfit(
  jobs: { id: string; number: string; title: string; customer: string }[],
  invoices: { job_id: string | null; subtotal_cents: number; discount_cents: number; status: string }[],
  expenses: { job_id: string | null; amount_cents: number }[],
): JobProfitRow[] {
  const rev = new Map<string, number>();
  for (const i of invoices) {
    if (!i.job_id || i.status === "cancelled" || i.status === "draft") continue;
    rev.set(i.job_id, (rev.get(i.job_id) ?? 0) + Number(i.subtotal_cents) - Number(i.discount_cents));
  }
  const cost = new Map<string, number>();
  for (const e of expenses) if (e.job_id) cost.set(e.job_id, (cost.get(e.job_id) ?? 0) + Number(e.amount_cents));
  return jobs.map((j) => {
    const invoicedCents = rev.get(j.id) ?? 0;
    const costCents = cost.get(j.id) ?? 0;
    return { ...j, invoicedCents, costCents, profitCents: invoicedCents - costCents, marginPct: invoicedCents > 0 ? ((invoicedCents - costCents) / invoicedCents) * 100 : null };
  });
}
