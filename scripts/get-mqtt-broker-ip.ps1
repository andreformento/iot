# Discover Windows WiFi IPv4 for ESP32 MQTT_BROKER (run from PowerShell on Windows)

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
  $_.InterfaceAlias -match 'Wi-Fi' -and
  $_.IPAddress -notmatch '^169\.254\.' -and
  $_.IPAddress -notmatch '^172\.'
} | Select-Object -First 1).IPAddress

if ($ip) {
  # Use LF only (no CR) so eval $(powershell.exe ...) in WSL gets a clean value
  [Console]::Write("MQTT_BROKER=$ip`n")
} else {
  Write-Host "No WiFi IPv4 found. Connect to Wi-Fi and try again."
  exit 1
}
