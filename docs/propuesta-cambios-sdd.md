# Propuesta de cambios a los SDD (Notion)

Fecha: 26-sep-2026. Estado: **aprobada por el fundador y aplicada en Notion el 26-sep-2026** (SDD-02 a SDD-08 y página principal; SDD-01 sin cambios).

Decisiones tomadas:
- **Misa en vivo en el MVP:** sí, en versión mínima, con la misa de una parroquia colaboradora mientras no esté fichado el sacerdote definitivo.
- **Lanzamiento:** se mantiene la novena guadalupana (1–12 dic 2026), con misa y causas en versión mínima.
- **Precio de la vela:** 0,99 / 1,99 / 2,99 USD.
- **Notion:** lo actualiza Claude.

- **Origen:** arquitectura aprobada el 26-sep-2026 (ver `CLAUDE.md`, sección "Arquitectura objetivo") y la entrega del constructor como base de diseño.
- **Objetivo:** que los SDD de Notion vuelvan a ser la fuente de verdad coherente con lo que se va a construir.

Cada bloque dice qué cambia, por qué y qué se mantiene. Cuando lo apruebes, lo paso a Notion página por página o lo pasas tú.

---

## Cambio propuesto el 23-nov-2026: beta web (PWA) con la vela gratis

Estado: **aprobado por el fundador el 23-nov-2026** ("a toda vela"). Decisiones abiertas, resueltas con la recomendación:
- dominio `app.misagradocorazon.com`;
- apertura el 1-dic, con la novena;
- beta abierta a cualquiera.

**Pendiente:** pasarlo a Notion (SDD-02, 04, 05, 07 y 08). La edición desde la sesión de código quedó bloqueada por permisos el 23-nov-2026.

**Por qué:** MSC pasa a ser el producto principal (Plan v4.2 de Mi Academia). Publicar en las tiendas lleva semanas: cuentas, revisión de Apple y, en Google, una prueba cerrada de 14 días con al menos 12 testers. Cobrar exige una sociedad que aún no está. La app ya funciona en navegador. Una beta web instalable (PWA) llega a los fieles en días y deja que Meta Ads lleve directo a la app, sin ficha de tienda.

**Objetivo:** beta abierta en la web para la **novena guadalupana (1–12 dic 2026)**, la fecha de lanzamiento ya aprobada. La app nativa sigue en paralelo hacia las tiendas.

### SDD-02 — Alcance

- **Entra:** versión web instalable de la app (PWA) en su propio dominio, con los tres pilares.
- **Entra:** vela **gratis durante la beta**. Se enciende igual (santo, intención, tipo y duración), sin pago.
- **Se mantiene:** compras dentro de la app con RevenueCat cuando exista la sociedad, en las tiendas.
- **Fuera de la beta web:**
  - push en el navegador: lo cubre la app nativa;
  - cobro real.

### SDD-04 — Decisiones técnicas

- **ADR-003 (pagos), ajuste:** la capa de pagos tiene un modo **"beta gratis"**.
  - La vela se guarda con precio 0 y proveedor `beta_free`.
  - No genera movimientos en el libro: ni compra ni 20 %.
  - Se activa con una variable de entorno, y el modo simulado actual desaparece de cara al fiel.
- **ADR-016 nuevo — PWA con Expo web.**
  - Se publica la misma app (`expo export` para web) como sitio estático, con manifiesto, iconos y service worker para instalarla y cargar rápido.
  - Alternativa descartada: una web aparte, que duplicaría pantallas y textos.

### SDD-05 — Backlog

- **US-27 — Beta web instalable.** Como fiel, abro la app desde un enlace, la uso en el navegador y la añado a la pantalla de inicio.
  - Criterios: carga en móvil, botón o indicación para instalar, funciona en iPhone (Safari) y Android (Chrome), mismos textos ES/EN.
- **US-28 — Vela gratis durante la beta.** Como fiel, enciendo una vela sin pagar mientras dure la beta.
  - Criterios:
    - en el flujo de la vela se lee "Gratis durante la beta" en lugar del precio;
    - no se menciona ningún pago;
    - la regla de Apple 3.2.2.iv se sigue cumpliendo: ni causas ni 20 % en ese flujo.
- **US-29 — Transparencia honesta en la beta.** Como fiel, en transparencia veo que durante la beta no hay recaudación, en lugar de cifras simuladas.
- **KPIs** (regla del fundador: cada función con su medida):
  - `pwa_installed`: instalación desde el navegador;
  - `platform` (web, iOS, Android) en todos los eventos de PostHog;
  - velas de la beta por día;
  - fieles activos en web;
  - conversión de visita a registro.
  - En el panel, las velas de la beta cuentan como velas, pero no como ingresos.

### SDD-07 — Testing

- Test de que, en modo beta, la vela no crea movimientos en el libro y la transparencia da 0.
- El test de compliance del flujo de compra se amplía a "Gratis durante la beta".
- Prueba manual de la PWA en un iPhone y un Android reales: instalar, entrar, rezar, encender la vela, misa con chat y audio.

### SDD-08 — Despliegue

- **Web:** la PWA se sirve desde el VPS, junto al staging (`deploy/staging/`), con su imagen en GHCR y HTTPS.
  - Dominio propuesto: `app.misagradocorazon.com`.
- **Con fieles reales, el VPS deja de ser "staging".** Guarda datos personales e intenciones (GDPR art. 9). Antes de abrir la beta:
  - copias de seguridad diarias de PostgreSQL fuera del VPS;
  - `INTENTIONS_KEY` guardada fuera del VPS;
  - base de datos limpia, sin las compras simuladas de prueba;
  - aviso de privacidad publicado, con la analítica y el tratamiento de las intenciones.
- **Servicios necesarios para la beta:**
  - SMTP, para recuperar la contraseña;
  - R2, para las imágenes y el audio;
  - PostHog;
  - Sentry.
- Google Sign-In en la web necesita el cliente web de Google Cloud. Apple Sign-In en la web necesita la cuenta de Apple Developer; si no está a tiempo, en la web va solo email y Google.

### Cambio del 23-nov-2026: voces de IA e invitados en el audio

Aprobado por el fundador el 23-nov-2026. Sustituye la restricción de SDD-02 "audio pregrabado por el equipo (no voz sintética)" y la regla de CLAUDE.md.

- **SDD-02, restricción de audio:**
  - El audio puede grabarlo una persona (el equipo o un invitado) o generarse con voces de IA (Fish Audio, ElevenLabs) con licencia comercial.
  - Las voces de IA dan el volumen diario: santo del día y oraciones por tiempo litúrgico.
  - Los invitados dan las piezas especiales: novenas, oraciones principales y celebraciones.
- **Condiciones:**
  - la app siempre identifica la voz ("Voz generada con IA" o el nombre del invitado);
  - nunca se clona la voz de una persona real sin su consentimiento por escrito;
  - una persona revisa cada texto antes de generarlo;
  - el detalle legal (la ley de IA europea pide identificar el audio generado) lo confirma el asesor del fundador.
- **SDD-05, US-30 — Voz identificada en el reproductor:**
  - Cada audio guarda su tipo de voz (IA o persona) y, si es una persona, su nombre.
  - El reproductor lo muestra.
  - El panel lo pide al subir el audio.
- **KPI:** `audio_played` lleva el tipo de voz, para comparar la escucha entre voces de IA e invitadas.

### Decisiones que necesito del fundador

1. Aprobar este cambio para aplicarlo en Notion (SDD-02, 04, 05, 07 y 08).
2. Dominio de la beta: `app.misagradocorazon.com`, u otro.
3. Fecha de apertura: el 1-dic (empieza la novena), o antes en privado con un grupo pequeño.
4. ¿La beta web es abierta a cualquiera desde el primer día, o con invitación?

### Propuesta del 28-nov-2026: la vela en pantalla (US-31)

Idea del fundador del 28-nov-2026. **Pendiente de aprobar**: sin ese visto bueno no se escribe código.

- **Qué es:** el fiel enciende su vela y la deja a pantalla completa mientras ora, por ejemplo en la mesita de noche. La llama se mueve y la cera baja según el tiempo que le queda de verdad a la vela.
- **SDD-05, US-31, en la Épica 3, Velas:** "Como fiel, quiero dejar mi vela encendida en la pantalla mientras rezo, para tenerla delante como en un altar". Criterios de aceptación:
  1. **Desde dónde se abre:**
     - en "Mis velas" del altar, al tocar una vela encendida;
     - y en la confirmación de la vela, con el botón "Dejarla en pantalla".
  2. **La pantalla:**
     - a pantalla completa, sin pestañas ni barras, sobre el negro cálido del altar;
     - con la llama de siempre (`CandleFlame`) en grande y la cera a la altura que le toca según `litAt` y `expiresAt`;
     - debajo, el santo y cuánto le queda ("Le quedan 2 días y 5 horas").
  3. **La intención está oculta por defecto:** son datos de creencias (RGPD art. 9) y otra persona puede ver la pantalla. Un toque en "Ver intención" la muestra, y se vuelve a ocultar sola a los 10 s.
  4. **La pantalla no se apaga mientras dura el temporizador.** El fiel lo elige al entrar:
     - 30 min;
     - 1 h (por defecto);
     - toda la noche (8 h).

     Al acabar, el teléfono vuelve a su comportamiento normal y se apaga cuando le toque. Hace falta así porque la vela dura de 1 a 7 días y la pantalla no puede quedarse encendida tanto tiempo.
  5. **Controles:** un toque en cualquier sitio los muestra, y se ocultan solos a los 5 s:
     - cerrar;
     - ver la intención;
     - la oración de la noche, con el reproductor de siempre (el audio sigue al cerrar la pantalla).
  6. **De noche:**
     - casi todo en negro y la llama con poco brillo;
     - la llama se desplaza unos píxeles cada pocos minutos para no marcar la pantalla.

     El brillo del teléfono no se toca en esta versión.
  7. **Si la vela se consume con la pantalla abierta:**
     - la llama se apaga despacio;
     - aparece "Tu vela se ha consumido";
     - debajo, "Encender otra vela", que lleva al flujo de siempre.

     Ese texto no menciona causas, donaciones ni el 20 % (Apple 3.2.2.iv).
  8. Con "reducir movimiento" activado en el teléfono, la llama queda quieta.
  9. Textos por i18n (ES/EN). 16 px el texto de lectura y 14 px el resto como mínimo.
- **SDD-03 y SDD-04, técnica:**
  - **No toca la API ni la base de datos:** la vela ya trae `litAt`, `expiresAt` y su tipo.
  - **En el teléfono:** `expo-keep-awake`, el módulo oficial de Expo SDK 57 y la única dependencia nueva.
  - **En la web:** la API Screen Wake Lock del navegador.
    - Funciona en Chrome y Android. En el iPhone necesita una versión reciente de iOS.
    - Si el navegador no la tiene, la pantalla sale igual con un aviso: "Tu navegador puede apagar la pantalla; súbele el tiempo de bloqueo en Ajustes".
- **KPIs:** dos eventos de producto en PostHog; las métricas de negocio no cambian.
  - `candle_vigil_started`, con el tipo de vela, el temporizador elegido y la plataforma;
  - `candle_vigil_ended`, con los minutos que estuvo abierta y por qué terminó: el fiel la cerró, se acabó el temporizador o la vela se consumió.

  Sirve para medir qué parte de las velas encendidas se usan así y cuánto tiempo, y si quien la usa vuelve más al ritual (retención por cohortes).
- **SDD-07, pruebas:**
  - tests de la altura de la cera y del tiempo restante;
  - que la pantalla se mantiene encendida y se libera al cerrar o al acabar el temporizador;
  - que la intención está oculta al entrar;
  - que la vela se apaga al consumirse;
  - que la pantalla de vela consumida no nombra causas ni el 20 %;
  - prueba en el navegador y en el teléfono.
- **Encaje con el plan:** cabe antes del 1-dic. Si no, entra justo después sin bloquear la beta.

### Decisiones que necesito del fundador (US-31)

1. Aprobar US-31 tal cual, con:
   - la intención oculta por defecto;
   - el temporizador de 1 h por defecto, con 30 min y 8 h como alternativas;
   - el nombre "Dejarla en pantalla" para el botón.
2. Pasarla a Notion (SDD-05 y SDD-07) junto con lo que está pendiente.

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
- **Cambio del 28-sep-2026** (aprobado por el fundador y aplicado en Notion ese día): nueva **US-24, recuperar la contraseña** con un código por email, en la Épica 1 (`docs/recuperar-contrasena.md`), **US-25, compartir el evangelio del día** en la Épica 8 (la especificación funcional pide "opción de compartir en redes") y **US-26, iconografía del santo** en la Épica 2.

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
- **Cambio del 28-sep-2026** (decisión del fundador, aplicado en Notion ese día):
  - El estado global de la app va con **Context de React + TanStack Query**, no con Zustand. La app nunca usó Zustand y migrar no aporta nada al usuario.
  - Cada módulo de la API agrupa **rutas y servicios**; los contratos están en `packages/shared`. No hay capa de controllers aparte.
  - Queda registrada la estructura aplicada (módulos de la API y `src/` de la app por pilar) y Prettier en el CI.

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
- **Cambio del 28-sep-2026** (visto bueno del fundador, aplicado en Notion ese día): se resuelven los tres pendientes de decisión de SDD-08 tal como están implementados, que son EAS Update más tiendas, Sentry sin datos personales y backups diarios de Railway con 7 días antes del lanzamiento (`docs/monitorizacion.md`). Se describe también el CI real y se recuerda que el panel es propio, no Retool.

---

## Decisiones que necesito de ti

1. **Pilar 2 en el MVP:** ¿lanzamos con misa en vivo aunque el sacerdote definitivo no esté fichado?
2. **Fecha de lanzamiento:** mantener la novena guadalupana (dic 2026) recortando alcance, o moverla.
3. **Precio de la vela:** ¿0,99 / 1,99 / 2,99 USD?
4. **Actualizar Notion:** ¿lo hago yo con estas propuestas o lo haces tú?
