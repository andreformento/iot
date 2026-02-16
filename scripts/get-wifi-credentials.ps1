# Output current Windows Wi‑Fi SSID and (if available) saved password.
# Output format: KEY=VALUE per line (LF only) for easy parsing from WSL.
# Run from WSL: powershell.exe -ExecutionPolicy Bypass -File get-wifi-credentials.ps1

$iface = netsh wlan show interfaces 2>&1
$ssidLine = $iface | Select-String -Pattern '^\s*SSID\s*:' | Select-Object -First 1

if (-not $ssidLine) {
  Write-Host "No WiFi SSID found. Connect to Wi-Fi and try again."
  exit 1
}

$ssid = ($ssidLine.Line -split ":", 2)[1].Trim()
[Console]::Write("WIFI_SSID=$ssid`n")

# Try to read saved password (may require admin / policy permissions; may be absent for open networks).
$pass = ""
try {
  $profile = netsh wlan show profile name="$ssid" key=clear 2>&1
  $keyLine = $profile | Select-String -Pattern 'Key Content' | Select-Object -First 1
  if ($keyLine) {
    $pass = ($keyLine.Line -split ":", 2)[1].Trim()
  }
} catch {
  $pass = ""
}

[Console]::Write("WIFI_PASS=$pass`n")

