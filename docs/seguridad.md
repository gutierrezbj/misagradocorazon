# Seguridad de la API

Revisión antes de publicar (26-sep-2026). Resume qué protege a la API y qué hay que comprobar en el primer despliegue.

## Límites de uso

| Dónde | Límite | Contado por |
|---|---|---|
| Login, registro, cambio de contraseña o email (Better Auth) | 3 cada 10 s | IP |
| Resto de `/api/auth` (Better Auth) | 100 cada 10 s | IP |
| Toda la API | 300 por minuto | Usuario con sesión; IP si no hay sesión |
| Escrituras: velas, votos, intenciones, perfil, contenido… | 30 por minuto | Usuario con sesión; IP si no hay sesión |
| Intenciones del muro | 1 cada 30 s | Usuario |
| Chat de misa | 1 mensaje cada 3 s | Usuario |

- **Healthcheck:** no cuenta para los límites.
- **Límites de Better Auth:** solo están activos en producción (`NODE_ENV=production`, que ya fija la imagen Docker).
- **Por qué se cuenta por usuario:** en móvil, muchas personas comparten la IP de su operadora, y un límite solo por IP las bloquearía a todas a la vez.
- **Pagos simulados:** mientras lo sean, el límite de escrituras es lo que impide que un script encienda velas sin fin e infle las cifras públicas de transparencia.
- **Si hay más de una instancia:** los contadores están en la memoria del proceso. Con una sola instancia de la API es suficiente; con varias hay que pasar a un almacén compartido.

## IP real del cliente

La API está detrás del proxy de Railway, y Express resuelve la IP con `trust proxy = 1`, es decir, confiando en un solo salto de proxy. Esa IP se pasa a Better Auth en una cabecera propia, que sobrescribe cualquier valor que mande el cliente.

Antes, Better Auth leía `X-Forwarded-For`. Si un cliente añadía su propia dirección, llegaban varias y Better Auth no se fiaba de ninguna. Entonces todos esos intentos de login compartían un único contador, y cualquiera podía bloquear el login a los demás.

**Comprobar en el primer despliegue:** después de iniciar sesión desde un móvil, la columna `ipAddress` de la tabla `session` debe mostrar la IP pública real de ese móvil.

- Si aparece la IP de Railway, hay más de un salto de proxy y hay que subir `trust proxy`.
- Si aparece vacía, Railway no está enviando `X-Forwarded-For`.

## Resto de medidas

- **Cabeceras:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` y `Referrer-Policy: no-referrer`. El panel, servido por Caddy, tiene además su propia CSP sin `eval`.
- **CORS:** solo los orígenes de `TRUSTED_ORIGINS`.
- **Tamaño de las peticiones:** cuerpos JSON de 100 kB como máximo.
- **Errores:** los errores internos devuelven "Error interno", sin traza.
- **Permisos:**
  - Cada ruta de datos personales filtra por el usuario de la sesión.
  - Las rutas del panel exigen su rol; el superadmin puede con todo.
  - Hay tests de ambas cosas.
- **Datos sensibles:**
  - Las intenciones privadas y las de las velas van cifradas con AES-256-GCM.
  - Los movimientos del libro no enlazan a personas.
  - El registro de cambios no guarda textos de intenciones.
- **Secretos:** ninguno en el repositorio; solo `.env.example`. Revisado a mano el 26-sep-2026 buscando patrones de claves; no hay escaneo automático.
