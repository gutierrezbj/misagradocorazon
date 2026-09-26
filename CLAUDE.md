## Reglas para Claude Code (permanentes)

Última revisión: 26-sep-2026. Arquitectura objetivo aprobada por el fundador en esta fecha.

### Contexto de la fase
- El prototipo lo entregó un constructor externo (Emergent) y está integrado en `main`: la app móvil vive en `apps/mobile` y el backend provisional en `backend/`. El equipo del fundador asume el mantenimiento y la evolución.
- El diseño y la app móvil de esa entrega son la base del producto. El backend se sustituye (ver "Arquitectura objetivo").
- Antes de cualquier trabajo, leer:
  - Los SDD del cuaderno de Notion: https://app.notion.com/p/3407981f08ef81eba744fee55d42e461 (SDD-01 a SDD-08, Documentación, Checklist de Kickoff).
  - `docs/especificacion-funcional.docx` y `docs/requisitos-entrega.md`.
  - `docs/auditoria-entrega.md`: estado real del código entregado.
  - `docs/propuesta-cambios-sdd.md`: registro de los cambios aprobados y aplicados a los SDD el 26-sep-2026.

### Metodología: SDD-first (no negociable)
- SDD-01 a SDD-08 completos y aprobados por el fundador ANTES de tocar código.
- Los SDD viven en Notion, que es la fuente de verdad. La plantilla es la de esas páginas; no se inventa otra estructura.
- Si un SDD de Notion contradice este fichero, se avisa al fundador antes de actuar. No se decide por cuenta propia.
- Sin SDD aprobado no hay commits de código. Solo documentación.
- Claude no edita Notion sin visto bueno explícito del fundador.

### Decisiones cerradas del MVP
- **Alcance:** los 3 pilares en versión básica (ritual diario, misa en vivo, votación de causas) más un panel de gestión web con roles (superadmin, editor, moderador) centrado en KPIs.
- **Pagos:** simulados, detrás de una capa de pagos intercambiable. Sin cobro real hasta que exista la entidad legal; entonces, compras dentro de la app vía RevenueCat (SDD-04, ADR-003).
- **Cumplimiento de Apple (guideline 3.2.2.iv), bloqueante:** ninguna pantalla del flujo de compra de la vela, incluida la de confirmación, menciona causas, donaciones ni el 20%. El 20% se comunica fuera del flujo de pago.
- **Login:** email/contraseña y Google. Apple Sign-In obligatorio antes de publicar en la App Store.
- **Idioma:** bilingüe ES/EN con i18n desde la base. Ningún texto de la interfaz escrito a mano sin pasar por i18n, tampoco en el panel.
- **Audio:** el santo del día y las oraciones de mañana y noche llevan reproductor con audio en segundo plano. El audio lo graba el equipo; no se genera con IA.
- **Muro de testimonios:** FUERA hasta v3. No se implementa ni se deja preparado.

### Arquitectura objetivo (aprobada 26-sep-2026)
- **Monorepo:** `apps/mobile`, `apps/admin`, `apps/api`, `packages/shared` (tipos, esquemas de validación, i18n).
- **App móvil:** Expo + React Native + TypeScript, en `apps/mobile` (antes `frontend/` de la entrega), a reorganizar por pilar.
- **API:** Node.js + TypeScript + Express + Zod, en módulos `auth`, `ritual`, `misa`, `causas`, `admin`.
- **Base de datos:** PostgreSQL con Prisma. Los movimientos de dinero van a un libro de solo inserción; el 20% y la transparencia se calculan de ahí, nunca se teclean a mano.
- **Autenticación:** librería propia en el backend (Better Auth): email, Google, Apple, sesiones y roles. Nada que dependa de Emergent.
- **Panel:** app web React (Vite) independiente, fuera del bundle de las stores. Registro de quién hace cada cambio y KPIs.
- **KPIs:**
  - Métricas de negocio desde Postgres, con agregados diarios.
  - Analítica de producto con PostHog: embudos, retención, cohortes.
- **Tareas programadas:** pg-boss (sobre Postgres) para votación, push y agregados.
- **Chat de misa:** Socket.IO en la API.
- **Push:** expo-notifications y el servicio de push de Expo.
- **Medios:** Cloudflare R2.
- **Hosting:** Railway.
- **Transición:** desde el 26-sep-2026 la app y el panel usan `apps/api`. `backend/` (FastAPI + MongoDB) ya no lo usa nada: no se amplía y se retirará con aprobación del fundador.

### Diseño
- Mi Sagrado Corazón tiene identidad propia. No hereda la de ninguna agencia ni otro proyecto. **System Rapid Solutions ya no existe y su Design System no aplica.**
- La base visual es el tema de la entrega (`apps/mobile/src/theme.ts`):
  - Colores: rojo Sagrado Corazón, dorado de acento y marfil; altar en tonos oscuros cálidos.
  - Tipografía: serif en los títulos (Playfair Display) y sans en el cuerpo (Libre Franklin).
- Carácter: devocional, cálido, sagrado, premium. Nada kitsch. Nada de valores por defecto de librerías de UI.
- Tamaños mínimos (hay usuarios mayores): 16 px para texto de lectura y 14 px para el resto. Nunca por debajo.

### Reglas técnicas
- TypeScript en todo el código nuevo. Estructura por pilar: ritual, misa, causas, admin.
- Ningún secreto en el repo. Solo `.env.example`.
- Trabajo en ramas (`feature/...`, `fix/...`, `docs/...`), nunca directo a `main`. PR con descripción.
- No romper lo que funciona de la entrega sin avisar y justificar.
- Convenciones de código, commits y testing: SDD-06 y SDD-07 de Notion.

### Restricciones legales
- Ningún activo, cuenta, email, licencia ni referencia en el código vinculado a System Rapid Solutions S.L.
- Todas las cuentas de servicios (stores, Expo, RevenueCat, Railway, Cloudflare, PostHog, Google, Apple) a nombre del fundador o de la futura sociedad. Nunca a nombre del constructor.
- Las intenciones de oración son datos de creencias religiosas (GDPR art. 9): cifrado, datos mínimos y jamás uso publicitario.
