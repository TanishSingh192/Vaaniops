import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Panel, StatusBadge } from "@/components/kit";
import { meta } from "@/lib/meta";
import { useServerFn } from "@tanstack/react-start";
import { synthesize } from "@/lib/gnani.functions";
import { toast } from "sonner";
export const Route = createFileRoute("/_authenticated/voice")({ head: meta("Voice Studio", "Voice output settings."), component: P });
function P() {
  const [lang, setLang] = useState("hi-IN"); const [rate, setRate] = useState([1]);
  const [text, setText] = useState("Namaste, main VaaniOps hoon. Aapki kya madad kar sakti hoon?");
  const tts = useServerFn(synthesize); const [voice, setVoice] = useState("Nalini"); const [busy, setBusy] = useState(false);
  async function play() {
    setBusy(true);
    try { const r = await tts({ data: { text, language: lang, voice, speed: rate[0] ?? 1 } }); await new Audio(`data:${r.mime};base64,${r.audioBase64}`).play(); toast.success(`Synthesised in ${r.latencyMs} ms`); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return (<><PageHeader title="Voice Studio" desc="Live Gnani Timbre voice output." />
    <Panel title="Preview" action={<StatusBadge value="configured" />}>
      <div className="grid gap-4 md:grid-cols-2">
        <div><label className="text-xs text-muted-foreground">Language</label>
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm">
            <option value="auto">Auto-detect</option><option value="hi-en">Hinglish</option><option value="hi-IN">Hindi</option><option value="mr-IN">Marathi</option><option value="en-IN">English (India)</option></select></div>
        <div><label className="text-xs text-muted-foreground">Voice (Timbre v2.5)</label>
          <select value={voice} onChange={(e) => setVoice(e.target.value)} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm">{["Nalini", "Kaveri", "Deepak"].map((v) => <option key={v}>{v}</option>)}</select></div>
        <div><label className="text-xs text-muted-foreground">Speaking speed · {(rate[0] ?? 1).toFixed(1)}×</label><Slider className="mt-3" min={0.85} max={1.15} step={0.05} value={rate} onValueChange={setRate} /></div>
      </div>
      <Textarea className="mt-4" value={text} onChange={(e) => setText(e.target.value)} />
      <Button className="mt-3" onClick={play} disabled={busy}>{busy ? "Synthesising…" : "Play with Timbre"}</Button>
    </Panel></>);
}
