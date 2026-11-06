import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, StatusBadge, useTable } from "@/components/kit";
import { meta } from "@/lib/meta";
export const Route = createFileRoute("/_authenticated/workflows")({ head: meta("Workflow Builder", "Banking workflows executed server-side."), component: P });
function P() {
  const q = useTable("workflows");
  return (<><PageHeader title="Workflow Builder" desc="Predefined banking workflows. The visual editor comes next." />
    <div className="space-y-4">{q.data?.map((w) => (
      <Panel key={w.id} title={w.name} action={<StatusBadge value={w.status} />}>
        <p className="mb-3 text-sm text-muted-foreground">{w.description}</p>
        <div className="flex flex-wrap items-center gap-1.5">{(w.nodes as string[]).map((n, i, a) => (
          <span key={i} className="flex items-center gap-1.5"><span className="rounded-md border bg-background px-2 py-1 font-mono text-[11px]">{n}</span>{i < a.length - 1 && <span className="text-muted-foreground">→</span>}</span>))}</div>
      </Panel>))}</div></>);
}
