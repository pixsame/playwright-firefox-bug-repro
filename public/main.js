import { WebContainer } from '/wc/index.js';
const steps = (window.steps = []);
const log = (m) => { steps.push(m); console.log('[host]', m); };
window.run = async () => {
  log('crossOriginIsolated=' + crossOriginIsolated + ' ua=' + navigator.userAgent);
  const wc = await WebContainer.boot();
  log('booted');
  await wc.mount({
    'package.json': { file: { contents: JSON.stringify({ name: 'my-app', version: '1.0.0' }) } },
    'server.js': { file: { contents:
`const http = require('http');
http.createServer((req, res) => {
  res.setHeader('content-type', 'text/html');
  res.end('<!doctype html><h1>hello</h1><script>parent.postMessage("hello-from-iframe","*")</script>');
}).listen(3000);` } },
  });
  // Optional: does npm install work inside the container? (?npm=1)
  if (new URLSearchParams(location.search).get('npm')) {
    const i = await wc.spawn('npm', ['install', '--no-audit', '--no-fund']);
    log('npm install exit=' + await i.exit);
  }
  await wc.spawn('node', ['server.js']);
  const url = await new Promise((r) => wc.on('server-ready', (_p, u) => r(u)));
  log('server-ready ' + url);
  const got = new Promise((r) => addEventListener('message', (e) => e.data === 'hello-from-iframe' && r(true)));
  const f = document.createElement('iframe'); f.src = url; f.style.cssText = 'width:400px;height:200px'; document.body.append(f);
  return Promise.race([got, new Promise((r) => setTimeout(() => r(false), 30000))]);
};
