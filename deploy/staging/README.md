# Staging provisional en el VPS

Aprobado por el fundador el 29-sep-2026 hasta que exista la cuenta de Railway (`docs/despliegue.md`).
Mismas imágenes que Railway, así que el paso posterior no cambia código.

## Cómo funciona

- **Imágenes:** GitHub Actions las construye en cada push a `main` (`.github/workflows/staging-images.yml`) y las sube a GHCR:
  - `ghcr.io/gutierrezbj/misagradocorazon-api` (API y worker);
  - `ghcr.io/gutierrezbj/misagradocorazon-admin` (panel, con la URL de la API de staging fijada).

  Etiquetas: `staging` (último `main`) y el SHA de cada commit. El VPS no compila: tiene 1 CPU y comparte máquina con otros proyectos.
- **Servicios** (`compose.yml`): `db` (PostgreSQL 16), `migrate` (aplica las migraciones y termina), `api`, `worker` y `admin`.
- **Puertos (offset +270 del Catálogo de Infraestructura JRGB):** panel `127.0.0.1:3270`, API `127.0.0.1:4270`, PostgreSQL `127.0.0.1:6270`. El worker no tiene HTTP; 5270 queda reservado. Nada en `0.0.0.0`: lo publica con HTTPS el nginx del VPS.
- **Contenedores:** `msc-db`, `msc-migrate` (termina tras migrar), `msc-api`, `msc-worker` y `msc-admin`.
- **Consumo estimado:** unos 600 MB de RAM en marcha y 3 GB de disco para las imágenes.

## Primer despliegue

1. **DNS** (Hostinger): registros A de `api-staging.misagradocorazon.com` y `admin-staging.misagradocorazon.com` a la IP del VPS.
2. **Acceso a GHCR desde el VPS:** el repositorio es privado, así que las imágenes también lo son. Crear en GitHub un token clásico con el permiso `read:packages` y, en el VPS:
   ```bash
   echo <token> | docker login ghcr.io -u gutierrezbj --password-stdin
   ```
3. **Ficheros:** copiar `compose.yml`, `nginx.conf` y `.env.example` a `/opt/apps/misagradocorazon/`. No se clona el repo ni se usa `--build`: el VPS no compila. Renombrar `.env.example` a `.env` y rellenarlo. Los secretos se generan con `openssl rand -base64 32`. **Guarda `INTENTIONS_KEY` fuera del VPS.**
4. **Arranque:**
   ```bash
   docker compose pull
   docker compose up -d
   docker compose ps          # migrate "exited (0)", api "healthy"
   curl -fsS localhost:4270/api/health
   ss -tlnp | grep docker-proxy | grep 0.0.0.0   # debe salir vacío
   ```
5. **nginx del VPS** (`nginx.conf` de esta carpeta):
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/misagradocorazon-staging
   sudo ln -s /etc/nginx/sites-available/misagradocorazon-staging /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d api-staging.misagradocorazon.com -d admin-staging.misagradocorazon.com
   ```
   - `api-staging…` → `127.0.0.1:4270`, con WebSocket en `/socket.io/` (chat de misa);
   - `admin-staging…` → `127.0.0.1:3270`.

   La API confía en un salto de proxy (`trust proxy` = 1): nginx le pasa la IP real en `X-Forwarded-For`.
6. **Catálogo de santos y primer superadmin:**
   ```bash
   docker compose exec api tsx prisma/seed-catalog.ts
   docker compose exec api tsx src/cli/create-staff.ts --email tu@correo.com --name "Juan"
   ```
7. **Comprobaciones:** las de `docs/despliegue.md` (health, login en el panel, worker en marcha con `docker compose logs worker`).
8. **Monitorización** (Protocolo de Kickoff, fase 5): registrar `msc-db`, `msc-api`, `msc-worker` y `msc-admin` en `healthcheck.sh` y el proyecto en SA99 (`vps-staging`, dominio `api-staging.misagradocorazon.com`). `msc-migrate` no: termina tras migrar.

## Actualizar

```bash
docker compose pull && docker compose up -d
```

Aplica las migraciones nuevas antes de arrancar la API. Para volver a una versión anterior: `IMAGE_TAG=<sha>` en `.env` y el mismo comando. Ojo: las migraciones no se deshacen solas.

## Al pasar a Railway

Se crea el entorno staging de Railway (`docs/despliegue.md`), se cambian los DNS y se para este stack (`docker compose down`). Los datos de staging no se migran: son de prueba.
