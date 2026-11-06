import { createFileRoute } from "@tanstack/react-router";
import { DataTable, PageHeader, StatusBadge, dt, useTable } from "@/components/kit";
import { meta } from "@/lib/meta";
export const Route = createFileRoute("/_authenticated/conversations")({ head: meta("Conversation History", "Past voice sessions."), component: P });
function P() {
  const q = useTable("voice_sessions", "started_at");
  return (<><PageHeader title="Conversation History" />
    <DataTable loading={q.isLoading} rows={q.data} cols={[
      { key: "id", label: "Session", mono: true, render: (r) => r.id.slice(0, 8) }, { key: "customer_id", label: "Customer", mono: true },
      { key: "language", label: "Language" }, { key: "workflow", label: "Workflow" }, { key: "outcome", label: "Outcome" },
      { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
      { key: "avg_latency_ms", label: "Latency", render: (r) => (r.avg_latency_ms ? `${r.avg_latency_ms} ms` : "—") },
      { key: "started_at", label: "Started", render: (r) => dt(r.started_at) }]} /></>);
}
