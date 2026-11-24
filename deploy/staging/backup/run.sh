#!/bin/sh
# Hace una copia al arrancar y después una al día a la hora BACKUP_AT (UTC, por defecto 03:30).
# Si una copia falla, lo deja en el log y vuelve a intentarlo al día siguiente: el healthcheck
# del contenedor (y healthcheck.sh del VPS) avisan si la última buena tiene más de 26 h.
set -u
AT="${BACKUP_AT:-03:30}"

backup.sh || echo "[backup] la copia inicial falló" >&2

while true; do
  now=$(date -u +%s)
  next=$(date -u -d "$(date -u +%Y-%m-%d) ${AT}" +%s)
  [ "$next" -le "$now" ] && next=$((next + 86400))
  sleep $((next - now))
  backup.sh || echo "[backup] la copia de las ${AT} UTC falló" >&2
done
