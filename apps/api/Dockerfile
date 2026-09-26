# Imagen de la API y del worker (mismo código, distinto comando). Contexto: raíz del repo.
#   API:    comando por defecto (tsx src/server.ts)
#   Worker: tsx src/jobs/worker.ts
# Imagen completa (no slim): trae OpenSSL, que necesitan los motores de Prisma para las migraciones.
FROM node:22-bookworm
ENV NODE_ENV=production PNPM_HOME=/pnpm PATH=/pnpm:/app/apps/api/node_modules/.bin:$PATH
RUN corepack enable
WORKDIR /app

# Dependencias primero (capa cacheada mientras no cambie el lockfile).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/prisma.config.ts apps/api/
COPY apps/api/prisma apps/api/prisma
COPY apps/admin/package.json apps/admin/
COPY apps/mobile/package.json apps/mobile/
# Solo las dependencias de la API y de @msc/shared. El modo "isolated" respeta el filtro
# (el "hoisted" del repo, que necesita la app móvil, instalaría también Expo y React Native).
# Se instalan también las de desarrollo: tsx ejecuta TypeScript y prisma aplica migraciones.
RUN pnpm install --frozen-lockfile --prod=false --config.node-linker=isolated --filter @msc/api...

COPY packages/shared packages/shared
COPY apps/api apps/api
WORKDIR /app/apps/api
# Los ficheros quedan de root y en solo lectura para el usuario node, que no necesita escribir.
RUN prisma generate
USER node

EXPOSE 8001
CMD ["tsx", "src/server.ts"]
