# Time Tracking Demo web — Vite build (pnpm) + nginx static UI (/api → Nest)
FROM node:24-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/web/package.json apps/web/
RUN pnpm install --filter web... --frozen-lockfile
COPY apps/web apps/web
RUN pnpm --filter web build

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
# Compose maps host 8081→80; healthcheck uses wget (busybox in alpine image).
HEALTHCHECK --interval=10s --timeout=3s --retries=5 --start-period=5s \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
