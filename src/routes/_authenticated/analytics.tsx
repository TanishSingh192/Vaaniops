import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Stat, useTable } from "@/components/kit";
import { meta } from "@/lib/meta";
export const Route = createFileRoute("/_authenticated/analytics")({ head: meta("Analytics", "Workflow and tool performance."), component: P });
function P() {
  const s = useTable("voice_sessions"); const t = useTable("tool_executions");
  const by = (k: "workflow" | "outcome") => Object.entries((s.data ?? []).reduce<Record<string, number>>((a, x) => { const v = x[k] ?? "—"; a[v] = (a[v] ?? 0) + 1; return a; }, {}));
  const tl = (t.data ?? []).filter((x) => x.latency_ms);
  return (<><PageHeader title="Analytics" desc="Computed from recorded sessions." />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {by("workflow").map(([k, v]) => <Stat key={k} label={`Workflow · ${k}`} value={v} />)}
      {by("outcome").map(([k, v]) => <Stat key={k} label={`Outcome · ${k}`} value={v} />)}
      <Stat label="Avg tool latency" value={tl.length ? `${Math.round(tl.reduce((a, x) => a + x.latency_ms!, 0) / tl.length)} ms` : "—"} />
    </div></>);
}
