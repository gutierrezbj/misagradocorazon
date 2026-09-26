# Audio devocional

Estado: reproductor listo. Falta el audio: lo graba el equipo (CLAUDE.md, nunca con IA) y se sube cuando exista la gestión de contenido del panel, con los ficheros en Cloudflare R2.

## Dónde suena

| Pantalla | Campo en la API | Historia |
|---|---|---|
| Ficha del santo (y santo del día) | `saint.audioUrl.{es,en}` | SDD-05 US-05, US-06, US-07 |
| Oración de la mañana y de la noche | `daily.morningPrayer.audioUrl`, `daily.nightPrayer.audioUrl` | US-08, US-09 |
| Meditación del evangelio (opcional) | `daily.meditation.audioUrl` | Épica 8 |

- **Idioma:** cada fiel escucha el audio **de su idioma**. Si aún no está grabado en su idioma, el reproductor no aparece y se reza con el texto. No se sustituye por el audio del otro idioma (US-07).
- **Desde una notificación:** al abrir la pantalla desde la notificación de la mañana, de la noche o del santo del día, el audio **empieza solo** (SDD Documentación, flujos 1 y 2).

## Qué hace el reproductor

- **Controles:** reproducir y pausar, ±15 segundos, barra de progreso que se puede tocar para saltar y tiempos transcurrido y total.
- **Segundo plano:** sigue sonando con la app en segundo plano o el teléfono bloqueado (US-06).
  - iOS: `UIBackgroundModes: audio`.
  - Android: servicio en primer plano de reproducción.
- **Pantalla de bloqueo y centro de control:** título, "Mi Sagrado Corazón", imagen del santo, reproducir/pausar y ±15 s.
  - En Android, estos controles son además los que mantienen el audio más de unos 3 minutos en segundo plano (limitación del sistema).
- **Al salir de la pantalla** el audio se detiene. El reproductor pertenece a cada pantalla; no hay reproductor flotante.
- **Si el audio no carga en 20 s**, muestra un aviso con "Reintentar".
- **Permisos:** ninguno de micrófono. El plugin de `expo-audio` va configurado sin grabación (`microphonePermission: false`, `recordAudioAndroid: false`).

## Requisitos del alojamiento (R2)

- **Formato:** MP3 o M4A (AAC).
- **Cabeceras HTTP `Range`:** el servidor tiene que responder a peticiones de un trozo del fichero. Sin eso no se puede saltar dentro del audio. Cloudflare R2 las admite.
- **URLs:** públicas y estables. Las guarda el panel en los campos de arriba.

## Verificado

- **Web (Chromium), con un tono de prueba local:**
  - reproducir, avanzar y retroceder 15 s, y pausar;
  - reproducción automática al llegar con `autoplay=1`;
  - el reproductor en el evangelio;
  - un fiel en inglés no ve el audio en español.
- **No verificado:** segundo plano y pantalla de bloqueo en iPhone y Android. Hace falta un build de EAS.
