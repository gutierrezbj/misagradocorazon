// En web no hay SDK nativo de Google ni de Apple: la app web solo ofrece email y contraseña.
export type SocialProvider = "google" | "apple";
export type SocialCredential = { provider: SocialProvider; idToken: { token: string; nonce?: string } };

export const googleAvailable = () => false;
export const appleAvailable = async () => false;
export const signInWithGoogle = async (): Promise<SocialCredential | null> => null;
export const signInWithApple = async (): Promise<SocialCredential | null> => null;
export const socialSignOut = async () => undefined;
