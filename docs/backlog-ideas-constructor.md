# Ideas propuestas por el constructor (Emergent)

Registro de las mejoras que Emergent propuso durante las iteraciones del 25/09/2026, con la decisión tomada o pendiente. No es alcance aprobado: cualquier idea que entre se especifica primero en los SDD.

Leyenda: **Hecho** (ya está en el código de `conflict_250926_1728`), **Rechazado**, **Post-MVP** (se valora después del lanzamiento), **SDD** (se decide al redactar los SDD).

## Vela y altar

| Idea | Origen | Estado | Nota |
|------|--------|--------|------|
| Veladora en vaso con variantes básica / solemne / permanente | Iteración 1 ("Estilos de vela") | **Hecho** | Se pidió como veladora en vaso rojo, no como "vela por santo". |
| Cruz dorada en los vasos solemne y permanente | Iteración 2 | **Hecho** | Cruz fina en dorado. Sin más ajustes (pregunta 2). |
| Vela de difuntos | Iteración 2 | **Hecho** | Vaso ámbar con selector manual. |
| Detección automática de "difuntos" en el texto de la intención | Pregunta 3 | **Rechazado** | Falla por palabras clave y el tema es sensible. Se queda el selector manual. |
| Vela fotorrealista con humo y chisporroteo al encender | Iteración 1 | **Post-MVP** | |
| Sonido al encender (chisporroteo, fósforo) | Iteración 2 | **Post-MVP** | El audio solo se prueba en un build real. |
| Altar vivo según la hora del día | Iteración 1 y pregunta 5 | **Post-MVP** | |
| Pantalla del cirio del login como imagen de marca para presentar al padre | Iteración 2 ("Cofre de marca") | **Rechazado por ahora** | No es prioridad. |

## Contenido

| Idea | Origen | Estado | Nota |
|------|--------|--------|------|
| Cargar santos reales y causas reales del mes | Pregunta 1 | **Rechazado** | No hay causas reales aprobadas y no se inventan. El catálogo de santos se queda como está; el equipo cargará el contenido desde el panel. |
| Reproductor de audio para meditación y oraciones | Pregunta 4 | **SDD** | Respuesta dada: solo un reproductor para una URL que pega el editor, sin audio generado por IA. Pendiente de confirmar que Emergent lo implementó. |
| Rosario guiado en audio | Pregunta 4 y backlog del PRD (P1) | **Post-MVP** | Segundo anillo de la especificación (v1.1). |
| Novenas guiadas | Backlog del PRD (P1) | **Post-MVP** | Segundo anillo (v1.1). |
| Calendario litúrgico con cambios visuales | Backlog del PRD (P1) | **Post-MVP** | Segundo anillo (v1.1). |
| Examen de conciencia, Ángelus | Backlog del PRD (P2) | **Post-MVP** | Segundo anillo (v1.1). |
| Localizador de parroquias, multimoneda | Backlog del PRD (P2) | **Post-MVP** | Tercer anillo (v2). |
| Muro de testimonios moderado | Backlog del PRD (P2) | **Rechazado** | Fuera hasta v3 por decisión fundacional (`CLAUDE.md`). |

## Plataforma

| Idea | Origen | Estado | Nota |
|------|--------|--------|------|
| Pagos reales (RevenueCat / Stripe) | Iteración 1 y pregunta 6 | **Rechazado hasta que exista la entidad legal** | Tampoco se deja preparado el SDK. Queda por decidir compras dentro de la app o Stripe (ver auditoría §12.1). |
| Push reales (requieren `google-services.json` y un build) | Backlog del PRD (P0) | **SDD** | Las cuentas de Firebase tienen que estar a nombre del fundador. |
| Subida de imágenes y audio en el panel mediante almacenamiento de objetos | Backlog del PRD (P1) | **SDD** | El proveedor, a nombre del fundador. |
| Publicar / desplegar y generar builds iOS/Android desde Emergent | Notas de cada iteración | **Rechazado por ahora** | Bundle ID de Emergent, login de Google a través de Emergent. Ver auditoría C3. |
| Migrar las propiedades `shadow*` a `boxShadow` (aviso de RN Web) | Informe de pruebas, iteración 1 | **SDD** | Menor. |
| Botón de cerrar sesión accesible en el perfil para las pruebas | Informe de pruebas, iteración 1 | **SDD** | Menor. |
