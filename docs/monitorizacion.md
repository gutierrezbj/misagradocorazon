# Monitorización de errores y actualizaciones de la app

Decisiones del fundador del 27-sep-2026 sobre los pendientes de SDD-08.

## Sentry (errores de app, panel, API y worker)

Plan gratuito, en una cuenta a nombre del fundador. En cada parte se activa solo con su DSN; sin él, no se envía nada.

| Parte | Variable | Dónde se define |
|---|---|---|
| API y worker | `SENTRY_DSN` (y opcional `SENTRY_ENVIRONMENT`) | Railway, en los servicios `api` y `worker` |
| Panel | `VITE_SENTRY_DSN` | Railway, como argumento de construcción de la imagen del panel |
| App | `EXPO_PUBLIC_SENTRY_DSN` (y opcional `EXPO_PUBLIC_SENTRY_ENVIRONMENT`) | EAS, en *Environment variables* |
| Mapas de código de la app | `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | EAS. Opcional: sin ellas, los errores llegan igual pero sin la línea exacta del código |

### Qué se envía y qué no (GDPR art. 9)

Antes de enviar cada error, `packages/shared/src/sentry.ts` (`scrubEvent`) lo limpia:

- **Petición:** quita cuerpos, cookies, parámetros de la URL y cabeceras. Solo se conserva el user-agent.
- **Usuario:** se envía sin usuario y con `ip_address: null`, así Sentry no deduce la IP.
- **Migas:** solo las de navegación y peticiones, con la URL sin parámetros, el método y el estado.
- **Extra:** se eliminan los datos extra.
- **Opciones del SDK:** en la app y el panel, sin sesiones (en ellas Sentry deduce la IP), sin capturas de pantalla ni jerarquía de vistas, y sin trazas de rendimiento.
- **API:** solo informa de errores internos (500); los 4xx son respuestas normales.

**Probado con los SDK reales y un servidor local que hace de Sentry:**

- **API:** un fallo en `POST /api/candles` con una intención en el cuerpo, `Authorization`, `X-Forwarded-For` y un email en la URL. Llega el error sin ninguno de esos datos.
- **App (web):** registro, vela con intención y error provocado. Llega un solo evento, sin sesiones, sin la intención, el nombre, el email ni la IP.
- **Panel:** login y error provocado. Llega un solo evento, sin email ni token.

**Al crear el proyecto en Sentry,** activa también *Settings → Security & Privacy → Prevent Storing of IP Addresses*, como segunda barrera.

## EAS Update y tiendas

- **Qué cubre cada vía:** los arreglos de código (JS) llegan sin pasar por la revisión de las tiendas. Los cambios nativos (módulos nuevos, permisos, versión de Expo) siguen yendo por App Store y Google Play.
- **A qué builds llega cada actualización:** a los de su misma versión de la app (`runtimeVersion` con la política `appVersion`). Al subir la versión de la app se publica un build nuevo en las tiendas.
- **Canales:** cada perfil de `eas.json` tiene el suyo (`development`, `preview`, `production`). Se publica con `eas update --channel production`.
- **Activación:**
  1. Crear el proyecto de EAS con la cuenta del fundador (`eas init`).
  2. Guardar su id como `EAS_PROJECT_ID` en EAS. `app.config.ts` añade entonces `updates.url` y `extra.eas.projectId`.
  3. Hacer un build nuevo. Los builds anteriores no reciben actualizaciones.
- **Apple:** sus normas de revisión permiten actualizar código interpretado si no cambia el propósito de la app. Nada de funciones nuevas que esquiven la revisión.

## Copias de seguridad

Pendiente mientras se está en pruebas. Antes del lanzamiento, activar los backups de Railway en producción. Recomendación: diarios, 7 días de retención. Se cambian desde el panel de Railway cuando se quiera, sin tocar código.
