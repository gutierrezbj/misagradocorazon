# Staging provisional en el VPS

Aprobado por el fundador el 29-sep-2026 hasta que exista la cuenta de Railway (`docs/despliegue.md`).
Mismas imágenes que Railway, así que el paso posterior no cambia código.

## Cómo funciona

- **Imágenes:** GitHub Actions las construye en cada push a `main` (`.github/workflows/staging-images.yml`) y las sube a GHCR:
  - `ghcr.io/gutierrezbj/misagradocorazon-api` (API y worker);
  - `ghcr.io/gutierrezbj/misagradocorazon-admin` (panel, con la URL de la API de staging fijada);
  - `ghcr.io/gutierrezbj/misagradocorazon-web` (beta web instalable, con la URL de la API de staging fijada; `docs/beta-web.md`).

  Etiquetas: `staging` (último `main`) y el SHA de cada commit. El VPS no compila: tiene 1 CPU y comparte máquina con otros proyectos.
- **Servicios** (`compose.yml`): `db` (PostgreSQL 16), `migrate` (aplica las migraciones y termina), `api`, `worker`, `admin` y `web`.
- **Puertos (offset +270 del Catálogo de Infraestructura JRGB):** panel `127.0.0.1:3270`, API `127.0.0.1:4270`, beta web `127.0.0.1:5270`, PostgreSQL `127.0.0.1:6270`. El worker no tiene HTTP. Nada en `0.0.0.0`: lo publica con HTTPS el nginx del VPS.
- **Contenedores:** `msc-db`, `msc-migrate` (termina tras migrar), `msc-api`, `msc-worker`, `msc-admin`, `msc-web` y `msc-backup`.
- **Consumo estimado:** unos 600 MB de RAM en marcha y 3 GB de disco para las imágenes.

## Primer despliegue

1. **DNS** (Hostinger): registros A de `api-staging.misagradocorazon.com`, `admin-staging.misagradocorazon.com` y `app.misagradocorazon.com` (beta web) a la IP del VPS.
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
   sudo certbot --nginx -d api-staging.misagradocorazon.com -d admin-staging.misagradocorazon.com -d app.misagradocorazon.com
   ```
   - `api-staging…` → `127.0.0.1:4270`, con WebSocket en `/socket.io/` (chat de misa);
   - `admin-staging…` → `127.0.0.1:3270`;
   - `app…` → `127.0.0.1:5270` (beta web).

   La API confía en un salto de proxy (`trust proxy` = 1): nginx le pasa la IP real en `X-Forwarded-For`.
6. **Catálogo de santos y primer superadmin:**
   ```bash
   docker compose exec api tsx prisma/seed-catalog.ts
   docker compose exec api tsx src/cli/create-staff.ts --email tu@correo.com --name "Juan"
   ```
7. **Comprobaciones:** las de `docs/despliegue.md` (health, login en el panel, worker en marcha con `docker compose logs worker`).
8. **Monitorización** (Protocolo de Kickoff, fase 5). `msc-migrate` no se registra: termina tras migrar y saldría como caído.
   - **healthcheck.sh** (Servidor 2, cada 5 min, alerta por Telegram): añadir al array `SERVICES` de `/opt/scripts/healthcheck.sh`:
     ```bash
     "MiSagradoCorazon-DB|msc-db|docker"
     "MiSagradoCorazon-API|msc-api|docker"
     "MiSagradoCorazon-Worker|msc-worker|docker"
     "MiSagradoCorazon-Admin|msc-admin|docker"
     "MiSagradoCorazon-Web|msc-web|docker"
     "MiSagradoCorazon-Backup|msc-backup|docker"
     ```
   - **SA99** (su MongoDB vive en el Servidor 1):
     ```javascript
     // ssh root@72.62.41.234 → docker exec -it sa99-mongo mongosh ... → use sa99
     db.servers.updateOne(
       { _id: "vps-staging" },
       { $set: { "projects.MiSagradoCorazon": {
           containers: ["msc-db", "msc-api", "msc-worker", "msc-admin", "msc-web", "msc-backup"],
           domain: "api-staging.misagradocorazon.com"
       } } }
     );
     ```
     Después, lo mismo en `SEED_SERVERS` (`service.py` del repo de SA99) y pulsar "Escanear" en Red de Servidores.
   - **Copias de seguridad:** contenedor `msc-backup`, en la sección siguiente. Obligatorias antes de abrir la beta a fieles reales.

## Copias de seguridad

- **Qué hace:** el contenedor `msc-backup` hace cada día a las 03:30 UTC, y una vez al arrancar:
  1. un `pg_dump` de la base de datos;
  2. lo cifra con AES-256 y `BACKUP_PASSPHRASE`;
  3. lo sube a un bucket de Cloudflare R2;
  4. borra las copias de más de 7 días.
  - Código en `deploy/staging/backup/`.
- **Qué recibe:** solo la conexión a la base de datos y lo de R2, nada de los secretos de la API.
- **Alta (una vez):**
  1. En Cloudflare, con la cuenta del fundador, crear un bucket **privado** solo para copias (p. ej. `msc-backups`), distinto del de medios.
  2. Crear un token de R2 con lectura y escritura **solo en ese bucket**.
  3. Rellenar en `.env` estas variables:
     - `BACKUP_DEST` (p. ej. `:s3:msc-backups/staging`);
     - `BACKUP_PASSPHRASE`, generada con `openssl rand -base64 32`;
     - `BACKUP_S3_ENDPOINT`, `BACKUP_S3_ACCESS_KEY_ID` y `BACKUP_S3_SECRET_ACCESS_KEY`.
  4. **Guardar `BACKUP_PASSPHRASE` y `INTENTIONS_KEY` fuera del VPS**, en el gestor de contraseñas. Sin la primera la copia no se abre; sin la segunda, las intenciones restauradas no se pueden leer.
  5. `docker compose up -d backup`, y comprobar en `docker compose logs backup` que aparece `[backup] msc-… subida`.
- **Vigilancia:** el contenedor pasa a `unhealthy` si la última copia buena tiene más de 26 h. Avisa `healthcheck.sh`.
- **Restaurar:**
  ```bash
  docker compose exec backup restore.sh list                                # copias disponibles
  docker compose exec backup restore.sh msc-2026-12-01T0330Z.dump.enc --yes # sustituye la base de datos
  ```
  Antes de abrir la beta, conviene hacer una restauración de prueba en una base de datos aparte, para saber que las copias sirven: `PGDATABASE=prueba`, creada antes con `createdb`.
- **Probado (24-nov-2026), con PostgreSQL 16 y rclone en local:**
  - la copia cifrada no deja leer ningún texto;
  - la restauración pide `--yes`;
  - una clave equivocada no restaura nada;
  - restaurada en una base de datos nueva, tiene los mismos santos, usuarios, velas y migraciones que la original;
  - si `pg_dump` falla, no se sube nada.

  La imagen no se pudo construir en el entorno de desarrollo (Docker Hub respondió 429); la construye el CI.

## Actualizar

```bash
docker compose pull && docker compose up -d
```

Aplica las migraciones nuevas antes de arrancar la API. Para volver a una versión anterior: `IMAGE_TAG=<sha>` en `.env` y el mismo comando. Ojo: las migraciones no se deshacen solas.

## Al pasar a Railway

Se crea el entorno staging de Railway (`docs/despliegue.md`), se cambian los DNS y se para este stack (`docker compose down`). Los datos de staging no se migran: son de prueba.
