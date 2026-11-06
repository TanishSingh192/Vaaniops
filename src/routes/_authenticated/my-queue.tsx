import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, StatusBadge, dt, inr } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { requestMoreTickets } from "@/lib/disputes.functions";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/_authenticated/my-queue")({ head: meta("My Queue", "Your assigned dispute tickets, pending actions and chats."), component: Q });

const NEXT: Record<string, string> = { assigned: "Start investigation", under_investigation: "Resolve or reject", escalated: "Review escalation", resolved: "Close ticket", rejected: "Close ticket" };

function Q() {
  const qc = useQueryClient(); const req = useServerFn(requestMoreTickets); const [busy, setBusy] = useState(false);
  const me = useQuery({ queryKey: ["me"], queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null });
  const mine = useQuery({ enabled: !!me.data, queryKey: ["my-disputes", me.data], queryFn: async () => (await supabase.from("disputes").select("*").eq("assigned_to", me.data!).order("updated_at", { ascending: false })).data ?? [] });
  const ids = mine.data?.map((d) => d.id) ?? [];
  const chats = useQuery({ enabled: ids.length > 0, queryKey: ["my-chats", ids], queryFn: async () => (await supabase.from("dispute_messages").select("*").in("dispute_id", ids).order("created_at", { ascending: false }).limit(30)).data ?? [] });
  const pool = useQuery({ queryKey: ["pool-count"], queryFn: async () => (await supabase.from("disputes").select("id", { count: "exact", head: true }).is("assigned_to", null).in("status", ["submitted", "verification_pending"])).count ?? 0 });
  const open = mine.data?.filter((d) => d.status !== "closed") ?? [];
  const closed = mine.data?.filter((d) => d.status === "closed") ?? [];

  async function more() {
    setBusy(true);
    try { const r = await req({ data: { count: 3 } }); toast[r.assigned.length ? "success" : "info"](r.assigned.length ? `Added ${r.assigned.length} ticket(s): ${r.assigned.join(", ")}` : "No unassigned tickets right now."); qc.invalidateQueries(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (<>
    <PageHeader title="My Queue" desc="Tickets assigned to you, what needs doing next, and recent customer chat.">
      <Button onClick={more} disabled={busy}>{busy ? "Requesting…" : `Request more tickets (${pool.data ?? 0} waiting)`}</Button>
    </PageHeader>
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      {[["Open tickets", open.length], ["Pending actions", open.filter((d) => NEXT[d.status]).length], ["Closed by me", closed.length]].map(([k, v]) => (
        <div key={k as string} className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="mt-1 text-2xl font-semibold">{v}</p></div>))}
    </div>
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <Panel title="Pending actions">
        <ul className="divide-y">{open.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
            <Link to="/disputes/$id" params={{ id: d.id }} className="font-mono text-xs text-primary hover:underline">{d.id}</Link>
            <StatusBadge value={d.status} /><StatusBadge value={d.priority} />
            <span className="font-mono text-xs">{inr(d.amount)}</span>
            <span className="text-xs text-muted-foreground">{d.category}</span>
            <span className="ml-auto text-xs">{NEXT[d.status] ?? "—"}</span>
          </li>))}
          {!open.length && <li className="py-3 text-sm text-muted-foreground">Nothing assigned. Request more tickets to get started.</li>}</ul>
        {closed.length > 0 && <><h3 className="mt-5 text-xs font-medium text-muted-foreground">Recently closed</h3>
          <ul className="mt-1 text-xs">{closed.slice(0, 5).map((d) => <li key={d.id} className="py-1"><Link to="/disputes/$id" params={{ id: d.id }} className="font-mono hover:underline">{d.id}</Link> · {dt(d.closed_at)}</li>)}</ul></>}
      </Panel>
      <Panel title="Chat history">
        <ul className="space-y-2">{chats.data?.map((m) => (
          <li key={m.id} className="rounded-md border p-2 text-sm">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Link to="/disputes/$id" params={{ id: m.dispute_id }} className="font-mono hover:underline">{m.dispute_id}</Link><span>{m.sender}</span><span className="ml-auto">{dt(m.created_at)}</span></div>
            <p className="mt-1 line-clamp-3">{m.body}</p>
          </li>))}
          {!chats.data?.length && <li className="text-sm text-muted-foreground">No messages on your tickets yet.</li>}</ul>
      </Panel>
    </div>
  </>);
}
