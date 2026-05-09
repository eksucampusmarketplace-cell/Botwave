# BotWave Dockerfile
# Multi-stage build for Next.js web + bot service

FROM node:20-alpine AS base
RUN apk add --no-cache bash curl python3 make g++ ffmpeg

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts/patch-baileys.js ./scripts/
RUN npm ci

# --- Bot Build ---
FROM deps AS bot-builder
WORKDIR /app
COPY . .
RUN npm run build:bot

# --- Next.js Build ---
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

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV REDIS_URL=$REDIS_URL
ENV EVOLUTION_API_URL=$EVOLUTION_API_URL
ENV EVOLUTION_API_KEY=$EVOLUTION_API_KEY
ENV BOT_SECRET_KEY=$BOT_SECRET_KEY
ENV INTERNAL_SECRET=$INTERNAL_SECRET

RUN npm run build

# --- Production Image ---
FROM base AS production
WORKDIR /app

# Install yt-dlp for !download command
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod +x /usr/local/bin/yt-dlp

COPY package.json package-lock.json ./
COPY scripts/ ./scripts/
RUN npm ci --omit=dev

# Copy bot build
COPY --from=bot-builder /app/dist ./dist

# Copy Next.js build
COPY --from=web-builder /app/.next ./.next
COPY --from=web-builder /app/public ./public

# Copy source (needed for Next.js runtime)
COPY --from=web-builder /app/next.config.mjs ./
COPY --from=web-builder /app/tailwind.config.ts ./
COPY --from=web-builder /app/tsconfig.json ./
COPY --from=web-builder /app/app ./app
COPY --from=web-builder /app/components ./components
COPY --from=web-builder /app/lib ./lib

EXPOSE 10000

# Default: start both web + bot (can be overridden in docker-compose)
CMD ["bash", "scripts/start-all.sh"]
