import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader, Panel, StatusBadge, dt } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/_authenticated/performance")({ head: meta("Operator Performance", "Who claimed, worked and closed which tickets, and what they said."), component: Perf });

type Row = { at: string; actor: string; dispute: string; what: string; detail?: string | null; status?: string | null };

function Perf() {
  const [who, setWho] = useState("");
  const q = useQuery({ queryKey: ["performance"], queryFn: async () => {
    const [ops, ev, msgs, ds] = await Promise.all([
      supabase.rpc("list_operators"), supabase.from("dispute_events").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("dispute_messages").select("*").order("created_at", { ascending: false }).limit(1000), supabase.from("disputes").select("id,assigned_at,closed_at,assigned_to"),
    ]);
    return { ops: ops.data ?? [], ev: ev.data ?? [], msgs: msgs.data ?? [], ds: ds.data ?? [] };
  } });
  const d = q.data;
  const name = (id?: string | null) => d?.ops.find((o) => o.id === id)?.display_name ?? (id ? id.slice(0, 8) : "—");
  const rows: Row[] = d ? [
    ...d.ev.map((e) => ({ at: e.created_at, actor: e.actor, dispute: e.dispute_id, status: e.to_status, detail: e.note,
      what: e.kind === "assigned" ? (e.note === "Self-assigned from queue" ? "Claimed ticket" : "Assigned ticket") : e.kind === "note" ? "Added note" : e.kind === "opened" ? "Opened ticket" : `Moved to ${(e.to_status ?? "").replace(/_/g, " ")}` })),
    ...d.msgs.filter((m) => m.author).map((m) => ({ at: m.created_at, actor: m.author!, dispute: m.dispute_id, what: "Messaged customer", detail: m.body })),
  ].sort((a, b) => b.at.localeCompare(a.at)) : [];
  const shown = who ? rows.filter((r) => r.actor === who) : rows;

  const stats = d?.ops.map((o) => {
    const mine = rows.filter((r) => r.actor === o.id);
    const closed = d.ds.filter((x) => x.assigned_to === o.id && x.closed_at && x.assigned_at);
    const avgMin = closed.length ? Math.round(closed.reduce((s, x) => s + (new Date(x.closed_at!).getTime() - new Date(x.assigned_at!).getTime()), 0) / closed.length / 60000) : null;
    return { o, claimed: mine.filter((r) => r.what === "Claimed ticket" || r.what === "Assigned ticket").length, msgs: mine.filter((r) => r.what === "Messaged customer").length,
      closed: closed.length, open: d.ds.filter((x) => x.assigned_to === o.id && !x.closed_at).length, avgMin, last: mine[0]?.at ?? null };
  }) ?? [];

  return (<>
    <PageHeader title="Operator Performance" desc="Every claim, status change, note and customer message, by operator." />
    <Panel title="Summary" className="mb-4">
      <table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Operator</th><th>Claimed / assigned</th><th>Open now</th><th>Closed</th><th>Avg. assign → close</th><th>Messages</th><th>Last active</th></tr></thead>
        <tbody className="divide-y">{stats.map((s) => (
          <tr key={s.o.id} className="cursor-pointer hover:bg-accent/40" onClick={() => setWho(who === s.o.id ? "" : s.o.id)}>
            <td className="py-2">{s.o.display_name}</td><td>{s.claimed}</td><td>{s.open}</td><td>{s.closed}</td><td>{s.avgMin === null ? "—" : `${s.avgMin} min`}</td><td>{s.msgs}</td><td className="text-xs">{dt(s.last)}</td></tr>))}
          {!stats.length && <tr><td className="py-3 text-muted-foreground" colSpan={7}>No operators yet.</td></tr>}</tbody></table>
    </Panel>
    <Panel title={who ? `Activity — ${name(who)}` : "All activity"} action={
      <select value={who} onChange={(e) => setWho(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs"><option value="">Everyone</option>{d?.ops.map((o) => <option key={o.id} value={o.id}>{o.display_name}</option>)}</select>}>
      <ul className="divide-y">{shown.slice(0, 300).map((r, i) => (
        <li key={i} className="flex flex-wrap items-start gap-3 py-2 text-sm">
          <span className="w-36 shrink-0 text-xs text-muted-foreground">{dt(r.at)}</span>
          <span className="w-28 shrink-0 text-xs">{name(r.actor)}</span>
          <span className="w-40 shrink-0">{r.what}</span>
          <Link to="/disputes/$id" params={{ id: r.dispute }} className="font-mono text-xs text-primary hover:underline">{r.dispute}</Link>
          {r.status && <StatusBadge value={r.status} />}
          {r.detail && <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">“{r.detail}”</span>}
        </li>))}
        {!shown.length && <li className="py-3 text-sm text-muted-foreground">No activity yet.</li>}</ul>
    </Panel>
  </>);
}
