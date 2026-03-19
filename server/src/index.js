import crypto from 'node:crypto';

import express from 'express';
import multer from 'multer';

import { config } from './config.js';
import { createGateway } from './fabric.js';
import { createIpfsClient } from './ipfs.js';

const upload = multer({ storage: multer.memoryStorage() });

function sha256Hex(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function toJson(maybeBytes) {
  if (maybeBytes == null) return null;
  const buf =
    Buffer.isBuffer(maybeBytes) ? maybeBytes
    : maybeBytes instanceof Uint8Array ? Buffer.from(maybeBytes)
    : null;
  const s = buf ? buf.toString('utf8') : String(maybeBytes);
  try {
    return JSON.parse(s);
  } catch {
    return { raw: s };
  }
}

async function main() {
  const ipfs = createIpfsClient(config.ipfsApiUrl);
  const { gateway, close } = await createGateway({
    mspId: config.mspId,
    certPath: config.certPath,
    keyDir: config.keyDir,
    peerEndpoint: config.peerEndpoint,
    peerHostAlias: config.peerHostAlias,
    tlsCertPath: config.tlsCertPath
  });

  const network = gateway.getNetwork(config.channelName);
  const contract = network.getContract(config.chaincodeName);

  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/healthz', async (_req, res) => {
    res.json({
      ok: true,
      channel: config.channelName,
      chaincode: config.chaincodeName,
      mspId: config.mspId,
      ipfsApiUrl: config.ipfsApiUrl
    });
  });

  app.post('/folders', async (req, res) => {
    try {
      const { path } = req.body ?? {};
      await contract.submitTransaction('CreateFolder', String(path ?? ''));
      res.status(201).json({ ok: true });
    } catch (e) {
      res.status(400).json({ ok: false, error: String(e?.message ?? e), details: e?.details });
    }
  });

  app.post('/files', upload.single('file'), async (req, res) => {
    try {
      const folderPath = String(req.body?.folderPath ?? '');
      const file = req.file;
      if (!file) return res.status(400).json({ ok: false, error: 'missing multipart field: file' });

      const bytes = file.buffer;
      const sha256 = sha256Hex(bytes);

      const added = await ipfs.add(bytes, { pin: true });
      const cid = added.cid.toString();

      const metaBytes = await contract.submitTransaction(
        'PutFile',
        folderPath,
        file.originalname,
        cid,
        sha256,
        String(bytes.length),
        String(file.mimetype || '')
      );

      res.status(201).json({ ok: true, ipfs: { cid }, meta: toJson(metaBytes) });
    } catch (e) {
      res.status(400).json({ ok: false, error: String(e?.message ?? e), details: e?.details });
    }
  });

  app.get('/folders', async (req, res) => {
    try {
      const folderPath = String(req.query?.path ?? '');
      const out = await contract.evaluateTransaction('ListFolder', folderPath);
      res.json({ ok: true, files: toJson(out) });
    } catch (e) {
      res.status(400).json({ ok: false, error: String(e?.message ?? e), details: e?.details });
    }
  });

  app.get('/files', async (req, res) => {
    try {
      const folderPath = String(req.query?.path ?? '');
      const name = String(req.query?.name ?? '');
      const out = await contract.evaluateTransaction('GetFile', folderPath, name);
      res.json({ ok: true, meta: toJson(out) });
    } catch (e) {
      res.status(403).json({ ok: false, error: String(e?.message ?? e), details: e?.details });
    }
  });

  app.get('/download', async (req, res) => {
    try {
      const folderPath = String(req.query?.path ?? '');
      const name = String(req.query?.name ?? '');
      const metaBytes = await contract.evaluateTransaction('GetFile', folderPath, name);
      const meta = toJson(metaBytes);

      res.setHeader('Content-Type', meta?.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(meta?.name || name)}"`);
      if (meta?.sha256) res.setHeader('X-Content-SHA256', meta.sha256);
      if (meta?.cid) res.setHeader('X-IPFS-CID', meta.cid);

      const chunks = [];
      for await (const chunk of ipfs.cat(meta.cid)) {
        chunks.push(chunk);
      }
      const bytes = Buffer.concat(chunks);

      if (meta?.sha256) {
        const actual = sha256Hex(bytes);
        if (actual !== meta.sha256) {
          return res.status(409).json({ ok: false, error: 'hash mismatch when retrieving from IPFS' });
        }
      }

      res.send(bytes);
    } catch (e) {
      res.status(403).json({ ok: false, error: String(e?.message ?? e), details: e?.details });
    }
  });

  const server = app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`REST server listening on http://127.0.0.1:${config.port}`);
  });

  function shutdown() {
    server.close(() => close());
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

