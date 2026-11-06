import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send, Square, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, StatusBadge, dt, useTable } from "@/components/kit";
import { runTurn } from "@/lib/agent.functions";
import { transcribe, synthesize } from "@/lib/gnani.functions";
import { startWavRecording } from "@/lib/wav-recorder";
import { TriagePanel } from "@/components/TriagePanel";
import { meta } from "@/lib/meta";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/live")({
  head: meta("Live Operations", "Real-time voice operations workspace."),
  component: Live,
});

type Msg = { who: "customer" | "agent"; text: string };
type Ev = { stage: string; label: string; detail?: any; at: string };

const SAMPLES = [
  "Mere UPI se 4,000 rupaye kat gaye, lekin merchant ko payment nahi mila. Please check karo.",
  "Mere account se same payment do baar deduct hua hai.",
  "Mere card par suspicious transaction hua hai, please virtual card freeze kar do.",
];

function Live() {
  const customers = useTable("customers");
  const sessions = useTable("voice_sessions", "started_at");
  const qc = useQueryClient();
  const run = useServerFn(runTurn);
  const stt = useServerFn(transcribe);
  const tts = useServerFn(synthesize);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [customerId, setCustomerId] = useState("CUST-1001");
  const [sessionId, setSessionId] = useState<string>();
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [state, setState] = useState("idle");
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => () => { recRef.current?.stop(); audioRef.current?.pause(); }, []);

  async function speak(t: string, lang?: string) {
    try {
      setState("speaking");
      const r = await tts({ data: { text: t, language: lang ?? "auto" } });
      audioRef.current?.pause();
      const a = new Audio(`data:${r.mime};base64,${r.audioBase64}`);
      audioRef.current = a; await a.play();
      setEvents((e) => [...e, { stage: "completed", label: `Timbre speech ready (${r.latencyMs} ms)`, at: new Date().toLocaleTimeString() }]);
    } catch (e) { toast.error(`Voice playback: ${(e as Error).message}`); }
  }

  async function send(input: string, confirmFreeze = false, source: "mic" | "text" | "sample" = "text") {
    if (!input.trim()) return;
    if (!confirmFreeze) window.__lovableEvents?.track?.("project.voice_request", { source, customer_id: customerId });
    if (!confirmFreeze) setMsgs((m) => [...m, { who: "customer", text: input }]);
    setState("understanding"); setText("");
    try {
      const r = await run({ data: { sessionId, customerId, text: input, confirmFreeze } });
      setSessionId(r.needsConfirm ? r.sessionId : undefined);
      setNeedsConfirm(r.needsConfirm);
      const intentEv = r.events.find((x) => x.detail?.intent)?.detail;
      const outcome = r.needsConfirm ? "awaiting_confirmation" : (r.events.some((x) => x.stage === "escalated") ? "escalated" : r.events.some((x) => String(x.label).startsWith("Tool create_dispute_ticket success")) ? "dispute_created" : r.events.some((x) => String(x.label).startsWith("Tool freeze_virtual_card success")) ? "card_frozen" : "clarification");
      window.__lovableEvents?.track?.("project.intent_outcome", { intent: intentEv?.intent ?? "unknown", outcome, language: intentEv?.language ?? "unknown" });
      if (outcome === "dispute_created") window.__lovableEvents?.track?.("project.dispute_ticket_raised", { intent: intentEv?.intent ?? "unknown" });
      if (outcome === "card_frozen" && confirmFreeze) window.__lovableEvents?.track?.("project.card_freeze_confirmed", {});
      setEvents((e) => [...e, ...r.events.map((x) => ({ ...x, at: new Date().toLocaleTimeString() }))]);
      setMsgs((m) => [...m, { who: "agent", text: r.reply }]);
      setState(r.needsConfirm ? "awaiting_confirmation" : r.events.at(-2)?.stage === "escalated" ? "escalated" : "completed");
      void speak(r.reply, r.events.find((x) => x.detail?.language)?.detail?.language);
      qc.invalidateQueries();
    } catch (e) { setState("failed"); toast.error((e as Error).message); }
  }

  async function toggleMic() {
    if (listening) { const b64 = await recRef.current?.stop(); if (b64) await handleAudio(b64); return; }
    try {
      audioRef.current?.pause();
      const rec = await startWavRecording();
      recRef.current = rec; setListening(true); setState("listening");
      rec.autoStop.then((b64) => { if (b64) void handleAudio(b64); });
    } catch { toast.error("Microphone permission was denied."); }
  }

  async function handleAudio(b64: string) {
    setListening(false); setState("transcribing");
    try {
      const r = await stt({ data: { audioBase64: b64 } });
      setEvents((e) => [...e, { stage: "transcribing", label: `Prisma transcript (${r.latencyMs} ms, ${r.language ?? "lang ?"})`, at: new Date().toLocaleTimeString() }]);
      if (!r.transcript.trim()) { setState("idle"); toast.message("Didn't catch that — please speak again."); return; }
      await send(r.transcript, false, "mic");
    } catch (e) { setState("failed"); toast.error(`Transcription: ${(e as Error).message}`); }
  }

  const cust = customers.data?.find((c) => c.id === customerId);

  return (
    <div className="grid gap-4 xl:grid-cols-[260px_1fr_340px]">
      <Panel title="Sessions">
        <div className="mb-3">
          <label className="text-xs text-muted-foreground">Caller (demo customer)</label>
          <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setMsgs([]); setEvents([]); setSessionId(undefined); }} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm">
            {customers.data?.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.id}</option>)}
          </select>
        </div>
        <div className="max-h-[60vh] space-y-1.5 overflow-y-auto">
          {sessions.data?.slice(0, 20).map((s) => (
            <div key={s.id} className="rounded-md border px-2.5 py-2 text-xs">
              <div className="flex items-center justify-between"><span className="font-mono">{s.customer_id}</span><StatusBadge value={s.status} /></div>
              <p className="mt-1 text-muted-foreground">{s.workflow ?? "—"} · {s.language ?? "—"}</p>
              <p className="text-muted-foreground">{dt(s.started_at)}</p>
            </div>
          ))}
          {!sessions.data?.length && <p className="text-xs text-muted-foreground">No sessions yet.</p>}
        </div>
      </Panel>

      <Panel title="Live conversation" action={<div className="flex items-center gap-2"><StatusBadge value="ai_reasoning" /><StatusBadge value={state} /></div>}>
        <div className="flex h-[52vh] flex-col gap-3 overflow-y-auto pr-1">
          {!msgs.length && (
            <div className="m-auto max-w-md text-center text-sm text-muted-foreground">
              <p>Speak or type as the customer. Try a sample:</p>
              <div className="mt-3 grid gap-2">{SAMPLES.map((s) => <button key={s} onClick={() => send(s, false, "sample")} className="rounded-md border px-3 py-2 text-left text-xs hover:bg-accent">{s}</button>)}</div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.who === "customer" ? "self-end bg-primary/15" : "self-start border bg-background"}`}>
              <p className="mb-0.5 font-mono text-[10px] uppercase text-muted-foreground">{m.who}</p>{m.text}
            </div>
          ))}
        </div>
        {needsConfirm && (
          <div className="mt-3 flex items-center justify-between rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm">
            <span className="flex items-center gap-2 text-warning"><ShieldCheck className="h-4 w-4" />High-risk action needs explicit confirmation</span>
            <div className="flex gap-2"><Button size="sm" onClick={() => send("confirm freeze", true, "text")}>Confirm freeze</Button><Button size="sm" variant="ghost" onClick={() => { setNeedsConfirm(false); setSessionId(undefined); }}>Cancel</Button></div>
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="mt-3 flex gap-2">
          <Button type="button" size="icon" variant={listening ? "destructive" : "outline"} onClick={toggleMic} aria-label="Microphone">{listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</Button>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type what the customer says…" />
          <Button type="submit" size="icon" aria-label="Send"><Send className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant="ghost" onClick={() => audioRef.current?.pause()} aria-label="Stop audio"><Square className="h-4 w-4" /></Button>
        </form>
        <p className="mt-2 text-[11px] text-muted-foreground">Live: Gnani Prisma v3.0 transcribes (tap mic to start, tap again to send, max 28 s) and Timbre speaks replies. Intent reasoning runs on Lovable AI (rule fallback if unavailable); Evon can replace it once Gnani grants access.</p>
      </Panel>

      <div className="space-y-4">
        <Panel title="Customer">
          {cust ? <div className="space-y-1 text-sm"><p className="font-medium">{cust.name}</p><p className="font-mono text-xs text-muted-foreground">{cust.masked_account}</p><StatusBadge value={cust.verification_status} /></div> : "—"}
        </Panel>
        <TriagePanel initial={msgs.filter((m) => m.who === "customer").at(-1)?.text ?? ""} />
        <Panel title="Execution trace">
          <ol className="max-h-[44vh] space-y-2 overflow-y-auto">
            {events.map((e, i) => (
              <li key={i} className="border-l-2 border-primary/40 pl-3 text-xs">
                <div className="flex justify-between"><span className="font-medium">{e.label}</span><span className="font-mono text-muted-foreground">{e.at}</span></div>
                {e.detail != null && <pre className="mt-1 overflow-x-auto rounded bg-muted p-1.5 font-mono text-[10px] text-muted-foreground">{JSON.stringify(e.detail, null, 1)}</pre>}
              </li>
            ))}
            {!events.length && <p className="text-xs text-muted-foreground">Intent, tool calls and results appear here.</p>}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
