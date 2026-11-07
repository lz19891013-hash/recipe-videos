const puppeteer = require('puppeteer-core');
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname);
const ep = path.join(ROOT, 'episodes/ep05-mango-sticky-rice');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]);
  let f = path.join(ROOT, u.replace(/^\//, ''));
  if (u === '/' || u === '/index.html') f = path.join(ep, 'index.html');
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end('nf '+u); }
  r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
const TL = JSON.parse(fs.readFileSync(path.join(ep, 'timeline.json'), 'utf8'));
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  const b = await puppeteer.launch({
    executablePath: process.env.CHROME || '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--use-gl=swiftshader', '--no-sandbox', '--disable-setuid-sandbox', '--enable-webgl', '--ignore-gpu-blocklist']
  });
  const pg = await b.newPage();
  await pg.setViewport({ width: TL.width, height: TL.height });
  await pg.evaluateOnNewDocument(`window.TL=${JSON.stringify(TL)};`);
  pg.on('pageerror', e => console.error('PAGE', e.message));
  await pg.goto(`http://127.0.0.1:${port}/episodes/ep05-mango-sticky-rice/index.html`, { waitUntil: 'networkidle0', timeout: 120000 });
  await pg.waitForFunction(() => window.ready === true, { timeout: 120000 });
  for (const t of [74, 78, 80]) {
    const dbg = await pg.evaluate((t) => { window.render(t); return window.__dbg; }, t);
    console.log(JSON.stringify({ t, pitcher: dbg.pitcher, stream: dbg.streams && dbg.streams.coconut }));
  }
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
