# Propuesta de cambios a los SDD (Notion)

Fecha: 26-sep-2026. Estado: **pendiente de aprobación del fundador**. No se ha modificado nada en Notion.

- **Origen:** arquitectura aprobada el 26-sep-2026 (ver `CLAUDE.md`, sección "Arquitectura objetivo") y la entrega del constructor como base de diseño.
- **Objetivo:** que los SDD de Notion vuelvan a ser la fuente de verdad coherente con lo que se va a construir.

Cada bloque dice qué cambia, por qué y qué se mantiene. Cuando lo apruebes, lo paso a Notion página por página o lo pasas tú.

---

## SDD-01 — Definición del problema

**Sin cambios.** El problema, la audiencia, los perfiles y la competencia siguen vigentes.

---

## SDD-02 — Alcance y límites (el cambio más importante)

El alcance congelado el 8-jul-2026 (audio primero, 6 funcionalidades, sin misa ni votación) se sustituye por el de los **3 pilares en versión básica + panel**, que es lo que ya existe en el diseño entregado.

### In-scope MVP (propuesta)

**Pilar 1 — Ritual diario**
- Onboarding: santo patrón, secundarios, horarios de oración, idioma.
- Altar personal con vela animada (veladora en vaso: básica, solemne, permanente; variante de difuntos).
- Santo del día con ficha y **audio** (reproducción en segundo plano, controles en la pantalla de bloqueo).
- Oración de mañana y noche con **audio**. Racha de constancia real, en días consecutivos.
- Evangelio del día con meditación en texto y audio opcional (sube de v1.1 a MVP porque ya está construido).
- Intenciones personales privadas.
- Muro de intenciones comunitario con "Rezo por ti", categorías y moderación (sube de v1.1 a MVP).
- Muro de velas agregado, sin texto, y compartir vela por WhatsApp (se mantienen de SDD-02 v8-jul).

**Pilar 2 — Misa en vivo (sube de v2 a MVP)**
- YouTube Live embebido, cuenta atrás, chat propio en tiempo real con moderación, velas de la semana, grabación posterior.
- Condición: el MVP puede lanzarse con la misa programada aunque el "padre cool" no esté fichado todavía (misa de una parroquia colaboradora). **Decisión tuya.**

**Pilar 3 — Causas (sube de v1.2 a MVP)**
- Fichas de 3–4 causas, un voto por usuario y mes, periodo del día 1 al 7 aplicado en el servidor, anuncio el día 8.
- Panel de transparencia calculado desde el libro de movimientos.

**Panel de gestión web**
- Roles: superadmin, editor y moderador.
- Módulos: santoral, contenido diario, causas, misas, moderación, usuarios, transparencia, notificaciones y **KPIs**.

**Transversal**
- Auth con email, Google y Apple (Apple antes de la App Store).
- i18n ES/EN.
- Pagos simulados detrás de una capa de pagos intercambiable.

### Se mantienen de SDD-02 sin cambios
- La regla de cumplimiento de Apple 3.2.2.iv (bloqueante).
- La sección de datos sensibles (GDPR art. 9).
- El 20% no negociable y el lanzamiento bilingüe.

### Cambia
- **"Solo founder, 12 semanas":** con este alcance ya no es realista para una persona. Hay que replantear el calendario: el lanzamiento con la novena guadalupana (1–12 dic 2026) queda en riesgo. **Decisión tuya:** mantener la fecha con un alcance menor en el pilar 2, o mover el lanzamiento.
- **Precios de la vela:** unificar. SDD-02 dice 0,99 / 1,99 / 2,99 USD (compra dentro de la app) y la especificación y el prototipo dicen 1 / 2 / 3 USD. Propuesta: **0,99 / 1,99 / 2,99**, porque son los niveles de precio de las stores.

### Fuera del MVP (se mantiene)
- Rosario, novenas, examen de conciencia, Ángelus y calendario litúrgico visual (v1.1).
- Ángel de la Guarda (v1.2).
- Suscripción premium, localizador de parroquias y expansión (v2).
- Kids (v3).
- Muro de testimonios (v3+).

---

## SDD-03 — Arquitectura técnica

Se rehace el diagrama y la tabla de stack:

| Capa | Antes (abril) | Propuesta |
|---|---|---|
| Repo | Un repo app + backend | Monorepo: `apps/mobile`, `apps/admin`, `apps/api`, `packages/shared` |
| Cliente | React Native + Expo | Igual, partiendo de la app entregada |
| Backend | Node + Express | Node + TypeScript + Express + Zod, en módulos por pilar |
| BD | PostgreSQL | PostgreSQL + Prisma |
| Auth | JWT propio | Better Auth: email, Google, Apple, sesiones y roles |
| Admin | Retool | App web React (Vite) propia |
| Analítica | Mixpanel | PostHog + agregados de negocio en Postgres |
| Tiempo real | — | Socket.IO (chat de misa) |
| Tareas programadas | — | pg-boss |
| Pagos | RevenueCat | Capa de pagos intercambiable: simulada hoy, RevenueCat después |
| Audio y medios | Cloudflare R2 | Igual (también imágenes de santos, ver `docs/fuentes-imagenes.md`) |
| Infra | Railway | Railway: API, Postgres y panel |

**Modelo de datos:** se amplía el de abril con las tablas `saints`, `daily_content`, `prayers`, `candles`, `ledger_entries` (libro de solo inserción: compra, 20% de impacto, transferencia), `intentions`, `intention_prayers`, `masses`, `chat_messages`, `causes`, `cause_updates`, `votes` (restricción única por usuario y mes), `transparency_months` (vista calculada), `moderation_words`, `moderation_actions`, `push_campaigns`, `admin_audit_log` y `kpi_daily`.

**Endpoints:** se parte del contrato del prototipo (54 endpoints; ver `docs/auditoria-entrega.md`), corrigiendo los fallos que señala la auditoría.

Los pendientes de abril (caché de audio, duración de la vela) siguen abiertos. Propuesta para la duración de la vela: 24 h la básica, 72 h la solemne, 7 días la permanente con renovación semanal.

---

## SDD-04 — Decisiones técnicas (ADR)

| ADR | Estado propuesto |
|---|---|
| ADR-001 React Native + Expo | Se mantiene |
| ADR-002 PostgreSQL | Se mantiene. Se añade el motivo de los KPIs y del libro de movimientos. El prototipo en MongoDB se descarta: solo tiene datos de ejemplo, así que migrar no cuesta nada |
| ADR-003 RevenueCat | Se mantiene, detrás de una capa de pagos intercambiable. Pagos simulados hasta que exista la entidad legal |
| ADR-004 Railway | Se mantiene |
| ADR-005 Cloudflare R2 | Se mantiene, ampliado a imágenes |
| ADR-006 Retool | **Sustituido** por ADR-012 |
| ADR-007 Aislamiento de SRS | Se reformula: SRS ya no existe. Se mantiene la regla legal de que ningún activo vincule a SRS S.L. **Se elimina la herencia de los tokens Foundation de SRS**: la identidad es propia |

**ADR nuevos:**
- **ADR-008 Monorepo con paquete compartido.** Tipos y validaciones comunes entre app, panel y API.
- **ADR-009 Base del producto = entrega del constructor.** Se conserva la app móvil y el diseño. El backend FastAPI + MongoDB se sustituye, con sus tests HTTP como contrato.
- **ADR-010 Auth con Better Auth.** Alternativas descartadas: JWT hecho a mano (más riesgo) y proveedores gestionados (dependencia y coste por usuario).
- **ADR-011 PostHog para analítica de producto.** Sustituye a Mixpanel: es open source y se puede alojar en servidor propio.
- **ADR-012 Panel de gestión propio.** Los KPIs y la evolución son el núcleo del negocio, hay varios roles con registro de acciones y Retool gratuito tiene límites de usuarios.
- **ADR-013 pg-boss para tareas programadas.** Evita añadir Redis en el MVP.
- **ADR-014 Socket.IO para el chat de misa.** Se podrá escalar con Redis sin reescribir.
- **ADR-015 Libro de movimientos de solo inserción.** El 20% y la transparencia se derivan de él y nunca se introducen a mano.

---

## SDD-05 — Backlog

- Se mantienen las épicas 1 a 6b (US-01 a US-23), con dos ajustes:
  - US-11: precio de 0,99 / 1,99 / 2,99.
  - US-19 y US-20: el panel es propio, no Retool.
- **Épicas nuevas:**
  - Muro de intenciones.
  - Misa en vivo y chat.
  - Causas y votación.
  - Transparencia.
  - Panel: moderación, usuarios y roles, notificaciones, KPIs.
  - Apple Sign-In.
  - Migración del backend al nuevo stack.
- Las historias concretas se redactan después de aprobar SDD-02.

---

## SDD-06 — Reglas de desarrollo

- La estructura de carpetas pasa a ser la del monorepo:
  - `apps/mobile`: la estructura Expo de abril más los módulos por pilar.
  - `apps/api/src/modules/<pilar>`.
  - `apps/admin`.
  - `packages/shared`.
- Se mantiene: TypeScript obligatorio, ESLint + Prettier, Conventional Commits, Zustand + TanStack Query, respuesta `{ data, error }` y ningún texto sin i18n.
- Se añade:
  - Tamaños mínimos de letra: 16 px para lectura y 14 px para el resto.
  - Prohibido mencionar causas o el 20% en el flujo de compra.
  - Los esquemas Zod de `packages/shared` son la única definición de los contratos.
- Pendiente de abril que se resuelve: se usa **Prisma** como ORM.

---

## SDD-07 — Plan de testing

- Se mantiene la estrategia y el coverage mínimo.
- Se añade:
  - Los tests HTTP del prototipo (`backend/tests/test_api.py`) se portan como **tests de contrato** de la API nueva.
  - Test de concurrencia en la votación (dos votos simultáneos → uno falla).
  - Test de que el flujo de compra no contiene textos de causas ni del 20%.
  - Tests de permisos por rol en todos los endpoints del panel.

---

## SDD-08 — Plan de despliegue

- En Railway se añaden el servicio del panel y los workers de pg-boss.
- Se añade PostHog: en la nube al principio y en servidor propio si crece.
- CI con GitHub Actions: `tsc`, lint y tests para las cuatro partes del monorepo.
- Los costes se revisan cuando esté cerrado SDD-02.

---

## Decisiones que necesito de ti

1. **Pilar 2 en el MVP:** ¿lanzamos con misa en vivo aunque el sacerdote definitivo no esté fichado?
2. **Fecha de lanzamiento:** mantener la novena guadalupana (dic 2026) recortando alcance, o moverla.
3. **Precio de la vela:** ¿0,99 / 1,99 / 2,99 USD?
4. **Actualizar Notion:** ¿lo hago yo con estas propuestas o lo haces tú?
