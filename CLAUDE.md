## Reglas para Claude Code (permanentes)

### Contexto de la fase
- El código inicial lo genera un constructor externo. Tras su entrega, el equipo del fundador asume el mantenimiento y la evolución.
- Antes de cualquier trabajo, leer `docs/informe-maestro.docx`, `docs/especificacion-funcional.docx` y `docs/requisitos-entrega.md`.

### Metodología: SDD-first (no negociable)
- Metodología SRS: SDD-01 a SDD-08 completos y aprobados por el fundador ANTES de tocar código.
- Si existe `docs/sdd/`, seguir esa plantilla exactamente. Si no existe, pedirla al fundador; no inventar la estructura de los SDD.
- Sin SDD aprobado no hay commits de código. Solo documentación.

### Decisiones cerradas del MVP
- Alcance: los 3 pilares en versión básica (ritual diario + misa en vivo + votación de causas) + panel de gestión web con roles (superadmin, editor, moderador).
- Pagos: simulados. Sin cobro real hasta que exista la entidad legal. Flujo de vela completo sin cobro.
- Login: email/contraseña + Google. Apple Sign-In obligatorio antes de publicar en App Store.
- Idioma: bilingüe ES/EN con i18n desde la base.
- Muro de testimonios: FUERA hasta v3. No implementar ni dejar preparado.

### Diseño
- Nada de defaults genéricos de Shadcn/Tailwind.
- Aplicar el SRS Design System (Foundation / Vertical Themes / Product-Specific) con tema propio `theme-misagradocorazon`.
- Carácter visual: devocional, cálido, sagrado, premium. Rojo Sagrado Corazón, dorado de acento, marfil. Serif para títulos, sans legible para el cuerpo, tamaños generosos (hay usuarios mayores). Nada kitsch.

### Reglas técnicas
- TypeScript. Estructura modular por pilar: ritual, misa, causas, admin.
- Ningún secreto en el repo. Solo `.env.example`.
- Trabajo en ramas (`feature/...`, `fix/...`, `docs/...`), nunca directo a main. PR con descripción.
- No romper el build existente del constructor sin avisar y justificar.
- Stack de referencia del fundador: Node.js/Express + React + MongoDB. Si el constructor usó otro backend (Supabase, Firebase), documentarlo en la auditoría y proponer mantener o migrar con pros y contras. No migrar sin aprobación.

### Restricciones legales
- Nada vinculado a System Rapid Solutions S.L. (cuentas, emails, licencias, referencias en código).
- Cuentas de servicios a nombre del fundador.
