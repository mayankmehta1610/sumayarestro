# Expose local PostgreSQL (docker port 5433) to the internet for Render backend
# Requires: ngrok — https://ngrok.com/download
#
# Usage:
#   1. docker compose up -d postgres
#   2. .\scripts\tunnel-postgres.ps1
#   3. Copy the "Forwarding" tcp://HOST:PORT from ngrok output
#   4. Set Render env DATABASE_URL:
#      postgresql+asyncpg://sumaya:sumaya_secret@HOST:PORT/sumaya_resto
#
# Optional: set NGROK_AUTHTOKEN in .env or environment for stable URLs

$ErrorActionPreference = "Stop"
$Port = 5433

Write-Host "=== Sumaya Resto — PostgreSQL Tunnel ===" -ForegroundColor Cyan
Write-Host ""

# Check postgres is listening
$listening = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if (-not $listening) {
    Write-Host "PostgreSQL not on port $Port. Starting docker..." -ForegroundColor Yellow
    Push-Location (Split-Path $PSScriptRoot -Parent)
    docker compose up -d postgres
    Pop-Location
    Start-Sleep -Seconds 5
}

# Load ngrok token from .env if present
$envFile = Join-Path (Split-Path $PSScriptRoot -Parent) ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*NGROK_AUTHTOKEN=(.+)$') {
            $env:NGROK_AUTHTOKEN = $matches[1].Trim()
        }
    }
}

$ngrok = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrok) {
    Write-Host "ngrok not found. Install: .\scripts\install-tools.ps1" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative — Cloudflare Tunnel:" -ForegroundColor Yellow
    Write-Host "  .\scripts\tunnel-cloudflared.ps1"
    exit 1
}

if (-not $env:NGROK_AUTHTOKEN -and -not (Test-Path "$env:LOCALAPPDATA\ngrok\ngrok.yml") -and -not (Test-Path "$env:USERPROFILE\.ngrok2\ngrok.yml")) {
    Write-Host "ngrok authtoken required (free): https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor Yellow
    Write-Host "  ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor White
    Write-Host "  OR add NGROK_AUTHTOKEN=... to .env" -ForegroundColor White
    Write-Host ""
    Write-Host "Alternative without ngrok account:" -ForegroundColor Yellow
    Write-Host "  .\scripts\tunnel-cloudflared.ps1"
    exit 1
}

if ($env:NGROK_AUTHTOKEN) {
    & ngrok config add-authtoken $env:NGROK_AUTHTOKEN 2>$null
}

Write-Host "Starting ngrok TCP tunnel on localhost:$Port ..." -ForegroundColor Green
Write-Host ""
Write-Host "Set Render DATABASE_URL to:" -ForegroundColor Cyan
Write-Host "  postgresql+asyncpg://sumaya:sumaya_secret@<ngrok-host>:<ngrok-port>/sumaya_resto" -ForegroundColor White
Write-Host ""
Write-Host "Keep this window open while Render uses your laptop DB." -ForegroundColor Yellow
Write-Host ""

& ngrok tcp $Port
