#!/usr/bin/env bash
# Detect Windows host IP from WSL and write HOST_IP to .env at repo root.
# Run from repo root: bash scripts/docker-env.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"

is_wsl() {
  local osrel=""
  if [ -r /proc/sys/kernel/osrelease ]; then
    IFS= read -r osrel < /proc/sys/kernel/osrelease || true
  fi
  case "${osrel,,}" in
    *microsoft*) return 0 ;;
    *) return 1 ;;
  esac
}

HOST_IP=""

if command -v powershell.exe >/dev/null 2>&1 && is_wsl; then
  WIN_PS1="$(wslpath -w "$REPO_ROOT/scripts/get-mqtt-broker-ip.ps1" 2>/dev/null || echo "$REPO_ROOT/scripts/get-mqtt-broker-ip.ps1")"
  HOST_IP=$(powershell.exe -ExecutionPolicy Bypass -File "$WIN_PS1" 2>/dev/null \
    | tr -d '\r' | sed 's/^MQTT_BROKER=//' | tr -d '\n') || true
fi

if [ -z "$HOST_IP" ]; then
  HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}') || true
fi

if [ -z "$HOST_IP" ]; then
  echo "ERROR: Could not detect host IP. Set HOST_IP manually in .env"
  exit 1
fi

printf 'HOST_IP=%s\n' "$HOST_IP" > "$ENV_FILE"
echo "HOST_IP=$HOST_IP written to $ENV_FILE"
