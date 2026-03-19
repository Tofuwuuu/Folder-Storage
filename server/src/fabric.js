import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import * as grpc from '@grpc/grpc-js';
import { connect, signers } from '@hyperledger/fabric-gateway';

async function readFirstFile(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile()).map((e) => e.name);
  if (files.length === 0) throw new Error(`No files found in directory: ${dirPath}`);
  files.sort();
  const fullPath = path.join(dirPath, files[0]);
  return fs.readFile(fullPath);
}

export async function createGateway({ mspId, certPath, keyDir, peerEndpoint, peerHostAlias, tlsCertPath }) {
  const tlsRootCert = await fs.readFile(tlsCertPath);
  const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);

  const grpcClient = new grpc.Client(peerEndpoint, tlsCredentials, {
    'grpc.ssl_target_name_override': peerHostAlias,
    'grpc.default_authority': peerHostAlias
  });

  const certPem = await fs.readFile(certPath);
  const keyPem = await readFirstFile(keyDir);

  const identity = {
    mspId,
    credentials: certPem
  };

  const privateKey = crypto.createPrivateKey(keyPem);
  const signer = signers.newPrivateKeySigner(privateKey);

  const gateway = connect({
    client: grpcClient,
    identity,
    signer
  });

  function close() {
    gateway.close();
    grpcClient.close();
  }

  return { gateway, close };
}

