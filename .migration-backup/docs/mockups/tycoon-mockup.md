# Cosa Nostra Tycoon — Visual Mockup

Standalone interactive UI mockup for a Telegram-Mini-App tycoon/mob game that
maps Mafia City–style mechanics onto Telegram's native social graph (groups
as families, group admins as bosses, cross-group/cross-bot wars).

This is **design/exploration work only** — no backend yet. The HTML is
self-contained (inline CSS + JS, no external assets) and now ships a real,
data-driven game loop on top of the cartoon art direction: a single `STATE`
object ticking every second, full Mafia City–style combat math (units with
counters, hero/research/gear multipliers, round-by-round damage,
wound-vs-kill casualties, clinic queue), and `localStorage` persistence so
refreshing the page keeps your coins, energy, casualties, war score, etc.

## Where it lives
- `public/miniapp/tycoon-mockup.html` — single self-contained file. Opens
  directly in a browser or as a Telegram Mini App URL once routed.

## How to view
Local Botwave dev server:
```
npm run dev
# then open http://localhost:3000/miniapp/tycoon-mockup.html
```
Or just open `public/miniapp/tycoon-mockup.html` in any browser.

## Screens demonstrated
Bottom nav switches between Empire / Family / City / War / Shop. Tap
`Manage HQ ›` on Empire for Mansion, `⚔ Army ›` on Mansion for the army
modal, the hero card for the hero modal, the coin pill for the power
breakdown modal, and `⚔ RAID` on the City screen to open the 3-phase
battle flow.

1. **Empire (home)** — resource bar (coins / gems / energy / power), Don
   Rattori hero card with family power, crew strip (Tony Whiskers, Big
   Pidge, Vinny 2-Paws, Sal "The Fox"), hideout preview, businesses with
   real idle accrual + COLLECT, family war banner.
2. **Mansion / HQ** — skyline header + stats row (Hideout Lv / Defense /
   Crew Cap / Vault), 8 upgradeable buildings (Hideout HQ, Vault, Training
   Yard, Clinic, Garage, Armory, Walls, Speakeasy) each with cost, real
   countdown, RUSH, and HQ-gated locks.
3. **Army (modal)** — 5 unit types (Bruiser / Shooter / Biker / Driver /
   Made Man) with HP / ATK / DEF / speed / load, the rock-paper-scissors
   counter system (e.g. Bruiser +50% vs Bikers, −35% from Shooters),
   training queue and the Clinic with healing queue and bed cap.
4. **Hero (modal)** — skill bars (Attack / Defense / Leadership / Stealth /
   Charisma), gear slots with rarity coloring (Fedora / Tie / Ring / Cigar /
   Watch), talent dots across Economy / Military / Defense / Espionage /
   Raid trees.
5. **Power (modal)** — total power broken into Troops / Buildings / Hero /
   Research / Gear with colored bars.
6. **Family** (= a Telegram group) — Iron Whiskers crest, Lagos City +
   rank, TG chat link card, daily Family Boss with HP bar, member roster
   with R5/R4/R3 roles and weekly donations.
7. **City Map** — Lagos City with your gold turf, enemy turfs
   (red/blue/green/purple), convoy line animation, nearby targets list
   showing power / vault / distance / live win-chance / shield state.
8. **War Room** — Iron Whiskers vs Manila Predators clash with score bar
   and countdown, action grid (Rally / Solo / Scout / Shield), war
   contribution leaderboard, battle log (raid wins / defeats / rallies)
   updated live as you raid.
9. **Shop** — Capo Pass VIP, Telegram Stars gem packs, utilities
   (shield / energy / speedup / migration), cosmetics.
10. **Raid modal** — 3 phases: **prep** (target card, your squad vs
    defense, squad composition by unit type, march time / loot cap /
    vault / unlocked %, hero+research+gear bonus tags, win chance),
    **fight** (progress bar + status text), **result** (loot or rep
    loss + full round-by-round combat log with losses per unit type +
    casualty breakdown showing wounded → clinic vs dead).

## Real game state (new in this revision)
- Single `STATE` object holds player, hero, family, buildings, troops,
  research, gear, businesses, war, targets, battle log, clinic queue.
- Persisted to `localStorage` under `cnt_save_v3`. Refresh keeps progress.
- 1 Hz tick: energy regen, business idle accrual, building upgrade
  timers, troop training queues, clinic healing queue.
- Power = troops + buildings + hero + research + gear, each computed
  from the current state.
- Combat: `winChance` uses squad attack vs target defense + hero edge +
  raid bonus; `resolveRaid` runs up to 6 rounds, applies wall absorption,
  splits casualties into 65% wounded (clinic) / 35% dead, awards loot
  capped by squad load and vault protection, writes a battle log entry,
  and updates war points and reputation.

## Why a single HTML file?
- Loads instantly in any browser or as a Telegram Mini App.
- All art is hand-coded SVG so the bundle stays small (~120 KB) and ships
  the full set of screens without external assets.
- Animations are CSS-only — production version would use PixiJS/Phaser for
  the canvas-heavy parts (city map, fight scenes) and Spine 2D for character
  skeletal rigs.

## Not in scope for this PR
- Backend / game state engine
- Real Telegram WebApp SDK integration (no `tg.initData`, no auth)
- Real ad / Stars / TON payment hooks
- Production art (this uses placeholder hand-coded SVG mascots)
- Multi-bot orchestration

## Next steps once the direction is approved
1. DB schema (Player → Family → City → Bot → Tournament).
2. Bot registration flow + `/register` commands.
3. Server-authoritative game loop (anti-cheat from day 1).
4. PixiJS canvas + Spine 2D rigs replacing hand-coded SVGs.
5. Adsgram + Telegram Stars integration.

See the standalone HTML for the full visual reference.

## Master design document
For the full game design — game logic, families (create/join/leave), city
& turf system, mayor election, troop tiers, buildings, companies, combat
math, Street Forces, story mode, statistics, ads + Stars IAP placements,
Telegram integration, backend architecture, role-based access (Users /
Bot Admins / Platform Owners), roadmap — see
[`docs/design/cosa-nostra-design.md`](../design/cosa-nostra-design.md).
