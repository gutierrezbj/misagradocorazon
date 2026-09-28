# Recuperar la contraseña

SDD-05 US-24 (Épica 1), añadida el 28-sep-2026 con aprobación del fundador. Quien entró con email y contraseña y la olvida la cambia con un código de 6 dígitos que le llega por email.

## Cómo funciona

1. En el login, "¿Olvidaste tu contraseña?" abre la pantalla de recuperación. El enlace solo aparece si el servidor tiene email configurado (`GET /api/features`).
2. El fiel escribe su correo y pide el código (`POST /api/auth/email-otp/request-password-reset`).
   - La respuesta es la misma exista o no la cuenta, y la pantalla tampoco lo dice: nadie puede averiguar quién está registrado.
   - El email va en el idioma del fiel (ES/EN).
3. Con el código y la contraseña nueva la cambia (`POST /api/auth/email-otp/reset-password`).

## Reglas

| Qué | Valor |
|---|---|
| Código | 6 dígitos, de un solo uso |
| Caducidad | 10 minutos |
| Intentos por código | 3; al tercer fallo hay que pedir otro |
| Contraseña nueva | Mínimo 8 caracteres |
| Al cambiarla | Se cierran todas las sesiones abiertas |
| En la base de datos | El código se guarda con hash, nunca en claro |
| Límite de peticiones | 3 por minuto en producción (Better Auth), además de los límites generales (`docs/seguridad.md`) |

- **Implementación:** plugin `email-otp` de Better Auth (`apps/api/src/modules/auth/auth.ts`).
- **Rutas desactivadas:** el plugin trae más rutas (entrar sin contraseña, verificar o cambiar el email) que no están en el alcance. Están desactivadas y responden 404.
- **Cuentas de Google o Apple:** si alguien entró con Google o Apple y recupera la contraseña con su email, se le añade una contraseña a esa cuenta. Demuestra que controla el correo.

## Qué hay que configurar, a nombre del fundador

1. **Cuenta en un proveedor de email** con envío por SMTP. Sirve cualquiera; es decisión del fundador.
2. **Dominio del remitente** verificado en el proveedor (SPF y DKIM). Sin eso, los emails acaban en spam.
3. **Variables de la API en Railway:**
   - `SMTP_URL`, por ejemplo `smtps://usuario:clave@smtp.proveedor.com:465`.
   - `MAIL_FROM`, por ejemplo `Mi Sagrado Corazón <no-reply@misagradocorazon.com>`.

Sin esas dos variables, la opción no aparece en la app y las rutas de recuperación no existen.

## KPI

Eventos de PostHog sin propiedades, solo con consentimiento (`docs/kpis.md`): `password_reset_requested` y `password_reset_completed`. La diferencia entre los dos dice cuántos piden el código y no terminan: correos que no llegan o códigos que caducan.

## Verificado

- **API:** 8 tests (`apps/api/test/password-reset.test.ts`):
  - flujo completo y cierre de sesiones;
  - idioma del email;
  - email sin cuenta;
  - límite de intentos;
  - longitud mínima;
  - código guardado con hash;
  - rutas desactivadas;
  - `GET /api/features`.
- **App:** 3 tests (`apps/mobile/test/components/ForgotPassword.test.tsx`) y prueba en navegador.
- **Pendiente:** el envío real, cuando exista la cuenta del proveedor.
