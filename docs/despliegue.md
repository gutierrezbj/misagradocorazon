# Despliegue en Railway

Plan de SDD-08 (actualización del 26-sep-2026). **Todo a nombre del fundador** (o de la futura sociedad).

> **Staging provisional (29-sep-2026):** hasta que exista la cuenta de Railway, staging corre en el VPS del fundador con las mismas imágenes. Ver `deploy/staging/README.md`.

## Servicios

Un proyecto de Railway con dos entornos, **staging** y **production**. Cada entorno tiene cuatro servicios:

| Servicio | Qué es | Fichero de configuración (Settings → Config-as-code) | Dominio propuesto |
|---|---|---|---|
| `postgres` | PostgreSQL de Railway | — | (privado) |
| `api` | API + chat de misa (Socket.IO) | `/apps/api/railway.json` | `api.misagradocorazon.com` · `api-staging.misagradocorazon.com` |
| `worker` | Tareas programadas (pg-boss): votaciones, push, KPIs diarios y revocaciones de Apple | `/apps/api/railway.worker.json` | — (sin HTTP) |
| `admin` | Panel de gestión (estático, Caddy) | `/apps/admin/railway.json` | `admin.misagradocorazon.com` · `admin-staging.misagradocorazon.com` |

Los tres servicios de código apuntan al mismo repositorio y a la rama `main`, y cada uno usa su fichero de configuración:
- **Construyen con Dockerfile:** `apps/api/Dockerfile` (API y worker) y `apps/admin/Dockerfile`.
- **Solo se redespliega lo que cambia:** cada servicio declara qué rutas vigila (`watchPatterns`).
- **Migraciones:** el servicio `api` ejecuta `prisma migrate deploy` antes de cada despliegue (`preDeployCommand`). Si fallan, el despliegue no sigue adelante.
- **Healthcheck:** `api` en `/api/health`, que comprueba también la base de datos; `admin` en `/`.
- **Apagado ordenado:** la API y el worker terminan lo que están haciendo al recibir SIGTERM.

> **Sin verificar desde aquí:** la documentación de Railway no es accesible desde el entorno donde se preparó esto. Las claves de `railway.json` son las de su configuración como código (`builder`, `dockerfilePath`, `watchPatterns`, `startCommand`, `preDeployCommand`, `healthcheckPath`, `healthcheckTimeout`, `restartPolicyType`, `restartPolicyMaxRetries`). Al crear cada servicio, comprueba en su pestaña Settings que Railway las ha leído: Dockerfile, *Pre-deploy command*, *Healthcheck path* y *Start command*. Si alguna no aparece, se configura en la misma pantalla.

## Variables

**`api` y `worker`** (compártelas con *Shared variables* o con una referencia a `postgres`):

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `${{postgres.DATABASE_URL}}` (red privada de Railway) |
| `NODE_ENV` | `production` |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32`, **distinto por entorno** |
| `BETTER_AUTH_URL` | `https://api.misagradocorazon.com` (o el de staging) |
| `TRUSTED_ORIGINS` | `https://admin.misagradocorazon.com` (o el de staging) |
| `INTENTIONS_KEY` | `openssl rand -base64 32`. **Guárdala fuera de Railway: si se pierde, las intenciones cifradas son irrecuperables** |
| `GOOGLE_CLIENT_ID`, `APPLE_BUNDLE_ID` | `docs/login-social.md` |
| `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | `docs/login-social.md`. También en el worker (reintenta las revocaciones) |
| `EXPO_ACCESS_TOKEN` | Opcional (`docs/push.md`) |
| `SMTP_URL`, `MAIL_FROM` | Opcionales: email para recuperar la contraseña. Sin ellas, la opción no aparece (`docs/recuperar-contrasena.md`) |
| `R2_*` | `docs/contenido.md` |

- **`PORT`:** no hace falta. Railway la pone y la API la usa.

**`admin`:**

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://api.misagradocorazon.com` (o el de staging) |

- **`VITE_API_URL` se usa al construir:** el Dockerfile la declara como `ARG` y no construye sin ella. Si cambia, hay que redesplegar el panel.

## Primer despliegue

1. **Proyecto y servicios:** crear el proyecto, el entorno staging y los cuatro servicios de la tabla, con sus variables.
2. **Primer despliegue:** desplegar `api`, que aplica las migraciones, luego `worker` y luego `admin`.
3. **Catálogo inicial de santos** (SDD-08: "seeds de santos en el primer deploy"). Desde la consola del servicio `api` (`railway ssh`, o Shell en el panel de Railway):
   ```bash
   tsx prisma/seed-catalog.ts
   ```
   Solo crea los santos que falten y no toca los editados en el panel. Sus imágenes tienen la licencia sin verificar: hay que sustituirlas desde el panel antes de publicar (`docs/fuentes-imagenes.md`).
4. **Primer superadmin**, desde la misma consola:
   ```bash
   tsx src/cli/create-staff.ts --email tu@correo.com --name "Juan"
   ```
   Pide la contraseña sin mostrarla.
5. **Dominios:** añadir los dominios propios a `api` y `admin` y crear en Hostinger los registros CNAME que indique Railway. El SSL lo pone Railway.
6. **Comprobaciones:**
   - `https://api…/api/health` devuelve `{"data":{"status":"ok"}}`;
   - el panel abre y deja entrar con el superadmin;
   - en los registros del worker aparece "Worker de tareas programadas en marcha".

A partir de ahí, cada merge a `main` redespliega solo los servicios afectados.

## App móvil (EAS)

- **Perfiles de `apps/mobile/eas.json`:**
  - `development` (con `expo-dev-client`) y `preview` apuntan a la API de staging;
  - `production` apunta a la de producción.
- **Variables de Google** (`EXPO_PUBLIC_GOOGLE_*`) y **de PostHog** (`EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_POSTHOG_HOST`, ver `docs/kpis.md`): se definen en EAS (*Environment variables*), no en el repositorio.
- **Proyecto de EAS:** creado el 29-sep-2026 con la cuenta del fundador (`@gutierrezbj/mi-sagrado-corazon`, id en `app.json`).
- **Perfil `development`:** el JavaScript lo sirve Metro desde el ordenador de desarrollo, así que la API a la que apunta sale del `.env` local (`EXPO_PUBLIC_BACKEND_URL=http://<IP-de-la-red-local>:8001`), no de `eas.json`.
- **Generar los builds** (desde `apps/mobile`, con `eas-cli` instalado y sesión iniciada con la cuenta del fundador):
  ```bash
  eas build --platform ios --profile development      # para probar en un iPhone (push, audio, Apple)
  eas build --platform android --profile preview      # APK/AAB de prueba interna
  eas build --platform all --profile production       # versiones para las tiendas
  eas submit --platform ios --profile production      # subir a App Store Connect
  eas submit --platform android --profile production  # subir a Google Play
  ```
  La primera vez, EAS pide o crea los certificados de firma (`eas credentials`). Los cambios solo de JavaScript se publican sin pasar por las tiendas con `eas update` (`docs/monitorizacion.md`).
- **Permisos nativos (revisado con `expo prebuild` el 29-sep-2026):**
  - Android bloquea tres permisos que añade la plantilla y la app no usa: almacenamiento compartido (lectura y escritura) y dibujar sobre otras apps. La tarjeta de la vela se guarda en la caché y se comparte con `expo-sharing`.
  - iOS no declara Face ID: la sesión va al llavero sin biometría.
  - Sin micrófono en ninguna plataforma. Audio en segundo plano activado.
  - Lo vigila `apps/mobile/test/native-config.test.mjs`.
- **Lanzar el build desde una sesión de Claude Code en la nube:** el token de Expo del fundador está en las credenciales del entorno y lo inyecta el proxy en `*.expo.dev`. eas-cli solo se da por autenticado si existe `EXPO_TOKEN`, así que se le pasa un valor cualquiera que el proxy sustituye: `EXPO_TOKEN=proxy-injected eas build ...`.

## Decisiones pendientes (SDD-08)

- **Copias de seguridad de PostgreSQL** (27-sep-2026: se deja para cuando se salga de pruebas): activarlas en Railway antes del lanzamiento. Recomendación: diarias, con retención de 7 días como mínimo. Se cambian cuando se quiera desde el panel de Railway, sin tocar código.
- **Monitorización de errores:** decidido Sentry, plan gratuito (27-sep-2026). Ver `docs/monitorizacion.md`.
- **Actualizaciones de la app:** decidido EAS Update más tiendas (27-sep-2026). Ver `docs/monitorizacion.md`.
- **Coste mensual:** recalcularlo con los cuatro servicios por entorno.

## Verificado antes de subir esto

- **Imágenes:** las dos se construyen con los Dockerfiles del repositorio. La de la API pesa unos 2,4 GB sin comprimir; la base con OpenSSL que necesita Prisma ocupa 1,6 GB. El panel pesa 90 MB. El CI las construye en cada PR y arranca la API contra un PostgreSQL limpio.
- **Primer despliegue simulado con contenedores:**
  - migraciones sobre una base vacía;
  - catálogo (7 santos; al repetirlo, 0 cambios);
  - alta del superadmin;
  - `/api/health`;
  - worker en marcha;
  - apagado ordenado con SIGTERM.
- **Panel en contenedor contra la API en contenedor:**
  - login y resumen;
  - contenido diario y santoral;
  - recarga en una ruta interna (`/santoral`);
  - cabeceras de seguridad (CSP sin `eval`, `X-Frame-Options`, `nosniff`);
  - caché larga en `/assets` y revalidación del resto.
- **No verificado:** el despliegue real en Railway. Hace falta la cuenta del fundador.
