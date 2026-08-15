# OpenCode NeoBrutal Theme - Instalador (Windows)
# Aplica el tema personalizado a la app de escritorio OpenCode.
# Requiere Node.js (para la herramienta asar). Crea una copia de seguridad
# del app.asar original antes de modificar.

param(
  [string]$AppPath = "$env:LOCALAPPDATA\Programs\@opencode-aidesktop\resources\app.asar",
  [string]$ThemeCss = "$PSScriptRoot\..\theme\custom-theme.css",
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

# Inyectar la referencia en index.html (si no está ya)
$html = Join-Path $renderer "index.html"
$content = Get-Content $html -Raw
if ($content -notmatch "custom-theme.css") {
  $content = $content -replace '(rel="stylesheet"[^>]*main-[^"]+\.css">)', "`$1`n    <link rel=`"stylesheet`" crossorigin href=`"./custom-theme.css`">"
  Set-Content $html $content -NoNewline
  Write-Host "Referencia a custom-theme.css inyectada en index.html" -ForegroundColor Cyan
}

# Re-empaquetar
Write-Host "Re-empaquetando app.asar..." -ForegroundColor Cyan
& $node $asarCli.FullName pack (Join-Path $work "extract") $AppPath

Write-Host "Tema aplicado. Cierra y vuelve a abrir OpenCode para ver los cambios." -ForegroundColor Green
