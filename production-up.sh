#!/usr/bin/env bash
set -euo pipefail

EXTERNAL_AUTH_ENABLED="1"
PUBLIC_DOMAIN="project.nts.nl"
PROXY_HTTP_PORT="8087"
PROXY_HTTPS_PORT="8443"
SKIP_BUILD="0"
LOGS="0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --external-auth-enabled)
      EXTERNAL_AUTH_ENABLED="${2:-}"
      if [[ -z "$EXTERNAL_AUTH_ENABLED" ]]; then
        echo "--external-auth-enabled requires a value" >&2
        exit 1
      fi
      shift 2
      ;;
    --domain)
      PUBLIC_DOMAIN="${2:-}"
      if [[ -z "$PUBLIC_DOMAIN" ]]; then
        echo "--domain requires a value" >&2
        exit 1
      fi
      shift 2
      ;;
    --proxy-http-port)
      PROXY_HTTP_PORT="${2:-}"
      if [[ -z "$PROXY_HTTP_PORT" ]]; then
        echo "--proxy-http-port requires a value" >&2
        exit 1
      fi
      shift 2
      ;;
    --proxy-https-port)
      PROXY_HTTPS_PORT="${2:-}"
      if [[ -z "$PROXY_HTTPS_PORT" ]]; then
        echo "--proxy-https-port requires a value" >&2
        exit 1
      fi
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD="1"
      shift
      ;;
    --logs)
      LOGS="1"
      shift
      ;;
    -h|--help)
      echo "Usage: ./production-up.sh [--domain project.nts.nl] [--external-auth-enabled 1|0] [--proxy-http-port 8087] [--skip-build] [--logs]"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Usage: ./production-up.sh [--domain project.nts.nl] [--external-auth-enabled 1|0] [--proxy-http-port 8087] [--skip-build] [--logs]" >&2
      exit 1
      ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

ensure_env_file() {
  local path="$1"
  local example_path="$2"

  if [[ ! -f "$path" ]]; then
    cp "$example_path" "$path"
    echo "Created $path from $example_path"
  fi
}

set_env_value() {
  local path="$1"
  local key="$2"
  local value="$3"

  if grep -qE "^[[:space:]]*${key}=" "$path"; then
    sed -i.bak -E "s|^[[:space:]]*${key}=.*|${key}=${value}|" "$path"
    rm -f "${path}.bak"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$path"
  fi
}

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker was not found. Install Docker and start it before running this script." >&2
  exit 1
fi

ensure_env_file ".env" ".env.example"
ensure_env_file "apps/api/.env" "apps/api/.env.example"

set_env_value ".env" "VITE_EXTERNAL_AUTH_ENABLED" "$EXTERNAL_AUTH_ENABLED"
set_env_value ".env" "LISTEN_HTTP_PORT" "127.0.0.1:$PROXY_HTTP_PORT"
set_env_value ".env" "LISTEN_HTTPS_PORT" "127.0.0.1:$PROXY_HTTPS_PORT"
set_env_value ".env" "SITE_ADDRESS" ":80"
set_env_value ".env" "TRUSTED_PROXIES" "0.0.0.0/0"
set_env_value ".env" "MINIO_ENDPOINT_SSL" "1"

PUBLIC_ORIGIN="https://$PUBLIC_DOMAIN"
set_env_value "apps/api/.env" "WEB_URL" "\"$PUBLIC_ORIGIN\""
set_env_value "apps/api/.env" "APP_BASE_URL" "\"$PUBLIC_ORIGIN\""
set_env_value "apps/api/.env" "APP_BASE_PATH" "\"\""
set_env_value "apps/api/.env" "ADMIN_BASE_URL" "\"$PUBLIC_ORIGIN\""
set_env_value "apps/api/.env" "ADMIN_BASE_PATH" "\"/god-mode\""
set_env_value "apps/api/.env" "SPACE_BASE_URL" "\"$PUBLIC_ORIGIN\""
set_env_value "apps/api/.env" "SPACE_BASE_PATH" "\"/spaces\""
set_env_value "apps/api/.env" "LIVE_BASE_URL" "\"$PUBLIC_ORIGIN\""
set_env_value "apps/api/.env" "LIVE_BASE_PATH" "\"/live\""
set_env_value "apps/api/.env" "CORS_ALLOWED_ORIGINS" "\"$PUBLIC_ORIGIN\""
set_env_value "apps/api/.env" "AWS_S3_ENDPOINT_URL" "\"http://plane-minio:9000\""
set_env_value "apps/api/.env" "USE_MINIO" "1"
set_env_value "apps/api/.env" "MINIO_ENDPOINT_SSL" "1"

echo "Using VITE_EXTERNAL_AUTH_ENABLED=$EXTERNAL_AUTH_ENABLED"
echo "Configured Apache-facing origin: $PUBLIC_ORIGIN"
echo "Plane proxy will listen on 127.0.0.1:$PROXY_HTTP_PORT for Apache ProxyPass."
echo "Review .env and apps/api/.env before production use, especially passwords, domains, and SSL settings."

if [[ "$SKIP_BUILD" != "1" ]]; then
  docker compose -f docker-compose.yml build
fi

docker compose -f docker-compose.yml up -d plane-db plane-redis plane-mq plane-minio
docker compose -f docker-compose.yml run --rm migrator
docker compose -f docker-compose.yml up -d

echo "Plane production stack is starting."
echo "App:   $PUBLIC_ORIGIN"
echo "Admin: $PUBLIC_ORIGIN/god-mode"

if [[ "$LOGS" == "1" ]]; then
  docker compose -f docker-compose.yml logs -f api web proxy
fi
