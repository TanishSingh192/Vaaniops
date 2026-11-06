import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const FLOW_NODES = [
  "detect_intent", "get_customer_profile", "verify_customer", "search_transactions", "get_transaction",
  "check_dispute_eligibility", "create_dispute_ticket", "confirm_with_customer", "freeze_virtual_card", "escalate_to_human", "reply",
] as const;

export const saveAgentVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { agentId: string; nodes: string[]; notes?: string }) => {
    if (!d?.agentId || !Array.isArray(d.nodes) || d.nodes.length === 0 || d.nodes.length > 30) throw new Error("Add 1–30 steps");
    if (d.nodes.some((n) => !(FLOW_NODES as readonly string[]).includes(n))) throw new Error("Unknown step in flow");
    const i = d.nodes.indexOf("freeze_virtual_card");
    if (i >= 0 && !d.nodes.slice(0, i).includes("confirm_with_customer")) throw new Error("Card freeze needs a customer confirmation step before it");
    return { agentId: d.agentId, nodes: d.nodes, notes: (d.notes ?? "").slice(0, 500) };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: ok } = await sb.rpc("can_operate", { _user_id: context.userId });
    if (!ok) throw new Error("Your role cannot save agent versions.");
    const { data: last } = await sb.from("agent_versions").select("version").eq("agent_id", data.agentId).order("version", { ascending: false }).limit(1).maybeSingle();
    const { data: a } = await sb.from("agents").select("version").eq("id", data.agentId).single();
    const version = Math.max(last?.version ?? 0, a?.version ?? 0) + 1;
    const { error } = await sb.from("agent_versions").insert({ agent_id: data.agentId, version, nodes: data.nodes, notes: data.notes || null, created_by: context.userId });
    if (error) throw new Error(error.message);
    await sb.from("agents").update({ version }).eq("id", data.agentId);
    return { version };
  });
