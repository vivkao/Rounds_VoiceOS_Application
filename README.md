# Rounds - VoiceOS Application

A voice-native shift assistant for skilled nursing facilities, built on **VoiceOS** with a **Convex** backend.

Built at the VoiceOS Hackathon · 8/9/2026 · Frontier Tower, SF

---

## The problem

Skilled nursing facilities run on chronic understaffing. A single nurse or med tech on an evening shift may be responsible for 20–30 residents, each with their own room, medication schedule, allergies, and standing orders.

The information they need exists — it's in the facility's system. The problem is access cost. To answer "what room is Mrs. Chen in and what's she due for?" a nurse has to walk to a workstation, log in, search, click through tabs, and log out — mid-pass, on a floor, with gloves on.

That gap is where medication errors, missed doses, and wrong-room incidents live.

**The insight:** nurses don't need a better database. They need a zero-friction way to query and write to the database they already have, using the one input channel that's free while their hands are busy — voice.

## What this is

Floor lets nursing staff ask for a resident's room, allergies, and status; check what medications are due; and log a medication as given — all by voice, with a confirmation card rendering the **Five Rights** (right patient, right drug, right dose, right route, right time) before anything is written.

VoiceOS's confirmation-before-action model isn't a UX detail here — it's the medication safety control. Every write passes through a card the nurse must approve before it commits.

## Features

| Tool | Type | What it does |
|---|---|---|
| `find_resident` | Read-only | Look up a resident by name — room, allergies, fall risk, code status, and a floor diagram showing their room among nearby rooms |
| `get_due_meds` | Read-only | List medications due this hour, optionally filtered by resident |
| `check_med_administration` | Read-only | Run the Five Rights, allergy-conflict, and duplicate-dose check for one medication *before* it's given |
| `log_med_administration` | Confirm-gated write | Commit a checked dose as given — only callable after a verified check, with VoiceOS asking for voice confirmation first |
| `draft_family_update` | Read-only | Draft a short, factual family update from real logged data (medications given, open flags) — preview only, does not send |
| `restart_mcp_server` | Ask permission | Restarts the local MCP process so it reloads the latest code and Convex data |

## Why VoiceOS specifically

| VoiceOS property | Why it matters here |
|---|---|
| Push-to-talk, user-initiated | Matches the actual workflow — nurse asks when nurse needs to know. No ambient listening in a room full of PHI. |
| Read-only tools skip confirmation | Lookups are instant — "What room is Chen in?" answers in one beat. |
| Actions render a confirmation card first | This is the product. Every medication log passes through a Five Rights card the nurse approves before anything writes. |
| Lives system-wide on the workstation | Nursing stations already have a computer. No new hardware to procure. |
| Custom widgets (sandboxed HTML) | Resident cards, med-pass status, and the floor diagram get real UI, not just text. |

## Architecture

```
Nurse (voice)
   │  press-to-talk
   ▼
VoiceOS agent ──selects tool──▶ MCP server (this repo, server.ts)
   ▲                                  │
   │                                  ▼
   └──── card / widget ────────  Convex backend (schema, queries, mutations)
```

The MCP server (`server.ts`) is a thin layer: it calls Convex functions over HTTP and renders the response as a styled card. All state — residents, medication orders, administration events, family contacts — lives in Convex. In production, the same shape of handlers would call an EHR adapter (e.g. PointClickCare, MatrixCare) instead of Convex; the interface to VoiceOS wouldn't change.

## Data model

Seeded with a small set of residents, deliberately including:

- One resident with a **penicillin allergy** and a penicillin-class drug in the demo path — triggers the allergy-conflict block
- One resident who **already received** a scheduled dose — triggers the duplicate-dose block
- One resident with an **authorized family contact** on file — enables the family update draft
- Two residents with **similar names** in different wings

```
residents:    id, name, room, wing, dob, allergies[], codeStatus,
              fallRisk, diet, standingNotes[], familyContact?
medOrders:    residentId, drug, dose, route, frequency,
              scheduledTimes[], prn, maxDaily
adminEvents:  residentId, medOrderId, givenAt, givenBy,
              status (given | refused | held | missed), note?
flags:        residentId, raisedBy, at, urgency, reason, resolved
```

## Tech stack

- **VoiceOS** — voice orchestration, tool routing, confirmation-card rendering
- **Convex** — schema, queries, mutations, live backend
- **TypeScript** — MCP server tool handlers (`server.ts`)
- **Model Context Protocol (MCP)** — the interface between VoiceOS and this server

## Project structure

This project spans two repos:

- **This repo** — the Convex backend: schema, seed data, and query/mutation functions
- **`facility-emar-mcp`** *(or wherever your MCP server repo lives)* — the VoiceOS MCP server: tool registration, card rendering, and the Convex client calls

## Running it locally

```bash
# 1. Install dependencies
npm install

# 2. Start Convex (leave running — watches for changes)
npx convex dev

# 3. Seed demo data (run once from the Convex dashboard,
#    Functions tab → seed:seedData → Run)
```

The MCP server connects to your Convex deployment URL (set in `server.ts`) and is loaded into VoiceOS via Integration Studio.

## What's out of scope (by design)

- **Real EHR integration** — this is a voice layer, not a system of record
- **Real PHI** — the demo runs entirely on synthetic, fictional residents
- **Authentication, role permissions, audit trail** — sketched in the architecture, not built for this demo
- **Real message sending** — `draft_family_update` previews a message; it does not send email or SMS
- **Mobile/handheld** — workstation only

## Honest answers to the hard questions

**Is this HIPAA compliant?**
No, and we're not claiming it is. The demo runs on synthetic residents. Production would require a BAA with the transcription provider, on-premise or BAA-covered STT, an immutable audit log, and role-based access — a compliance workstream, not a technical unknown.

**Aren't nurses speaking PHI out loud?**
Scoped to the med room and nursing station, not resident rooms. Verbal handoff between nurses is already standard practice in every facility in the country — we're not introducing a new exposure category.

**Don't facilities already have an eMAR with barcode scanning?**
Yes, and we don't replace it. Barcode scanning requires the cart, the scanner, and a free hand. We're the layer for the rest of the shift — lookup, observation charting, and handoff — where staff currently rely on memory and paper.

**Will voice recognition work in a noisy facility?**
A real risk, not hand-waved. The confirmation card is the mitigation — a misheard command surfaces as a wrong card, not a wrong write.

## Roadmap

The wedge is charting, not lookup. Voice-driven documentation is the single most-complained-about part of a nursing shift. Lookup gets the tool in the door; voice charting is what a facility would actually pay for.

Build order after this hackathon: EHR adapter → voice charting → audit log → BAA → pilot with one facility.

## Team

- Convex / backend
- VoiceOS / MCP integration
- UI/UX design
- Video & demo

---

*Built in a single day. Demo data is entirely synthetic — no real patient information was used at any point.*
