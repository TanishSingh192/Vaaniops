import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Reports only whether server-side secrets are present — never their values.
export const getIntegrationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const has = (k: string) => Boolean(process.env[k]);
    const svc = (keys: string[]) => ({ configured: keys.every(has), missing: keys.filter((k) => !has(k)) });
    // Live check: a tiny Timbre request proves the Gnani key works right now.
    let gnaniLive = false;
    if (has("GNANI_API_KEY")) {
      try {
        const r = await fetch("https://api.vachana.ai/api/v1/tts/inference", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-API-Key-ID": process.env["GNANI_API_KEY"]! },
          body: JSON.stringify({ text: "ok", voice: "Nalini", model: "timbre-v2.5", language: "en", audio_config: { sample_rate: 24000, num_channels: 1, container: "mp3", bitrate: "64k" } }),
        });
        gnaniLive = r.ok;
      } catch { gnaniLive = false; }
    }
    const gnani = { configured: gnaniLive, missing: has("GNANI_API_KEY") ? (gnaniLive ? [] : ["working GNANI_API_KEY"]) : ["GNANI_API_KEY"] };
    return {
      prisma: gnani,
      timbre: gnani,
      // Evon hosted API is closed beta; AI reasoning runs in its place until an endpoint is added.
      evon: has("GNANI_EVON_ENDPOINT") ? gnani : { configured: true, missing: [] as string[], fallback: true },
      database: { configured: has("SUPABASE_URL"), missing: [] as string[] },
      sentry: svc(["SENTRY_DSN"]),
      posthog: svc(["POSTHOG_KEY"]),
    };
  });
