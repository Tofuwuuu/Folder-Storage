param(
  [string]$ChannelName = "mychannel"
)

$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$networkDir = Resolve-Path (Join-Path $here ".")
$samplesDir = Join-Path $networkDir "fabric-samples"
$testNetworkDir = Join-Path $samplesDir "test-network"

if (-not (Test-Path $testNetworkDir)) {
  Write-Host "Nothing to stop (test-network not found)."
  exit 0
}

$gitExe = (Get-Command git).Source
$gitRoot = Split-Path (Split-Path $gitExe -Parent) -Parent
$gitBash = Join-Path $gitRoot "bin\\bash.exe"
if (-not (Test-Path $gitBash)) {
  throw "Git Bash not found at $gitBash. Ensure Git for Windows is installed (includes bash.exe)."
}

$substDrive = "S:"
$substTarget = Resolve-Path (Join-Path $networkDir "..")
if (-not (Test-Path $substDrive)) {
  subst $substDrive $substTarget.Path | Out-Null
}
$testNetworkSubst = Join-Path $substDrive "network\\fabric-samples\\test-network"

# Prevent Git Bash path conversion issues with docker mounts.
$env:MSYS_NO_PATHCONV = "1"
$env:MSYS2_ARG_CONV_EXCL = "*"

pushd $testNetworkSubst
try {
  & $gitBash "-lc" "bash ./network.sh down"
} finally {
  popd
}

Write-Host "Network stopped."

