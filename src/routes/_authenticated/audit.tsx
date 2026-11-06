import { createFileRoute } from "@tanstack/react-router";
import { DataTable, PageHeader, dt, useTable } from "@/components/kit";
import { meta } from "@/lib/meta";
export const Route = createFileRoute("/_authenticated/audit")({ head: meta("Audit & Compliance", "Append-only audit trail."), component: P });
function P() {
  const q = useTable("audit_logs", "created_at"); const t = useTable("tool_executions", "created_at");
  return (<><PageHeader title="Audit & Compliance" desc="Audit entries cannot be edited or deleted." />
    <DataTable loading={q.isLoading} rows={q.data} cols={[{ key: "created_at", label: "When", render: (r) => dt(r.created_at) }, { key: "actor", label: "Actor", mono: true, render: (r) => r.actor.slice(0, 8) }, { key: "action", label: "Action", mono: true }, { key: "entity", label: "Entity" }, { key: "entity_id", label: "ID", mono: true }]} />
    <h2 className="mb-2 mt-6 text-[13px] font-medium">Tool executions</h2>
    <DataTable loading={t.isLoading} rows={t.data} cols={[{ key: "created_at", label: "When", render: (r) => dt(r.created_at) }, { key: "tool_name", label: "Tool", mono: true }, { key: "status", label: "Status" }, { key: "latency_ms", label: "Latency", render: (r) => `${r.latency_ms ?? "—"} ms` }, { key: "arguments", label: "Args", mono: true, render: (r) => JSON.stringify(r.arguments) }]} /></>);
}
