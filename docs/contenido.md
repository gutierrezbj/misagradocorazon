# Gestión de contenido (panel)

Alcance de SDD-02 (módulos santoral y contenido diario, con audio) y SDD-05 US-19 (CRUD de santos con subida de audio e imagen a R2). Rol necesario: **editor** o superadmin. Cada cambio queda en `admin_audit_log`.

## Contenido diario

- **Qué se prepara:** para cada fecha, el evangelio (cita y texto ES/EN), la meditación, las oraciones de mañana y noche, el santo del día y el audio de cada parte en cada idioma.
- **Calendario:** el panel muestra los próximos 21 días. Marca los que faltan y, para los que están listos, qué audio hay en cada idioma.
- **Días sin contenido:** la app no muestra nada ese día y el santo del día no se notifica. Nunca se sirve el contenido de otro día.
- **Santo del día:** solo se pueden elegir santos visibles.

## Santoral

- **Qué incluye cada ficha:** nombre, fiesta (MM-DD), imagen, audio ES/EN, historia, advocaciones y oración (ES/EN), si es elegible como patrón en el onboarding y el orden en la lista.
- **Ocultar un santo:** es una baja lógica; se puede **recuperar**.
- **Cuándo no se puede ocultar:** si es el patrón de algún fiel o el santo de un día próximo. Su altar o ese día se quedarían sin santo.

## Subida de ficheros a Cloudflare R2

- **Cómo sube el panel:** directamente a R2 con una URL firmada que dura 10 minutos. La API nunca recibe el fichero.
- **Tipo y tamaño:** van firmados, así que R2 rechaza cualquier otro fichero.

| Tipo | Formatos | Máximo |
|---|---|---|
| Imagen | JPG, PNG, WebP | 5 MB |
| Audio | MP3, M4A (AAC) | 50 MB |

- **Rutas en el bucket:** `image/AAAA-MM/<uuid>.<ext>` y `audio/AAAA-MM/<uuid>.<ext>`. Se guarda la URL pública.
- **Sin R2 configurado:** el panel lo avisa y permite **pegar la URL** de un fichero ya alojado.

### Qué hay que crear, a nombre del fundador

1. **Cuenta de Cloudflare** con R2 activado y un bucket, por ejemplo `msc-media`.
2. **Acceso público de lectura:** un dominio propio conectado al bucket, por ejemplo `media.misagradocorazon.com`. Es la `R2_PUBLIC_BASE_URL`.
3. **Token de API de R2:** con permiso de **escritura de objetos solo en ese bucket**. Da `R2_ACCESS_KEY_ID` y `R2_SECRET_ACCESS_KEY`.
4. **CORS del bucket:** permitir `PUT` desde el origen del panel, con la cabecera `Content-Type`. Por ejemplo:
   ```json
   [{ "AllowedOrigins": ["https://panel.misagradocorazon.com"], "AllowedMethods": ["PUT"], "AllowedHeaders": ["Content-Type"], "MaxAgeSeconds": 3600 }]
   ```
5. **Variables de la API en Railway:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` y `R2_PUBLIC_BASE_URL`.

R2 admite peticiones `Range`, que el reproductor necesita para saltar dentro del audio (`docs/audio.md`).

## Imágenes actuales de los santos

- **Las del seed de desarrollo** siguen apuntando a Wikimedia y Pexels, con licencias sin verificar (`docs/fuentes-imagenes.md`).
- **Antes de publicar:** hay que subirlas a R2 desde el panel, una vez verificada la licencia de cada una.
