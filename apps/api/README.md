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
pnpm --filter @msc/api worker        # tareas programadas (pg-boss): votaciones, push, KPIs diarios y revocaciones de Apple
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

Una fila por método y ruta. `test/docs.test.ts` comprueba que estas tablas coinciden con las rutas que tiene la API: si se añade o se quita una ruta sin tocar este fichero, el test falla.

### App

| Método | Ruta | Sesión | Descripción |
|---|---|---|---|
| GET | `/api/health` | — | Estado |
| POST | `/api/auth/sign-up/email` | — | Registro (Better Auth) |
| POST | `/api/auth/sign-in/email` | — | Login (Better Auth) |
| POST | `/api/auth/sign-in/social` | — | Login con Google o Apple por ID token nativo (`docs/login-social.md`) |
| POST | `/api/auth/sign-out` | ✔ | Cerrar sesión (Better Auth) |
| GET | `/api/me` | ✔ | Perfil y racha |
| PUT | `/api/me/onboarding` | ✔ | Santo patrón, secundarios, horarios, idioma, zona horaria y consentimiento de analítica |
| PATCH | `/api/me` | ✔ | Actualizar perfil, preferencias de notificación y consentimiento de analítica |
| DELETE | `/api/me` | ✔ | Borrar la cuenta; exige `{ "confirm": true }` (`docs/borrado-cuenta.md`) |
| POST | `/api/me/apple-authorization` | ✔ | Código de Sign in with Apple, para revocar al borrar la cuenta (`docs/borrado-cuenta.md`) |
| PUT | `/api/me/push-tokens` | ✔ | Registrar el dispositivo para push (`docs/push.md`) |
| DELETE | `/api/me/push-tokens` | ✔ | Dar de baja el dispositivo al cerrar sesión |
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
| GET | `/api/me/intentions` | ✔ | Mis intenciones privadas, descifradas |
| POST | `/api/me/intentions` | ✔ | Nueva intención privada (se guarda cifrada) |
| DELETE | `/api/me/intentions/:id` | ✔ | Borrar una intención privada propia |
| GET | `/api/masses/next` | — | Misa en curso o próxima, con estado calculado en servidor |
| GET | `/api/masses/latest-recording` | — | Última misa terminada con grabación, o `null` |
| GET | `/api/masses/:id/chat` | — | Últimos 200 mensajes aprobados |
| GET | `/api/causes/current` | opcional | Causas del mes, votos, porcentajes y mi voto |
| POST | `/api/causes/:id/vote` | ✔ | Votar (días 1-7 UTC, un voto por mes) |
| GET | `/api/votes/me` | ✔ | Mi historial de votos, del más reciente al más antiguo |
| GET | `/api/causes/history` | — | Causas ganadoras y financiadas con avances |
| GET | `/api/causes/:id` | — | Ficha completa de una causa publicada: destino del dinero, presupuesto desglosado y avances |
| GET | `/api/transparency` | — | Ingresos, 20% y transferencias por mes, calculados desde el libro |

Better Auth atiende el resto de `/api/auth/*`. La app y el panel solo usan las cuatro rutas de arriba.

### Chat de misa (Socket.IO)

Conexión con `auth: { token }` (el mismo token de sesión); sin token solo se lee.

| Evento | Sentido | Datos |
|---|---|---|
| `chat:join` | cliente → servidor | `{ massId }`; ack `{ ok }` |
| `chat:send` | cliente → servidor | `{ massId, text }`; ack `{ ok, status }` o `{ ok: false, error }`. Un mensaje cada 3 s |
| `chat:message` | servidor → sala | `{ id, author, text, createdAt }` |
| `chat:removed` | servidor → sala | `{ id }` cuando un moderador oculta un mensaje |

### Gestión (panel)

Staff = moderador, editor y superadmin. El superadmin puede con todo. La matriz completa de permisos se comprueba en `test/matrix.test.ts`.

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/admin/kpis` | staff | KPIs (`?days=`, 1 a 365; `docs/kpis.md`) |
| GET | `/api/admin/transparency` | staff | Resumen del libro: ingresos, 20 %, transferido y pendiente |
| GET | `/api/admin/ledger` | staff | Movimientos de un mes (`?month=`, `?type=`, `?cursor=`), sin datos de personas |
| GET | `/api/admin/moderation/queue` | moderador | Intenciones y mensajes pendientes |
| POST | `/api/admin/moderation/intentions/:id` | moderador | Aprobar u ocultar una intención |
| POST | `/api/admin/moderation/chat/:id` | moderador | Aprobar u ocultar un mensaje del chat |
| GET | `/api/admin/moderation/words` | moderador | Lista de palabras filtradas |
| POST | `/api/admin/moderation/words` | moderador | Añadir palabra |
| DELETE | `/api/admin/moderation/words/:word` | moderador | Quitar palabra |
| GET | `/api/admin/masses` | editor | Últimas 100 misas |
| POST | `/api/admin/masses` | editor | Programar misa |
| DELETE | `/api/admin/masses/:id` | editor | Eliminar una misa que aún no ha empezado; queda en la auditoría |
| PATCH | `/api/admin/masses/:id` | editor | Editar misa; solo cambia los campos enviados. La grabación se quita con `recordingUrl: null` |
| GET | `/api/admin/push/campaigns` | editor | Avisos del equipo |
| POST | `/api/admin/push/campaigns` | editor | Nuevo aviso; lo envía el worker |
| GET | `/api/admin/saints` | editor | Santoral, con los dados de baja |
| POST | `/api/admin/saints` | editor | Alta de santo |
| PATCH | `/api/admin/saints/:id` | editor | Editar santo |
| DELETE | `/api/admin/saints/:id` | editor | Baja lógica; no si está en uso |
| POST | `/api/admin/saints/:id/restore` | editor | Recuperar un santo dado de baja |
| GET | `/api/admin/daily` | editor | Calendario de los próximos días: qué está listo y qué falta |
| GET | `/api/admin/daily/:date` | editor | Contenido de un día |
| PUT | `/api/admin/daily/:date` | editor | Guardar el contenido de un día |
| GET | `/api/admin/seasonal-prayers` | editor | Oraciones de mañana y noche de cada tiempo litúrgico |
| PUT | `/api/admin/seasonal-prayers/:season/:kind` | editor | Guardar la oración de un tiempo (`advent`, `christmas`, `lent`, `easter`, `ordinary` × `morning`, `night`) |
| POST | `/api/admin/uploads` | editor | URL firmada de subida a R2 (`docs/contenido.md`) |
| GET | `/api/admin/causes` | editor | Todas las causas, del mes más reciente al más antiguo |
| POST | `/api/admin/causes` | editor | Alta de causa candidata |
| PATCH | `/api/admin/causes/:id` | editor | Editar; solo mientras es candidata |
| POST | `/api/admin/causes/:id/updates` | editor | Avance de una causa ganadora |
| POST | `/api/admin/causes/:id/transfers` | superadmin | Transferencia a la causa ganadora; escribe en el libro |
| GET | `/api/admin/users` | superadmin | Usuarios (`?search=`), sin las cuentas borradas |
| PATCH | `/api/admin/users/:id` | superadmin | Cambiar rol o bloquear; nunca deja el sistema sin superadmin |
| GET | `/api/admin/audit` | superadmin | Registro de cambios (`?entity=`, `?actorId=`, `?cursor=`) |

Cada acción de gestión queda en `admin_audit_log` con el autor, la acción y la entidad.

## Reglas que el código garantiza

- **Intenciones cifradas:** AES-256-GCM con `INTENTIONS_KEY` (GDPR art. 9).
- **Libro de movimientos de solo inserción:** un trigger de PostgreSQL rechaza UPDATE y DELETE (ADR-015). Cada vela genera la compra y la asignación del 20% en la misma transacción.
- **Rol protegido:** el rol no se puede fijar desde el cliente (`input: false`) y los usuarios bloqueados reciben 403.
- **Votación:** un voto por usuario y mes, garantizado por la clave primaria `(userId, month)`, también ante votos simultáneos. Ventana del día 1 al 7 en UTC. Cierre el día 8: gana la más votada; en empate, la que se dio de alta antes.
- **Moderación:** el filtro ignora mayúsculas y tildes. La lista inicial viene en la migración, así que también existe en producción.
- **"Hoy" es el del fiel:** la racha y las oraciones usan la zona horaria del usuario, no la del servidor.
