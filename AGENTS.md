<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Agent tool execution lives in src/lib/agent.functions.ts behind an allowlist and role check; the model never runs arbitrary actions. Why: authorization must not depend on AI output.
- Gnani calls go through src/lib/gnani.functions.ts (REST, X-API-Key-ID from GNANI_API_KEY). Live intent reasoning uses src/lib/triage.server.ts (Lovable AI) with rule fallback in src/lib/intent.ts until Evon access exists. Why: keys stay server-side and nothing pretends to be Evon.
- AI triage (src/lib/triage.functions.ts) only suggests actions via Lovable AI Gateway with a strict schema; execution stays in agent.functions.ts. Why: model output never triggers tools directly.
- Dispute status changes go through src/lib/disputes.functions.ts using rules in src/lib/dispute-rules.ts, logging to dispute_events and audit_logs. Why: one enforced state machine with a timestamped trail.

- Balance changes go only through DB functions apply_dispute_reversal / import_bank_data, each writing ledger_entries. Why: one atomic, auditable path; no client-side balance edits.
