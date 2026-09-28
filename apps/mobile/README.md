# App móvil — Mi Sagrado Corazón

Expo + React Native + TypeScript (iOS, Android y web). Consume la API de `apps/api`.

```bash
cp ../../.env.example .env   # EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
pnpm start                   # desde la raíz: pnpm mobile
```

Reglas del proyecto en `CLAUDE.md` de la raíz.

## Estructura

- `app/`: pantallas y rutas (expo-router). La ruta es la URL y el nombre de pantalla que mide la analítica (`trackScreen`), así que no se mueve sin motivo: cambiarla corta la serie de los KPIs.
- `src/` por pilar (CLAUDE.md, SDD-06):

| Carpeta | Qué contiene |
|---|---|
| `src/ritual/` | Pilar 1: reproductor único y mini-player (`audio.tsx`, `AudioPlayer`, `MiniPlayer`), la llama de la vela y compartir la vela |
| `src/misa/` | Pilar 2: chat de la misa (Socket.IO) y reproductor de YouTube |
| `src/causas/` | Pilar 3: formato de importes |
| `src/` (raíz) | Transversal: API, sesión, i18n, tema, push, analítica, Sentry, red, login social y componentes de interfaz comunes (`components/`) |
