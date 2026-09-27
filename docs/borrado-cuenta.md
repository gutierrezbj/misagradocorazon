# Borrado de cuenta

SDD-02, sección transversal (añadido el 26-sep-2026 con aprobación del fundador). Obligatorio para publicar en App Store (guideline 5.1.1(v)) y derecho de supresión (GDPR art. 17).

## En la app

Ajustes → Cuenta → **Borrar mi cuenta**. La pantalla explica qué se borra y qué se conserva sin nombre. Para confirmar hay que escribir `BORRAR` (o `DELETE` en inglés). Al terminar, el dispositivo queda como recién instalado:

- sin sesión;
- sin sesión de Google;
- sin caché de datos;

y vuelve al login.

## En la API

`DELETE /api/me` con cuerpo `{ "confirm": true }`. Todo va en una sola transacción: o se borra entero o no se borra nada.

| Dato | Qué pasa |
|---|---|
| Sesiones, cuentas vinculadas (contraseña, Google, Apple), verificaciones | Se borran |
| Dispositivos y entregas de push | Se borran |
| Intenciones privadas y públicas (con las oraciones que recibieron) | Se borran |
| Oraciones hechas por intenciones ajenas | Se borran; la intención ajena sigue |
| Mensajes del chat de misa y asistencia a misas | Se borran |
| Historial de oración (racha) | Se borra |
| Velas | Se conservan, con el texto de la intención sustituido por vacío (cifrado) |
| Libro de movimientos | Intacto: es de solo inserción y de él salen el 20 % y la transparencia |
| Votos | Se conservan: el recuento de cada mes no cambia |
| Fila del usuario | Anonimizada: sin nombre, email `deleted-<id>@users.invalid`, sin foto, rol `user`, bloqueada, preferencias y consentimiento de analítica a cero, `deletedAt` con la fecha |
| Registro de auditoría | Se añade `account.delete`, sin datos personales |

Con eso, nada de lo que queda permite saber quién era la persona. El mismo email puede registrarse después como cuenta nueva.

## Reglas

- **Último superadmin:** no puede borrar su cuenta (409 `last_superadmin`). Primero tiene que nombrar a otro, igual que en el panel.
- **Panel y KPIs:** el panel no lista las cuentas borradas. Los KPIs de usuarios (total y cohortes de retención) no las cuentan.

## Tokens de Apple (guideline 5.1.1(v))

Apple exige que, si la app usa Iniciar sesión con Apple, el borrado revoque también los tokens de Apple con su API REST. El login nativo solo da un ID token, que no sirve para revocar. Por eso:

1. **Al entrar con Apple,** la app manda aparte el código de autorización (`POST /api/me/apple-authorization`). El código es de un solo uso y dura 5 minutos. Si ese envío falla, el login sigue igual.
2. **La API canjea el código** en `https://appleid.apple.com/auth/token`. Para ello usa un `client_secret`: un JWT ES256 firmado con la clave `.p8`.
   - Comprueba que el token es de la misma persona de Apple vinculada a la cuenta. Si no lo es, responde 400 y no guarda nada.
   - Guarda el refresh token en la cuenta vinculada de Apple, igual que Better Auth guarda los de OAuth. Volver a entrar sin código lo conserva; un código nuevo lo sustituye. El anterior no se revoca: según Apple, revocar anula toda la autorización de la persona con la app, también el token nuevo.
3. **Al borrar la cuenta,** el refresh token pasa a `apple_revocation` dentro de la misma transacción: solo el token, sin nada de la persona. Justo después se revoca en `https://appleid.apple.com/auth/revoke`.
4. **Si Apple falla,** el borrado no espera. El worker reintenta cada 15 minutos (`apple-revocations`), anota los intentos y avisa a Sentry mientras quede algo pendiente.

Sin `APPLE_TEAM_ID`, `APPLE_KEY_ID` y `APPLE_PRIVATE_KEY` (ver `docs/login-social.md`), no se guarda ni se revoca nada: la ruta responde `{ stored: false }` sin llamar a Apple.

**Probado:** `apps/api/test/apple-revocation.test.ts` simula a Apple y comprueba:
- las peticiones según su documentación;
- la firma, las cabeceras y los claims del `client_secret`;
- el rechazo de un código de otra persona;
- la revocación al borrar;
- el reintento tras un fallo.

`apps/mobile/test/components/AppleLogin.test.tsx` comprueba que el código no va al login y que un fallo no bloquea la entrada.

**Pendiente con la cuenta Apple Developer:** crear la clave y probarlo en un iPhone real con un build de EAS.

## Pendiente: PostHog

La analítica de PostHog (`docs/kpis.md`) está pendiente de borrado en origen. Hoy el móvil deja de enviar y olvida la identidad local, pero la persona en PostHog se borra con su API y una clave del fundador. No se ha programado todavía: hay que comprobar la API de borrado de personas en la documentación de PostHog al crear la cuenta.
