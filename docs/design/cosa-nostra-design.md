# Cosa Nostra Tycoon — Master Design Document

> **Status:** Living design spec, v0.4
> **Owner:** @eksucampusmarketplace
> **Scope:** Telegram Mini App tycoon/mob game built on top of Botwave's
> multi-bot platform. Player ↔ Family (TG group) ↔ City ↔ World hierarchy,
> Mafia-City-style mechanics, real server-authoritative state, Telegram Stars
> IAP + Adsgram rewarded video monetization.
>
> **Mockup:** [`public/miniapp/tycoon-mockup.html`](../../public/miniapp/tycoon-mockup.html)
> · Live, data-driven, playable (raid, casualties, clinic, power breakdown).
>
> **Related docs:** [`docs/mockups/tycoon-mockup.md`](../mockups/tycoon-mockup.md)
> · [`docs/SCALING_ARCHITECTURE.md`](../SCALING_ARCHITECTURE.md)

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Vision & differentiation](#2-vision--differentiation)
3. [Core gameplay loop](#3-core-gameplay-loop)
4. [The 5-minute hook (onboarding)](#4-the-5-minute-hook-onboarding)
5. [Game world hierarchy](#5-game-world-hierarchy)
6. [Role-based access (Users / Admins / Owners)](#6-role-based-access-users--admins--owners)
7. [State model — real data, no fakes](#7-state-model--real-data-no-fakes)
8. [The Player & Hero](#8-the-player--hero)
9. [Buffs & multipliers — the stack](#9-buffs--multipliers--the-stack)
10. [Troops & troop tiers](#10-troops--troop-tiers)
11. [Street Forces (extension layer)](#11-street-forces-extension-layer)
12. [Companies (businesses)](#12-companies-businesses)
13. [Buildings & upgrades](#13-buildings--upgrades)
14. [Combat engine](#14-combat-engine)
15. [The City — real PvP, not bots](#15-the-city--real-pvp-not-bots)
16. [Turf system](#16-turf-system)
17. [Mayor Election](#17-mayor-election)
18. [Family system — create / join / leave / dissolve](#18-family-system--create--join--leave--dissolve)
19. [Family operations — bank, research, quests, boss](#19-family-operations--bank-research-quests-boss)
20. [Wars (Family vs Family, City vs City)](#20-wars-family-vs-family-city-vs-city)
21. [Cross-bot tournaments](#21-cross-bot-tournaments)
22. [Story Mode](#22-story-mode)
23. [Statistics — what is tracked](#23-statistics--what-is-tracked)
24. [Monetization — Stars IAP](#24-monetization--stars-iap)
25. [Monetization — Adsgram rewarded video](#25-monetization--adsgram-rewarded-video)
26. [Triggered offers & Battle Pass](#26-triggered-offers--battle-pass)
27. [Anti-pay-to-win principles](#27-anti-pay-to-win-principles)
28. [Telegram integration](#28-telegram-integration)
29. [Backend architecture](#29-backend-architecture)
30. [Where to improve from the current mockup](#30-where-to-improve-from-the-current-mockup)
31. [Roadmap](#31-roadmap)
32. [Project assessment & risk audit](#32-project-assessment--risk-audit)
33. [Distribution & launch playbook](#33-distribution--launch-playbook)
34. [Open design questions](#34-open-design-questions)
35. [Glossary](#35-glossary)

---

## 1. Executive summary

**Cosa Nostra Tycoon** is a Telegram Mini App that delivers the full Mafia
City gameplay experience — build a hideout, train troops, raid rival players,
join a family (alliance), capture turfs in a shared city, fight cross-city
wars — but with three structural advantages over Mafia City:

1. **Telegram-native social graph.** A Telegram group registers as a Family;
   group chat is family chat; group admins are family officers. No
   bespoke chat or alliance infrastructure to build — TG provides it for
   free, and it's the chat people already check.
2. **Zero-install Mini App.** Players open the game from any chat in 2
   seconds — no app store, no download, no install commitment. Loads
   instant; viral by default.
3. **Cross-bot platform (Botwave).** Multiple bots can run instances of the
   game and compete in shared cross-bot tournaments. Bot operators gain a
   high-retention game inside their bot; players get a richer ecosystem.
   The platform compounds liquidity.

Art direction is stylized 2D cartoon with anthropomorphic mob animals (Don
Rattori the rat, Tony Whiskers the cat, Big Pidge the pigeon underboss).
This is gameplay-agnostic — every Mafia City mechanic ports over directly.

Monetization is Telegram Stars (native, 1-tap, no card flow) plus Adsgram
rewarded video, with a Capo Pass subscription as the headline LTV driver
and a seasonal Battle Pass as the long-tail engagement layer.

---

## 2. Vision & differentiation

| Pillar | Mafia City (today) | Cosa Nostra Tycoon |
|---|---|---|
| Install | 1–2 GB native app, store install required | Zero-install Mini App, opens from any TG chat |
| Social | In-app alliance chat (mostly empty) | Real TG group chat — players already there |
| Distribution | Paid ads, App Store ranking | Telegram bot virality + cross-bot promo |
| Onboarding | First raid ~24 h in, mostly tutorials | First raid ≤ 5 min, real PvP from session 1 |
| Push | Push notifications (60 % muted) | TG bot DM (read rate >90 %) |
| Monetization | USD card IAP, slow card-add | Telegram Stars (1-tap) + Adsgram |
| Art | Realistic 3D humans (heavy) | Stylized 2D cartoon animals (light, memeable) |
| Anti-cheat | Server-authoritative, but bot-farmed | Server-authoritative + TG account age signal |
| Cross-server events | KvK between states | Cross-city KvK + cross-bot tournaments |

**Strategic insight:** the killer feature is **the TG group ↔ family
identity**. Players don't leave because their friends are in the group.
Mafia City spent millions building chat that nobody used; we use the chat
that everyone uses anyway.

---

## 3. Core gameplay loop

```
                       ┌───────────────────┐
                       │  Collect income   │  ← idle businesses
                       │  from Empire      │  ← tap COLLECT every 2-8h
                       └─────────┬─────────┘
                                 │
                                 ▼
            ┌──────────────────────────────────────────┐
            │  Upgrade buildings / Train troops /      │  ← spend coins, gems, time
            │  Research / Equip hero gear              │
            └──────────────────────────┬───────────────┘
                                       │
              ┌────────────────────────┴───────────────────────┐
              ▼                                                ▼
   ┌────────────────────┐                          ┌────────────────────┐
   │  PvE              │                          │  PvP                │
   │  Story missions    │                          │  Raid city players  │
   │  Family Boss       │                          │  Capture turfs      │
   │  Street Forces ops │                          │  Family wars        │
   │  Mayor election    │                          │  Cross-city KvK     │
   └─────────┬──────────┘                          └────────┬────────────┘
             │                                              │
             └──────────────────────────┬───────────────────┘
                                        ▼
                          ┌──────────────────────────┐
                          │  Earn coins / XP / rep /  │
                          │  war points / gear        │
                          └────────────┬──────────────┘
                                       │
                                       ▼
                          ┌──────────────────────────┐
                          │  Push into a new family   │
                          │  tier / Hero level /      │
                          │  HQ tier / Building tier  │
                          └──────────────────────────┘
                                       │
                                       ▼
                          (loop back to top, with bigger numbers)
```

**The loop is fractal**: same loop at HQ 1 (collect 200 coins, raid for 50
coins) and at HQ 25 (collect 200M coins, raid for 50M coins). Each tier
just scales the numbers and unlocks new layers (Street Forces at HQ 5,
Mayor candidacy at HQ 15, KvK at HQ 18, etc).

---

## 4. The 5-minute hook (onboarding)

Mafia City's onboarding is brutal — the first 4 hours feel like tutorials.
Cosa Nostra Tycoon must hook within **5 minutes**:

| 0:00 | Open Mini App from a TG chat. Don Rattori greets you, says "Sit down, kid." |
| 0:30 | Tap a pizzeria → it pops out coins (instant). |
| 0:45 | Train 5 Bruisers (5 sec). |
| 1:15 | Hero card lights up: "Level 2 unlocked — you got Tony Whiskers." |
| 1:45 | First raid on a tutorial NPC ("Lefty the Snitch"). Animated combat sequence. |
| 2:15 | Won! +200 coins, +20 XP. "There's plenty more, kid." |
| 2:30 | Camera pans to the City map. "Now you ready for real players." |
| 3:00 | Tap RAID on first real city target (NPC for first 24h, then real players). |
| 3:30 | Don Rattori: "You're going to need a family. Iron Whiskers wants you." |
| 4:00 | Auto-join a starter family (a TG group seeded by the platform). |
| 4:15 | Family chat lights up: "Welcome, new soldier" (scripted messages). |
| 4:30 | Family boss appears: "We need help — attack the Loan Shark!" |
| 5:00 | Tap ATTACK BOSS, deal 12K damage, family contribution leaderboard updates. |
| 5:00+ | Open-ended sandbox. |

**Key design choices:**
- First raid is **scripted and guaranteed to win** — confidence builder.
- Family is **auto-joined** for first 24h — no decision paralysis.
- Real PvP starts at minute 5, not hour 24.
- All numbers small enough to feel instantly impactful.
- Don Rattori does the narration (gives the brand a face).

---

## 5. Game world hierarchy

```
WORLD
 ├─ TOURNAMENT (cross-bot, monthly/quarterly, seasonal)
 │   └─ Sponsored by Botwave platform; pulls from all participating bots
 │
 └─ CITY (= Mafia City "State", ~500-2000 players each)
     ├─ MAYOR ELECTION (monthly, city-wide vote)
     ├─ TURFS (capturable, 30-50 per city)
     │   └─ Each generates passive resources for controlling family
     │
     ├─ SYNDICATE (optional alliance layer — multiple families allied)
     │   └─ Lives in a TG channel/supergroup the families pin together
     │
     └─ FAMILY (= a Telegram group, 30-100 active members)
         ├─ Group chat (= family chat)  ← real TG
         ├─ Group admins (= R5/R4 officers) ← real TG admin
         ├─ Family bank (shared resources)
         ├─ Family research tree
         ├─ Family quests
         ├─ Family boss (daily PvE)
         ├─ Family wars (vs other families)
         │
         └─ PLAYER (TG user, one global identity)
             ├─ HERO (skills, talents, gear)
             ├─ HIDEOUT (HQ, vault, training yard, clinic, ...)
             ├─ COMPANIES (pizzeria, casino, drug lab, port, ...)
             ├─ TROOPS (Bruisers, Shooters, Bikers, Drivers, Made Men, +)
             ├─ STREET FORCES (decentralized recruits — see §11)
             ├─ INVENTORY (gear, gems, consumables, cosmetics)
             └─ REPUTATION & XP
```

**Key constraints:**
- 1 player = 1 family (no dual-family). Forces loyalty + meaningful drama.
- 1 family = 1 TG group (1:1). The group IS the family — no abstract.
- 1 player ∈ 1 city (auto-assigned at signup, migration ticket to change).
- Cities are sized 500–2000 active players → enough rivals, small enough for identity.
- Tournament is the cross-cutting layer that links Cities & Bots.

---

## 6. Role-based access (Users / Admins / Owners)

The platform has **three role tiers** with strict separation of concerns.

### 6.1 Player (User)

The default role. Anyone who taps "Play" on any participating bot.

**Authenticates via:** Telegram `initData` (signed payload from TG client).

**Can do:**
- All gameplay actions in their own state.
- Raid other players in their city.
- Join / leave one family at a time.
- View public leaderboards.
- Spend their own Stars and gems.
- Vote in Mayor elections.
- Chat in family group (= chat in a TG group, controlled by TG).

**Cannot do:**
- See other players' raw state (only public stats: power, vault est., rank).
- Modify game balance.
- See revenue numbers.
- Ban / mute other players.
- Issue refunds.

### 6.2 Family Officer (R5/R4) — special player permissions, not a separate role

R5 (Boss) and R4 (Underboss) are players with elevated *family-scoped*
permissions. They are still Users at the platform level, but they unlock
family-internal admin actions:

- **R5** (= TG group owner): declare war, accept war, transfer R5 (rare),
  set family policy, kick members, spend family bank, set family banner.
- **R4** (= TG group admin): invite members, kick low-rank members, spend
  family bank up to a daily cap, manage family quests, promote/demote R1-R3.

These permissions are mapped from real TG group roles via the bot's
group-member-status API.

### 6.3 City Mayor — special player permissions (see §17)

A player elected by city vote becomes Mayor for ~30 days. Gains city-wide
policy tools (see §17). Still a player at platform level.

### 6.4 Bot Admin

The operator of a participating bot on the Botwave platform. Owns the
bot's user base and a slice of the game state.

**Authenticates via:** Botwave's existing bot ownership system (already
implemented). Bound to their bot's API key.

**Scope:** Their bot's players only.

**Can do:**
- View their bot's player roster, power distribution, churn cohort, ARPU.
- See per-bot revenue dashboard (Stars + ad earnings).
- Send broadcast messages to their bot's players via Telegram bot DM.
- Schedule bot-local events (e.g. weekend 2× XP just for this bot).
- Moderate: ban/unban, mute/unmute, shadowban (player still plays but
  doesn't appear on city leaderboards).
- View support tickets opened by their bot's players.
- Refund Stars to their bot's players (capped weekly, audited).
- View per-bot top families / top players.

**Cannot do:**
- Modify global game balance (unit stats, costs, formulas).
- See other bots' data.
- Affect global tournaments.
- Touch the database directly.

### 6.5 Platform Owner

The owner(s) of the Cosa Nostra Tycoon platform on Botwave (= you).

**Authenticates via:** Botwave admin panel + 2FA + IP allowlist.

**Can do:**
- Configure global game balance (unit stats, costs, multipliers, formulas).
  All balance lives in a versioned config table, no code deploy required to
  change.
- Schedule global events (KvK, cross-bot tournaments, double-XP weekends,
  holiday events).
- Set economy floors (Stars pricing, gem caps, ad reward sizes).
- Suspend/unsuspend bot tenants.
- View global cross-bot leaderboards & financials.
- Push hotfixes to game logic (via the config table or feature flags).
- A/B test new mechanics (assign 5% of players to test cohorts).
- Manage feature flags (enable/disable features per bot or per cohort).
- Audit any action (every state change is event-sourced; see §29).

**Audit trail:** Every Owner action is logged to an append-only audit log
with timestamp, owner ID, action, before-state, after-state.

### 6.6 Role matrix

| Action | Player | Officer | Mayor | Bot Admin | Owner |
|---|:-:|:-:|:-:|:-:|:-:|
| Play (build, raid, train, etc.) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Declare family war | – | R5 only | – | – | – |
| Spend family bank | – | R5 / R4 (cap) | – | – | – |
| Mayor policy | – | – | ✓ | – | – |
| Ban/mute a player | – | – | – | bot scope | global |
| Refund Stars | – | – | – | weekly cap | unlimited |
| Schedule local event | – | – | – | own bot | – |
| Schedule global event | – | – | – | – | ✓ |
| Edit game balance | – | – | – | – | ✓ |
| View revenue dashboard | – | – | – | bot scope | global |
| Feature flags | – | – | – | – | ✓ |

---

## 7. State model — real data, no fakes

The current mockup uses `localStorage` for persistence (proof-of-concept
only). **Production must be server-authoritative.** Every meaningful state
change happens on the server; the client renders projections of server
state.

### 7.1 Authority: server-side only

| Client | Server |
|---|---|
| Renders UI from cached state | Owns the canonical state |
| Optimistically updates on user action | Validates every action |
| Polls + receives push updates | Computes resolutions (combat, idle accrual, timers) |
| Holds no economic truth | Holds all coins, gems, power, gear |

**Threat model:** assume a malicious client can send any RPC. Server
validates: "does this player have 50K coins to upgrade this building?
does this player own this building? is this building already upgrading?"

### 7.2 State shape (sketch)

```
Player {
  id: TG user id (canonical)
  bot_id: which bot they joined through (for cross-bot routing)
  city_id: their assigned city
  family_id?: their family (nullable)
  family_role: R1 | R2 | R3 | R4 | R5 | null

  hq_level: int
  xp: int
  rep: int
  coins: bigint
  gems: int
  stars_balance: int  // optional, for store credit
  energy: int
  energy_max: int
  energy_last: timestamp

  hero: {
    level, skills (atk/def/lead/stealth/charisma),
    talents (5 trees × 10 dots),
    gear (5 slots × {item_id, level, rarity}),
    equipped_skin
  }

  buildings: { hq: lv, vault: lv, training_yard: lv, ... }
  upgrading: { building, started_at, ends_at }[]

  troops: { bruiser: count, shooter: count, biker: count, ... }
  training_queue: { type, qty, started_at, ends_at }[]
  wounded: { type: count }
  dead: { type: count }
  clinic_queue: { type, qty, ends_at }[]

  companies: { pizzeria: {level, last_collect_at, cap}, ... }

  street_forces: { recruits: count, missions_active: int }

  research: { economy_pct, military_atk_pct, military_def_pct, ... }

  inventory: { gear: [...], consumables: [...], cosmetics: [...] }

  shield_ends_at?: timestamp

  battle_log: BattleLogEntry[]   // last 100
}

Family {
  id, name, tag, banner_id, tg_group_id, city_id,
  members_count, total_power, rank, founded_at,
  bank: { coins, materials, gems_pool },
  research: { atk_pct, def_pct, income_pct, march_pct, ... },
  quests: { active, completed },
  daily_boss: { boss_id, hp_remaining, attacks_today, resets_at },
  active_wars: WarRecord[],
  active_syndicate_id?: int,
  policy: {
    join_min_power: int,
    join_min_level: int,
    accept_mode: "open" | "request" | "invite_only"
  }
}

City {
  id, name, tz, members_count,
  mayor_id?: player_id,
  mayor_term_ends_at: timestamp,
  turfs: TurfState[],
  rank_in_region,
  active_kvk?: KvKMatch
}

Turf {
  id, name, type ("drug_lab" | "casino" | "port" | "bank" | "factory"),
  city_id, controlled_by_family?: family_id,
  defenders_active: int,
  capture_started_at?, capture_ends_at?,
  passive_yield: { coin_per_hr, gem_per_hr },
  buff_radius?: { atk_pct, def_pct } // some turfs buff adjacent families
}
```

### 7.3 The tick

Two-layer tick:

- **Client tick (1 Hz):** smoothly animates countdowns, regenerates
  energy bar, ticks business accrual visually. **Purely cosmetic.**
- **Server tick (event-driven + 1 min batch):** the source of truth.
  On every user action, server computes elapsed time since last update,
  applies idle accrual, completes finished timers, and persists. Hourly
  batch sweeps catch anything missed.

**Why event-driven beats wall-clock tick:** instead of waking the server
every second for every player (millions of wakeups/sec), we compute
"what's true *now*" each time the player acts. Database stays cold
between actions.

### 7.4 Persistence

- **Postgres** = source of truth. Player, Family, City, Turf rows with
  JSONB for variable-shape inventories.
- **Redis** = hot cache. Active players, active wars, leaderboard
  shards, rate-limit counters. Write-through.
- **S3-compatible** = battle logs (cheap immutable storage; truncate from
  hot tables after 30 days).
- **ClickHouse / TimescaleDB** = analytics warehouse (cohorts, ARPU,
  funnel events).

### 7.5 Anti-cheat

- Server-authoritative state (no client says "give me 1M coins").
- Rate limits per action type.
- Idle accrual capped at 24h (no "I left the game for a month, give me
  all that income").
- Combat resolution computed server-side; client only renders the result.
- Replay protection on every RPC (signed timestamps, idempotency keys).
- ML anomaly detector on income velocity, raid frequency, account age.
- TG account-age signal: accounts < 7 days old get tighter caps + manual
  review.
- Botwave userbot signal (you have unique data here) — if an account
  shows no human group-chat behavior, flag.

---

## 8. The Player & Hero

### 8.1 Identity

One global player identity per TG user, keyed by `tg_user_id`. A player
can enter the game through any participating bot — their state is shared
across bots. The `bot_id` is recorded for revenue attribution and broadcast
routing.

### 8.2 Hero stats

The hero is the player's avatar. Currently visualized as Don Rattori
(default; cosmetic skins change appearance only).

| Skill | Range | Effect |
|---|---|---|
| Attack | 0–200 | +0.08 % attack per point on all troops |
| Defense | 0–200 | +0.08 % defense per point on all troops |
| Leadership | 0–200 | +1 squad cap per point |
| Stealth | 0–200 | +0.05 % loot, −0.05 % detection chance |
| Charisma | 0–200 | +0.08 % family donation conversion, +0.04 % city influence |

Skill points awarded on level-up: 5 per level (player chooses allocation).

### 8.3 Talents

5 trees × 10 dots each = 50 talent points across player's life. Each tree
unlocks at a specific HQ level.

| Tree | Unlocks at | Sample talents |
|---|---|---|
| Economy | HQ 1 | +Income, +Vault cap, −Build time |
| Military | HQ 5 | +Attack %, +Counter dmg, −Train time |
| Defense | HQ 8 | +Wall absorb, +Clinic cap, −Wounded → dead ratio |
| Espionage | HQ 12 | +Scout accuracy, −Detection, +Bounty rewards |
| Raid | HQ 15 | +March speed, +Loot %, −March cost |

Talents can be reset for 200 Stars (Stars sink).

### 8.4 Gear

5 slots: Fedora (head), Tie (neck), Ring (hand), Cigar (oral), Watch
(wrist). Each gear item has:

- Rarity: Common → Uncommon → Rare → Epic → Legendary → Mythic
- Level: 1–30
- Bonus: e.g. "+12 % attack" or "+8 % income"
- Set: e.g. "Wiseguy Set: 3-piece = +5 % attack, 5-piece = +15 % attack"

Gear comes from:
- Story mode rewards (deterministic)
- Battle Pass tiers (deterministic)
- City Boss drops (random)
- Crates (random, paid or earned)
- Crafting (level-up materials)

### 8.5 Hero level & XP

Levels 1–60. XP from raids, story missions, family boss, daily quests.
XP curve is logarithmic (slow grind keeps long-tail engagement).

### 8.6 Reputation

Rep is a public stat that affects matchmaking and city influence.

- Gain rep: winning raids, contributing to wars, completing story
  missions, donating to family.
- Lose rep: getting raided, losing raids, leaving a family in active war.

Rep ranges (from 0 to ~50,000) decorated with titles: Rookie → Made Man
→ Capo → Underboss → Don → Godfather.

---

## 9. Buffs & multipliers — the stack

Every meaningful stat in the game is the product of a stack of multipliers.
Order of operations matters.

### 9.1 Order of operations

```
base_stat
  × (1 + research_pct)
  × (1 + hero_skill_pct)
  × (1 + gear_set_pct)
  × (1 + talent_pct)
  × (1 + family_research_pct)
  × (1 + turf_control_pct)
  × (1 + mayor_policy_pct)
  × (1 + capo_pass_pct)
  × (1 + event_pct)
  × (1 + temporary_buff_pct)
= effective_stat
```

All multipliers are **additive within their category**, **multiplicative
across categories**. This prevents single multipliers from runaway scaling.

### 9.2 Multiplier sources

| Source | Typical magnitude | Stacks with |
|---|---|---|
| Research (Armory) | +5 % to +60 % | All other sources |
| Hero skill points | +0 % to +16 % per skill | All other sources |
| Gear (per slot) | +2 % to +18 % | Other gear, all categories |
| Gear set bonus | +5 % to +30 % | All other sources |
| Talents | +1 % to +10 % per dot | All other sources |
| Family research | +0 % to +25 % | All other sources |
| Turf control (city) | +0 % to +15 % | All other sources |
| Mayor policy | +0 % to +20 % city-wide | All other sources |
| Capo Pass | +50 % (income only) | All other sources |
| Event (e.g. weekend 2×) | +100 % | All other sources |
| Temp buff (consumable) | +50 % for 1-3h | All other sources |

### 9.3 Stat coverage

Every multiplier source independently affects a subset of these stats:

- Attack
- Defense
- HP
- Income (coin/hr)
- Vault cap
- Vault protection %
- March speed
- Loot capacity
- XP gain
- Rep gain
- Build time (negative multiplier)
- Train time (negative multiplier)
- Heal time (negative multiplier)
- Energy regen
- Research speed
- Scout success %

### 9.4 Showing buffs to the player

The Power Breakdown modal (already in mockup) is the entry point. Tapping
any category drills into the specific multiplier sources.

Pre-action buffs (e.g. before a raid) are shown as **bonus tags** in the
raid prep modal: `⚔ +34 % atk · 🛡 +25 % def · 🎯 +5 % raid · ⚡ +20 % march`.

---

## 10. Troops & troop tiers

5 tiers of troops, T1 unlocked at HQ 1, T5 unlocked at HQ 22.

### 10.1 Unit roster

| Tier | Type | HP | ATK | DEF | Speed | Load | Counter (+50%) | Weak (−35%) |
|---|---|---:|---:|---:|---:|---:|---|---|
| T1 | Bruiser (BRU) | 200 | 60 | 140 | 1.0× | 12 | Biker | Shooter |
| T1 | Shooter (SHT) | 90 | 220 | 50 | 1.2× | 8 | Bruiser | Biker |
| T1 | Biker (BIK) | 130 | 150 | 80 | 2.4× | 6 | Shooter | Bruiser |
| T1 | Driver (DRV) | 600 | 50 | 380 | 0.8× | 200 | – (hauler) | – |
| T2 | Made Man (MAD) | 480 | 380 | 280 | 1.6× | 18 | Bruiser | – |
| T2 | Capo Shooter (CSH) | 160 | 480 | 110 | 1.4× | 14 | Bruiser | Biker |
| T2 | Capo Biker (CBK) | 240 | 320 | 160 | 2.8× | 12 | Shooter | Bruiser |
| T3 | Enforcer (ENF) | 1100 | 780 | 700 | 1.5× | 22 | Biker | Mortar |
| T3 | Sniper (SNP) | 290 | 1200 | 180 | 1.3× | 18 | Enforcer | Biker |
| T3 | Speeder (SPD) | 420 | 700 | 320 | 3.4× | 14 | Sniper | Enforcer |
| T4 | Heavy (HVY) | 2400 | 1500 | 1700 | 1.4× | 28 | Speeder | Helicopter |
| T4 | Mortar (MRT) | 660 | 2800 | 410 | 1.2× | 22 | Heavy | Speeder |
| T4 | Muscle Car (MCR) | 950 | 1700 | 740 | 4.0× | 20 | Mortar | Heavy |
| T5 | Tank Boss (TNK) | 5400 | 3500 | 4200 | 1.3× | 38 | MuscleCar | Helicopter |
| T5 | Helicopter (HEL) | 1800 | 7200 | 990 | 1.5× | 30 | TankBoss | MuscleCar |
| T5 | Streetking (STK) | 2200 | 4400 | 1900 | 5.0× | 26 | Helicopter | TankBoss |

(Numbers are first draft; final balance via playtesting.)

### 10.2 Counter system (rock-paper-scissors-extra)

Within each tier, three types form a triangle:
**Bruiser/Heavy/Tank → Biker/Speeder/MuscleCar → Shooter/Sniper/Mortar/Heli → Bruiser**

Plus Driver hauler unit (no combat role; multiplies loot).

### 10.3 Training

- Cost in coins + small materials cost (materials come from companies).
- Time scales with tier (T1 ~5–60 sec each, T5 ~3–5 min each).
- Training queue length = Training Yard level × 8.
- HQ level gates tier unlocks.
- Multiplier: −Train time talents, Capo Pass, training-speedup items.

### 10.4 Clinic (hospital)

When troops are wounded in combat:
- 65 % go to clinic (heal back over time).
- 35 % die (permanent loss).
- If clinic is full, overflow defaults to dead.
- Each clinic bed has heal rate; higher clinic level = more beds + faster heal.

### 10.5 Made Men (elite per family)

T2+ slots are partly family-gated: each player can train up to a cap of
elite units determined by family research level. This creates a soft
ceiling that requires family contribution to lift.

---

## 11. Street Forces (extension layer)

**This is new — not in Mafia City.** It's a layer of "uncommanded"
recruits who run small ops independently of your main troops, addressing
the problem that idle players have nothing happening between log-ins.

### 11.1 Concept

In addition to your main army (used for raids), you have **Street
Forces** — a roster of low-tier recruits (each named, with cartoon
portrait) who execute autonomous "street ops": robberies, shakedowns,
graffiti tagging, fence operations.

Think Hutch in *The Sopranos* — small earners who do their own thing.

### 11.2 Street Forces UI

A new screen between Empire and Family in the nav, or a panel on the
Empire screen. Each recruit has:

- Name, portrait (auto-generated from a name+species pool)
- Skill (Earner / Brute / Sneak / Driver / Spy)
- Loyalty (0–100; affects mission success rate)
- Heat (0–100; if hits 100, recruit "gets pinched" and is lost)
- Status: Idle / On Mission / Cooling Down / Captured

### 11.3 Missions

Available missions auto-refresh hourly. Each shows:

- Target type (store robbery / convoy / smuggle / arson / extortion)
- Duration (5 min – 2 h)
- Skill required
- Loyalty required (gate)
- Heat generated
- Reward (coins / materials / rep / gear shards / xp)
- Risk (success %)

Player assigns a recruit → mission runs in real time → result on completion.

### 11.4 Why Street Forces matters

| Problem in Mafia City | Street Forces solution |
|---|---|
| "Nothing to do" between raids | Always 4–8 missions available |
| Idle income feels boring | Mission rewards feel earned |
| Hero is the only "named" unit | 10–20 named recruits build attachment |
| F2P feels powerless | Street Forces are F2P-viable |
| Hard to monetize early game | Recruit hire packs, name-change gems |
| No identity for low-tier troops | Recruits give faceless mooks personality |

### 11.5 Heat & police

Street Forces accumulate heat. Each recruit has a heat bar; when full,
they get pinched (lost for 24 h, can be bailed out for gems).

Heat decays when recruit is idle, decays faster if cleaning up (using a
Spy specialist on heat-down missions).

### 11.6 City heat (aggregate)

Sum of all street force heat = your *player* heat. High player heat
attracts city events: police raids, FBI sweeps, snitch attacks. These
function as PvE threats with rewards. Engineered to *not* be a death
spiral — heat caps at 1000 and excess decays fast.

### 11.7 Roster size

Roster grows with HQ level:
- HQ 5 → 4 recruit slots
- HQ 10 → 8 slots
- HQ 15 → 12 slots
- HQ 20 → 16 slots
- HQ 25 → 20 slots
- + paid expansion (Capo Pass adds 2; one-time gem unlocks +4)

---

## 12. Companies (businesses)

Businesses are the idle income engine. The mockup shows 4; full game has 12.

### 12.1 Company ladder

| Slot | Name | Unlock at | Base rate | Cap | Notes |
|---|---|---|---|---|---|
| 1 | Tony's Pizzeria | HQ 1 | 3,000/h | 24 h | Starter |
| 2 | Lucky Cat Casino | HQ 2 | 8,000/h | 18 h | First gem income |
| 3 | Clean Sheets Laundry | HQ 4 | 12,000/h | 16 h | Materials |
| 4 | Eastside Docks | HQ 5 | 25,000/h | 12 h | Shipping bonus |
| 5 | Auto Body Shop | HQ 7 | 40,000/h | 10 h | Driver discount |
| 6 | Underground Casino | HQ 9 | 80,000/h | 10 h | +gems |
| 7 | Pharma Lab | HQ 12 | 150,000/h | 8 h | Materials + heat |
| 8 | Newsstand Network | HQ 14 | 240,000/h | 6 h | +XP |
| 9 | Bank Front | HQ 16 | 420,000/h | 6 h | Vault cap |
| 10 | Real Estate Office | HQ 18 | 700,000/h | 4 h | +turf bonus |
| 11 | Speakeasy | HQ 20 | 1.1M/h | 3 h | +rep |
| 12 | Crypto Exchange | HQ 22 | 1.8M/h | 2 h | TON tie-in (optional) |

### 12.2 Idle accrual

`pending = min(cap, rate × elapsed_hours × (1 + income_multiplier))`

When player collects, pending is added to vault; accrual restarts from
that moment.

### 12.3 Synergies

Some companies buff others when at certain levels:
- Docks Lv 5 → Pharma Lab +20 % income
- Bank Front Lv 10 → all other businesses +5 % cap
- Real Estate Lv 8 → +1 % income per controlled turf

### 12.4 Heat from companies

Companies (especially Pharma, Crypto Exchange, Speakeasy) generate heat
into the city heat pool — police events more likely. Counterbalance via
Street Forces Spy missions or Mayor anti-corruption policy.

---

## 13. Buildings & upgrades

Buildings are infrastructure — they don't produce income directly, but
they unlock and amplify everything else.

### 13.1 The 12 buildings

| Building | Role | Max lv | Notes |
|---|---|---|---|
| Hideout HQ | Gates all other buildings + crew cap | 30 | Single-thread upgrade |
| The Vault | Coin cap + protection % | 25 | Higher protection = less raid loss |
| Training Yard | Troop training queue + cap | 25 | Each level adds 8 queue slots |
| Doc's Clinic | Wounded heal + bed cap | 25 | Survival rate boost |
| Garage | Driver cap + march speed | 25 | Speeds all marches |
| Armory | Research tree + slot count | 25 | Gates research speed |
| Walls | Defensive % against raids | 25 | Soaks up incoming damage |
| Watchtower | Scout success + early warning | 20 | Pings before incoming attacks |
| Speakeasy | Family income passive | 20 | R5+ only, unlocks @ HQ 13 |
| Embassy | Family quests + diplomatic actions | 15 | Unlocks @ HQ 8 |
| Black Market | Special offers + crafting | 20 | Unlocks @ HQ 10 |
| Street Forces HQ | Recruit slots + mission slots | 25 | Unlocks @ HQ 5 |

### 13.2 HQ-gating

HQ is the master gate. No other building can exceed HQ's level. So
upgrading HQ unlocks the next tier of everything.

### 13.3 Upgrade economics

```
cost(level) = 800 * (level + 1) ^ 2.1
time(level) = 60 * (level + 1) ^ 1.6 seconds
```

So Lv 1→2 costs 3.4k coins + ~3 min. Lv 24→25 costs ~1.8M coins + ~7h.

Two parallel upgrade queues by default (one HQ, one anything else). Capo
Pass adds +1 queue.

### 13.4 RUSH economy

`gems_to_rush = ceil(remaining_seconds / 60) * 0.6` rounded up to multiples
of 5.

So skipping 1 hour costs 36 gems; skipping 6 hours costs 216 gems.

Free "skip 30 min" via ad once per building per day (see §25).

---

## 14. Combat engine

Already implemented in the mockup ([`game.js`'s `resolveRaid()`](../../public/miniapp/tycoon-mockup.html)).
Production version is server-side, otherwise identical math.

### 14.1 Squad composition

A squad is a `{unit_type: count}` map. Constraints:

- Total count ≤ squad capacity (HQ + Leadership + Capo Pass).
- All units must be in player's "ready" pool (not wounded/dead/training).
- Hero is implicitly attached to the squad and contributes its skill bonuses.

### 14.2 March time

```
march_time = distance / slowest_unit_speed_kmh / march_speed_multiplier
```

Marches are pre-deductible: when you start one, the troops are reserved
and visible on the city map as a convoy line. Player can recall (with
penalty) but cannot retarget mid-march.

### 14.3 Win-chance formula

```
attack_score  = Σ (count × atk × (1 + atk_bonus) × counter_multiplier)
defense_score = Σ (count × hp × (1 + def_bonus)) + wall_hp + tower_buff

ratio = attack_score / defense_score
base_win = ratio / (ratio + 1)
hero_edge = (atk_score / target_def_score - 1) * 0.05  // clamped ±0.15
raid_bonus = sum of pre-raid bonuses

win_chance = clamp(base_win + hero_edge + raid_bonus, 0.02, 0.98)
```

So even the strongest squad has 2 % chance to lose, and the weakest has
2 % chance to win. Prevents stale leaderboards (whales can lose), prevents
griefing (small players can sometimes get lucky).

### 14.4 Round-by-round damage

```
for round in 1..6:
  our_dmg   = squad_attack(squad, focus_type)
  their_dmg = target.atk * (1 + their_atk_bonus)

  wall_absorb = min(wall_hp_remaining, their_dmg * 0.35)
  effective_their_dmg = their_dmg - wall_absorb

  our_losses   = distribute_casualties(effective_their_dmg)
  their_losses = distribute_casualties(our_dmg)

  log_round(our_losses, their_losses)

  if our_squad_alive_pct < 0.1: break  // retreat
  if target_pwr_alive_pct < 0.1: break  // victory
```

`distribute_casualties` is proportional to each unit's HP share of the
squad, weighted by counter relationships and HP soaks.

### 14.5 Casualty split

```
total_losses = round-by-round sum
wounded = floor(total * 0.65 * clinic_capacity_factor)
dead = total - wounded
```

`clinic_capacity_factor` < 1 if clinic is full → overflow becomes dead.

### 14.6 Loot calculation

```
unprotected_vault = max(0, target.vault - target.vault * vault_protection)
loot_cap = squad_total_load
coins_looted = min(unprotected_vault, loot_cap)

// Higher tier loots gear shards too
gear_shards_looted = ratio * loot_chance * tier_modifier
```

### 14.7 Outcomes

| Outcome | Trigger | Effect |
|---|---|---|
| Victory | Target alive % ≤ 10 % first | Full loot, +XP, +rep, +war pts |
| Defeat | Squad alive % ≤ 10 % first | No loot, −rep, casualties |
| Draw (rare) | Neither hits 10 % in 6 rounds | Partial loot, partial casualties both sides |
| Retreat | Player manually retreats | 50 % casualties, no loot, −small rep |

### 14.8 Special targets

- **NPC tutorial** (first 24 h): always win, no real casualties
- **City Boss** (city-level event): all city families team up
- **Family Boss** (daily PvE inside family)
- **Mayor's Office** (during election campaign — see §17)

---

## 15. The City — real PvP, not bots

### 15.1 City definition

A city is a logical server holding 500–2000 active players. Cities are
named after real places ("Lagos", "Manila", "Tokyo", "Sicilian", "Dubai",
"Crypto City") for identity.

### 15.2 City assignment

On signup:
1. Default by TG `language_code` mapping (e.g. `en` → "Lagos", `ja` → "Tokyo").
2. Player can override during onboarding ("Pick your city").
3. Each city has a soft cap of 2000 active players (last 7-day actives).
   When full, new players go to a Capacity-Overflow city or wait.

### 15.3 Real PvP targets

The "Nearby Targets" list in the mockup currently shows hand-picked NPCs.
In production:

- 90 % of targets shown are **real players in your city** with similar
  power (matchmaking range: 0.5× → 1.5× your power).
- 10 % are tutorial NPCs (kept around for new players in first 7 days).
- "Distance" is meaningful — closer targets cost less march time.
- Refresh: list reshuffles every 15 min.

### 15.4 Discovery rules

- New players (< 7 days) get a "training shield" — only matched against
  NPCs and other new players.
- After level 10: full matchmaking.
- Bounty board: any player can post a bounty on any rival ("kill Don
  Carlito 3 times for 50K") — fuels organic PvP.

### 15.5 Scouts

Before raiding, a player can spend a Scout charge (1 / day free + earnable
+ purchasable) to see exact troop composition + walls of target. Scouts
themselves can fail (Stealth vs target Detection).

### 15.6 Shields

| Type | Duration | Cost | Notes |
|---|---|---|---|
| Newbie shield | 7 days | Free | Auto-applied first week |
| Peace shield 8h | 8 h | 50 gems / 99 Stars | Most common |
| Peace shield 24h | 24 h | 150 / 199 | Standard "going to sleep" |
| Peace shield 3d | 72 h | 400 / 499 | Travel/weekend |
| Peace shield 7d | 168 h | 800 / 799 | Anchored as "best value" |
| War shield | Variable | Stars-only | Drops if you attack |
| Reinforce shield | 30 min | Free via ad | Cap 2/day |

**Critical:** shield breaks if you attack anyone. No one-way invincibility.

### 15.7 City rank

Daily-updating leaderboard:
- By player power
- By family power
- By daily raids
- By turfs controlled
- By coins earned

Top 10 of each get a public badge.

---

## 16. Turf system

The city map is divided into 30–50 capturable turfs. Each turf is a
specific business or district that produces resources.

### 16.1 Turf types

| Type | Yield | Buff | Notes |
|---|---|---|---|
| Drug Lab | High coin | +5 % attack | Generates heat |
| Casino | Coins + gems | +5 % income | Whales love this |
| Port | Materials | +5 % march speed | Cap requires Driver units |
| Bank | Vault cap | +5 % vault protection | Whale magnet |
| Factory | Materials + production | +5 % build speed | Long-term play |
| Newsroom | XP + rep | +5 % XP gain | Identity prestige |
| Speakeasy | Cosmetics drop | +5 % rep | Underground vibe |
| Police HQ | Heat reduction | −10 % city heat | Defensive turf |
| Cathedral | Family loyalty | +5 % donations | Rare, high-prestige |

### 16.2 Capture mechanic

To capture a turf:
1. Family R5 declares Capture Op (24h cooldown).
2. 6h timer starts; defending family rallies.
3. Both sides commit troops to "garrison" the turf.
4. Combat at the deadline resolves capture.
5. Winner controls turf for 7 days; passive yields go to family bank +
   buff to all family members.
6. After 7 days, turf is contested again unless re-captured.

### 16.3 Turf battles

- Turf battles use a different combat resolver than personal raids —
  multiple players' troops aggregate.
- Family members can contribute (each contribution counts toward their
  rep + war points).
- Contributions are non-refundable; if family loses, troops die / wound.

### 16.4 Convoys

Visible on the city map. Show direction + ETA. If a convoy is intercepted
mid-route, ambushed combat fires. Adds dynamic city-map drama.

### 16.5 Sanctuary turfs

3–5 turfs per city are "Sanctuary" — uncapturable, used for events
(City Boss, Mayor's Office, Tournament arena).

---

## 17. Mayor Election

A **new mechanic, not in Mafia City** — a monthly political layer that
gives the entire city a shared ritual.

### 17.1 Why

- Mafia City has no city-level identity event. Everyone just grinds.
- Mayor election creates a shared "civic" moment every 30 days.
- Reignites old players (they'll log in to vote).
- Generates drama between top families.
- Justifies the city map having a "Mayor's Office" turf.
- Lets the platform run promo events around elections.

### 17.2 Election cadence

- Every 30 days, mayor seat opens.
- Day 1–5: nomination phase.
- Day 6–25: campaign phase.
- Day 26–30: voting phase.
- Day 31: new mayor takes office, prior mayor's term ends.

### 17.3 Nomination phase

To nominate yourself:
- Min HQ 15
- Min rep 5,000
- Pay nomination fee (5,000 gems → Stars sink)
- Be member of a family that's in city top-20

Up to 7 candidates per city.

### 17.4 Campaign phase

Candidates earn **Campaign Points** by:
- Winning raids (+CP)
- Family contributions (+CP)
- Defending turfs (+CP)
- "Campaign donations" from supporters (other players pay gems or Stars
  to publicly back a candidate; donation amount goes to the campaign chest
  which boosts CP)

Campaign messages: each candidate can post 1 message per week to the city
chat board (curated, no spam).

### 17.5 Voting phase

Every active player in the city gets 1 vote. Vote = candidate, no
ranked-choice (keeps it simple).

Family R5s can call "endorsements" — they declare which candidate their
family backs. Family members get +rep if their candidate wins (peer
pressure).

### 17.6 Mayor powers (during 30-day term)

The Mayor controls **2 policy levers** per term:

| Policy | Effect | Cost (gem fund) |
|---|---|---|
| Tax | +5 % city-wide income → fills mayor's treasury | Free |
| Anti-Corruption | −20 % city heat for all players | 50 gems |
| Open Borders | +20 % migration in (more new players) | 100 gems |
| Closed Borders | −80 % new player arrivals (focus on existing) | 100 gems |
| Build Spree | −15 % build time for all players | 200 gems |
| Wartime | +10 % war points earned in city | 200 gems |
| Loose Trigger | +10 % loot earned, +5 % heat | 200 gems |
| Crackdown | +20 % police events, +10 % rep on victories | 200 gems |

Mayor selects 2 at start of term, can swap once mid-term (for 500 gems).

### 17.7 Mayor's stipend

Mayor earns:
- 50 % of nomination fees from next election cycle (rolls over)
- 2 % of all city Tax revenue if Tax policy is active
- "Mayor" cosmetic badge for the term
- Achievement points

### 17.8 Removal / impeachment

If Mayor goes inactive (no login for 7 days), city R5s can vote to
impeach with 60 % approval. Triggers special election.

### 17.9 Anti-collusion

To prevent one family from dominating mayor seat forever:
- A family cannot hold mayor in 2 consecutive terms.
- Same player cannot win 3 elections in 6 months.

---

## 18. Family system — create / join / leave / dissolve

### 18.1 What a family is

A Family is a Telegram group with the game bot added and registered as
a family by the group owner. The group's chat IS the family chat. The
group's TG admin roster maps to family officer roles.

### 18.2 Creating a family

**Requirements to create:**
- Player must be HQ 8+
- Player must have 50,000 coins as founding capital (Stars sink: 99 Stars
  to bypass HQ requirement once)
- Player must be the owner of a TG group with ≥ 5 real members
- Player runs `/createfamily` in their TG group via the game bot
- Bot verifies group ownership, member count, and that the group isn't
  already a family

**On creation:**
- Family is registered in `families` table
- Founder becomes R5
- TG group admins automatically map to R4
- Family is assigned to founder's city
- Optionally creator pays 500 gems for a custom 3-letter tag (e.g. [IW])
- Family banner is procedural by default; custom banner = 1000 gems

### 18.3 Joining a family

**Discovery:**
- Recruitment Board in the Mini App (families post recruitment ads)
- Direct invite from R5 / R4 (TG group invite link forwarded by bot)
- Family suggestion engine (based on player's city, power, language)

**Requirements to join (set per family by R5):**
- Minimum HQ level (default 5, R5-configurable 1–20)
- Minimum total power (default 100K, R5-configurable)
- Application mode: `open` (auto-accept) | `request` (R5/R4 approves) |
  `invite_only` (only invited players can apply)

**Join flow:**
1. Player taps "Join family" from board or invite link.
2. Player joins the TG group via the bot's invite link (or accepts add).
3. Bot detects the new member and prompts them to register them as a
   family member in the Mini App.
4. Player accepts → joins family with role R1 (default).

**Auto-promote rules** (optional, family R5 toggles):
- R1 → R2 after 7 days + 50K donations
- R2 → R3 after 30 days + 500K donations + 10 war contributions
- R3 → R4 only via R5 manual promote
- R4 → R5 only via R5 transfer (irrevocable)

**Joining cooldown:** if you left a family, you can't join another for
24 h (configurable, anti-poaching).

### 18.4 Leaving a family

**Voluntary leave:**
- Player taps "Leave Family" in Family screen → confirmation modal
  ("You'll lose 25 % of your war points; cooldown of 24h")
- If during active war: heavier penalties (−50 % war points, −500 rep)
- TG group: player remains in the TG group unless they leave it manually.
  Family role is unbound from TG until they re-register.

**Kicked:**
- R5 / R4 can kick R1-R3 (R4 cannot kick R4).
- Kicked player loses 50 % of family-locked materials.
- Kicked player has 48h cooldown before joining another family.

### 18.5 Dissolving a family

R5 can dissolve their own family:
- Confirmation: "All members will be released, family bank distributed
  pro-rata, family is removed from city rankings"
- 7-day disband cooldown (R5 can cancel during this window)
- If dissolved during war: 7-day "shame" mark on R5 (cosmetic penalty)

### 18.6 Inheritance

If R5 is inactive (no login for 30 days), highest-rep R4 auto-inherits R5.
If no R4, family enters "leadership crisis" mode (no decisions can be
made until a R4 is promoted by the highest-rep member).

### 18.7 Family roles & permissions

| Role | TG mapping | Can do |
|---|---|---|
| R5 (Boss) | TG group owner | Everything: war, policy, bank, kick all, promote R4, transfer R5 |
| R4 (Underboss) | TG group admin | Invite, kick R1–R3, spend bank up to daily cap, manage quests |
| R3 (Capo) | None (game role) | Lead a rally, spend bank up to small cap, manage own subordinates |
| R2 (Made Man) | None (game role) | Vote on family decisions, view bank, normal play |
| R1 (Soldier) | None (game role) | Default new joiner; normal play, can donate, can join rallies |

### 18.8 Family size limit

- Default cap: 50 members
- HQ-Family-Level upgrade increases cap (Family Research path)
- Max possible: 100 members (research lv 20)

### 18.9 Family Power = ?

Family Power = sum of all member powers × family research multiplier.
Used for city ranking + matchmaking + war qualification.

---

## 19. Family operations — bank, research, quests, boss

### 19.1 Family Bank

Players donate resources (coins, materials, gems) to the bank. Bank funds
family research, family-wide buffs, war chest.

Donation rewards:
- +Player rep
- +Member contribution score (visible on Family screen)
- +Achievement points
- Public family chat message ("Don Rattori donated 25K to the bank")

R5/R4 can spend bank funds:
- R5: any amount, any purpose
- R4: up to 10 % bank balance per day, limited purposes (war research,
  quests)

### 19.2 Family Research

A research tree that buffs all family members. Cost paid from bank.

| Tree | Research | Effect | Cap | Cost (lv 1 → lv 20) |
|---|---|---|---|---|
| Economy | Income | +Income to all members | +25 % | 50K → 50M |
| Economy | Train Speed | −Train time for all members | −25 % | 50K → 50M |
| Military | Attack | +Attack to all members | +20 % | 100K → 100M |
| Military | Defense | +Defense to all members | +20 % | 100K → 100M |
| Logistics | March Speed | +March speed | +20 % | 100K → 100M |
| Logistics | Squad Cap | +Squad cap | +30 cap | 100K → 100M |
| Politics | Rep Gain | +Rep multiplier | +20 % | 50K → 50M |
| Politics | City Influence | +Mayor campaign points contribution | +30 % | 50K → 50M |

### 19.3 Family Quests

Daily, weekly, and event quests for the whole family. Examples:
- "Family raid 100 times today" → 1M coin reward to bank
- "Train 5,000 troops this week" → +XP for all participants
- "Capture 3 turfs this week" → +rep + cosmetic for all participants

### 19.4 Family Boss

Daily PvE — a boss with shared HP. Whole family attacks together.
Each player spends energy → deals damage → contribution counted.
Loot split by contribution percentage.

Boss tiers escalate with family power. Loot quality also escalates.

### 19.5 Family Hall

A virtual "headquarters" screen shown when player taps the family crest:
- Family stats, banner, motto
- Recent battles, donations
- Member roster with roles & contributions
- Bank balance
- Active research
- Active wars
- Active quests
- Family Boss status

### 19.6 Family Diplomacy

R5s can:
- Declare war on other families
- Sign NAPs (non-aggression pacts) — no attacks for X days
- Form Syndicates (alliance of families)
- Negotiate cease-fires

NAPs / Syndicates are public; visible on city map and family screen.

---

## 20. Wars (Family vs Family, City vs City)

### 20.1 Family vs Family war

**Declaration:**
- R5 of Family A declares war on Family B.
- Cost: 100K coins + 50 gems (mostly to prevent spam).
- Defender has 1h to "accept" or "shield" (200 gems for 24h family shield).
- If accepted, war begins.

**Duration:** 24–72 hours (configurable per city policy).

**Scoring:**
- Each successful raid = 100 war points × power_modifier
- Each turf captured during war = 1000 war points
- Each family boss kill = 500 war points
- War points belong to: (a) the individual player, (b) the family total

**Victory:**
- Family with higher war points at end wins
- Loser pays "tribute": 5% of family bank to winner
- Winner gets prestige (cosmetic badge for week)
- Player rewards distributed by contribution

**Limits:**
- Max 1 active war per family at a time
- Cooldown: 24h between wars

### 20.2 Syndicate vs Syndicate

If allied families are in syndicate, a Syndicate War is possible — same
mechanic, just multiple families on each side, scaled scoring.

### 20.3 City vs City (KvK — Kingdom vs Kingdom)

The biggest event. Monthly (or quarterly).

- Cities matched algorithmically (similar size, age, power)
- 7-day event
- Daily objectives (capture X, defend Y, raid Z)
- City-wide scoreboard
- Top contributing players get exclusive cosmetics
- Losing city pays "tribute" — players' next 3 raids deal less, +losing
  city banner debuff for week

### 20.4 Cross-bot tournaments (next §)

---

## 21. Cross-bot tournaments

**The platform's killer differentiator.**

Mafia City is locked to its own player base. Cosa Nostra Tycoon spans
all bots running Botwave that have opted into the game. Quarterly:

- 8 cities (mixed from different bots) seeded into a tournament bracket
- Each "round" = 1 week of city-vs-city play
- Single elimination, 3-week event
- Champion city gets exclusive title + cosmetics for all top players
- Bot operators of the winning city get marketing rights ("Bot X powered
  the Q4 Champion City!")

This is what compounds Botwave's platform value: every new bot you ship
brings new players who can compete in cross-bot events, which makes the
events more exciting, which brings more bots.

---

## 22. Story Mode

A linear PvE campaign with mafia movie tropes — narrative wrapper for
introducing mechanics gradually + giving solo players something to do.

### 22.1 Why a story mode

- Mafia City has weak story (just unlock objectives)
- Story gives identity: "I'm Don Rattori, kid from the gutter" rather than
  "I'm player_12345"
- Solo / shy players need PvE content
- Drives Hero leveling outside of PvP grind
- Source of guaranteed gear drops

### 22.2 Chapter structure

10 chapters total in v1, 5 missions per chapter.

| Ch | Title | Theme | Rewards |
|---|---|---|---|
| 1 | The Street Kid | Tutorial, basic raids | Hero Lv 5, basic gear |
| 2 | The Pizzeria | Earn first business, meet Tony | Pizzeria unlock |
| 3 | The Casino Job | Heist mission, Big Pidge joins | Casino unlock + gear |
| 4 | The Family You Chose | Family system intro | Family invite + cosmetic |
| 5 | Made Man | Promotion ceremony | T2 troop unlock + Hero Lv 15 |
| 6 | War on the Docks | Turf system intro | First turf capture |
| 7 | The Mayor's Daughter | Politics intro | Voter unlock + rep |
| 8 | The Hit | Hard PvE boss | Epic gear |
| 9 | The Setup | Betrayal arc | Hero Lv 30 |
| 10 | Capo di Tutti Capi | Final boss + epilogue | Legendary gear + permanent title |

### 22.3 Mission types

- **Hit & Run** — kill a target with minimum casualties
- **Heist** — collect X resources from waves of enemies
- **Defense** — survive N rounds against attackers
- **Stealth** — single hero mission (no troops)
- **Boss** — single high-HP boss with mechanics
- **Convoy** — escort/intercept on the city map
- **Election** — campaign mission (PvE simulation of mayor election)

### 22.4 Story mode UI

A "Story" tab in the navigation. Shows:
- Chapter list with progress
- Currently active mission with cutscene preview
- Hero growth tied to story (level-up cutscene every 5 levels)
- Replay missions for materials

### 22.5 Narrative cadence

- Each mission has ~30 seconds of pre-mission cutscene (Don Rattori
  talks, sets up stakes)
- Comic-book style panels (low cost — illustrator + writer)
- Post-mission, narrative beats
- Skippable for replays
- Voice acting in v2 (paid feature for premium markets)

### 22.6 Story rewards

Story missions give **deterministic** rewards (no RNG) — players know
exactly what they'll get. This contrasts with chests (RNG). Prevents
"unlucky" feelings.

---

## 23. Statistics — what is tracked

Every action emits a typed event into the analytics warehouse. Three
audiences for stats:

### 23.1 Player-facing stats

Visible to player on their Profile screen:

- Total raids (won / lost)
- Total troops trained / killed
- Total coins earned / lost
- Total damage dealt / taken
- Total turfs captured
- Total war points
- Total family donations
- Highest single raid loot
- Highest single damage round
- Total days played
- Win streak / loss streak
- Heat current / lifetime
- Mayor terms held
- Story chapter progress
- Achievement progress (50+ achievements)

### 23.2 Family stats

Visible on Family screen:

- Family total power
- Members count
- Wars won / lost
- Turfs controlled / captured
- Family bank lifetime in/out
- Family boss kills
- Family contribution leaderboard (rolling 7 / 30 / lifetime)
- Family rank in city

### 23.3 City stats

Visible on City screen:

- City rank in region
- Active players (7-day, 30-day)
- Total turfs / contested
- Mayor history (last 6 mayors)
- City total power
- City KvK record

### 23.4 Platform stats (Bot Admin / Owner only)

- DAU / MAU / WAU
- Retention (D1 / D7 / D30)
- ARPU / ARPPU / ARPDAU
- Conversion rates (visitor → installer → first IAP)
- LTV cohorts
- Ad fill rate, ad eCPM
- Funnel events (signup → first raid → first IAP → first family join)
- Whale segmentation (top 1 % spenders)
- Churn cohort analysis
- A/B test results

### 23.5 Event sourcing

Every state change is an immutable event in an append-only log. Lets
us:
- Replay history for support tickets
- Detect anomalies (impossible velocity)
- Roll back malicious actions
- Compute new metrics retroactively

---

## 24. Monetization — Stars IAP

Telegram Stars are the native currency. Detailed placement & rationale
were given in the previous design pass. Summary here:

### 24.1 The 8 placements

| # | Item | Where | Why |
|---|---|---|---|
| 1 | Capo Pass (monthly) | Shop screen, top banner | Subscription LTV is 5× higher than one-time |
| 2 | Gem Packs (100/550/1200/6500) | Shop screen | Soft premium intermediary; flexibility on sales |
| 3 | Triggered Offers (Starter Pack, Comeback Pack, etc) | Popup after events | 30× higher conversion than passive shop |
| 4 | Shields (8h / 24h / 3d / 7d) | Shop + post-attack inbox | Loss aversion, anchored "best value" |
| 5 | Speedup Stars upsell | Any timer w/ insufficient gems | Wait-state conversion |
| 6 | Cosmetics (skins, banners, animations) | Hero modal + Shop | Pure profit, no balance impact |
| 7 | Migration ticket (move city) | Profile screen | Necessary safety valve |
| 8 | Battle Pass (seasonal premium track) | Top bar banner during season | Best engagement floor + LTV per dollar |

### 24.2 Star pricing strategy

- 100 Stars = ~$1.50 USD equivalent (rough; actual is TG-defined)
- All prices end in 99 (psychological pricing)
- "Big pack value" anchoring (largest gem pack is "best price per gem")
- Sales: 30 % off gem packs during events, never on Capo Pass

### 24.3 Star receipts

Server validates Star payments via Telegram Bot API webhook. State
changes happen only after webhook confirmation. Idempotent on retry.
Refunds handled by Bot Admin within weekly cap.

---

## 25. Monetization — Adsgram rewarded video

Adsgram is the dominant rewarded video network on Telegram. Banner ads
are not allowed (TG ToS); only rewarded video.

### 25.1 The 9 placements

| # | Trigger | Reward | Cap |
|---|---|---|---|
| 1 | After business COLLECT | 2× collect amount | 1× per collect cycle per business |
| 2 | Daily Ad Chest (top of Empire) | +gems / +materials | 5 ads/day |
| 3 | Building upgrade timer | −30 min | 1/building/day |
| 4 | Pre-raid (Strike button) | +50 % loot | 1/raid, max 10 raids/day |
| 5 | Post-defeat (Revive squad) | Save 30 % wounded | 1/defeat |
| 6 | Out-of-energy | +20 energy | 3/day |
| 7 | War shield 30 min | Free 30 min shield | 2/day (war only) |
| 8 | Family boss attack | 2× damage on next attack | =daily boss attacks |
| 9 | Free Crate (Shop screen) | random gems/gear | 1 / 4h |

### 25.2 Ad cadence

- Max 4 ads per session (anti-burnout)
- Max 10–15 ads/day per player (Adsgram churn threshold)
- Never gate critical actions (raid completion, login) behind ad
- Show ad opportunity, never force

### 25.3 Ad revenue model

Adsgram pays ~$0.005–0.03 per completed view depending on geo. Heavy
F2P users (30+ ads/day) generate ~$0.50/day. Light users (3–5
ads/day) generate ~$0.05/day. Average ~$0.10/DAU/day from ads alone.

---

## 26. Triggered offers & Battle Pass

### 26.1 Triggered offers

Server-driven popups that fire on specific events. Each offer is
**1-time only** (cannot be re-purchased), gives the feeling of a
limited deal.

| Trigger | Offer | Price |
|---|---|---|
| Day 1 after first raid | Starter Pack: 5000 gems + 50 Bruisers + 3-day Capo Pass | 99 Stars |
| First defeat | Comeback Pack: revive squad + 24h shield + 1000 gems | 199 Stars |
| First building maxed | Boss Pack: 8000 gems + speedups + epic gear | 499 Stars |
| Empty gem wallet during timer | Quick Refill: 500 gems | 99 Stars |
| Joined first family | Loyalty Pack: 2000 gems + donation match | 299 Stars |
| Reached HQ 10 | Hideout Pack: 8000 gems + builder slot 24h | 499 Stars |
| Lost 3 raids in a row | Mentor Pack: hero skill reset + 2000 gems | 199 Stars |
| Won first war | Victor Pack: cosmetic skin + 5000 gems | 499 Stars |

### 26.2 Battle Pass

Seasonal (60–90 days). Has 100 tiers earned via XP.

**Free track:**
- Tier 1: 100 gems
- Tier 5: 50 Bruisers
- Tier 10: cosmetic shoulder badge
- … (gradual rewards, mix of resources + cosmetic)

**Premium track (999 Stars):**
- Everything in free track
- + extra rewards at each tier
- + exclusive skin, banner, animation
- + Capo Pass 1-month bonus
- + permanent profile frame

LTV per pass: ~$15 average (10 Stars per $0.15). Whales also buy "tier
skips" — paying gems/Stars to instantly unlock later tiers.

### 26.3 Why both

Triggered offers + Battle Pass + Capo Pass = three monetization layers
that catch different player types:
- **Casual:** triggered offers (one-time impulse)
- **Engaged:** Battle Pass (commits to season)
- **Whale:** Capo Pass (recurring) + Battle Pass + cosmetics + ads off
  (premium add-on)

---

## 27. Anti-pay-to-win principles

| Rule | Why |
|---|---|
| Stars buy **time** and **status**, not raw power | Otherwise F2P leaves → whales lose punching bags → whales leave |
| Capo Pass: max +50 % income, never combat | Income is grind reduction, not power escalation |
| No "Stars-only" troop tiers | All troops must be unlockable by playing |
| No "Stars-only" combat multipliers | Combat is skill (composition) + grind, not wallet |
| Cosmetics are unlimited | Whales can flex without breaking balance |
| Triggered offers focus on **convenience** | "Save you 5 hours" not "give you 10× power" |
| F2P viable to Hero Lv 40+ | Must reach mid-game without paying |
| Stars sinks for cosmetics/talents/migration | Whales spend on identity, not power |
| Cap on stat multipliers | Whales can't out-buff F2P by 100×; max stack ~5-7× |

---

## 28. Telegram integration

### 28.1 Mini App SDK

The game runs as a Telegram Mini App via `tg.WebApp`. Key APIs used:

- `initData` — signed payload for auth (verified server-side)
- `MainButton` — used for primary action (e.g. "STRIKE" in raid prep)
- `BackButton` — handles back navigation
- `themeParams` — adapts to user's light/dark TG theme
- `HapticFeedback` — vibration on attacks, victories
- `popup` — Stars purchase confirmation
- `expand()` — fullscreen on open

### 28.2 Auth (initData)

```
client → server: { initData: "...", action: "..." }
server: parse initData → verify signature with bot token
server: extract user_id, username, language_code
server: look up or create player record
server: respond with auth token (short-lived JWT)
```

initData is signed by Telegram; server must verify (HMAC-SHA256 of
sorted fields with bot's secret key). Reject any request with stale or
invalid initData.

### 28.3 Bot commands

The game bot also responds to Telegram commands:

| Command | Effect |
|---|---|
| `/start` | Open Mini App; create player if new |
| `/play` | Same as /start |
| `/createfamily` (in group) | Register group as a family |
| `/family` | Show family overview in chat |
| `/war` | Show active war status |
| `/help` | Documentation |
| `/profile` | Show player stats |
| `/raid <username>` | Quick-raid via DM (deep link to Mini App) |

### 28.4 Group chat as family chat

When a TG group registers as a family:
- The game bot is added to the group with permissions: read messages,
  send messages, pin messages, view members.
- The bot listens for `new_member` events → prompts new joiners to
  register in the Mini App.
- The bot listens for `left_chat_member` → removes from family roster
  (with a 24h grace period in case of accident).
- TG group ownership = R5; TG group admin = R4 (auto-mapped, R5 can
  override).

### 28.5 Notifications

The bot sends DMs to players for high-value events:
- "Don Carlito raided you and stole 28K coins" (link to inbox)
- "Family war declared on Manila Predators!" (link to war room)
- "Your turf is under attack!" (link to map)
- "Mayor election starts tomorrow" (link to election screen)
- "Daily Ad Chest is full!" (link to Empire)
- "Your hideout upgrade finished!" (link to mansion)

Players can mute notification types in profile settings.

### 28.6 TON wallet (optional, V2+)

For markets where crypto is the angle:
- TON wallet connection via TG Wallet
- Buy gem packs with TON
- Sell premium cosmetics on a marketplace
- Stake gems for passive income
- (Carefully designed to avoid regulatory issues; this is a V2 explore)

### 28.7 Privacy

- Only TG user ID and username are stored.
- No phone number, no email.
- Players can request data export + deletion (GDPR compliance).

---

## 29. Backend architecture

### 29.1 Stack

| Component | Tech | Role |
|---|---|---|
| Web server | Node.js + Fastify | HTTP API + WebSocket |
| Game logic | TypeScript service | Combat, idle accrual, validations |
| Database | Postgres 16 | Source of truth for player/family/city |
| Cache | Redis 7 | Hot reads, leaderboards, rate limits |
| Queue | BullMQ (Redis-backed) | Async jobs: marches, training, healing |
| Analytics | ClickHouse | Event log, cohorts, dashboards |
| Storage | S3-compatible (e.g. Cloudflare R2) | Battle logs, large assets |
| CDN | Cloudflare | Static assets, Mini App HTML |
| Realtime | WebSocket gateway | Server → client push updates |
| Bot framework | Botwave (existing) | TG bot infrastructure, ownership |

### 29.2 Server tick worker

- Triggered by user actions (most common path)
- Scheduled 1-minute sweep for missed timers
- Each player has a `state_dirty_until` field
- Worker reads `state_dirty_until`, computes elapsed, applies accrual,
  resolves completed timers, writes back

Critical: a player's state is **lazy-evaluated** — only computed on
demand. This keeps DB writes 100× lower than a wall-clock tick.

### 29.3 Combat resolver

- Dedicated service (`combat-resolver`)
- Stateless; accepts (attacker_id, target_id, squad_composition, target_snapshot)
- Returns deterministic `BattleResult { rounds, winner, casualties, loot }`
- Same logic as client's `resolveRaid()` for parity; client only renders
- All randomness uses a seeded PRNG (battle replays possible)

### 29.4 Schema sketch (high-level)

```sql
players (
  id BIGINT PK,                  -- TG user id
  bot_id INT FK,
  city_id INT FK,
  family_id INT FK NULL,
  family_role SMALLINT,
  hq_level SMALLINT,
  coins BIGINT, gems INT, energy SMALLINT,
  state JSONB,                   -- hero, buildings, troops, etc.
  last_action_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);

families (
  id INT PK,
  tg_group_id BIGINT UNIQUE,
  city_id INT FK,
  name VARCHAR(48), tag VARCHAR(4),
  founder_id BIGINT FK,
  policy JSONB,
  bank JSONB,
  research JSONB,
  member_count SMALLINT
);

cities (
  id INT PK,
  name VARCHAR(64),
  region VARCHAR(32),
  mayor_id BIGINT FK NULL,
  mayor_term_ends_at TIMESTAMPTZ,
  policy JSONB
);

turfs (
  id INT PK,
  city_id INT FK,
  name VARCHAR(64),
  type VARCHAR(32),
  controlled_by_family_id INT NULL,
  state JSONB
);

wars (
  id BIGINT PK,
  type VARCHAR(16), -- "family" | "syndicate" | "city"
  side_a JSONB, side_b JSONB,
  started_at TIMESTAMPTZ, ends_at TIMESTAMPTZ,
  scoreboard JSONB
);

battle_log (
  id BIGINT PK,
  attacker_id BIGINT, defender_id BIGINT,
  outcome VARCHAR(16),
  data JSONB,
  occurred_at TIMESTAMPTZ
) PARTITIONED BY occurred_at;

events_audit (
  id BIGINT PK,
  actor_id BIGINT, actor_role VARCHAR(16),
  action VARCHAR(64),
  before JSONB, after JSONB,
  occurred_at TIMESTAMPTZ
);

iap_transactions (
  id BIGINT PK,
  player_id BIGINT FK,
  bot_id INT FK,
  product_id VARCHAR(64),
  stars_amount INT,
  status VARCHAR(16),
  telegram_payload TEXT,
  occurred_at TIMESTAMPTZ
);

ad_views (
  id BIGINT PK,
  player_id BIGINT FK,
  placement VARCHAR(32),
  revenue_estimate_cents INT,
  occurred_at TIMESTAMPTZ
);

game_config (
  key VARCHAR(64) PK,
  value JSONB,
  updated_by VARCHAR(64), updated_at TIMESTAMPTZ
);  -- all balance numbers live here
```

### 29.5 Multi-bot tenancy

The Botwave platform routes TG bot webhooks to your game service. Each
bot has a `bot_id`; players are associated with the bot that introduced
them but share global game state. This enables:

- Cross-bot leaderboards (same city, different bots)
- Cross-bot tournaments
- Revenue attribution per bot
- Bot Admin scoping (only see their bot's players)

### 29.6 Anti-cheat layer

- All RPCs go through validators (server checks every assertion)
- Rate limits per (player, action) tuple (Redis)
- Idle accrual capped at 24h
- Idempotency keys on all paid actions
- Replay protection (signed timestamps)
- ML anomaly detector (income velocity, raid frequency, account age)
- TG account age signal (< 7 days → tighter caps + manual review)
- Botwave userbot behavior signal — if no human group activity, flag

---

## 30. Where to improve from the current mockup

The current mockup ([`public/miniapp/tycoon-mockup.html`](../../public/miniapp/tycoon-mockup.html))
is a single-page HTML proof-of-concept with `localStorage` persistence.
It validates the UX and combat math but is not production. The gap to
production:

### 30.1 Backend gap

| Current | Production |
|---|---|
| `localStorage` save | Postgres + Redis |
| Client-side combat | Server-side combat resolver |
| Hardcoded targets (NPCs) | Real player matchmaking |
| Local hero state | Player record in DB |
| No auth | TG `initData` HMAC verification |
| No multi-tenant | bot_id routing |

### 30.2 Art gap

| Current | Production |
|---|---|
| Hand-coded SVG | Illustrator-produced art, Spine 2D skeletal rigs |
| CSS animations | GSAP timelines + PixiJS particles |
| Static city map | Isometric tiled map with PixiJS |
| Placeholder fight | Spine-animated combat sequences |
| No sound | Howler.js soundtrack + SFX |
| Limited cosmetics | Skins, banners, animations marketplace |

### 30.3 Feature gap

The mockup currently has:
- ✅ Empire screen (real businesses, idle accrual)
- ✅ Mansion (real building upgrades)
- ✅ Army modal (5 unit types, counters)
- ✅ Hero modal (skills, gear, talents)
- ✅ Power breakdown
- ✅ City (raid prep + combat + result)
- ✅ Family (boss, members, contributions)
- ✅ War room (contribution, battle log)
- ✅ Shop (gem packs, Capo Pass, cosmetics)

Missing (TODO from this doc):
- ⏳ Street Forces screen
- ⏳ Story Mode tab
- ⏳ Mayor Election UI
- ⏳ Turf system UI
- ⏳ Real-time city map with convoys
- ⏳ Notifications / inbox
- ⏳ Scout system UI
- ⏳ Profile / stats screen
- ⏳ Achievements
- ⏳ Battle Pass UI
- ⏳ Triggered offers system
- ⏳ Bot Admin panel
- ⏳ Owner dashboard
- ⏳ Telegram WebApp SDK integration (initData, theme, haptics)
- ⏳ Stars purchase flow (Telegram Stars sdk)
- ⏳ Adsgram integration
- ⏳ Push notifications via bot

### 30.4 Polish gap

- Sound design
- Voice acting (V2)
- Day/night cycle on city map
- Weather effects (rain, snow during events)
- Loading screens with personality
- Cinematic story-mode cutscenes

---

## 31. Roadmap

### Phase 0 — Mockup (DONE)
- ✅ Single-page HTML mockup, hand-coded SVG art
- ✅ Real game state with localStorage, combat math, casualties
- ✅ All 5 main screens + Mansion / Army / Hero / Power modals
- ✅ Raid flow (prep → fight → result)
- ✅ Merged in PR #557

### Phase 1 — MVP backend (6–8 weeks)
1. Postgres schema + ORM
2. Player + Family + City CRUD via API
3. TG Mini App `initData` auth
4. Server tick worker
5. Combat resolver port from client
6. Bot framework integration (Botwave hookup)
7. Daily login, energy, businesses (full server-side)
8. Single-city deployment (Lagos) for friends-and-family testing

### Phase 2 — PvP & Family (3–4 weeks)
9. Real matchmaking (city-bounded)
10. Family creation via `/createfamily`
11. Group chat as family chat
12. Family bank, donations, members roster
13. Family wars (declare, accept, scoring)
14. Newbie shield + buyable shields

### Phase 3 — Monetization (2–3 weeks)
15. Telegram Stars payment flow + webhook validation
16. Capo Pass subscription
17. Gem pack purchases
18. Adsgram integration
19. Triggered offers system
20. First analytics dashboard

### Phase 4 — City layer (3–4 weeks)
21. Turfs + capture mechanic
22. City map with isometric tiles (PixiJS)
23. Convoys + scouting
24. City leaderboards
25. Mayor election (full flow)

### Phase 5 — Content & engagement (4–5 weeks)
26. Street Forces (recruits + missions)
27. Story Mode chapters 1-5
28. Battle Pass season 1
29. Cosmetics marketplace
30. Family research tree

### Phase 6 — Cross-bot tournaments (3 weeks)
31. KvK (City vs City)
32. Cross-bot bracket
33. Promo events via Bot Admin

### Phase 7 — V2 polish & expansion (ongoing)
34. Production art replace (Spine 2D)
35. Sound + voice acting
36. Multi-language localization
37. TON wallet integration
38. Story Mode chapters 6-10
39. T4 / T5 troop tiers
40. Native iOS / Android wrapper (optional, for cosmetic premium)

### Estimated total to V1: 20–25 weeks
### Team needed: 2 backend, 1 frontend, 1 game designer, 1 illustrator, 1 PM
### Budget rough: $80-150K for V1 launch (team rates dependent)

---

## 32. Project assessment & risk audit

This section is the honest take. The rest of this doc is what we *want*
to build; this section is what is actually likely to ship and where the
project can die before it gets there. Read it before committing
engineering hours.

### 32.1 Verdict in one paragraph

The project is **worth building** — but only if we cut V1 scope to ~30 %
of this doc, validate distribution **before** writing the backend, and
gate every post-launch feature on a retention number. The structural
advantages (Botwave's existing user base, TG group ↔ family identity,
zero-install Mini App, Stars-native monetization) are real and rare.
The structural risks (scope creep, PvP-first cold start, theme reach,
solo founder is a SaaS founder not a game studio) will kill the project
faster than the advantages can save it if we don't acknowledge them.

### 32.2 Structural advantages (the things working in our favor)

| Advantage | Why it matters | Translates to |
|---|---|---|
| **Botwave user base** | Owned distribution we already have. Cold-launch problem is mostly solved if even 5–10 % of existing bot DAU taps in. | Day-1 install funnel; cheap validation; first 1k DAU on day of launch. |
| **TG group ↔ family identity (§5, §18)** | Mafia City spent millions building alliance chat that nobody uses. We use the chat people already check 30× a day. | Highest possible D7/D30 retention lever — players don't leave the family because they don't leave the group. |
| **Zero-install Mini App (§28)** | 2-second open from any chat. No store, no APK, no review. | 5–10× conversion vs native game install funnel. |
| **Stars-native monetization (§24)** | 1-tap purchase, no card flow, payout to Telegram balance. | ARPPU lift vs USD card IAP because friction is gone. |
| **Cross-bot tournaments (§21)** | Multiple bots running the same game means shared liquidity for KvK events. | Each new partner bot is a marginal-cost distribution channel. |
| **Mockup already exists** | Real-data combat, casualties, clinic, raid flow already playable. | De-risks the "is this fun" question before backend spend. |

### 32.3 Real risks (the things that can kill this)

These are listed in rough order of how likely they are to actually
matter. Each has an explicit mitigation that drives a roadmap or scope
decision elsewhere in this doc.

#### 32.3.1 Scope risk — the design doc is the aspirational scope

The doc as written is the **V3 game**, not V1. Sections 11 (Street
Forces), 17 (Mayor Election), 20 (City vs City wars), 21 (Cross-bot
tournaments), 22 (Story Mode), and 26 (Battle Pass) are V2+ features.
Trying to ship all of them as launch scope is the single most likely
failure mode.

- **Symptom:** Engineering takes 6–9 months instead of 8–10 weeks,
  burn rate eats the runway, no live product to iterate against, no
  retention data to fundraise on.
- **Mitigation:** Aggressive V1 scope cut, owned by a single named
  scope-owner. See §33.1 for the V1 / V2 / V3 split.
- **Heuristic:** If a feature is not on the **5-minute hook (§4)**
  critical path or is not load-bearing for D7 retention, it is V2 or
  later. No exceptions for "but it'd be cool."

#### 32.3.2 PvP-first cold start

The current design assumes real PvP from session 1 (§4, §15). That is
correct for a **live** game with thousands of players, but lethal for a
**cold** city with 12. First users open the app, see an empty city,
get raided once by the only other player online, and quit.

- **Symptom:** D1 retention craters at launch. First-100-user cohort
  posts in TG support: "no one to play with" / "got farmed."
- **Mitigation:** 7–14 day solo runway before PvP unlocks. NPC raid
  targets (server-generated families with believable names and weak
  defenses) seeded into every new city until population > N (e.g. 100
  active players). Mafia City itself lets you play ~24 h solo before
  forcing PvP; we should give ourselves a longer ramp because our
  cold cohort is smaller.
- **Doc impact:** §15 (The City) and §4 (5-minute hook) need an
  explicit "shielded onboarding window" subsection. Tracked as an open
  design question in §34.

#### 32.3.3 Theme reach — Mafia branding has a ceiling

"Cosa Nostra / Mafia" branding takes a 20–30 % reach hit in some
markets (notably MENA, some EU jurisdictions, app-store-adjacent
audiences sensitive to crime themes). Mafia City itself shipped
re-skins for these regions.

- **Symptom:** Some bot operators refuse to embed the game; some
  markets have lower CTR on the launch landing page; ad networks
  reject the creative.
- **Mitigation:** Treat the theme as a skin, not as architecture. Run
  an A/B between **Cosa Nostra Tycoon** and a less-loaded variant
  (e.g. **Crime City**, **Hustle City**, **The Streets**) on a
  separate sub-bot during the §33.2 validation week. Whichever has
  better tap-through is the launch theme.
- **Doc impact:** §2 (Vision) art direction stands; only branding
  varies. Engine code uses a `theme_id` everywhere a string user-facing
  noun appears.

#### 32.3.4 Crowded category — we cannot out-feature Mafia City

Mafia City has ~200 engineers, 8+ years of live ops, daily content,
and a season pass team. We have 1 founder, 1 doc, and (per §31) a
2 backend + 1 frontend + 1 designer + 1 illustrator + 1 PM team for V1
if we hire. Trying to **match** their feature surface is a losing
strategy.

- **Symptom:** We build "their game minus 80 %" and players just go
  play their game.
- **Mitigation:** Win on the three structural axes Mafia City
  **cannot** match: TG-native social (§32.2), zero-install (§32.2),
  cross-bot platform (§21, §32.2). Cosa Nostra Tycoon at 30 % of this
  doc's scope still beats 90 % of TG-native games, which is the
  comp set that actually matters for distribution.
- **Heuristic:** When a feature is being added "because Mafia City has
  it," that is a no-add unless it also moves D7 or ARPDAU.

#### 32.3.5 Founder fit — SaaS founder, not game studio

The founder ships SaaS (Botwave). Game economy, daily content
cadence, live-ops calendar, season passes, balance patches, and
event design are full-time disciplines that SaaS founders
chronically underestimate.

- **Symptom:** Economy goes inflationary, daily content stops
  shipping at week 8, season pass is announced and slips, players
  notice and quit.
- **Mitigation:** Plan to hire (or contract) a **game designer**
  with live-ops experience at 5K MAU. Until then, the live-ops
  calendar is explicit and small: one event per 2 weeks, fixed
  template, no novelty. Better to ship a boring event on time than
  a great event late.
- **Doc impact:** §31 already lists "1 game designer" in the V1
  team. Make the hire trigger explicit: **at 5K MAU, the designer
  hire is critical-path.**

#### 32.3.6 Pre-launch funding is a trap

TG-game investors fund **proven retention + monetization**, not
decks. Raising on this doc pre-launch yields terrible terms or no
terms at all.

- **Mitigation:** Do not raise until we have **D7 ≥ 25 %** and
  **ARPDAU ≥ $0.05** on a real cohort of ≥ 5 K users. Until then,
  Botwave revenue and founder time are the funding source.
- **Doc impact:** §33.5 KPI gates govern fundraising readiness, not
  just feature unlocks.

#### 32.3.7 TON integration is a V3 trap

TON wallet integration looks great on Twitter but adds dev time,
regulatory exposure, smart-contract audit cost, and gates the
purchase flow on users having a TON wallet (most don't). Stars
already gives us a 1-tap native flow.

- **Mitigation:** Cut TON from V1 and V2. Revisit only if a
  TON-native distribution partner offers material co-marketing in
  exchange for integration, or if cosmetic NFT becomes a real
  retention lever post-V2.
- **Doc impact:** §28.4 already lists TON wallet as Phase 7 (V2
  polish). Reaffirm: **TON is V3, not V2.** §34 open question on
  TON scope still stands, but the answer for V1 is "no."

#### 32.3.8 Cheating & multi-accounting

This is a structural risk for any PvP game and especially one where
a player's identity is "a TG account." TG accounts are cheap to
spin up; multi-accounting to seed your own family with farms is the
obvious exploit.

- **Mitigation:** TG account age + Stars purchase history as a
  primary trust signal (§28). New accounts shielded longer. Family
  donations / transfers velocity-capped per fresh account. Aggressive
  shadow-ban over hard-ban for the first offense to preserve
  false-positive recoverability.
- **Doc impact:** Tracked as an open question in §34 (cheating
  defaults — aggressive auto-ban vs human review).

### 32.4 Risk matrix (likelihood × impact)

| Risk | Likelihood | Impact if it hits | Where mitigated |
|---|---|---|---|
| Scope creep (32.3.1) | **High** | **Project-killing** | §33.1 scope cut, single scope-owner |
| PvP cold start (32.3.2) | **High** | **High** (kills D1) | §33.2 validation, shielded onboarding |
| Theme reach (32.3.3) | Medium | Medium (reach ceiling) | §33.2 A/B test, theme as skin |
| Out-featuring Mafia City (32.3.4) | High | Medium (slow death) | Pick 3 structural wins, ignore the rest |
| Founder fit (32.3.5) | Medium | High at scale | Hire designer at 5K MAU |
| Pre-launch funding (32.3.6) | Medium | Medium (bad terms) | Hit §33.5 gates before raising |
| TON detour (32.3.7) | Medium | Medium (sunk cost) | TON = V3, locked |
| Cheating (32.3.8) | High at scale | Medium (D30 drag) | TG-age trust signal, shadow-ban |

"Project-killing" means the project does not reach V1 in any usable
form. "High impact" means a measurable hit to D7 / ARPDAU / runway but
the project can still recover.

### 32.5 What we are explicitly betting on

For the avoidance of doubt — here are the bets this design takes.
If any of these turn out false during the §33.2 validation window,
**stop and re-plan**.

1. **Botwave DM tap-through > 10 %.** If we DM existing Botwave
   users a "coming soon" landing page and fewer than 10 % tap, the
   distribution thesis is wrong and the product won't save it.
2. **TG group ↔ family is the killer feature.** If user research
   says players don't want their TG groups conscripted into game
   families, the §18 design has to change.
3. **Stars converts at SaaS-grade rates** (1-tap > 5 % of MAU pay
   at least once in month 1). If Stars conversion is closer to
   USD-card-IAP rates, the monetization model needs to lean harder
   on Adsgram and Battle Pass.
4. **Mafia branding is fine outside MENA.** If the A/B (§33.2)
   shows the un-themed variant wins everywhere, we re-skin.

### 32.6 What this section is *not*

This is not a kill-the-project section. The structural advantages
in §32.2 are genuinely rare — most TG mini-games have one of them;
this project has all six. The point of §32.3 is to make the risks
**explicit and dated** so we don't pretend they aren't there. Every
risk above has a mitigation that is the responsibility of a specific
roadmap phase in §31 or a specific gate in §33.5.

---

## 33. Distribution & launch playbook

This section governs **how the product reaches users**. The design doc
above this point governs **what** we build; this section governs
**when** and **for whom**. If §32 is "do not lie to ourselves about
risk," §33 is "do not lie to ourselves about distribution."

The rule of this section: **distribution is validated before the
backend is written, not after.**

### 33.1 V1 / V2 / V3 scope split

The roadmap in §31 is engineering phases. The scope split below is
**product** scope — what's in the box at each public release.

#### V1 — Launch box (~8–10 weeks of engineering)

Single Lagos city, single bot, friends-and-family scale (target 1–5 K
DAU at launch). Everything below is load-bearing for the 5-minute
hook (§4) and D7 retention. **If it isn't on this list, it's V2+.**

- Postgres schema + initData auth (§29, §28)
- Player + Hero + Buffs (§8, §9)
- Buildings + upgrades (§13) — HQ, Barracks, Vault, Clinic only
- Troops T1–T3 (§10) — no T4/T5, no Street Forces
- Combat engine (§14) port from mockup, server-authoritative
- Energy + idle accrual + daily login (§3)
- **Shielded onboarding window**: 7–14 day NPC-only raids before PvP
  unlocks (mitigation for §32.3.2)
- Single-city PvP (§15) — no turfs, no mayor, no city vs city
- Stars IAP webhook + Capo Pass + 3 gem packs (§24)
- Adsgram rewarded video for energy / chest (§25)
- 1 triggered offer template (§26) — no Battle Pass
- Bot DM push for shield-expiring + raid-incoming + idle-cap
- Telegram group as **read-only family chat passthrough** — no
  family bank, no roles, no war scoring yet (V1.1)

Explicitly **out** of V1: Street Forces, Mayor Election, City vs City
wars, cross-bot tournaments, Story Mode, Battle Pass, full Family
system, TON, T4/T5 troops, multi-city.

#### V1.1 — Families (~3–4 weeks after V1 launch)

Unblock the social retention lever. Only ship once V1's D7 ≥ 20 %.

- Family create / join / leave / dissolve (§18)
- R1–R5 roles, group admin → family officer mapping (§18, §6)
- Family bank, donations, member roster (§19)
- Family-vs-Family war declare / accept / scoring (§20)
- Family chat → game event bridge (raid notifs → group)

#### V2 — City & content (~3–4 months after V1.1)

Only ship once V1.1's D30 ≥ 12 % and ARPDAU ≥ $0.05.

- Turfs + capture mechanic (§16)
- City map (PixiJS isometric tiles)
- Convoys + scouting
- Mayor election full flow (§17)
- Story Mode chapters 1–5 (§22)
- Battle Pass season 1 (§26)
- Street Forces (§11) — recruits + missions
- T4 troops, Family research tree (§19)

#### V3 — Platform & polish (timeline driven by V2 metrics, not calendar)

- Cross-bot tournaments + KvK (§21)
- Multi-city deployment
- T5 troops, advanced cosmetics
- TON wallet integration (§28.4) — *only* if a distribution partner
  makes it worth the audit cost
- Spine 2D production art replace
- Multi-language localization
- Native iOS / Android wrapper (cosmetic-premium tier only)

#### Scope governance rule

A feature only moves up a tier (V2 → V1.1, V3 → V2, etc.) by
**written exception** with a one-paragraph justification of why the
launch retention number depends on it. Default answer to "can we add
X to V1" is **no**.

### 33.2 Validate distribution **before** building the backend

The single highest-EV thing we can do this week is **find out whether
distribution works** before spending engineering hours on the backend.
If the distribution thesis is wrong, the product doesn't matter.

#### Day 1–2 — Stop adding features to the doc

Freeze the design doc. No new sections, no new mechanics. The doc is
already long enough; further additions are procrastination disguised
as productivity. (This is the section that closes that freeze.)

#### Day 3–7 — Ship a "coming soon" landing page

Tiny scope. Should be one engineer-day, max two:

- A static landing page with: hero shot from the mockup, 3–4
  screenshots, one paragraph of pitch, a TG bot username input
  ("drop your @ to be notified at launch"), an email field (optional).
- Drop the landing URL into Botwave's existing bot DMs as a
  one-time promo card to all opted-in users.
- Track: open rate, tap rate (Botwave DM → landing), signup rate
  (landing → @-capture), and theme A/B (Cosa Nostra vs neutral
  variant, see §32.3.3).

**Pass criterion:** ≥ 10 % of DM-recipients tap the landing page.
**Fail criterion:** < 5 % tap. If we fail, the distribution thesis
is broken and no amount of backend rescues it. Re-plan before
writing schema migrations.

#### Week 2–3 — Cold-DM 20 partner bot operators (B2B2C)

In parallel with backend prep. The cross-bot platform (§21) is only
real if other bot operators want in. Validate that **before** we
build the cross-bot infrastructure.

- Identify 20 TG bot operators in adjacent verticals (utility bots,
  community bots, channel bots) with ≥ 5K MAU each.
- Cold-DM them with a 3-paragraph pitch: game, our distribution
  numbers from Day 3–7, revenue share offer.
- Goal: 2–3 signed letters of intent (LOI) — informal email or DM
  is fine — to embed the game when V1 ships.
- LOIs are the validation. Without them, the §21 cross-bot
  tournament work is V3, not V2.

#### Week 4–12 — Build V1

Only if Day 3–7 hits the pass criterion. Build V1 per §33.1.

- Single named scope-owner for V1.
- Weekly demo to scope-owner against the §4 5-minute-hook checklist.
- Anything not on the V1 list (per §33.1) is rejected on intake,
  not at sprint end.

#### Week 13 — Soft launch via Botwave + 2–3 partner bots

Open V1 to the @-captures from Day 3–7 + the partner-bot LOIs.
Expected order of magnitude: 5K–50K instant users depending on
partner-bot fan-out.

- Day-1 monitoring: server tick stability, raid resolver throughput,
  Stars webhook validation, Adsgram fill rate.
- Day-3 cohort cut: D1 retention, install funnel by source bot.
- Day-7 cohort cut: D7 retention, ARPDAU, Capo Pass attach rate.

#### Week 14+ — Iterate on retention, not features

The post-launch trap is "let's ship more features so users come
back." Wrong. The post-launch correct move is "let's fix the leaks
in the current funnel until D7 ≥ 25 %, then ship V1.1."

### 33.3 User acquisition channels — ranked by ROI

Four tiers, in order of cost-per-DAU (lowest first). Higher tiers
unlock when lower-tier saturation is reached, not before.

#### Tier 1 — Owned distribution (Botwave bots) — *free*

Highest-ROI channel by a wide margin. Day-of-launch DAU should come
**entirely** from this tier.

- One-time launch DM card to opted-in Botwave users.
- Recurring placement: `!play` / `/games` commands route to Cosa
  Nostra in addition to existing minigames.
- Promo-system slot (CLAUDE.md "every 10th use of creative commands")
  rotates Cosa Nostra into the link wheel.
- Cost: $0. Effective CAC: $0. Limit: Botwave MAU.

#### Tier 2 — Partner bots (B2B2C revenue share) — *cheap*

Second-highest ROI. Operator gives us their users; we share Stars
revenue with them at 20–30 %.

- Embed model: partner bot adds a `/play` command that opens the
  game with a partner-bot tag in initData; revenue tracked per tag.
- Validated in §33.2 Week 2–3 with LOIs.
- Cost: rev share only. Effective CAC: ~0 upfront, ~20–30 % LTV.
- Limit: number of partner bots and their MAU.

#### Tier 3 — TG channel cross-promo + Adsgram cross-promo — *medium*

Mid-tier ROI. Paid placement on TG news/gaming channels and
in-network Adsgram swaps with other Mini Apps.

- TG channel buys: only after Tier 1+2 saturate. Negotiate flat-rate
  posts on 3–5 gaming/finance/Africa-business channels.
- Adsgram cross-promo: list our own rewarded-video inventory back
  into the network to earn cross-promo impressions from other Mini
  Apps. Net-out cost depends on relative eCPM.
- Cost: paid. Effective CAC: $0.10–$0.50 per install in good markets,
  higher elsewhere. **Only profitable if ARPDAU ≥ $0.05 first.**

#### Tier 4 — Off-platform paid acquisition — *expensive, last*

Lowest ROI. Twitter, Reddit, TikTok, IG. Off-platform users have
the highest install-to-Mini-App-open drop-off and the worst LTV.

- Only run after Tiers 1–3 saturate.
- Never run before D7 ≥ 25 % — paying to import users into a leaky
  funnel is how studios burn runway.
- Cost: high. Effective CAC: $1–$3 / install in best case.

#### Channel allocation principle

Spend on a tier only after the tier below it has been saturated.
"Saturated" means CAC has risen above the next tier's CAC, or
volume has plateaued for 2 consecutive weeks.

### 33.4 Pre-launch validation gates

These are gates **between phases**, not after launch. Each is a
small, dated, falsifiable test.

| Gate | Trigger | Pass criterion | Fail action |
|---|---|---|---|
| **G0 — Demand** | End of Day 7 | ≥ 10 % tap-through on Botwave DM landing card | Re-plan; consider theme A/B, audience re-cut |
| **G1 — Partners** | End of Week 3 | ≥ 2 partner-bot LOIs signed | Cross-bot work demoted to V3 |
| **G2 — Theme** | End of Week 3 | A/B winner is statistically clear | Pick higher-tap-rate theme as canonical; engine uses `theme_id` |
| **G3 — Backend ready** | End of Week 12 | V1 §33.1 checklist 100 % complete; 50–100 friends-and-family playing | Slip launch 2 weeks; do not add features |
| **G4 — Launch** | End of Week 13 | First-day no SEV-1 issues; D1 ≥ 35 % | Hotfix only; no V1.1 work until G5 |
| **G5 — V1.1 unlock** | End of Week 18 (post-launch wk 5) | D7 ≥ 20 %, ARPDAU ≥ $0.03 | Iterate V1 funnel, do not start Families |
| **G6 — V2 unlock** | Driven by metrics | D30 ≥ 12 %, ARPDAU ≥ $0.05 | Stay on V1.1; iterate retention |
| **G7 — Fundraise** | Driven by metrics | D7 ≥ 25 %, ARPDAU ≥ $0.05, ≥ 5K MAU | Self-fund until gate trips |

### 33.5 KPI gates before adding features

This is the single most important piece of post-launch discipline.

> **Do not add features unless D7 retention is above 25 %.**

D7 is the number that investors, partners, and Telegram itself care
about for Mini Apps. ARPDAU is the number that gates whether paid
acquisition (Tier 3+) is even legal accounting (revenue ≥ CAC).

**Hard rules:**

- D7 < 20 %: only fixes, only funnel work. No new mechanics.
- D7 20–25 %: small content drops OK (event templates, balance
  patches). No new systems.
- D7 ≥ 25 %: V1.1 (Families) is on the table.
- D30 ≥ 12 % **and** ARPDAU ≥ $0.05: V2 (City + Battle Pass) is on
  the table.
- ARPDAU < $0.05: no Tier 3+ paid acquisition. Period.

**Why these numbers:** D7 25 % is the published benchmark for
top-quartile TG Mini Apps. ARPDAU $0.05 is roughly the floor where
Adsgram + Stars combined cover CAC on Tier 2–3 channels. Below
that, growth is unprofitable and the runway shortens with every
new user.

### 33.6 Red flags during launch — stop conditions

If any of these trip in the first 4 weeks post-launch, **stop adding
features** and fix the funnel:

1. **D1 < 25 %.** Onboarding is broken. Re-check the 5-minute hook
   (§4) end-to-end. Likely culprits: shielded onboarding window
   too short (32.3.2), tutorial too long, first raid loss feels
   unfair.
2. **D7 < 15 %.** Core loop is not engaging. Re-check idle accrual
   cadence, daily login reward, shield-expiring DM trigger.
3. **Stars conversion (paying users / MAU) < 2 %** by week 4.
   Either price tiers are wrong, trigger placement is wrong, or
   the Capo Pass value prop is not landing. A/B price + trigger
   before A/B'ing content.
4. **Partner bot install share < 20 % of total**. Tier 2 isn't
   working. Re-pitch with launch numbers; if 3 weeks later still
   < 20 %, demote cross-bot (§21) to V3.
5. **Refund rate on Stars > 5 %.** Telegram review risk. Audit the
   Stars webhook validation path (§24) and check for purchase-not-
   delivered bugs first; payment-flow bugs masquerade as content
   complaints.

### 33.7 Launch communications

Small but load-bearing. The launch announcement is *one* DM card,
*one* TG channel post, and a partner-bot rollout. Not a campaign.

- Botwave DM: timed for Friday evening local — gaming session
  starts at home.
- TG channel post: tags @-list captured in Day 3–7.
- Partner bots: each operator decides their own timing; we provide
  a copy template and screenshots, they post.
- Press / Twitter / off-platform: **not at launch.** Saved for the
  V1.1 (Families) launch, which is a more interesting story
  ("our users brought their own group chats").

### 33.8 What this section is *not*

This is not a marketing plan. It's the **distribution discipline**
that backs the design choices upstream. The numbers in §33.5 are
the actual product spec for "is this version of the game shippable
to the next phase," and they bind decisions in §31 (Roadmap) and
§32 (Risk audit). When the numbers say wait, we wait, regardless of
what the doc above this section says we *could* build next.

---

## 34. Open design questions

These are things this doc deliberately punts on — answer before MVP.

1. **City TZ:** Is Lagos City for Africa users, or just a name? Should
   cities have a time zone for daily resets?
2. **Family chat moderation:** What if a TG group goes nuts and starts
   spamming the game bot? Mute thresholds?
3. **Cross-language families:** Allowing players from different
   `language_code` into one family? Probably yes but with auto-translate
   in chat?
4. **F2P energy cap vs Whale:** Should whales get bigger energy pool, or
   same as F2P? Balance — more energy = more raids = more income.
5. **TON integration scope:** Just gem purchases, or full marketplace?
   What jurisdictions to restrict?
6. **NPC scaling at higher HQ:** When a player is HQ 22 but only has a
   weak family, what NPC content do they get?
7. **Family-skipping:** Should there be solo-viable endgame for players
   who hate families? Or force family membership eventually?
8. **Mayor abuse:** A single family runs mayor + city => double-buffs.
   Already have anti-collusion rules, but is it enough?
9. **Cross-bot tournament prizes:** Real money? Stars? Cosmetics? TON?
10. **Tribal aesthetic risk:** "Mafia City" / "Cosa Nostra" branding —
    fine in most markets, sensitive in others. Localized name versions?
11. **Cheating defaults:** Aggressive auto-ban vs human-review?
    False-positive cost vs false-negative cost.
12. **Save backup / restore:** Should players be able to backup their
    state to TG cloud storage in case of account recovery?

---

## 35. Glossary

| Term | Meaning |
|---|---|
| **Mini App** | Telegram's webview embedded game; opens from chat |
| **Bot** | A Telegram bot running on Botwave platform |
| **Family** | Game-side alliance; mapped 1:1 to a TG group |
| **City** | Logical server (500-2000 players); identity tag |
| **Turf** | Capturable territory inside a city |
| **HQ** | Hideout HQ — master gate building |
| **Power** | Sum metric of player strength; used for matchmaking |
| **R5 / R4 / R3 / R2 / R1** | Family roles (boss / underboss / capo / made man / soldier) |
| **War Points** | Score earned by raiding during wars |
| **KvK** | "Kingdom vs Kingdom" — cross-city event |
| **Capo Pass** | Monthly subscription |
| **Stars** | Telegram's native currency |
| **Gems** | In-game soft premium currency |
| **Coins** | In-game basic currency |
| **Heat** | Aggregate police attention; throttles Street Forces |
| **Street Forces** | Independent recruits running side missions |
| **Adsgram** | Rewarded video ad network on Telegram |
| **DAU / MAU** | Daily / Monthly Active Users |
| **ARPU / ARPPU** | Avg Revenue Per User / Per Paying User |
| **LTV** | Lifetime value of a player |
| **Botwave** | The platform this game ships on (eksucampusmarketplace's existing bot SaaS) |

---

## Closing

This document is a **living spec** — it should be updated as design
decisions are made and as the game ships. Every section ties back to the
working mockup at `public/miniapp/tycoon-mockup.html`, which already
demonstrates the core loop, combat math, and visual direction. The path
to V1 is laid out in §31; the path to differentiation (vs Mafia City) is
laid out in §2 (Telegram-native social graph + zero-install + cross-bot
platform).

Risk audit and bets in §32 govern whether we ship at all; distribution
playbook and KPI gates in §33 govern when each phase unlocks. Open
questions in §34 deserve discussion before each phase begins. Roles in
§6 govern who can change what. Monetization in §24–26 is the fuel.
Everything else is execution.

— v0.4, design pass adding §32 (project assessment & risk audit) and
§33 (distribution & launch playbook). Builds on v0.3 (PR #557 merge and
"use real data + battle stats + role-based access" requirements).
