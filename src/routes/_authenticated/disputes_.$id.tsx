import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Panel, StatusBadge, dt, inr } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { addDisputeNote, assignDispute, sendDisputeMessage, transitionDispute } from "@/lib/disputes.functions";
import { allowedNext } from "@/lib/dispute-rules";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/disputes_/$id")({
  head: ({ params }) => ({ meta: [{ title: `Dispute ${params.id} — VaaniOps` }, { name: "description", content: "Dispute details and timeline." }, { property: "og:title", content: `Dispute ${params.id} — VaaniOps` }, { property: "og:description", content: "Dispute details and timeline." }] }),
  component: Detail,
});

const LABEL: Record<string, string> = { under_investigation: "Start investigation", escalated: "Escalate", resolved: "Resolve", rejected: "Reject", closed: "Close", assigned: "Mark assigned" };

function Detail() {
  const { id } = Route.useParams(); const qc = useQueryClient();
  const d = useQuery({ queryKey: ["dispute", id], queryFn: async () => (await supabase.from("disputes").select("*").eq("id", id).single()).data });
  const ev = useQuery({ queryKey: ["dispute_events", id], queryFn: async () => (await supabase.from("dispute_events").select("*").eq("dispute_id", id).order("created_at")).data ?? [] });
  const msgs = useQuery({ queryKey: ["dispute_messages", id], queryFn: async () => (await supabase.from("dispute_messages").select("*").eq("dispute_id", id).order("created_at")).data ?? [] });
  const send = useServerFn(sendDisputeMessage); const [msg, setMsg] = useState("");
  const ops = useQuery({ queryKey: ["operators"], queryFn: async () => (await supabase.rpc("list_operators")).data ?? [] });
  const assign = useServerFn(assignDispute); const move = useServerFn(transitionDispute); const addNote = useServerFn(addDisputeNote);
  const [note, setNote] = useState(""); const [op, setOp] = useState("");
  const name = (uid?: string | null) => ops.data?.find((o) => o.id === uid)?.display_name ?? (uid ? uid.slice(0, 8) : "—");

  async function act(fn: () => Promise<unknown>, ok: string) {
    try { await fn(); toast.success(ok); setNote(""); qc.invalidateQueries(); } catch (e) { toast.error((e as Error).message); }
  }
  const x = d.data; if (!x) return <p className="text-sm text-muted-foreground">{d.isLoading ? "Loading…" : "Dispute not found."}</p>;
  const next = allowedNext(x.status).filter((s) => s !== "assigned");

  return (
    <div className="space-y-4">
      <Link to="/disputes" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" />All disputes</Link>
      <div className="flex flex-wrap items-center gap-3"><h1 className="font-mono text-xl font-semibold">{x.id}</h1><StatusBadge value={x.status} /><StatusBadge value={x.priority} /></div>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Panel title="Details">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
              {[["Customer", x.customer_id], ["Transaction", x.transaction_id], ["Category", x.category], ["Amount", inr(x.amount)], ["Team", x.assigned_team], ["Assigned to", name(x.assigned_to)],
                ["Opened", dt(x.created_at)], ["Assigned", dt(x.assigned_at)], ["Resolved", dt(x.resolved_at)], ["Closed", dt(x.closed_at)], ["Last update", dt(x.updated_at)]].map(([k, v]) => (
                <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-mono text-xs">{v ?? "—"}</dd></div>))}
            </dl>
            {x.description && <p className="mt-3 text-sm text-muted-foreground">{x.description}</p>}
            {x.resolution_notes && <p className="mt-3 rounded bg-muted p-2 text-sm"><span className="text-muted-foreground">Resolution: </span>{x.resolution_notes}</p>}
          </Panel>
          <Panel title="Customer chat">
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {msgs.data?.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "operator" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.sender === "operator" ? "bg-primary/15" : "bg-muted"}`}>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{m.sender === "operator" ? name(m.author) : "Customer"} · {dt(m.created_at)}</p>
                  </div>
                </div>))}
              {!msgs.data?.length && <p className="text-xs text-muted-foreground">No messages yet.</p>}
            </div>
            {x.status !== "closed" ? (
              <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!msg.trim()) return; act(async () => { await send({ data: { id, body: msg } }); setMsg(""); }, "Message saved"); }}>
                <Textarea rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Message to customer…" className="flex-1" />
                <Button type="submit" size="sm" disabled={!msg.trim()}>Send</Button>
              </form>) : <p className="mt-3 text-xs text-muted-foreground">Chat is closed with the dispute.</p>}
            <p className="mt-2 text-[11px] text-muted-foreground">Messages are saved to the ticket; delivery to the customer is not connected yet.</p>
          </Panel>
          <Panel title="Timeline">
            <ol className="space-y-3">
              {ev.data?.map((e) => (
                <li key={e.id} className="border-l-2 border-primary/40 pl-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium">{e.kind === "note" ? "Note" : e.kind === "assigned" ? "Assigned" : e.kind === "opened" ? "Opened" : "Status changed"}</span>
                    {e.to_status && <><StatusBadge value={e.from_status} />→<StatusBadge value={e.to_status} /></>}
                    <span className="text-muted-foreground">by {name(e.actor)} · {dt(e.created_at)}</span>
                  </div>
                  {e.note && <p className="mt-1">{e.note}</p>}
                </li>))}
              {!ev.data?.length && <p className="text-xs text-muted-foreground">No activity yet.</p>}
            </ol>
          </Panel>
        </div>
        <div className="space-y-4">
          {x.status !== "closed" && (
            <Panel title="Assign">
              <select value={op} onChange={(e) => setOp(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                <option value="">Choose operator…</option>{ops.data?.map((o) => <option key={o.id} value={o.id}>{o.display_name} ({o.email})</option>)}
              </select>
              <Button size="sm" className="mt-2 w-full" disabled={!op} onClick={() => act(() => assign({ data: { id, operatorId: op, note: note || undefined } }), "Assigned")}>Assign</Button>
            </Panel>
          )}
          <Panel title="Operator note">
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Findings, customer contact, resolution details…" />
            <Button size="sm" variant="outline" className="mt-2 w-full" disabled={!note.trim() || x.status === "closed"} onClick={() => act(() => addNote({ data: { id, note } }), "Note added")}>Add note</Button>
            {next.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Move to (the note above is attached; resolve/reject need one):</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {next.map((s) => <Button key={s} size="sm" variant={s === "rejected" ? "destructive" : s === "closed" || s === "resolved" ? "default" : "secondary"} onClick={() => act(() => move({ data: { id, to: s, note: note || undefined } }), `Moved to ${s.replace(/_/g, " ")}`)}>{LABEL[s] ?? s}</Button>)}
            </div>
            {x.status === "closed" && <p className="mt-2 text-xs text-muted-foreground">This dispute is closed.</p>}
          </Panel>
        </div>
      </div>
    </div>
  );
}
