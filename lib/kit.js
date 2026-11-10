// Shared 2D overlay kit for recipe videos: easing/util + theme-driven HUD (brand line, segmented progress,
// step title, ingredient/action cards, timer, recipe card). Draws on a 2D canvas ABOVE the 3D (or 2D) scene.
// window.TL (timeline.json) is injected by render.js before page scripts run.
// Each episode picks/overrides a theme:  kit.setTheme({...})  — styles: 'sticker' (outline + offset shadow), 'neon' (glow), 'flat'.
(function () {
  const K = {};
  K.clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  K.lerp = (a, b, p) => a + (b - a) * p;
  K.seg = (t, a, b) => K.clamp((t - a) / (b - a));
  K.eio = p => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  K.eo = p => 1 - Math.pow(1 - p, 3);
  K.ei = p => p * p * p;
  K.ss = p => p * p * (3 - 2 * p);
  K.back = p => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
  K.win = (t, a, b, fi = .35, fo = .35) => Math.min(K.seg(t, a, a + fi), 1 - K.seg(t, b - fo, b));
  K.rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
  K.hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  K.rr = (ctx, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  // shrink font until it fits maxW (never truncates)
  K.fit = (ctx, s, size, maxW, font, weight) => { let sz = size; ctx.font = `${weight} ${sz}px ${font}`; while (ctx.measureText(s).width > maxW && sz > 10) { sz--; ctx.font = `${weight} ${sz}px ${font}`; } return sz; };
  K.fitText = (ctx, s, x, y, size, maxW, font, weight = '700') => { const sz = K.fit(ctx, s, size, maxW, font, weight); ctx.fillText(s, x, y); return sz; };

  K.theme = {
    style: 'sticker', fontZh: '"Noto Sans CJK SC", sans-serif', fontEn: '"Fredoka", "Baloo 2", sans-serif', fontUi: '"Fredoka", "Noto Sans CJK SC", sans-serif', fontMono: '"Fredoka", monospace',
    ink: '#3b2418', paper: '#fff4e2', a1: '#e8553d', a2: '#f2b134', a3: '#6fae7a', a4: '#5aa3c9', muted: 'rgba(59,36,24,.55)', brand: 'CLAY KITCHEN', brandZh: '黏土厨房',
    outline: 6, shadow: 8
  };
  K.setTheme = o => Object.assign(K.theme, o);
  K.loadFonts = async () => {
    const T = K.theme; const fams = [`900 40px ${T.fontZh}`, `700 40px ${T.fontZh}`, `400 40px ${T.fontZh}`, `700 40px ${T.fontEn}`, `600 40px ${T.fontEn}`, `500 40px ${T.fontUi}`];
    for (const f of fams) { try { await document.fonts.load(f, '番茄炒蛋ABC123'); } catch (e) { } }
  };
  // ---------- primitives ----------
  K.panel = (ctx, x, y, w, h, r, fill, stroke) => {
    const T = K.theme;
    if (T.style === 'neon') { ctx.fillStyle = fill; K.rr(ctx, x, y, w, h, r); ctx.fill(); ctx.shadowColor = stroke; ctx.shadowBlur = 22; ctx.strokeStyle = stroke; ctx.lineWidth = 3.5; ctx.stroke(); ctx.shadowBlur = 0; return; }
    if (T.style === 'sticker') { ctx.fillStyle = T.ink; K.rr(ctx, x + T.shadow * .4, y + T.shadow, w, h, r); ctx.fill(); }
    ctx.fillStyle = fill; K.rr(ctx, x, y, w, h, r); ctx.fill();
    if (T.style === 'sticker') { ctx.strokeStyle = stroke || T.ink; ctx.lineWidth = T.outline * .7; K.rr(ctx, x, y, w, h, r); ctx.stroke(); }
  };
  // outlined display text (sticker), glow (neon) or plain; returns font size used
  K.title = (ctx, s, x, y, size, color, font, o = {}) => {
    const T = K.theme; ctx.save(); ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'alphabetic'; ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha);
    const sz = K.fit(ctx, s, size, o.maxW || 940, font, o.weight || '900'); ctx.lineJoin = 'round';
    if (T.style === 'sticker') {
      const ow = Math.max(4, sz * .14); ctx.fillStyle = T.ink; ctx.fillText(s, x + sz * .03, y + sz * .07);
      ctx.strokeStyle = o.stroke || T.ink; ctx.lineWidth = ow; ctx.strokeText(s, x, y); ctx.fillStyle = color; ctx.fillText(s, x, y);
    } else if (T.style === 'neon') { ctx.shadowColor = color; ctx.shadowBlur = 28; ctx.fillStyle = color; ctx.fillText(s, x, y); ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText(s, x, y); }
    else { ctx.fillStyle = color; ctx.fillText(s, x, y); }
    ctx.restore(); return sz;
  };
  // ---------- HUD ----------
  K.currentStep = t => { const S = TL.steps; for (let i = S.length - 1; i >= 0; i--) if (t >= S[i].start) return t < S[i].end ? S[i] : null; return null; };
  // Vertical safe zone: panel top ≥ 150 (TikTok/Reels/Shorts)
  K.HUD_TOP = 180;
  K.hud = (ctx, t, W) => {
    const T = K.theme, S = TL.steps, n = S.length, tEnd = S[n - 1].end;
    const TOP = K.HUD_TOP;
    const hudA = K.win(t, 3.4, TL.ev.card, .6, .6); if (hudA <= 0) return;
    ctx.save(); ctx.globalAlpha = hudA;
    // top bar panel — top edge at TOP (≥150)
    K.panel(ctx, 60, TOP, W - 120, 176, 30, T.paper, T.ink);
    ctx.textAlign = 'left'; ctx.fillStyle = T.a1; ctx.font = `700 30px ${T.fontEn}`; ctx.fillText(T.brand, 96, TOP + 52);
    const bw = ctx.measureText(T.brand).width; ctx.fillStyle = T.ink; ctx.font = `700 28px ${T.fontZh}`; K.fitText(ctx, `${T.brandZh} · ${TL.dish.zh}`, 96 + bw + 18, TOP + 51, 28, 520 - bw, T.fontZh, '700');
    const cur = K.currentStep(t);
    ctx.textAlign = 'right'; ctx.font = `700 30px ${T.fontEn}`; ctx.fillStyle = T.ink;
    ctx.fillText(cur ? `STEP ${cur.n}/${n}` : (t >= tEnd ? 'DONE!' : ''), W - 96, TOP + 52);
    // segmented progress
    const x0 = 96, x1 = W - 96, y = TOP + 76, gap = 10, sw = (x1 - x0 - gap * (n - 1)) / n, cols = [T.a1, T.a2, T.a3, T.a4];
    for (let i = 0; i < n; i++) { const s = S[i], p = K.seg(t, s.start, s.end), sx = x0 + i * (sw + gap);
      ctx.fillStyle = 'rgba(59,36,24,.13)'; K.rr(ctx, sx, y, sw, 22, 11); ctx.fill();
      if (p > 0) { ctx.fillStyle = cols[i % 4]; K.rr(ctx, sx, y, Math.max(22, sw * p), 22, 11); ctx.fill(); }
      ctx.strokeStyle = T.ink; ctx.lineWidth = 3; K.rr(ctx, sx, y, sw, 22, 11); ctx.stroke(); }
    const tot = K.clamp((t - S[0].start) / (tEnd - S[0].start));
    ctx.textAlign = 'left'; ctx.fillStyle = T.muted; ctx.font = `600 24px ${T.fontUi}`; ctx.fillText(`进度 PROGRESS  ${Math.round(tot * 100)}%`, 96, TOP + 152);
    if (cur) { ctx.textAlign = 'right'; ctx.fillStyle = T.muted; K.fitText(ctx, `${cur.zh} · ${cur.en}`, W - 96, TOP + 152, 24, 520, T.fontUi, '600'); }
    // step title (big) — below panel
    if (cur) {
      const a = K.win(t, cur.start, cur.end, .45, .35), e = K.back(K.seg(t, cur.start, cur.start + .6));
      ctx.save(); ctx.globalAlpha = hudA * a; ctx.translate(W / 2, TOP + 270); ctx.scale(.6 + .4 * e, .6 + .4 * e);
      // number badge
      ctx.fillStyle = T.ink; ctx.beginPath(); ctx.arc(-0, -86 + 5, 0, 0, 0); ctx.fill();
      K.title(ctx, `${cur.n}. ${cur.zh}`, 0, 0, 88, T.paper, T.fontZh, { maxW: 900 });
      K.title(ctx, cur.en.toUpperCase(), 0, 58, 40, T.a2, T.fontEn, { maxW: 900, weight: '700' });
      ctx.restore();
    }
    ctx.restore();
    for (const c of TL.callouts) if (t >= c.t0 - .05 && t <= c.t1 + .05) K.callout(ctx, t, c, W);
  };
  K.callout = (ctx, t, c, W) => {
    const T = K.theme, p = K.seg(t, c.t0, c.t0 + .45), q = K.seg(t, c.t1 - .35, c.t1), a = Math.min(K.eo(p), 1 - q); if (a <= 0) return;
    const x = 70, y = K.HUD_TOP + 380, w = W - 140, h = 116, col = c.kind === 'ing' ? (c.color || T.a2) : T.a4;
    ctx.save(); ctx.globalAlpha = a; const sc = .7 + .3 * K.back(p); ctx.translate(W / 2, y + h / 2); ctx.scale(sc, sc); ctx.rotate((1 - p) * -.06); ctx.translate(-W / 2, -(y + h / 2));
    K.panel(ctx, x, y, w, h, 28, T.paper, T.ink);
    // colour tab + icon
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + 62, y + h / 2, 36, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = T.ink; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = T.ink; ctx.font = `700 44px ${T.fontEn}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.kind === 'ing' ? '+' : '▶', x + 62, y + h / 2 + 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; let amtW = 0;
    if (c.amt) { ctx.font = `700 36px ${T.fontUi}`; amtW = Math.min(380, ctx.measureText(c.amt).width + 48); const ax = x + w - 22 - amtW;
      ctx.fillStyle = col; K.rr(ctx, ax, y + 26, amtW, 64, 32); ctx.fill(); ctx.strokeStyle = T.ink; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = T.ink; ctx.textAlign = 'center'; K.fitText(ctx, c.amt, ax + amtW / 2, y + 71, 36, amtW - 30, T.fontUi, '700'); ctx.textAlign = 'left'; }
    const tx = x + 118, maxW = w - 140 - amtW - (c.amt ? 24 : 0);
    ctx.fillStyle = T.ink; K.fitText(ctx, c.zh, tx, y + 56, 44, maxW, T.fontZh, '900');
    ctx.fillStyle = T.muted; K.fitText(ctx, c.en, tx, y + 94, 30, maxW, T.fontUi, '600');
    ctx.restore();
  };
  K.timer = (ctx, t, a, b, x, y, r, total = 120, label = '') => {
    const T = K.theme, v = K.win(t, a - .3, b + .5, .3, .4); if (v <= 0) return; const p = K.seg(t, a, b);
    ctx.save(); ctx.globalAlpha = v; ctx.translate(x, y); const s = .6 + .4 * K.back(K.seg(t, a - .3, a + .2)); ctx.scale(s, s);
    ctx.fillStyle = T.ink; ctx.beginPath(); ctx.arc(4, 8, r + 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = T.paper; ctx.beginPath(); ctx.arc(0, 0, r + 16, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = T.ink; ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = T.a2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = T.paper; ctx.beginPath(); ctx.arc(0, 0, r * .62, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = T.ink; ctx.lineWidth = 4; ctx.stroke();
    const sec = Math.ceil(total * (1 - p)), str = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    ctx.fillStyle = T.ink; ctx.textAlign = 'center'; ctx.font = `700 40px ${T.fontEn}`; ctx.fillText(str, 0, 14);
    if (label) { ctx.font = `700 22px ${T.fontEn}`; ctx.fillText(label, 0, r + 52); }
    ctx.restore();
  };
  K.recipeCard = (ctx, t, W, H, t0) => {
    const T = K.theme, a = K.eo(K.seg(t, t0, t0 + .8)); if (a <= 0) return; const R = TL.recipe;
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(59,36,24,.45)'; ctx.fillRect(0, 0, W, H);
    const x = 60, w = W - 120, y = 170 + (1 - a) * 80, h = 1480; // top ≥150 safe zone (was 150 edge)
    K.panel(ctx, x, y, w, h, 40, T.paper, T.ink);
    ctx.textAlign = 'center'; ctx.font = `700 28px ${T.fontEn}`; ctx.fillStyle = T.a1; ctx.fillText('FULL RECIPE · 完整配方', W / 2, y + 74);
    K.title(ctx, TL.dish.zh, W / 2, y + 172, 92, T.a1, T.fontZh, { maxW: w - 80 });
    ctx.fillStyle = T.ink; K.fitText(ctx, TL.dish.en.toUpperCase(), W / 2, y + 232, 42, w - 80, T.fontEn, '700');
    ctx.font = `600 28px ${T.fontUi}`; ctx.fillStyle = T.muted; K.fitText(ctx, `${TL.dish.time} · ${TL.dish.servings} 人份 servings · ${TL.dish.cuisine}`, W / 2, y + 282, 28, w - 80, T.fontUi, '600');
    let yy = y + 350; ctx.textAlign = 'left';
    ctx.fillStyle = T.a1; ctx.font = `900 36px ${T.fontZh}`; ctx.fillText('食材  INGREDIENTS', x + 50, yy); yy += 20;
    R.ingredients.forEach((r, i) => { const ry = yy + 24 + i * 58, ri = K.eo(K.seg(t, t0 + .5 + i * .08, t0 + .9 + i * .08)); ctx.globalAlpha = a * ri;
      ctx.fillStyle = i % 2 ? 'rgba(242,177,52,.16)' : 'rgba(242,177,52,.32)'; K.rr(ctx, x + 36, ry - 6, w - 72, 52, 14); ctx.fill();
      ctx.fillStyle = T.ink; ctx.font = `900 31px ${T.fontZh}`; ctx.fillText(r[0], x + 60, ry + 31);
      ctx.fillStyle = T.muted; K.fitText(ctx, r[1], x + 210, ry + 31, 28, 300, T.fontUi, '600');
      ctx.textAlign = 'right'; ctx.fillStyle = T.a1; K.fitText(ctx, r[2], x + w - 60, ry + 31, 29, 290, T.fontUi, '700'); ctx.textAlign = 'left'; });
    ctx.globalAlpha = a; yy += 24 + R.ingredients.length * 58 + 46;
    ctx.fillStyle = T.a1; ctx.font = `900 36px ${T.fontZh}`; ctx.fillText('步骤  STEPS', x + 50, yy); yy += 18;
    R.steps.forEach((s, i) => { const ry = yy + 18 + i * 84, ri = K.eo(K.seg(t, t0 + 1 + i * .1, t0 + 1.4 + i * .1)); ctx.globalAlpha = a * ri;
      ctx.fillStyle = [T.a1, T.a2, T.a3, T.a4][i % 4]; ctx.beginPath(); ctx.arc(x + 76, ry + 34, 26, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = T.ink; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = T.ink; ctx.font = `700 28px ${T.fontEn}`; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), x + 76, ry + 44); ctx.textAlign = 'left';
      K.fitText(ctx, s[0], x + 122, ry + 30, 32, w - 175, T.fontZh, '700'); ctx.fillStyle = T.muted; K.fitText(ctx, s[1], x + 122, ry + 68, 26, w - 175, T.fontUi, '500'); });
    ctx.restore();
  };
  window.kit = K;
})();
