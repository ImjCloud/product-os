$ErrorActionPreference = 'Stop'
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker is not available on PATH.' }
docker compose down
if ($LASTEXITCODE -ne 0) { throw 'Could not stop Product OS.' }
Write-Host 'Product OS containers stopped. Your PostgreSQL data volume has been preserved.' -ForegroundColor Green
