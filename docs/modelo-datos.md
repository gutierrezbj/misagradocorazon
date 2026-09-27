# Modelo de datos

Requisito de entrega 5. PostgreSQL con Prisma 7 (SDD-03). La fuente de verdad es `apps/api/prisma/schema.prisma`; las migraciones están en `apps/api/prisma/migrations` y se aplican con `pnpm --filter @msc/api db:migrate`.

`apps/api/test/docs.test.ts` comprueba que cada tabla del esquema aparece en este documento.

## Reglas generales

- **Intenciones cifradas:** las de las velas y las privadas se guardan con AES-256-GCM (`INTENTIONS_KEY`), por ser datos de creencias religiosas (GDPR art. 9). Las públicas del muro no se cifran: su autor decide publicarlas.
- **Libro de solo inserción:** `ledger_entry` tiene un trigger de PostgreSQL que rechaza `UPDATE` y `DELETE` (ADR-015). El 20 % y la transparencia se calculan de ahí; nunca se teclean.
- **Borrado de cuenta:** la fila de `user` se anonimiza y lo personal se borra (`docs/borrado-cuenta.md`). Velas, libro y votos se conservan sin vínculo con la persona.
- **Fechas:** `DateTime` en UTC. Las fechas "del fiel" (`localDate` de la racha) son la fecha local en su zona horaria. `month` es `YYYY-MM`.

## Autenticación (Better Auth)

Los nombres de estas tablas y de sus campos los fija Better Auth.

| Tabla | Para qué | Campos clave |
|---|---|---|
| `user` | Cuenta y perfil devocional | `email` único; `role` (`user`, `moderator`, `editor`, `superadmin`); `blocked`; `deletedAt` (cuenta borrada); santo patrón y secundarios; idioma, zona horaria y horas de oración; preferencias de push; `analyticsConsent` y su fecha |
| `session` | Sesiones activas (token Bearer) | `token` único, `expiresAt`, `userId` |
| `account` | Formas de entrar: contraseña, Google, Apple | `providerId`, `accountId` (el `sub` del proveedor), `password` (hash). En Apple, `refreshToken` para revocar al borrar la cuenta |
| `verification` | Códigos temporales de Better Auth | `identifier`, `value`, `expiresAt` |
| `apple_revocation` | Tokens de Apple de cuentas ya borradas, pendientes de revocar | Solo `token`, `attempts` y `lastError`: nada de la persona. Se borra la fila cuando Apple confirma |

## Ritual diario

| Tabla | Para qué | Campos clave |
|---|---|---|
| `saint` | Santoral | Nombre, fiesta (`MM-DD`), imagen, audio ES/EN, historia, patronazgos y oración en ES/EN; `isPatronCatalog` (elegible como patrón); `deletedAt` (baja lógica) |
| `daily_content` | Contenido de cada día | Clave `date` (`YYYY-MM-DD`); santo del día; evangelio, meditación y oraciones de mañana y noche en ES/EN, con audio por idioma |
| `prayer_log` | Oraciones hechas (racha) | Única por `(userId, localDate, kind)`: una de mañana y una de noche por día |
| `private_intention` | "Por quién rezo hoy" | `textEncrypted`; solo la ve su autor |

## Vela y dinero

| Tabla | Para qué | Campos clave |
|---|---|---|
| `candle` | Velas encendidas | Santo, `intentionEncrypted`, `type` (`basic`, `solemn`, `permanent`), `category` (`general`, `difuntos`), `priceCents`, `paymentProvider` y `paymentRef` (único), `litAt`, `expiresAt`. No se borra al borrar la cuenta (`onDelete: Restrict`) |
| `ledger_entry` | Libro de movimientos | `type` (`purchase`, `impact_allocation`, `transfer`), `amountCents`, `month`, vela o causa. Cada vela escribe la compra y la asignación del 20 % en la misma transacción |

## Muro de intenciones y moderación

| Tabla | Para qué | Campos clave |
|---|---|---|
| `intention` | Intenciones públicas del muro | `text`, `category`, `status` (`pending`, `approved`, `hidden`) |
| `intention_prayer` | "Rezo por ti" | Clave `(intentionId, userId)`: una vez por persona |
| `moderation_word` | Palabras filtradas | `word` normalizada (minúsculas, sin tildes). La lista inicial viene en una migración |
| `admin_audit_log` | Quién cambia qué en la gestión | `actorId`, `action`, `entity`, `entityId`, `data`. El autor no se puede borrar mientras tenga registros (`onDelete: Restrict`) |

## Misa en vivo

| Tabla | Para qué | Campos clave |
|---|---|---|
| `mass` | Misas programadas | Título ES/EN, `youtubeUrl`, `scheduledAt`, `durationMin`, `isSpecial`, `recordingUrl` |
| `chat_message` | Chat de la misa | `text`, `status` de moderación |
| `mass_attendance` | Quién tuvo abierta la misa en directo (KPI) | Clave `(massId, userId)` y `firstSeenAt` |

## Causas y votación

| Tabla | Para qué | Campos clave |
|---|---|---|
| `cause` | Causas del mes | `month`, nombre y descripción ES/EN, lugar, responsable, `budgetCents`, fotos, plazos, `status` (`candidate`, `voting`, `won`, `funded`, `archived`) |
| `cause_update` | Avances de una causa ganadora | Texto ES/EN y foto |
| `vote` | Votos | Clave `(userId, month)`: un voto por persona y mes, también ante votos simultáneos |

## KPIs

| Tabla | Para qué | Campos clave |
|---|---|---|
| `kpi_daily` | Agregados de negocio por día UTC | Clave `day`; altas, activos, oraciones, velas, compradores, ingresos, 20 %, votos, mensajes y asistentes a misa. Los calcula el worker cada noche (`docs/kpis.md`) |

## Notificaciones push

| Tabla | Para qué | Campos clave |
|---|---|---|
| `push_token` | Un token de Expo por dispositivo | `token` como clave; si el dispositivo cambia de cuenta, pasa a la nueva |
| `push_delivery` | Envíos hechos | Clave `(userId, kind, ref)`: evita duplicados si la tarea se repite. Nunca guarda el contenido de intenciones |
| `push_ticket` | Tickets de Expo pendientes de confirmar | El recibo dice si el token ya no vale |
| `push_campaign` | Avisos del equipo desde el panel | Título y texto ES/EN, autor, `sentAt`, `recipients` |

## Migraciones

| Migración | Qué añade |
|---|---|
| `20260926122751_init` | Autenticación, ritual diario, velas y libro (con su trigger) |
| `20260926125310_wall_mass_causes` | Intenciones públicas y privadas, moderación (con la lista inicial de palabras), auditoría, misa y chat, causas y votos |
| `20260926150153_push_notifications` | Push: tokens, entregas, tickets, campañas y preferencias de notificación del usuario |
| `20260926151542_audio_by_language` | Audio en inglés en el contenido diario |
| `20260926170000_account_deletion` | `user.deletedAt` para el borrado de cuenta |
| `20260926190000_kpis` | Asistencia a misa y agregados diarios |
| `20260926191000_analytics_consent` | Consentimiento de analítica |
| `20260927090000_candle_expiry` | Aviso de vela permanente apagada |
| `20260927150000_apple_revocation` | Tokens de Apple pendientes de revocar |
