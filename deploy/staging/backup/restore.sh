#!/bin/sh
# Restaura una copia en una base de datos NUEVA, nunca en la viva (msc). Uso, con el stack en marcha:
#   cd /opt/apps/msc && docker compose -p msc -f compose.yml exec -T backup restore.sh list
#   … exec -T backup createdb msc_prueba
#   … exec -T backup restore.sh msc-2026-12-01T0330Z.dump.enc --db msc_prueba --yes
# La base de destino es obligatoria y no puede ser msc: no hay forma de saltarse esa regla.
umask 077
set -eu
set -o pipefail

: "${BACKUP_DEST:?Falta BACKUP_DEST (/backups)}"

if [ "${1:-}" = "list" ] || [ -z "${1:-}" ]; then
  ls -l "$BACKUP_DEST"
  exit 0
fi

file="$1"
shift
db=""
yes=""
while [ $# -gt 0 ]; do
  case "$1" in
    --db) db="${2:-}"; shift 2 ;;
    --yes) yes=1; shift ;;
    *) echo "Opción desconocida: $1" >&2; exit 2 ;;
  esac
done

case "$file" in
  msc-*.dump.enc) ;;
  *) echo "Nombre de copia no válido: ${file} (se espera msc-<fecha>.dump.enc)" >&2; exit 2 ;;
esac
case "$file" in
  */*) echo "Solo el nombre del fichero, sin ruta: ${file}" >&2; exit 2 ;;
esac

[ -n "$db" ] || { echo "Falta --db <nombre>: la base de destino es obligatoria" >&2; exit 2; }
if [ "$db" = "msc" ]; then
  echo "No se restaura sobre la base viva (msc). Usa una base nueva, p. ej. --db msc_prueba." >&2
  exit 2
fi
[ -n "$yes" ] || { echo "Esto sustituye el contenido de ${db}. Repite con --yes." >&2; exit 2; }

: "${BACKUP_PASSPHRASE:?Falta BACKUP_PASSPHRASE}"
src="${BACKUP_DEST}/${file}"
[ -f "$src" ] || { echo "No existe ${src}" >&2; exit 2; }

tmp="/tmp/restore.dump"
trap 'rm -f "$tmp"' EXIT
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE -in "$src" -out "$tmp"
pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$db" "$tmp"
echo "[restore] ${file} restaurada en ${db}"
