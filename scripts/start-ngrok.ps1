# Single ngrok tunnel for E2M (free plan = one public URL)
# Forwards https://*.ngrok-free.dev -> localhost:5173
# Vite proxies /api -> localhost:3000 (see frontend/vite.config.ts)
#
# Usage:
#   1. Stop any existing ngrok session (Ctrl-C) — especially ones pointing at :80
#   2. .\scripts\start-ngrok.ps1
#   3. In another terminal: .\scripts\apply-ngrok-env.ps1
#   4. Restart Nest + Vite, open the printed HTTPS URL

$ErrorActionPreference = "Stop"

function Get-NgrokVersion([string]$exe) {
  try {
    $out = & $exe version 2>&1 | Out-String
    if ($out -match '(\d+)\.(\d+)\.(\d+)') {
      return [version]"$($Matches[1]).$($Matches[2]).$($Matches[3])"
    }
  } catch {}
  return [version]"0.0.0"
}

function Find-NgrokExe {
  $candidates = @()
  $cmd = Get-Command ngrok -ErrorAction SilentlyContinue
  if ($cmd) { $candidates += $cmd.Source }

  $searchRoots = @(
    (Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages"),
    (Join-Path $env:LOCALAPPDATA "ngrok"),
    (Join-Path $env:USERPROFILE "AppData\Local")
  )
  foreach ($root in $searchRoots) {
    if (-not (Test-Path $root)) { continue }
    Get-ChildItem -Path $root -Filter ngrok.exe -Recurse -ErrorAction SilentlyContinue |
      Select-Object -First 5 |
      ForEach-Object { $candidates += $_.FullName }
  }

  $best = $null
  $bestVer = [version]"0.0.0"
  foreach ($path in ($candidates | Select-Object -Unique)) {
    $ver = Get-NgrokVersion $path
    if ($ver -gt $bestVer) {
      $bestVer = $ver
      $best = $path
    }
  }

  if (-not $best) {
    Write-Error "ngrok not found. Install from https://ngrok.com/download (need 3.20+)"
  }
  if ($bestVer -lt [version]"3.20.0") {
    Write-Warning "Found ngrok $bestVer at $best — account may require 3.20+. Update: open ngrok and press Ctrl-U, or reinstall from ngrok.com/download"
  }

  return @{ Path = $best; Version = $bestVer }
}

$ngrok = Find-NgrokExe
Write-Host "Using ngrok $($ngrok.Version) at $($ngrok.Path)"
Write-Host "Starting single tunnel -> http://127.0.0.1:5173"
Write-Host "Inspector: http://127.0.0.1:4040"
Write-Host ""
Write-Host "IMPORTANT: Stop other ngrok agents first (free plan allows one)."
Write-Host "After this is online, run: .\scripts\apply-ngrok-env.ps1"
Write-Host ""

Get-Process ngrok -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Host "Stopping existing ngrok PID $($_.Id)..."
  Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 1

& $ngrok.Path http 5173
