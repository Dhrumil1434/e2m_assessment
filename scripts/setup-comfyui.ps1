# One-time ComfyUI setup for E2M (Python 3.12, SD 1.5 inpainting, T1200 low VRAM)
$ErrorActionPreference = "Stop"
$ComfyRoot = "d:\Projects\ComfyUI"
$CheckpointUrl = "https://huggingface.co/runwayml/stable-diffusion-inpainting/resolve/main/sd-v1-5-inpainting.ckpt"
$CheckpointPath = Join-Path $ComfyRoot "models\checkpoints\sd-v1-5-inpainting.ckpt"

if (-not (Test-Path $ComfyRoot)) {
  git clone --depth 1 https://github.com/comfyanonymous/ComfyUI.git $ComfyRoot
}

if (-not (Test-Path (Join-Path $ComfyRoot ".venv"))) {
  py -3.12 -m venv (Join-Path $ComfyRoot ".venv")
}

$Python = Join-Path $ComfyRoot ".venv\Scripts\python.exe"
& $Python -m pip install --upgrade pip
# PyTorch 2.5.1 is required; 2.6 breaks comfy_kitchen custom_op schemas on Windows
& $Python -m pip install torch==2.5.1+cu124 torchvision==0.20.1+cu124 torchaudio==2.5.1+cu124 --index-url https://download.pytorch.org/whl/cu124
& $Python -m pip install -r (Join-Path $ComfyRoot "requirements.txt") --default-timeout=600

New-Item -ItemType Directory -Force -Path (Join-Path $ComfyRoot "models\checkpoints") | Out-Null

if (-not (Test-Path $CheckpointPath)) {
  Write-Host "Downloading SD 1.5 inpainting checkpoint (~4 GB)..."
  Invoke-WebRequest -Uri $CheckpointUrl -OutFile $CheckpointPath -UseBasicParsing
}

# Patch comfy_kitchen torch custom_op type hints (Windows + torch 2.5)
$NaPy = Join-Path $ComfyRoot ".venv\Lib\site-packages\comfy_kitchen\backends\eager\na.py"
$SolPy = Join-Path $ComfyRoot ".venv\Lib\site-packages\comfy_kitchen\backends\eager\sol_attn.py"
foreach ($file in @($NaPy, $SolPy)) {
  if (Test-Path $file) {
    (Get-Content $file -Raw) `
      -replace 'list\[int\]', 'List[int]' `
      -replace 'list\[bool\]', 'List[bool]' |
      ForEach-Object {
        if ($_ -match 'List\[' -and $_ -notmatch 'from typing import List') {
          $_ -replace '(import torch\r?\n)', "`$1from typing import List`r`n"
        } else { $_ }
      } | Set-Content $file -NoNewline
  }
}

Write-Host "ComfyUI ready. Start with: .\scripts\start-comfyui.ps1"
