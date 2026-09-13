# Start ComfyUI for E2M photorealistic material inpainting (force NVIDIA T1200)
$ErrorActionPreference = "Stop"
$ComfyRoot = "d:\Projects\ComfyUI"
$VenvPython = Join-Path $ComfyRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $VenvPython)) {
  Write-Error "ComfyUI venv not found. Run scripts/setup-comfyui.ps1 first."
  exit 1
}

$checkpoint = Join-Path $ComfyRoot "models\checkpoints\sd-v1-5-inpainting.ckpt"
if (-not (Test-Path $checkpoint)) {
  Write-Error "Missing checkpoint: $checkpoint"
  exit 1
}

# Force NVIDIA CUDA (avoid Intel iGPU / Optimus routing)
$env:CUDA_VISIBLE_DEVICES = "0"
$env:CUDA_DEVICE_ORDER = "PCI_BUS_ID"
$env:CUDA_MODULE_LOADING = "LAZY"
# Hide Intel oneAPI / OpenVINO fallback paths if present
Remove-Item Env:ONEAPI_DEVICE_SELECTOR -ErrorAction SilentlyContinue
Remove-Item Env:SYCL_DEVICE_FILTER -ErrorAction SilentlyContinue

# Windows graphics preference: High performance (NVIDIA) for ComfyUI Python
$gpuPrefKey = "HKCU:\Software\Microsoft\DirectX\UserGpuPreferences"
if (-not (Test-Path $gpuPrefKey)) {
  New-Item -Path $gpuPrefKey -Force | Out-Null
}
$resolvedPython = (Resolve-Path $VenvPython).Path
# GpuPreference=2 => High performance GPU (NVIDIA on Optimus laptops)
Set-ItemProperty -Path $gpuPrefKey -Name $resolvedPython -Value "GpuPreference=2;" -Type String -Force

Write-Host "Verifying NVIDIA CUDA device..."
& $VenvPython -c @"
import torch, sys
if not torch.cuda.is_available():
    print('ERROR: CUDA is not available. Install torch with CUDA (cu124).')
    sys.exit(1)
name = torch.cuda.get_device_name(0)
print(f'Using GPU 0: {name}')
print(f'torch={torch.__version__} cuda={torch.version.cuda}')
if 'NVIDIA' not in name.upper() and 'T1200' not in name.upper():
    print(f'WARNING: Expected NVIDIA T1200, got: {name}')
"@
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Set-Location $ComfyRoot
Write-Host "Starting ComfyUI on NVIDIA (cuda:0) with --lowvram for 4GB T1200..."
# --cuda-device 0 locks this instance to the first visible NVIDIA GPU
& $VenvPython main.py --port 8188 --lowvram --cuda-device 0 --disable-auto-launch
