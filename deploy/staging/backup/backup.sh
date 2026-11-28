#!/bin/sh
# Copia cifrada de la base de datos en BACKUP_DEST (/backups, montado desde /opt/apps/msc/backups).
# Conserva BACKUP_RETENTION_DAYS días. Conexión a PostgreSQL por las variables estándar PGHOST,
# PGUSER, PGPASSWORD y PGDATABASE. Copia manual: docker compose -p msc -f compose.yml exec -T backup backup.sh
umask 077
set -eu
set -o pipefail

: "${BACKUP_DEST:?Falta BACKUP_DEST (/backups)}"
: "${BACKUP_PASSPHRASE:?Falta BACKUP_PASSPHRASE (openssl rand -base64 32, guardada fuera del servidor)}"
RETENTION="${BACKUP_RETENTION_DAYS:-7}"

# Sin el montaje, la copia se quedaría dentro del contenedor y se perdería al recrearlo.
if ! awk -v d="$BACKUP_DEST" '$2 == d { found = 1 } END { exit !found }' /proc/mounts; then
  echo "[backup] ${BACKUP_DEST} no es un punto de montaje: falta ./backups:/backups en el compose" >&2
  exit 1
fi

stamp=$(date -u +%Y-%m-%dT%H%MZ)
name="msc-${stamp}.dump.enc"
# Se escribe con otro nombre y se renombra al final: el Mac y la limpieza solo ven copias completas.
partial="${BACKUP_DEST}/.${name}.partial"
trap 'rm -f "$partial"' EXIT

# Formato custom de pg_dump (comprimido) y cifrado con AES-256. Las intenciones ya van cifradas
# dentro de la base de datos con INTENTIONS_KEY: para restaurarlas hacen falta las dos claves.
pg_dump --format=custom --no-owner --no-privileges \
  | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass env:BACKUP_PASSPHRASE -out "$partial"

size=$(wc -c < "$partial")
[ "$size" -gt 1024 ] || { echo "[backup] copia vacía o demasiado pequeña (${size} bytes)" >&2; exit 1; }

chmod 600 "$partial"
mv "$partial" "${BACKUP_DEST}/${name}"

# Solo borra copias de MSC: cualquier otro fichero de la carpeta se respeta.
rclone delete --min-age "${RETENTION}d" --max-depth 1 --include 'msc-*.dump.enc' "$BACKUP_DEST"

date -u +%Y-%m-%dT%H:%M:%SZ > /tmp/last-backup-ok
echo "[backup] ${name} guardada (${size} bytes); se conservan ${RETENTION} días"
