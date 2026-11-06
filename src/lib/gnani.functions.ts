import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Gnani Speech APIs — docs.gnani.ai. Key stays server-side (GNANI_API_KEY).
const BASE = "https://api.vachana.ai";

function key() {
  const k = process.env["GNANI_API_KEY"];
  if (!k) throw new Error("Gnani key is not configured.");
  return k;
}

function gnaniError(status: number, body: string) {
  try {
    const j = JSON.parse(body);
    const m = j?.detail?.message ?? j?.error?.message ?? j?.message;
    if (status === 429) return "Gnani is busy with another request. Try again in a moment.";
    if (status === 402) return "Gnani account has insufficient credit.";
    if (status === 401 || status === 403) return `Gnani rejected the key: ${m ?? status}`;
    return m ?? `Gnani error ${status}`;
  } catch { return `Gnani error ${status}`; }
}

function b64ToBytes(b64: string) {
  const bin = atob(b64); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64(bytes: Uint8Array) {
  let s = ""; const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode(...bytes.subarray(i, i + CH));
  return btoa(s);
}

/** Prisma v3.0 REST transcription — WAV up to 30 s. */
export const transcribe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { audioBase64: string; languages?: string }) => {
    if (typeof d.audioBase64 !== "string" || d.audioBase64.length > 8_000_000) throw new Error("Audio too large");
    return d;
  })
  .handler(async ({ data }) => {
    const fd = new FormData();
    fd.append("audio_file", new Blob([b64ToBytes(data.audioBase64)], { type: "audio/wav" }), "speech.wav");
    fd.append("model", "prisma-v3.0");
    fd.append("language_code", data.languages ?? "hi-IN,en-IN,mr-IN");
    const t0 = Date.now();
    const res = await fetch(`${BASE}/stt/v3`, { method: "POST", headers: { "X-API-Key-ID": key() }, body: fd });
    const body = await res.text();
    if (!res.ok) throw new Error(gnaniError(res.status, body));
    const j = JSON.parse(body);
    if (!j.success) throw new Error(j?.error?.message ?? "Transcription failed");
    return { transcript: String(j.transcript ?? ""), language: (j.detected_language_code as string) ?? null, latencyMs: Date.now() - t0 };
  });

/** Timbre REST synthesis — returns MP3 as base64. */
export const synthesize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { text: string; language?: string; voice?: string; speed?: number }) => {
    if (!d.text || d.text.length > 1500) throw new Error("Text missing or too long");
    return d;
  })
  .handler(async ({ data }) => {
    const t0 = Date.now();
    const res = await fetch(`${BASE}/api/v1/tts/inference`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key-ID": key() },
      body: JSON.stringify({
        text: data.text, voice: data.voice ?? "Nalini", model: "timbre-v2.5",
        language: data.language ?? "auto",
        speed: Math.min(1.15, Math.max(0.85, data.speed ?? 1)),
        audio_config: { sample_rate: 24000, num_channels: 1, container: "mp3", bitrate: "64k" },
      }),
    });
    if (!res.ok) throw new Error(gnaniError(res.status, await res.text()));
    const bytes = new Uint8Array(await res.arrayBuffer());
    return { audioBase64: bytesToB64(bytes), mime: "audio/mpeg", latencyMs: Date.now() - t0 };
  });
