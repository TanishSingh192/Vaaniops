import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { DataTable, DemoBanner, Panel, Stat, StatusBadge, dt, inr, useTable } from "@/components/kit";
import { meta } from "@/lib/meta";

const Bars3D = lazy(() => import("@/components/three/Charts3D").then((m) => ({ default: m.Bars3D })));
const Donut3D = lazy(() => import("@/components/three/Charts3D").then((m) => ({ default: m.Donut3D })));
const MorphScene = lazy(() => import("@/components/three/MorphScene"));
const Load = () => <div className="grid h-full place-items-center"><span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
function Three({ children }: { children: React.ReactNode }) {
  return <ClientOnly fallback={<Load />}><Suspense fallback={<Load />}>{children}</Suspense></ClientOnly>;
}

export const Route = createFileRoute("/_authenticated/overview")({
  head: meta("Overview", "Executive overview of voice operations."),
  component: Overview,
});


function Overview() {
  const s = useTable("voice_sessions", "started_at");
  const d = useTable("disputes", "created_at");
  const te = useTable("tool_executions", "created_at");
  const sec = useTable("security_events", "created_at");
  const sessions = s.data ?? [];
  const ok = sessions.filter((x) => x.status === "completed").length;
  const failed = sessions.filter((x) => x.status === "failed" || x.status === "escalated").length;
  const lat = sessions.filter((x) => x.avg_latency_ms).map((x) => x.avg_latency_ms!);
  const tools = te.data ?? [];
  const succ = tools.length ? Math.round((tools.filter((t) => t.status === "success").length / tools.length) * 100) : null;

  const lang = Object.entries(sessions.reduce<Record<string, number>>((a, x) => { const k = x.language ?? "unknown"; a[k] = (a[k] ?? 0) + 1; return a; }, {})).map(([name, value]) => ({ name, value }));
  const toolFreq = Object.entries(tools.reduce<Record<string, number>>((a, x) => { a[x.tool_name] = (a[x.tool_name] ?? 0) + 1; return a; }, {})).map(([name, n]) => ({ name, n }));

  return (
    <>
      <DemoBanner />
      <section className="animate-rise relative mb-5 overflow-hidden rounded-3xl border bg-card">
        <div className="absolute inset-0 [background:radial-gradient(70%_90%_at_85%_50%,color-mix(in_oklab,var(--primary)_25%,transparent),transparent_70%),radial-gradient(50%_70%_at_60%_100%,color-mix(in_oklab,var(--cyan)_20%,transparent),transparent_70%)]" />
        <div className="grid-bg absolute inset-0 opacity-40 [mask-image:linear-gradient(to_right,transparent,black)]" />
        <div className="relative grid items-center md:grid-cols-[1fr_320px]">
          <div className="p-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">Command center</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">Voice operations, <span className="text-shimmer">live.</span></h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">Every figure below is computed from live records. Drag the 3D charts to look around; hover a bar or slice for details.</p>
          </div>
          <div className="hidden h-56 md:block"><Three><MorphScene /></Three></div>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total voice sessions" value={sessions.length} />
        <Stat label="Active sessions" value={sessions.filter((x) => x.status === "active").length} />
        <Stat label="Completed workflows" value={ok} hint={`${failed} failed / escalated`} />
        <Stat label="Avg response latency" value={lat.length ? `${Math.round(lat.reduce((a, b) => a + b, 0) / lat.length)} ms` : "—"} />
        <Stat label="Tool success rate" value={succ === null ? "—" : `${succ}%`} hint={`${tools.length} executions`} />
        <Stat label="Disputes created" value={d.data?.length ?? 0} />
        <Stat label="Transactions investigated" value={new Set(tools.filter((t) => t.tool_name.includes("transaction")).map((t) => t.session_id)).size} />
        <Stat label="Languages seen" value={lang.length} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Tool execution frequency" className="lg:col-span-2">
          <div className="h-72 cursor-grab active:cursor-grabbing">
            {toolFreq.length ? <Three><Bars3D data={toolFreq} /></Three> : <Empty />}
          </div>
        </Panel>
        <Panel title="Language distribution">
          <div className="h-72">
            {lang.length ? <Three><Donut3D data={lang} /></Three> : <Empty />}
          </div>
        </Panel>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div><h2 className="mb-2 text-[13px] font-medium">Recent disputes</h2>
          <DataTable loading={d.isLoading} rows={d.data?.slice(0, 6)} cols={[{ key: "id", label: "ID", mono: true }, { key: "amount", label: "Amount", render: (r) => inr(r.amount) }, { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> }, { key: "created_at", label: "Created", render: (r) => dt(r.created_at) }]} />
        </div>
        <div><h2 className="mb-2 text-[13px] font-medium">Critical security events</h2>
          <DataTable loading={sec.isLoading} rows={sec.data?.slice(0, 6)} cols={[{ key: "severity", label: "Severity", render: (r) => <StatusBadge value={r.severity} /> }, { key: "event", label: "Event" }, { key: "created_at", label: "When", render: (r) => dt(r.created_at) }]} />
        </div>
      </div>
    </>
  );
}
function Empty() { return <div className="grid h-full place-items-center text-xs text-muted-foreground">No data yet — run a session in Live Operations.</div>; }
