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

## Pendiente antes de publicar en App Store

Apple exige que, si la app usa Iniciar sesión con Apple, el borrado revoque también los tokens de Apple con su API REST (`/auth/revoke`). Para hacerlo hacen falta tres cosas:

- la clave privada de Sign in with Apple (`.p8`), con su Key ID y el Team ID, de la cuenta Apple Developer del fundador;
- guardar el `authorizationCode` que entrega el inicio de sesión nativo y canjearlo por un refresh token;
- llamar a la revocación dentro del borrado.

Hoy la app solo usa el `idToken` nativo y no guarda nada de eso. Queda anotado hasta que exista la cuenta Apple Developer.

La analítica de PostHog (`docs/kpis.md`) también queda pendiente de borrado en origen: hoy el móvil deja de enviar y olvida la identidad local, pero la persona en PostHog se borra con su API y una clave del fundador.
