# Staging provisional en el VPS

Aprobado por el fundador el 29-sep-2026 hasta que exista la cuenta de Railway (`docs/despliegue.md`).
Mismas imágenes que Railway, así que el paso posterior no cambia código.

## Cómo funciona

- **Imágenes:** GitHub Actions las construye en cada push a `main` (`.github/workflows/staging-images.yml`) y las sube a GHCR:
  - `ghcr.io/gutierrezbj/misagradocorazon-api` (API y worker);
  - `ghcr.io/gutierrezbj/misagradocorazon-admin` (panel, con la URL de la API de staging fijada).

  Etiquetas: `staging` (último `main`) y el SHA de cada commit. El VPS no compila: tiene 1 CPU y comparte máquina con otros proyectos.
- **Servicios** (`compose.yml`): `db` (PostgreSQL 16), `migrate` (aplica las migraciones y termina), `api`, `worker` y `admin`.
- **Red:** la API y el panel solo escuchan en `127.0.0.1` (puertos 18001 y 18080 por defecto). Los publica con HTTPS el proxy que ya tiene el VPS.
- **Consumo estimado:** unos 600 MB de RAM en marcha y 3 GB de disco para las imágenes.

## Primer despliegue

1. **DNS** (Hostinger): registros A de `api-staging.misagradocorazon.com` y `admin-staging.misagradocorazon.com` a la IP del VPS.
2. **Acceso a GHCR desde el VPS:** el repositorio es privado, así que las imágenes también lo son. Crear en GitHub un token clásico con el permiso `read:packages` y, en el VPS:
   ```bash
   echo <token> | docker login ghcr.io -u gutierrezbj --password-stdin
   ```
3. **Ficheros:** copiar `compose.yml` y `.env.example` a una carpeta del VPS (p. ej. `/opt/msc-staging`). Renombrar `.env.example` a `.env` y rellenarlo. Los secretos se generan con `openssl rand -base64 32`. **Guarda `INTENTIONS_KEY` fuera del VPS.**
4. **Arranque:**
   ```bash
   docker compose pull
   docker compose up -d
   docker compose ps          # migrate "exited (0)", api "healthy"
   curl -fsS localhost:18001/api/health
   ```
5. **Proxy HTTPS del VPS:**
   - `api-staging…` → `127.0.0.1:18001`, con WebSocket (el chat de misa usa Socket.IO);
   - `admin-staging…` → `127.0.0.1:18080`.

   La API confía en un salto de proxy (`trust proxy` = 1) para leer la IP real en los límites de peticiones.
6. **Catálogo de santos y primer superadmin:**
   ```bash
   docker compose exec api tsx prisma/seed-catalog.ts
   docker compose exec api tsx src/cli/create-staff.ts --email tu@correo.com --name "Juan"
   ```
7. **Comprobaciones:** las de `docs/despliegue.md` (health, login en el panel, worker en marcha con `docker compose logs worker`).

## Actualizar

```bash
docker compose pull && docker compose up -d
```

Aplica las migraciones nuevas antes de arrancar la API. Para volver a una versión anterior: `IMAGE_TAG=<sha>` en `.env` y el mismo comando. Ojo: las migraciones no se deshacen solas.

## Al pasar a Railway

Se crea el entorno staging de Railway (`docs/despliegue.md`), se cambian los DNS y se para este stack (`docker compose down`). Los datos de staging no se migran: son de prueba.
