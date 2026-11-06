import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, PageHeader, StatusBadge, dt, inr, useTable } from "@/components/kit";
import { openDispute } from "@/lib/disputes.functions";
import { meta } from "@/lib/meta";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/disputes")({ head: meta("Dispute Management", "Open, assign, resolve and close disputes."), component: P });

function P() {
  const q = useTable("disputes", "created_at");
  return (<><PageHeader title="Dispute Management" desc="Open → assign → investigate → resolve → close. Every step is timestamped."><NewDispute /></PageHeader>
    <DataTable loading={q.isLoading} rows={q.data} cols={[
      { key: "id", label: "Dispute", mono: true, render: (r) => <Link to="/disputes/$id" params={{ id: r.id }} className="text-primary hover:underline">{r.id}</Link> },
      { key: "customer_id", label: "Customer", mono: true }, { key: "category", label: "Category" },
      { key: "amount", label: "Amount", render: (r) => inr(r.amount) },
      { key: "priority", label: "Priority", render: (r) => <StatusBadge value={r.priority} /> },
      { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
      { key: "assigned_to", label: "Assigned", render: (r) => (r.assigned_to ? "Yes" : "—") },
      { key: "updated_at", label: "Updated", render: (r) => dt(r.updated_at) }]} /></>);
}

function NewDispute() {
  const txns = useTable("transactions", "occurred_at");
  const fn = useServerFn(openDispute); const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ transactionId: "", category: "failed_payment", priority: "medium", description: "" });
  async function submit() {
    try { const r = await fn({ data: f }); toast.success(r.existing ? "A dispute already exists for this — opening it." : "Dispute opened"); setOpen(false); nav({ to: "/disputes/$id", params: { id: r.id } }); }
    catch (e) { toast.error((e as Error).message); }
  }
  const sel = "h-9 w-full rounded-md border bg-background px-2 text-sm";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" />Open dispute</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Open a dispute</DialogTitle></DialogHeader>
        <div className="grid gap-3 text-sm">
          <label className="grid gap-1">Transaction<select className={sel} value={f.transactionId} onChange={(e) => setF({ ...f, transactionId: e.target.value })}>
            <option value="">Select…</option>{txns.data?.map((t) => <option key={t.id} value={t.id}>{t.id} · {t.merchant} · {inr(t.amount)} · {t.status}</option>)}</select></label>
          <label className="grid gap-1">Category<select className={sel} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {["failed_payment", "duplicate_debit", "unauthorised", "merchant_dispute", "other"].map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="grid gap-1">Priority<select className={sel} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
            {["low", "medium", "high"].map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="grid gap-1">Description<Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
          <Button onClick={submit} disabled={!f.transactionId}>Open dispute</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
