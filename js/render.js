/* KOY Studio — brand renderer.
   Draws Instagram stories (1080x1920) and posts (1080x1350) in the approved KOY COSMETICS look:
   Golden Hour colors, Assistant (Hebrew) + Josefin Sans, the full KOY COSMETICS logo (D-026).
   Color themes come only from the approved palette (D-013); dark themes use the light-text logo.
   Story text stays inside the safe area (250px from the top, 340px from the bottom). */
(function () {
  'use strict';
  const COL = { bg: '#FFF8F1', surface: '#F5DCCB', accent: '#D9A066', primary: '#9A5A33', text: '#3A2219' };
  const SIZES = { story: { w: 1080, h: 1920 }, post: { w: 1080, h: 1350 }, slots: { w: 1080, h: 1920 } };

  // Color themes (all from the Golden Hour palette). rgb = background as "r,g,b" for soft fades.
  const THEMES = {
    ivory: { name: 'שמנת', bg: '#FFF8F1', text: '#3A2219', accent: '#9A5A33', logo: 'light', row: '#FFFFFF', rgb: '255,248,241' },
    peach: { name: 'אפרסק', bg: '#F5DCCB', text: '#3A2219', accent: '#9A5A33', logo: 'light', row: '#FFF8F1', rgb: '245,220,203' },
    bronze: { name: 'ברונזה', bg: '#9A5A33', text: '#FFF8F1', accent: '#F5DCCB', logo: 'dark', row: 'rgba(255,248,241,.16)', rgb: '154,90,51' },
    cocoa: { name: 'כהה', bg: '#3A2219', text: '#FFF8F1', accent: '#D9A066', logo: 'dark', row: 'rgba(255,248,241,.12)', rgb: '58,34,25' },
  };
  // The original look of each design stays the default
  const DEFAULT_THEME = { 'story:window': 'peach', 'story:full': 'peach', 'post:band': 'ivory', 'post:window': 'peach', 'slots:main': 'peach' };

  function loadImg(src) {
    const img = new Image();
    const p = new Promise(res => { img.onload = () => res(); img.onerror = () => res(); });
    img.src = src;
    return [img, p];
  }
  const [logoLight, pL] = loadImg('assets/logo.svg');
  const [logoDark, pD] = loadImg('assets/logo-dark.svg');

  const ready = Promise.all([
    pL, pD,
    document.fonts.load('600 60px "Assistant"', 'שיזוף'),
    document.fonts.load('400 40px "Assistant"', 'שיזוף'),
    document.fonts.load('700 40px "Assistant"', 'שיזוף'),
    document.fonts.load('400 40px "Josefin Sans"', 'KOY 18:00'),
  ]).catch(() => {});

  function rr(ctx, x, y, w, h, r) {
    const R = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + R, y);
    ctx.arcTo(x + w, y, x + w, y + h, R);
    ctx.arcTo(x + w, y + h, x, y + h, R);
    ctx.arcTo(x, y + h, x, y, R);
    ctx.arcTo(x, y, x + w, y, R);
    ctx.closePath();
  }

  function drawLogo(ctx, cx, top, width, variant) {
    const img = variant === 'dark' ? logoDark : logoLight;
    if (!img.naturalWidth) return 0;
    const h = width * img.naturalHeight / img.naturalWidth;
    ctx.drawImage(img, cx - width / 2, top, width, h);
    return h;
  }

  function placeholder(ctx, r) {
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    g.addColorStop(0, '#F8DFC8'); g.addColorStop(0.5, '#EFC096'); g.addColorStop(1, '#D08A58');
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    const cx = r.x + r.w / 2, cy = r.y + r.h * 0.46, rad = Math.min(r.w, r.h) * 0.28;
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    rg.addColorStop(0, 'rgba(255,246,234,1)'); rg.addColorStop(0.5, 'rgba(251,217,174,.7)'); rg.addColorStop(1, 'rgba(251,217,174,0)');
    ctx.fillStyle = rg; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = 'rgba(255,248,241,.95)';
    ctx.font = '600 44px "Assistant"';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('התמונה שלך כאן', cx, r.y + r.h * 0.62);
    ctx.textBaseline = 'alphabetic';
  }

  /* Draws the photo in rect. zoom 1 = fills the frame (cover); below 1 the whole photo can fit,
     with a soft, faded copy of the photo behind it so there are no empty gaps.
     Returns the clamped offset and how far the photo can move (mx, my). */
  function drawPhoto(ctx, img, r, st, T) {
    if (!img) { placeholder(ctx, r); return { x: 0, y: 0, mx: 0, my: 0 }; }
    const iw = img.width, ih = img.height;
    const cover = Math.max(r.w / iw, r.h / ih);
    const s = cover * (st.zoom || 1);
    const dw = iw * s, dh = ih * s;
    const mx = Math.abs(dw - r.w) / 2, my = Math.abs(dh - r.h) / 2;
    const ox = Math.max(-mx, Math.min(mx, st.x || 0)), oy = Math.max(-my, Math.min(my, st.y || 0));
    if (dw < r.w - 0.5 || dh < r.h - 0.5) {
      ctx.fillStyle = T.bg; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.save(); ctx.globalAlpha = 0.3;
      ctx.drawImage(img, r.x + r.w / 2 - iw * cover / 2, r.y + r.h / 2 - ih * cover / 2, iw * cover, ih * cover);
      ctx.restore();
    }
    ctx.drawImage(img, r.x + r.w / 2 - dw / 2 + ox, r.y + r.h / 2 - dh / 2 + oy, dw, dh);
    return { x: ox, y: oy, mx, my };
  }

  /* Wraps Hebrew text into at most `maxLines` lines, shrinking the font if needed. */
  function fitText(ctx, str, maxW, size, weight, maxLines) {
    let s = size;
    for (; s >= size * 0.6; s -= 2) {
      ctx.font = `${weight} ${s}px "Assistant"`;
      const words = str.split(/\s+/); const lines = []; let cur = '';
      for (const w of words) {
        const t = cur ? cur + ' ' + w : w;
        if (ctx.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; }
      }
      if (cur) lines.push(cur);
      if (lines.length <= maxLines && lines.every(l => ctx.measureText(l).width <= maxW)) return { lines, size: s };
    }
    ctx.font = `${weight} ${s}px "Assistant"`;
    return { lines: [str], size: s };
  }
  function drawText(ctx, str, cx, y, opt) {
    const o = Object.assign({ size: 64, weight: 600, color: COL.text, maxW: 900, maxLines: 2, lh: 1.15, align: 'center' }, opt);
    const f = fitText(ctx, str, o.maxW, o.size, o.weight, o.maxLines);
    ctx.fillStyle = o.color; ctx.textAlign = o.align; ctx.textBaseline = 'alphabetic';
    f.lines.forEach((l, i) => ctx.fillText(l, cx, y + i * f.size * o.lh));
    return f.lines.length * f.size * o.lh;
  }
  const fade = (T, a) => `rgba(${T.rgb},${a})`;

  const TEMPLATES = {
    'story:window'(ctx, st, T) {
      const W = 1080, H = 1920, hasText = !!st.caption;
      ctx.fillStyle = T.bg; ctx.fillRect(0, 0, W, H);
      const win = { x: 90, y: 250, w: 900, h: hasText ? 980 : 1060 };
      ctx.save(); rr(ctx, win.x, win.y, win.w, win.h, 40); ctx.clip();
      const off = drawPhoto(ctx, st.photo, win, st, T); ctx.restore();
      const lw = hasText ? 260 : 300;
      const lh = drawLogo(ctx, W / 2, win.y + win.h + (hasText ? 40 : 60), lw, T.logo);
      if (hasText) drawText(ctx, st.caption, W / 2, win.y + win.h + 40 + lh + 92, { size: 66, maxLines: 1, color: T.text });
      return { photoRect: win, offset: off };
    },
    'story:full'(ctx, st, T) {
      const W = 1080, H = 1920;
      ctx.fillStyle = T.bg; ctx.fillRect(0, 0, W, H);
      const full = { x: 0, y: 0, w: W, h: H };
      const off = drawPhoto(ctx, st.photo, full, st, T);
      if (st.logoPos === 'top') {
        // logo badge at the top (inside the safe area), text at the bottom
        const g = ctx.createLinearGradient(0, H - 640, 0, H);
        g.addColorStop(0, fade(T, 0)); g.addColorStop(0.55, fade(T, 0.86)); g.addColorStop(1, fade(T, 0.97));
        ctx.fillStyle = g; ctx.fillRect(0, H - 640, W, 640);
        const bw = 380, bh = 250, bx = W / 2 - bw / 2, by = 240;
        ctx.fillStyle = fade(T, 0.93); rr(ctx, bx, by, bw, bh, 125); ctx.fill();
        drawLogo(ctx, W / 2, by + 40, 250, T.logo);
        if (st.caption) drawText(ctx, st.caption, W / 2, 1490, { size: 72, color: T.text });
      } else {
        // default: face stays clear. The fade (in the chosen color) turns fully solid before the logo,
        // so the logo stands on one even color; the optional text sits just above it.
        const logoTop = 1500, solidTop = logoTop - 70;
        const fadeH = st.caption ? 520 : 380;
        const g = ctx.createLinearGradient(0, solidTop - fadeH, 0, solidTop);
        g.addColorStop(0, fade(T, 0)); g.addColorStop(0.35, fade(T, 0.35)); g.addColorStop(0.7, fade(T, 0.82)); g.addColorStop(1, fade(T, 1));
        ctx.fillStyle = g; ctx.fillRect(0, solidTop - fadeH, W, fadeH);
        ctx.fillStyle = T.bg; ctx.fillRect(0, solidTop, W, H - solidTop);
        drawLogo(ctx, W / 2, logoTop, 260, T.logo);
        if (st.caption) {
          const f = fitText(ctx, st.caption, 900, 70, 600, 2), lineH = f.size * 1.15;
          const lastBase = logoTop - 40;
          ctx.fillStyle = T.text; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
          f.lines.forEach((l, i) => ctx.fillText(l, W / 2, lastBase - (f.lines.length - 1 - i) * lineH));
        }
      }
      return { photoRect: full, offset: off };
    },
    'post:band'(ctx, st, T) {
      const W = 1080, H = 1350, hasText = !!st.caption;
      ctx.fillStyle = T.bg; ctx.fillRect(0, 0, W, H);
      const top = { x: 0, y: 0, w: W, h: 1060 };
      ctx.save(); ctx.beginPath(); ctx.rect(top.x, top.y, top.w, top.h); ctx.clip();
      const off = drawPhoto(ctx, st.photo, top, st, T); ctx.restore();
      if (hasText) {
        // logo on the left, text on the right (RTL)
        drawLogo(ctx, 90 + 115, 1060 + 145 - 73, 230, T.logo);
        const f = fitText(ctx, st.caption, 620, 60, 600, 2), lineH = f.size * 1.15;
        const y0 = 1060 + 145 - (f.lines.length * lineH) / 2 + f.size * 0.8;
        ctx.fillStyle = T.text; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
        f.lines.forEach((l, i) => ctx.fillText(l, 990, y0 + i * lineH));
      } else {
        drawLogo(ctx, W / 2, 1060 + 145 - 82, 260, T.logo);
      }
      return { photoRect: top, offset: off };
    },
    'post:window'(ctx, st, T) {
      const W = 1080, H = 1350;
      ctx.fillStyle = T.bg; ctx.fillRect(0, 0, W, H);
      const win = { x: 70, y: 70, w: 940, h: 1010 };
      ctx.save(); rr(ctx, win.x, win.y, win.w, win.h, 36); ctx.clip();
      const off = drawPhoto(ctx, st.photo, win, st, T); ctx.restore();
      drawLogo(ctx, W / 2, 1130, 240, T.logo);
      return { photoRect: win, offset: off };
    },
    'slots:main'(ctx, st, T) {
      const W = 1080, H = 1920;
      ctx.fillStyle = T.bg; ctx.fillRect(0, 0, W, H);
      drawLogo(ctx, W / 2, 260, 280, T.logo);
      drawText(ctx, st.title || 'תורים פנויים השבוע', W / 2, 640, { size: 96, maxW: 860, color: T.text });
      const rows = (st.slots || []).map(s => s.trim()).filter(Boolean).slice(0, 5);
      let y = 830;
      if (!rows.length) {
        ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = T.text; ctx.font = '400 42px "Assistant"'; ctx.textAlign = 'center';
        ctx.fillText('כאן יופיעו התורים הפנויים', W / 2, y + 70); ctx.restore();
        y += 140;
      }
      for (const r of rows) {
        ctx.fillStyle = T.row; rr(ctx, 110, y, 860, 108, 26); ctx.fill();
        ctx.fillStyle = T.text; ctx.font = '600 48px "Assistant"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(r, W / 2, y + 56);
        ctx.textBaseline = 'alphabetic';
        y += 132;
      }
      drawText(ctx, 'לקביעת תור בהודעה', W / 2, Math.min(y + 70, 1560), { size: 46, color: T.accent });
      return { photoRect: null, offset: { x: 0, y: 0 } };
    },
  };

  function themeFor(st) {
    const key = st.kind === 'slots' ? 'slots:main' : `${st.kind}:${st.design}`;
    return { key, T: THEMES[st.theme] || THEMES[DEFAULT_THEME[key]] };
  }

  function render(canvas, st) {
    const size = SIZES[st.kind];
    if (canvas.width !== size.w) canvas.width = size.w;
    if (canvas.height !== size.h) canvas.height = size.h;
    canvas.setAttribute('dir', 'rtl');
    const ctx = canvas.getContext('2d');
    try { ctx.direction = 'rtl'; } catch (e) { /* older browsers: canvas dir attribute is enough */ }
    ctx.clearRect(0, 0, size.w, size.h);
    const { key, T } = themeFor(st);
    return TEMPLATES[key](ctx, st, T);
  }

  /* Downscale very large photos so phones stay fast; keeps EXIF orientation (applied by the browser). */
  function loadPhoto(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const max = 2600, sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
  }

  window.KOY = { COL, SIZES, THEMES, DEFAULT_THEME, ready, render, loadPhoto };
})();
