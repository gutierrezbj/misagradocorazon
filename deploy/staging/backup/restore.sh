#!/bin/sh
# Restaura una copia. Uso (desde deploy/staging, con el stack en marcha):
#   docker compose exec backup restore.sh list
#   docker compose exec backup restore.sh msc-2026-12-01T0330Z.dump.enc --yes
# Sustituye el contenido de la base de datos PGDATABASE. Pide --yes para no hacerlo por error.
set -eu
set -o pipefail

: "${BACKUP_DEST:?Falta BACKUP_DEST}"

if [ "${1:-}" = "list" ] || [ -z "${1:-}" ]; then
  rclone lsl --s3-no-check-bucket "$BACKUP_DEST"
  exit 0
fi

: "${BACKUP_PASSPHRASE:?Falta BACKUP_PASSPHRASE}"
file="$1"
[ "${2:-}" = "--yes" ] || { echo "Esto sustituye la base de datos ${PGDATABASE:-}. Repite con --yes." >&2; exit 2; }

tmp="/tmp/restore.dump"
trap 'rm -f "$tmp" "$tmp.enc"' EXIT
rclone copyto --s3-no-check-bucket "${BACKUP_DEST}/${file}" "$tmp.enc"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE -in "$tmp.enc" -out "$tmp"
pg_restore --clean --if-exists --no-owner --no-privileges --dbname "${PGDATABASE}" "$tmp"
echo "[restore] ${file} restaurada en ${PGDATABASE}"
