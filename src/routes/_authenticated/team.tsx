import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader, Panel, StatusBadge, dt } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { setUserRole } from "@/lib/team.functions";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/_authenticated/team")({ head: meta("Team & Roles", "Manage operator accounts and permissions."), component: Team });

const PERMS: Record<string, string> = { admin: "Everything, including roles", operator: "Live sessions, disputes, My Queue, chat", viewer: "Read-only" };

function Team() {
  const { role, user } = Route.useRouteContext(); const qc = useQueryClient(); const save = useServerFn(setUserRole);
  const people = useQuery({ enabled: role === "admin", queryKey: ["team"], queryFn: async () => {
    const [p, r] = await Promise.all([supabase.from("profiles").select("*").order("created_at"), supabase.from("user_roles").select("user_id,role")]);
    return (p.data ?? []).map((x) => ({ ...x, role: r.data?.find((y) => y.user_id === x.id)?.role ?? "viewer" }));
  } });
  if (role !== "admin") return <><PageHeader title="Team & Roles" /><Panel><p className="text-sm text-muted-foreground">Only admins can manage the team. Ask an admin to change your role.</p></Panel></>;
  return (<>
    <PageHeader title="Team & Roles" desc="New people sign up on the sign-in page and start as viewers. Make them operators here to give them a queue." />
    <div className="mb-4 grid gap-3 sm:grid-cols-3">{Object.entries(PERMS).map(([k, v]) => <div key={k} className="rounded-lg border bg-card p-3"><StatusBadge value={k} /><p className="mt-2 text-xs text-muted-foreground">{v}</p></div>)}</div>
    <Panel title={`Accounts (${people.data?.length ?? 0})`}>
      <table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Name</th><th>Email</th><th>Joined</th><th>Role</th></tr></thead>
        <tbody className="divide-y">{people.data?.map((p) => (
          <tr key={p.id}><td className="py-2">{p.display_name}{p.id === user.id && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}</td><td className="font-mono text-xs">{p.email}</td><td className="text-xs">{dt(p.created_at)}</td>
            <td><select value={p.role} aria-label={`Role for ${p.email}`} className="h-8 rounded-md border bg-background px-2 text-xs"
              onChange={async (e) => { const r = e.target.value; try { await save({ data: { userId: p.id, role: r } }); toast.success(`${p.display_name} is now ${r}`); qc.invalidateQueries(); } catch (err) { toast.error((err as Error).message); } }}>
              <option value="admin">admin</option><option value="operator">operator</option><option value="viewer">viewer</option></select></td></tr>))}</tbody></table>
    </Panel>
  </>);
}
