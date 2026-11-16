// usage: node run.mjs <chromium|firefox|webkit> <port> [npm]
import { chromium, firefox, webkit } from 'playwright-core';
import { startServer } from './server.mjs';
const [name, port = '3500', npm] = process.argv.slice(2);
const server = await startServer(Number(port));
const b = await { chromium, firefox, webkit }[name].launch();
const page = await b.newPage();
page.on('pageerror', (e) => console.log('pageerror:', e.message.slice(0, 200)));
await page.goto(`http://127.0.0.1:${port}/${npm ? '?npm=1' : ''}`);
const t = Date.now();
const ok = await Promise.race([
  page.evaluate(() => window.run()),
  new Promise((r) => setTimeout(() => r('HOST-TIMEOUT'), 80000)),
]).catch((e) => 'ERROR ' + e.message.slice(0, 150));
const steps = await page.evaluate(() => window.steps).catch(() => []);
console.log(JSON.stringify({ browser: name, version: b.version(), iframeMessage: ok, seconds: Math.round((Date.now() - t) / 1000), steps: steps.map((s) => s.slice(0, 110)) }));
await b.close(); server.close(); process.exit(0);
