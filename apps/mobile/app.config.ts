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

  // Sentry: el plugin sube los mapas de código en los builds de EAS (necesita SENTRY_AUTH_TOKEN).
  // Solo si la cuenta existe; sin él, los errores llegan igual pero sin mapear al código fuente.
  if (process.env.SENTRY_ORG && process.env.SENTRY_PROJECT) {
    plugins.push(["@sentry/react-native/expo", { organization: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT }]);
  }

  // EAS Update (SDD-08, 27-sep-2026): arreglos de JS sin pasar por las tiendas. Una actualización
  // solo llega a builds con la misma versión de la app (runtimeVersion = versión). La URL sale del
  // proyecto de EAS del fundador (`eas init`, cuenta gutierrezbj), guardado en app.json. Sin él no hay
  // actualizaciones; EAS_PROJECT_ID permite apuntar a otro proyecto sin tocar el fichero.
  const easProjectId = process.env.EAS_PROJECT_ID ?? (config.extra?.eas?.projectId as string | undefined);
  return {
    ...config,
    name: config.name ?? "Mi Sagrado Corazón",
    slug: config.slug ?? "mi-sagrado-corazon",
    plugins,
    runtimeVersion: { policy: "appVersion" },
    ...(easProjectId && {
      updates: { url: `https://u.expo.dev/${easProjectId}` },
      extra: { ...config.extra, eas: { projectId: easProjectId } },
    }),
  };
};
