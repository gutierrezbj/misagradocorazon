# Qué está simulado y qué queda pendiente

Requisito de entrega 7. Estado a 28-sep-2026. El código del MVP (los tres pilares, el panel, el borrado de cuenta, la analítica y la monitorización) está hecho y probado con tests. Lo que queda depende sobre todo de cuentas a nombre del fundador, de contenido que prepara el equipo y de probar en teléfonos reales.

## Simulado

| Qué | Cómo funciona hoy | Cuándo se hace real |
|---|---|---|
| **Pagos de la vela** | La capa de pagos (`apps/api/src/modules/payments/provider.ts`) confirma sin cobrar y deja una referencia `sim_…` en el libro de movimientos. El libro, el 20 % y la transparencia funcionan igual que con dinero real | Cuando exista la sociedad: compras dentro de la app con RevenueCat (SDD-04, ADR-003). Solo cambia el proveedor de la capa de pagos |
| **Cifras del panel y de transparencia** | Salen del libro, pero con compras simuladas | Con los pagos reales |

## Pendiente de cuentas del fundador

Detalle de cada una en `docs/dependencias.md`.

| Cuenta | Qué desbloquea | Pasos |
|---|---|---|
| Expo / EAS | Primer build de iOS y Android, push y EAS Update | `docs/despliegue.md`, `docs/push.md` |
| Apple Developer | App Store, Sign in with Apple, clave para revocar tokens al borrar la cuenta, push en iOS | `docs/login-social.md` |
| Google Play y Google Cloud | Play Store y login con Google | `docs/login-social.md` |
| Firebase | Push en Android | `docs/push.md` |
| Railway | API, worker, panel y base de datos en producción; activar backups antes del lanzamiento | `docs/despliegue.md`, `docs/monitorizacion.md` |
| Cloudflare R2 | Subir imágenes y audio desde el panel | `docs/contenido.md` |
| PostHog | Analítica de producto | `docs/kpis.md` |
| Sentry | Errores en producción (activar "Prevent Storing of IP Addresses") | `docs/monitorizacion.md` |
| Dominio | Enlace directo de la vela compartida (US-22), API y panel | `docs/testing.md` |

## Pendiente de probar en teléfonos reales

Necesita el primer build de EAS. Es el checklist manual de SDD-07 (`docs/testing.md`):

- push (recordatorios, santo del día, vela apagada, causa ganadora, avisos del equipo);
- audio en segundo plano y en la pantalla de bloqueo;
- mini-player: en iOS 26 va en el hueco nativo sobre las pestañas (`NativeTabs.BottomAccessory`), que no se puede probar en web (`docs/audio.md`);
- Sign in with Apple, incluida la revocación al borrar la cuenta;
- login con Google;
- pagos en sandbox, cuando se integre RevenueCat;
- misa con chat.

## Pendiente de código

| Qué | Por qué no está | Referencia |
|---|---|---|
| Borrar la persona en PostHog al borrar la cuenta | Hay que verificar la API de borrado de PostHog con la cuenta creada. Hoy el móvil deja de enviar y olvida la identidad local | `docs/borrado-cuenta.md` |
| Compras con RevenueCat | Espera a la sociedad | SDD-04, ADR-003 |
| Enlace directo al compartir la vela (US-22) | Necesita el dominio y las fichas de las tiendas | `docs/testing.md` |
| Quitar dependencias sin uso de la app | Cambia el build nativo; mejor con el primer build de EAS | `docs/dependencias.md` |

## Pendiente de contenido y legal

- **Audio:** lo graba el equipo (nunca con IA) y se sube desde el panel (`docs/audio.md`).
- **Contenido diario:** evangelio y meditación de cada día, preparados en el panel (`docs/contenido.md`).
- **Causas creadas antes de la ficha completa:** no tienen "qué se hará con el dinero" y su presupuesto es una partida única. El panel lo marca; hay que completarlas antes de que entren en votación (`docs/contenido.md`).
- **Oraciones por tiempo litúrgico:** al menos las de tiempo ordinario y las del próximo tiempo fuerte (Adviento empieza el 29-nov-2026), con su audio. Sin ellas, los días sin oración propia se quedan sin oración (`docs/contenido.md`).
- **Imágenes de los santos:** las del catálogo inicial enlazan a Wikimedia y Pexels con licencias sin verificar. Hay que sustituirlas por ficheros propios en R2 antes de publicar (`docs/fuentes-imagenes.md`).
- **Aviso de privacidad y fichas de privacidad de las tiendas:** tienen que incluir la analítica (`docs/kpis.md`). Recomendación: explicar también cómo se tratan las intenciones, que son datos de creencias religiosas (GDPR art. 9).
- **Sociedad:** necesaria para cobrar de verdad y para las cuentas a su nombre.

## Decisiones pendientes del fundador

| Qué | Situación | Recomendación |
|---|---|---|
| **Recuperación de contraseña** | No está en ningún SDD. La auditoría de la entrega señala que falta | Añadirla a SDD-05 (Épica 1) y elegir un proveedor de email a nombre del fundador |
| **Decisiones de SDD-08** (Sentry, EAS Update, backups) | Hechas en el código y documentadas en `docs/monitorizacion.md` y `docs/despliegue.md` | Registrarlas en Notion (Claude no edita Notion sin visto bueno) |
| **Etiqueta del tiempo litúrgico** en la pantalla de oración (US-10) | Texto pequeño ("Tiempo ordinario"), sin cambio de tema. SDD-02 deja para v1.1 un "calendario litúrgico visual" | Mantenerla: es parte de US-10, no el calendario visual |
| **Mensajes de commit** | SDD-06 los pide en inglés. Hasta el 28-sep-2026 se escribieron en español; desde el PR #36, en inglés | Sin acción |

Resuelto el 28-sep-2026: el estado global de la app sigue con Context de React (no Zustand) y los módulos de la API sin capa de controllers. SDD-06 actualizado en Notion con visto bueno del fundador (`docs/propuesta-cambios-sdd.md`).

## Fuera del MVP

- **Muro de testimonios:** fuera hasta v3. No se implementa ni se deja preparado (CLAUDE.md).
