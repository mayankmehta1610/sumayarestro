# Install deployment tools (ngrok) on Windows
$ErrorActionPreference = "Stop"

Write-Host "=== Sumaya Resto — install deploy tools ===" -ForegroundColor Cyan

$ngrok = Get-Command ngrok -ErrorAction SilentlyContinue
if ($ngrok) {
    Write-Host "ngrok already installed: $($ngrok.Source)" -ForegroundColor Green
} else {
    Write-Host "Installing ngrok via winget..." -ForegroundColor Yellow
    winget install Ngrok.Ngrok --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path", "User")
}

$ngrok = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrok) {
    Write-Host "ngrok install failed. Download manually: https://ngrok.com/download" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Sign up at https://ngrok.com and copy your authtoken"
Write-Host "  2. Add NGROK_AUTHTOKEN=... to .env  OR  ngrok config add-authtoken TOKEN"
Write-Host "  3. Run .\scripts\deploy-all.ps1"
