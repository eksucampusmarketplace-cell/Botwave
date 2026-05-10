# BotWave Dockerfile — Production Optimized
# Multi-stage build: build tools only in builder stages, minimal runtime image

# ── Build Base (has native compilation tools) ────────────
FROM node:20-alpine AS build-base
RUN apk add --no-cache bash curl python3 make g++ ffmpeg

# ── Runtime Base (minimal, no build tools) ───────────────
FROM node:20-alpine AS runtime
RUN apk add --no-cache bash curl ffmpeg

# ── Install ALL dependencies (for building) ──────────────
FROM build-base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts/patch-baileys.js ./scripts/
RUN npm ci

# ── Install production-only dependencies ─────────────────
FROM build-base AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts/patch-baileys.js ./scripts/
RUN npm ci --omit=dev && npm cache clean --force

# ── Bot Build ────────────────────────────────────────────
FROM deps AS bot-builder
WORKDIR /app
COPY . .
RUN npm run build:bot

# ── Next.js Build ────────────────────────────────────────
FROM deps AS web-builder
WORKDIR /app
COPY . .

# Next.js needs env vars at build time for NEXT_PUBLIC_* inlining
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

# ── Production Image ─────────────────────────────────────
FROM runtime AS production
WORKDIR /app

ENV NODE_ENV=production

# Install yt-dlp + docker CLI (single layer)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod +x /usr/local/bin/yt-dlp && \
    apk add --no-cache docker-cli docker-cli-compose git && \
    rm -rf /var/cache/apk/*

# Copy production node_modules (pre-built, no build tools needed)
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./
COPY scripts/ ./scripts/

# Copy bot build
COPY --from=bot-builder /app/dist ./dist

# Copy Next.js build
COPY --from=web-builder /app/.next ./.next
COPY --from=web-builder /app/public ./public

# Copy source (needed for Next.js SSR runtime)
COPY --from=web-builder /app/next.config.js ./
COPY --from=web-builder /app/tsconfig.json ./
COPY --from=web-builder /app/app ./app
COPY --from=web-builder /app/components ./components
COPY --from=web-builder /app/lib ./lib
COPY --from=web-builder /app/bot ./bot
COPY --from=web-builder /app/server ./server

EXPOSE 10000

CMD ["bash", "scripts/start-all.sh"]
