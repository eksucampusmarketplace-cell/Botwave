# BotWave — multi-target Dockerfile.
#
# Builds four independent images (one per service) from a single file so we
# can fan-out per-service builds in CI. The intermediate `bot-builder` and
# `web-builder` stages are shared between targets; BuildKit only re-runs the
# stages whose inputs actually changed, so a Telegram-only edit doesn't
# rebuild the Next.js bundle and vice versa.
#
# Targets:
#   web      — Next.js + custom Socket.io server (dist/bot/server/customServer.js)
#   whatsapp — WhatsApp bot (dist/bot/bot/whatsapp-entrypoint.js)
#   telegram — Telegram bot (dist/bot/bot/telegram-entrypoint.js)
#   userbot  — Telegram userbot (dist/bot/bot/userbot/entrypoint.js)

# ─── Base ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache bash curl python3 make g++ ffmpeg

# ─── Dependencies (full, used during builds) ─────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts/patch-baileys.js ./scripts/
RUN npm ci && npm cache clean --force

# ─── Bot build (compiles TS → dist/bot) ──────────────────────────────────────
FROM deps AS bot-builder
WORKDIR /app
COPY tsconfig.bot.json ./
COPY bot ./bot
COPY lib ./lib
COPY server ./server
RUN npm run build:bot

# ─── Next.js build ───────────────────────────────────────────────────────────
FROM deps AS web-builder
WORKDIR /app
COPY . .

# Next.js needs ALL env vars at build time because:
# - NEXT_PUBLIC_* get inlined into client JS
# - Server-side vars are needed because Next.js imports route modules
#   during build to read their config (e.g. export const dynamic)
#   and bot/database.ts throws if SUPABASE keys are missing at import time
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG SUPABASE_SERVICE_ROLE_KEY
ARG REDIS_URL
ARG EVOLUTION_API_URL=http://evolution-api:8080
ARG EVOLUTION_API_KEY=placeholder
ARG BOT_SECRET_KEY=placeholder
ARG INTERNAL_SECRET=placeholder

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
    REDIS_URL=$REDIS_URL \
    EVOLUTION_API_URL=$EVOLUTION_API_URL \
    EVOLUTION_API_KEY=$EVOLUTION_API_KEY \
    BOT_SECRET_KEY=$BOT_SECRET_KEY \
    INTERNAL_SECRET=$INTERNAL_SECRET

RUN npm run build

# ─── Runtime base (production deps only) ─────────────────────────────────────
FROM base AS runtime-base
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY scripts/patch-baileys.js ./scripts/
RUN npm ci --omit=dev && npm cache clean --force

# =============================================================================
#   web — Next.js + custom Socket.io server
# =============================================================================
FROM runtime-base AS web
# Web needs docker CLI for the admin deployment panel.
RUN apk add --no-cache docker-cli docker-cli-compose git && \
    rm -rf /var/cache/apk/*

# Bot dist is needed because customServer.js lives at dist/bot/server/.
COPY --from=bot-builder /app/dist ./dist

# Next.js compiled output + source it falls back to at runtime.
COPY --from=web-builder /app/.next ./.next
COPY --from=web-builder /app/public ./public
COPY --from=web-builder /app/next.config.js ./
COPY --from=web-builder /app/postcss.config.js ./
COPY --from=web-builder /app/tailwind.config.ts ./
COPY --from=web-builder /app/tsconfig.json ./
COPY --from=web-builder /app/app ./app
COPY --from=web-builder /app/components ./components
COPY --from=web-builder /app/lib ./lib
COPY --from=web-builder /app/bot ./bot
COPY --from=web-builder /app/server ./server

EXPOSE 10000
CMD ["node", "--max-old-space-size=900", "dist/bot/server/customServer.js"]

# =============================================================================
#   bot-runtime — shared base for the three bot variants
# =============================================================================
FROM runtime-base AS bot-runtime
# yt-dlp powers the WhatsApp !download command.
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
        -o /usr/local/bin/yt-dlp && \
    chmod +x /usr/local/bin/yt-dlp

# Bots only need the compiled JS — no Next.js, no source tree.
COPY --from=bot-builder /app/dist ./dist

# =============================================================================
#   whatsapp — WhatsApp bot (Baileys / Evolution API)
# =============================================================================
FROM bot-runtime AS whatsapp
EXPOSE 10000
CMD ["node", "--max-old-space-size=1536", "dist/bot/bot/whatsapp-entrypoint.js"]

# =============================================================================
#   telegram — Telegram bot (Grammy)
# =============================================================================
FROM bot-runtime AS telegram
EXPOSE 10000
CMD ["node", "--max-old-space-size=768", "dist/bot/bot/telegram-entrypoint.js"]

# =============================================================================
#   userbot — Telegram userbot (GramJS)
# =============================================================================
FROM bot-runtime AS userbot
EXPOSE 10002
CMD ["node", "--max-old-space-size=576", "dist/bot/bot/userbot/entrypoint.js"]
