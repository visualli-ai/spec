// Serves the playground's built pages (apps/react/dist-bench) for the browser scripts (bench, smoke, screenshots).
//
// Every run gets a free port, so a server left over from an earlier run can never answer in its place; vite runs
// directly (not through npx), so stop() really stops it; and the server is checked to serve *this* tree's build before
// anything is measured — otherwise a benchmark could silently measure another checkout's code.

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';

const freePort = () => new Promise((res, rej) => {
  const s = createServer();
  s.unref();
  s.on('error', rej);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); });
});

/** Start `vite preview` for `appDir`'s dist-bench. Resolves once it serves this build: { port, url, stop }. */
export async function startPreview(appDir) {
  const port = await freePort();
  // vite's CLI, from its package.json "bin" (the file itself isn't an exported path).
  const pkgPath = createRequire(join(appDir, 'package.json')).resolve('vite/package.json');
  const bin = JSON.parse(readFileSync(pkgPath, 'utf8')).bin;
  const vite = join(dirname(pkgPath), typeof bin === 'string' ? bin : bin.vite);
  const proc = spawn(process.execPath, [vite, 'preview', '--outDir', 'dist-bench', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: appDir, stdio: 'ignore' });
  let exited = null;
  proc.on('exit', (code) => { exited = code ?? 'signal'; });
  const stop = () => new Promise((res) => { if (exited !== null) return res(); proc.once('exit', () => res()); proc.kill(); });

  const url = `http://127.0.0.1:${port}`;
  const expected = readFileSync(join(appDir, 'dist-bench/bench.html'), 'utf8');
  for (let i = 0; ; i++) {
    if (exited !== null) throw new Error(`vite preview exited (${exited}) before serving ${appDir}`);
    try {
      const r = await fetch(`${url}/bench.html`);
      if (r.ok) {
        if ((await r.text()) !== expected) { await stop(); throw new Error(`the server on port ${port} doesn't serve ${appDir}'s build`); }
        return { port, url, stop };
      }
    } catch (e) {
      if (String(e?.message).includes("doesn't serve")) throw e;
    }
    if (i > 150) { await stop(); throw new Error('vite preview did not start within 15s'); }
    await new Promise((r) => setTimeout(r, 100));
  }
}
