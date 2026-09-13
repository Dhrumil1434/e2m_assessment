$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

if (-not (Test-Path ".venv\Scripts\python.exe")) {
  py -3.12 -m venv .venv
  .\.venv\Scripts\pip.exe install -r requirements.txt
}

if (Test-Path ".env") {
  Get-Content ".env" | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
      $name = $matches[1].Trim()
      $value = $matches[2].Trim()
      Set-Item -Path "env:$name" -Value $value
    }
  }
}

$port = if ($env:AI_WORKER_PORT) { $env:AI_WORKER_PORT } else { "8002" }
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port $port --reload
