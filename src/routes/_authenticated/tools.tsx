import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { DataTable, PageHeader, StatusBadge, useTable } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { meta } from "@/lib/meta";
import { toast } from "sonner";
export const Route = createFileRoute("/_authenticated/tools")({ head: meta("Tool Registry", "Allowlisted backend tools."), component: P });
function P() {
  const q = useTable("tools"); const qc = useQueryClient();
  async function toggle(name: string, enabled: boolean) {
    const { error } = await supabase.from("tools").update({ enabled }).eq("name", name);
    if (error) toast.error("Your role can't change tools."); else qc.invalidateQueries();
  }
  return (<><PageHeader title="Tool Registry" desc="Only these tools can be called by the agent. Authorization is checked independently of the model." />
    <DataTable loading={q.isLoading} rows={q.data} cols={[
      { key: "name", label: "Tool", mono: true }, { key: "description", label: "Description" },
      { key: "risk", label: "Risk", render: (r) => <StatusBadge value={r.risk} /> },
      { key: "requires_verification", label: "Needs verified caller", render: (r) => (r.requires_verification ? "Yes" : "No") },
      { key: "timeout_ms", label: "Timeout", render: (r) => `${r.timeout_ms} ms` }, { key: "retries", label: "Retries" },
      { key: "enabled", label: "Enabled", render: (r) => <Switch checked={r.enabled} onCheckedChange={(v) => toggle(r.name, v)} /> }]} /></>);
}
