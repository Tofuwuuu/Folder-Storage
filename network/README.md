# Network (Fabric test-network)

This PoC uses Hyperledger Fabric's `test-network` as the fastest way to stand up a permissioned network locally.

## Prereqs

- Docker Desktop (Linux containers)
- `curl` (or PowerShell `Invoke-WebRequest`)
- Node.js and Go (for later steps)

## Bootstrap and start

From the repository root (`Folder Storage/`):

```powershell
.\network\bootstrap.ps1
.\network\start.ps1
```

This will:

- Download `fabric-samples` (including `test-network`) into `network/fabric-samples/`
- Download Fabric binaries/docker images (via the official `bootstrap.sh`)
- Bring the network up, create a channel, and deploy the `filemeta` chaincode

## Stop / clean

```powershell
.\network\stop.ps1
```

