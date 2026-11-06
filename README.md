<div align="center">

# 🎙️ VaaniOps

**Don't just talk to your enterprise. Get things done.**

A multilingual voice-to-action operations console for Indian banking. Customers speak in Hindi, Hinglish, Marathi or English, and VaaniOps transcribes the call, understands the issue, raises disputes or freezes cards through guarded tools, then confirms the result back in the customer's own voice. Every step goes into the audit trail.

[Live demo](https://vappiops.lovable.app) · [Architecture](#-system-architecture) · [Features](#-features) · [Getting started](#-getting-started)

![Landing page](docs/screenshots/landing.png)

</div>

---

## ✨ Features

| Area | What it does |
| --- | --- |
| **Live Operations** | Mic or typed input → Gnani **Prisma v3** speech-to-text → AI intent reasoning → allowlisted tool calls → Gnani **Timbre v2.5** spoken reply, with a live execution trace |
| **AI Issue Triage** | Paste a transcript; the model returns language, intent, amount, merchant, risk and a *suggested* next action. It only suggests and never executes anything |
| **Dispute Management** | Full state machine: open → assigned → investigating → resolved/rejected → closed, with timestamps, operator notes and customer chat |
| **My Queue** | Each operator's open tickets, pending actions, recent chat and a "request more tickets" button |
| **AI Agent Studio** | Drag-and-drop agent flows with versioning and a dry-run test console |
| **Balances & ledger** | CSV import of real customers and transactions. Approved reversals credit balances through atomic database functions that write `ledger_entries` |
| **Team & Roles** | Admin / operator / viewer roles kept in a protected table and checked on the server |
| **Operator Performance** | Who claimed which ticket, when, and what they did, with per-operator metrics |
| **3D command center** | Real-time WebGL: a morphing glass orb, scroll-driven storytelling, interactive 3D bar and donut charts |
| **Audit & Security** | Append-only audit log and security events. Row-level security on every table |

## 📸 Screenshots

| Overview (3D charts) | Live Operations |
| --- | --- |
| ![Overview](docs/screenshots/overview.png) | ![Live Operations](docs/screenshots/live.png) |
| **AI Issue Triage** | **Dispute Management** |
| ![Triage](docs/screenshots/triage.png) | ![Disputes](docs/screenshots/disputes.png) |
| **My Queue** | **AI Agent Studio** |
| ![My Queue](docs/screenshots/my-queue.png) | ![Agent Studio](docs/screenshots/agents.png) |
| **Operator Performance** | **Integrations** |
| ![Performance](docs/screenshots/performance.png) | ![Integrations](docs/screenshots/integrations.png) |

## 🏗 System architecture

```mermaid
flowchart LR
  subgraph Browser["Operator console (React 19 + TanStack Router)"]
    MIC[Mic / WAV recorder]
    UI[Live Ops · Triage · Disputes · Queue · Studio]
    R3F[Three.js / R3F 3D scenes]
  end

  subgraph Server["Server functions (TanStack Start on edge workers)"]
    GN[gnani.functions<br/>STT + TTS proxy]
    TR[triage.server<br/>AI intent reasoning]
    AG[agent.functions<br/>allowlist + role check]
    DS[disputes.functions<br/>state machine]
    TM[team.functions<br/>role admin]
  end

  subgraph External
    PRISMA[(Gnani Prisma v3<br/>speech-to-text)]
    TIMBRE[(Gnani Timbre v2.5<br/>text-to-speech)]
    AI[(Lovable AI Gateway)]
  end

  subgraph DB["Postgres + Row-Level Security"]
    T1[(customers · cards · transactions)]
    T2[(disputes · dispute_events · dispute_messages)]
    T3[(ledger_entries · audit_logs · security_events)]
    T4[(user_roles · agents · agent_versions)]
  end

  MIC --> GN --> PRISMA
  GN --> TIMBRE
  UI --> TR --> AI
  UI --> AG --> T1
  AG --> T2
  UI --> DS --> T2
  DS -- apply_dispute_reversal --> T3
  TM --> T4
  AG --> T3
```

### The voice-to-action pipeline

```mermaid
sequenceDiagram
  participant C as Customer
  participant P as Prisma STT
  participant R as AI reasoning
  participant A as Agent (allowlist)
  participant D as Database
  participant T as Timbre TTS
  C->>P: "UPI se ₹4,000 kat gaye…"
  P->>R: transcript (hi-IN)
  R->>A: intent=failed_upi, amount=4000, merchant
  A->>D: verify customer · search txn · check eligibility
  A->>D: create_dispute_ticket (+ audit log)
  A->>T: confirmation text
  T->>C: spoken reply in Hindi
```

### Safety principles

- **The model never executes anything.** AI output is parsed against a strict schema and only *suggests* an action. Every tool runs through an allowlist in `src/lib/agent.functions.ts` with an independent role check.
- **Card freezes need confirmation.** The customer has to confirm before `freeze_virtual_card` runs, and Agent Studio rejects any flow without a confirm step.
- **One path for money.** Balances change only through the `apply_dispute_reversal` and `import_bank_data` database functions. Both are atomic and both write `ledger_entries`.
- **One enforced dispute state machine** (`src/lib/dispute-rules.ts`). Every transition is timestamped in `dispute_events` and `audit_logs`.
- **Keys stay server-side.** The Gnani key is read only inside server handlers.

## 🧰 Tech stack

- **Frontend:** React 19, TanStack Start / Router / Query, Tailwind CSS v4, shadcn/ui
- **3D & motion:** three.js, @react-three/fiber, @react-three/drei, SVG path morphing, scrollytelling
- **Backend:** TanStack server functions on edge workers, Postgres with row-level security, auth (email, Google)
- **Voice:** Gnani Prisma v3 (STT) and Timbre v2.5 (TTS)
- **AI:** Lovable AI Gateway with structured output; rule-based fallback in `src/lib/intent.ts`
- **Tests:** Vitest (`dispute-rules`, `intent`, `csv-import`, routing)

## 📁 Project structure

```text
src/
├── routes/
│   ├── index.tsx              # 3D landing page + scrollytelling
│   ├── auth.tsx               # sign in / sign up
│   └── _authenticated/        # console: overview, live, triage, disputes, my-queue,
│                              # agents, performance, team, import, integrations, …
├── components/
│   ├── three/                 # MorphScene (morphing orb), Charts3D (3D bars & donut)
│   ├── MorphMark.tsx          # SVG shape-morphing step icon
│   ├── kit.tsx                # Panel, Stat, DataTable, StatusBadge
│   └── ui/                    # shadcn components
└── lib/
    ├── gnani.functions.ts     # Prisma / Timbre proxy
    ├── triage.server.ts       # AI intent reasoning
    ├── agent.functions.ts     # allowlisted tool execution
    ├── disputes.functions.ts  # dispute workflow
    ├── dispute-rules.ts       # state machine (tested)
    ├── csv-import.ts          # bank data import (tested)
    └── wav-recorder.ts        # browser mic → WAV
```

## 🚀 Getting started

```bash
bun install
bun run dev        # http://localhost:8080
bunx vitest run    # tests
```

Server-side secrets the app uses: `GNANI_API_KEY` (Gnani Vachana key) and `LOVABLE_API_KEY` (AI gateway). Never commit them.

The first account to sign up becomes **admin**. Admins assign the operator and viewer roles on the **Team & Roles** page.

## 🗺 Roadmap

- [ ] Gnani **Evon** native intent model (waiting on beta endpoint access)
- [ ] Real-time streaming STT/TTS relay (needs an always-on socket server)
- [ ] Telephony (Exotel / Twilio) for real inbound calls
- [ ] Core-banking integration (balances currently live inside VaaniOps)

## 📄 License

Proprietary. All rights reserved.

## GitHub snapshot

This public repository is a source snapshot exported from Lovable. It is not linked to automatic two-way Git sync. Private environment files and operator email addresses in screenshots are excluded.
