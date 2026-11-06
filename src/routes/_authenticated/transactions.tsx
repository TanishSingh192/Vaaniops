import { createFileRoute } from "@tanstack/react-router";
import { DataTable, PageHeader, StatusBadge, dt, inr, useTable } from "@/components/kit";
import { meta } from "@/lib/meta";
export const Route = createFileRoute("/_authenticated/transactions")({ head: meta("Transaction Intelligence", "UPI and card transactions."), component: P });
function P() {
  const q = useTable("transactions", "occurred_at");
  return (<><PageHeader title="Transaction Intelligence" desc="Simulated banking ledger." />
    <DataTable loading={q.isLoading} rows={q.data} cols={[
      { key: "id", label: "Transaction", mono: true }, { key: "upi_reference", label: "UPI ref", mono: true },
      { key: "customer_id", label: "Customer", mono: true }, { key: "merchant", label: "Merchant" },
      { key: "amount", label: "Amount", render: (r) => inr(r.amount) }, { key: "payment_method", label: "Method" },
      { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
      { key: "reversal_status", label: "Reversal" }, { key: "occurred_at", label: "When", render: (r) => dt(r.occurred_at) }]} /></>);
}
