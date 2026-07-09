# One-shot local deploy prep: Docker stack + seed + ngrok tunnel + Render env hints
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Sumaya Resto — Full Deploy Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Docker stack
Write-Host "[1/5] Starting PostgreSQL + Redis + API..." -ForegroundColor Yellow
docker compose up -d postgres redis backend
Start-Sleep -Seconds 10

$pg = docker compose ps postgres --format "{{.Status}}" 2>$null
Write-Host "  Postgres: $pg" -ForegroundColor Gray

# 2. Seed
Write-Host "[2/5] Seeding database..." -ForegroundColor Yellow
docker exec sumayarestro-backend-1 python seed.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Seed via local Python..." -ForegroundColor Gray
    Push-Location backend
    python seed.py
    Pop-Location
}

# 3. API health
Write-Host "[3/5] Checking API..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8001/health" -TimeoutSec 10
    Write-Host "  API: $($health.status) | DB: $($health.database)" -ForegroundColor Green
} catch {
    Write-Host "  API not ready yet. Wait and retry: http://localhost:8001/health" -ForegroundColor Red
}

# 4. ngrok
Write-Host "[4/5] PostgreSQL tunnel..." -ForegroundColor Yellow
$ngrok = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrok) {
    Write-Host "  ngrok not found. Run: .\scripts\install-tools.ps1" -ForegroundColor Red
} else {
    $existing = $null
    try {
        $existing = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 2
    } catch { }

    if ($existing -and ($existing.tunnels | Where-Object { $_.proto -eq "tcp" })) {
        Write-Host "  Tunnel already running." -ForegroundColor Green
        & "$PSScriptRoot\get-tunnel-url.ps1"
    } else {
        Write-Host "  Starting ngrok in a new window (keep it open)..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-File", "$PSScriptRoot\tunnel-postgres.ps1"
        Write-Host "  Waiting for tunnel (up to 20s)..." -ForegroundColor Gray
        $ready = $false
        for ($i = 0; $i -lt 10; $i++) {
            Start-Sleep -Seconds 2
            try {
                $t = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 2
                if ($t.tunnels | Where-Object { $_.proto -eq "tcp" }) { $ready = $true; break }
            } catch { }
        }
        if ($ready) {
            & "$PSScriptRoot\get-tunnel-url.ps1"
        } else {
            Write-Host "  Tunnel starting — run .\scripts\get-tunnel-url.ps1 when ngrok shows Forwarding" -ForegroundColor Yellow
        }
    }
}

# 5. Render checklist
Write-Host ""
Write-Host "[5/5] Render deploy checklist" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. https://dashboard.render.com → New → Blueprint" -ForegroundColor White
Write-Host "  2. Connect: github.com/mayankmehta1610/sumayarestro" -ForegroundColor White
Write-Host "  3. On sumaya-api set DATABASE_URL (from tunnel output above)" -ForegroundColor White
Write-Host "  4. Deploy — CORS + VITE_API_URL are pre-set in render.yaml" -ForegroundColor White
Write-Host "  5. Verify: https://sumaya-api.onrender.com/health" -ForegroundColor White
Write-Host "  6. Open:  https://sumaya-web.onrender.com/r/spice-garden/login" -ForegroundColor White
Write-Host ""
Write-Host "  Demo login: waiter@spice-garden.com / Sumaya@123" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Keep Docker + ngrok running while Render uses your laptop DB." -ForegroundColor Yellow
Write-Host ""
