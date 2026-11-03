# Time Tracking Demo API — NestJS + SQLite (pnpm / Corepack only — never npm)
FROM node:24-bookworm-slim AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/api/package.json apps/api/
# better-sqlite3: native compile (toolchain above) + allowBuilds in pnpm-workspace.yaml
RUN pnpm install --filter api... --frozen-lockfile

FROM node:24-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /app
COPY --from=deps /app /app
COPY apps/api apps/api
RUN pnpm --filter api build

FROM node:24-bookworm-slim AS runner
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV SQLITE_PATH=/data/time-tracking-demo.sqlite
COPY --from=deps /app /app
COPY --from=build /app/apps/api/dist apps/api/dist
COPY apps/api/package.json apps/api/
RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 3000
# Health is asserted by Compose; keep image CMD on pnpm filter for workspace layout.
CMD ["pnpm", "--filter", "api", "start:prod"]
