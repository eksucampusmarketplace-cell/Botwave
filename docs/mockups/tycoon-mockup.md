# Cosa Nostra Tycoon — Visual Mockup

Standalone interactive UI mockup for a Telegram-Mini-App tycoon/mob game that
maps Mafia City–style mechanics onto Telegram's native social graph (groups
as families, group admins as bosses, cross-group/cross-bot wars).

This is **design/exploration work only** — no backend, no game logic, no
production integration. The HTML is self-contained (inline CSS + JS, no
external assets) and demonstrates that a cartoon art direction can carry the
full set of mob-strategy mechanics inside a Mini App context.

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
The bottom nav switches between 6 screens; tapping **RAID** on the City screen
opens a 3-phase battle modal.

1. **Empire (home)** — Don Rattori hero card, crew strip (Tony Whiskers,
   Big Pidge, Vinny 2-Paws), hideout preview (cartoon skyline), business
   timers (Pizzeria/Casino/Laundromat/Docks + locked tiers), family war banner.
2. **Mansion / HQ** — cartoon skyline header, stats row (Hideout Lv, Defense,
   Crew Cap, Vault), 8 upgradeable buildings: Hideout HQ, Vault, Training
   Yard, Clinic, Garage, Armory, Walls, Speakeasy (locked).
3. **Family** (= a Telegram group) — Iron Whiskers crest, Lagos City + rank,
   TG chat link card, daily Family Boss with HP bar, member roster with
   R5/R4/R3 roles and weekly contributions.
4. **City Map** — Lagos City with your gold turf, enemy turfs
   (red/blue/green/purple), capturable + contested zones, convoy line
   animation, nearby targets list with Scout/Raid buttons.
5. **War Room** — Iron Whiskers vs Manila Predators clash with score bar and
   countdown, action grid (Rally/Solo/Scout/Shield), war contribution
   leaderboard, battle reports with retaliate flow.
6. **Shop** — Capo Pass VIP subscription, Telegram Stars gem packs,
   utilities (shield/energy/speedup/migration), cosmetics.
7. **Raid modal** — 3 phases: prep (squad vs defense, win-chance prediction,
   unit grid) → fight (flash/smoke animation placeholder) → victory
   (loot breakdown, casualties, claim rewards with coin shower).

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
