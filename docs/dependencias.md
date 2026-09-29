# Dependencias y servicios de terceros

Requisito de entrega 6. Versiones fijadas en cada `package.json` (sin `^`) y en `pnpm-lock.yaml`. Entorno: Node.js 22 o superior y pnpm 10.33.

## Servicios de terceros

Todas las cuentas van a nombre del fundador o de la futura sociedad, nunca del constructor (CLAUDE.md). Estado a 27-sep-2026: el código está listo, pero ninguna cuenta está creada.

| Servicio | Para qué | Dónde se configura | Sin la cuenta |
|---|---|---|---|
| Railway | Hosting de la API, el worker, el panel y PostgreSQL | `docs/despliegue.md` | Solo se ejecuta en local |
| Expo / EAS | Builds de iOS y Android, actualizaciones EAS Update y servicio de push de Expo | `apps/mobile/eas.json`, `EAS_PROJECT_ID` | No hay builds ni push |
| Apple Developer | App Store, Sign in with Apple (y revocación de tokens) y claves de push (APNs, las crea EAS) | `docs/login-social.md`, `docs/push.md` | Ni iOS ni login con Apple |
| Google Play Console | Publicación en Android | — | No hay app en Android |
| Google Cloud (OAuth) | Login con Google | `GOOGLE_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_*` (`docs/login-social.md`) | El botón de Google no aparece |
| Firebase | Push en Android (FCM v1, clave subida a EAS) | `docs/push.md` | No hay push en Android |
| Cloudflare R2 | Imágenes y audio subidos desde el panel | `R2_*` (`docs/contenido.md`) | El panel no sube ficheros; se pueden pegar URLs |
| PostHog | Analítica de producto, solo con consentimiento | `EXPO_PUBLIC_POSTHOG_*` (`docs/kpis.md`) | La analítica está apagada |
| Proveedor de email (SMTP) | Código para recuperar la contraseña (US-24) | `SMTP_URL`, `MAIL_FROM` (`docs/recuperar-contrasena.md`) | La opción "¿Olvidaste tu contraseña?" no aparece |
| Sentry | Errores de la app, el panel, la API y el worker, sin datos personales | `SENTRY_DSN`, `EXPO_PUBLIC_SENTRY_DSN`, `VITE_SENTRY_DSN` (`docs/monitorizacion.md`) | No se envía nada |
| YouTube | Emisión de la misa en vivo (vídeo incrustado) | URL de cada misa en el panel | — |
| RevenueCat | Compras dentro de la app, cuando exista la sociedad (ADR-003) | Aún no integrado: la capa de pagos es simulada (`apps/api/src/modules/payments/provider.ts`) | Pagos simulados |
| Dominio | Enlace directo de la vela compartida (US-22), API y panel | — | Pendiente (`docs/testing.md`) |

## API (`apps/api`)

| Dependencia | Versión | Para qué |
|---|---|---|
| express | 5.2.1 | Servidor HTTP |
| zod | 4.1.12 | Validación de entradas (esquemas en `packages/shared`) |
| @prisma/client, @prisma/adapter-pg, pg | 7.10.0, 7.10.0, 8.23.0 | Acceso a PostgreSQL |
| better-auth | 1.7.6 | Registro, login (email, Google, Apple), sesiones y roles |
| jose | 6.2.12 | Firma del `client_secret` de Apple y lectura de su ID token |
| pg-boss | 12.34.0 | Tareas programadas sobre PostgreSQL (worker) |
| socket.io | 4.8.4 | Chat de la misa en vivo |
| expo-server-sdk | 7.2.0 | Envío de push por el servicio de Expo |
| @aws-sdk/client-s3, @aws-sdk/s3-request-presigner | 3.1141.0 | URLs firmadas de subida a Cloudflare R2 (API compatible con S3) |
| @sentry/node | 10.37.0 | Errores de la API y el worker |
| express-rate-limit | 8.7.0 | Límites de uso (`docs/seguridad.md`) |
| cors | 2.8.6 | Orígenes permitidos (panel y web) |
| nodemailer | 10.0.12 | Envío por SMTP del código para recuperar la contraseña (sin dependencias propias) |

Desarrollo: prisma 7.10.0 (migraciones), typescript 6.0.3, tsx 4.23.15, vitest 5.0.2 con @vitest/coverage-v8, supertest 7.3.0, socket.io-client 4.8.4 (tests del chat) y los paquetes `@types/*`.

## Panel (`apps/admin`)

| Dependencia | Versión | Para qué |
|---|---|---|
| react, react-dom | 19.2.3 | Interfaz |
| react-router | 8.4.0 | Navegación |
| @tanstack/react-query | 5.102.8 | Peticiones y caché |
| zod | 4.1.12 | Esquemas compartidos |
| @sentry/react | 10.37.0 | Errores del panel |

Desarrollo: vite 8.3.1 con @vitejs/plugin-react, typescript, vitest con jsdom y @testing-library/react. En producción lo sirve Caddy (`apps/admin/Caddyfile`).

## App móvil (`apps/mobile`)

Expo SDK 57 (expo 57.0.24) con React Native 0.86.3 y React 19.2.3.

| Dependencia | Para qué |
|---|---|
| expo-router | Navegación por ficheros (`app/`) |
| @tanstack/react-query | Peticiones, caché y modo sin conexión |
| socket.io-client | Chat de la misa |
| expo-notifications, expo-device, expo-constants | Push |
| expo-audio | Reproductor con segundo plano y pantalla de bloqueo |
| expo-apple-authentication, @react-native-google-signin/google-signin, expo-crypto | Login con Apple y Google (nonce) |
| expo-secure-store, @react-native-async-storage/async-storage | Token de sesión y preferencias locales |
| expo-network | Detección de conexión |
| expo-updates | EAS Update |
| posthog-react-native, expo-application | Analítica con consentimiento |
| @sentry/react-native | Errores de la app |
| react-native-webview | Vídeo de YouTube de la misa |
| react-native-view-shot, expo-sharing | Imagen de la vela para compartir |
| expo-image, expo-linear-gradient, react-native-svg, expo-font, @react-native-vector-icons/feather | Imágenes, degradados, llama de la vela, tipografías e iconos |
| expo-haptics | Vibración al encender la vela, votar y rezar |
| react-native-reanimated, react-native-worklets, react-native-gesture-handler, react-native-keyboard-controller, react-native-safe-area-context, react-native-screens | Animaciones, gestos, teclado y áreas seguras |
| react-native-web, react-dom, @expo/metro-runtime | Versión web (desarrollo y pruebas) |
| expo-dev-client | Builds de desarrollo con EAS |

**Sin uso en el código (candidatas a quitar):** `@gorhom/bottom-sheet`, `date-fns`, `dayjs`, `react-native-dotenv` y `expo-blur`. Vienen de la entrega. Ningún fichero de `app/` o `src/` las importa, ni las pide como dependencia `expo-router`, `expo` o `posthog-react-native`. No se han quitado aún: quitar módulos nativos cambia el build, y conviene hacerlo junto con el primer build de EAS.

Desarrollo: jest 29 con jest-expo y @testing-library/react-native, eslint con eslint-config-expo, expo-doctor y typescript.

## Compartido (`packages/shared`)

Solo zod 4.1.12: constantes de dominio (precios, duraciones, ventana de votación), esquemas de validación y el filtro de datos de Sentry.

Lint en API, panel y `packages/shared` (desarrollo): eslint 9.25.0 (la misma versión que la app), @eslint/js, typescript-eslint, globals y, en el panel, eslint-plugin-react-hooks (`docs/testing.md`).

## Raíz del monorepo

Solo prettier 3.8.1 (desarrollo): formato del código según SDD-06, con ancho de línea 160 (`.prettierrc.json`). El CI lo comprueba con `pnpm format:check`. La documentación, los JSON y el código generado quedan fuera (`.prettierignore`).

## Vulnerabilidades conocidas (`pnpm audit`)

Las versiones de dependencias indirectas con avisos de seguridad se fijan en `pnpm.overrides` del `package.json` de la raíz, dentro de la misma versión mayor que ya usaba el paquete que las pide cuando es posible. Revisión del 29-sep-2026:

| Paquete | Lo trae | Versión fijada |
|---|---|---|
| postcss | vite (build del panel) | 8.5.28 |
| undici | jsdom (tests del panel) | 6.29.0 |
| js-yaml | eslint, jest y el CLI de Expo (desarrollo) | 4.3.2 y 3.15.2 |
| deepmerge-ts | configuración de Prisma (CLI) | 8.0.2, la única versión corregida |
| mysql2 | CLI de Prisma; la API usa PostgreSQL y no lo carga | 3.24.4 |
| @opentelemetry/core | Sentry en la API (`instrumentation-http`) | 2.11.0, la misma que ya usa el resto de Sentry |

**Aviso abierto:** `decode-uri-component` 0.2.2, que llega por `expo-router` → `query-string` 7 (moderado: consumo de CPU con URLs mal formadas). La única versión corregida, 0.5.0, solo se puede importar como módulo ES y `query-string` 7 la carga con `require`, así que forzarla rompería la navegación. En la app solo recibe los enlaces que abre el propio fiel en su teléfono. Se cierra cuando `expo-router` actualice `query-string`.
