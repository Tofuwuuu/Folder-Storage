param(
  [string]$FabricSamplesVersion = "main",
  [string]$FabricVersion = "",
  [string]$FabricCAVersion = ""
)

$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$networkDir = Resolve-Path (Join-Path $here ".")
$samplesDir = Join-Path $networkDir "fabric-samples"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "git is required to clone fabric-samples. Install Git and retry."
}

$gitExe = (Get-Command git).Source
$gitRoot = Split-Path (Split-Path $gitExe -Parent) -Parent
$gitBash = Join-Path $gitRoot "bin\\bash.exe"

if (-not (Test-Path $samplesDir)) {
  Write-Host "Cloning fabric-samples into $samplesDir"
  git clone --depth 1 --branch $FabricSamplesVersion https://github.com/hyperledger/fabric-samples.git $samplesDir
} else {
  Write-Host "fabric-samples already exists at $samplesDir"
}

if (-not (Test-Path $gitBash)) {
  throw "Git Bash not found at $gitBash. Ensure Git for Windows is installed (includes bash.exe)."
}

Write-Host "Downloading official install-fabric.sh (binaries + docker images)"
$installScript = Join-Path $samplesDir "install-fabric.sh"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh" -OutFile $installScript

Write-Host "Running install-fabric.sh"
pushd $samplesDir
try {
  $args = @("binary", "docker")
  if ($FabricVersion -ne "") { $args = @("-f", $FabricVersion) + $args }
  if ($FabricCAVersion -ne "") { $args = @("-c", $FabricCAVersion) + $args }
  & $gitBash "./install-fabric.sh" @args
} finally {
  popd
}

Write-Host "Bootstrap complete."

