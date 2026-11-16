// Same page, driven by stock Firefox through geckodriver (WebDriver classic) instead of Playwright's patched build.
// usage: GECKODRIVER=/path/geckodriver FIREFOX=/path/Firefox.app/Contents/MacOS/firefox node real-firefox.mjs <port>
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os';
import { startServer } from './server.mjs';
const port = Number(process.argv[2] || 3580), gport = port + 1;
const server = await startServer(port);
const gd = spawn(process.env.GECKODRIVER, ['--port', String(gport), '--binary', process.env.FIREFOX], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (m, p, body) => { const r = await fetch(`http://127.0.0.1:${gport}${p}`, { method: m, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); const j = await r.json(); if (j.value?.error) throw new Error(j.value.error + ' ' + j.value.message); return j.value; };
await sleep(1500);
const prof = fs.mkdtempSync(os.tmpdir() + '/fx-');
try {
  const ses = await call('POST', '/session', { capabilities: { alwaysMatch: { browserName: 'firefox', 'moz:firefoxOptions': { args: ['-headless', '-profile', prof] } } } });
  const S = '/session/' + ses.sessionId;
  await call('POST', S + '/url', { url: `http://127.0.0.1:${port}/` });
  await call('POST', S + '/timeouts', { script: 90000 });
  const ok = await call('POST', S + '/execute/async', { script: 'const done = arguments[arguments.length-1]; window.run().then(done, (e) => done("ERROR " + e));', args: [] });
  console.log(JSON.stringify({ browser: 'firefox (stock, geckodriver)', version: ses.capabilities.browserVersion, iframeMessage: ok }));
  await call('DELETE', S);
} finally { gd.kill(); server.close(); process.exit(0); }
