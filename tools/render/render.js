const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const [,, outDir, w, h, n, only] = process.argv;
const srv = http.createServer((req, res) => {
  const p = path.join(__dirname, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: +w, height: +h } });
  pg.on('console', m => console.log('console:', m.text())); pg.on('pageerror', e => console.log('err:', e.message));
  await pg.goto(`http://localhost:${port}/scene.html?w=${w}&h=${h}`);
  await pg.waitForFunction(() => window.ready, null, { timeout: 60000 });
  fs.mkdirSync(outDir, { recursive: true });
  const N = +n; const list = only ? only.split(',').map(Number) : [...Array(N).keys()];
  for (const i of list) {
    const url = await pg.evaluate((t) => { window.renderAt(t); return window.grab(0.78); }, i / (N - 1));
    fs.writeFileSync(path.join(outDir, String(i + 1).padStart(4, '0') + '.webp'), Buffer.from(url.split(',')[1], 'base64'));
  }
  await b.close(); srv.close();
});
