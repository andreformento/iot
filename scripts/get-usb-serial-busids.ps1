# List USB serial devices from usbipd. Output: "BUSID STATE" per line (LF only).
# Run from WSL: powershell.exe -ExecutionPolicy Bypass -File get-usb-serial-busids.ps1

$serialKeywords = @('SERIAL', 'CH340', 'CH9102', 'CP210', 'FTDI', 'PL2303')
$inConnected = $false

try {
  $raw = usbipd list 2>&1
  $lines = $raw -split "`r?`n"
} catch {
  exit 0
}

foreach ($line in $lines) {
  if ($line -match '^\s*Connected') {
    $inConnected = $true
    continue
  }
  if ($inConnected -and $line -match '^\s*Persisted') {
    break
  }
  if (-not $inConnected) { continue }

  $isSerial = $false
  foreach ($kw in $serialKeywords) {
    if ($line -match $kw) { $isSerial = $true; break }
  }
  if (-not $isSerial) { continue }

  # BUSID is first column, STATE is last column (Shared, Not shared, or Attached)
  if ($line -match '^\s*(\S+)\s+\S+\s+.*\s+(\S+)\s*$') {
    $busid = $Matches[1].Trim()
    $state = $Matches[2]
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    [Console]::Write($busid + " " + $state + "`n")
  }
}
