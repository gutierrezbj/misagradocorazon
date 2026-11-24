# Copias de seguridad de PostgreSQL fuera del VPS (beta abierta, docs/beta-web.md; SDD-08).
# pg_dump de la misma versión que la base de datos, rclone para subir a R2 y openssl para cifrar.
FROM postgres:16-alpine
RUN apk add --no-cache rclone openssl
COPY backup.sh restore.sh run.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh /usr/local/bin/run.sh
# Sana si la última copia buena tiene menos de 26 h. Al arrancar hace una copia, así que el aviso
# llega enseguida si faltan credenciales o el bucket no responde.
HEALTHCHECK --interval=10m --timeout=10s --start-period=15m CMD find /tmp/last-backup-ok -mmin -1560 | grep -q .
ENTRYPOINT ["/usr/local/bin/run.sh"]
