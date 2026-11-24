# Campaña de lanzamiento: beta web con la novena guadalupana

Borrador del 24-nov-2026, pendiente del visto bueno del fundador. No hay presupuesto ni cuentas de redes registradas en el repo ni en Notion; donde falta un dato se marca **[pendiente]**.

## Objetivo

Que los fieles prueben la beta web (`app.misagradocorazon.com`) durante la novena guadalupana (1–12 dic 2026) y vuelvan cada día.

| Meta de la campaña | Cómo se mide |
|---|---|
| Cuentas creadas en la beta | Usuarios nuevos en el panel (KPIs de negocio) |
| Instalaciones de la PWA | `pwa_installed` en PostHog |
| Hábito diario durante los 12 días | Retención D7 en PostHog; `prayer_completed` por día |
| Velas encendidas | `candle_lit` con `beta_free` |

Cifras objetivo: **[pendiente]**. Referencia en `docs/kpis.md`: meta de los meses 1-3, 400 velas al mes y D7 del 30 %.

## Bloqueos antes de difundir nada

La campaña no sale hasta que la beta cumpla "Antes de abrir la beta a fieles reales" (`docs/beta-web.md`):

1. Base de datos limpia.
2. `INTENTIONS_KEY` nueva.
3. Copias de seguridad fuera del VPS.
4. Aviso de privacidad publicado.
5. DNS y HTTPS de `app.misagradocorazon.com`.

Además:

- Probar la PWA en un iPhone y un Android reales (pendiente según `docs/beta-web.md`).
- El logo es provisional. Se puede lanzar con él; las piezas se rehacen cuando exista el definitivo.

## Reglas del mensaje (no negociables)

- **Nada de recaudación durante la beta.** Las velas son gratis y no entran en el libro. No se dice "tu vela ayuda a…" ni se da a entender que el 20 % ya funciona. Sí se puede contar el proyecto: "cuando abramos las tiendas, el 20 % irá a causas que votará la comunidad".
- **Apple 3.2.2.iv:** el 20 % y las causas nunca aparecen en el flujo de compra de la vela. La campaña vive fuera de la app, así que se puede contar ahí, pero ninguna pieza puede mostrar la pantalla de la vela junto a un mensaje de causas o donaciones.
- **Intenciones (GDPR art. 9):** ninguna intención real de un usuario aparece en una pieza, ni anonimizada. Las capturas se hacen con cuentas de prueba y textos inventados.
- **Testimonios:** fuera hasta v3, tampoco en la campaña.
- **Audio:** si una pieza usa audio de la app generado con IA, lleva "Voz generada con IA".
- **Bilingüe:** cada pieza en ES y EN. Prioridad ES; EN para el público hispano de EE. UU.
- **Tono:** el de la app. Devocional, cálido, sobrio. Nada kitsch ni de "app de moda".

## Mensaje central

> Reza la novena a la Virgen de Guadalupe cada día, con el santo del día, oración de mañana y noche, y una vela por tus intenciones. Gratis y sin descargar nada.

Tres ángulos que se reparten por día:

1. **Hábito:** "9 días, 5 minutos al día" (oraciones de mañana y noche con audio).
2. **Comunidad:** "reza con otros" (misa en vivo y chat; intenciones por las que reza la comunidad).
3. **Gesto:** "enciende una vela por los tuyos" (vela gratis en la beta, también por difuntos).

## Canales

Por orden de prioridad para 7 días de preparación sin presupuesto confirmado:

1. **Parroquias, grupos y movimientos** (orgánico, el de mayor retorno en este público). Mensaje de WhatsApp listo para reenviar, cartel con QR para el tablón y nota corta para el boletín parroquial. Contactos: la red del fundador **[pendiente: lista]**.
2. **Redes propias.** Instagram, Facebook y TikTok: una pieza diaria del 1 al 12. Las cuentas a nombre del fundador **[pendiente: confirmar que existen]**.
3. **Creadores católicos** (sacerdotes, religiosas y laicos con audiencia). Un contacto personal antes del 28-nov con acceso anticipado. Sin pago salvo decisión tuya.
4. **Prensa católica.** Nota de prensa ES/EN el 1-dic. Medios a contactar (verificar contacto de cada uno): Aleteia, ACI Prensa, Catholic News Agency, Religión Digital, más los medios diocesanos de México y EE. UU.
5. **Anuncios pagados** (Meta). Solo si das presupuesto **[pendiente]**. Público: hispanohablantes católicos en México, EE. UU. y España. Se activan el 30-nov.

## Calendario

| Fecha | Acción |
|---|---|
| 24–27 nov | Cerrar bloqueos de la beta. Piezas base: vídeo de 30 s, carrusel de 3 pilares, cartel con QR, mensaje de WhatsApp, nota de prensa. |
| 28 nov | Acceso anticipado a creadores y párrocos de confianza. Recoger fallos. |
| 30 nov | Anuncio en redes: "mañana empieza la novena". Activar anuncios si hay presupuesto. |
| **1 dic** | Apertura. Nota de prensa. Envío a parroquias y grupos. |
| 2–11 dic | Una pieza diaria: el día de la novena, el santo del día y un ángulo (hábito, comunidad, gesto). Seguimiento diario de KPIs. |
| **12 dic** | Fiesta de Guadalupe. Pieza principal y misa en vivo destacada. |
| 13–19 dic | Mantener el hábito: invitar a seguir con el ritual diario y a instalar la app. Informe de resultados. |

## Medición de canales (hueco actual)

Hoy la app no registra de dónde llega cada usuario: no hay UTM y PostHog solo captura rutas genéricas, siempre con consentimiento. Para saber qué canal funciona sin tocar código:

- un enlace corto distinto por canal (parroquias, cada red, cada creador, prensa), con contador de clics del acortador;
- una pregunta opcional "¿Cómo nos conociste?" queda para un SDD posterior; no se añade sin aprobarlo.

## Pendiente de tu decisión

1. Presupuesto de anuncios, aunque sea cero.
2. Cuentas de redes existentes y quién publica cada día.
3. Lista de parroquias, grupos y creadores a contactar.
4. Cifras objetivo de la campaña.
5. Portavoz para la prensa.
