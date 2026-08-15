# OpenCode NeoBrutal Theme

Personalización visual y de configuración para **OpenCode** (app de escritorio de Windows), con una mezcla de **Material Design + Neumorfismo + Brutalismo**: colores vivos, botones con texto y profundidad blanda, bordes gruesos.

![estilo](theme/custom-theme.css)

## Contenido

| Carpeta/Archivo | Qué es |
|----------------|--------|
| `theme/custom-theme.css` | Hoja de estilos que sobrescribe las variables `--v2-*` de OpenCode e inyecta el estilo NeoBrutal (neumorfismo en botones/tarjetas + brutalismo en el botón principal). |
| `theme/custom-renderer.js` | Script que añade texto a los botones de icono (Enviar/Detener) y evita contenido oculto/recortado. |
| `agents/*.md` | 5 agentes personalizados: **review** (revisor), **planner** (planificador), **explorer** (explorador), **docs** (escritor de docs), **security** (auditor de seguridad). |
| `scripts/install.ps1` | Script que extrae `app.asar`, inyecta el CSS y re-empaqueta la app. |
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
