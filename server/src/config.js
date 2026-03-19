import 'dotenv/config';

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT || '3000'),

  ipfsApiUrl: process.env.IPFS_API_URL || 'http://127.0.0.1:5001',

  channelName: process.env.CHANNEL_NAME || 'mychannel',
  chaincodeName: process.env.CHAINCODE_NAME || 'filemeta',

  peerEndpoint: required('PEER_ENDPOINT'),
  peerHostAlias: required('PEER_HOST_ALIAS'),
  tlsCertPath: required('TLS_CERT_PATH'),

  mspId: required('MSP_ID'),
  certPath: required('CERT_PATH'),
  keyDir: required('KEY_DIR')
};

