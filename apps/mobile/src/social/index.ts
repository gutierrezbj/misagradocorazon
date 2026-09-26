// Login con Google y Apple mediante sus SDK nativos: el sistema operativo entrega un ID token
// que la API verifica (Better Auth). Los módulos nativos se cargan bajo demanda para que la app
// no falle en entornos que no los incluyen (Expo Go).
import { Platform } from "react-native";

export type SocialProvider = "google" | "apple";

export type SocialCredential = {
  provider: SocialProvider;
  idToken: {
    token: string;
    nonce?: string;
    user?: { name?: { firstName?: string; lastName?: string }; email?: string };
  };
};

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";

export function googleAvailable(): boolean {
  if (!GOOGLE_WEB_CLIENT_ID) return false;
  return Platform.OS === "android" || (Platform.OS === "ios" && !!GOOGLE_IOS_CLIENT_ID);
}

export async function appleAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    const Apple = await import("expo-apple-authentication");
    return await Apple.isAvailableAsync();
  } catch {
    return false;
  }
}

let googleConfigured = false;

/** Devuelve null si la persona cancela. */
export async function signInWithGoogle(): Promise<SocialCredential | null> {
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = await import(
    "@react-native-google-signin/google-signin"
  );
  if (!googleConfigured) {
    // webClientId: el ID token sale emitido para el cliente web, que es la audiencia que verifica la API.
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, ...(GOOGLE_IOS_CLIENT_ID && { iosClientId: GOOGLE_IOS_CLIENT_ID }) });
    googleConfigured = true;
  }
  try {
    if (Platform.OS === "android") await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) return null;
    if (!res.data.idToken) throw new Error("Google no devolvió ID token");
    return { provider: "google", idToken: { token: res.data.idToken } };
  } catch (e) {
    if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) return null;
    throw e;
  }
}

/** Devuelve null si la persona cancela. */
export async function signInWithApple(): Promise<SocialCredential | null> {
  const Apple = await import("expo-apple-authentication");
  const Crypto = await import("expo-crypto");
  // Apple firma el hash del nonce; la API recibe el nonce en claro y comprueba que coinciden.
  const nonce = Crypto.randomUUID();
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
  try {
    const cred = await Apple.signInAsync({
      requestedScopes: [Apple.AppleAuthenticationScope.FULL_NAME, Apple.AppleAuthenticationScope.EMAIL],
      nonce: hashed,
    });
    if (!cred.identityToken) throw new Error("Apple no devolvió ID token");
    // Apple solo envía el nombre la primera vez que se autoriza la app.
    const name = cred.fullName?.givenName || cred.fullName?.familyName
      ? { firstName: cred.fullName.givenName ?? undefined, lastName: cred.fullName.familyName ?? undefined }
      : undefined;
    return {
      provider: "apple",
      idToken: { token: cred.identityToken, nonce, ...(name && { user: { name } }) },
    };
  } catch (e) {
    if ((e as { code?: string }).code === "ERR_REQUEST_CANCELED") return null;
    throw e;
  }
}

/** Al cerrar sesión, que la próxima vez se pueda elegir otra cuenta de Google. */
export async function socialSignOut() {
  if (!googleAvailable()) return;
  try {
    const { GoogleSignin } = await import("@react-native-google-signin/google-signin");
    await GoogleSignin.signOut();
  } catch {
    // Sin sesión de Google abierta: nada que hacer.
  }
}
