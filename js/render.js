/* KOY Studio — brand renderer.
   Draws Instagram stories (1080x1920) and posts (1080x1350) in the approved KOY COSMETICS look:
   Golden Hour colors, Assistant (Hebrew) + Josefin Sans, the full KOY COSMETICS logo (D-026).
   Story text stays inside the safe area (250px from the top, 340px from the bottom). */
(function () {
  'use strict';
  const COL = { bg: '#FFF8F1', surface: '#F5DCCB', accent: '#D9A066', primary: '#9A5A33', text: '#3A2219' };
  const SIZES = { story: { w: 1080, h: 1920 }, post: { w: 1080, h: 1350 }, slots: { w: 1080, h: 1920 } };

  const logo = new Image();
  const logoReady = new Promise(res => { logo.onload = () => res(); logo.onerror = () => res(); });
  logo.src = 'assets/logo.svg';

  const ready = Promise.all([
    logoReady,
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

  function drawLogo(ctx, cx, top, width) {
    if (!logo.naturalWidth) return 0;
    const h = width * logo.naturalHeight / logo.naturalWidth;
    ctx.drawImage(logo, cx - width / 2, top, width, h);
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
  }

  /* Draws the photo so it fills rect (cover), applying zoom and offset. Returns the clamped offset. */
  function drawPhoto(ctx, img, r, st) {
    if (!img) { placeholder(ctx, r); return { x: 0, y: 0 }; }
    const iw = img.width, ih = img.height;
    const s = Math.max(r.w / iw, r.h / ih) * (st.zoom || 1);
    const dw = iw * s, dh = ih * s;
    const mx = (dw - r.w) / 2, my = (dh - r.h) / 2;
    const ox = Math.max(-mx, Math.min(mx, st.x || 0)), oy = Math.max(-my, Math.min(my, st.y || 0));
    ctx.drawImage(img, r.x + r.w / 2 - dw / 2 + ox, r.y + r.h / 2 - dh / 2 + oy, dw, dh);
    return { x: ox, y: oy };
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

  const TEMPLATES = {
    'story:window'(ctx, st) {
      const W = 1080, H = 1920, hasText = !!st.caption;
      ctx.fillStyle = COL.surface; ctx.fillRect(0, 0, W, H);
      const win = { x: 90, y: 250, w: 900, h: hasText ? 980 : 1060 };
      ctx.save(); rr(ctx, win.x, win.y, win.w, win.h, 40); ctx.clip();
      const off = drawPhoto(ctx, st.photo, win, st); ctx.restore();
      const lw = hasText ? 260 : 300;
      const lh = drawLogo(ctx, W / 2, win.y + win.h + (hasText ? 40 : 60), lw);
      if (hasText) drawText(ctx, st.caption, W / 2, win.y + win.h + 40 + lh + 92, { size: 66, maxLines: 1 });
      return { photoRect: win, offset: off };
    },
    'story:full'(ctx, st) {
      const W = 1080, H = 1920;
      ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
      const full = { x: 0, y: 0, w: W, h: H };
      const off = drawPhoto(ctx, st.photo, full, st);
      const g = ctx.createLinearGradient(0, H - 640, 0, H);
      g.addColorStop(0, 'rgba(255,248,241,0)'); g.addColorStop(0.55, 'rgba(255,248,241,.86)'); g.addColorStop(1, 'rgba(255,248,241,.97)');
      ctx.fillStyle = g; ctx.fillRect(0, H - 640, W, 640);
      // logo badge at the top (inside the safe area)
      const bw = 380, bh = 250, bx = W / 2 - bw / 2, by = 240;
      ctx.fillStyle = 'rgba(255,248,241,.93)'; rr(ctx, bx, by, bw, bh, 125); ctx.fill();
      drawLogo(ctx, W / 2, by + 40, 250);
      if (st.caption) drawText(ctx, st.caption, W / 2, 1490, { size: 72 });
      return { photoRect: full, offset: off };
    },
    'post:band'(ctx, st) {
      const W = 1080, H = 1350, hasText = !!st.caption;
      ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
      const top = { x: 0, y: 0, w: W, h: 1060 };
      ctx.save(); ctx.beginPath(); ctx.rect(top.x, top.y, top.w, top.h); ctx.clip();
      const off = drawPhoto(ctx, st.photo, top, st); ctx.restore();
      if (hasText) {
        // logo on the left, text on the right (RTL)
        drawLogo(ctx, 90 + 115, 1060 + 145 - 73, 230);
        const f = fitText(ctx, st.caption, 620, 60, 600, 2), lineH = f.size * 1.15;
        const y0 = 1060 + 145 - (f.lines.length * lineH) / 2 + f.size * 0.8;
        ctx.fillStyle = COL.text; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
        f.lines.forEach((l, i) => ctx.fillText(l, 990, y0 + i * lineH));
      } else {
        drawLogo(ctx, W / 2, 1060 + 145 - 82, 260);
      }
      return { photoRect: top, offset: off };
    },
    'post:window'(ctx, st) {
      const W = 1080, H = 1350;
      ctx.fillStyle = COL.surface; ctx.fillRect(0, 0, W, H);
      const win = { x: 70, y: 70, w: 940, h: 1010 };
      ctx.save(); rr(ctx, win.x, win.y, win.w, win.h, 36); ctx.clip();
      const off = drawPhoto(ctx, st.photo, win, st); ctx.restore();
      drawLogo(ctx, W / 2, 1130, 240);
      return { photoRect: win, offset: off };
    },
    'slots:main'(ctx, st) {
      const W = 1080, H = 1920;
      ctx.fillStyle = COL.surface; ctx.fillRect(0, 0, W, H);
      drawLogo(ctx, W / 2, 260, 280);
      drawText(ctx, st.title || 'תורים פנויים השבוע', W / 2, 640, { size: 96, maxW: 860 });
      const rows = (st.slots || []).map(s => s.trim()).filter(Boolean).slice(0, 5);
      let y = 830;
      if (!rows.length) {
        ctx.fillStyle = 'rgba(58,34,25,.45)'; ctx.font = '400 42px "Assistant"'; ctx.textAlign = 'center';
        ctx.fillText('כאן יופיעו התורים הפנויים', W / 2, y + 70);
        y += 140;
      }
      for (const r of rows) {
        ctx.fillStyle = COL.bg; rr(ctx, 110, y, 860, 108, 26); ctx.fill();
        ctx.fillStyle = COL.text; ctx.font = '600 48px "Assistant"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(r, W / 2, y + 56);
        ctx.textBaseline = 'alphabetic';
        y += 132;
      }
      drawText(ctx, 'לקביעת תור בהודעה', W / 2, Math.min(y + 70, 1560), { size: 46, color: COL.primary });
      return { photoRect: null, offset: { x: 0, y: 0 } };
    },
  };

  function render(canvas, st) {
    const size = SIZES[st.kind];
    if (canvas.width !== size.w) canvas.width = size.w;
    if (canvas.height !== size.h) canvas.height = size.h;
    canvas.setAttribute('dir', 'rtl');
    const ctx = canvas.getContext('2d');
    try { ctx.direction = 'rtl'; } catch (e) { /* older browsers: canvas dir attribute is enough */ }
    ctx.clearRect(0, 0, size.w, size.h);
    const key = st.kind === 'slots' ? 'slots:main' : `${st.kind}:${st.design}`;
    return TEMPLATES[key](ctx, st);
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

  window.KOY = { COL, SIZES, ready, render, loadPhoto };
})();
