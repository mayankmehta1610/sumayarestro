# Start local Postgres + Redis + API for development
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

Write-Host "Starting PostgreSQL and Redis..." -ForegroundColor Cyan
docker compose up -d postgres redis

Write-Host "Waiting for database..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

Write-Host "Seeding database (if empty)..." -ForegroundColor Cyan
docker exec sumayarestro-backend-1 python seed.py 2>$null
if ($LASTEXITCODE -ne 0) {
    Push-Location backend
    python seed.py
    Pop-Location
}

Write-Host ""
Write-Host "Local stack ready:" -ForegroundColor Green
Write-Host "  Postgres: localhost:5433"
Write-Host "  Redis:    localhost:6380"
Write-Host "  API:      docker compose up backend  OR  cd backend && uvicorn app.main:app --port 8001"
Write-Host "  Web:      cd web && npm run dev"
Write-Host ""
Write-Host "For Render + laptop DB, run: .\scripts\tunnel-postgres.ps1" -ForegroundColor Yellow
