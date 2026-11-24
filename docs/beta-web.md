# Beta web instalable (PWA)

SDD-05 US-27, US-28 y US-29; ADR-016. Aprobado por el fundador el 23-nov-2026 (`docs/propuesta-cambios-sdd.md`). En `app.misagradocorazon.com`, abierta a cualquiera. Calendario (decisión del 24-nov-2026): en diciembre de 2026 se usa en privado con un grupo de confianza, sin campaña; el lanzamiento público es el Miércoles de Ceniza, 10-feb-2027 (`docs/campana-lanzamiento.md`).

## Qué es

La misma app de `apps/mobile`, exportada para navegador (`expo export --platform web`). No hay una web aparte: mismas pantallas, mismos textos ES/EN y misma API.

- **Instalable:**
  - manifiesto (`public/manifest.webmanifest`) e iconos;
  - service worker (`public/sw.js`): guarda en caché los ficheros con hash del build y la página para abrirla sin conexión;
  - nunca guarda nada de la API, que va en otro dominio, ni datos personales.
- **Aviso para instalar** en el altar (`src/pwa.tsx`):
  - en Chrome y Android, el botón "Instalar la app" abre el aviso del navegador;
  - en iPhone, explica cómo añadirla desde Compartir;
  - no sale si ya está instalada o si el fiel lo cerró.
- **Vela gratis:** con `PAYMENTS_MODE=beta_free` en la API, la vela no cuesta nada y no entra nada en el libro. La transparencia dice que aún no hay recaudación (`docs/kpis.md`).
- **Acceso:** en la web solo email y contraseña. Google y Apple van con sus SDK nativos en la app de las tiendas (`src/social/index.web.ts`).
- **Fuera de la beta web:** push en el navegador. Lo cubre la app nativa.

## KPIs

- `pwa_installed` en PostHog cuando el navegador confirma la instalación.
- Todos los eventos llevan `platform` (`web`, `ios`, `android`), para comparar la beta web con la app nativa.
- Las velas de la beta cuentan en el panel, pero no como ingresos.

## Despliegue

- **Imagen:** `apps/mobile/Dockerfile.web`, servida por Caddy (`apps/mobile/Caddyfile.web`).
  - CSP sin scripts en línea; la API y su WebSocket (chat de misa) como únicos orígenes externos, además de PostHog, Sentry y YouTube.
  - Caché larga para los ficheros con hash; la página, el manifiesto y el service worker se revalidan siempre.
- **Dónde se construye:** el CI la construye en cada PR, y en cada push a `main` se sube a GHCR como `misagradocorazon-web` (`.github/workflows/staging-images.yml`).
- **Dónde corre:** en el VPS, servicio `web` en `127.0.0.1:5270`, con su vhost de nginx (`deploy/staging/README.md`).
- **Configuración de la API:**
  - `APP_DOMAIN` entra en `TRUSTED_ORIGINS`;
  - `PAYMENTS_MODE=beta_free` (`deploy/staging/.env.example`).

## Antes de abrir la beta a fieles reales

Con la beta abierta, el VPS deja de ser "staging": guarda cuentas e intenciones, que son datos de creencias religiosas (GDPR art. 9).

1. **Base de datos limpia:** sin las velas y compras simuladas de las pruebas.
2. **`INTENTIONS_KEY` nueva**, generada para la beta y guardada fuera del VPS, en el gestor de contraseñas del fundador. La anterior estuvo escrita en Notion.
3. **Copias de seguridad diarias de PostgreSQL fuera del VPS**, por ejemplo `pg_dump` cifrado a un bucket de R2, con al menos 7 días de retención (SDD-08). Hace falta la cuenta de Cloudflare.
4. **Aviso de privacidad publicado y enlazado en la app:** cuenta, intenciones cifradas y analítica con consentimiento.
5. **DNS y HTTPS** de `app.misagradocorazon.com` (`deploy/staging/README.md`).
6. **Recomendado:** SMTP (recuperar contraseña), R2 (imágenes y audio propios), PostHog y Sentry.

## Marca

El icono, el favicon y la pantalla de arranque eran los del constructor (Emergent). Desde el 23-nov-2026 llevan una marca **provisional** de Mi Sagrado Corazón: corazón con llama y cruz, en rojo, dorado y altar oscuro, la iconografía que fija Notion. Se sustituye por el logo definitivo cuando exista.

## Probado (23-nov-2026)

- **Chromium:**
  - la página es instalable, sin errores de instalabilidad ni de manifiesto;
  - el service worker queda activo y guarda la página, el manifiesto, los iconos y las fuentes.
- **Contenedor `msc-web` contra la API local en modo beta:**
  - entrar, onboarding, vela gratis ("Gratis durante la beta", sin precios), transparencia de la beta y misa;
  - sin bloqueos de la CSP;
  - las fotos de los santos no cargan en este entorno porque el proxy bloquea Wikimedia; no es de esta PR.
- **iPhone simulado:** sale el aviso con los pasos de Safari y, al cerrarlo, no vuelve.
- **Pendiente en dispositivos reales:** instalar en un iPhone y un Android y recorrer los tres pilares (SDD-07).
