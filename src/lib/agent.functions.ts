import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { detectIntent, type Intent } from "./intent";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ev = { stage: string; label: string; detail?: any };

const ALLOWED = new Set([
  "get_customer_profile", "verify_customer", "get_transaction", "search_transactions",
  "check_dispute_eligibility", "create_dispute_ticket", "freeze_virtual_card", "escalate_to_human",
]);

export const runTurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId?: string | undefined; customerId: string; text: string; confirmFreeze?: boolean }) => {
    if (!d.customerId || typeof d.text !== "string" || d.text.length > 2000) throw new Error("Invalid input");
    return d;
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: canOp } = await sb.rpc("can_operate", { _user_id: context.userId });
    if (!canOp) throw new Error("Your role cannot run live operations.");

    const events: Ev[] = [];
    const t0 = Date.now();
    let sessionId = data.sessionId;
    if (!sessionId) {
      const { data: s, error } = await sb.from("voice_sessions")
        .insert({ customer_id: data.customerId, status: "active", is_demo: true }).select("id").single();
      if (error) throw new Error(error.message);
      sessionId = s.id;
    }

    async function tool(name: string, args: Record<string, unknown>, fn: () => Promise<unknown>) {
      if (!ALLOWED.has(name)) throw new Error(`Tool ${name} is not allowlisted`);
      const st = Date.now();
      let result: unknown; let status = "success";
      try { result = await fn(); } catch (e) { status = "failed"; result = { error: (e as Error).message }; }
      await sb.from("tool_executions").insert({ session_id: sessionId, tool_name: name, arguments: args as never, result: result as never, status, latency_ms: Date.now() - st });
      events.push({ stage: "executing", label: `Tool ${name} ${status}`, detail: result });
      return result as any;
    }

    let intent: Intent = detectIntent(data.text);
    let engine: "lovable_ai" | "rules" = "rules";
    let aiReply: string | null = null;
    if (data.confirmFreeze) {
      intent = { intent: "card_freeze", workflow: "card_fraud_freeze", confidence: 1, amount: null, language: "hi-IN" };
    } else {
      try {
        const { classifyIssue } = await import("./triage.server");
        const { triage, latencyMs } = await classifyIssue(data.text);
        const map: Record<string, Intent["intent"]> = { failed_upi_payment: "failed_upi_payment", duplicate_transaction: "duplicate_transaction", card_fraud_or_freeze: "card_freeze" };
        const it = map[triage.intent] ?? "unknown";
        const wf: Record<string, string | null> = { failed_upi_payment: "upi_dispute_investigation", duplicate_transaction: "duplicate_transaction", card_freeze: "card_fraud_freeze", unknown: null };
        const lang = (["hi-IN", "mr-IN", "en-IN"].includes(triage.language) ? triage.language : "hi-IN") as Intent["language"];
        intent = { intent: it, workflow: wf[it] ?? null, confidence: triage.confidence, amount: triage.entities.amount_inr, language: lang };
        aiReply = triage.reply_to_customer;
        engine = "lovable_ai";
        events.push({ stage: "understanding", label: `AI reasoning (${latencyMs} ms): suggests ${triage.suggested_action}`, detail: { summary: triage.summary, risk: triage.action_risk } });
      } catch (e) {
        events.push({ stage: "understanding", label: `AI unavailable — using rule fallback (${(e as Error).message})` });
      }
    }
    events.push({ stage: "understanding", label: `Intent identified: ${intent.intent}`, detail: { ...intent, engine } });

    const profile = await tool("get_customer_profile", { customer_id: data.customerId }, async () => {
      const { data: c, error } = await sb.from("customers").select("id,name,masked_account,verification_status,preferred_language").eq("id", data.customerId).single();
      if (error) throw error; return c;
    });
    if (profile?.verification_status !== "verified") {
      events.push({ stage: "escalated", label: "Customer not verified — escalating" });
      await tool("escalate_to_human", { reason: "unverified" }, async () => ({ queued: true }));
      return finish("Aapki pehchaan verify nahi ho payi. Main aapko ek human agent se connect kar raha hoon.", "escalated");
    }
    events.push({ stage: "planning", label: "Authorization verified", detail: { customer: profile.id } });

    let reply = "Maaf kijiye, main samajh nahi paaya. Kya aap thoda detail mein bata sakte hain?";
    let outcome = "clarification";
    if (intent.intent === "unknown" && aiReply) reply = aiReply;

    if (intent.intent === "failed_upi_payment") {
      const txns = await tool("search_transactions", { status: "failed", amount: intent.amount }, async () => {
        let q = sb.from("transactions").select("*").eq("customer_id", data.customerId).eq("status", "failed");
        if (intent.amount) q = q.eq("amount", intent.amount);
        const { data: r } = await q.order("occurred_at", { ascending: false }).limit(1); return r ?? [];
      });
      const txn = txns[0];
      if (!txn) { reply = "Mujhe aapke account mein aisa koi failed transaction nahi mila. Kya aap amount ya date confirm kar sakte hain?"; }
      else {
        const elig = await tool("check_dispute_eligibility", { transaction_id: txn.id }, async () => {
          const ageDays = (Date.now() - new Date(txn.occurred_at).getTime()) / 864e5;
          return { eligible: ageDays <= 30, rule: "Failed UPI debit within 30 days" };
        });
        if (elig.eligible) {
          const d = await createDispute(txn, "failed_payment", "Debited but merchant did not receive payment");
          reply = `Aapka ₹${Number(txn.amount).toLocaleString("en-IN")} ka transaction ${txn.merchant} ke liye fail hua tha. Maine dispute ${d.id} register kar diya hai. Yeh ek simulated ticket hai; abhi koi real refund nahi hua hai.`;
          outcome = "dispute_created";
        } else reply = "Yeh transaction dispute window se bahar hai.";
      }
    } else if (intent.intent === "duplicate_transaction") {
      const all = await tool("search_transactions", { window_minutes: 10 }, async () => {
        const { data: r } = await sb.from("transactions").select("*").eq("customer_id", data.customerId).order("occurred_at"); return r ?? [];
      });
      let dup: any = null;
      for (let i = 1; i < all.length; i++) {
        const a = all[i - 1], b = all[i];
        if (a.amount === b.amount && a.merchant === b.merchant && Math.abs(new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()) < 10 * 60e3) dup = b;
      }
      if (!dup) reply = "Mujhe koi duplicate debit nahi mila. Kya aap merchant ka naam bata sakte hain?";
      else {
        const d = await createDispute(dup, "duplicate_debit", "Same amount and merchant debited twice within 10 minutes");
        reply = `${dup.merchant} par ₹${dup.amount} do baar kata gaya hai. Maine duplicate dispute ${d.id} bana diya hai (simulated).`;
        outcome = "dispute_created";
      }
    } else if (intent.intent === "card_freeze") {
      if (!data.confirmFreeze) {
        events.push({ stage: "awaiting_confirmation", label: "High-risk tool requires explicit confirmation" });
        return finish("Kya aap confirm karte hain ki main aapka virtual card freeze kar doon? Confirm button dabaiye.", "awaiting_confirmation", true);
      }
      const r = await tool("freeze_virtual_card", { customer_id: data.customerId }, async () => {
        const { data: c, error } = await sb.from("cards").update({ status: "frozen" }).eq("customer_id", data.customerId).eq("card_type", "Virtual Debit").select("last_four");
        if (error) throw error; if (!c?.length) throw new Error("No virtual card found"); return c[0];
      });
      if (r?.last_four) {
        await audit("freeze_virtual_card", "card", r.last_four);
        reply = `Aapka virtual card ending ${r.last_four} freeze kar diya gaya hai (simulated environment).`;
        outcome = "card_frozen";
      } else reply = "Card freeze nahi ho paaya. Main ise human agent ko escalate kar raha hoon.";
    }

    return finish(reply, outcome);

    async function createDispute(txn: any, category: string, description: string) {
      return tool("create_dispute_ticket", { transaction_id: txn.id, category }, async () => {
        let key = `${txn.id}:${category}`;
        const { data: existing } = await sb.from("disputes").select("id,status").eq("idempotency_key", key).maybeSingle();
        if (existing && existing.status !== "closed") return { id: existing.id, idempotent_replay: true };
        if (existing) {
          const { data: open } = await sb.from("disputes").select("id").eq("transaction_id", txn.id).eq("category", category).neq("status", "closed").limit(1).maybeSingle();
          if (open) return { id: open.id, idempotent_replay: true };
          key = `${key}:${Date.now()}`;
        }
        const { data: d, error } = await sb.from("disputes").insert({
          customer_id: data.customerId, transaction_id: txn.id, category, amount: txn.amount, description,
          priority: Number(txn.amount) >= 5000 ? "high" : "medium", idempotency_key: key,
        }).select("id").single();
        if (error) throw error;
        await audit("create_dispute_ticket", "dispute", d.id);
        return d;
      });
    }
    async function audit(action: string, entity: string, entityId: string) {
      await sb.from("audit_logs").insert({ actor: context.userId, action, entity, entity_id: entityId, details: { session_id: sessionId } });
    }
    async function finish(text: string, outcome: string, needsConfirm = false) {
      const latency = Date.now() - t0;
      events.push({ stage: needsConfirm ? "awaiting_confirmation" : "completed", label: "Response generated", detail: { latency_ms: latency } });
      await sb.from("voice_sessions").update({
        workflow: intent.workflow, language: intent.language, outcome, avg_latency_ms: latency,
        ...(needsConfirm ? {} : { status: outcome === "escalated" ? "escalated" : "completed", ended_at: new Date().toISOString() }),
      }).eq("id", sessionId!);
      return { sessionId: sessionId!, reply: text, events, needsConfirm, engine };
    }
  });
