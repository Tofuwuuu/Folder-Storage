# Hyperledger Fabric File/Folder Storage
A permissioned blockchain (Hyperledger Fabric) PoC to store **file metadata** (folders, filenames, owner, timestamps, permissions, hashes) on-chain, while storing **file bytes off-chain in IPFS**.

## What’s in the demo

- **Fabric network**: based on `fabric-samples/test-network` (Org1 + Org2)
- **Chaincode (Go)**: `chaincode/filemeta` stores folder + file metadata and enforces read access
- **IPFS**: Docker Compose service (`docker-compose.yml`)
- **REST API**: Node.js server (`server/`) that uploads bytes to IPFS then writes metadata to Fabric
- **React UI**: minimal web UI (`ui/`) to create folders, upload, browse, download, and switch identities (Org1/Org2)

## Prereqs

- Docker Desktop (Linux containers)
- Git for Windows (includes Git Bash)
- Go (for chaincode deps vendoring)
- Node.js (for REST + UI)

## Run it

From `Folder Storage/` in PowerShell:

```powershell
# 1) Start IPFS (HTTP API :5001, gateway :18080)
docker compose up -d

# 2) Bootstrap Fabric samples + binaries/images
.\network\bootstrap.ps1

# 3) Start the Fabric network + deploy the filemeta chaincode
.\network\start.ps1

# 4) Install server deps once
cd .\server
npm install

# 5) Run two REST servers (two identities)
# Org1 (allowed) on :3000
powershell -ExecutionPolicy Bypass -File .\run-org1.ps1

# Org2 (unauthorized) on :3001 (run in another terminal)
powershell -ExecutionPolicy Bypass -File .\run-org2.ps1
```

## Demo (REST)

Create a folder (Org1):

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:3000/folders -Method Post -ContentType 'application/json' -Body '{"path":"/docs"}'
```

Upload a file (Org1):

```powershell
curl.exe -s -F "folderPath=/docs" -F "file=@C:\path\to\file.txt" http://127.0.0.1:3000/files
```

Download (Org1):

```powershell
curl.exe -L "http://127.0.0.1:3000/download?path=%2Fdocs&name=file.txt" --output downloaded.txt
```

Unauthorized read (Org2 should fail):

```powershell
curl.exe -s "http://127.0.0.1:3001/files?path=%2Fdocs&name=file.txt"
```

## UI

```powershell
cd .\ui
npm install
npm run dev
```

Open the UI and switch identity between **Org1** and **Org2** to demonstrate allowed vs denied access.

