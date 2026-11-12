$ErrorActionPreference = 'Stop'

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "       FASHIONSTORE SAAS - INSTALADOR DE APLICACION PWA" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1/2] Localizando navegador compatible (Edge / Chrome)..."

$candidates = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
)

$browser = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $browser) {
    Write-Host "[!] Error: No se encontro Microsoft Edge ni Google Chrome." -ForegroundColor Red
    Read-Host "Presione Enter para salir"
    exit 1
}

Write-Host "[+] Navegador detectado: $browser" -ForegroundColor Green
Write-Host ""
Write-Host "[2/2] Creando acceso directo en el Escritorio de Windows..."

$ws = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop "FashionStore SaaS.lnk"

$iconPath = Join-Path $PSScriptRoot "frontend\public\favicon.ico"
if (-not (Test-Path $iconPath)) {
    $iconPath = $browser
}

$shortcut = $ws.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $browser
$shortcut.Arguments = "--app=http://localhost:4200 --new-window"
$shortcut.IconLocation = $iconPath
$shortcut.Description = "FashionStore SaaS - Aplicacion PWA"
$shortcut.Save()

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Green
Write-Host " INSTALACION COMPLETADA EXITOSAMENTE!" -ForegroundColor Green
Write-Host ""
Write-Host " Se ha creado el icono 'FashionStore SaaS' en tu Escritorio:"
Write-Host " $shortcutPath" -ForegroundColor Yellow
Write-Host ""
Write-Host " Al abrirlo, FashionStore se ejecutara en su propia ventana"
Write-Host " nativa de Windows (modo PWA standalone, sin barras del navegador)."
Write-Host "====================================================================" -ForegroundColor Green
Write-Host ""
