# PRD — Mi Sagrado Corazón

## Problem statement
App móvil católica bilingüe (ES/EN) para el mercado hispano global. Combina 3 pilares únicos + un panel de gestión web con roles. Basado en la Especificación Funcional v1.0 (Juan Gutiérrez Blanco).

## Architecture
- **Frontend**: Expo (React Native + expo-router), react-query, react-native-reanimated (vela animada), expo-image, WebView (misa YouTube), fuentes Cormorant Garamond (serif) + Libre Franklin (sans) vía expo-font. Tema devocional: rojo Sagrado Corazón #8B0000, dorado #C5A059, marfil #FDFBF7; Altar en tonos oscuros cálidos.
- **Backend**: FastAPI + MongoDB (motor). Auth por session_token (7 días) para email/password (bcrypt) y Google (Emergent). RBAC: user/moderator/editor/superadmin.
- **i18n**: diccionario ES/EN con contexto; contenido de BD localizado {es,en}.

## User personas
1. Fiel devoto (usuario final): enciende velas, reza, participa en el muro, vota causas, ve la misa.
2. Padre/pastor digital: protagoniza la misa dominical.
3. Equipo de gestión: superadmin (todo), editor (contenido/causas/misas/transparencia), moderador (moderación).

## Core requirements (static)
- 3 pilares: ritual diario (altar + vela + evangelio + santo del día + oraciones + muro), misa en vivo semanal + chat, votación mensual de causas + transparencia.
- Vela virtual = micropago SIMULADO en esta versión (1/2/3 USD). 20% a la causa del mes.
- Panel admin con roles y todas las secciones de gestión.

## Implemented (2026-09-25)
- Auth email/password + Google (Emergent), onboarding (santo patrón + secundarios + horarios + idioma).
- Altar con vela de llama animada (reanimated), evangelio/santo del día/oraciones con streak.
- Encender vela (simulado) con selección de santo/intención/tipo y animación de éxito.
- Muro de intenciones: publicar, filtros por categoría, "Rezo por ti", moderación por palabras filtradas.
- Misa: embed YouTube Live + countdown + chat comunitario propio + contador de velas de la semana.
- Causas: fichas, votación 1/mes, barras de progreso; panel de transparencia (histórico + total transferido).
- Perfil + Ajustes (idioma, horarios). 
- Panel admin (/admin): métricas + gráfico velas por santo, moderación (cola + palabras), causas (CRUD + estado), misas (programar), santoral + contenido diario, transparencia, usuarios (roles/bloqueo), notificaciones push (registro).
- Seed: 7 santos patronos, contenido diario, misa del próximo domingo, 3 causas del mes + causa financiada + transparencia, intenciones de ejemplo, 3 cuentas de staff.
- Backend probado 32/32; flujos frontend verificados.

## Backlog (prioritized)
- **P0**: Pagos reales de velas (RevenueCat/Stripe) al generar el build; push notifications reales (requiere google-services.json + build).
- **P1**: Subida de imágenes/audio en admin vía Object Storage (hoy se pegan URLs); audio real de meditaciones/oraciones; rosario y novenas guiadas; calendario litúrgico.
- **P2**: Examen de conciencia, Ángelus, localizador de parroquias, multimoneda, testimonios moderados (v3).

## Next tasks
- Integrar pagos in-app y push tras el primer despliegue/build.
- Object Storage para medios del panel admin.
- Rosario/novenas (segundo anillo de la spec).
