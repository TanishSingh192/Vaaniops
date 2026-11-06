import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Panel, StatusBadge } from "@/components/kit";
import { triageIssue, type Triage } from "@/lib/triage.functions";

const SAMPLES = [
  "Mere UPI se 4,000 rupaye kat gaye, lekin merchant ko payment nahi mila. Please check karo.",
  "Maza Amazon Pay cha 899 rupaye don vela kapla gela aahe.",
  "Someone used my card for 15000 at an unknown merchant, please block it now.",
];

export function TriagePanel({ initial, large = false }: { initial: string; large?: boolean }) {
  const fn = useServerFn(triageIssue);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ triage: Triage; latencyMs: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    const t = text.trim() || initial;
    if (!t) return;
    setBusy(true); setErr(null); setRes(null);
    try { setRes(await fn({ data: { transcript: t } })); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  const tr = res?.triage;
  return (
    <Panel title="AI issue triage" action={<StatusBadge value="suggestion_only" />}>
      {large && <div className="mb-2 flex flex-wrap gap-1.5">{SAMPLES.map((x) => <button key={x} onClick={() => setText(x)} className="rounded border px-2 py-1 text-left text-[11px] text-muted-foreground hover:bg-accent">{x.slice(0, 48)}…</button>)}</div>}
      <Textarea rows={large ? 6 : 3} value={text} onChange={(e) => setText(e.target.value)}
        placeholder={initial ? `Uses last customer message: "${initial.slice(0, 60)}…"` : "Paste a transcript or describe the customer's issue"} />
      <Button size="sm" className="mt-2 w-full" onClick={run} disabled={busy || (!text.trim() && !initial)}>
        <Sparkles className="h-3.5 w-3.5" />{busy ? "Analysing…" : "Identify intent & next action"}
      </Button>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
      {tr && (
        <div className="mt-3 space-y-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge value={tr.intent} />
            <span className="font-mono text-muted-foreground">{Math.round(tr.confidence * 100)}% · {tr.language} · {res!.latencyMs} ms</span>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-md border p-2"><div><p className="text-muted-foreground">Language</p><p className="font-mono">{tr.language}</p></div><div><p className="text-muted-foreground">Amount</p><p className="font-mono">{tr.entities.amount_inr != null ? `₹${tr.entities.amount_inr.toLocaleString("en-IN")}` : "—"}</p></div><div><p className="text-muted-foreground">Merchant</p><p className="font-mono">{tr.entities.merchant ?? "—"}</p></div></div>
          <p>{tr.summary}</p>
          <div className="rounded-md border p-2">
            <p className="text-muted-foreground">Suggested next action</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="font-mono">{tr.suggested_action}</span><StatusBadge value={tr.action_risk} />
              {tr.requires_customer_verification && <StatusBadge value="needs_verification" />}
              {tr.requires_explicit_confirmation && <StatusBadge value="needs_confirmation" />}
            </div>
            <p className="mt-1.5 text-muted-foreground">{tr.rationale}</p>
          </div>
          {(tr.entities.amount_inr || tr.entities.merchant || tr.entities.transaction_reference) && (
            <p className="font-mono text-muted-foreground">
              {[tr.entities.amount_inr && `₹${tr.entities.amount_inr}`, tr.entities.merchant, tr.entities.transaction_reference].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="rounded bg-muted p-2"><span className="text-muted-foreground">Suggested reply: </span>{tr.reply_to_customer}</p>
          <p className="text-[10px] text-muted-foreground">AI suggestion only — no action is taken until an operator runs it.</p>
        </div>
      )}
    </Panel>
  );
}
