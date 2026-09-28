# Mi Sagrado Corazón

La comunidad de fe que enciende el mundo.

App móvil católica para la comunidad hispana (EE. UU. + México). Tres pilares:

1. Ritual diario personal con vela virtual.
2. Misa dominical en vivo.
3. Impacto mensual votado: el 20% de la facturación va a la causa ganadora.

## Stack

| Parte | Tecnología |
|---|---|
| App móvil (`apps/mobile`) | Expo SDK 57, React Native 0.86, React 19, TypeScript, expo-router |
| API (`apps/api`) | Node.js 22, Express 5, Zod 4, Prisma 7, PostgreSQL 16, Better Auth 1.7, Socket.IO 4, pg-boss 12 |
| Panel (`apps/admin`) | React 19, Vite 8, TanStack Query 5, React Router 8; servido con Caddy |
| Compartido (`packages/shared`) | Constantes de dominio y esquemas Zod |
| Monorepo | pnpm 10 (workspaces) |

Versiones exactas y para qué sirve cada dependencia: `docs/dependencias.md`.

## Estructura del repositorio

```
apps/
  mobile/        App Expo + React Native (iOS, Android, web)
  api/           API + worker de tareas programadas (la usan la app y el panel)
  admin/         Panel de gestión web: KPIs, moderación, contenido, causas, misas, usuarios
packages/
  shared/        Constantes de dominio y esquemas de validación compartidos
docs/            Especificación, decisiones y documentación técnica
```

La arquitectura objetivo y las reglas de trabajo están en `CLAUDE.md`. Los SDD viven en Notion.

## Requisitos

- Node.js 22 o superior
- pnpm 10 (`corepack enable`)
- PostgreSQL 16 con dos bases: `msc_dev` y `msc_test`

## Puesta en marcha en local

```bash
pnpm install
# API: copiar la sección "API NUEVA" de .env.example a apps/api/.env y rellenarla
pnpm --filter @msc/api db:migrate    # migraciones
pnpm --filter @msc/api db:seed       # datos de desarrollo
pnpm --filter @msc/api dev           # API en http://localhost:8001
pnpm --filter @msc/api worker        # tareas programadas (opcional en local)
# App: copiar la sección FRONTEND de .env.example a apps/mobile/.env (EXPO_PUBLIC_BACKEND_URL)
pnpm mobile                          # Expo
pnpm --filter @msc/admin dev         # panel en http://localhost:5173 (proxy /api → localhost:8001)
```

El primer superadmin del panel se crea por línea de comandos (`apps/api/README.md`).

Comprobaciones (las mismas que ejecuta el CI en cada PR):

```bash
pnpm format:check   # Prettier (SDD-06); `pnpm format` lo aplica
pnpm typecheck
pnpm lint
pnpm test
```

## Builds y despliegue

- **App (iOS y Android):** builds con EAS y publicación en las tiendas (`docs/despliegue.md`, sección "App móvil").
- **API, worker y panel:** Railway, con imágenes Docker (`docs/despliegue.md`).

## Documentación

Entrega (`docs/requisitos-entrega.md`):

- `apps/api/README.md`: endpoints de la API y del chat (un test comprueba que están todos)
- `docs/modelo-datos.md`: tablas, reglas y migraciones
- `docs/dependencias.md`: dependencias y servicios de terceros
- `docs/pendiente.md`: qué está simulado y qué queda pendiente
- `docs/despliegue.md`: Railway (API, worker, panel), EAS y variables de entorno

Funcionalidad y decisiones:

- `CLAUDE.md`: reglas del proyecto y arquitectura aprobada
- `docs/especificacion-funcional.docx`: especificación funcional
- `docs/auditoria-entrega.md`: auditoría del prototipo entregado
- `docs/propuesta-cambios-sdd.md`: cambios aprobados a los SDD
- `docs/login-social.md`: login con Google y Apple
- `docs/push.md`: notificaciones push
- `docs/audio.md`: reproductor de audio
- `docs/contenido.md`: santoral, contenido diario y subida de ficheros a R2
- `docs/fuentes-imagenes.md`: origen y licencias de las imágenes del catálogo inicial
- `docs/kpis.md`: KPIs de negocio y analítica con PostHog bajo consentimiento
- `docs/borrado-cuenta.md`: borrado de cuenta (qué se borra, qué se conserva anonimizado y revocación de Apple)
- `docs/seguridad.md`: límites de uso, IP real tras el proxy y qué comprobar en el primer despliegue
- `docs/monitorizacion.md`: Sentry sin datos personales, EAS Update y copias de seguridad
- `docs/testing.md`: qué test cubre cada obligación de SDD-07 y cobertura mínima de la API
- `docs/rendimiento.md`: prueba de carga del chat de la misa (1.000 fieles)

Propiedad: Juan Gutiérrez Blanco. Confidencial.
