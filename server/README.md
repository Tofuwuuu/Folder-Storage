# Server (REST API)

Express REST API that uploads file bytes to IPFS and writes file metadata to Fabric via the Gateway SDK.

## Setup

```powershell
cd "Folder Storage\server"
copy .env.example .env
npm install
```

## Run

```powershell
cd "Folder Storage\server"
npm start
```

## Identity switch (Org2)

Create another `.env` (or run a second instance with different env) pointing to Org2 credentials, for example:

- `MSP_ID=Org2MSP`
- `PEER_ENDPOINT=localhost:9051`
- `PEER_HOST_ALIAS=peer0.org2.example.com`
- `TLS_CERT_PATH=../network/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt`
- `CERT_PATH=../network/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/users/User1@org2.example.com/msp/signcerts/cert.pem`
- `KEY_DIR=../network/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/users/User1@org2.example.com/msp/keystore`

