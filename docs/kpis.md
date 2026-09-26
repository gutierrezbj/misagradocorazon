# KPIs y analítica

SDD-02 (panel de gestión, KPIs mínimos), SDD-05 (US-20, épica 14), ADR-011 (PostHog) y ADR-013 (pg-boss).

Hay dos fuentes distintas, cada una para lo suyo:

| Fuente | Qué mide | Dónde se ve |
|---|---|---|
| PostgreSQL | Negocio: fieles, actividad, velas, dinero, 20 %, votos, asistencia a misa | Panel → Resumen |
| PostHog | Producto: embudos, retención y cohortes por pantalla y función | PostHog (cuenta del fundador) |

## Métricas de negocio (PostgreSQL)

- **Cifras de la ventana elegida** (7, 30 o 90 días): se calculan en vivo.
- **Serie por día:** sale de la tabla `kpi_daily`. Cada fila es un día natural en UTC y guarda:
  - altas, fieles activos y oraciones;
  - velas, compradores, ingresos y 20 %;
  - votos, mensajes de chat y asistentes a misa.

  Las cifras salen siempre de las tablas de origen; nunca se teclean.
- **Cuándo se calcula:**
  - El worker lo hace cada noche a las 00:20 UTC. Recalcula los 3 últimos días, por si llegan escrituras tardías, y rellena los huecos desde el primer registro (máximo 400 días).
  - Si al abrir el panel falta algún día, se calcula en ese momento.
  - El día de hoy no se guarda: se calcula en vivo.
- **El staff no cuenta** en ninguna cifra de fieles. Las cuentas borradas no cuentan en el total de fieles ni en las cohortes de retención.

### Asistencia a misa

Cuenta como asistente quien tiene abierta la pantalla de la misa mientras está en directo. Hay una fila por persona y misa en `mass_attendance`.

- Si la persona la abre antes de empezar, cuenta cuando empieza, siempre que siga dentro.
- Una misa ya terminada no suma asistentes.
- Hace falta sesión iniciada.

El panel muestra los asistentes a la última misa empezada y, aparte, cuántos de ellos escribieron en el chat.

## Analítica de producto (PostHog)

Solo con consentimiento explícito. Al final del onboarding la opción aparece **desactivada**, y se puede cambiar en Ajustes → Privacidad. El servidor guarda el consentimiento (`analyticsConsent`) y la fecha de su último cambio (`analyticsConsentAt`), para poder demostrarlo.

**Mientras no hay consentimiento, la app no contacta con PostHog:** el cliente ni siquiera se crea. Comprobado con un servidor de captura local: cero peticiones.

**Qué se envía:**

- Solo los eventos definidos en `apps/mobile/src/analytics.ts`, con propiedades de valores cerrados:

  | Evento | Propiedades |
  |---|---|
  | `onboarding_completed` | idioma, número de santos secundarios |
  | `prayer_completed` | mañana o noche |
  | `audio_played` | santo, mañana, noche o meditación |
  | `candle_flow_started` | ninguna |
  | `candle_lit` | tipo de vela, por difuntos o no |
  | `candle_shared` | con o sin intención |
  | `intention_posted` | categoría, retenida por moderación o no |
  | `intention_prayed` | ninguna |
  | `vote_cast` | ninguna |
  | `mass_opened` | estado de la misa |
  | `chat_message_sent` | ninguna |

- Pantallas por su ruta genérica (`saint/[id]`), sin ids.
- Aperturas de la app, que son la base de la retención.
- Identificación solo por el id interno del usuario.

**Qué no se envía nunca:**

- intenciones, mensajes, nombres ni email;
- geolocalización por IP;
- grabación de sesiones;
- feature flags ni encuestas.

Probado de punta a punta: ninguno de esos textos aparece en lo capturado. Al retirar el consentimiento, cerrar sesión o borrar la cuenta, el móvil deja de enviar y olvida la identidad local.

### Configuración

Son variables de EAS (*Environment variables*), no del repositorio:

- `EXPO_PUBLIC_POSTHOG_KEY`: clave del proyecto de PostHog. Sin ella, la analítica está apagada.
- `EXPO_PUBLIC_POSTHOG_HOST`: por defecto `https://us.i.posthog.com`. Si se elige la región de la UE, poner `https://eu.i.posthog.com`.

### Pendiente

- **Cuenta de PostHog:** crearla a nombre del fundador, elegir región y configurar embudos y retención.
- **Aviso de privacidad:** incluir la analítica en el aviso legal y en la ficha de privacidad de App Store y Google Play (datos de uso, vinculados al id interno, no usados para rastreo).
- **Borrado en PostHog:** al borrar una cuenta, borrar también la persona en PostHog. Se hace con su API y una clave personal del fundador; hasta entonces, el móvil solo olvida la identidad local. Los datos que quedan en PostHog no tienen nombre ni email.
