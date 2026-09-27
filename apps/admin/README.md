# @msc/admin

Panel de gestión web de Mi Sagrado Corazón: React 19, Vite, TanStack Query y React Router. No usa librerías de UI: los estilos parten de los tokens de la app (`apps/mobile/src/theme.ts`).

## Uso

```bash
pnpm --filter @msc/api dev       # API en :8001
pnpm --filter @msc/admin dev     # panel en http://localhost:5173 (proxy /api → :8001)
pnpm --filter @msc/admin build   # producción en apps/admin/dist
```

- En producción, `VITE_API_URL` apunta a la API (por ejemplo `https://api.misagradocorazon.com`). El dominio del panel tiene que figurar en `TRUSTED_ORIGINS` de la API.
- La sesión es un token Bearer en `sessionStorage`: se pierde al cerrar la pestaña.

## Secciones y roles

| Sección | Ruta | Roles |
|---|---|---|
| Resumen (KPIs) | `/` | moderador, editor, superadmin |
| Moderación (cola, palabras) | `/moderacion` | moderador, superadmin |
| Contenido diario | `/contenido` | editor, superadmin |
| Santoral | `/santoral` | editor, superadmin |
| Causas (alta, avances; transferencias solo superadmin) | `/causas` | editor, superadmin |
| Misas | `/misas` | editor, superadmin |
| Notificaciones (avisos del equipo) | `/notificaciones` | editor, superadmin |
| Transparencia (resumen y libro de movimientos) | `/transparencia` | moderador, editor, superadmin |
| Usuarios y roles | `/usuarios` | superadmin |
| Registro de cambios | `/registro` | superadmin |

El panel oculta lo que el rol no puede usar. La API vuelve a comprobar cada permiso (`apps/api/test/matrix.test.ts`).

Qué mide cada KPI y de dónde sale: `docs/kpis.md`. Contenido y subida de ficheros: `docs/contenido.md`.
