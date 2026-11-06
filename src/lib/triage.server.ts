import { INSTRUCTIONS, TriageSchema, type Triage } from "./triage-schema";

// Lovable AI Gateway reasoning: classifies a transcript into a strict schema.
export async function classifyIssue(transcript: string): Promise<{ triage: Triage; latencyMs: number }> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured.");
  const { createOpenAI } = await import("@ai-sdk/openai");
  const { streamText, Output } = await import("ai");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const t0 = Date.now();
  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      instructions: INSTRUCTIONS,
      messages: [{ role: "user", content: `Customer transcript:\n"""${transcript}"""` }],
      output: Output.object({ schema: TriageSchema }),
      maxRetries: 0,
      providerOptions: {
        openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
      },
    });
    const out = (await result.output) as Triage;
    return { triage: out, latencyMs: Date.now() - t0 };
  } catch (e) {
    const err = e as { statusCode?: number; message?: string };
    console.error("triage failed", err?.statusCode, err?.message);
    if (err?.statusCode === 429) throw new Error("AI is rate limited. Try again shortly.");
    if (err?.statusCode === 402) throw new Error("AI credits are exhausted for this workspace.");
    if (err?.statusCode === 403) throw new Error("AI access was denied for this request.");
    throw new Error("The AI couldn't analyse this issue. Please try again.");
  }
}
