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

| Sección | Roles |
|---|---|
| Resumen (KPIs) | moderador, editor, superadmin |
| Moderación (cola, palabras) | moderador, superadmin |
| Causas (alta, avances; transferencias solo superadmin) | editor, superadmin |
| Misas | editor, superadmin |
| Usuarios y roles | superadmin |

El panel oculta lo que el rol no puede usar. La API vuelve a comprobar cada permiso.

## KPIs

`GET /api/admin/kpis?days=7|30|90`, calculados en vivo sobre PostgreSQL:

- **Fieles:** registrados y nuevos.
- **Actividad:** activos DAU, WAU y MAU. Cuenta como actividad rezar, encender una vela, publicar o rezar por una intención, escribir en el chat o votar; el staff no cuenta.
- **Retención D7 y D30:** de los fieles registrados hace entre N y N+30 días, porcentaje con actividad entre el día N y el N+7 desde su alta.
- **Velas:** conversión a vela, velas por día, por tipo y por santo.
- **Dinero:** ingresos, el 20% y transferencias, sacados del libro de movimientos. Hoy es dinero simulado.
- **Comunidad:** participación en la votación del mes, participación en la última misa (quién escribió en el chat; es un mínimo) y pendientes de moderar.
