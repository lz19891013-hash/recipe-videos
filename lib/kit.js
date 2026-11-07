// 2D HUD overlay — Art Deco high-contrast. SAFE x 70–1010, y 150–1600.
const kit = (() => {
  const TAU = Math.PI * 2;
  const SAFE = { x0: 70, x1: 1010, y0: 150, y1: 1600 };
  const theme = {
    style: 'flat',
    ink: '#F5F0E6',
    paper: '#1A1410',
    a1: '#D4AF37',
    a2: '#8B1E3F',
    a3: '#0F6B4C',
    a4: '#C47A3A',
    brand: 'KITCHEN',
    brandZh: '',
    fontEn: 'sans-serif',
    fontUi: 'sans-serif',
    fontZh: 'sans-serif',
    muted: 'rgba(245,240,230,.7)',
    outline: 0,
    shadow: 0
  };

  function setTheme(o) { Object.assign(theme, o); }
  function hash(n) {
    let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b) => (b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
  const ei = (t) => t * t;
  const eo = (t) => 1 - (1 - t) * (1 - t);
  const eio = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const ss = (t) => t * t * (3 - 2 * t);
  function back(t) {
    const c = 1.70158;
    return t <= 0 ? 0 : t >= 1 ? 1 : 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  }
  function win(t, a, b, rin, rout) {
    return Math.min(seg(t, a, a + rin), 1 - seg(t, b - rout, b));
  }

  function rr(ctx, x, y, w, h, r) {
    const R = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + R, y);
    ctx.arcTo(x + w, y, x + w, y + h, R);
    ctx.arcTo(x + w, y + h, x, y + h, R);
    ctx.arcTo(x, y + h, x, y, R);
    ctx.arcTo(x, y, x + w, y, R);
    ctx.closePath();
  }

  function hexLum(hex) {
    if (!hex || hex[0] !== '#' || hex.length < 7) return 0.2;
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function darkenHex(hex, floor = 0.22) {
    if (!hex || hex[0] !== '#') return '#6F5220';
    const lum = hexLum(hex);
    if (lum <= 0.45) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const k = floor / Math.max(lum, 0.001);
    const ch = (v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0');
    return `#${ch(r)}${ch(g)}${ch(b)}`;
  }

  function fitText(ctx, text, x, y, size, maxW, font, weight = '700') {
    let s = size;
    ctx.font = `${weight} ${s}px ${font}`;
    while (s > 11 && ctx.measureText(String(text)).width > maxW) {
      s -= 1;
      ctx.font = `${weight} ${s}px ${font}`;
    }
    ctx.fillText(String(text), x, y);
    return s;
  }

  // High-contrast title: gold/cream fill + thick dark halo. Never black-on-dark.
  function title(ctx, text, x, y, size, color, font, opts = {}) {
    const maxW = opts.maxW || 900;
    const fill = color && hexLum(color) < 0.35 ? theme.a1 : (color || theme.a1);
    ctx.save();
    ctx.textAlign = opts.align || 'center';
    ctx.textBaseline = opts.baseline || 'middle';
    let s = size;
    ctx.font = `900 ${s}px ${font}`;
    while (s > 16 && ctx.measureText(String(text)).width > maxW) {
      s -= 2;
      ctx.font = `900 ${s}px ${font}`;
    }
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeStyle = 'rgba(8,6,4,0.96)';
    ctx.lineWidth = Math.max(10, s * 0.16);
    ctx.strokeText(String(text), x, y);
    ctx.strokeStyle = 'rgba(26,20,16,0.9)';
    ctx.lineWidth = Math.max(5, s * 0.08);
    ctx.strokeText(String(text), x, y);
    ctx.fillStyle = fill;
    ctx.fillText(String(text), x, y);
    ctx.restore();
    return s;
  }

  function decoPlate(ctx, x, y, w, h, r) {
    ctx.fillStyle = 'rgba(10,8,6,0.94)';
    rr(ctx, x, y, w, h, r); ctx.fill();
    ctx.strokeStyle = '#D4AF37'; ctx.lineWidth = 3;
    rr(ctx, x + 2, y + 2, w - 4, h - 4, Math.max(2, r - 2)); ctx.stroke();
    ctx.strokeStyle = '#6F5220'; ctx.lineWidth = 1.25;
    rr(ctx, x + 7, y + 7, w - 14, h - 14, Math.max(2, r - 5)); ctx.stroke();
  }

  function fmtTime(t) {
    const s = Math.max(0, Math.floor(t));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  function hud(ctx, t, W) {
    const T = theme;
    const H = 1920;
    const steps = (typeof TL !== 'undefined' && TL.steps) || [];
    const callouts = (typeof TL !== 'undefined' && TL.callouts) || [];
    const dur = (typeof TL !== 'undefined' && TL.duration) || 1;
    const nSteps = steps.length || 1;
    let step = steps[0] || { n: 1, zh: '', en: '', start: 0, end: dur };
    for (const s of steps) if (t >= s.start) step = s;

    const x0 = SAFE.x0, x1 = SAFE.x1, top = kit.HUD_TOP || SAFE.y0;
    const panelW = x1 - x0;

    ctx.save();
    // --- top brand / timer ---
    decoPlate(ctx, x0, top, panelW, 64, 16);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = T.a1;
    ctx.font = `700 22px ${T.fontEn}`;
    ctx.fillText((T.brand || 'KITCHEN').toUpperCase(), x0 + 22, top + 40);
    if (T.brandZh) {
      ctx.fillStyle = T.ink;
      ctx.font = `700 18px ${T.fontZh}`;
      ctx.fillText(T.brandZh, x0 + 250, top + 40);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = T.ink;
    ctx.font = `700 26px ${T.fontEn}`;
    ctx.fillText(fmtTime(t), x1 - 22, top + 42);

    // --- step + progress ---
    const sy = top + 78;
    decoPlate(ctx, x0, sy, panelW, 168, 18);
    ctx.textAlign = 'left';
    ctx.fillStyle = T.a1;
    ctx.font = `800 20px ${T.fontEn}`;
    ctx.fillText(`STEP ${step.n || 1} / ${nSteps}`, x0 + 22, sy + 36);

    const px = x0 + 22, py = sy + 50, pw = panelW - 44, ph = 10;
    ctx.fillStyle = 'rgba(245,240,230,0.12)';
    rr(ctx, px, py, pw, ph, 5); ctx.fill();
    steps.forEach((s, i) => {
      const a = s.start, b = s.end;
      const xA = px + (a / dur) * pw;
      const w = Math.max(2, ((b - a) / dur) * pw);
      ctx.fillStyle = i + 1 === step.n ? T.a1 : 'rgba(212,175,55,0.28)';
      rr(ctx, xA, py, w, ph, 4); ctx.fill();
    });
    const playX = px + clamp(t / dur) * pw;
    ctx.fillStyle = T.ink;
    ctx.beginPath(); ctx.arc(playX, py + ph / 2, 6, 0, TAU); ctx.fill();

    // Chinese + English step titles: gold/cream on dark plate (never black-on-dark)
    ctx.textAlign = 'left';
    title(ctx, step.zh || '', x0 + panelW / 2, sy + 100, 36, T.a1, T.fontZh, { maxW: panelW - 48, align: 'center' });
    ctx.fillStyle = T.ink;
    ctx.textAlign = 'center';
    fitText(ctx, (step.en || '').toUpperCase(), x0 + panelW / 2, sy + 144, 20, panelW - 56, T.fontEn, '700');

    // --- ingredient / action callouts (high-contrast pills) ---
    callouts.forEach((c) => {
      const a = win(t, c.t0, c.t1, 0.18, 0.2);
      if (a <= 0) return;
      ctx.save();
      ctx.globalAlpha = a;
      const isIng = c.kind === 'ing';
      const cardX = x0;
      const cardW = isIng ? 620 : 720;
      const cardY = 1388;
      const cardH = isIng ? 168 : 132;
      decoPlate(ctx, cardX, cardY, cardW, cardH, 18);
      const accent = darkenHex(c.color || T.a1, 0.28);
      ctx.fillStyle = accent;
      ctx.fillRect(cardX + 10, cardY + 14, 14, cardH - 28);

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = T.a1;
      title(ctx, c.zh || '', cardX + 42, cardY + (isIng ? 52 : 50), isIng ? 40 : 34, T.a1, T.fontZh, {
        maxW: cardW - (c.amt ? 250 : 80), align: 'left', baseline: 'middle'
      });
      ctx.fillStyle = T.ink;
      ctx.font = `700 22px ${T.fontEn}`;
      ctx.fillText(c.en || '', cardX + 42, cardY + (isIng ? 100 : 96));

      if (c.amt) {
        // amount pill: gold fill + near-black text (high contrast, never light-on-light)
        const pillW = 210, pillH = 56;
        const px2 = cardX + cardW - pillW - 22;
        const py2 = cardY + (cardH - pillH) / 2;
        ctx.fillStyle = '#D4AF37';
        rr(ctx, px2, py2, pillW, pillH, 14); ctx.fill();
        ctx.strokeStyle = '#1A1410'; ctx.lineWidth = 2;
        rr(ctx, px2, py2, pillW, pillH, 14); ctx.stroke();
        ctx.fillStyle = '#1A1410';
        ctx.textAlign = 'center';
        fitText(ctx, c.amt, px2 + pillW / 2, py2 + 36, 22, pillW - 16, T.fontUi, '800');
      }
      ctx.restore();
    });

    ctx.restore();
  }

  async function loadFonts() {
    const specs = [
      ['Josefin Sans', '/lib/fonts/JosefinSans-wght.ttf', '100 700'],
      ['Limelight', '/lib/fonts/Limelight-Regular.ttf', '400'],
      ['Noto Sans CJK SC', '/lib/fonts/NotoSansSC-Regular.otf', '400'],
      ['Droid Sans Fallback', '/lib/fonts/DroidSansFallback.ttf', '400']
    ];
    await Promise.all(specs.map(async ([family, url, weight]) => {
      try {
        const face = new FontFace(family, `url(${url})`, { weight, display: 'swap' });
        const loaded = await face.load();
        document.fonts.add(loaded);
      } catch (err) {
        console.warn('font fail', family, url, err && err.message);
      }
    }));
    try { await document.fonts.ready; } catch (_) {}
  }

  const api = {
    theme, setTheme, hash, rng, clamp, lerp, seg, ei, eo, eio, ss, back, win,
    rr, fitText, title, hud, loadFonts, decoPlate, hexLum, darkenHex, SAFE,
    HUD_TOP: 190
  };
  return api;
})();
if (typeof window !== 'undefined') window.kit = kit;
