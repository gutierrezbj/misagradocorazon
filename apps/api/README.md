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
pnpm --filter @msc/api dev           # http://localhost:8001/api/health (+ chat Socket.IO)
pnpm --filter @msc/api worker        # tareas programadas (pg-boss): votaciones y notificaciones push
```

## Cuentas de staff

El panel solo lo abre un superadmin, así que el primero se crea por línea de comandos:

```bash
pnpm --filter @msc/api staff:create --email tu@correo.com --name "Juan"
# En Railway: railway run pnpm --filter @msc/api staff:create --email tu@correo.com --name "Juan"
```

- Si la cuenta no existe, pide la contraseña sin mostrarla (mínimo 8 caracteres). Sin terminal interactiva, la lee de `STAFF_PASSWORD`. Nunca va como argumento.
- Si la cuenta existe, la asciende y la desbloquea sin tocar su contraseña. Sirve para recuperar el acceso si el único superadmin queda bloqueado.
- `--role editor|moderator` da otros roles; por defecto `superadmin`. No baja de rol a un superadmin: eso se hace desde el panel.
- Queda registrado en `admin_audit_log` como `staff.bootstrap`. Es idempotente.

El resto del staff se gestiona desde el panel (Usuarios).

## Tests

Integración contra PostgreSQL real, sin mocks. Usan `TEST_DATABASE_URL`, que tiene que apuntar a una base cuyo nombre termine en `_test`: la limpieza entre tests se niega a actuar sobre cualquier otra.

```bash
pnpm --filter @msc/api test
```

## Endpoints

Respuesta estándar `{ data, error }`. La sesión se envía como `Authorization: Bearer <token>`; el token llega en la cabecera `set-auth-token` al registrarse o iniciar sesión.

| Método | Ruta | Sesión | Descripción |
|---|---|---|---|
| GET | `/api/health` | — | Estado |
| POST | `/api/auth/sign-up/email` | — | Registro (Better Auth) |
| POST | `/api/auth/sign-in/email` | — | Login (Better Auth) |
| POST | `/api/auth/sign-in/social` | — | Login con Google o Apple por ID token nativo (`docs/login-social.md`) |
| GET | `/api/me` | ✔ | Perfil y racha |
| PUT | `/api/me/onboarding` | ✔ | Santo patrón, secundarios, horarios, idioma, zona horaria |
| PATCH | `/api/me` | ✔ | Actualizar perfil y preferencias de notificación |
| PUT / DELETE | `/api/me/push-tokens` | ✔ | Registrar o dar de baja el dispositivo para push (`docs/push.md`) |
| GET | `/api/saints` | — | Santos (`?patronOnly=true`) |
| GET | `/api/saints/:id` | — | Ficha de santo |
| GET | `/api/daily` | — | Contenido del día (`?date=YYYY-MM-DD` o `?tz=`); 404 si no hay |
| POST | `/api/prayers/complete` | ✔ | Oración de mañana o noche completada; devuelve la racha |
| POST | `/api/candles` | ✔ | Encender vela (pago simulado) |
| GET | `/api/candles/me` | ✔ | Mis velas con la intención descifrada |
| GET | `/api/candles/community` | — | Muro de velas: contadores y llamas, sin datos personales |
| GET | `/api/intentions` | opcional | Muro: intenciones aprobadas (`?category=`, `?before=`) con "Nombre I." y contador |
| POST | `/api/intentions` | ✔ | Publicar (filtro de palabras → cola si procede); 1 cada 30 s |
| POST | `/api/intentions/:id/pray` | ✔ | "Rezo por ti" (una vez por persona) |
| GET/POST | `/api/me/intentions` | ✔ | Intenciones privadas cifradas |
| DELETE | `/api/me/intentions/:id` | ✔ | Borrar una intención privada propia |
| GET | `/api/masses/next` | — | Misa en curso o próxima, con estado calculado en servidor |
| GET | `/api/masses/:id/chat` | — | Últimos 200 mensajes aprobados |
| GET | `/api/causes/current` | opcional | Causas del mes, votos, porcentajes y mi voto |
| POST | `/api/causes/:id/vote` | ✔ | Votar (días 1-7 UTC, un voto por mes) |
| GET | `/api/causes/history` | — | Causas ganadoras y financiadas con avances |
| GET | `/api/transparency` | — | Ingresos, 20% y transferencias por mes, calculados desde el libro |

### Chat de misa (Socket.IO)

Conexión con `auth: { token }` (el mismo token de sesión); sin token solo se lee.

| Evento | Sentido | Datos |
|---|---|---|
| `chat:join` | cliente → servidor | `{ massId }`; ack `{ ok }` |
| `chat:send` | cliente → servidor | `{ massId, text }`; ack `{ ok, status }` o `{ ok: false, error }`. Un mensaje cada 3 s |
| `chat:message` | servidor → sala | `{ id, author, text, createdAt }` |
| `chat:removed` | servidor → sala | `{ id }` cuando un moderador oculta un mensaje |

### Gestión (roles)

| Método | Ruta | Rol |
|---|---|---|
| GET | `/api/admin/moderation/queue` | moderador |
| POST | `/api/admin/moderation/intentions/:id` · `/api/admin/moderation/chat/:id` | moderador |
| GET/POST/DELETE | `/api/admin/moderation/words` | moderador |
| POST/PATCH | `/api/admin/masses` | editor |
| GET/POST | `/api/admin/push/campaigns` (avisos del equipo; los envía el worker) | editor |
| GET/POST/PATCH | `/api/admin/causes` (solo se edita mientras es candidata) | editor |
| POST | `/api/admin/causes/:id/updates` (solo ganadoras) | editor |
| POST | `/api/admin/causes/:id/transfers` (solo ganadoras; escribe en el libro) | superadmin |

El superadmin tiene acceso a todo. Cada acción de gestión queda en `admin_audit_log` con el autor, la acción y la entidad.

## Reglas que el código garantiza

- **Intenciones cifradas:** AES-256-GCM con `INTENTIONS_KEY` (GDPR art. 9).
- **Libro de movimientos de solo inserción:** un trigger de PostgreSQL rechaza UPDATE y DELETE (ADR-015). Cada vela genera la compra y la asignación del 20% en la misma transacción.
- **Rol protegido:** el rol no se puede fijar desde el cliente (`input: false`) y los usuarios bloqueados reciben 403.
- **Votación:** un voto por usuario y mes, garantizado por la clave primaria `(userId, month)`, también ante votos simultáneos. Ventana del día 1 al 7 en UTC. Cierre el día 8: gana la más votada; en empate, la que se dio de alta antes.
- **Moderación:** el filtro ignora mayúsculas y tildes. La lista inicial viene en la migración, así que también existe en producción.
- **"Hoy" es el del fiel:** la racha y las oraciones usan la zona horaria del usuario, no la del servidor.
