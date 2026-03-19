import { useMemo, useState } from 'react';
import './App.css';

function App() {
  const [identity, setIdentity] = useState('org1');
  const [folderPath, setFolderPath] = useState('/docs');
  const [file, setFile] = useState(null);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(null);

  const apiBase = useMemo(() => {
    return identity === 'org2' ? 'http://127.0.0.1:3001' : 'http://127.0.0.1:3000';
  }, [identity]);

  async function createFolder() {
    setBusy(true);
    setStatus('');
    try {
      const r = await fetch(`${apiBase}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderPath })
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setStatus(`Folder created: ${folderPath}`);
    } catch (e) {
      setStatus(`Create folder failed: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  async function refreshList() {
    setBusy(true);
    setStatus('');
    try {
      const r = await fetch(`${apiBase}/folders?path=${encodeURIComponent(folderPath)}`);
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setFiles(Array.isArray(j.files) ? j.files : []);
      setSelected(null);
      setStatus(`Loaded ${Array.isArray(j.files) ? j.files.length : 0} file(s).`);
    } catch (e) {
      setFiles([]);
      setSelected(null);
      setStatus(`List folder failed: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  async function uploadFile() {
    if (!file) {
      setStatus('Pick a file first.');
      return;
    }
    setBusy(true);
    setStatus('');
    try {
      const form = new FormData();
      form.append('folderPath', folderPath);
      form.append('file', file, file.name);

      const r = await fetch(`${apiBase}/files`, { method: 'POST', body: form });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);

      setStatus(`Uploaded: ${file.name} (CID: ${j.ipfs?.cid || 'n/a'})`);
      await refreshList();
    } catch (e) {
      setStatus(`Upload failed: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  function downloadSelected() {
    if (!selected) return;
    const url = `${apiBase}/download?path=${encodeURIComponent(selected.folderPath)}&name=${encodeURIComponent(selected.name)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <div className="title">Fabric + IPFS Folder Storage</div>
          <div className="subtitle">Metadata on-chain (Fabric), bytes off-chain (IPFS)</div>
        </div>
        <div className="identity">
          <label>
            Identity
            <select value={identity} onChange={(e) => setIdentity(e.target.value)} disabled={busy}>
              <option value="org1">Org1 (allowed)</option>
              <option value="org2">Org2 (unauthorized)</option>
            </select>
          </label>
          <div className="apiBase">API: {apiBase}</div>
        </div>
      </header>

      <section className="card">
        <div className="row">
          <label className="grow">
            Folder path
            <input value={folderPath} onChange={(e) => setFolderPath(e.target.value)} placeholder="/docs" />
          </label>
          <button onClick={createFolder} disabled={busy}>
            Create folder
          </button>
          <button onClick={refreshList} disabled={busy}>
            Refresh list
          </button>
        </div>

        <div className="row">
          <label className="grow">
            Upload file
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          <button onClick={uploadFile} disabled={busy || !file}>
            Upload
          </button>
        </div>

        {status ? <div className="status">{status}</div> : null}
      </section>

      <section className="grid">
        <div className="card">
          <div className="cardTitle">Files in {folderPath || '/'}</div>
          <div className="list">
            {files.length === 0 ? <div className="muted">No visible files (or access denied).</div> : null}
            {files.map((f) => (
              <button
                key={`${f.folderPath}/${f.name}`}
                className={`listItem ${selected?.name === f.name && selected?.folderPath === f.folderPath ? 'active' : ''}`}
                onClick={() => setSelected(f)}
              >
                <div className="fileName">{f.name}</div>
                <div className="fileMeta">v{f.version} · {f.ownerMsp} · {f.sha256?.slice(0, 10)}…</div>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="cardTitle">Selected</div>
          {!selected ? (
            <div className="muted">Pick a file from the list.</div>
          ) : (
            <div className="details">
              <div><span className="k">Name</span><span className="v">{selected.name}</span></div>
              <div><span className="k">Folder</span><span className="v">{selected.folderPath}</span></div>
              <div><span className="k">CID</span><span className="v mono">{selected.cid}</span></div>
              <div><span className="k">SHA-256</span><span className="v mono">{selected.sha256}</span></div>
              <div><span className="k">Owner</span><span className="v">{selected.ownerMsp}</span></div>
              <div className="row">
                <button onClick={downloadSelected} disabled={busy}>Download</button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default App;
