import { create } from 'ipfs-http-client';

export function createIpfsClient(ipfsApiUrl) {
  return create({ url: ipfsApiUrl });
}

