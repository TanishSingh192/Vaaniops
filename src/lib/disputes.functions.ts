import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validateTransition } from "./dispute-rules";

/** Dispute categories where resolving in the customer's favour credits the amount back. */
const REVERSIBLE = new Set(["failed_payment", "duplicate_debit"]);

async function requireOperator(sb: any, userId: string) {
  const { data } = await sb.rpc("can_operate", { _user_id: userId });
  if (!data) throw new Error("Only operators and admins can change disputes.");
}

export const assignDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; operatorId: string; note?: string | undefined }) => {
    if (!d.id || !d.operatorId) throw new Error("Missing dispute or operator");
    return d;
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await requireOperator(sb, context.userId);
    const { data: ops } = await sb.rpc("list_operators");
    if (!ops?.some((o: any) => o.id === data.operatorId)) throw new Error("That person is not an operator.");
    const { data: d, error } = await sb.from("disputes").select("status").eq("id", data.id).single();
    if (error) throw new Error("Dispute not found");
    if (d.status === "closed") throw new Error("Closed disputes can't be reassigned.");
    const now = new Date().toISOString();
    const to = d.status === "submitted" || d.status === "verification_pending" ? "assigned" : d.status;
    const { error: uerr } = await sb.from("disputes").update({ assigned_to: data.operatorId, assigned_at: now, status: to, updated_at: now }).eq("id", data.id);
    if (uerr) throw new Error(uerr.message);
    await sb.from("dispute_events").insert({ dispute_id: data.id, actor: context.userId, kind: "assigned", from_status: d.status, to_status: to, note: data.note ?? null });
    await sb.from("audit_logs").insert({ actor: context.userId, action: "assign_dispute", entity: "dispute", entity_id: data.id, details: { operator: data.operatorId } });
    return { ok: true };
  });

export const transitionDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; to: string; note?: string | undefined }) => {
    if (!d.id || !d.to) throw new Error("Missing input");
    if (d.note && d.note.length > 2000) throw new Error("Note too long");
    return d;
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await requireOperator(sb, context.userId);
    const { data: d, error } = await sb.from("disputes").select("status, assigned_to, category").eq("id", data.id).single();
    if (error) throw new Error("Dispute not found");
    const problem = validateTransition(d.status, data.to, { note: data.note, assigned: Boolean(d.assigned_to) });
    if (problem) throw new Error(problem);
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status: data.to, updated_at: now };
    if (data.to === "resolved" || data.to === "rejected") { patch["resolved_at"] = now; patch["resolution_notes"] = data.note; }
    if (data.to === "closed") patch["closed_at"] = now;
    if (data.to === "under_investigation" && d.status === "resolved") { patch["resolved_at"] = null; }
    const { error: uerr } = await sb.from("disputes").update(patch).eq("id", data.id);
    if (uerr) throw new Error(uerr.message);
    await sb.from("dispute_events").insert({ dispute_id: data.id, actor: context.userId, kind: "status", from_status: d.status, to_status: data.to, note: data.note ?? null });
    if (data.to === "resolved" && REVERSIBLE.has(d.category)) {
      const { data: bal, error: rerr } = await sb.rpc("apply_dispute_reversal", { _dispute_id: data.id, _note: data.note ?? null });
      if (rerr) throw new Error(`Resolved, but the balance credit failed: ${rerr.message}`);
      await sb.from("dispute_events").insert({ dispute_id: data.id, actor: context.userId, kind: "note", note: `Amount credited back to customer balance. New balance ₹${Number(bal).toLocaleString("en-IN")}.` });
    }
    await sb.from("audit_logs").insert({ actor: context.userId, action: "dispute_status", entity: "dispute", entity_id: data.id, details: { from: d.status, to: data.to } });
    return { ok: true };
  });

export const addDisputeNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; note: string }) => {
    if (!d.note?.trim() || d.note.length > 2000) throw new Error("Note must be 1–2000 characters");
    return d;
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await requireOperator(sb, context.userId);
    const { error } = await sb.from("dispute_events").insert({ dispute_id: data.id, actor: context.userId, kind: "note", note: data.note.trim() });
    if (error) throw new Error(error.message);
    await sb.from("disputes").update({ updated_at: new Date().toISOString() }).eq("id", data.id);
    return { ok: true };
  });

export const openDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { transactionId: string; category: string; description: string; priority: string }) => {
    if (!d.transactionId || !d.category) throw new Error("Pick a transaction and category");
    if (!["low", "medium", "high"].includes(d.priority)) throw new Error("Invalid priority");
    if ((d.description ?? "").length > 2000) throw new Error("Description too long");
    return d;
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await requireOperator(sb, context.userId);
    const { data: t, error } = await sb.from("transactions").select("id, customer_id, amount").eq("id", data.transactionId).single();
    if (error) throw new Error("Transaction not found");
    const key = `${t.id}:${data.category}`;
    const { data: existing } = await sb.from("disputes").select("id").eq("idempotency_key", key).maybeSingle();
    if (existing) return { id: existing.id as string, existing: true };
    const { data: d, error: ierr } = await sb.from("disputes").insert({
      customer_id: t.customer_id, transaction_id: t.id, category: data.category, amount: t.amount,
      description: data.description, priority: data.priority, status: "submitted", idempotency_key: key,
    }).select("id").single();
    if (ierr) throw new Error(ierr.message);
    await sb.from("dispute_events").insert({ dispute_id: d.id, actor: context.userId, kind: "opened", to_status: "submitted", note: data.description || null });
    await sb.from("audit_logs").insert({ actor: context.userId, action: "open_dispute", entity: "dispute", entity_id: d.id, details: { transaction: t.id } });
    return { id: d.id as string, existing: false };
  });

export const sendDisputeMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; body: string }) => {
    const b = (d?.body ?? "").trim();
    if (!d?.id || !b || b.length > 2000) throw new Error("Message must be 1–2000 characters");
    return { id: d.id, body: b };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await requireOperator(sb, context.userId);
    const { data: d } = await sb.from("disputes").select("status").eq("id", data.id).single();
    if (!d) throw new Error("Dispute not found");
    if (d.status === "closed") throw new Error("This dispute is closed.");
    const { error } = await sb.from("dispute_messages").insert({ dispute_id: data.id, sender: "operator", author: context.userId, body: data.body });
    if (error) throw new Error(error.message);
    await sb.from("audit_logs").insert({ actor: context.userId, action: "send_customer_message", entity: "dispute", entity_id: data.id, details: { length: data.body.length } });
    return { ok: true };
  });

/** Pull up to `count` oldest unassigned open disputes into the caller's queue. */
export const requestMoreTickets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { count?: number }) => ({ count: Math.min(5, Math.max(1, Math.floor(d?.count ?? 3))) }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await requireOperator(sb, context.userId);
    const { data: pool } = await sb.from("disputes").select("id,status").is("assigned_to", null)
      .in("status", ["submitted", "verification_pending"]).order("created_at").limit(data.count);
    const now = new Date().toISOString(); const ids: string[] = [];
    for (const d of pool ?? []) {
      const { data: upd } = await sb.from("disputes").update({ assigned_to: context.userId, assigned_at: now, status: "assigned", updated_at: now })
        .eq("id", d.id).is("assigned_to", null).select("id");
      if (!upd?.length) continue;
      ids.push(d.id);
      await sb.from("dispute_events").insert({ dispute_id: d.id, actor: context.userId, kind: "assigned", from_status: d.status, to_status: "assigned", note: "Self-assigned from queue" });
      await sb.from("audit_logs").insert({ actor: context.userId, action: "assign_dispute", entity: "dispute", entity_id: d.id, details: { operator: context.userId, self: true } });
    }
    return { assigned: ids };
  });
