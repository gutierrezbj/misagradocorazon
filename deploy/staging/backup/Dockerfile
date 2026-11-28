# Copias de seguridad de PostgreSQL de la beta en el KVM 1 (docs/beta-web.md; SDD-08).
# pg_dump de la misma versión que la base de datos, openssl para cifrar y rclone para la limpieza
# por antigüedad. Destino local (/backups); el Mac del fundador se las trae cada mañana.
FROM postgres:16-alpine
RUN apk add --no-cache rclone openssl
COPY backup.sh restore.sh run.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh /usr/local/bin/run.sh
# Solo informativo: sano si la última copia buena tiene menos de 26 h. El aviso real de una copia
# vieja lo da el Mac del fundador por Telegram.
HEALTHCHECK --interval=10m --timeout=10s --start-period=15m CMD find /tmp/last-backup-ok -mmin -1560 | grep -q .
ENTRYPOINT ["/usr/local/bin/run.sh"]
