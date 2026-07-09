# Read active ngrok TCP tunnel for local Postgres (port 5433)
$ErrorActionPreference = "Stop"

try {
    $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 3
} catch {
    Write-Host "ngrok API not reachable on :4040. Start tunnel first:" -ForegroundColor Red
    Write-Host "  .\scripts\tunnel-postgres.ps1" -ForegroundColor Yellow
    exit 1
}

$tcp = $tunnels.tunnels | Where-Object { $_.proto -eq "tcp" -and $_.config.addr -match ":5433$" } | Select-Object -First 1
if (-not $tcp) {
    $tcp = $tunnels.tunnels | Where-Object { $_.proto -eq "tcp" } | Select-Object -First 1
}

if (-not $tcp) {
    Write-Host "No TCP tunnel found. Run .\scripts\tunnel-postgres.ps1" -ForegroundColor Red
    exit 1
}

$public = $tcp.public_url -replace "^tcp://", ""
$hostPart, $portPart = $public -split ":", 2
$dbUrl = "postgresql+asyncpg://sumaya:sumaya_secret@${hostPart}:${portPart}/sumaya_resto"

Write-Host ""
Write-Host "=== Tunnel active ===" -ForegroundColor Green
Write-Host "Public:  $($tcp.public_url)"
Write-Host ""
Write-Host "Render DATABASE_URL:" -ForegroundColor Cyan
Write-Host "  $dbUrl" -ForegroundColor White
Write-Host ""

[PSCustomObject]@{
    PublicUrl  = $tcp.public_url
    Host       = $hostPart
    Port       = $portPart
    DatabaseUrl = $dbUrl
}
