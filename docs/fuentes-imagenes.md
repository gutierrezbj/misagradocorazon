# Fuentes de las imágenes de santos

Estado a 2026-09-25, rama `conflict_250926_1728`, fichero `backend/seed.py` (diccionario `IMG`).

- Las imágenes no están alojadas por nosotros: la app las carga directamente desde URLs de terceros.
- La información de origen la dio el constructor (Emergent).
- Las URLs son las del código.
- **Las licencias no se han verificado**: esta sesión no tiene acceso de red a Wikimedia Commons ni a Pexels.

## Catálogo actual (7 santos)

| Santo | ID | Fuente | Obra / autor (según el constructor) | Fichero |
|-------|----|--------|-------------------------------------|---------|
| Virgen de Guadalupe | `saint_guadalupe` | Wikimedia Commons | Imagen de la tilma (1531) | `1531_Nuestra_Señora_de_Guadalupe_anagoria.jpg` |
| San Miguel Arcángel | `saint_miguel` | Wikimedia Commons | Guido Reni | `Guido_Reni_031.jpg` |
| San Judas Tadeo | `saint_judas` | Wikimedia Commons | El Greco (Museo Nacional de Escultura, Valladolid) | `San_Judas_Tadeo,_de_El_Greco_(Museo_Nacional_de_Escultura_de_Valladolid).JPG` |
| San Antonio de Padua | `saint_antonio` | Wikimedia Commons | Antonio de Pereda | `Antonio_de_Pereda_y_Salgado_-_St_Anthony_of_Padua_with_Christ_Child_(detail)_-_WGA17168.jpg` |
| Santa Teresa de Jesús | `saint_teresa` | Wikimedia Commons | Retrato clásico (autor no indicado) | `Teresa_de_Jesús_(cropped).jpg` |
| San José | `saint_jose` | Wikimedia Commons | William Dyce | `William_Dyce_-_St_Joseph_-_WGA07375.jpg` |
| Sagrado Corazón de Jesús | `saint_corazon` | Pexels | Foto 7219104 (autor no indicado) | `https://images.pexels.com/photos/7219104/...` |

Forma de enlace:

- **Wikimedia:** `https://commons.wikimedia.org/wiki/Special:FilePath/<fichero>?width=500`, que redirige al archivo real.
- **Pexels:** URL directa del CDN de Pexels.

## Pendiente de verificar antes de publicar

1. **Licencia de cada fichero de Commons.** Que la obra sea de dominio público no garantiza que la fotografía o el recorte subidos lo sean. Hay que comprobar en la página de cada fichero la licencia y si exige atribución. Dos casos a mirar con atención:
   - `…_anagoria.jpg`: el nombre indica que lo subió un fotógrafo concreto.
   - `…(cropped).jpg`: es un recorte derivado y no consta el autor del original.
2. **Licencia de Pexels (foto 7219104):** confirmar sus condiciones de uso comercial y el autor.
3. **Atribución:** si alguna licencia la exige, hay que mostrarla en la ficha del santo o en una pantalla de créditos.

## Riesgos de enlazar directamente

- Si Wikimedia o Pexels caen, cambian la URL o limitan el acceso, las imágenes dejan de cargar.
- Sin control de caché ni de tamaño: no cumple el requisito de CDN propio de la especificación (§5.2 y §8.3).

## Decisión propuesta

- Descargar los originales, guardar junto a cada uno su licencia y atribución, y servirlos desde un CDN o almacenamiento propio **a nombre del fundador**. No usar el almacenamiento de Emergent.
- Las URLs del seed pasan a apuntar a ese CDN.
- Se concreta en el SDD correspondiente.
