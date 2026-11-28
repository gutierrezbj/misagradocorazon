# Web pública · misagradocorazon.com

Diseño «El camino de la luz», aprobado por el fundador. Fuente de verdad: `docs/web-publica.md`.

No es la app: la beta de la app vive en `app.misagradocorazon.com` (`docs/beta-web.md`).

## Qué hay

- `public/`: la web tal cual se publica. HTML, CSS y JS planos, sin dependencias ni transpilado.
  - `index.html`: portada «Noche de velas» y las seis estaciones del camino.
  - `styles.css`: tipografías autoalojadas (Instrument Serif y Cabin, licencia OFL en `fonts/`), color por estación y movimiento.
  - `main.js`: velas de la portada (canvas), raíl con el rayo, apariciones, velas encendidas, esfera del día, muro de ejemplos y cuenta atrás.
  - `img/`: las tres imágenes de Higgsfield, bajadas del lienzo.
  - `og.jpg`: imagen para compartir (1200×630), sacada de la foto encendida.
- `build.mjs`: copia `public/` a `dist/`.
- `check.test.mjs`: comprobaciones del apartado 7 que se pueden automatizar.
- `Dockerfile` y `deploy/`: contenedor nginx alpine, compose de producción y vhost del host.

## Uso

```bash
pnpm --filter @msc/site build
```

```bash
pnpm --filter @msc/site preview
```

Abre `http://localhost:4270`.

```bash
pnpm --filter @msc/site test
```

## Cambios respecto al lienzo

- **Tamaños mínimos:** las etiquetas de 12 y 13 px pasan a 14 px, como pide `CLAUDE.md` (hay usuarios mayores).
- **Contraste AA:** en «Rezo por ti» el texto de entrada pasa a claro y el degradado se oscurece hasta pasar la cabecera. Medido en reposo en los 6 anchos.
- **Portada en móvil vertical:** el titular baja para no tapar el corazón.
- **Tu día:** se añade la línea «Horas de ejemplo: en la app las eliges tú.».
- **Menú de la portada:** los enlaces son reales y llevan a su estación. Se ocultan por debajo de 1100 px.
- **Tarjetas de vela en móvil:** mantienen el 4:5 con un ancho máximo de 420 px.

## Revisión de diseño del 26-nov-2026 (aprobada por el fundador)

- **Velas:** una foto propia por vela (Higgsfield), con su pareja apagada/encendida. Se encienden una tras otra, desde la llama, al llegar a la sección.
- **Pantallas reales de la app** en I (altar y vela encendida) y III (misa con cuenta atrás y chat). Son capturas de la app actual, sacadas en local, con el rótulo «La app, tal como es hoy». Hay que cambiarlas cuando la app cambie.
- **V · Rezamos contigo:** sustituye las seis tarjetas por una petición de ejemplo (Celeste) que se llena de luces al llegar, más los tres pasos y un aviso de ejemplo. Función aprobada en `docs/propuesta-cambios-sdd.md`.
- **Cuenta atrás** al lanzamiento en las tiendas (10 de febrero) en el cierre.
- **Barra fija** con «Regístrate gratis»: aparece tras la portada y se va al llegar al cierre.
- **Registro en la beta (28-nov-2026):** los tres botones (portada, barra y cierre) llevan a `app.misagradocorazon.com/registro`. No hay formulario ni lista de espera: los correos se recogen en la app, con la casilla de novedades (US-35).
- **Acuarela** fundida con el fondo (`mix-blend-mode: multiply`).
- **Degradado de la V:** marrón cálido hasta el final y paso corto por caramelo a dorado claro.

- **IV · Votación de ejemplo:** tres obras genéricas con barras que crecen al llegar, marcadas como ejemplo, junto al ciclo del mes.
- **Velas en móvil:** carrusel horizontal que se desliza con el dedo, con la pista «Desliza para ver las tres velas».
- **Portada en pantallas táctiles:** «toca la pantalla» en lugar de «pasa la mano».

- **Pie:** enlace a Instagram (@misagradocorazon.app), también en el `sameAs` de schema.org.

- **Páginas legales:** `/aviso-legal/` y `/privacidad/`, con el fundador como titular mientras no exista la sociedad, y `hola@misagradocorazon.com` como contacto. Enlazadas desde el pie. La privacidad de la web remite a la de la app para el registro.

El buzón `hola@misagradocorazon.com` ya existe (28-nov-2026).

## Pendiente (`docs/web-publica.md`, apartado 6)

- **Versión EN.**
