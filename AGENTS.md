# AGENTS.md — OpenCode NeoBrutal Theme

Guía para cualquier IA (agente o editor) que trabaje en este repositorio.

## Qué es este proyecto

Personalización de la app de escritorio **OpenCode** (Electron, Windows). Inyecta un tema **NeoBrutal** y un **panel de control `🤖 iavirtualuser`** con visión por OCR, lectura en voz alta (TTS), alarmas y control del ratón.

> ⚠️ **El agente NO puede "ver" imágenes**: la app se "ve" con OCR mediante `iavirtualuser/ver_pantalla.py`.

## Estructura

| Ruta | Qué es | ¿Se edita? |
|------|--------|-----------|
| `theme/custom-renderer.js` | Lógica del panel, toggles, TTS, alarmas, Ver pantalla, etiquetas de botones | Sí (principal) |
| `theme/custom-theme.css` | Estilos NeoBrutal (variables `--v2-*`, botones) | Sí |
| `scripts/install.ps1` | Instala el tema en `app.asar` + handlers IPC + preload | Sí |
| `iavirtualuser/ver_pantalla.py` | OCR de la pantalla (captura + visión) | Sí |
| `iavirtualuser/leer_texto.py` | TTS nativo de Windows (winsdk + winsound) | Sí |
| `iavirtualuser/alarma.py` | Beep doble al terminar respuesta (winsound.Beep) | Sí |
| `iavirtualuser/mouse_circle.py` | Mueve el ratón en círculo | Sí |
| `iavirtualuser/ojos/` | Módulo de captura/OCR/visión | Sí |
| `iavirtualuser/config.json` | Estado persistente de los toggles | Sí |
| `iavirtualuser/requirements.txt` | Dependencias Python | Sí |
| `agents/*.md` | Subagentes personalizados | No (salvo que se pida) |
| `opencode.jsonc` | Config de permisos | No |

## Convenciones obligatorias

- **Idioma**: todo el código, comentarios y respuestas en **español**.
- **No añadir comentarios** al código salvo que el usuario lo pida o sean cabeceras de sección existentes.
- El panel y los scripts usan **interpolación `C:\...` y doble barra** en cadenas cuando se incrustan en JS/PS.

## Flujo de trabajo para cambios de UI

1. Edita `theme/custom-renderer.js` y/o `theme/custom-theme.css`.
2. Verifica sintaxis: `node --check theme/custom-renderer.js` (y parseo de `install.ps1` si lo tocaste).
3. Ejecuta `.\scripts\install.ps1` para aplicar (re-empaqueta `app.asar`; guarda versión y `historial.txt`).
4. Reinicia OpenCode con el script diferido suave:
   `Start-Process powershell -ExecutionPolicy Bypass -File "$env:TEMP\opencode\restart-opencode.ps1"`
5. Verifica con OCR:
   `python iavirtualuser/ver_pantalla.py --ventana "OpenCode" --secciones`
6. Commit + push tras confirmar que funciona.

## Funcionamiento del panel (custom-renderer.js)

- `enhance()`: añade texto a botones de icono y estiliza botones concretos (Enviar, Detener, Copiar respuesta, Mostrar/Ocultar, Nueva sesión). Se ejecuta con un `MutationObserver` en cada cambio de DOM → la deduplicación/etiquetado debe ser **idempotente**.
- `addControlPanel()`: crea el panel `🤖 iavirtualuser` con los toggles.
- Toggles: `ojos`, `manos`, `sonidos`, `alarmas`, `leer`. Persisten en `config.json` vía `window.api.configSet`.
- **Lectura automática + alarma**: `applyTtsState()` observa el DOM y cuando el texto de la última parte del timeline **se estabiliza ~1,2 s**, dispara la alarma (si `alarmasOn`) y/o la lectura (si `leerOn`).
- `getLastAssistantText()`: devuelve el texto a leer. **Debe devolver SOLO la respuesta final del asistente, no todo el chat.**
- `speakText()` → `window.api.speak` (IPC `oc-tts` → `leer_texto.py`).
- `playAlarma()` → `window.api.alarma` (IPC `oc-alarma` → `alarma.py`).

## Handlers IPC (inyectados por install.ps1 en out/main/index.js)

`oc-ver-pantalla`, `oc-dump`, `oc-config-get`, `oc-config-set`, `oc-log`, `oc-tts`, `oc-alarma`.

Métodos preload (`window.api`): `verPantalla`, `ocDump`, `configGet`, `configSet`, `ocLog`, `speak`, `alarma`.

## Herramientas útiles

- Log del renderer: `%TEMP%\opencode\oc-renderer.log`
- Dump del DOM: `%TEMP%\opencode\domdump.txt` (se regenera al arrancar)
- Versionado: `%TEMP%\opencode-neobrutal-work\versiones\` + `historial.txt`; deshacer con `.\scripts\install.ps1 -Restore`

## Dependencias

```powershell
pip install -r iavirtualuser\requirements.txt
# mss, Pillow, opencv-python, numpy, winsdk
```

`winsound` y `ctypes` son de la biblioteca estándar de Python.
