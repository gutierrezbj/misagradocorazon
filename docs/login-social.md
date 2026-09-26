# Login con Google y Apple

Estado: código listo. Falta crear las credenciales, **siempre a nombre del fundador** (o de la futura sociedad), nunca del constructor.

## Cómo funciona

- **Login nativo:** la app usa el SDK nativo de cada proveedor.
  - Google: `@react-native-google-signin/google-signin`, en iOS y Android.
  - Apple: `expo-apple-authentication`, solo en iOS.
- **Verificación en la API:** el sistema operativo entrega un **ID token** firmado por Google o Apple. La app lo envía a `POST /api/auth/sign-in/social`. La API lo verifica con Better Auth (firma, emisor, audiencia, caducidad y, en Apple, el nonce) y devuelve el token Bearer, igual que el login con email.
- **Sin redirecciones ni cookies:** no hay pantallas web intermedias.
- **Web:** la web de la app no ofrece Google ni Apple. Es una herramienta de pruebas; el producto son las apps de las tiendas.
- **Botones:** solo aparecen si la credencial correspondiente está configurada.

## Reglas de cuenta

- **Cuenta nueva:** una persona nueva que entra con Google o Apple crea su cuenta y pasa por el onboarding.
- **Cuenta ya creada con contraseña:** si alguien creó la cuenta con email y contraseña y después intenta entrar con Google usando el mismo correo, **no se enlaza**. La app le pide que entre con su contraseña.
  - Es la protección de Better Auth contra el robo de cuentas registradas de antemano con un correo ajeno.
  - Se podrá enlazar cuando exista la verificación de email.
- **Nombre en Apple:** Apple solo envía el nombre la primera vez. Si falta, el nombre público es "Fiel" hasta que la persona lo cambie.
- **Cuentas bloqueadas:** pueden completar el login, pero la API las frena igual que con email.

## Qué hay que crear

### Google (Google Cloud Console)

1. **Proyecto:** crear un proyecto a nombre del fundador y configurar la pantalla de consentimiento OAuth. Nombre de la app, email de soporte y política de privacidad.
2. **Crear tres IDs de cliente OAuth:**

| Tipo | Dato que pide | Dónde se usa |
|---|---|---|
| Web | — | `GOOGLE_CLIENT_ID` (API) y `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (app). Es la audiencia del ID token |
| iOS | Bundle ID `com.misagradocorazon.app` | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (app) |
| Android | Package `com.misagradocorazon.app` + huella SHA-1 del certificado de firma | No va en el código. Google lo reconoce por el package y la firma |

- **Huella SHA-1 de Android:** es la del certificado con el que EAS firma la app (`eas credentials`). Cuando la app esté en Google Play, hay que añadir también la huella de la clave de firma de Play.
- **Secreto del cliente web (`GOOGLE_CLIENT_SECRET`):** no hace falta para el login nativo.

### Apple (Apple Developer Program)

1. **Cuenta:** alta en el Apple Developer Program a nombre del fundador o de la sociedad. Es de pago anual.
2. **App ID:** crear el identificador `com.misagradocorazon.app` con la capacidad **Sign in with Apple**. EAS puede sincronizarla al generar el build.
3. **API:** `APPLE_BUNDLE_ID=com.misagradocorazon.app`. No hace falta clave privada ni Services ID para el login nativo.

Por las normas de Apple (guideline 4.8), si la app ofrece Google en iOS, tiene que ofrecer también Sign in with Apple. Por eso las dos opciones se activan juntas en iOS.

## Probarlo

- **Expo Go:** no sirve, porque Google Sign-In es un módulo nativo. Hace falta un build de desarrollo con EAS (`eas build --profile development`) o un build de prueba.
- **Apple:** requiere un iPhone o simulador con sesión de Apple ID.
- **Tests automáticos (`apps/api/test/social.test.ts`):** firman ID tokens propios y sirven sus claves en lugar de las de Google y Apple. Cubren:
  - el alta;
  - volver a entrar con la misma cuenta;
  - la audiencia equivocada;
  - el nonce de Apple;
  - la negativa a enlazar con una cuenta de contraseña sin verificar;
  - las cuentas bloqueadas.
