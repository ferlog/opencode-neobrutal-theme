# OpenCode NeoBrutal Theme

Personalización visual y de configuración para **OpenCode** (app de escritorio de Windows), con una mezcla de **Material Design + Neumorfismo + Brutalismo**: colores vivos, botones con texto y profundidad blanda, bordes gruesos.

![estilo](theme/custom-theme.css)

## Contenido

| Carpeta/Archivo | Qué es |
|----------------|--------|
| `theme/custom-theme.css` | Hoja de estilos que sobrescribe las variables `--v2-*` de OpenCode e inyecta el estilo NeoBrutal (neumorfismo en botones/tarjetas + brutalismo en el botón principal). Colores de los botones Enviar (verde) y Detener (rojo). |
| `theme/custom-renderer.js` | Script que añade texto a los botones de icono (Enviar/Detener), evita contenido oculto/recortado y añade el **panel de control `🤖 iavirtualuser`** con toggles (👁 ojos OCR, 🖐 manos, 🔊 sonidos, 🗣 leer respuesta), botón **📷 Ver pantalla** y botón **🔊 Probar lectura**. |
| `theme/custom-theme.css` | Hoja de estilos NeoBrutal. |
| `agents/*.md` | 5 agentes personalizados: **review** (revisor), **planner** (planificador), **explorer** (explorador), **docs** (escritor de docs), **security** (auditor de seguridad). |
| `scripts/install.ps1` | Script que extrae `app.asar`, inyecta CSS/JS, parchea `main/index.js` y `preload/index.js` (handlers IPC: `oc-ver-pantalla`, `oc-dump`, `oc-config-get`, `oc-config-set`, `oc-log`, `oc-tts` + métodos `window.api.*`) y re-empaqueta la app. Guarda versiones con fecha/hora y permite deshacer. |
| `iavirtualuser/` | Copia portable de los scripts de visión/voz que usa la app: `ver_pantalla.py` (OCR + detección de secciones/cuadros), `leer_texto.py` (TTS nativo de Windows) y el módulo `ojos/`. |
| `opencode.jsonc` | Config base con permisos seguros (edición permitida, bash con confirmación). |

## Requisitos

- App de escritorio de OpenCode para Windows
- Node.js (para la herramienta `asar`)

## Instalación del tema (UI)

El UI de la app de escritorio es Electron: el CSS vive dentro de `app.asar`. El script lo extrae, añade `custom-theme.css` y re-empaqueta.

```powershell
# desde la carpeta scripts
.\install.ps1

# restaurar el original
.\install.ps1 -Restore
```

> Nota: una actualización de OpenCode sobrescribe estos cambios. Ejecuta `install.ps1` de nuevo tras actualizar.

## Botón "Ver pantalla" (OCR)

El botón **👁 Ver pantalla** aparece en el panel `🤖 iavirtualuser` (abajo a la izquierda). Al pulsarlo, el proceso principal de la app ejecuta `python ver_pantalla.py`, que captura la pantalla y la reconoce con el OCR nativo de Windows, y coloca el texto visible en el cuadro de entrada del chat para que el asistente pueda "ver" la pantalla sin imágenes.

El script `ver_pantalla.py` incluye opciones avanzadas:

```powershell
python ver_pantalla.py                          # texto visible
python ver_pantalla.py --detalle                # texto con coordenadas x/y
python ver_pantalla.py --region X Y W H         # solo una región
python ver_pantalla.py --ventana "OpenCode"     # solo una ventana (por título)
python ver_pantalla.py --secciones              # agrupa el texto en cuadros/diálogos
```

- Dependencias: `pip install -r requirements.txt` (mss, winsdk, Pillow, opencv-python, numpy).
- Implementado con el handler IPC (`oc-ver-pantalla`) en `out/main/index.js` y `window.api.verPantalla` en `out/preload/index.js`, ambos inyectados por `install.ps1`.

## Lectura en voz alta (TTS)

El panel tiene el toggle **🗣 Leer respuesta** (lee en voz alta cuando termina una respuesta del asistente) y el botón **🔊 Probar lectura** (lee una frase de prueba al instante). Usa `leer_texto.py`, un TTS **nativo de Windows** (winsdk + winsound) que funciona de forma fiable en Electron, a diferencia de `window.speechSynthesis`.

Implementado con el handler IPC (`oc-tts`) y `window.api.speak`.

## Versiones y deshacer

Cada instalación de `install.ps1`:

- Guarda una **copia versionada** `app.asar.YYYYMMDD-HHMMSS` en `%TEMP%\opencode-neobrutal-work\versiones\` (además de una copia del theme aplicado).
- Registra la instalación en `historial.txt`.
- Mantiene `app.asar.last-good` con la última versión buena.

Para deshacer:

```powershell
.\install.ps1 -Restore   # vuelve al app.asar original
# o restaura manualmente una copia de %TEMP%\opencode-neobrutal-work\versiones\
```

## Instalación de agentes

Copia los agentes a tu config global de OpenCode:

```powershell
Copy-Item agents\*.md "$env:USERPROFILE\.config\opencode\agents\"
```

Recuerda reiniciar OpenCode después de cualquier cambio de configuración.

## Permisos (opencode.jsonc)

La config base permite la edición y comandos de lectura/consulta de git, pero pide confirmación para el resto de comandos de shell y para búsquedas web. Ajústala a tu gusto.

## Menú de agentes

En la app puedes cambiar de agente con la tecla `Tab` (agentes primarios) e invocar subagentes con `@`. Cada agente personalizado tiene su propio color.

## Estructura del tema

- **Material**: paleta de color (blue/teal/orange/...) y superficies.
- **Neumorfismo**: sombras blandas dobles (luz/sombra) en botones y tarjetas.
- **Brutalismo**: botón principal con borde grueso y desplazamiento duro, tipografía en negrita, scrollbar llamativa.

---
Proyecto generado y personalizado con [OpenCode](https://opencode.ai).
