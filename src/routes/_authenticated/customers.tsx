import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { DataTable, PageHeader, StatusBadge, inr, useTable } from "@/components/kit";
import { meta } from "@/lib/meta";
export const Route = createFileRoute("/_authenticated/customers")({ head: meta("Customer Management", "Customer profiles and cards."), component: P });
function P() {
  const q = useTable("customers"); const cards = useTable("cards");
  return (<><PageHeader title="Customer Management" desc="All PII is masked."><Button asChild size="sm"><Link to="/import">Import CSV</Link></Button></PageHeader>
    <DataTable loading={q.isLoading} rows={q.data} cols={[
      { key: "id", label: "Customer", mono: true }, { key: "name", label: "Name" }, { key: "masked_account", label: "Account", mono: true },
      { key: "balance", label: "Balance", render: (r) => <span className="font-mono text-xs">{inr(r.balance)}</span> },
      { key: "is_demo", label: "Source", render: (r) => <StatusBadge value={r.is_demo ? "demo" : "imported"} /> },
      { key: "phone", label: "Phone", mono: true }, { key: "preferred_language", label: "Language" },
      { key: "verification_status", label: "Verification", render: (r) => <StatusBadge value={r.verification_status} /> },
      { key: "account_status", label: "Account", render: (r) => <StatusBadge value={r.account_status} /> },
      { key: "cards", label: "Cards", render: (r) => <div className="flex flex-wrap gap-1">{cards.data?.filter((c) => c.customer_id === r.id).map((c) => <span key={c.id} className="font-mono text-xs">{c.card_type} ••{c.last_four} <StatusBadge value={c.status} /></span>)}</div> }]} /></>);
}
