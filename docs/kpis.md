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

## Oraciones por tiempo litúrgico

El resumen del panel muestra, para la ventana elegida, cuántas oraciones rezaron los fieles en cada tiempo litúrgico (US-10) y la **media por día** de cada tiempo, que es la cifra comparable: los tiempos duran distinto. Sale de `prayer_log` (día local del fiel) y no cuenta al staff. Sirve para ver si la gente reza más en Cuaresma o en Adviento que en el tiempo ordinario.

## Objetivos del MVP

El resumen del panel compara las métricas de éxito de la especificación funcional (§10) con sus metas a los meses 1-3 y al mes 6. Son mensuales, así que se miden siempre sobre los **últimos 30 días**, sea cual sea la ventana elegida arriba. Las metas están en un solo sitio: `MVP_TARGETS` en `packages/shared/src/domain.ts`.

| Métrica | Cómo se mide | Meta 1-3 | Meta 6 |
|---|---|---|---|
| Descargas acumuladas | No está en la base de datos: se lee en App Store Connect y Google Play Console | 5.000 | 25.000 |
| Usuarios activos (MAU) | Fieles con actividad en 30 días (el staff no cuenta) | 2.000 | 10.000 |
| Conversión a vela | Fieles que encendieron una vela en 30 días, sobre el MAU | 10 % | 15 % |
| Velas encendidas al mes | Velas de los últimos 30 días | 400 | 3.000 |
| Retención D7 y D30 | Las mismas cohortes de arriba | 30 % y 15 % | 40 % y 25 % |
| Asistencia a misa | Fieles que tuvieron abierta en directo la última misa | 200 | 1.000 |
| Participación en la votación | Votos del mes sobre el MAU | 50 % | 60 % |
| Ingresos al mes | Compras del libro en 30 días (hoy simuladas) | 2.000 USD | 15.000 USD |
| Impacto transferido al mes | Transferencias del libro en 30 días | 400 USD | 3.000 USD |

La columna de progreso mide cuánto falta para la meta de los meses 1-3.

## Analítica de producto (PostHog)

Solo con consentimiento explícito. Al final del onboarding la opción aparece **desactivada**, y se puede cambiar en Ajustes → Privacidad. El servidor guarda el consentimiento (`analyticsConsent`) y la fecha de su último cambio (`analyticsConsentAt`), para poder demostrarlo.

**Mientras no hay consentimiento, la app no contacta con PostHog:** el cliente ni siquiera se crea. Comprobado con un servidor de captura local: cero peticiones.

**Qué se envía:**

- Solo los eventos definidos en `apps/mobile/src/analytics.ts`, con propiedades de valores cerrados:

  | Evento | Propiedades |
  |---|---|
  | `onboarding_completed` | idioma, número de santos secundarios |
  | `prayer_completed` | mañana o noche, tiempo litúrgico |
  | `audio_played` | santo, mañana, noche o meditación |
  | `mini_player_used` | volver al audio, pausar/reanudar o cerrar. Dice cuántos escuchan mientras usan otras partes de la app |
  | `candle_flow_started` | ninguna |
  | `candle_lit` | tipo de vela, por difuntos o no |
  | `candle_shared` | con o sin intención |
  | `intention_posted` | categoría, retenida por moderación o no |
  | `intention_prayed` | ninguna |
  | `vote_cast` | ninguna |
  | `password_reset_requested`, `password_reset_completed` | ninguna. Embudo de recuperar la contraseña (`docs/recuperar-contrasena.md`) |
  | `cause_opened` | ninguna (se abre la ficha completa de una causa). Junto con `vote_cast`, dice cuántos leen la ficha antes de votar |
  | `mass_opened` | estado de la misa |
  | `recording_opened` | grabación vista dentro de la app o fuera |
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

## Transparencia y registro de cambios en el panel

- **Transparencia** (moderador, editor y superadmin):
  - Totales de ingresos, 20 %, transferido y pendiente de transferir.
  - Tabla por mes con la causa ganadora.
  - Movimientos de cada mes, filtrables por compra, 20 % o transferencia.
  - Todo sale del libro de movimientos, así que las cifras coinciden con las que ve la app.
  - Los movimientos no enlazan a ninguna persona.
  - El pendiente solo lo ve el panel.
- **Registro de cambios** (solo superadmin):
  - Quién hizo cada cambio, qué hizo y cuándo, del más reciente al más antiguo.
  - Se filtra por tipo y se pagina de 50 en 50.
  - De una cuenta borrada no queda el nombre: aparece como "Cuenta borrada".
