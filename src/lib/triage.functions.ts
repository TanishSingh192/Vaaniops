import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
export type { Triage } from "./triage-schema";

export const triageIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { transcript: string }) => {
    const t = (d?.transcript ?? "").trim();
    if (t.length < 3 || t.length > 4000) throw new Error("Enter between 3 and 4000 characters.");
    return { transcript: t };
  })
  .handler(async ({ data }) => {
    const { classifyIssue } = await import("./triage.server");
    return classifyIssue(data.transcript);
  });
