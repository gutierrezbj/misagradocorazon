# Mi Sagrado Corazón

La comunidad de fe que enciende el mundo.

App móvil católica para la comunidad hispana (EE. UU. + México). Tres pilares:

1. Ritual diario personal con vela virtual.
2. Misa dominical en vivo.
3. Impacto mensual votado: el 20% de la facturación va a la causa ganadora.

## Estructura del repositorio

```
apps/
  mobile/        App Expo + React Native (iOS, Android, web)
  api/           API Node + TypeScript + PostgreSQL (pendiente, sustituye a backend/)
  admin/         Panel de gestión web (pendiente)
packages/
  shared/        Constantes de dominio y esquemas de validación compartidos
backend/         Backend provisional del prototipo (FastAPI + MongoDB), congelado
docs/            Especificación, auditoría y decisiones
```

La arquitectura objetivo y las reglas de trabajo están en `CLAUDE.md`. Los SDD viven en Notion.

## Requisitos

- Node.js 22 o superior
- pnpm 10 (`corepack enable`)

## Puesta en marcha

```bash
pnpm install
cp .env.example apps/mobile/.env   # rellenar EXPO_PUBLIC_BACKEND_URL
pnpm mobile                        # arranca Expo
```

Comprobaciones (las mismas que ejecuta el CI en cada PR):

```bash
pnpm typecheck
pnpm lint
pnpm test
```

## Documentación

- `CLAUDE.md`: reglas del proyecto y arquitectura aprobada
- `docs/especificacion-funcional.docx`: especificación funcional
- `docs/requisitos-entrega.md`: condiciones de entrega del constructor
- `docs/auditoria-entrega.md`: auditoría del prototipo entregado
- `docs/propuesta-cambios-sdd.md`: cambios aprobados a los SDD

Propiedad: Juan Gutiérrez Blanco. Confidencial.
