param(
  [string]$ExternalAuthEnabled = "1",
  [string]$PublicDomain = "project.nts.nl",
  [string]$ProxyHttpPort = "8087",
  [string]$ProxyHttpsPort = "8443",
  [switch]$SkipBuild,
  [switch]$Logs
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Ensure-EnvFile {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$ExamplePath
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    Copy-Item -LiteralPath $ExamplePath -Destination $Path
    Write-Host "Created $Path from $ExamplePath"
  }
}

function Set-EnvValue {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Key,
    [Parameter(Mandatory = $true)][string]$Value
  )

  $lines = @()
  if (Test-Path -LiteralPath $Path) {
    $lines = Get-Content -LiteralPath $Path
  }

  $pattern = "^\s*$([regex]::Escape($Key))="
  $replacement = "$Key=$Value"
  $found = $false
  $updated = foreach ($line in $lines) {
    if ($line -match $pattern) {
      $found = $true
      $replacement
    } else {
      $line
    }
  }

  if (-not $found) {
    $updated += $replacement
  }

  Set-Content -LiteralPath $Path -Value $updated
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker was not found. Install Docker Desktop and start it before running this script."
}

Ensure-EnvFile -Path ".env" -ExamplePath ".env.example"
Ensure-EnvFile -Path "apps/api/.env" -ExamplePath "apps/api/.env.example"

Set-EnvValue -Path ".env" -Key "VITE_EXTERNAL_AUTH_ENABLED" -Value $ExternalAuthEnabled
Set-EnvValue -Path ".env" -Key "LISTEN_HTTP_PORT" -Value "127.0.0.1:$ProxyHttpPort"
Set-EnvValue -Path ".env" -Key "LISTEN_HTTPS_PORT" -Value "127.0.0.1:$ProxyHttpsPort"
Set-EnvValue -Path ".env" -Key "SITE_ADDRESS" -Value ":80"
Set-EnvValue -Path ".env" -Key "TRUSTED_PROXIES" -Value "0.0.0.0/0"
Set-EnvValue -Path ".env" -Key "MINIO_ENDPOINT_SSL" -Value "1"

$publicOrigin = "https://$PublicDomain"
Set-EnvValue -Path "apps/api/.env" -Key "WEB_URL" -Value "`"$publicOrigin`""
Set-EnvValue -Path "apps/api/.env" -Key "APP_BASE_URL" -Value "`"$publicOrigin`""
Set-EnvValue -Path "apps/api/.env" -Key "APP_BASE_PATH" -Value "`"`""
Set-EnvValue -Path "apps/api/.env" -Key "ADMIN_BASE_URL" -Value "`"$publicOrigin`""
Set-EnvValue -Path "apps/api/.env" -Key "ADMIN_BASE_PATH" -Value "`"/god-mode`""
Set-EnvValue -Path "apps/api/.env" -Key "SPACE_BASE_URL" -Value "`"$publicOrigin`""
Set-EnvValue -Path "apps/api/.env" -Key "SPACE_BASE_PATH" -Value "`"/spaces`""
Set-EnvValue -Path "apps/api/.env" -Key "LIVE_BASE_URL" -Value "`"$publicOrigin`""
Set-EnvValue -Path "apps/api/.env" -Key "LIVE_BASE_PATH" -Value "`"/live`""
Set-EnvValue -Path "apps/api/.env" -Key "CORS_ALLOWED_ORIGINS" -Value "`"$publicOrigin`""
Set-EnvValue -Path "apps/api/.env" -Key "AWS_S3_ENDPOINT_URL" -Value "`"http://plane-minio:9000`""
Set-EnvValue -Path "apps/api/.env" -Key "USE_MINIO" -Value "1"
Set-EnvValue -Path "apps/api/.env" -Key "MINIO_ENDPOINT_SSL" -Value "1"

Write-Host "Using VITE_EXTERNAL_AUTH_ENABLED=$ExternalAuthEnabled"
Write-Host "Configured Apache-facing origin: $publicOrigin"
Write-Host "Plane proxy will listen on 127.0.0.1:$ProxyHttpPort for Apache ProxyPass."
Write-Host "Review .env and apps/api/.env before production use, especially passwords, domains, and SSL settings."

if (-not $SkipBuild) {
  docker compose -f docker-compose.yml build
}

docker compose -f docker-compose.yml up -d plane-db plane-redis plane-mq plane-minio
docker compose -f docker-compose.yml run --rm migrator
docker compose -f docker-compose.yml up -d

Write-Host "Plane production stack is starting."
Write-Host "App:   $publicOrigin"
Write-Host "Admin: $publicOrigin/god-mode"

if ($Logs) {
  docker compose -f docker-compose.yml logs -f api web proxy
}
