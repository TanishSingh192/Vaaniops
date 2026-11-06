import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["admin", "operator", "viewer"] as const;

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: string }) => {
    if (!d?.userId || !(ROLES as readonly string[]).includes(d.role)) throw new Error("Invalid role");
    return d as { userId: string; role: (typeof ROLES)[number] };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Only admins can change roles.");
    if (data.role !== "admin") {
      const { data: admins } = await sb.from("user_roles").select("user_id").eq("role", "admin");
      if ((admins ?? []).length <= 1 && admins?.[0]?.user_id === data.userId) throw new Error("Keep at least one admin.");
    }
    const { error: delErr } = await sb.from("user_roles").delete().eq("user_id", data.userId);
    if (delErr) throw new Error(delErr.message);
    const { error } = await sb.from("user_roles").insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    await sb.from("audit_logs").insert({ actor: context.userId, action: "set_role", entity: "user", entity_id: data.userId, details: { role: data.role } });
    return { ok: true };
  });
