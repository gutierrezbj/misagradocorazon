# Panel de gestión: build estático de Vite servido por Caddy. Contexto: raíz del repo.
# VITE_API_URL (p. ej. https://api.misagradocorazon.com) se fija al construir.
FROM node:22-slim AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/admin/package.json apps/admin/
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
RUN pnpm install --frozen-lockfile --config.node-linker=isolated --filter @msc/admin...
COPY packages/shared packages/shared
COPY apps/admin apps/admin
ARG VITE_API_URL
# Opcional: sin DSN, el panel no envía errores a Sentry.
ARG VITE_SENTRY_DSN
RUN test -n "$VITE_API_URL" || (echo "Falta VITE_API_URL" && exit 1)
RUN pnpm --filter @msc/admin build

FROM caddy:2-alpine
COPY apps/admin/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/admin/dist /srv
ARG VITE_API_URL
ENV API_ORIGIN=$VITE_API_URL
