# Web misagradocorazon.com

Estado a 25-nov-2026. Diseño aprobado por el fundador: «El camino de la luz» (instrucciones al constructor del 24-nov-2026). Si algo de aquí choca con SDD-02, manda SDD-02 en el alcance del producto; en diseño y despliegue de la web, manda este documento.

El código está en `apps/site` (`apps/site/README.md`).

## 1. Qué es y para qué

- Web pública en **misagradocorazon.com**. No es la app: la beta de la app vive en `app.misagradocorazon.com`.
- **Objetivo:** captar la lista de espera para el lanzamiento del **Miércoles de Ceniza, 10-feb-2027**. Arranque fuerte en enero.
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
- Formulario: correo, casilla de consentimiento obligatoria y botón «Quiero estar el 10 de febrero».
- A la derecha, la acuarela del corazón.
- Pie: «Mi Sagrado Corazón · En español y en inglés · San Miguel Arcángel, defiéndenos en la batalla».

## 6. Lo que falta por decidir o conectar

1. **Lista de espera:** elegir dónde se guardan los correos (propuesta: tabla propia en la API de MSC o un servicio de email marketing con doble opt-in). Hoy el formulario es maqueta.
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

Según el Cuaderno de Infraestructura JRGB (Notion), que tiene las IPs y los accesos. Todo se lanza desde el Mac del fundador, donde están las claves SSH. Las IPs no se escriben en el repo.

**Revisión:** KVM 1, `https://msc.rev.jrgblanco.com`, con clave y oculta a buscadores.

```bash
pnpm --filter @msc/site build
```

```bash
ssh root@<KVM1> rev-nueva msc
```

```bash
rsync -rt --delete --rsync-path=rev-rsync apps/site/dist/ root@<KVM1>:/srv/rev/msc/
```

**Producción (enero):** KVM 4, desplazamiento **270 reservado**: la web queda en `127.0.0.1:3270`. Mismo patrón que `jrgb-web`: contenedor nginx alpine con la web estática.

1. Comprobar que el bloque está libre (sin salida):
   `ssh root@<KVM4> 'ss -tlnH | grep -E ":[3-6]27[0-9] "; grep -rhoE "127.0.0.1:[3-6]27[0-9]" /etc/nginx/sites-enabled/'`
2. Código en `/opt/apps/msc-web` y `docker compose -f apps/site/deploy/compose.yml up -d --build`. El compose ya lleva `container_name: msc-web`, `restart: unless-stopped`, el puerto `127.0.0.1:3270:80` y las etiquetas `jrgb.*`.
3. DNS en hPanel (cuenta personal): A `@` y `www` → KVM 4, TTL 300.
4. vhost del host: `apps/site/deploy/nginx-host.conf` → `nginx -t && systemctl reload nginx`.
5. `certbot --nginx -d misagradocorazon.com -d www.misagradocorazon.com` (elegir redirigir).
6. Alta en vigilancia (healthcheck y SA99) y línea en el historial del cuaderno.

> **Aviso:** la beta de la app vive hoy en el Servidor 2 (`/opt/apps/misagradocorazon`), que caduca el 12-feb-2027, dos días después del lanzamiento. Hay que moverla al KVM 4 antes, con la receta «Mover un proyecto de un servidor a otro».
>
> **Choque de nombres:** la beta de la app ya usa un contenedor llamado `msc-web` (`docs/beta-web.md`). Si las dos acaban en el KVM 4, una tiene que cambiar de nombre.
