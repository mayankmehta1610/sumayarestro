# Expose local PostgreSQL via Cloudflare Tunnel (no ngrok account needed for quick test)
# Usage: .\scripts\tunnel-cloudflared.ps1
#
# Note: Cloudflare quick tunnels are less stable than ngrok for database traffic.
# For production interim use, prefer ngrok with authtoken (see install-tools.ps1).

$ErrorActionPreference = "Stop"
$Port = 5433
$Root = Split-Path $PSScriptRoot -Parent

Write-Host "=== Sumaya Resto — Cloudflare Postgres Tunnel ===" -ForegroundColor Cyan

$listening = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if (-not $listening) {
    Write-Host "Starting PostgreSQL..." -ForegroundColor Yellow
    Push-Location $Root
    docker compose up -d postgres
    Pop-Location
    Start-Sleep -Seconds 5
}

$cf = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cf) {
    Write-Host "cloudflared not found. Install: winget install Cloudflare.cloudflared" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting TCP tunnel on localhost:$Port ..." -ForegroundColor Green
Write-Host "Copy the hostname:port from cloudflared output." -ForegroundColor Yellow
Write-Host ""
Write-Host "Render DATABASE_URL format:" -ForegroundColor Cyan
Write-Host "  postgresql+asyncpg://sumaya:sumaya_secret@HOST:PORT/sumaya_resto" -ForegroundColor White
Write-Host ""
Write-Host "Keep this window open while Render uses your laptop DB." -ForegroundColor Yellow
Write-Host ""

& cloudflared tunnel --url "tcp://localhost:$Port"
