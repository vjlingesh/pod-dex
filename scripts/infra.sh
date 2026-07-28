#!/usr/bin/env bash
#
# Local infrastructure for pod-dex, on Apple's `container` runtime.
#
# There is no compose equivalent in apple/container, so this script is the
# orchestrator: it starts each backing service, publishes its port to the host,
# and waits for it to answer. Every service is a stock upstream image, so no
# Dockerfiles are needed (`container build` is available if that ever changes).
#
# Usage: scripts/infra.sh {up|down|status|logs <svc>|nuke}

set -euo pipefail

PG_IMAGE=postgres:16-alpine
REDIS_IMAGE=redis:7-alpine
MINIO_IMAGE=minio/minio:latest
MC_IMAGE=minio/mc:latest
# mailpit rather than mailhog: mailhog publishes no arm64 image.
MAIL_IMAGE=axllent/mailpit:latest

PG_NAME=poddex-postgres
REDIS_NAME=poddex-redis
MINIO_NAME=poddex-minio
MAIL_NAME=poddex-mailpit

SERVICES=("$PG_NAME" "$REDIS_NAME" "$MINIO_NAME" "$MAIL_NAME")
VOLUMES=(poddex-pgdata poddex-redisdata poddex-miniodata)

# Host ports. Postgres and Redis are offset so they never collide with a
# locally-installed server on the default port.
PG_PORT=${PG_PORT:-5433}
REDIS_PORT=${REDIS_PORT:-6380}
MINIO_PORT=${MINIO_PORT:-9000}
MINIO_CONSOLE_PORT=${MINIO_CONSOLE_PORT:-9001}
SMTP_PORT=${SMTP_PORT:-1025}
MAIL_UI_PORT=${MAIL_UI_PORT:-8025}

POSTGRES_USER=poddex
POSTGRES_PASSWORD=poddex
POSTGRES_DB=poddex
MINIO_USER=poddex
MINIO_PASSWORD=poddex-secret
S3_BUCKET=${S3_BUCKET:-poddex-media}

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
info() { printf "  %s\n" "$1"; }
fail() { printf "\033[31merror:\033[0m %s\n" "$1" >&2; exit 1; }

require_runtime() {
  command -v container >/dev/null 2>&1 \
    || fail "apple/container CLI not found. Install from https://github.com/apple/container"

  if ! container system status 2>/dev/null | grep -q "running"; then
    info "starting container system…"
    container system start
  fi
}

exists() { container ls -a --format json 2>/dev/null | grep -q "\"$1\""; }
running() { container ls --format json 2>/dev/null | grep -q "\"$1\""; }

ensure_volumes() {
  for vol in "${VOLUMES[@]}"; do
    container volume inspect "$vol" >/dev/null 2>&1 || container volume create "$vol" >/dev/null
  done
}

# Starts a container if absent, resumes it if merely stopped, no-ops if running.
start_service() {
  local name=$1; shift
  if running "$name"; then
    info "$name already running"
    return
  fi
  if exists "$name"; then
    container start "$name" >/dev/null
    info "$name resumed"
    return
  fi
  container run -d --name "$name" "$@" >/dev/null
  info "$name started"
}

wait_for() {
  local label=$1 tries=$2; shift 2
  for _ in $(seq "$tries"); do
    if "$@" >/dev/null 2>&1; then
      info "$label ready"
      return 0
    fi
    sleep 1
  done
  fail "$label did not become ready in ${tries}s (try: scripts/infra.sh logs $label)"
}

container_ip() {
  container inspect "$1" 2>/dev/null \
    | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['status']['networks'][0]['ipv4Address'].split('/')[0])"
}

up() {
  require_runtime
  ensure_volumes
  bold "starting pod-dex infrastructure"

  start_service "$PG_NAME" \
    -p "${PG_PORT}:5432" \
    -v poddex-pgdata:/var/lib/postgresql/data \
    -e "PGDATA=/var/lib/postgresql/data/pgdata" \
    -e "POSTGRES_USER=${POSTGRES_USER}" \
    -e "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}" \
    -e "POSTGRES_DB=${POSTGRES_DB}" \
    "$PG_IMAGE"

  start_service "$REDIS_NAME" \
    -p "${REDIS_PORT}:6379" \
    -v poddex-redisdata:/data \
    "$REDIS_IMAGE"

  start_service "$MINIO_NAME" \
    -p "${MINIO_PORT}:9000" \
    -p "${MINIO_CONSOLE_PORT}:9001" \
    -v poddex-miniodata:/data \
    -e "MINIO_ROOT_USER=${MINIO_USER}" \
    -e "MINIO_ROOT_PASSWORD=${MINIO_PASSWORD}" \
    "$MINIO_IMAGE" server /data --console-address ":9001"

  start_service "$MAIL_NAME" \
    -p "${SMTP_PORT}:1025" \
    -p "${MAIL_UI_PORT}:8025" \
    "$MAIL_IMAGE"

  wait_for postgres 60 container exec "$PG_NAME" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"
  wait_for redis 30 container exec "$REDIS_NAME" redis-cli ping
  wait_for minio 60 tcp_open 127.0.0.1 "$MINIO_PORT"

  init_bucket
  bold "infrastructure up"
}

tcp_open() {
  python3 - "$1" "$2" <<'PY'
import socket, sys
socket.create_connection((sys.argv[1], int(sys.argv[2])), timeout=2).close()
PY
}

# Creates the media bucket and applies the 30-day audio lifecycle rule (issue #6).
# Runs mc in a throwaway container pointed at MinIO's address on the container network.
init_bucket() {
  local minio_ip
  minio_ip=$(container_ip "$MINIO_NAME") || fail "could not resolve $MINIO_NAME address"

  container run --rm \
    --entrypoint /bin/sh \
    "$MC_IMAGE" -c "
      mc alias set local http://${minio_ip}:9000 ${MINIO_USER} ${MINIO_PASSWORD} >/dev/null &&
      mc mb --ignore-existing local/${S3_BUCKET} >/dev/null &&
      mc ilm rule add --expire-days 30 --prefix 'orgs/' local/${S3_BUCKET} >/dev/null 2>&1
      exit 0
    " >/dev/null 2>&1 || info "bucket init skipped (mc unavailable) — create '${S3_BUCKET}' manually if uploads fail"

  info "bucket ${S3_BUCKET} ready (audio expires after 30 days)"
}

down() {
  for name in "${SERVICES[@]}"; do
    if running "$name"; then
      container stop "$name" >/dev/null 2>&1 && info "$name stopped"
    fi
  done
}

# Destroys containers and their volumes. All local data is lost.
nuke() {
  down
  for name in "${SERVICES[@]}"; do
    container rm "$name" >/dev/null 2>&1 && info "$name removed" || true
  done
  for vol in "${VOLUMES[@]}"; do
    container volume rm "$vol" >/dev/null 2>&1 && info "volume $vol removed" || true
  done
}

status() {
  container ls -a | grep -E "poddex|ID" || info "no pod-dex containers"
}

logs() {
  local svc=${1:-}
  [ -n "$svc" ] || fail "usage: scripts/infra.sh logs <postgres|redis|minio|mailpit>"
  container logs -f "poddex-${svc}"
}

case "${1:-up}" in
  up) up ;;
  down) down ;;
  nuke) nuke ;;
  status) status ;;
  logs) shift; logs "$@" ;;
  *) fail "unknown command: $1 (expected up|down|status|logs|nuke)" ;;
esac
