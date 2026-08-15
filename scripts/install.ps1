# OpenCode NeoBrutal Theme - Instalador (Windows)
# Aplica el tema personalizado a la app de escritorio OpenCode.
# Requiere Node.js (para la herramienta asar). Crea una copia de seguridad
# del app.asar original antes de modificar.

param(
  [string]$AppPath = "$env:LOCALAPPDATA\Programs\@opencode-aidesktop\resources\app.asar",
  [string]$ThemeCss = "$PSScriptRoot\..\theme\custom-theme.css",
  [string]$RendererJs = "$PSScriptRoot\..\theme\custom-renderer.js",
  [switch]$Restore
)

$ErrorActionPreference = "Stop"
$node = "C:\Program Files\nodejs\node.exe"

if (-not (Test-Path $node)) {
  throw "Node.js no encontrado en $node. Instalalo: winget install OpenJS.NodeJS.LTS"
}

# Localizar la CLI de asar (global npm)
$asarCli = Get-ChildItem "$env:APPDATA\npm\node_modules\@electron\asar\bin\asar.mjs" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $asarCli) {
  Write-Host "Instalando @electron/asar..." -ForegroundColor Cyan
  & "$env:APPDATA\npm\npm.cmd" install -g @electron/asar
  $asarCli = Get-ChildItem "$env:APPDATA\npm\node_modules\@electron\asar\bin\asar.mjs" | Select-Object -First 1
}
if (-not $asarCli) { throw "No se pudo instalar @electron/asar" }

if (-not (Test-Path $AppPath)) { throw "app.asar no encontrado en $AppPath" }

$work = Join-Path $env:TEMP "opencode-neobrutal-work"
if (Test-Path $work) { Remove-Item $work -Recurse -Force }
New-Item -ItemType Directory -Force -Path $work | Out-Null

$backup = Join-Path $work "app.asar.original.backup"

if ($Restore) {
  if (-not (Test-Path $backup)) { throw "No hay copia de seguridad en $backup" }
  Copy-Item $backup $AppPath -Force
  Write-Host "Tema restaurado (original)." -ForegroundColor Green
  exit 0
}

# Copia de seguridad del original
if (-not (Test-Path $backup)) {
  Copy-Item $AppPath $backup -Force
  Write-Host "Copia de seguridad creada: $backup" -ForegroundColor Yellow
}

# Extraer
Write-Host "Extrayendo app.asar..." -ForegroundColor Cyan
& $node $asarCli.FullName extract $AppPath (Join-Path $work "extract")

# Copiar el CSS personalizado
$renderer = Join-Path $work "extract\out\renderer"
Copy-Item $ThemeCss (Join-Path $renderer "custom-theme.css") -Force

# Copiar el JS de mejoras de UI
if (Test-Path $RendererJs) {
  Copy-Item $RendererJs (Join-Path $renderer "custom-renderer.js") -Force
  Write-Host "custom-renderer.js copiado" -ForegroundColor Cyan
}

# Inyectar la referencia en index.html (si no está ya)
$html = Join-Path $renderer "index.html"
$content = Get-Content $html -Raw
if ($content -notmatch "custom-theme.css") {
  $content = $content -replace '(rel="stylesheet"[^>]*main-[^"]+\.css">)', "`$1`n    <link rel=`"stylesheet`" crossorigin href=`"./custom-theme.css`">"
  Write-Host "Referencia a custom-theme.css inyectada en index.html" -ForegroundColor Cyan
}
if ($content -notmatch "custom-renderer.js") {
  $content = $content -replace '(<script type="module"[^>]*main-[^"]+\.js">)', "`$1`n    <script defer src=`"./custom-renderer.js`"></script>"
  Write-Host "Referencia a custom-renderer.js inyectada en index.html" -ForegroundColor Cyan
}
Set-Content $html $content -NoNewline

# Parchear el proceso principal (main/index.js): handlers IPC personalizados
$mainJs = Join-Path $work "extract\out\main\index.js"
$mainContent = Get-Content $mainJs -Raw
# Corregir un bug previo: Buffer.split no existe; convertir a string antes
$mainContent = $mainContent -replace 'const text = stdout\.split\("__FIN_OCR__"\)\[0\] \|\| stdout;', 'const text = stdout.toString("utf-8").split("__FIN_OCR__")[0] || stdout.toString("utf-8");'

# Definir los handlers a inyectar, cada uno con su token de presencia
$ocHandlers = @(
  @{ key = "oc-ver-pantalla"; block = @'
  ipcMain.handle("oc-ver-pantalla", async (_event, detalle = false) => {
    const script = "C:\\proyectos2026\\proyectos\\iavirtualuser\\ver_pantalla.py";
    try {
      const { stdout } = await execFilePromise("python", [script, detalle ? "--detalle" : ""], {
        windowsHide: true,
        timeout: 30000
      });
      const text = stdout.toString("utf-8").split("__FIN_OCR__")[0] || stdout.toString("utf-8");
      return { ok: true, texto: text.trimEnd() };
    } catch (err) {
      return { ok: false, error: String((err && err.stderr) || err || "Error OCR") };
    }
  });
'@ },
  @{ key = "oc-dump"; block = @'
  ipcMain.handle("oc-dump", async (_event, content) => {
    try {
      const path = "C:\\Users\\Fernando\\AppData\\Local\\Temp\\opencode\\domdump.txt";
      const fh = await open(path, "w");
      await fh.writeFile(content);
      await fh.close();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });
'@ },
  @{ key = "oc-config-get"; block = @'
  ipcMain.handle("oc-config-get", async () => {
    const path = "C:\\proyectos2026\\proyectos\\iavirtualuser\\config.json";
    try {
      const raw = await readFile(path, "utf-8");
      const cfg = JSON.parse(raw);
      return {
        ok: true,
        ojos: cfg.ojos !== false,
        manos: cfg.manos !== false,
        sonidos: cfg.sonidos !== false,
        leer: cfg.leer === true
      };
    } catch (err) {
      return { ok: true, ojos: true, manos: true, sonidos: true, leer: false };
    }
  });
'@ },
  @{ key = "oc-config-set"; block = @'
  ipcMain.handle("oc-config-set", async (_event, data) => {
    const path = "C:\\proyectos2026\\proyectos\\iavirtualuser\\config.json";
    try {
      const prev = await readFile(path, "utf-8").then((r) => JSON.parse(r)).catch(() => ({}));
      const next = { ...prev, ...data };
      const fh = await open(path, "w");
      await fh.writeFile(JSON.stringify(next, null, 2));
      await fh.close();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });
'@ },
  @{ key = "oc-log"; block = @'
  ipcMain.handle("oc-log", async (_event, msg, level = "info") => {
    try {
      const path = "C:\\Users\\Fernando\\AppData\\Local\\Temp\\opencode\\oc-renderer.log";
      const line = `[${new Date().toISOString()}] [${level}] ${msg}\n`;
      const fh = await open(path, "a");
      await fh.writeFile(line);
      await fh.close();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });
'@ }
)

foreach ($h in $ocHandlers) {
  if ($mainContent -notmatch $h.key) {
    $mainContent = $mainContent -replace '(ipcMain\.handle\("resolve-app-path"[^\n]*\n)', "`$1$($h.block)"
    Write-Host "Handler $($h.key) inyectado en main/index.js" -ForegroundColor Cyan
  } else {
    Write-Host "Handler $($h.key) ya presente en main/index.js" -ForegroundColor DarkGray
  }
}

# Forzar actualización del bloque de retorno de oc-config-get (aunque ya exista)
$oldGetReturn = 'return { ok: true, ojos: cfg.ojos !== false, manos: cfg.manos !== false };'
$newGetReturn = 'return { ok: true, ojos: cfg.ojos !== false, manos: cfg.manos !== false, sonidos: cfg.sonidos !== false, leer: cfg.leer === true };'
if ($mainContent -match [regex]::Escape($oldGetReturn)) {
  $mainContent = $mainContent -replace [regex]::Escape($oldGetReturn), $newGetReturn
  Write-Host "oc-config-get: retorno actualizado (sonidos/leer)" -ForegroundColor Cyan
}
Set-Content $mainJs $mainContent -NoNewline

# Parchear el preload: exponer window.api.verPantalla
$preloadJs = Join-Path $work "extract\out\preload\index.js"
$preloadContent = Get-Content $preloadJs -Raw
$ocPreload = @(
  @{ key = "verPantalla"; line = "  verPantalla: (detalle) => electron.ipcRenderer.invoke(`"oc-ver-pantalla`", detalle)," },
  @{ key = "ocDump"; line = "  ocDump: (content) => electron.ipcRenderer.invoke(`"oc-dump`", content)," },
  @{ key = "configGet"; line = "  configGet: () => electron.ipcRenderer.invoke(`"oc-config-get`")," },
  @{ key = "configSet"; line = "  configSet: (data) => electron.ipcRenderer.invoke(`"oc-config-set`", data)," },
  @{ key = "ocLog"; line = "  ocLog: (msg, level) => electron.ipcRenderer.invoke(`"oc-log`", msg, level)," }
)
foreach ($m in $ocPreload) {
  if ($preloadContent -notmatch $m.key) {
    $preloadContent = $preloadContent -replace '(revealPath: \(path\) => electron\.ipcRenderer\.invoke\("reveal-path", path\),)', "`$1`n$($m.line)"
    Write-Host "window.api.$($m.key) inyectado en preload/index.js" -ForegroundColor Cyan
  } else {
    Write-Host "window.api.$($m.key) ya presente en preload/index.js" -ForegroundColor DarkGray
  }
}
Set-Content $preloadJs $preloadContent -NoNewline

# Re-empaquetar
Write-Host "Re-empaquetando app.asar..." -ForegroundColor Cyan
& $node $asarCli.FullName pack (Join-Path $work "extract") $AppPath

Write-Host "Tema aplicado. Cierra y vuelve a abrir OpenCode para ver los cambios." -ForegroundColor Green
