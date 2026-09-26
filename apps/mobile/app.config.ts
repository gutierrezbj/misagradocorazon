// Configuración dinámica sobre app.json. El plugin nativo de Google Sign-In necesita el
// esquema de URL del cliente iOS, que sale del ID de cliente: solo se añade si está definido.
import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const plugins = [...(config.plugins ?? [])];
  if (iosClientId) {
    // 123-abc.apps.googleusercontent.com → com.googleusercontent.apps.123-abc
    const iosUrlScheme = `com.googleusercontent.apps.${iosClientId.replace(/\.apps\.googleusercontent\.com$/, "")}`;
    plugins.push(["@react-native-google-signin/google-signin", { iosUrlScheme }]);
  }
  // Sin opciones, el plugin asume Firebase: por eso no se añade si falta el cliente iOS.
  // Android no necesita plugin (el módulo se enlaza solo; el SHA-1 se registra en Google Cloud).
  return { ...config, name: config.name ?? "Mi Sagrado Corazón", slug: config.slug ?? "mi-sagrado-corazon", plugins };
};
