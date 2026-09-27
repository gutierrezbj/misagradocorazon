# Tests

Cumplimiento de SDD-07 (plan de testing). Todo se ejecuta con `pnpm test` y en el CI de cada PR.

## Tests automáticos obligatorios de SDD-07

| SDD-07 | Dónde |
|---|---|
| Auth: registro, login, sesión válida o no válida | `apps/api/test/api.test.ts`, `social.test.ts`, `staff.test.ts`, `account.test.ts` |
| Velas: creación, cálculo del 20 % | `apps/api/test/api.test.ts`, `causas.test.ts` |
| Santo y oraciones del día según la fecha | `apps/api/test/api.test.ts` |
| Votación: un voto por mes, ventana de los días 1 a 7 | `apps/api/test/causas.test.ts` |
| Libro de movimientos y transparencia | `apps/api/test/causas.test.ts`, `records.test.ts` |
| Compliance Apple 3.2.2.iv en el flujo de compra | `apps/mobile/test/purchase-copy.test.mjs` |
| Permisos de cada endpoint del panel con los cuatro roles | `apps/api/test/matrix.test.ts` |
| Los endpoints públicos no devuelven ids de usuario ni datos de terceros | `apps/api/test/matrix.test.ts` |
| Moderación: palabra filtrada queda pendiente y no sale en el muro | `apps/api/test/wall.test.ts`, `misa.test.ts` |
| Cliente: el onboarding guarda el santo patrón | `apps/mobile/test/components/Onboarding.test.tsx` |
| Cliente: el formulario de la vela valida los campos obligatorios | `apps/mobile/test/components/LightCandle.test.tsx` |
| Cliente: el reproductor reproduce, pausa y activa el segundo plano | `apps/mobile/test/components/AudioPlayer.test.tsx` |

### Cómo funcionan los tests de permisos y privacidad

Los dos descubren las rutas del propio router de Express:

- **Permisos:** si aparece una ruta del panel que no está clasificada, el test falla.
- **Privacidad:** cualquier GET público nuevo entra solo en la revisión.

## Cobertura mínima (API)

`pnpm --filter @msc/api test` mide la cobertura y falla si no llega al mínimo:

- **Autenticación y pagos:** 80 %. Incluye `auth.ts`, el middleware de sesión y roles, `modules/users`, `modules/candles` y `modules/payments`.
- **Resto:** 60 %.

Quedan fuera los puntos de arranque (servidor, worker, consola), que solo conectan módulos que sí se prueban. A 26-sep-2026 la cobertura total de líneas es del 97 %.

## Tests de la app

- **`apps/mobile/test/*.test.mjs`** (`node --test`): reglas estáticas.
  - compliance del flujo de compra;
  - tamaños mínimos de texto;
  - textos siempre pasados por i18n;
  - etiquetas de accesibilidad;
  - sin referencias prohibidas.
- **`apps/mobile/test/components`** (Jest con `jest-expo` y React Native Testing Library): pantallas renderizadas con los proveedores reales de la app. La API, la autenticación y los módulos nativos (audio, almacenamiento) están simulados.

## Checklist de SDD-07 adelantada en navegador (27-sep-2026)

Dos puntos de la checklist manual se pueden probar ya en la app web con Playwright. En un teléfono real habrá que repetirlos.

- **Textos que no se cortan en pantallas pequeñas.** Probado a 375 × 667 (iPhone SE), en español e inglés, en 13 pantallas y con datos largos. Se corregía:
  - los nombres de santo en "Encender vela", que se cortaban a una línea en cualquier móvil;
  - la línea "Por quién rezo" y el santo de las velas en el altar;
  - el santo en el muro de velas;
  - el historial de intenciones del perfil, ahora completo;
  - los datos de las causas.

  Se deja a propósito la vista previa de 2 líneas de la intención en las tarjetas pequeñas del altar; el texto completo está en el perfil.
- **Sin conexión o con conexión lenta:**
  - Aparece un aviso fijo "Sin conexión" y se ve lo último que se cargó. Al volver la red, el aviso desaparece y las consultas se recargan solas.
  - Encender una vela sin red falla en el momento con "Sin conexión" y no se envía después. Se ha comprobado en la base de datos.
  - Con 3 s de retardo y triple toque en "Encender", se crea una sola vela.

## Manual (antes de cada release)

El checklist manual de SDD-07 en dispositivos reales sigue siendo obligatorio: audio en segundo plano, push, pagos en sandbox, Apple Sign-In y misa con chat. Nada de eso se puede automatizar sin builds nativos.
