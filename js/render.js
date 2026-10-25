/* Studio core — brand renderer (shared by KOY Studio and AK Studio; brand details come from js/brand.js).
   Draws Instagram stories (1080x1920), posts (1080x1350) and video frames (1080x1920) in the brand's look.
   Each design is drawn in layers: background (under) → photo or video frame → logo, text and fades (over).
   For video the two fixed layers are drawn once and reused on every frame.
   Designs made from the owner's own data: price list, promotion, shade of the week, review, tip, open slots.
   Logo sizes are given as a nominal width for a logo of height/width 0.325 (AK's signature); any logo is drawn
   at the same height, so wide and tall logos sit equally well in every layout.
   Source of truth: Desktop/STUDIO_CORE/core — copy into each app with STUDIO_CORE/sync.js. */
(function () {
  'use strict';
  const B = window.BRAND;
  const COL = B.COL;
  const SIZES = { story: { w: 1080, h: 1920 }, post: { w: 1080, h: 1350 } };
  // designs made from the owner's data come in both sizes (st.format = 'story' | 'post')
  const TEXT_KINDS = ['prices', 'promo', 'shade', 'review', 'tip'];
  const FONT = `"${B.FONT}"`, HW = B.HW || 400, BW = B.BW || 400;
  const font = (size, w = HW) => `${w} ${size}px ${FONT}`;
  const THEMES = B.THEMES, DEFAULT_THEME = B.DEFAULT_THEME;
  const DEFAULT_LOGO_POS = { 'story:full': 'bottom', 'video:full': 'bottom', 'video:clean': 'top' };
  // Instagram covers the top and bottom of the screen: more at the bottom of a reel than of a story.
  const SAFE = { top: 250, story: 1664, reel: 1440 };
  const CTA = B.CTA || 'לקביעת תור בהודעה';
  const REF = 0.325; // nominal logo height / width

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
    document.fonts.load(font(40), 'שלום'), document.fonts.load(font(40, BW), 'שלום'),
    document.fonts.load('40px "Josefin Sans"', 'NAILS 18:00'),
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
  // nominal width → drawn at height nominal*REF; returns that height
  function drawLogo(ctx, cx, top, nominal, variant) {
    const img = variant === 'dark' ? logoDark : logoLight, h = nominal * REF;
    if (!img.naturalWidth) return h;
    const w = h * img.naturalWidth / img.naturalHeight;
    ctx.drawImage(img, cx - w / 2, top, w, h);
    return h;
  }

  // glossy almond nail in any polish color (shade of the week)
  function mix(hex, to, t) {
    const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16);
    const ch = (x, s) => (x >> s) & 255;
    const m = s => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
    return `rgb(${m(16)},${m(8)},${m(0)})`;
  }
  function nail(ctx, cx, top, w, h, color) {
    const r = w / 2, y = top;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.bezierCurveTo(cx + r * 0.42, y, cx + r, y + h * 0.3, cx + r, y + h * 0.64);
    ctx.bezierCurveTo(cx + r, y + h * 0.88, cx + r * 0.55, y + h, cx, y + h);
    ctx.bezierCurveTo(cx - r * 0.55, y + h, cx - r, y + h * 0.88, cx - r, y + h * 0.64);
    ctx.bezierCurveTo(cx - r, y + h * 0.3, cx - r * 0.42, y, cx, y);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, mix(color, '#FFFFFF', 0.38)); g.addColorStop(1, mix(color, '#000000', 0.08));
    ctx.shadowColor = 'rgba(58,48,70,.18)'; ctx.shadowBlur = w * 0.18; ctx.shadowOffsetY = w * 0.06;
    ctx.fillStyle = g; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.2, y + h * 0.22);
    ctx.bezierCurveTo(cx - w * 0.3, y + h * 0.4, cx - w * 0.3, y + h * 0.6, cx - w * 0.22, y + h * 0.76);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = w * 0.1; ctx.lineCap = 'round'; ctx.stroke();
    ctx.restore();
  }

  function placeholder(ctx, r, label) {
    const P = B.PLACEHOLDER;
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    P.stops.forEach((c, i) => g.addColorStop(i / (P.stops.length - 1), c));
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    const cx = r.x + r.w / 2, cy = r.y + r.h * 0.46, rad = Math.min(r.w, r.h) * 0.28;
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    rg.addColorStop(0, 'rgba(255,255,255,.9)'); rg.addColorStop(0.5, 'rgba(255,255,255,.35)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = P.label;
    ctx.font = font(44);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, r.y + r.h * 0.62);
    ctx.textBaseline = 'alphabetic';
  }

  /* Draws the photo (or the current video frame) in rect. zoom 1 = fills the frame (cover); below 1 the
     whole picture can fit, with a soft, faded copy behind it so there are no empty gaps. */
  function drawPhoto(ctx, img, r, st, T) {
    const iw = img ? (img.videoWidth || img.width) : 0, ih = img ? (img.videoHeight || img.height) : 0;
    if (!iw || !ih) { placeholder(ctx, r, st.kind === 'video' ? 'הסרטון שלך כאן' : 'התמונה שלך כאן'); return { x: 0, y: 0, mx: 0, my: 0 }; }
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
  function photoIn(ctx, st, f, T) {
    ctx.save();
    if (f.r) rr(ctx, f.x, f.y, f.w, f.h, f.r); else { ctx.beginPath(); ctx.rect(f.x, f.y, f.w, f.h); }
    ctx.clip();
    const off = drawPhoto(ctx, st.photo, f, st, T);
    ctx.restore();
    return off;
  }

  /* Wraps Hebrew text into at most `maxLines` lines, shrinking the font if needed. */
  function fitText(ctx, str, maxW, size, maxLines, minFactor = 0.6, weight = HW) {
    let s = size;
    for (; s >= size * minFactor; s -= 2) {
      ctx.font = font(s, weight);
      const words = String(str).split(/\s+/).filter(Boolean); const lines = []; let cur = '';
      for (const w of words) {
        const t = cur ? cur + ' ' + w : w;
        if (ctx.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; }
      }
      if (cur) lines.push(cur);
      if (lines.length <= maxLines && lines.every(l => ctx.measureText(l).width <= maxW)) return { lines, size: s };
    }
    ctx.font = font(s, weight);
    return { lines: [String(str)], size: s };
  }
  function drawText(ctx, str, x, y, opt) {
    const o = Object.assign({ size: 64, color: COL.text, maxW: 900, maxLines: 2, lh: 1.18, align: 'center', weight: HW }, opt);
    const f = fitText(ctx, str, o.maxW, o.size, o.maxLines, 0.6, o.weight);
    ctx.fillStyle = o.color; ctx.textAlign = o.align; ctx.textBaseline = 'alphabetic';
    f.lines.forEach((l, i) => ctx.fillText(l, x, y + i * f.size * o.lh));
    return f.lines.length * f.size * o.lh;
  }
  // prices and numbers in Hebrew text: draw left-to-right
  function ltrText(ctx, str, x, y, align) {
    ctx.save(); try { ctx.direction = 'ltr'; } catch (e) { /* ok */ }
    ctx.textAlign = align; ctx.fillText(str, x, y); ctx.restore();
  }
  const price = p => { const v = String(p == null ? '' : p).trim(); return /^\d+([.,]\d+)?$/.test(v) ? '₪' + v : v; };
  const fade = (T, a) => `rgba(${T.rgb},${a})`;
  const sizeOf = st => (TEXT_KINDS.includes(st.kind) ? SIZES[st.format === 'post' ? 'post' : 'story'] : st.kind === 'post' ? SIZES.post : SIZES.story);
  const bgFill = (ctx, st, T) => { const s = sizeOf(st); ctx.fillStyle = T.bg; ctx.fillRect(0, 0, s.w, s.h); };
  const bottomLine = st => (st.kind === 'video' && st.dest === 'reel' ? SAFE.reel : SAFE.story);
  function pill(ctx, text, cx, y, size, T, filled) {
    ctx.font = font(size);
    const w = ctx.measureText(text).width + size * 1.6, h = size * 1.9;
    rr(ctx, cx - w / 2, y, w, h, h / 2);
    if (filled) { ctx.fillStyle = T.btn; ctx.fill(); } else { ctx.lineWidth = 3; ctx.strokeStyle = T.accent; ctx.stroke(); }
    ctx.fillStyle = filled ? T.btnText : T.accent; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, y + h / 2 + size * 0.04);
    ctx.textBaseline = 'alphabetic';
    return h;
  }
  // CTA (+ Instagram handle, if added) at the bottom of data designs
  function footer(ctx, st, T, y) {
    drawText(ctx, st.cta || CTA, 540, y, { size: 44, color: T.accent, maxLines: 1 });
    if (st.handle) { ctx.fillStyle = T.text; ctx.globalAlpha = 0.7; ctx.font = '34px "Josefin Sans"'; ltrText(ctx, '@' + st.handle.replace(/^@/, ''), 540, y + 58, 'center'); ctx.globalAlpha = 1; }
  }

  /* Full-screen look (photo story and video): fades in the chosen color.
     Logo at the bottom: the fade turns solid before the logo, text above it. Logo at the top: logo in a soft badge. */
  function fullOver(ctx, st, T) {
    const W = 1080, H = 1920, sb = bottomLine(st), LW = 470, LH = LW * REF;
    if (st.logoPos === 'top') {
      const fadeTop = sb - 384;
      const g = ctx.createLinearGradient(0, fadeTop, 0, fadeTop + 640);
      g.addColorStop(0, fade(T, 0)); g.addColorStop(0.55, fade(T, 0.86)); g.addColorStop(1, fade(T, 0.97));
      ctx.fillStyle = g; ctx.fillRect(0, fadeTop, W, 640);
      if (fadeTop + 640 < H) { ctx.fillStyle = fade(T, 0.97); ctx.fillRect(0, fadeTop + 640, W, H - fadeTop - 640); }
      const lw = 440, lh = lw * REF, bh = lh + 90;
      ctx.font = font(10);
      const img = T.logo === 'dark' ? logoDark : logoLight;
      const realW = img.naturalWidth ? lh * img.naturalWidth / img.naturalHeight : lw;
      const bw = Math.max(380, realW + 120), by = 240;
      ctx.fillStyle = fade(T, 0.93); rr(ctx, W / 2 - bw / 2, by, bw, bh, bh / 2); ctx.fill();
      drawLogo(ctx, W / 2, by + (bh - lh) / 2, lw, T.logo);
      if (st.caption) drawText(ctx, st.caption, W / 2, sb - 174, { size: 72, color: T.text });
    } else {
      const logoTop = sb - LH, solidTop = logoTop - 70;
      const fadeH = st.caption ? 520 : 380;
      const g = ctx.createLinearGradient(0, solidTop - fadeH, 0, solidTop);
      g.addColorStop(0, fade(T, 0)); g.addColorStop(0.35, fade(T, 0.35)); g.addColorStop(0.7, fade(T, 0.82)); g.addColorStop(1, fade(T, 1));
      ctx.fillStyle = g; ctx.fillRect(0, solidTop - fadeH, W, fadeH);
      ctx.fillStyle = T.bg; ctx.fillRect(0, solidTop, W, H - solidTop);
      drawLogo(ctx, W / 2, logoTop, LW, T.logo);
      if (st.caption) {
        const f = fitText(ctx, st.caption, 900, 70, 2), lineH = f.size * 1.18;
        const lastBase = logoTop - 40;
        ctx.fillStyle = T.text; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        f.lines.forEach((l, i) => ctx.fillText(l, W / 2, lastBase - (f.lines.length - 1 - i) * lineH));
      }
    }
  }

  /* Templates: frame = where the photo/video goes (null = no photo), under = behind it, over = on top of it. */
  const TEMPLATES = {
    // ---- photo ----
    'story:window': {
      frame: st => ({ x: 90, y: 250, w: 900, h: st.caption ? 1000 : 1080, r: 40 }),
      under: bgFill,
      over(ctx, st, T, f) {
        const lw = st.caption ? 470 : 520;
        const lh = drawLogo(ctx, 540, f.y + f.h + (st.caption ? 44 : 64), lw, T.logo);
        if (st.caption) drawText(ctx, st.caption, 540, f.y + f.h + 44 + lh + 96, { size: 66, maxLines: 1, color: T.text });
      },
    },
    'story:full': { frame: () => ({ x: 0, y: 0, w: 1080, h: 1920, r: 0 }), under: bgFill, over: fullOver },
    'post:band': {
      frame: () => ({ x: 0, y: 0, w: 1080, h: 1060, r: 0 }),
      under: bgFill,
      over(ctx, st, T) {
        if (st.caption) {
          // logo on the left, text on the right (RTL)
          const lw = 360, lh = lw * REF;
          const img = T.logo === 'dark' ? logoDark : logoLight;
          const realW = img.naturalWidth ? lh * img.naturalWidth / img.naturalHeight : lw;
          drawLogo(ctx, 80 + realW / 2, 1060 + 145 - lh / 2, lw, T.logo);
          const f = fitText(ctx, st.caption, 1000 - 80 - realW - 60, 58, 2), lineH = f.size * 1.18;
          const y0 = 1060 + 145 - (f.lines.length * lineH) / 2 + f.size * 0.8;
          ctx.fillStyle = T.text; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
          f.lines.forEach((l, i) => ctx.fillText(l, 1000, y0 + i * lineH));
        } else {
          const lw = 470, lh = lw * REF;
          drawLogo(ctx, 540, 1060 + 145 - lh / 2, lw, T.logo);
        }
      },
    },
    'post:window': {
      frame: () => ({ x: 70, y: 70, w: 940, h: 1010, r: 36 }),
      under: bgFill,
      over(ctx, st, T) { const lw = 440, lh = lw * REF; drawLogo(ctx, 540, 1080 + (270 - lh) / 2, lw, T.logo); },
    },
    // ---- open slots (from the work days) ----
    'slots:main': {
      frame: () => null,
      under(ctx, st, T) {
        const W = 1080;
        bgFill(ctx, st, T);
        drawLogo(ctx, W / 2, 250, 480, T.logo);
        drawText(ctx, st.title || 'תורים פנויים השבוע', W / 2, 620, { size: 96, maxW: 860, color: T.text });
        const rows = (st.slots || []).map(s => s.trim()).filter(Boolean).slice(0, 6);
        let y = 760;
        if (!rows.length) {
          ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = T.text; ctx.font = font(42, BW); ctx.textAlign = 'center';
          ctx.fillText('כאן יופיעו התורים הפנויים', W / 2, y + 70); ctx.restore();
          y += 140;
        }
        for (const r of rows) {
          ctx.fillStyle = T.row; rr(ctx, 110, y, 860, 104, 26); ctx.fill();
          ctx.fillStyle = T.text; ctx.font = font(46); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(r, W / 2, y + 54);
          ctx.textBaseline = 'alphabetic';
          y += 126;
        }
        footer(ctx, st, T, Math.min(y + 80, 1560));
      },
    },
    // ---- price list (from the owner's services) ----
    'prices:main': {
      frame: () => null,
      under(ctx, st, T) {
        const S = sizeOf(st), story = S.h === 1920, W = 1080;
        bgFill(ctx, st, T);
        const lh = drawLogo(ctx, W / 2, story ? 250 : 70, story ? 440 : 360, T.logo);
        let y = (story ? 250 : 70) + lh + (story ? 110 : 80);
        y += drawText(ctx, st.title || 'מחירון', W / 2, y, { size: story ? 104 : 86, color: T.text, maxLines: 1 }) - (story ? 40 : 30);
        if (st.note) y += drawText(ctx, st.note, W / 2, y + 30, { size: story ? 38 : 34, color: T.accent, maxLines: 2, weight: BW }) + 10;
        const items = (st.items || []).filter(i => i && String(i.name || '').trim()).slice(0, 10);
        const bottom = story ? 1470 : 1150, top = y + 20;
        if (!items.length) {
          ctx.save(); ctx.globalAlpha = 0.55; drawText(ctx, 'הוסיפי שירותים ומחירים בהגדרות', W / 2, top + 120, { size: 42, color: T.text }); ctx.restore();
        } else {
          // few services: bigger rows, and the list sits in the middle of the free space
          const rowH = Math.max(76, Math.min(story ? 170 : 124, (bottom - top) / items.length));
          const fs = Math.round(Math.max(34, Math.min(story ? 58 : 52, rowH * 0.4)));
          const y0 = top + Math.max(0, (bottom - top - rowH * items.length) * 0.4);
          items.forEach((it, i) => {
            const yb = y0 + i * rowH + rowH * 0.64;
            const p = price(it.price);
            ctx.font = font(fs);
            const pw = p ? ctx.measureText(p).width : 0;
            const f = fitText(ctx, it.name, 860 - pw - 40, fs, 1, 0.7);
            ctx.fillStyle = T.text; ctx.textAlign = 'right'; ctx.font = font(f.size);
            ctx.fillText(f.lines[0], W - 110, yb);
            if (p) {
              ctx.fillStyle = T.accent; ctx.font = font(fs);
              if (/[֐-׿]/.test(p)) { ctx.textAlign = 'left'; ctx.fillText(p, 110, yb); } // Hebrew text ("החל מ-20") stays right-to-left
              else ltrText(ctx, p, 110, yb, 'left');
            }
            if (i < items.length - 1) { ctx.fillStyle = T.text; ctx.globalAlpha = 0.12; ctx.fillRect(110, y0 + (i + 1) * rowH, 860, 2); ctx.globalAlpha = 1; }
          });
        }
        footer(ctx, st, T, story ? 1560 : 1250);
      },
    },
    // ---- promotion ----
    'promo:main': {
      frame: () => null,
      under(ctx, st, T) {
        const S = sizeOf(st), story = S.h === 1920, W = 1080;
        bgFill(ctx, st, T);
        const lh = drawLogo(ctx, W / 2, story ? 250 : 64, story ? 440 : 340, T.logo);
        let y = (story ? 250 : 64) + lh + (story ? 120 : 70);
        y += pill(ctx, st.label || 'מבצע', W / 2, y, story ? 40 : 34, T, false) + (story ? 70 : 50);
        if (st.title) y += drawText(ctx, st.title, W / 2, y + (story ? 70 : 60), { size: story ? 100 : 84, color: T.text, maxLines: 2 }) + 10;
        if (st.service && st.service !== st.title) y += drawText(ctx, st.service, W / 2, y + 40, { size: story ? 46 : 40, color: T.text, maxLines: 1, weight: BW });
        if (st.price) {
          const big = story ? 170 : 136;
          y += big + (story ? 40 : 20);
          ctx.fillStyle = T.accent; ctx.font = font(big); ltrText(ctx, price(st.price), W / 2, y, 'center');
          if (st.oldPrice) {
            const s2 = story ? 58 : 50, txt = 'במקום ' + price(st.oldPrice);
            ctx.font = font(s2, BW); ctx.fillStyle = T.text; ctx.globalAlpha = 0.6;
            const tw = ctx.measureText(txt).width; y += s2 + 24;
            ctx.textAlign = 'center'; ctx.fillText(txt, W / 2, y);
            const pw = ctx.measureText(price(st.oldPrice)).width;
            ctx.fillRect(W / 2 - tw / 2, y - s2 * 0.32, pw + 4, 3); // strike through the old price (left part in RTL)
            ctx.globalAlpha = 1;
          }
        }
        if (st.valid) y += drawText(ctx, st.valid, W / 2, y + (story ? 90 : 70), { size: story ? 42 : 36, color: T.text, maxLines: 1, weight: BW });
        const by = story ? 1430 : 1150;
        pill(ctx, st.cta || CTA, W / 2, by, story ? 42 : 36, T, true);
        if (st.handle) { ctx.fillStyle = T.text; ctx.globalAlpha = 0.7; ctx.font = '34px "Josefin Sans"'; ltrText(ctx, '@' + st.handle.replace(/^@/, ''), W / 2, by + (story ? 140 : 120), 'center'); ctx.globalAlpha = 1; }
      },
    },
    // ---- shade of the week (nails) ----
    'shade:main': {
      frame: () => null,
      under(ctx, st, T) {
        const S = sizeOf(st), story = S.h === 1920, W = 1080;
        bgFill(ctx, st, T);
        const nw = story ? 300 : 230, nh = nw * 1.72, ny = story ? 260 : 90;
        nail(ctx, W / 2, ny, nw, nh, st.shadeColor || '#C9B5DB');
        let y = ny + nh + (story ? 110 : 80);
        drawText(ctx, st.label || 'הגוון של השבוע', W / 2, y, { size: story ? 44 : 38, color: T.accent, maxLines: 1 });
        y += story ? 130 : 110;
        y += drawText(ctx, st.shadeName || 'שם הגוון', W / 2, y, { size: story ? 112 : 92, color: T.text, maxLines: 2 });
        if (st.note) drawText(ctx, st.note, W / 2, y + 10, { size: story ? 42 : 36, color: T.text, maxLines: 2, weight: BW });
        const lw = story ? 440 : 360, lh = lw * REF;
        drawLogo(ctx, W / 2, story ? 1580 - lh : 1350 - 60 - lh, lw, T.logo);
      },
    },
    // ---- client review ----
    'review:main': {
      frame: () => null,
      under(ctx, st, T) {
        const S = sizeOf(st), story = S.h === 1920, W = 1080;
        bgFill(ctx, st, T);
        const lw = story ? 440 : 360;
        drawLogo(ctx, W / 2, story ? 250 : 64, lw, T.logo);
        const text = st.reviewText || 'כאן נכנסת ההמלצה של הלקוחה';
        const f = fitText(ctx, text, 860, story ? 66 : 56, story ? 7 : 6, 0.55, BW), lineH = f.size * 1.4;
        const blockH = f.lines.length * lineH;
        const mid = story ? 900 : 660, y0 = mid - blockH / 2 + f.size;
        ctx.fillStyle = T.accent; ctx.font = `${story ? 300 : 240}px "Josefin Sans"`; ctx.textAlign = 'center';
        ctx.fillText('”', W / 2, y0 - f.size * 0.4 - (story ? 10 : 0));
        ctx.fillStyle = T.text; ctx.font = font(f.size, BW); ctx.textAlign = 'center';
        f.lines.forEach((l, i) => ctx.fillText(l, W / 2, y0 + (story ? 120 : 90) + i * lineH));
        const ny = y0 + (story ? 120 : 90) + blockH + (story ? 50 : 30);
        if (st.reviewName) drawText(ctx, st.reviewName, W / 2, ny, { size: story ? 46 : 40, color: T.accent, maxLines: 1 });
        footer(ctx, st, T, story ? 1560 : 1270);
      },
    },
    // ---- tip ----
    'tip:main': {
      frame: () => null,
      under(ctx, st, T) {
        const S = sizeOf(st), story = S.h === 1920, W = 1080, R = W - 100;
        bgFill(ctx, st, T);
        let y = story ? 290 : 110;
        ctx.font = font(story ? 36 : 32);
        const pw = ctx.measureText(st.label || 'טיפ').width + (story ? 58 : 52);
        pill(ctx, st.label || 'טיפ', R - pw / 2, y, story ? 36 : 32, T, false);
        y += (story ? 70 : 60) + (story ? 120 : 100);
        y += drawText(ctx, st.tipTitle || 'כותרת הטיפ', R, y, { size: story ? 92 : 80, color: T.text, maxLines: 3, align: 'right', maxW: 880 }) + (story ? 40 : 30);
        const lines = (st.tipLines || []).map(s => String(s || '').trim()).filter(Boolean).slice(0, 3);
        lines.forEach((l, i) => {
          const fs = story ? 48 : 42;
          ctx.fillStyle = T.accent; ctx.font = font(fs); ctx.textAlign = 'right'; ctx.fillText((i + 1) + '.', R, y);
          const h = drawText(ctx, l, R - fs * 1.1, y, { size: fs, color: T.text, maxLines: 2, align: 'right', maxW: 820, lh: 1.3, weight: BW });
          y += h + (story ? 34 : 24);
        });
        const lw = story ? 440 : 360, lh = lw * REF;
        drawLogo(ctx, W / 2, story ? 1580 - lh : 1350 - 60 - lh, lw, T.logo);
      },
    },

    // ---- video (story and reel, 1080x1920) ----
    'video:full': { frame: () => ({ x: 0, y: 0, w: 1080, h: 1920, r: 0 }), under: bgFill, over: fullOver },
    'video:window': {
      frame(st) {
        const lh = 470 * REF, logoTop = bottomLine(st) - (st.caption ? 84 : 0) - lh;
        return { x: 90, y: SAFE.top, w: 900, h: logoTop - 40 - SAFE.top, r: 40 };
      },
      under: bgFill,
      over(ctx, st, T, f) {
        const logoTop = f.y + f.h + 40, lh = drawLogo(ctx, 540, logoTop, 470, T.logo);
        if (st.caption) drawText(ctx, st.caption, 540, logoTop + lh + 70, { size: 62, maxLines: 1, color: T.text });
      },
    },
    'video:clean': {
      frame: () => ({ x: 0, y: 0, w: 1080, h: 1920, r: 0 }),
      under: bgFill,
      over(ctx, st, T) {
        const sb = bottomLine(st), top = st.logoPos !== 'bottom';
        const lw = 420, lh = lw * REF, bh = lh + 54;
        const img = T.logo === 'dark' ? logoDark : logoLight;
        const realW = img.naturalWidth ? lh * img.naturalWidth / img.naturalHeight : lw;
        const bw = Math.max(300, realW + 80);
        const by = top ? SAFE.top : sb - bh;
        ctx.fillStyle = fade(T, 0.94); rr(ctx, 540 - bw / 2, by, bw, bh, Math.min(60, bh / 2)); ctx.fill();
        drawLogo(ctx, 540, by + (bh - lh) / 2, lw, T.logo);
        if (st.caption) {
          const f = fitText(ctx, st.caption, 840, 56, 1);
          const tw = ctx.measureText(f.lines[0]).width;
          const ph = Math.round(f.size + 46), pw = Math.min(1000, tw + 96);
          const py = top ? sb - ph : by - 28 - ph;
          ctx.fillStyle = fade(T, 0.94); rr(ctx, 540 - pw / 2, py, pw, ph, ph / 2); ctx.fill();
          ctx.fillStyle = T.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(f.lines[0], 540, py + ph / 2 + 2);
          ctx.textBaseline = 'alphabetic';
        }
      },
    },
  };

  /* End card for videos: the last 2 seconds, solid color with the logo and the booking line. */
  function endCard(ctx, st, T, a) {
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = T.bg; ctx.fillRect(0, 0, 1080, 1920);
    drawLogo(ctx, 540, 640, 820, T.logo);
    let y = 1150;
    if (st.caption) y += drawText(ctx, st.caption, 540, y, { size: 68, maxW: 900, color: T.text }) + 20;
    drawText(ctx, st.cta || CTA, 540, y, { size: 50, color: T.accent, maxLines: 1 });
    if (st.handle) { ctx.fillStyle = T.text; ctx.globalAlpha = a * 0.7; ctx.font = '38px "Josefin Sans"'; ltrText(ctx, '@' + st.handle.replace(/^@/, ''), 540, y + 76, 'center'); }
    ctx.restore();
  }

  function keyFor(st) {
    if (st.kind === 'slots' || TEXT_KINDS.includes(st.kind)) return st.kind + ':main';
    return `${st.kind}:${st.design}`;
  }
  function themeFor(st, key) { return THEMES[st.theme] || THEMES[DEFAULT_THEME[key]] || THEMES[Object.keys(THEMES)[0]]; }
  const isVideo = m => !!m && typeof m.videoWidth === 'number';

  // video: the fixed layers are cached per canvas and rebuilt only when the design changes
  const layerCache = new WeakMap();
  function layers(canvas, st, key, T, tpl, f, size) {
    const sig = JSON.stringify([key, st.caption, T.bg, st.logoPos, st.dest, f]);
    let L = layerCache.get(canvas);
    if (L && L.sig === sig) return L;
    const mk = () => { const c = document.createElement('canvas'); c.width = size.w; c.height = size.h; c.setAttribute('dir', 'rtl'); const x = c.getContext('2d'); try { x.direction = 'rtl'; } catch (e) { /* ok */ } return [c, x]; };
    const [under, uctx] = mk(), [over, octx] = mk();
    tpl.under(uctx, st, T, f);
    if (tpl.over) tpl.over(octx, st, T, f);
    L = { sig, under, over };
    layerCache.set(canvas, L);
    return L;
  }

  function render(canvas, st) {
    const size = sizeOf(st);
    if (canvas.width !== size.w) canvas.width = size.w;
    if (canvas.height !== size.h) canvas.height = size.h;
    canvas.setAttribute('dir', 'rtl');
    const ctx = canvas.getContext('2d');
    try { ctx.direction = 'rtl'; } catch (e) { /* older browsers: canvas dir attribute is enough */ }
    const key = keyFor(st), T = themeFor(st, key), tpl = TEMPLATES[key];
    st = Object.assign({}, st, { logoPos: st.logoPos || DEFAULT_LOGO_POS[key] || 'bottom' });
    const f = tpl.frame(st);
    let off = { x: 0, y: 0, mx: 0, my: 0 };
    if (isVideo(st.photo)) {
      const L = layers(canvas, st, key, T, tpl, f, size);
      ctx.drawImage(L.under, 0, 0);
      if (f) off = photoIn(ctx, st, f, T);
      ctx.drawImage(L.over, 0, 0);
    } else {
      ctx.clearRect(0, 0, size.w, size.h);
      tpl.under(ctx, st, T, f);
      if (f) off = photoIn(ctx, st, f, T);
      if (tpl.over) tpl.over(ctx, st, T, f);
    }
    if (st.kind === 'video' && st.endAlpha > 0) endCard(ctx, st, T, st.endAlpha);
    return { photoRect: f, offset: off };
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

  window.STUDIO = { COL, SIZES, TEXT_KINDS, THEMES, DEFAULT_THEME, DEFAULT_LOGO_POS, SAFE, CTA, ready, render, loadPhoto };
})();
