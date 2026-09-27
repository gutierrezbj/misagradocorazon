// One QueryClient for the whole app; the provider in app/_layout.tsx uses
// this instance. Import it for cache calls outside components, for example
// queryClient.invalidateQueries or setQueryData in websocket or push
// handlers; inside components useQueryClient() returns this same instance.
import { QueryClient } from "@tanstack/react-query";

// Envíos (encender una vela, votar, publicar): sin red fallan al momento y se avisa. Por defecto
// React Query los dejaría en pausa y los enviaría solos al volver la conexión, quizá mucho después:
// inaceptable para una compra.
export const queryClient = new QueryClient({ defaultOptions: { mutations: { networkMode: "always" } } });
