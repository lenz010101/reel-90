# HyperFrames Cloud Render - GitHub Actions

Este proyecto contiene 3 composiciones HyperFrames:
- `cielo/` - Cielo Stylos
- `mejorado/` - Exprimidor Profesional
- `video/` - Demo HyperFrames renderizado desde la nube

## Render en la nube sin usar tu PC

El workflow `.github/workflows/render.yml` renderiza con HyperFrames en runners de GitHub Actions.

### Pasos

1. Crea un repositorio en GitHub.
2. Sube todo el contenido de esta carpeta al repo.
3. Ve a **Actions â†’ Render video â†’ Run workflow**.
4. Selecciona:
   - **folder**: `video` / `cielo` / `mejorado`
   - **quality**: standard
   - **fps**: 30
5. Descarga el artefacto `...-mp4` cuando termine.

### Notas

- `video/` renderiza sin dependencias externas.
- `cielo/` y `mejorado/` necesitan la carpeta `assets/` con las imÃ¡genes/video referenciadas en `index.html`. SÃºbelas con la misma estructura para que el render sea exitoso.
