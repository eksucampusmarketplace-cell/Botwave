# Launch Docs — Cosa Nostra Tycoon

Operational playbook docs for the launch sequence laid out in
[`docs/design/cosa-nostra-design.md`](../design/cosa-nostra-design.md)
§33 (Distribution & launch playbook). Live, editable templates — keep
them updated as we learn from each outreach round.

## Contents

- [`partner-cold-dm.md`](./partner-cold-dm.md) — DM templates,
  cadence, anti-patterns, and tracking SQL for Week 2-3 partner
  outreach (§33.2). Goal: 2-3 LOIs to satisfy the §33.4 G1 gate.
- [`partner-deck.md`](./partner-deck.md) — one-page deck attached to
  LOI conversations. Designed to be read in 90 seconds and forwarded
  as a screenshot.

## Adjacent assets (different surface, same launch)

- Coming-soon lander: [`/tycoon`](../../app/tycoon/page.tsx). Captures
  signups into `tycoon_signups` for the §33.4 G0 demand-validation
  gate.
- Live mockup users see in DMs: [`public/miniapp/tycoon-mockup.html`](../../public/miniapp/tycoon-mockup.html).
- Bot command surface: [`bot/telegram/handlers/miniapps.ts`](../../bot/telegram/handlers/miniapps.ts)
  (`/games`, `/tycoon`, `/cosanostra`, `/mafia`).
