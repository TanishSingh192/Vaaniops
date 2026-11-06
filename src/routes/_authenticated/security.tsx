import { createFileRoute } from "@tanstack/react-router";
import { DataTable, PageHeader, Panel, StatusBadge, dt, useTable } from "@/components/kit";
import { meta } from "@/lib/meta";
export const Route = createFileRoute("/_authenticated/security")({ head: meta("Security Center", "Security events and guardrails."), component: P });
function P() {
  const q = useTable("security_events", "created_at");
  return (<><PageHeader title="Security Center" />
    <Panel title="Active guardrails" className="mb-4"><ul className="grid gap-1.5 text-sm text-muted-foreground md:grid-cols-2">
      {["Tool allowlist enforced server-side", "Role checks independent of AI output", "High-risk tools require explicit confirmation", "Idempotency keys on dispute creation", "Append-only audit log", "API keys never sent to the browser"].map((g) => <li key={g} className="flex gap-2"><span className="text-success">●</span>{g}</li>)}
    </ul></Panel>
    <DataTable loading={q.isLoading} rows={q.data} cols={[{ key: "severity", label: "Severity", render: (r) => <StatusBadge value={r.severity} /> }, { key: "event", label: "Event" }, { key: "created_at", label: "When", render: (r) => dt(r.created_at) }]} /></>);
}
