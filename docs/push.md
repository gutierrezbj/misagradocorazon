# Notificaciones push

Estado: código listo. Para que lleguen a teléfonos reales falta el proyecto de EAS y las credenciales de las tiendas, **a nombre del fundador**.

## Qué se envía

Alcance de SDD-05, épica 5 (US-15, US-16, US-17), SDD-05, épica 11 (anuncio del día 8) y SDD-02 (módulo de notificaciones del panel).

| Aviso | Cuándo | Texto (ES) | Abre | Preferencia |
|---|---|---|---|---|
| Oración de la mañana | Hora de mañana del fiel, en su zona horaria | "Buenos días. Tu oración de la mañana está lista." | Oración de la mañana | `notifyMorning` |
| Oración de la noche | Hora de noche del fiel | "Hora de dar gracias. Tu oración de la noche está lista." | Oración de la noche | `notifyNight` |
| Santo del día | 07:00 locales, si hay contenido del día con santo | "Hoy celebramos a [Santo]. Conoce su historia." (con imagen) | Ficha del santo | `notifySaint` |
| Causa ganadora | Día 8, al cerrar la votación | "La comunidad ha elegido: [causa]." | Causas | `notifyCommunity` |
| Avisos del equipo | Al enviarlos desde el panel (Notificaciones), rol editor o superior | El que escriba el equipo, en ES y EN | Altar | `notifyCommunity` |

- **Idioma:** cada fiel recibe el aviso en su idioma (ES o EN). Los textos son los de los flujos 1 y 2 de la página Documentación de Notion.
- **Preferencias:** todas vienen activadas por defecto y se cambian en Ajustes.

## Reglas

- **Sin reintentos:** cada aviso sale como mucho una vez por persona, tipo y fecha local, mes o campaña. La tabla `push_delivery` lo anota antes de enviar.
- **Caducidad de 2 horas:** si el teléfono está apagado, el aviso no llega tarde (flujo 4: "no ser invasivo").
- **Datos:** nunca se envía contenido de intenciones ni datos personales (GDPR art. 9).
- **Cuentas bloqueadas:** no reciben nada.
- **Tokens caducados:** si Expo avisa de que la app se desinstaló, el token se borra. Pasa al enviar o al revisar los recibos cada 15 minutos.
- **Cierre de sesión:** el dispositivo se da de baja y deja de recibir avisos de esa cuenta.
- **Ángelus:** no tiene aviso. Los tipos del flujo 4 son santo del día, mañana y noche.

## Piezas

- **API (`apps/api/src/modules/push`):**
  - Registro de dispositivos: `PUT` y `DELETE /api/me/push-tokens`.
  - Envío por Expo Push Service (`expo-server-sdk`), detrás de un transporte intercambiable.
  - Recordatorios, anuncio de la causa ganadora y campañas.
- **Worker (`pnpm --filter @msc/api worker`):**
  - Recordatorios y campañas: cada minuto.
  - Recibos de Expo: cada 15 minutos.
  - Aviso de la causa ganadora: tras cerrar la votación el día 8.
- **Panel:** página Notificaciones. Redactar en ES y EN, confirmar el número de destinatarios y ver el historial. Cada envío queda en `admin_audit_log`.
- **App (`apps/mobile/src/push`):**
  - Pide permiso al terminar el onboarding o desde Ajustes.
  - Registra el token y da de baja el dispositivo al cerrar sesión.
  - Abre la pantalla de cada aviso, también con la app cerrada.
  - En web no hay push.

## Qué falta para probarlo en un teléfono

1. **Proyecto de EAS a nombre del fundador:** `eas init` en `apps/mobile`. Escribe `extra.eas.projectId` en la configuración. Sin él, la app no pide token y Ajustes muestra "Los recordatorios llegan en la app instalada desde las tiendas".
2. **iOS:** cuenta de Apple Developer a nombre del fundador. EAS crea la clave de push (APNs) al generar el build.
3. **Android:** proyecto de Firebase a nombre del fundador, con la app `com.misagradocorazon.app`. Hay que subir su clave de cuenta de servicio (FCM v1) a EAS (`eas credentials`).
4. **Build de desarrollo o de prueba con EAS:** los push no funcionan en simulador ni en Expo Go.
5. **Opcional:** activar "enhanced security" de push en la cuenta de Expo y definir `EXPO_ACCESS_TOKEN` en la API.

El worker tiene que estar desplegado en Railway como servicio aparte (SDD-08).
