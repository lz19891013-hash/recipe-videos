// Generic Puppeteer frame renderer.
// usage: node lib/render.js <episodeDir> [--stills 1.5,10,22] [--workers 8] [--out build/video.mp4]
// The episode dir must contain index.html (defines window.render(t) drawing to <canvas id="c">, sets window.ready) and timeline.json.
const puppeteer = require('puppeteer-core');
const fs = require('fs'), path = require('path'), http = require('http'), { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
// static server over the pipeline root so ES modules (three.js) load; nothing is exposed beyond 127.0.0.1
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(ROOT)) { r.writeHead(403); return r.end(); } fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); });
let BASE = '';
const args = process.argv.slice(2); const dir = path.resolve(args[0]);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const TL = JSON.parse(fs.readFileSync(path.join(dir, 'timeline.json'), 'utf8'));
const fps = TL.fps, W = TL.width, H = TL.height, N = Math.round(TL.duration * fps);
const build = path.join(dir, 'build'); fs.mkdirSync(build, { recursive: true });
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
async function page(b) {
  const pg = await b.newPage(); await pg.setViewport({ width: W, height: H });
  await pg.evaluateOnNewDocument(`window.TL=${JSON.stringify(TL)};`);
  pg.on('pageerror', e => console.error('PAGE ERROR', e.message)); pg.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await pg.goto(BASE + '/' + path.relative(ROOT, dir) + '/index.html', { timeout: 120000, waitUntil: 'domcontentloaded' }); await pg.waitForFunction('window.ready===true', { timeout: 120000 });
  return pg;
}
const grab = (pg, t, fmt) => pg.evaluate((t, fmt) => { render(t); return document.getElementById('c').toDataURL(fmt, .95); }, t, fmt);
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); BASE = 'http://127.0.0.1:' + srv.address().port;
  // WebGL via SwiftShader (CPU) -> deterministic, no GPU needed. Scenes must be driven only by render(t).
  const b = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync'] });
  const stills = opt('--stills');
  if (stills) {
    const outd = path.join(build, 'stills'); fs.mkdirSync(outd, { recursive: true }); const pg = await page(b);
    for (const s of stills.split(',')) { const t = +s; const d = await grab(pg, t, 'image/png'); fs.writeFileSync(path.join(outd, `t${t.toFixed(2)}.png`), Buffer.from(d.split(',')[1], 'base64')); }
    await b.close(); srv.close(); console.log('stills ->', outd); return;
  }
  const workers = +(opt('--workers') || 6); const fdir = path.join(build, 'frames'); const encodeOnly = args.includes('--encode-only');
  const resume = args.includes('--resume');
  if (!encodeOnly) {
    if (!resume) fs.rmSync(fdir, { recursive: true, force: true });
    fs.mkdirSync(fdir, { recursive: true });
  }
  let next = 0, done = 0; const t0 = Date.now();
  if (!encodeOnly) await Promise.all(Array.from({ length: workers }, async () => {
    const pg = await page(b);
    while (true) {
      const i = next++; if (i >= N) break;
      const fp = path.join(fdir, `f${String(i).padStart(5, '0')}.jpg`);
      if (resume && fs.existsSync(fp) && fs.statSync(fp).size > 1000) {
        if (++done % 150 === 0) console.log(`${done}/${N} frames ${((Date.now() - t0) / 1000).toFixed(0)}s (resume skip)`);
        continue;
      }
      const d = await grab(pg, i / fps, 'image/jpeg');
      fs.writeFileSync(fp, Buffer.from(d.split(',')[1], 'base64'));
      if (++done % 150 === 0) console.log(`${done}/${N} frames ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  }));
  await b.close(); srv.close();
  const out = path.resolve(dir, opt('--out') || 'build/video_silent.mp4');
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(fdir, 'f%05d.jpg'), '-vf', 'scale=in_range=pc:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-r', String(fps), '-movflags', '+faststart', out], { stdio: 'inherit' });
  if (r.status) process.exit(r.status); console.log('video ->', out, `(${N} frames)`);
})();
