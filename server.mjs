// Static server with the headers WebContainer needs (COOP same-origin + COEP require-corp).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
export const startServer = (port) => new Promise((resolve) => {
  const files = {
    '/': ['public/index.html', 'text/html'],
    '/main.js': ['public/main.js', 'text/javascript'],
  };
  const s = http.createServer((req, res) => {
    const pn = new URL(req.url, 'http://x').pathname;
    let f = files[pn];
    if (!f && pn.startsWith('/wc/') && !pn.includes('..')) f = ['node_modules/@webcontainer/api/dist/' + pn.slice(4), 'text/javascript'];
    if (!f || !fs.existsSync(path.join(dir, f[0]))) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': f[1], 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' });
    fs.createReadStream(path.join(dir, f[0])).pipe(res);
  }).listen(port, '127.0.0.1', () => resolve(s));
});
if (process.argv[1] === fileURLToPath(import.meta.url)) { const p = Number(process.argv[2] || 3500); await startServer(p); console.log('http://127.0.0.1:' + p); }
