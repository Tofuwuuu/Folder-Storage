param(
  [string]$ToolsDir = ""
)

$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$networkDir = Resolve-Path (Join-Path $here ".")
$toolsDir = if ($ToolsDir -ne "") { $ToolsDir } else { Join-Path $networkDir "tools" }
$jqPath = Join-Path $toolsDir "jq.exe"

New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

if (Test-Path $jqPath) {
  Write-Host "jq already present at $jqPath"
  exit 0
}

# Download jq from official GitHub releases (Windows amd64).
# Note: using the direct asset URL avoids HTML "download" wrapper pages.
$url = "https://github.com/jqlang/jq/releases/download/jq-1.8.0/jq-windows-amd64.exe"

Write-Host "Downloading jq.exe to $jqPath"
Invoke-WebRequest -Uri $url -OutFile $jqPath

Write-Host "jq downloaded."

