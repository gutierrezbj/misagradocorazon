// Funciones que dependen de la configuración del servidor (GET /api/features), en una sola consulta.
import { useQuery } from "@tanstack/react-query";

import { api } from "@/src/api";

export type Features = {
  // Recuperar la contraseña (US-24): solo si el servidor tiene email configurado.
  passwordReset: boolean;
  // Beta abierta (US-28): la vela es gratis.
  candlesFree: boolean;
};

export function useFeatures() {
  return useQuery({ queryKey: ["features"], queryFn: () => api<Features>("/features"), staleTime: Infinity }).data;
}
