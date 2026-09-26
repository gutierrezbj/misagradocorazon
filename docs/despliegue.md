# Despliegue en Railway

Plan de SDD-08 (actualización del 26-sep-2026). **Todo a nombre del fundador** (o de la futura sociedad).

## Servicios

Un proyecto de Railway con dos entornos, **staging** y **production**. Cada entorno tiene cuatro servicios:

| Servicio | Qué es | Fichero de configuración (Settings → Config-as-code) | Dominio propuesto |
|---|---|---|---|
| `postgres` | PostgreSQL de Railway | — | (privado) |
| `api` | API + chat de misa (Socket.IO) | `/apps/api/railway.json` | `api.misagradocorazon.com` · `api-staging.misagradocorazon.com` |
| `worker` | Tareas programadas (pg-boss): votaciones y push | `/apps/api/railway.worker.json` | — (sin HTTP) |
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
| `EXPO_ACCESS_TOKEN` | Opcional (`docs/push.md`) |
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
- **Antes del primer build:** hace falta `eas init` con la cuenta de Expo del fundador (`docs/push.md`).

## Decisiones pendientes (SDD-08)

- **Copias de seguridad de PostgreSQL:** activar los backups de Railway en producción. Recomendación: diarios, con retención de 7 días como mínimo.
- **Monitorización de errores:** Sentry u otro.
- **Actualizaciones de la app:** por aire (OTA, Expo Updates) o solo por las tiendas.
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
