import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, Panel, StatusBadge } from "@/components/kit";
import { getIntegrationStatus } from "@/lib/integrations.functions";
import { meta } from "@/lib/meta";
export const Route = createFileRoute("/_authenticated/integrations")({ head: meta("Integrations", "Integration readiness."), component: P });
const ROWS = [
  { k: "prisma", name: "Gnani Prisma", role: "Speech-to-text · Prisma v3.0 REST (WAV ≤ 30 s) · api.vachana.ai/stt/v3", req: true, fallback: "Browser speech recognition" },
  { k: "evon", name: "Gnani Evon", role: "Reasoning + tool selection · running on AI reasoning until your Evon beta endpoint is added", req: true, fallback: "AI reasoning + rule-based intent engine" },
  { k: "timbre", name: "Gnani Timbre", role: "Text-to-speech · Timbre v2.5 REST (MP3) · api.vachana.ai/api/v1/tts/inference", req: true, fallback: "Browser speech synthesis" },
  { k: "database", name: "Database & sign-in", role: "Records, roles, audit log", req: true, fallback: "—" },
  { k: "sentry", name: "Sentry", role: "Error monitoring", req: false, fallback: "Console logs" },
  { k: "posthog", name: "PostHog", role: "Product analytics", req: false, fallback: "In-app analytics" },
] as const;
function P() {
  const fn = useServerFn(getIntegrationStatus);
  const q = useQuery({ queryKey: ["integrations"], queryFn: () => fn() });
  return (<><PageHeader title="Integrations" desc="Keys are stored securely on the server and never shown in the browser." />
    <div className="grid gap-3 md:grid-cols-2">{ROWS.map((r) => { const s = q.data?.[r.k]; return (
      <Panel key={r.k} title={r.name} action={<StatusBadge value={!s ? "pending" : s.configured ? "configured" : r.req ? "missing" : "pending"} />}>
        <p className="text-sm text-muted-foreground">{r.role}</p>
        <p className="mt-2 text-xs"><span className="text-muted-foreground">Fallback while missing:</span> {r.fallback}</p>
        {s && !s.configured && s.missing.length > 0 && <p className="mt-1 font-mono text-[11px] text-muted-foreground">Needs: {s.missing.join(", ")}</p>}
      </Panel>); })}</div></>);
}
