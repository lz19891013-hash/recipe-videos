#!/usr/bin/env node
// Localhost static HTTP + Puppeteer/SwiftShader WebGL2. Multi-worker frames → silent H.264.
'use strict';
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const epRel = process.argv[2];
if (!epRel) { console.error('usage: node lib/render.js episodes/<slug> [--stills t1,t2] [--encode-only] [--workers N]'); process.exit(1); }
const EP = path.resolve(ROOT, epRel);
const TL = JSON.parse(fs.readFileSync(path.join(EP, 'timeline.json'), 'utf8'));
const ARGS = process.argv.slice(3);
const stillsArg = ARGS.includes('--stills') ? ARGS[ARGS.indexOf('--stills') + 1] : null;
const encodeOnly = ARGS.includes('--encode-only');
const wi = ARGS.indexOf('--workers');
const WORKERS = Math.max(1, parseInt(process.env.WORKERS || (wi >= 0 ? ARGS[wi + 1] : 3), 10) || 3);
const FPS = TL.fps || 30;
const W = TL.width || 1080;
const H = TL.height || 1920;
const DUR = TL.duration;
const TOTAL = Math.round(DUR * FPS);
const BUILD = path.join(EP, 'build');
const FRAMES = path.join(BUILD, 'frames');
const SILENT = path.join(BUILD, 'video_silent.mp4');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf'
};

function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((q, r) => {
      let u = decodeURIComponent((q.url || '/').split('?')[0]);
      if (u === '/') u = '/index.html';
      let f = path.join(ROOT, u.replace(/^\//, ''));
      if (u === '/index.html') f = path.join(EP, 'index.html');
      const relEp = '/episodes/' + path.basename(EP) + '/';
      if (u.startsWith(relEp)) f = path.join(EP, u.slice(relEp.length));
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        r.writeHead(404); return r.end('nf ' + u);
      }
      r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(r);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

function chromePath() {
  return process.env.CHROME || ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/chromium']
    .find((p) => fs.existsSync(p)) || 'google-chrome';
}

async function launchPage(port) {
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: 'new',
    args: [
      '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist',
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--hide-scrollbars', '--mute-audio'
    ]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(`window.TL=${JSON.stringify(TL)};`);
  page.on('pageerror', (e) => console.error('PAGE', e.message));
  const url = `http://127.0.0.1:${port}/episodes/${path.basename(EP)}/index.html`;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 180000 });
  await page.waitForFunction(() => window.ready === true, { timeout: 180000 });
  return { browser, page };
}

async function grabJpeg(page, t, quality = 0.88) {
  await page.evaluate((t) => window.render(t), t);
  const b64 = await page.evaluate((q) => document.getElementById('c').toDataURL('image/jpeg', q).split(',')[1], quality);
  return Buffer.from(b64, 'base64');
}

function encodeSilent() {
  const r = spawnSync('ffmpeg', [
    '-y', '-framerate', String(FPS), '-i', path.join(FRAMES, '%05d.jpg'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'fast',
    '-movflags', '+faststart', SILENT
  ], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg encode failed');
}

async function renderStills(times) {
  fs.mkdirSync(path.join(BUILD, 'stills'), { recursive: true });
  const srv = await startServer();
  const port = srv.address().port;
  const { browser, page } = await launchPage(port);
  for (const t of times) {
    const buf = await grabJpeg(page, t, 0.92);
    const name = `t${t.toFixed(2).replace('.', 'p')}.jpg`;
    fs.writeFileSync(path.join(BUILD, 'stills', name), buf);
    console.log('still', name, buf.length);
  }
  await browser.close(); srv.close();
}

async function worker(port, start, end) {
  const { browser, page } = await launchPage(port);
  const t0 = Date.now();
  for (let i = start; i < end; i++) {
    const t = Math.min(DUR, i / FPS);
    const buf = await grabJpeg(page, t, 0.88);
    fs.writeFileSync(path.join(FRAMES, String(i).padStart(5, '0') + '.jpg'), buf);
    if ((i - start) % 30 === 0) {
      const done = i - start + 1;
      const fps = done / ((Date.now() - t0) / 1000);
      console.log(`w ${start}-${end} i=${i} ${fps.toFixed(2)} fps`);
    }
  }
  await browser.close();
}

async function renderAll() {
  fs.mkdirSync(FRAMES, { recursive: true });
  const srv = await startServer();
  const port = srv.address().port;
  const n = Math.min(WORKERS, TOTAL);
  const chunk = Math.ceil(TOTAL / n);
  console.log(`render ${TOTAL} frames ${W}x${H}@${FPS} workers=${n} dur=${DUR}`);
  const jobs = [];
  for (let w = 0; w < n; w++) {
    const a = w * chunk, b = Math.min(TOTAL, a + chunk);
    if (a >= b) break;
    jobs.push(worker(port, a, b));
  }
  await Promise.all(jobs);
  srv.close();
  encodeSilent();
  console.log('silent', SILENT);
}

(async () => {
  if (stillsArg) {
    const times = stillsArg.split(',').map(Number).filter((x) => !Number.isNaN(x));
    await renderStills(times);
  } else if (encodeOnly) {
    encodeSilent();
  } else {
    await renderAll();
  }
})().catch((e) => { console.error(e); process.exit(1); });
