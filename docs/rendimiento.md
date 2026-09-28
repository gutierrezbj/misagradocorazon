# Prueba de carga del chat de la misa

La especificación funcional pone como meta 1.000 asistentes a la misa del domingo al mes 6 (§10) y avisa de que el chat propio tiene que aguantar los picos (§11). Esta prueba mide si la API actual lo aguanta.

## Cómo se ejecuta

```bash
# API arrancada contra una base de desarrollo (el script se niega a usar otra que no sea _dev o _test)
DATABASE_URL=postgresql://…/msc_dev API_URL=http://localhost:8001 \
  npx tsx apps/api/scripts/load-chat.ts [fieles] [mensajes/s] [segundos]
```

Qué hace el script (`apps/api/scripts/load-chat.ts`):

1. Crea una misa en directo y N fieles de prueba con su sesión, directamente en la base de datos.
2. Conecta N clientes de Socket.IO, en tandas de 50, como gente entrando al empezar la misa.
3. Fieles distintos escriben al ritmo indicado, respetando el límite de un mensaje cada 3 s por persona.
4. Mide cuánto tarda cada mensaje en llegar a cada conectado y cuántos se pierden.
5. Borra todo lo creado.

No forma parte de `pnpm test`: tarda minutos y necesita la API arrancada.

## Resultados (27-sep-2026)

Condiciones de la medición:

- Una sola instancia de la API en modo desarrollo (`tsx`), con PostgreSQL 16 en la misma máquina (4 núcleos).
- Los clientes corren en esa misma máquina, así que compiten por la CPU con el servidor: las cifras reales en Railway deberían ser iguales o mejores.
- La latencia es de red local: no incluye la conexión móvil de cada fiel.

| Fieles | Mensajes | Conexión y entrada (p95) | Entregas | Perdidas | Llegada a cada conectado (p50 · p95 · máx) | CPU del servidor (pico · media) | RAM pico |
|---|---|---|---|---|---|---|---|
| 200 | 10/s, 30 s | 394 ms | 60.000 | 0 | 7 · 11 · 64 ms | — | — |
| 500 | 10/s, 30 s | 317 ms | 150.000 | 0 | 9 · 16 · 35 ms | — | 309 MB |
| 1.000 | 10/s, 60 s | 264 ms | 600.000 | 0 | 17 · 33 · 50 ms | 132 % · 25 % de un núcleo | 330 MB |
| 1.000 | 30/s, 30 s | 397 ms | 900.000 | 0 | 15 · 29 · 59 ms | 153 % · 61 % de un núcleo | 329 MB |

El pico de CPU es de la entrada de los 1.000 fieles. Con 30 mensajes por segundo, que es el triple de un chat muy animado, la media sube al 61 % de un núcleo y la llegada sigue por debajo de 60 ms.

## Conclusión

- **Meta del mes 6 (1.000 asistentes):** una sola instancia la cumple con margen, incluso con el triple de mensajes. No se pierde ningún mensaje y todos llegan en menos de 60 ms.
- **Escalar más allá:** si algún día hiciera falta más de una instancia, el adaptador de Redis de Socket.IO lo permite sin reescribir el chat (ADR-014). Hoy no hace falta.
- **En producción:** repetir la prueba contra staging en Railway antes del lanzamiento, desde fuera de Railway, para medir también la red.
