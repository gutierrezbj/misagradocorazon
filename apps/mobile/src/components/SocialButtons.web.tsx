import type { SocialProvider } from "@/src/social";

// En web no hay login con Google ni Apple (sin SDK nativo): solo email y contraseña.
export function SocialButtons(_: { onPress: (provider: SocialProvider) => void; busy: SocialProvider | null }) {
  return null;
}
