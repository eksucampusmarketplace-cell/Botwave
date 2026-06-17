# Botwave — Cosa Nostra Tycoon

## Repository Structure

- **Botwave** (`/opt/workspace_base/Botwave`) — Main Next.js app (bot + tycoon)
  - `app/api/tycoon/*/route.ts` — API routes (auth, tick, state, raid, train, upgrade, etc.)
  - `lib/tycoon/` — Core game logic (tick.ts, auth.ts, actions.ts, state.ts, tickWorker.ts, rewards.ts, catalog.ts, errors.ts, freshState.ts, snapshot.ts, types.ts)
  - `app/miniapp/tycoon-mockup.html` — Current frontend (flat mockup, needs replacement)
  - `supabase/migrations/` — DB migrations (066-070 applied, 069 creates tycoon_claims + tycoon_quest_progress)
  - `deploy/` — Docker Compose + env files

## Deployment

- **VPS**: root@144.91.107.59 (Contabo Cloud VPS), SSH password: Youngchris2005
- **Docker compose**: `/root/Botwave/deploy/docker-compose.yml`
- **Env file**: `/root/Botwave/deploy/.env.botwave`
- **Web container**: `botwave_web` (Next.js standalone)
- **DB**: `botwave_postgres` (Supabase-compatible Postgres)
- **Container restart**: `docker compose -f /root/Botwave/deploy/docker-compose.yml up -d botwave-web --force-recreate`

## Tycoon Backend Architecture

- Auth: Telegram initData verification (`lib/tycoon/auth.ts`)
- Tick: Lazy evaluation with dirtyUntil system (`lib/tycoon/tick.ts`, `state.ts`)
- State: JSONB blob per player with hot scalars (coins, gems, energy, power, level)
- Fresh state template: `lib/tycoon/freshState.ts`
- PlayerRecord type: `lib/tycoon/types.ts`

## Reference APK

- Michael's Tycoon World extracted to `/root/openhands-workspace/tycoon-world-reference/` on VPS
- Key features: Lottie animations, realistic building art, world map, 40+ attack types, stock market