param(
  [string]$ChannelName = "mychannel",
  [string]$ChaincodeName = "filemeta",
  [string]$ChaincodeLang = "go",
  [string]$ChaincodeVersion = "1",
  [int]$ChaincodeSequence = 1
)

$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$networkDir = Resolve-Path (Join-Path $here ".")
$samplesDir = Join-Path $networkDir "fabric-samples"
$testNetworkDir = Join-Path $samplesDir "test-network"

if (-not (Test-Path $testNetworkDir)) {
  throw "Missing $testNetworkDir. Run .\\network\\bootstrap.ps1 first."
}

$ccPath = Resolve-Path (Join-Path $networkDir "..\\chaincode\\filemeta")

$gitExe = (Get-Command git).Source
$gitRoot = Split-Path (Split-Path $gitExe -Parent) -Parent
$gitBash = Join-Path $gitRoot "bin\\bash.exe"
if (-not (Test-Path $gitBash)) {
  throw "Git Bash not found at $gitBash. Ensure Git for Windows is installed (includes bash.exe)."
}

& (Join-Path $networkDir "ensure-jq.ps1")
$toolsDir = Join-Path $networkDir "tools"
$env:PATH = "$toolsDir;$env:PATH"

# Prevent Git Bash from rewriting paths like /var/run into "C:\Program Files\Git\var\run"
$env:MSYS_NO_PATHCONV = "1"
$env:MSYS2_ARG_CONV_EXCL = "*"

function ToGitBashPath([string]$p) {
  $p = (Resolve-Path $p).Path
  $drive = $p.Substring(0, 1).ToLowerInvariant()
  $rest = $p.Substring(2).Replace('\', '/')
  return "/$drive$rest"
}

# Avoid spaces in TEST_NETWORK_HOME by using a subst drive.
$substDrive = "S:"
$substTarget = Resolve-Path (Join-Path $networkDir "..")
if (-not (Test-Path $substDrive)) {
  subst $substDrive $substTarget.Path | Out-Null
}

$testNetworkSubst = Join-Path $substDrive "network\\fabric-samples\\test-network"
$ccSubst = Join-Path $substDrive "chaincode\\filemeta"

pushd $testNetworkDir
try {
  Write-Host "Starting Fabric test-network"
  pushd $testNetworkSubst
  try {
    $tnTools = "/s/network/tools"
    $tnHome = "/s/network/fabric-samples/test-network"
    $cfgPath = "S:/network/fabric-samples/test-network/configtx"
    & $gitBash "-lc" "cd $tnHome && FABRIC_CFG_PATH=$cfgPath PATH=${tnTools}:`$PATH bash ./network.sh down"
    & $gitBash "-lc" "cd $tnHome && FABRIC_CFG_PATH=$cfgPath PATH=${tnTools}:`$PATH bash ./network.sh up createChannel -c $ChannelName"

    # Use Windows-style path for Go chaincode packaging on Windows.
    $ccp = "S:/chaincode/filemeta"
    Write-Host "Deploying chaincode $ChaincodeName from $ccp"
    & $gitBash "-lc" "cd $tnHome && FABRIC_CFG_PATH=$cfgPath PATH=${tnTools}:`$PATH bash ./network.sh deployCC -c $ChannelName -ccn $ChaincodeName -ccp ""$ccp"" -ccl $ChaincodeLang -ccv $ChaincodeVersion -ccs $ChaincodeSequence"
  } finally {
    popd
  }
} finally {
  popd
}

Write-Host "Network is up and chaincode deployed."

