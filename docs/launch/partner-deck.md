# Cosa Nostra Tycoon — Partner Bot Deck

> **What this is**: the one-page deck you attach to LOI conversations
> with other Telegram bot operators. Pair with
> [`partner-cold-dm.md`](./partner-cold-dm.md). Designed to be read in
> 90 seconds and forwarded as a screenshot.
>
> **Who this is for**: bot operators with ≥5k DAU who'd add a `/play`
> command in exchange for 70 % rev-share on attributed Stars revenue.

---

## What we're shipping

**Cosa Nostra Tycoon** — a Telegram Mini App game. Mafia tycoon /
city-builder loop, multiplayer raids, server-authoritative combat,
monetized natively with Telegram Stars.

- **Zero install.** Opens in 2 seconds from any TG chat.
- **Already playable.** Combat math, casualty resolution, training
  queues, clinic flow — all working in the mockup. Backend foundation
  in flight, V1 in 8-10 weeks.
- **Monetization built-in.** Stars IAP for gems and a $4.99 "Capo Pass"
  weekly battle pass. Adsgram-style rewarded video for free energy.
- **Group = family.** The Telegram group your users already chat in
  becomes their war room. No new app to install, no new chat to check.

Live mockup: **[your link with `?src=partner-bot:<their_tag>`]**

---

## Why your users want this

Telegram games are the highest-retention surface on the platform
right now (Notcoin → Hamster Kombat → Catizen all proved it). What
Cosa Nostra Tycoon adds vs that wave:

- **PvP that matters.** Other tap-to-earn games burn out in 3 weeks
  because there's no second-week loop. We have raids, families, city
  control — the kind of stuff Mafia City did to billions in revenue,
  but at TG-mini-app friction.
- **Identity through your group.** Your group's name on the leaderboard,
  your community's R5 boss on the city council. We turn social capital
  into game capital and back.

---

## Why you want this (the deal)

| | Standard | First-three partners |
|---|---|---|
| **Rev-share on Stars** | 50 / 50 | **70 / 30 in your favor** |
| **Term** | 12 months | 6 months at 70/30, then standard |
| **Launch leaderboard slot** | Waitlist | **Reserved** |
| **Integration work on your side** | Zero (we ship the handler) | Zero |
| **Attribution** | Per-user via `?src=partner-bot:<your_tag>` | Same |
| **Reporting** | Monthly Stars + DAU CSV | Same + weekly during launch month |
| **Cancellation** | 30-day notice | 30-day notice |

> "Zero integration" = we hand you a 40-line `grammy` (or `telegraf`,
> or pyrogram) snippet for a `/play` (or `/tycoon`, your call) command
> that posts a single inline button opening the WebApp. You paste it,
> deploy, done.

---

## What we're asking from you

1. **Add a `/play` (or equivalent) command** to your bot pointing at
   the WebApp URL with your `?src=partner-bot:<tag>`. (Snippet provided.)
2. **One announce DM** to your user base on launch week with a link.
   We write the copy; you click send.
3. **(Optional, recommended)** Your bot's name appears on the in-game
   "Partnered Bots" panel and the launch leaderboard.

That's it. No engineering, no API integration, no shared databases,
no auth handshake. The WebApp handles its own auth via Telegram
`initData`.

---

## What we're bringing

- **Game.** Designed, mocked-up, balanced. V1 backend in flight.
  Mockup [link].
- **Backend ops.** Hosting, scaling, RLS, server-tick worker,
  combat resolver, Stars webhook, Adsgram callback. You don't host
  anything.
- **Distribution.** Botwave's existing bot user base is the launch
  cohort. Your users compound on top — they're not the entire pipeline.
- **Live ops.** Daily quests, events, season rotation. We hire a game
  designer at 5k MAU per the launch plan; until then, scope is
  intentionally narrow.

---

## What success looks like (and what failure looks like)

We will not pretend this is a sure thing. The KPI gates from our
internal launch plan, that we will share with you:

| Gate | Condition | If green | If red |
|---|---|---|---|
| **G0 — Demand** | Lander tap-through ≥ 10 % of bot DAU + signup ≥ 30 % of taps | Continue to backend build | Re-plan distribution; you're not on the hook |
| **G1 — Partners** | 2-3 LOIs (this one!) signed by Week 3 | Launch with B2B2C | Botwave-only launch; you're still in |
| **G2 — Retention** | D7 ≥ 25 % | Build V1.1 (families, war scoring) | Only fix funnel; no new mechanics |
| **G3 — Monetization** | ARPDAU ≥ $0.05 | Build V2 (city, battle pass) | No Tier 3+ paid acquisition |

If we hit G3, the partnership 6-month renewal at 50/50 makes sense for
both sides. If we don't, the deal expires honestly and you've
shipped one extra command for your users.

---

## Why we're a credible counterparty

- **Botwave** — free WhatsApp + Telegram bot platform, 5k+ users,
  150+ commands, multi-tenant infra running today.
  [botwave.online](https://www.botwave.online).
- **Engineering surface** — Postgres + Supabase + Next.js + grammy bots,
  CI + RLS + service-role auth, multi-bot session manager, 65+ migrations.
  Nothing we're proposing here is novel architecture for us.
- **Mockup is real, not a Figma.** Open it on your phone right now,
  send units into a raid, get casualties back. The combat math you
  see is the same math the server will run after V1.

---

## Numbers, the honest version

- **D1 / D7 from mockup test cohort**: _TBD — measured at launch.
  No, we don't have it yet. Yes, we're aware that's the number you
  care about._
- **ARPDAU we're modelling**: $0.05-0.12 based on TG mini-game
  comparables in our region. Below $0.05 we slow paid acquisition.
- **Time to launch**: 8-10 weeks from V1 backend kickoff, gated on G0/G1.
- **Stars payout cycle**: ~14 days from Telegram → wallet, then
  monthly settlement to you. First payout 30-45 days post-launch
  depending on Stars batch timing.

---

## What happens next

1. You sign the LOI (one page, 30-day exit).
2. We send you the bot snippet and your attribution tag.
3. We send you the announce-DM copy two weeks before launch.
4. Launch week: you send the DM, we send you the daily traffic + Stars
   report.
5. Month 2: first attribution payout, signed cashflow report, then
   monthly thereafter.

---

## Contact

[Owner name] · [your TG handle] · [your email]

Live mockup again: **[your link]**
