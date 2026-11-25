$ErrorActionPreference = 'Stop'

function New-RandomSecret([int]$Bytes = 32) {
  $buffer = New-Object byte[] $Bytes
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($buffer) } finally { $rng.Dispose() }
  return [Convert]::ToBase64String($buffer)
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker Desktop is not installed or docker is not on PATH. Install/start Docker Desktop, then rerun this script.'
}
docker info *> $null
if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop is not running. Start it and rerun this script.' }

if (-not (Test-Path '.env')) { Copy-Item '.env.example' '.env' }
$envText = Get-Content '.env' -Raw
if ($envText -match 'JWT_SECRET="replace-with-a-random-secret-at-least-32-characters"') {
  $envText = $envText.Replace('JWT_SECRET="replace-with-a-random-secret-at-least-32-characters"', "JWT_SECRET=`"$(New-RandomSecret)`"")
}
if ($envText -match 'POSTGRES_PASSWORD="change-this-local-password"') {
  $envText = $envText.Replace('POSTGRES_PASSWORD="change-this-local-password"', "POSTGRES_PASSWORD=`"$(New-RandomSecret 24)`"")
}
Set-Content '.env' $envText -NoNewline

Write-Host 'Starting PostgreSQL…' -ForegroundColor Cyan
docker compose up -d --build postgres
if ($LASTEXITCODE -ne 0) { throw 'Could not start PostgreSQL.' }
Write-Host 'Building API and web images…' -ForegroundColor Cyan
docker compose build api web
if ($LASTEXITCODE -ne 0) { throw 'Docker image build failed.' }
Write-Host 'Synchronising the local development database schema…' -ForegroundColor Cyan
docker compose run --rm api npx prisma db push
if ($LASTEXITCODE -ne 0) { throw 'Database schema sync failed. Review the output before continuing.' }
Write-Host 'Starting Product OS…' -ForegroundColor Cyan
docker compose up -d api web
if ($LASTEXITCODE -ne 0) { throw 'Could not start Product OS services.' }
Write-Host ''
Write-Host 'Product OS is starting:' -ForegroundColor Green
Write-Host '  Web: http://localhost:3001'
Write-Host '  API: http://localhost:3000/api/health'
Write-Host '  API readiness: http://localhost:3000/api/health/ready'
Write-Host 'Create your first account and organisation. Open Project Studio to create initiatives, Document Intelligence to extract and review source documents, or Migration to import your legacy workspace.'
