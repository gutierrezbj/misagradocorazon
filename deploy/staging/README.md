# Beta en el KVM 1

Decisión del fundador del 26-nov-2026: toda la beta de Mi Sagrado Corazón corre en el KVM 1. Railway queda como plan futuro del SDD (`docs/despliegue.md`), no como destino actual. La beta abre el 1-dic-2026 (`docs/beta-web.md`).

## Reglas

- **Quién despliega:** solo una sesión de Claude en el Mac del fundador y con su sí. Nunca desde la nube. El DNS lo toca solo esa sesión, también con su sí.
- **Dónde:** carpeta `/opt/apps/msc`. Todos los comandos empiezan por `cd /opt/apps/msc && docker compose -p msc -f compose.yml …`. Con `-f` relativo y desde otra carpeta, compose falla.
- **Nada se construye en el servidor:** solo se descargan imágenes ya construidas, las propias de GHCR y `postgres:16` de Docker Hub. Nada de clonar el repositorio ni de `--build`.
- **Secretos a la vista, nunca.** En el servidor no se usan `docker compose config` sin `--quiet`, `docker inspect` de los contenedores de MSC, `env` ni `cat .env`: imprimen los secretos. Para validar, `config --quiet`.
- **Nunca `docker compose down -v`.** Nada de `prune`, `down` ni `rm` fuera de `/opt/apps/msc`.
- **La base nace limpia:** ninguna comprobación crea usuarios ni velas. `seed.ts` y `scripts/load-chat.ts` nunca se ejecutan en la beta.
- Donde haga falta la dirección del servidor, se escribe `<KVM 1>`.

## Cómo funciona

- **Imágenes:** GitHub Actions las construye en cada push a `main` (`.github/workflows/staging-images.yml`) y las sube a GHCR. Son públicas, así que no hace falta `docker login`:
  - `ghcr.io/gutierrezbj/misagradocorazon-api` (API, worker y migraciones);
  - `ghcr.io/gutierrezbj/misagradocorazon-admin` (panel, con la URL de la API de staging fijada);
  - `ghcr.io/gutierrezbj/misagradocorazon-web` (beta web instalable, con la URL de la API de staging fijada; `docs/beta-web.md`);
  - `ghcr.io/gutierrezbj/misagradocorazon-backup` (copias de seguridad).

  Cada imagen lleva como etiqueta el SHA completo del commit. `IMAGE_TAG` en `.env` es siempre ese SHA de 40 caracteres, el del commit de `main` cuyo `staging-images` terminó en verde. Nunca el SHA corto ni `staging`.
- **Contenedores y puertos** (desplazamiento 270, siempre en `127.0.0.1`):

  | Servicio | Contenedor | Puerto |
  | --- | --- | --- |
  | `db` (PostgreSQL 16) | `msc-db` | 6270 |
  | `migrate` (aplica las migraciones y termina) | `msc-migrate` | — |
  | `api` | `msc-api` | 4270 |
  | `worker` | `msc-worker` | — |
  | `admin` (panel) | `msc-admin` | 3271 |
  | `app` (beta web) | `msc-app` | 5270 |
  | `backup` | `msc-backup` | — |

  El 3270 queda para la web pública. Nada escucha en `0.0.0.0`: lo publica con HTTPS el nginx del KVM 1.
- **Límites** (aprobados por el fundador, sin medir): memoria y swap iguales por servicio (db 512m, migrate 512m, api 640m, worker 512m, admin 128m, app 128m, backup 256m), CPU (db 0.5, migrate 0.5, api 0.5, worker 0.3, backup 0.5, admin 0.25, app 0.25) y `pids_limit`. El KVM 1 tiene 1 vCPU y unos 2,8 GB libres compartidos. El consumo real se verá al desplegar.

## Primer despliegue

Todo desde el Mac del fundador, con su sí.

1. **Imágenes del SHA.** Antes de nada, comprobar que las cuatro imágenes del SHA se descargan sin login:
   ```bash
   SHA=<sha de 40 caracteres>
   for i in api admin web backup; do docker pull ghcr.io/gutierrezbj/misagradocorazon-$i:$SHA; done
   ```
   Si alguna da «manifest unknown» o «denied», se para y se pregunta al fundador. Nunca se pone un token en el servidor sin su sí.
2. **Ficheros.** `compose.yml`, `nginx.conf` y `.env.example` salen del mismo SHA que `IMAGE_TAG`. En el Mac, en una carpeta temporal:
   ```bash
   git archive "$SHA" deploy/staging/compose.yml deploy/staging/nginx.conf deploy/staging/.env.example | tar -x
   rsync -e "ssh -o BatchMode=yes" deploy/staging/compose.yml deploy/staging/nginx.conf deploy/staging/.env.example root@<KVM 1>:/opt/apps/msc/
   ```
   `rsync` sin `--delete`: borraría `.env` y `backups/`. Con `ssh -n` no llega nada por una tubería.
3. **Carpeta de copias y secretos.** Antes del primer `up`. Cada secreto se escribe con `$(openssl rand …)` dentro del propio comando, sin sacarlo por pantalla:
   ```bash
   ssh -o BatchMode=yes root@<KVM 1> 'cd /opt/apps/msc && install -d -m 700 /opt/apps/msc/backups && umask 077 && cp .env.example .env \
     && sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 32)|" .env \
     && sed -i "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$(openssl rand -base64 32)|" .env \
     && sed -i "s|^INTENTIONS_KEY=.*|INTENTIONS_KEY=$(openssl rand -base64 32)|" .env \
     && sed -i "s|^BACKUP_PASSPHRASE=.*|BACKUP_PASSPHRASE=$(openssl rand -base64 32)|" .env \
     && sed -i "s|^IMAGE_TAG=.*|IMAGE_TAG='"$SHA"'|" .env && chmod 600 .env'
   ```
   - `POSTGRES_PASSWORD` va en hexadecimal: en base64 puede salir «/» y romper la `DATABASE_URL`.
   - El fundador lee `INTENTIONS_KEY` y `BACKUP_PASSPHRASE` en su terminal (`ssh -t root@<KVM 1> 'grep -E "^(INTENTIONS_KEY|BACKUP_PASSPHRASE)=" /opt/apps/msc/.env'`) y las guarda en su gestor de contraseñas. Ningún agente las imprime ni las copia. Sin la primera, las intenciones no se pueden leer; sin la segunda, las copias no se abren.
   - Nunca se copia un `.env` de otro servidor.
   - Validar sin imprimir: `cd /opt/apps/msc && docker compose -p msc -f compose.yml config --quiet`.
4. **Arranque:**
   ```bash
   cd /opt/apps/msc && docker compose -p msc -f compose.yml pull
   cd /opt/apps/msc && docker compose -p msc -f compose.yml up -d
   cd /opt/apps/msc && docker compose -p msc -f compose.yml ps -a   # migrate "Exited (0)", api "healthy"
   curl -fsS 127.0.0.1:4270/api/health
   ss -tlnp | grep docker-proxy | grep 0.0.0.0                       # debe salir vacío
   cd /opt/apps/msc && docker compose -p msc -f compose.yml exec -T api printenv PAYMENTS_MODE   # beta_free
   ```
   `ps` sin `-a` no enseña `migrate`, que ya terminó.
5. **nginx del KVM 1** (`nginx.conf` de esta carpeta):
   ```bash
   cp /opt/apps/msc/nginx.conf /etc/nginx/sites-available/msc
   ln -s /etc/nginx/sites-available/msc /etc/nginx/sites-enabled/msc
   nginx -t && systemctl reload nginx
   certbot --nginx --non-interactive --redirect \
     --account <cuenta ACME de producción del KVM 1 que elija JuanCho, anotada en el Cuaderno> \
     -d api-staging.misagradocorazon.com -d admin-staging.misagradocorazon.com -d app.misagradocorazon.com
   ```
   - `api-staging…` → `127.0.0.1:4270`, con WebSocket en `/socket.io/` (chat de misa);
   - `admin-staging…` → `127.0.0.1:3271`;
   - `app…` → `127.0.0.1:5270` (beta web).

   Cada `server` incluye primero `/etc/nginx/snippets/msc-cerrado*.conf`: con ese fichero en el servidor, la beta solo se ve desde casa del fundador hasta la apertura. No va en el repositorio.

   `X-Forwarded-For` lleva solo la IP que ve nginx: la API confía en un salto (`trust proxy` = 1) y pasa esa IP a Better Auth (`docs/seguridad.md`, «IP real del cliente»).
6. **Catálogo de santos y primer superadmin:**
   - `seed-catalog.ts` se ejecuta solo si el fundador da por buenas sus imágenes. Por `ssh -n` funciona, porque compose quita la TTY solo:
     ```bash
     ssh -n -o BatchMode=yes root@<KVM 1> 'cd /opt/apps/msc && docker compose -p msc -f compose.yml exec -T api tsx prisma/seed-catalog.ts'
     ```
   - `create-staff.ts` lo ejecuta el fundador con `ssh -t` y sin `-n`, la única excepción a la regla, porque pide la contraseña:
     ```bash
     ssh -t root@<KVM 1> 'cd /opt/apps/msc && docker compose -p msc -f compose.yml exec api tsx src/cli/create-staff.ts --email <correo> --name "<nombre>"'
     ```
     No se usa nunca `STAFF_PASSWORD`, ni en el `.env` ni con `-e`.
7. **Comprobaciones:** las de `docs/despliegue.md`, sin crear usuarios ni velas: health, entrar en el panel con el superadmin del fundador y el worker en marcha (`cd /opt/apps/msc && docker compose -p msc -f compose.yml logs --tail 50 worker`).
8. **Vigilancia:** el alta en la vigilancia del KVM 1 sigue el Cuaderno de Infraestructura (Notion).
   - Contenedores: `msc-db`, `msc-api`, `msc-worker`, `msc-admin`, `msc-app` y `msc-backup`. `msc-migrate` no: termina tras migrar y saldría como caído.
   - Esa vigilancia solo ve si cada contenedor está en marcha. Un `msc-backup` unhealthy o una API sin base de datos siguen «en marcha». Se recomienda vigilar además `msc-api` por HTTP en `127.0.0.1:4270/api/health`.

## Copias de seguridad

- **Qué hace:** el contenedor `msc-backup`, cada día a las 03:30 UTC y una vez al arrancar:
  1. hace un `pg_dump` de la base de datos;
  2. lo cifra con AES-256 y `BACKUP_PASSPHRASE`;
  3. lo guarda como `msc-<fecha UTC>.dump.enc`, con permisos 600;
  4. borra las copias de MSC de más de 7 días. Cualquier otro fichero de la carpeta se respeta.
- **Dónde:** una sola carpeta con tres nombres: `/opt/apps/msc/backups` en el servidor, `./backups` en el compose y `/backups` en el contenedor. Si falta el montaje, la copia falla en lugar de quedarse dentro del contenedor.
- **Fuera del servidor:** el Mac del fundador se las trae cada mañana, guarda 14 y avisa por Telegram si falla o si la última tiene más de 26 h. El detalle está en el Cuaderno de Infraestructura. El HEALTHCHECK del contenedor es solo informativo.
- **Qué recibe:** solo la conexión a la base de datos y la clave de cifrado.
- **Código:** `deploy/staging/backup/`.
- **Restauración de prueba**, en un solo paso para no dejar datos reales en otra base:
  ```bash
  cd /opt/apps/msc && docker compose -p msc -f compose.yml exec -T backup sh -c '
    createdb msc_prueba &&
    restore.sh msc-<fecha>.dump.enc --db msc_prueba --yes &&
    psql -d msc_prueba -Atc "select count(*) from saint" ;
    dropdb msc_prueba'
  ```
- **Nunca `restore.sh` contra la base viva.** El script exige `--db <nombre>` y se niega con `msc`. Recuperarse de un desastre es restaurar en una base nueva y decidir con el fundador qué se hace.

## Actualizar

En este orden:

1. **Copia manual**, porque las migraciones no se deshacen:
   ```bash
   cd /opt/apps/msc && docker compose -p msc -f compose.yml exec -T backup backup.sh
   ls -l /opt/apps/msc/backups/   # la nueva, con permisos 600
   ```
2. **`IMAGE_TAG`** al SHA nuevo, de 40 caracteres, y los ficheros de ese SHA (paso 2 del primer despliegue).
3. **Descargar y arrancar:**
   ```bash
   cd /opt/apps/msc && docker compose -p msc -f compose.yml pull
   cd /opt/apps/msc && docker compose -p msc -f compose.yml up -d
   ```

Se conservan las imágenes del SHA actual y del anterior. Las más viejas se borran por etiqueta exacta:

```bash
docker image rm ghcr.io/gutierrezbj/misagradocorazon-{api,admin,web,backup}:<sha viejo>
```

Nunca `prune -a`. La limpieza de los domingos no borra imágenes con etiqueta, y la de la API ocupa unos 2,4 GB.

## Al pasar a Railway

Ya no son datos de prueba. Los datos se migran con una copia y después se para este stack:

```bash
cd /opt/apps/msc && docker compose -p msc -f compose.yml stop
```

Nunca `down` en el origen.
