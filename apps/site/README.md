# Web pública · misagradocorazon.com

Diseño «El camino de la luz», aprobado por el fundador. Fuente de verdad: `docs/web-publica.md`.

No es la app: la beta de la app vive en `app.misagradocorazon.com` (`docs/beta-web.md`).

## Qué hay

- `public/`: la web tal cual se publica. HTML, CSS y JS planos, sin dependencias ni transpilado.
  - `index.html`: portada «Noche de velas» y las seis estaciones del camino.
  - `styles.css`: tipografías autoalojadas (Instrument Serif y Cabin, licencia OFL en `fonts/`), color por estación y movimiento.
  - `main.js`: velas de la portada (canvas), raíl con el rayo, apariciones, velas encendidas, esfera del día, muro de ejemplos y formulario.
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
- **Cuenta atrás** al 10 de febrero en el cierre.
- **Barra fija** con el botón de la lista: aparece tras la portada y se va al llegar al formulario.
- **Acuarela** fundida con el fondo (`mix-blend-mode: multiply`).
- **Degradado de la V:** marrón cálido hasta el final y paso corto por caramelo a dorado claro.

Propuestos y aún sin hacer: ficha de obra de ejemplo en la IV, carrusel de velas en móvil, «toca la pantalla» en la portada móvil y pie con enlaces legales.

## Pendiente (`docs/web-publica.md`, apartado 6)

- **El formulario es maqueta:** valida el correo y la casilla, pero no guarda nada.
- **Enlace a la política de privacidad:** el texto de la casilla lleva el marcador `[ENLACE A LA POLÍTICA DE PRIVACIDAD]`.
- **Versión EN.**
