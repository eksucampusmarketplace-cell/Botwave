---
name: BotWave Telegram pivot
description: Status of WhatsApp→Telegram removal across BotWave pages; what's done, what remains, and routing constraints
---

# BotWave Telegram Pivot Status

## What's done
All user-visible WhatsApp text removed from every page in `artifacts/botwave/src/pages/`. Typecheck passes cleanly.

## What remains (data layer — lower priority)
- `artifacts/botwave/src/lib/howto/content.ts` — large data file with many WA-specific slug entries
- `artifacts/botwave/src/lib/fix/data.ts` — fix slugs like `whatsapp-bot-disconnected`
- `artifacts/botwave/src/lib/compare/data.ts` — compare slug `best-whatsapp-bots-2026`

## Routing constraint
Object keys in FixDetailPage (`fixContent`) and CompareDetailPage (`compareContent`) MUST match slugs in the data files. Do not rename the keys without also renaming the data slugs.

**Why:** The pages look up content by `page.slug` matching into the `fixContent`/`compareContent` Records. If the keys diverge from the data slugs, the content lookup returns undefined and the page falls back to the generic description.

## Key architecture notes
- Wouter routing (not React Router): `useParams()`, `useLocation()`, `Link`, `Route`, `Switch`
- All WA session logic stripped from DashboardPage; platform type is now `'telegram-bot' | 'telegram-userbot'` only
- Telegram community link: `https://t.me/botwavegrp` (replaces all previous WA group links)
