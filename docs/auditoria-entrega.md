# Auditoría de entrega — Mi Sagrado Corazón

Fecha: 2026-09-25 (revisión 2, sustituye a la versión sin código)
Objeto: rama `conflict_250926_1728`, commit `8202ef5` (secciones 0–10) y hasta `67b47ed` (sección 11).
Método: lectura completa del código y del historial git. **No se ha ejecutado nada**: ni backend, ni app, ni tests, ni `tsc`, porque hace falta MongoDB e instalar las dependencias. Lo que depende de ejecutarlo va marcado como *no verificado*.

## 0. Resumen

- **Constructor:** plataforma Emergent (autor de los commits: `emergent-agent-e1 <github@emergent.sh>`).
- **Qué es:** un prototipo funcional de los 3 pilares más el panel. Tiene 4 commits, de los que uno contiene el 99 % del código (`825a786`, 88 ficheros, +7.434 líneas).
- **Backend:** **Python/FastAPI**, no Node/TypeScript.
- **Frontend:** Expo / React Native con TypeScript.
- **Base de datos:** MongoDB.
- **Integración con `main`:** la rama no comparte historia con `main`, así que hay que unirla de forma explícita (ver §10).

### Hallazgos críticos (P0)

| # | Hallazgo | Evidencia |
|---|----------|-----------|
| C1 | **Contraseñas del staff en claro dentro de un repo público.** El superadmin, el editor y el moderador se crean en cada arranque con contraseña fija. Cualquier despliegue que ejecute el seed queda con el superadmin expuesto. | `backend/seed.py:333-336`, `backend/tests/conftest.py:32-42` |
| C2 | **Datos inventados de transparencia y causas.** El seed mete una "causa financiada" con 5.800 USD "transferidos y verificados", ingresos de 29.000 USD, votos inflados (128/95/156), responsables inventados ("P. Manuel Ríos") e intenciones falsas. Se ejecuta en cada arranque, también en producción. Para un proyecto cuya credibilidad es la transparencia, es un riesgo reputacional y legal. | `backend/seed.py:207-316`, `server.py:895-897` |
| C3 | **Dependencia de la infraestructura de Emergent.** El login con Google pasa por el broker de Emergent, no por un proyecto de Google Cloud del fundador. Los identificadores de la app también son de Emergent. | `server.py:25` (`demobackend.emergentagent.com`), `frontend/src/auth.tsx:39` (`auth.emergentagent.com`), `frontend/app.json:12,19` (`com.emergent.appconceptreview.cpf9hz`) |
| C4 | **Voto duplicado posible por carrera.** El control "un voto por mes" es un `find_one` seguido de `insert_one`, sin índice único en `votes(user_id, month)`. Dos peticiones simultáneas cuentan doble. | `server.py:508-514`, `server.py:886-893` (no crea el índice) |
| C5 | **Fuga de datos personales en endpoints públicos.** `GET /intentions` devuelve `user_id` y `prayed_by` (la lista de IDs de quienes rezaron). `GET /candles/community` devuelve `user_id` y `user_name`. El chat devuelve `user_id`. | `server.py:386`, `362`, `451-453` |
| C6 | **El backend no es TypeScript**, en contra del requisito de entrega 8. | `backend/server.py` |

## 1. Stack real y versiones

| Capa | Tecnología | Versión | Fuente |
|------|-----------|---------|--------|
| App móvil | Expo (SDK 57) + expo-router | expo 57.0.24, expo-router 57.0.22 | `frontend/package.json` |
| UI | React Native / React | RN 0.86.3, React 19.2.3 | ídem |
| Lenguaje front | TypeScript (`strict: true`) | 6.0.3 | `frontend/tsconfig.json` |
| Estado de servidor | @tanstack/react-query | 5.102.8 | |
| Animación | react-native-reanimated | 4.5.1 | |
| Vídeo | react-native-webview (iframe de YouTube) | 13.16.1 | |
| Almacenamiento del token | expo-secure-store | 57.0.4 | |
| Gestor de paquetes | yarn | 1.22.22 | |
| Backend | FastAPI + Uvicorn | 0.110.1 / 0.25.0 | `backend/requirements.txt` |
| Lenguaje back | Python | versión no declarada | — |
| BD | MongoDB vía motor / pymongo | 3.3.1 / 4.6.3 | |
| Contraseñas | passlib + bcrypt | 1.7.4 / 4.1.3 | |
| Validación | pydantic | 2.13.5 | |
| Tests back | pytest + pytest-xdist | 9.1.1 / 3.8.0 | |
| Entorno de construcción | imagen Emergent `expo_mongo_base_image_cloud_arm:release-23092026-1` | — | `.emergent/emergent.yml` |

Servicios externos que usa el código:

- Emergent Auth para Google (ver C3).
- YouTube por iframe (sin API).
- Imágenes enlazadas directamente a Pexels, Unsplash y Wikimedia Commons.

No se usan Stripe, Firebase/FCM, CDN propio ni analytics.

**Valoración frente al stack de referencia (Node/Express + React + MongoDB):**

- MongoDB coincide.
- React Native coincide con lo que proponía la especificación.
- El backend en Python es la desviación. La propuesta está en §9.

## 2. Estructura

```
.emergent/               metadatos de Emergent
backend/
  server.py              903 líneas: TODO el API (54 endpoints), modelos, auth, RBAC y arranque
  seed.py                351 líneas: santos, contenido, misa, causas, transparencia, intenciones, staff
  tests/                 32 tests de integración contra un servidor remoto
frontend/
  app/                   rutas expo-router
    (auth)/login.tsx
    (tabs)/index.tsx     altar
    (tabs)/muro.tsx  misa.tsx  causas.tsx
    admin/*.tsx          panel de gestión (8 pantallas) DENTRO de la app móvil
    onboarding, light-candle, gospel, prayer, saint/[id], profile, settings
  src/                   api.ts, auth.tsx, i18n.tsx, theme.ts, components/
  scripts/cmd-guard/     tooling de Emergent (se ejecuta en preinstall)
memory/PRD.md            PRD que generó Emergent
design_guidelines.json   guía visual que generó Emergent
test_result.md, test_reports/   artefactos del agente de testing de Emergent
```

La estructura no es modular por pilar:

- El backend es un solo fichero.
- El frontend está organizado por pantallas, sin carpetas `ritual/`, `misa/`, `causas/` ni `admin/` de dominio. Solo `admin/` existe como carpeta de rutas.

Colecciones MongoDB: `users`, `user_sessions`, `saints`, `daily_content`, `prayer_logs`, `candles`, `intentions`, `masses`, `chat_messages`, `causes`, `votes`, `transparency`, `moderation_words`, `push_notifications`.

## 3. Requisitos de entrega (`docs/requisitos-entrega.md`)

| # | Requisito | Estado | Evidencia |
|---|-----------|--------|-----------|
| 1 | Código completo, commits frecuentes y descriptivos | **Parcial** | El código está. Hay 4 commits: "Initial commit", "¡Prototipo completo…" (+7.434 líneas) y dos "Auto-generated changes". No son ni frecuentes ni descriptivos. |
| 2 | Ejecutable fuera de la plataforma, con instrucciones | **No cumple** | No hay instrucciones: el `README.md` raíz es "# Here are your Instructions" y el del frontend es el de plantilla de create-expo-app. `requirements.txt` descarga `litellm` desde `customer-assets.emergentagent.com`. El login con Google depende de Emergent. Los tests apuntan por defecto a `app-concept-review.preview.emergentagent.com`. Arranque local *no verificado*. |
| 3 | Cuentas a nombre del fundador | **No cumple** | Bundle ID y package son `com.emergent.appconceptreview.cpf9hz`. OAuth pasa por Emergent. La preview está alojada en Emergent. No hay cuentas de stores, Firebase ni YouTube. La titularidad de la BD está *no verificada*. |
| 4 | README técnico completo | **No cumple** | No existe. No hay `.env.example`: el backend necesita `MONGO_URL` y `DB_NAME` (`server.py:20-22`) y el front `EXPO_PUBLIC_BACKEND_URL` (`api.ts:3`), sin que estén documentadas. No hay instrucciones de build iOS/Android ni de despliegue. |
| 5 | Modelo de datos y endpoints documentados | **No cumple** | No existe. Solo la documentación automática de FastAPI en `/docs` en tiempo de ejecución (*no verificado*). |
| 6 | Dependencias y servicios con su propósito | **No cumple** | No existe. `requirements.txt` trae 120 paquetes; ver §7. |
| 7 | Lista de lo simulado o pendiente | **Parcial** | `memory/PRD.md` tiene un backlog (pagos reales, push reales, subida de medios, audio…). No es la lista formal que se pidió y omite huecos (§4). |
| 8 | TypeScript y estructura por pilar | **No cumple** | Frontend TS, backend Python. No hay estructura por pilar (§2). |
| 9 | Ningún secreto en el repo | **No cumple** | No hay claves de API ni tokens. Sí hay credenciales de las cuentas de staff en claro (C1). |

## 4. Funcionalidad frente a la especificación funcional

| Módulo (MVP) | Estado | Notas |
|--------------|--------|-------|
| Registro email/contraseña | Hecho | Sin verificación de email, sin política de contraseña, sin recuperación ("forgot password" solo existe como testID). |
| Login con Google | Hecho vía Emergent | Hay que sustituirlo (C3). |
| Apple Sign-In | Falta | Pendiente acordado antes de App Store. |
| Onboarding: patrón, secundarios, horarios, idioma | Hecho | |
| Altar con vela animada | Hecho | `CandleFlame.tsx` con reanimated. Los 60 fps están *no verificados*. |
| Encender vela | Hecho, **simulado** | Sin cobro, con el aviso "pago simulado". La vela permanente (3 USD/sem) no se renueva ni caduca: `active: true` para siempre. |
| Santo del día | Hecho | La ficha tiene historia, patronazgos y oración. Falta iconografía como campo propio. |
| Evangelio del día + meditación | **Parcial** | Solo texto. No hay reproductor de audio, aunque el modelo tiene `meditation_audio_url`. No hay compartir. Si no hay contenido para hoy, muestra en silencio el último que exista (`server.py:289-290`). |
| Oración de mañana y noche | **Parcial** | Solo texto, sin audio. La racha está mal (ver abajo). |
| Racha de constancia | **Incorrecta** | Suma 1 por cada oración completada (mañana y noche cuentan por separado) y nunca se reinicia. No mide días consecutivos (`server.py:304-315`). |
| Intenciones personales privadas | **Falta** | No existe. |
| Muro de intenciones + "Rezo por ti" + categorías | Hecho | Se puede rezar por intenciones ocultas o pendientes, porque no se comprueba el `status`. |
| Moderación automática | Básica | Coincidencia de subcadenas contra una lista de palabras. Sin IA ni reglas. Lo marcado va a una cola. |
| Misa: YouTube embebido | Hecho en móvil | "En vivo" se decide por la hora del dispositivo: ventana de 2 h desde `scheduled_at`. En web el WebView no funciona (*no verificado*, limitación conocida de react-native-webview). |
| Chat de misa propio | Hecho con sondeo cada 8 s | No es tiempo real. No escala a picos de domingo. |
| Velas colectivas en la misa | **Incorrecto** | Muestra el total histórico de velas con la etiqueta "velas de esta semana" (`misa.tsx`, `server.py:363`). |
| Grabación / resumen post-misa | Falta | |
| Causas: fichas | Hecho | Nombre, ubicación, responsable, presupuesto, fotos, descripción y timeline. |
| Votación 1 por usuario y mes | Hecho con fallo | Ver C4. Sin verificación de identidad ni antifraude. No se aplica el periodo del día 1 al 7: abre y cierra a mano con `status`. |
| Anuncio del ganador el día 8 + push | Falta | Solo cambio manual de estado. |
| Panel de transparencia | Parcial | Totales e histórico se introducen a mano. El 20 % no se calcula a partir de ingresos reales. Faltan PDF, fotos de progreso y vídeo. La web `misagradocorazon.com/transparencia` no existe. La app afirma "público y auditado" y "20 % de cada vela": lo primero es falso hoy y lo segundo contradice la especificación (20 % de la facturación). |
| Perfil y ajustes | Hecho | Sin historial de votos visible (*no verificado* en UI), sin método de pago, sin gestión de suscripción. |
| Push programables (mañana, Ángelus, noche) | **Falta** | No está instalado `expo-notifications`. Los horarios se guardan pero no disparan nada. |
| i18n ES/EN | Parcial | La app de usuario usa un diccionario de 123 claves. El **panel admin** está escrito en español a pelo y hay textos fijos en pantallas de usuario ("votos", "/sem", "20 % de cada vela…"). |
| Muro de testimonios | No existe | Correcto según `CLAUDE.md`. |

## 5. Panel de gestión

Existe como rutas `/admin/*` **dentro de la misma app Expo**, accesible en web y también incluido en el bundle móvil. El control de acceso real está en el backend (`require_roles`). En el cliente solo se redirige al rol `user`.

| Módulo acordado | Estado | Detalle |
|-----------------|--------|---------|
| Santoral | Parcial | Alta, edición y borrado lógico de santos. Imágenes por URL pegada, sin subida. |
| Contenido diario | Parcial | Alta y edición por fecha de evangelio, meditación y oraciones. Sin carga masiva, sin calendario y sin fuente litúrgica. |
| Causas | Parcial | Alta, edición, estado y actualizaciones. **Fallo:** editar una causa hace `$set` del modelo completo y devuelve `status` a `"voting"` por defecto (`server.py:690-694`). `status` acepta cualquier texto (`server.py:701-704`). |
| Misa | Parcial | Crear y editar misas con URL de YouTube. Sin grabaciones ni borrado. |
| Moderación | Hecho básico | Colas de intenciones y chat, y lista de palabras. Sin historial de acciones ni motivo. |
| Usuarios | Hecho básico | Búsqueda, cambio de rol y bloqueo (solo superadmin). Sin protección contra quitarse el propio rol ni contra dejar el sistema sin superadmin. La búsqueda mete la entrada del usuario directamente en un `$regex`. |
| Transparencia | Parcial | Registro mensual manual. |
| Métricas | Básico | Totales, velas por tipo y por santo. Sin retención, sin series temporales, sin las métricas de la especificación (§10). |
| Notificaciones | **Simulado** | Solo guarda el registro y calcula la audiencia. No envía nada y marca `status: "sent"` aunque no se haya enviado (`server.py:856-858`). Lo pueden usar los tres roles, incluido el moderador. |

Roles implementados: `user`, `moderator`, `editor` y `superadmin`, con superadmin por encima de todo. Coinciden con `CLAUDE.md`.

## 6. Seguridad

**Secretos**

- Credenciales de staff en claro (C1).
- `.gitignore` excluye `.env`, `*.key` y `credentials.json`. No hay claves de API en el repo.

**Autenticación**

- Token de sesión opaco (`secrets.token_urlsafe(32)`) guardado en Mongo, con TTL de 7 días. No usa JWT con refresh como pide la especificación (§8.2). Es un diseño válido, pero sin rotación ni revocación global.
- En el cliente el token se guarda en `expo-secure-store`: correcto.
- Sin rate limiting en login ni registro. Sin verificación de email. Sin longitud mínima de contraseña.
- `POST /auth/session` (Google) no comprueba `blocked`. El bloqueo se aplica después en `get_current_user`.
- `CORS allow_origins=["*"]` con `allow_credentials=True` (`server.py:877-883`).

**Roles**

- RBAC en backend correcto en lo básico, y cubierto por tests.
- Hay gestos de staff que no deberían tener todos los roles (push al moderador).

**Validación de entradas**

- Pydantic valida tipos, pero no rangos ni enumerados: `kind`, `category`, `status`, `action`, idioma y horas son texto libre.
- Intenciones y chat se truncan (500 / 300) pero aceptan texto vacío.
- El chat acepta `mass_id` inexistentes.
- `/admin/users?search=` se pasa a `$regex` sin escapar (riesgo de ReDoS, acotado a superadmin).

**Privacidad**

- Ver C5.
- Intenciones sin cifrado en reposo (lo pide la especificación §8.2).
- Sin nada de GDPR/CCPA: exportación y borrado de cuenta.

**Repo público:** sigue siéndolo y ahora contiene código con credenciales (C1). Pasarlo a privado es urgente.

## 7. Calidad

**Tipado**

- Frontend en `strict`, pero con 46 usos de `any` (`api<T = any>`, `data?.x` sin tipar, `(s: any)`). No hay tipos compartidos con el backend.
- `tsc` sin ejecutar: *no verificado* que compile limpio.

**Tests**

- 32 tests de integración en `backend/tests/test_api.py`. Son de caja negra por HTTP y, por defecto, contra el servidor de preview de Emergent.
- Sin tests unitarios, sin tests de frontend y sin CI.
- El informe de Emergent (`test_reports/iteration_1.json`) dice 32/32 en verde y "no bugs". Los fallos de §4 a §6 no los detecta.

**Deuda técnica**

- `server.py` monolítico (903 líneas).
- Código obsoleto en FastAPI/Pydantic v2: `@app.on_event` y `.dict()`.
- El seed se ejecuta en cada arranque de producción.
- Sin capa de servicios ni repositorios. Sin transacciones.
- Métricas calculadas recorriendo todas las velas en memoria (`server.py:554-555`).
- `contains_banned` lee la lista entera de palabras en cada mensaje.

**Dependencias innecesarias (backend)**

- `requirements.txt` es el volcado de la imagen de Emergent: 120 paquetes. El código solo importa `fastapi`, `starlette`, `motor`, `pydantic`, `passlib`, `httpx` y `python-dotenv`.
- Sobran, entre otros: `openai`, `litellm` (desde URL de Emergent), `emergentintegrations`, `google-generativeai`, `google-genai`, `boto3`, `pandas`, `numpy`, `stripe`, `huggingface_hub`, `tiktoken`, `python-jose`, `PyJWT`, `black`, `mypy` y `flake8` (estos tres, mezclados en producción).

**Dependencias innecesarias (frontend)**

- `date-fns` y `dayjs` a la vez.
- Assets de plantilla sin usar (`react-logo*.png`, `partial-react-logo.png`, `SpaceMono`).
- `scripts/cmd-guard` de Emergent en `preinstall`.
- `slug` y `scheme` = `"frontend"`.

**Obsolescencia:** no evaluada contra el registro de paquetes (sin red de paquetes en esta revisión). *No verificado.*

## 8. Diseño

**Lo que respeta:**

- Paleta propia: rojo `#8B0000` / `#7A0000`, dorado `#C5A059`, marfil `#FDFBF7`, y altar en marrones cálidos oscuros.
- Serif Cormorant Garamond en títulos y Libre Franklin en el cuerpo.
- No usa Shadcn ni Tailwind: estilos propios con tokens en `src/theme.ts`.
- El carácter devocional y sobrio está bien encaminado.

**Lo que no cumple:**

- **Sin SRS Design System.** No hay capas Foundation / Vertical / Product ni tema `theme-misagradocorazon`. Los tokens son un objeto plano generado por Emergent (`design_guidelines.json`, "Editorial Mobile + Glass Luxe").
- **Tamaños de letra pequeños para público mayor.** 64 de 161 `fontSize` están entre 10 y 14 px (44 entre 10 y 13), sobre todo etiquetas, metadatos y el chat. El propio `design_guidelines.json` pide cargar a `lg` y `xl`.
- Solo tema claro. `userInterfaceStyle: automatic` en `app.json` sin tema oscuro definido.
- Icono y splash sobre fondo `#000000`. Iconos y splash por defecto de la plantilla: *no verificado* visualmente.
- Imágenes de stock (Pexels, Unsplash) y de santos (Wikimedia) enlazadas directamente, sin CDN ni control de licencia documentado.
- Un emoji 🔥 en el aviso de racha (`prayer.tsx:32`).
- Aspecto real en dispositivo: *no verificado* (sin ejecutar).

## 9. Veredicto

### Propuesta de stack (requiere tu aprobación)

**Backend: migrar a Node/Express + TypeScript manteniendo MongoDB. Recomendado.**

- A favor:
  - Cumple el requisito 8.
  - Es tu stack.
  - Permite compartir tipos con el frontend.
  - El backend es pequeño (54 endpoints, 903 líneas) y hay que rehacer igualmente la autenticación (C3), el seed (C1, C2), la votación (C4) y la privacidad (C5), que son la mitad del valor.
- En contra:
  - Reescribir cuesta unos días.
  - Los 32 tests hay que portarlos o reapuntarlos. Como son HTTP de caja negra, sirven casi tal cual como tests de contrato contra el backend nuevo.
- Alternativa (mantener FastAPI): más rápido a corto plazo, pero deja dos lenguajes y un requisito incumplido.

**Frontend: mantener Expo / React Native.** Encaja con la especificación (cross-platform obligatorio) y el trabajo es aprovechable.

**Panel: sacarlo de la app móvil.** Recomiendo una app web React independiente en `admin/`, con el mismo backend. No debe ir en el bundle de las stores y `CLAUDE.md` lo define como "panel de gestión web".

### Conservar, refactorizar, reescribir

| Prioridad | Acción | Qué |
|-----------|--------|-----|
| P0 | Inmediato, sin código | Repo a privado. Cambiar o invalidar las credenciales de staff en cualquier despliegue existente, incluida la preview de Emergent. Confirmar con el constructor qué cuentas y recursos tiene a su nombre. |
| P0 | Reescribir | Seed: solo catálogo real (santos, contenido) y nunca en producción. Fuera causas, votos, transparencia e intenciones inventados. Staff creado por script con credenciales del entorno. |
| P0 | Reescribir | Autenticación: Google con cuenta propia del fundador, sin Emergent. Base preparada para Apple Sign-In. Rate limiting, verificación de email y política de contraseñas. |
| P0 | Reescribir | Votación: índice único y operación atómica. Periodo del día 1 al 7 aplicado en servidor. |
| P0 | Refactorizar | Privacidad: quitar `user_id`, `prayed_by` y `user_name` de las respuestas públicas. |
| P1 | Reescribir | Backend a Node/Express TS modular por pilar (ritual, misa, causas, admin), si lo apruebas. |
| P1 | Refactorizar | Frontend: estructura por pilar, tipado estricto sin `any`, tema `theme-misagradocorazon` sobre el SRS Design System, tamaños tipográficos al alza, identificadores de app propios. |
| P1 | Implementar | Lo que falta del MVP: intenciones privadas, audio de meditación y oraciones, push programables, racha correcta, velas de la semana reales, resumen y grabación post-misa, anuncio del ganador. |
| P1 | Reescribir | Panel admin como web independiente, i18n incluido, con subida de medios. |
| P2 | Refactorizar | Chat de misa en tiempo real (WebSocket o servicio gestionado) para los picos del domingo. |
| P2 | Documentar | README técnico, `.env.example`, modelo de datos, API, dependencias y lista de simulado/pendiente (requisitos 4 a 7). |
| — | Conservar | Diccionario i18n de la app de usuario, `CandleFlame`, flujo de onboarding, contenido devocional del seed (santos y oraciones en ES/EN), paleta y tipografías como punto de partida, y los tests HTTP como contrato. |
| — | Eliminar | `.emergent/`, `test_result.md`, `test_reports/`, `memory/`, `scripts/cmd-guard`, assets de plantilla, `requirements.txt` actual. |

## 10. Integración con `main`

`conflict_250926_1728` no tiene ancestro común con `main` (verificado con `git merge-base`). Opción recomendada:

1. Crear `feature/entrega-constructor` desde la rama de Emergent.
2. Mergearla en una rama `docs/...` con `--allow-unrelated-histories` para unir código y documentación sin reescribir historia.
3. Integrarla en `main` por PR.

En esta sesión no se ha hecho: es un cambio de ramas remotas y queda a tu decisión.

## 11. Revisión de las correcciones (iteraciones 2 a 4)

- Rama: `conflict_250926_1728`, commits `24efb70`, `ba4d72c`, `3c0cc6c` y `55ecc8f`.
- Se guardaron en la misma rama y no en `feature/entrega-constructor-v2`, como se pidió.
- Revisión por lectura del diff. Sin ejecutar.

| Petición | Estado | Evidencia |
|----------|--------|-----------|
| 1. Staff solo desde variables de entorno | **Hecho** | `seed.py` lee `SEED_*_EMAIL` / `SEED_*_PASSWORD` y, si la cuenta existe, sobrescribe su contraseña. Los tests leen las mismas variables. **Pendiente:** la contraseña antigua `Sagrado2026` sigue en el historial git (commits `825a786` y `ba4d72c`) y en `test_reports/iteration_2.json`. Según `iteration_3.json` ya no funciona en la preview (401), pero hay que tratarla como quemada. |
| 2. Seed sin datos inventados | **Hecho** | Eliminadas las causas, votos, transparencia, intenciones y misa de ejemplo. La lista de palabras de moderación, que se había perdido en la iteración 3, se restaura en la 4 (`MODERATION_WORDS`, `seed.py:157`), con 2 tests nuevos. |
| 3. Voto único | **Hecho** | Índice único `votes(user_id, month)` y `DuplicateKeyError` → 400. El `$inc` del contador va aparte y no es atómico con la inserción: si falla entre ambas operaciones, el voto queda sin contar. Riesgo bajo. |
| 4. Privacidad en endpoints públicos | **Hecho** | Quitados `user_id`, `prayed_by` y `user_name` de intenciones, velas comunitarias y chat. Se añade `already_prayed`. |
| 5. Tipografía ≥16 px lectura / ≥14 px secundarias | **Hecho** (iteración 4) | 0 de 162 `fontSize` por debajo de 14. Los textos de lectura revisados (evangelio, meditación, santo, intenciones, causas, chat) están en 16–17 px. Etiquetas y metadatos en 14–15 px. |
| 6. Textos "público y auditado" / "20 % de cada vela" | **Hecho** | Ahora dice "20 % de la facturación mensual". |
| 7. `.env.example` | **No llega al repo** | Según `test_reports/iteration_4.json` existe en el entorno de Emergent, pero el `.gitignore` tiene el patrón `.env.*`, que también excluye `.env.example`. Solución: añadir `!.env.example` al `.gitignore`. |
| 8. Rama `feature/entrega-constructor-v2` | **No hecho** | Las iteraciones 4 (`caebefe`, `67b47ed`) se guardaron otra vez en `conflict_250926_1728`. |
| — Pagos reales | Correcto | No se ha integrado RevenueCat, Stripe ni ningún SDK de pagos. |

Cambios de diseño en estas iteraciones:

- `CandleFlame` rehecho en SVG (`react-native-svg`, dependencia nueva) con variantes `pillar` (login), `basic`, `solemn` y `permanent`, más un modo `mourning` para difuntos (ámbar).
- Logo oficial de Google.
- Títulos en **Playfair Display** en lugar de Cormorant Garamond: pendiente de tu aprobación.
- Las velas guardan ahora `category` (`general` / `difuntos`).

## 12. Incoherencias de documentación (pendientes para los SDD)

1. **Pagos:** la especificación dice Stripe (§5.2, §7) y a la vez IAP para consumibles (§9.1). El prototipo no resuelve nada: simula sin modelo de pago.
2. **Apple Sign-In:** entra en el MVP según la especificación. `CLAUDE.md` lo exige antes de la App Store.
3. **Pagos reales:** en la Fase 1 de la especificación. Simulados según `CLAUDE.md`, que manda.
4. **Panel de gestión:** no está en la especificación; solo en `CLAUDE.md`.
5. **`docs/informe-maestro.docx`:** referenciado y no presente.
6. **Verificación de identidad para votar:** la especificación pide email + fingerprint + rate limiting. Hay que fijar el nivel del MVP.
7. **Sesiones:** la especificación pide JWT con refresh; el prototipo usa sesiones opacas. Decidir en el SDD de autenticación.
8. **"20 % de cada vela" (texto de la app)** frente a "20 % de la facturación mensual" (especificación §1, §4.2).
