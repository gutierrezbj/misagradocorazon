# Web misagradocorazon.com

Estado a 25-nov-2026. Diseño aprobado por el fundador: «El camino de la luz» (instrucciones al constructor del 24-nov-2026). Si algo de aquí choca con SDD-02, manda SDD-02 en el alcance del producto; en diseño y despliegue de la web, manda este documento.

El código está en `apps/site` (`apps/site/README.md`).

## 1. Qué es y para qué

- Web pública en **misagradocorazon.com**. No es la app: la beta de la app vive en `app.misagradocorazon.com`.
- **Objetivo:** desde el 1-dic-2026, llevar a la gente a registrarse gratis en la beta de la app y ayudarnos a probarla, camino del lanzamiento en las tiendas del **Miércoles de Ceniza, 10-feb-2027** (cambio del fundador del 28-nov-2026).
- **Es el único sitio donde se puede contar el 20 % y las causas.** Apple 3.2.2.iv prohíbe mencionarlo en el flujo de compra de la app.
- Página única, larga, bilingüe ES/EN: fase 1 en ES; EN antes del lanzamiento.

## 2. Fuente del diseño

- **Lienzo:** https://claude.ai/artifact/HLBK2sAzKfsK1XimUaRiNC
  - tablero «MSC · El camino de la luz (página completa)» (`Camino.dc.html`);
  - portada: tablero «B · Noche de velas» (`Noche.dc.html`).
- Portado a HTML/CSS/JS plano en `apps/site/public`.
- **Imágenes** (generadas con Higgsfield, son nuestras), bajadas del lienzo a `apps/site/public/img`:
  - `corazon_velas_apagado.webp` y `corazon_velas_encendido.webp`: portada. Son una pareja alineada al píxel (1344×752): no recortar ni reescalar una sin la otra.
  - `corazon_acuarela.webp`: cierre (752×1344).
  - Los PNG originales están en el Mac del fundador (`~/Downloads/MSC/`).
- **No usar** la imagen de Pinterest del Sagrado Corazón (pin 551479916892220262): autor desconocido y se vende como lámina. Solo fue referencia de estilo.

## 3. Sistema visual

La web no hereda el Identity Sprint, la paleta ni el design system antiguos de MSC. Es una pieza propia.

**Tipografía**, autoalojada en woff2:
- Display: Instrument Serif 400, mayúsculas, letter-spacing −4 %, line-height 0,95.
- Texto e interfaz: Cabin 400/500/600. Etiquetas en mayúsculas con +0,12–0,14 em.
- Mínimos de `CLAUDE.md`: 16 px en texto de lectura y 14 px en el resto.

**Color por estación.** Cada sección hace degradado desde el color de la anterior.

| Tramo | Fondo | Texto |
| --- | --- | --- |
| Portada | #07080B | #FFF4E2 |
| I La vela | #0F0B08 | #FFF4E2 |
| II Tu día | #1F150D | #FFF1E0 |
| III La misa | #3B2616 | #FFF0DC |
| IV Las obras | #6E4622 | #FFF6EA |
| V Rezo por ti | #E8D2AE | #2A1A0E |
| VI Cierre | #FAF8F4 | #2A1A0E |

Acento de luz: #FFC56B. El rayo y los puntos encendidos van de #FFD27A a #FFB347.

**Movimiento** (valores medidos de las plantillas Grigoletto 23 y 24):
- **Titular de portada, letra a letra:**
  - cada letra sube 35 px y aparece en 0,4 s;
  - curva `cubic-bezier(.68,-.6,.32,1.6)`;
  - 39 ms entre letras; empieza a 0,8 s.
- **Menú:** baja desde −110 px en 1,25 s, `cubic-bezier(.7,0,.3,1)`.
- **Aparición de bloques** al entrar en pantalla: 1,25 s, `cubic-bezier(.16,1,.3,1)`, escalonado 120 ms.
- **`prefers-reduced-motion`:** se quitan los desplazamientos y se quedan los fundidos; la luz de las velas no crece.

## 4. La portada

- Proporción 16:9, mínimo 640 px de alto. **Prohibidas las unidades vh:** en el lienzo deformaban la portada y en móvil cambian al hacer scroll.
- **Dos imágenes en un `<canvas>`:** de fondo la apagada, con `object-fit: cover` calculado a mano; encima la encendida, recortada por una máscara.
- **Velas que se encienden:**
  - al mover el puntero se enciende la celda de una rejilla (paso = máx(64 px, ancho/15));
  - cada luz entra en 0,2 s, crece 1 s, se mantiene 3 s y se apaga en 1 s (vida total 4,2 s; rastro tomado de Grigoletto 24);
  - la máscara es un gradiente radial por celda, de radio ≈ 1,5 × paso.
- **El corazón despierta:** en la máscara se añade un gradiente radial.
  - Centro en (50,5 % del ancho, 30 % del alto de la imagen); radio, 34 % del alto.
  - Opacidad = mín(1, velas encendidas / 60), suavizada (0,03 por fotograma).
  - Respiración de ±10 % cada ~5,6 s.
- **Contador** grande abajo a la izquierda: «NN velas encendidas por ti».
- **Móvil:** el dedo también enciende (pointermove), sin bloquear el scroll vertical (`touch-action: pan-y`).

## 5. El camino

- **Raíl** vertical a la izquierda (2 px), con un rayo dorado que crece con el scroll desde el final de la portada hasta el final de la página.
- **Seis estaciones** con número romano en el raíl. El punto se enciende (dorado con halo) cuando su sección entra en pantalla (IntersectionObserver, umbral 0,25).

**I · La vela.** «Una vela por tu intención».
- Botón «Encender las velas»: cambia las tres tarjetas de la foto apagada a la encendida.
- Tarjetas: Básica, 24 horas, 0,99 USD · Solemne, 72 horas, 1,99 USD · Permanente, 7 días, 2,99 USD.

**II · Tu día.** «Te acompaña de la mañana a la noche».
- Lista de cuatro momentos y una esfera de reloj SVG cuya aguja gira (1,25 s) al momento elegido.
- 07:00 Oración de la mañana · 09:00 El santo del día · 13:00 El evangelio · 21:00 Oración de la noche.
- Las horas son ilustrativas: en la app las elige el fiel.

**III · La misa.** «Cada domingo, misa en directo». Tres columnas:
- sin salir de la app (cuenta atrás);
- con la comunidad (chat moderado y velas de la semana);
- grabación al terminar.

**IV · Las obras.** «20 %» gigante y el texto «de lo que se recauda cada mes va a la obra que vote la comunidad. Fijo, público y calculado desde el libro de movimientos».
- Ciclo: del 1 al 7, votación (3–4 obras con ficha); el 8 se anuncia la ganadora; mes a mes, transferencias y fotos del avance.

**V · Rezo por ti.** «Nadie reza solo».
- Seis tarjetas de intenciones **marcadas como Ejemplo**. Al pulsar, se tachan y suman +1.
- Nota obligatoria: «Ejemplos de intenciones. En la app, tus intenciones son privadas salvo que decidas compartirlas.»
- **Nunca** publicar intenciones reales sin consentimiento expreso: son datos de creencias (RGPD art. 9).

**VI · Cierre.** «Empezamos el camino juntos».
- Desde el 28-nov-2026: sin formulario. Texto «La app ya está abierta…» y botón «Regístrate gratis y ayúdanos a probar la app», que lleva a `app.misagradocorazon.com/registro`. Los correos se recogen en el registro de la app, con la casilla de novedades (US-35, `docs/propuesta-cambios-sdd.md`).
- A la derecha, la acuarela del corazón.
- Pie: «Mi Sagrado Corazón · En español y en inglés · San Miguel Arcángel, defiéndenos en la batalla».

## 6. Lo que falta por decidir o conectar

1. ~~**Lista de espera.**~~ Resuelto el 28-nov-2026: no hay lista de espera. La web lleva al registro de la app y allí se pide permiso para escribir (US-35).
2. **Política de privacidad y aviso legal:** responsable (la sociedad de EEUU aún no existe: decidir quién figura), finalidad y baja. Enlazarlos desde la casilla y el pie.
3. **Precios:** el cobro real depende de constituir la sociedad. Si el 10-feb las velas siguen gratis (modo beta), cambiar el texto de la sección I y el de la portada.
4. **Revisión iconográfica** de las tres imágenes por alguien de confianza (atributos del Sagrado Corazón).
5. **Versión EN.**

## 7. Calidad antes de publicar

Estado a 25-nov-2026.

| Requisito | Estado |
| --- | --- |
| 6 anchos (390, 768, 1024, 1280, 1440, 1366×768) sin desbordes ni solapes | Hecho, con Playwright en Chromium |
| Contraste AA en cada sección, en reposo | Hecho: texto contra el color real del degradado en su posición |
| Un solo h1, `lang="es"`, `alt`/`aria-label`, botones reales, teclado | Hecho (`check.test.mjs`). El encendido de velas de la portada es decorativo y solo responde a puntero y dedo |
| Título < 60, descripción < 155, imagen de 1200×630 | Hecho. **Falta comprobar la vista previa en WhatsApp** con el dominio real |
| `schema.org` (Organization + WebSite) | Hecho |
| Imágenes en webp y carga con red 4G | Hecho: ~230 KB en la primera carga; ~0,9 s hasta `load` en 4G simulado (Chromium) |
| Tipografías autoalojadas, sin cookies de terceros | Hecho. Sin analítica: si se añade, banner de consentimiento |

Falta probar en Safari de iPhone y en Firefox.

## 8. Despliegue

Decisión del fundador del 28-nov-2026: la web sale el 1-dic con la beta, en el **KVM 1**, junto a ella (`deploy/staging/README.md`). Las IPs y los accesos están en el cuaderno de infraestructura, fuera del repo. Todo se lanza desde el Mac del fundador y con su sí.

- **Imagen:** la construye GitHub Actions en cada push a `main` (`.github/workflows/staging-images.yml`) y la sube a GHCR como `misagradocorazon-site`, con el SHA completo del commit como etiqueta. En el servidor no se construye nada.
- **Contenedor:** `msc-web`, proyecto `msc-web`, carpeta `/opt/apps/msc-web`, puerto `127.0.0.1:3270` (bloque 270; la beta usa 3271, 4270, 5270 y 6270).

1. Comprobar que el 3270 está libre (sin salida):
   ```bash
   ssh root@<KVM 1> 'ss -tlnH | grep -E ":3270 "'
   ```
2. Imagen del SHA, igual que en la beta (si da «denied», se para y se pregunta al fundador):
   ```bash
   SHA=<sha de 40 caracteres>
   docker pull ghcr.io/gutierrezbj/misagradocorazon-site:$SHA
   ```
3. Fichero del mismo SHA:
   ```bash
   git archive "$SHA" apps/site/deploy/compose.yml | tar -x
   ssh root@<KVM 1> 'install -d /opt/apps/msc-web'
   rsync apps/site/deploy/compose.yml root@<KVM 1>:/opt/apps/msc-web/
   ```
4. Arranque:
   ```bash
   ssh root@<KVM 1> 'cd /opt/apps/msc-web && IMAGE_TAG='"$SHA"' docker compose -p msc-web -f compose.yml up -d && curl -fsS -o /dev/null 127.0.0.1:3270/'
   ```
5. DNS en hPanel: A `@` y `www` → KVM 1, TTL 300.
6. vhost del servidor: `apps/site/deploy/nginx-host.conf` → `nginx -t && systemctl reload nginx`.
7. `certbot --nginx -d misagradocorazon.com -d www.misagradocorazon.com` (elegir redirigir).
8. Comprobar la vista previa en WhatsApp con el dominio real y que «Regístrate gratis» abre `app.misagradocorazon.com/registro`.
9. Alta en vigilancia y línea en el historial del cuaderno.

Para actualizar: pasos 2 a 4 con el SHA nuevo.
