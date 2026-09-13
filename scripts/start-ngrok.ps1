# Dual ngrok tunnels for E2M (frontend :5173 + API :3000)
# Requires: ngrok installed and authenticated (ngrok config add-authtoken <token>)
#
# Usage:
#   .\scripts\start-ngrok.ps1
# Then copy the printed HTTPS URLs into backend/.env + frontend/.env (or apply .env.ngrok)
# and restart Nest + Vite.

$ErrorActionPreference = "Stop"

function Assert-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Error "'$name' not found on PATH. Install from https://ngrok.com/download"
  }
}

Assert-Command ngrok

$configDir = Join-Path $env:USERPROFILE ".ngrok-e2m"
New-Item -ItemType Directory -Force -Path $configDir | Out-Null
$configPath = Join-Path $configDir "ngrok.yml"

@"
version: "2"
tunnels:
  e2m-frontend:
    addr: 5173
    proto: http
  e2m-api:
    addr: 3000
    proto: http
"@ | Set-Content -Path $configPath -Encoding UTF8

Write-Host "Starting ngrok tunnels (frontend:5173, api:3000)..."
Write-Host "Config: $configPath"
Write-Host "Inspector: http://127.0.0.1:4040"
Write-Host ""
Write-Host "After tunnels are up, run in another terminal:"
Write-Host "  .\scripts\apply-ngrok-env.ps1"
Write-Host "Then restart backend and frontend."
Write-Host ""

# Prefer local agent config if present; otherwise use generated tunnel file with --config
$agentConfig = Join-Path $env:LOCALAPPDATA "ngrok\ngrok.yml"
if (-not (Test-Path $agentConfig)) {
  $agentConfig = Join-Path $env:USERPROFILE ".ngrok2\ngrok.yml"
}

if (Test-Path $agentConfig) {
  ngrok start --all --config $agentConfig --config $configPath
} else {
  Write-Host "No ngrok authtoken config found. Run: ngrok config add-authtoken <token>"
  ngrok start --all --config $configPath
}
