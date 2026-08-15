$ErrorActionPreference="Stop"
Write-Host "Restaurando OpenCode al estado previo..."
powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\install.ps1" -Restore
Get-Process -Name OpenCode -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Start-Process "C:\Users\Fernando\AppData\Local\Programs\@opencode-aidesktop\OpenCode.exe"
Write-Host "Listo: OpenCode restaurado y reiniciado."
