import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { GripVertical, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel, StatusBadge, dt, useTable } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { FLOW_NODES, saveAgentVersion } from "@/lib/agent-versions.functions";
import { triageIssue, type Triage } from "@/lib/triage.functions";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/_authenticated/agents")({ head: meta("AI Agent Studio", "Build, version and test VaaniOps agent flows."), component: P });

const DEFAULT = ["detect_intent", "get_customer_profile", "verify_customer", "search_transactions", "check_dispute_eligibility", "create_dispute_ticket", "reply"];

function P() {
  const agents = useTable("agents"); const qc = useQueryClient();
  const [agentId, setAgentId] = useState("");
  useEffect(() => { if (!agentId && agents.data?.[0]) setAgentId(agents.data[0].id); }, [agents.data, agentId]);
  const agent = agents.data?.find((a) => a.id === agentId);
  const versions = useQuery({ enabled: !!agentId, queryKey: ["agent_versions", agentId], queryFn: async () => (await supabase.from("agent_versions").select("*").eq("agent_id", agentId).order("version", { ascending: false })).data ?? [] });
  const [flow, setFlow] = useState<string[]>(DEFAULT);
  useEffect(() => { const v = versions.data?.[0]; setFlow(v ? (v.nodes as string[]) : DEFAULT); }, [versions.data]);
  const [drag, setDrag] = useState<{ from: "palette" | "flow"; key: string; idx?: number } | null>(null);
  const [notes, setNotes] = useState("");
  const save = useServerFn(saveAgentVersion);

  function dropAt(i: number) {
    if (!drag) return;
    const f = [...flow];
    if (drag.from === "flow" && drag.idx !== undefined) { f.splice(drag.idx, 1); if (drag.idx < i) i--; }
    f.splice(i, 0, drag.key); setFlow(f); setDrag(null);
  }

  return (<>
    <PageHeader title="AI Agent Studio" desc="Drag steps into a flow, save it as a new version, and test it.">
      <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
        {agents.data?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
    </PageHeader>
    {agent && <div className="mb-4 flex items-center gap-2 text-sm"><StatusBadge value={agent.status} /><span className="font-mono text-xs text-muted-foreground">current v{agent.version}</span><span className="text-muted-foreground">{agent.description}</span></div>}
    <div className="grid gap-4 lg:grid-cols-[200px_1fr_340px]">
      <Panel title="Steps">
        <div className="space-y-1.5">{FLOW_NODES.map((n) => (
          <div key={n} draggable onDragStart={() => setDrag({ from: "palette", key: n })} onDoubleClick={() => setFlow([...flow, n])}
            className="cursor-grab rounded border bg-background px-2 py-1.5 font-mono text-[11px] hover:border-primary">{n}</div>))}</div>
        <p className="mt-3 text-[11px] text-muted-foreground">Drag into the flow, or double-click to append.</p>
      </Panel>
      <Panel title="Flow" action={<Button size="sm" variant="ghost" onClick={() => setFlow([])}>Clear</Button>}>
        <ol className="space-y-1" onDragOver={(e) => e.preventDefault()} onDrop={() => dropAt(flow.length)}>
          {flow.map((n, i) => (
            <li key={i} draggable onDragStart={() => setDrag({ from: "flow", key: n, idx: i })} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.stopPropagation(); dropAt(i); }}
              className="flex items-center gap-2 rounded-md border bg-background px-2 py-2 text-sm">
              <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" /><span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
              <span className="flex-1 font-mono text-xs">{n}</span>
              {n === "freeze_virtual_card" && <StatusBadge value="high" />}
              <button aria-label={`Remove ${n}`} onClick={() => setFlow(flow.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
            </li>))}
          <li className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">Drop a step here</li>
        </ol>
        <div className="mt-3 flex gap-2">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What changed in this version?" />
          <Button disabled={!agentId || !flow.length} onClick={async () => {
            try { const r = await save({ data: { agentId, nodes: flow, notes } }); toast.success(`Saved v${r.version}`); setNotes(""); qc.invalidateQueries(); }
            catch (e) { toast.error((e as Error).message); }
          }}>Save version</Button>
        </div>
        <h3 className="mt-5 text-xs font-medium">Version history</h3>
        <ul className="mt-2 space-y-1 text-xs">{versions.data?.map((v) => (
          <li key={v.id} className="flex items-center gap-2 rounded border px-2 py-1.5">
            <span className="font-mono">v{v.version}</span><span className="flex-1 truncate text-muted-foreground">{v.notes || `${(v.nodes as string[]).length} steps`}</span>
            <span className="text-muted-foreground">{dt(v.created_at)}</span>
            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setFlow(v.nodes as string[])}>Load</Button>
          </li>))}
          {!versions.data?.length && <li className="text-muted-foreground">No saved versions yet.</li>}</ul>
      </Panel>
      <TestConsole flow={flow} />
    </div>
  </>);
}

function TestConsole({ flow }: { flow: string[] }) {
  const fn = useServerFn(triageIssue);
  const [text, setText] = useState("Mere UPI se 4,000 rupaye kat gaye, lekin merchant ko payment nahi mila. Please check karo.");
  const [busy, setBusy] = useState(false);
  const [trace, setTrace] = useState<{ step: string; out: string; stop?: boolean }[]>([]);
  async function run() {
    setBusy(true); setTrace([]);
    try {
      let t: Triage | null = null; const out: { step: string; out: string; stop?: boolean }[] = [];
      for (const s of flow) {
        if (s === "detect_intent") { t = (await fn({ data: { transcript: text } })).triage; out.push({ step: s, out: `${t.intent} (${Math.round(t.confidence * 100)}%), ${t.language}, ₹${t.entities.amount_inr ?? "—"}` }); continue; }
        if (!t && s !== "reply" && s !== "escalate_to_human") { out.push({ step: s, out: "Skipped — no intent yet. Put detect_intent first.", stop: true }); break; }
        if (s === "freeze_virtual_card" && !flow.slice(0, flow.indexOf(s)).includes("confirm_with_customer")) { out.push({ step: s, out: "Blocked — needs confirm_with_customer before it.", stop: true }); break; }
        if (s === "reply") { out.push({ step: s, out: t?.reply_to_customer ?? "Maaf kijiye, kya aap thoda detail mein bata sakte hain?" }); continue; }
        if (s === "escalate_to_human") { out.push({ step: s, out: "Would queue for a human agent", stop: true }); break; }
        out.push({ step: s, out: s === "confirm_with_customer" ? "Would wait for customer to confirm" : "Would run (dry run — no records changed)" });
      }
      setTrace(out);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <Panel title="Test console">
      <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
      <Button className="mt-2 w-full" disabled={busy || !flow.length || text.trim().length < 3} onClick={run}>{busy ? "Running…" : "Run flow"}</Button>
      <ol className="mt-3 space-y-2">{trace.map((r, i) => (
        <li key={i} className={`border-l-2 pl-2 text-xs ${r.stop ? "border-warning" : "border-primary/50"}`}><p className="font-mono">{r.step}</p><p className="text-muted-foreground">{r.out}</p></li>))}</ol>
      <p className="mt-3 text-[11px] text-muted-foreground">Intent uses live AI; other steps are dry runs so testing never changes customer data.</p>
    </Panel>
  );
}
