[CmdletBinding()]
param(
  [switch]$SkipInstall,
  [switch]$SkipDockerConfig
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Invoke-Step([string]$Name, [scriptblock]$Command) {
  Write-Host "`n=== $Name ===" -ForegroundColor Cyan
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Step failed: $Name (exit code $LASTEXITCODE). Fix this before continuing."
  }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 20 or newer is required.' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm is required.' }
$nodeMajor = [int]((node -p "process.versions.node.split('.')[0]").Trim())
if ($nodeMajor -lt 20) { throw "Node.js 20+ required; found $nodeMajor." }

Write-Host "Product OS 2.0 release verification | Node $(node --version) | npm $(npm --version)" -ForegroundColor Green

if (-not $SkipInstall) {
  Invoke-Step 'Install API dependencies' { npm ci --no-audit --no-fund }
  Invoke-Step 'Install web dependencies' { npm --prefix apps/web install --no-audit --no-fund }
}

Invoke-Step 'Verify source syntax, JSON and migration files' { node ./scripts/verify-source.mjs }
Invoke-Step 'Validate Prisma schema' { npx prisma validate }
Invoke-Step 'Generate Prisma Client' { npx prisma generate }
Invoke-Step 'API TypeScript typecheck' { npm run typecheck }
Invoke-Step 'API unit tests' { npm test -- --coverage=false }
Invoke-Step 'API production build' { npm run build }
Invoke-Step 'Web production build' { npm run web:build }

if (-not $SkipDockerConfig -and (Get-Command docker -ErrorAction SilentlyContinue)) {
  Invoke-Step 'Validate Docker Compose configuration' { docker compose config --quiet }
} elseif (-not $SkipDockerConfig) {
  Write-Warning 'Docker is not installed; Docker Compose configuration check skipped.'
}

Write-Host "`nVERIFICATION PASSED for all executed steps." -ForegroundColor Green
Write-Host 'This script does not apply database migrations or deploy the application.'
Write-Host 'Before production: rehearse migrations on clean and restored databases, run browser E2E/UAT, and complete security/backup checks.'
