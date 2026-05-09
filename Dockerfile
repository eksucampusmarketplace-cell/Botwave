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

# Next.js needs NEXT_PUBLIC_* vars at build time (they get inlined into client JS)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

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
