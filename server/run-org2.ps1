$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

if ([string]::IsNullOrWhiteSpace($env:PORT)) { $env:PORT = "3001" }
if ([string]::IsNullOrWhiteSpace($env:IPFS_API_URL)) { $env:IPFS_API_URL = "http://127.0.0.1:5001" }
if ([string]::IsNullOrWhiteSpace($env:CHANNEL_NAME)) { $env:CHANNEL_NAME = "mychannel" }
if ([string]::IsNullOrWhiteSpace($env:CHAINCODE_NAME)) { $env:CHAINCODE_NAME = "filemeta" }

$env:MSP_ID = "Org2MSP"
$env:PEER_ENDPOINT = "localhost:9051"
$env:PEER_HOST_ALIAS = "peer0.org2.example.com"
$env:TLS_CERT_PATH = "..\\network\\fabric-samples\\test-network\\organizations\\peerOrganizations\\org2.example.com\\peers\\peer0.org2.example.com\\tls\\ca.crt"
$env:KEY_DIR = "..\\network\\fabric-samples\\test-network\\organizations\\peerOrganizations\\org2.example.com\\users\\User1@org2.example.com\\msp\\keystore"

$signcertsDir = "..\\network\\fabric-samples\\test-network\\organizations\\peerOrganizations\\org2.example.com\\users\\User1@org2.example.com\\msp\\signcerts"
$cert = Get-ChildItem -Path $signcertsDir -Filter "*.pem" | Select-Object -First 1
if (-not $cert) { throw "No cert found in $signcertsDir" }
$env:CERT_PATH = $cert.FullName

npm start

