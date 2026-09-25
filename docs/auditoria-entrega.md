# Auditoría de entrega — Mi Sagrado Corazón

Fecha: 2026-09-25
Alcance: repositorio `gutierrezbj/misagradocorazon`, todas las ramas remotas.
Método: inspección directa del árbol de ficheros y del historial git. Sin ejecución de código (no hay código que ejecutar).

## 0. Hallazgo principal

**No hay entrega del constructor en el repositorio.** No existe ni una línea de código de aplicación, backend, panel ni configuración.

Evidencia:

- Ramas remotas: `main` (`df7d9ab`) y `claude/claude-code-permanent-rules-67yplp` (`2caef9e`). No hay más.
- Historial completo: 2 commits, ambos de documentación del fundador:
  - `df7d9ab docs: contexto fundacional del proyecto`
  - `2caef9e docs: reglas para Claude Code`
- Ficheros en el repo (todas las ramas):
  ```
  README.md
  CLAUDE.md                          (solo en la rama claude/…)
  docs/requisitos-entrega.md
  docs/especificacion-funcional.docx
  ```
- Búsqueda de otros repositorios accesibles con "sagrado" en el nombre: solo aparece este.

Por tanto, los puntos 1 a 8 de la auditoría no se pueden evaluar sobre código. Abajo va cada punto con lo que sí se puede afirmar.

Posibles explicaciones, **sin verificar**: el constructor no ha empezado, trabaja en otro repositorio u organización a la que esta sesión no tiene acceso, o trabaja dentro de su propia plataforma sin exportar. Hay que confirmarlo con el constructor.

## 1. Stack real utilizado

No verificable. No hay `package.json`, `pubspec.yaml`, `Podfile`, `build.gradle`, `Dockerfile`, configuración de Firebase/Supabase ni ningún manifiesto de dependencias.

Solo existe el stack **sugerido** en la especificación (§5.2), abierto a propuesta del constructor: React Native o Flutter, Node.js/Express, MongoDB o PostgreSQL, Stripe, YouTube Live, FCM/APNS, Cloudflare/CloudFront, Mixpanel/Amplitude.

## 2. Estructura de carpetas

No hay estructura de código. Solo `docs/` con documentación del fundador.

## 3. Cumplimiento de `docs/requisitos-entrega.md`

| # | Requisito | Estado | Evidencia |
|---|-----------|--------|-----------|
| 1 | Código completo en el repo, commits frecuentes y descriptivos | No cumple | 0 commits del constructor. 0 ficheros de código. |
| 2 | Ejecutable fuera de la plataforma del constructor, con instrucciones | No cumple | No hay código ni instrucciones de instalación. |
| 3 | Cuentas de servicios a nombre del fundador | No verificable | No hay configuración que referencie cuentas. Requiere comprobación directa en cada consola (stores, Firebase, YouTube, BD, hosting). |
| 4 | README técnico (stack, estructura, `.env.example`, entorno, builds iOS/Android, despliegue) | No cumple | `README.md` es el del fundador, sin contenido técnico. No existe `.env.example`. |
| 5 | Documentación del modelo de datos y endpoints | No cumple | No existe. |
| 6 | Lista de dependencias y servicios de terceros | No cumple | No existe. |
| 7 | Lista de lo simulado o pendiente | No cumple | No existe. |
| 8 | TypeScript, estructura modular por pilar (ritual, misa, causas, admin) | No cumple | No hay código. |
| 9 | Ningún secreto en el repo | Cumple (trivialmente) | Revisados los 4 ficheros: no contienen claves ni tokens. Cumple porque no hay nada más. |

## 4. Funcionalidades frente a la especificación funcional

Implementado: nada.
Simulado: nada.
Falta: todo el MVP de §3.1 y §12 Fase 1:

- Onboarding con santo patrón (principal + secundarios), horarios de notificación, idioma.
- Vela virtual (selector de santo, intención, tipo de vela, flujo de pago — simulado según `CLAUDE.md` —, animación).
- Santo del día.
- Evangelio del día con meditación audio/texto.
- Oración de mañana y noche con streak.
- Intenciones personales.
- Muro de intenciones con "Rezo por ti", categorías y moderación.
- Misa en vivo: YouTube embebido, chat propio, velas colectivas, countdown, grabación post-misa.
- Causas del mes y votación (1 voto por usuario, progreso en tiempo real, anuncio día 8).
- Panel de transparencia (app y web).
- Perfil y ajustes.
- i18n ES/EN.
- Login email/contraseña + Google (Apple antes de publicar).

## 5. Panel de gestión

No existe ningún módulo. Estado frente a lo acordado:

| Módulo | Estado |
|--------|--------|
| Santoral | Falta |
| Contenido diario (evangelio, meditaciones, oraciones) | Falta |
| Causas | Falta |
| Misa (programación, enlace de emisión, grabaciones) | Falta |
| Moderación (muro de intenciones, chat de misa) | Falta |
| Usuarios y roles (superadmin, editor, moderador) | Falta |
| Transparencia | Falta |
| Métricas | Falta |
| Notificaciones | Falta |

Nota: la especificación funcional **no describe el panel de gestión**. Solo aparece en `CLAUDE.md` (alcance MVP y roles). Los módulos de la lista vienen de la petición del fundador, no de la especificación. Hay que especificarlos en los SDD.

## 6. Seguridad

Sin código no hay autenticación, roles ni validación que auditar.

Lo que sí se detecta:

- **El repositorio es público** (`visibility: public` según la API de GitHub). El `README.md` dice "Propiedad: Juan Gutiérrez Blanco. Confidencial." y `docs/especificacion-funcional.docx` está marcado "Confidencial" e incluye modelo de negocio, estructura legal y la situación concursal de System Rapid Solutions S.L. **Recomendación: pasar el repo a privado ya**, antes de que entre código o configuración. Este cambio lo hace el fundador en GitHub → Settings → General → Danger Zone; esta sesión no lo ha tocado.
- Secretos expuestos: ninguno en los 4 ficheros actuales.

## 7. Calidad

No evaluable: sin tipado, tests, dependencias ni deuda técnica que medir.

## 8. Diseño

No evaluable: no hay UI, temas ni assets. No existe todavía `theme-misagradocorazon`.

## 9. Veredicto

| Acción | Qué | Prioridad |
|--------|-----|-----------|
| Conservar | `README.md`, `docs/requisitos-entrega.md`, `docs/especificacion-funcional.docx`, `CLAUDE.md` | — |
| Refactorizar | Nada (no hay código) | — |
| Reescribir | Nada (no hay código) | — |
| Aclarar con el constructor | Dónde está el código, en qué plataforma, en qué fecha se entrega en este repo | P0 |
| Pasar el repo a privado | Contiene documentación confidencial | P0 |
| Subir `docs/informe-maestro.docx` | `CLAUDE.md` y `README.md` lo referencian y no existe en el repo | P1 |
| Subir la plantilla `docs/sdd/` | Requisito para arrancar SDD-01 a SDD-08 | P1 |

La auditoría técnica real queda pendiente de que exista código en el repositorio. Cuando se reciba, se rehace este documento sobre esa entrega.

## 10. Incoherencias detectadas en la documentación

Para resolver en los SDD. No las resuelvo yo; solo las señalo.

1. **Pagos: Stripe vs. IAP.** La especificación (§5.2 y §7) pone Stripe + Apple Pay/Google Pay como procesadores de las velas. La misma especificación (§9.1) dice que las velas son "consumibles" para Apple y aplica IAP con comisión del 15–30 %. Para contenido digital consumido dentro de la app, las stores exigen normalmente su propio sistema de pago (IAP / Google Play Billing), no Stripe. Esto afecta al diseño del flujo de vela aunque ahora esté simulado: conviene simular el flujo que será el definitivo.
2. **Apple Sign-In.** La especificación lo incluye en el onboarding del MVP. `CLAUDE.md` lo aplaza a "antes de publicar en App Store". Compatible, pero hay que dejarlo explícito en el SDD de autenticación.
3. **Pagos reales.** La especificación los pone en Fase 1. `CLAUDE.md` los deja simulados hasta que exista la entidad legal. Manda `CLAUDE.md` (decisión cerrada posterior).
4. **Panel de gestión.** Ausente en la especificación, presente en `CLAUDE.md`. Ver §5.
5. **`docs/informe-maestro.docx`.** Referenciado y no presente.
6. **Verificación de identidad para votar.** La especificación pide verificación de email + device fingerprint + rate limiting (+ teléfono si hay fraude). `CLAUDE.md` no lo menciona en el alcance básico. Hay que decidir qué nivel entra en el MVP.
