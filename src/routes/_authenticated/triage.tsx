import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/kit";
import { TriagePanel } from "@/components/TriagePanel";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/_authenticated/triage")({ head: meta("AI Issue Triage", "Identify intent, language, amount and the safe next action from a customer transcript."), component: P });

function P() {
  return (<><PageHeader title="AI Issue Triage" desc="Paste a customer transcript. The AI suggests — operators decide." />
    <div className="max-w-3xl"><TriagePanel initial="" large /></div></>);
}
