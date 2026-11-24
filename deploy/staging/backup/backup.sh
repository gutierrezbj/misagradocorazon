#!/bin/sh
# Copia cifrada de la base de datos a BACKUP_DEST (rclone). Conserva BACKUP_RETENTION_DAYS días.
# Conexión a PostgreSQL por las variables estándar PGHOST, PGUSER, PGPASSWORD y PGDATABASE.
set -eu
set -o pipefail

: "${BACKUP_DEST:?Falta BACKUP_DEST (p. ej. :s3:msc-backups/staging)}"
: "${BACKUP_PASSPHRASE:?Falta BACKUP_PASSPHRASE (openssl rand -base64 32, guardada fuera del VPS)}"
RETENTION="${BACKUP_RETENTION_DAYS:-7}"

stamp=$(date -u +%Y-%m-%dT%H%MZ)
name="msc-${stamp}.dump.enc"
tmp="/tmp/${name}"
trap 'rm -f "$tmp"' EXIT

# Formato custom de pg_dump (comprimido) y cifrado con AES-256. Las intenciones ya van cifradas
# dentro de la base de datos con INTENTIONS_KEY: para restaurarlas hacen falta las dos claves.
pg_dump --format=custom --no-owner --no-privileges \
  | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass env:BACKUP_PASSPHRASE -out "$tmp"

size=$(wc -c < "$tmp")
[ "$size" -gt 1024 ] || { echo "[backup] copia vacía o demasiado pequeña (${size} bytes)" >&2; exit 1; }

rclone copyto --s3-no-check-bucket "$tmp" "${BACKUP_DEST}/${name}"
rclone delete --s3-no-check-bucket --min-age "${RETENTION}d" "$BACKUP_DEST"

date -u +%Y-%m-%dT%H:%M:%SZ > /tmp/last-backup-ok
echo "[backup] ${name} subida (${size} bytes); se conservan ${RETENTION} días"
