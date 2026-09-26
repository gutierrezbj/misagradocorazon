# @msc/api

API de Mi Sagrado Corazón: Node 22 + TypeScript + Express 5 + Zod + Prisma 7 (PostgreSQL) + Better Auth.
Arquitectura en SDD-03 y SDD-04 (Notion).

## Puesta en marcha

```bash
# 1. PostgreSQL local con dos bases: msc_dev y msc_test
# 2. Variables: copiar la sección "API NUEVA" de /.env.example a apps/api/.env y rellenar
pnpm install                         # genera el cliente Prisma (postinstall)
pnpm --filter @msc/api db:migrate    # aplica migraciones
pnpm --filter @msc/api db:seed       # solo desarrollo: 7 santos + contenido de hoy y ayer
pnpm --filter @msc/api dev           # http://localhost:8001/api/health
```

## Tests

Integración contra PostgreSQL real, sin mocks. Usan `TEST_DATABASE_URL`, que tiene que apuntar a una base cuyo nombre termine en `_test`: la limpieza entre tests se niega a actuar sobre cualquier otra.

```bash
pnpm --filter @msc/api test
```

## Endpoints (bloque 1)

Respuesta estándar `{ data, error }`. La sesión se envía como `Authorization: Bearer <token>`; el token llega en la cabecera `set-auth-token` al registrarse o iniciar sesión.

| Método | Ruta | Sesión | Descripción |
|---|---|---|---|
| GET | `/api/health` | — | Estado |
| POST | `/api/auth/sign-up/email` | — | Registro (Better Auth) |
| POST | `/api/auth/sign-in/email` | — | Login (Better Auth) |
| GET | `/api/me` | ✔ | Perfil y racha |
| PUT | `/api/me/onboarding` | ✔ | Santo patrón, secundarios, horarios, idioma, zona horaria |
| PATCH | `/api/me` | ✔ | Actualizar perfil |
| GET | `/api/saints` | — | Santos (`?patronOnly=true`) |
| GET | `/api/saints/:id` | — | Ficha de santo |
| GET | `/api/daily` | — | Contenido del día (`?date=YYYY-MM-DD` o `?tz=`); 404 si no hay |
| POST | `/api/prayers/complete` | ✔ | Oración de mañana o noche completada; devuelve la racha |
| POST | `/api/candles` | ✔ | Encender vela (pago simulado) |
| GET | `/api/candles/me` | ✔ | Mis velas con la intención descifrada |
| GET | `/api/candles/community` | — | Muro de velas: contadores y llamas, sin datos personales |

## Reglas que el código garantiza

- **Intenciones cifradas:** AES-256-GCM con `INTENTIONS_KEY` (GDPR art. 9).
- **Libro de movimientos de solo inserción:** un trigger de PostgreSQL rechaza UPDATE y DELETE (ADR-015). Cada vela genera la compra y la asignación del 20% en la misma transacción.
- **Rol protegido:** el rol no se puede fijar desde el cliente (`input: false`) y los usuarios bloqueados reciben 403.
- **"Hoy" es el del fiel:** la racha y las oraciones usan la zona horaria del usuario, no la del servidor.
