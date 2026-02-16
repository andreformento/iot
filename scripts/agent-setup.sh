#!/usr/bin/env bash
# Run from repo root: ./scripts/agent-setup.sh [WIFI_SSID] [WIFI_PASS] [PORT]
# If WIFI_SSID/WIFI_PASS omitted (WSL2): try to read from Windows current Wi‑Fi connection.
# If PORT omitted: list Windows USB serial (usbipd), attach to WSL, then detect /dev/ttyUSB* or /dev/ttyACM*.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${REPO_ROOT}/iot-agent/.env"

WIFI_SSID="${1:-}"
WIFI_PASS="${2:-}"
PORT_ARG="${3:-}"

is_wsl() {
  # WSL2 exposes a virtual Ethernet adapter, so SSID/password must be queried from Windows.
  local osrel=""
  if [ -r /proc/sys/kernel/osrelease ]; then
    IFS= read -r osrel < /proc/sys/kernel/osrelease || true
  fi
  case "${osrel,,}" in
    *microsoft*) return 0 ;;
    *) return 1 ;;
  esac
}

# --- WIFI: from args, Windows (WSL), or prompt ---
if [ -z "$WIFI_SSID" ] || [ -z "$WIFI_PASS" ]; then
  if command -v powershell.exe >/dev/null 2>&1 && is_wsl; then
    WIN_PS1="$(wslpath -w "$REPO_ROOT/scripts/get-wifi-credentials.ps1" 2>/dev/null || echo "$REPO_ROOT/scripts/get-wifi-credentials.ps1")"
    while IFS= read -r line; do
      line="$(printf '%s' "$line" | tr -d '\r')"
      case "$line" in
        WIFI_SSID=*)
          [ -z "$WIFI_SSID" ] && WIFI_SSID="${line#WIFI_SSID=}"
          ;;
        WIFI_PASS=*)
          [ -z "$WIFI_PASS" ] && WIFI_PASS="${line#WIFI_PASS=}"
          ;;
      esac
    done < <(powershell.exe -ExecutionPolicy Bypass -File "$WIN_PS1" 2>/dev/null || true)
  fi

  if [ -z "$WIFI_SSID" ]; then
    echo "Usage: $0 [WIFI_SSID] [WIFI_PASS] [PORT]"
    echo "Tip (WSL2): omit WIFI_SSID/WIFI_PASS to auto-detect from Windows."
    read -r -p "WiFi SSID: " WIFI_SSID
  fi

  if [ -z "$WIFI_PASS" ]; then
    echo "WiFi password could not be read from Windows (or not available)."
    read -r -s -p "WiFi password (leave empty for open network): " WIFI_PASS
    echo
  fi
fi

if [ -z "$WIFI_SSID" ]; then
  echo "ERROR: WIFI_SSID is required."
  exit 1
fi

# --- PORT: from arg or auto-detect ---
if [ -n "$PORT_ARG" ]; then
  PORT="$PORT_ARG"
else
  if command -v powershell.exe >/dev/null 2>&1; then
    WIN_SCRIPT="$(wslpath -w "$REPO_ROOT/scripts/get-usb-serial-busids.ps1" 2>/dev/null || true)"
    [ -z "$WIN_SCRIPT" ] && WIN_SCRIPT="$REPO_ROOT/scripts/get-usb-serial-busids.ps1"
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      busid="${line%% *}"
      state="${line#* }"
      if [ "$state" = "Not shared" ]; then
        if ! powershell.exe -ExecutionPolicy Bypass -Command "Start-Process usbipd -ArgumentList 'bind','--busid','$busid' -Verb RunAs -Wait" 2>/dev/null; then
          echo "Run in Administrator PowerShell: usbipd bind --busid $busid"
        fi
      fi
      powershell.exe -ExecutionPolicy Bypass -Command "usbipd attach --wsl --busid $busid" 2>/dev/null || true
    done < <(powershell.exe -ExecutionPolicy Bypass -File "$WIN_SCRIPT" 2>/dev/null || true)
    sleep 1
  fi

  PORTS=($(ls /dev/tty* 2>/dev/null | grep -E 'USB|ACM' || true))
  case ${#PORTS[@]} in
    0)
      echo "ERROR: No serial port found (USB/ACM). Plug the device or pass PORT."
      exit 1
      ;;
    1) PORT="${PORTS[0]}" ;;
    *)
      echo "More than one serial port:"
      select p in "${PORTS[@]}"; do
        [ -n "$p" ] && PORT="$p" && break
      done
      ;;
  esac
fi

# --- MQTT broker (Windows host when WSL) ---
MQTT_BROKER=""
if command -v powershell.exe >/dev/null 2>&1 && is_wsl; then
  WIN_PS1="$(wslpath -w "$REPO_ROOT/scripts/get-mqtt-broker-ip.ps1" 2>/dev/null || echo "$REPO_ROOT/scripts/get-mqtt-broker-ip.ps1")"
  MQTT_BROKER=$(powershell.exe -ExecutionPolicy Bypass -File "$WIN_PS1" 2>/dev/null | tr -d '\r' | sed 's/^MQTT_BROKER=//' | tr -d '\n') || true
fi

# --- Write .env ---
printf 'WIFI_SSID="%s"\nWIFI_PASS="%s"\nMQTT_BROKER=%s\nPORT="%s"\n' \
  "$WIFI_SSID" "$WIFI_PASS" "$MQTT_BROKER" "$PORT" > "$ENV_FILE"
echo "Created $ENV_FILE (PORT=$PORT)"
