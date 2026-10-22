/* KOY Studio — app logic. All data stays on the device (localStorage). Hebrew UI, RTL. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const KEY = 'koy-studio-v1';
  const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  // ---------- state ----------
  const DEFAULT_SCHEDULE = {
    0: { works: true, from: '', label: 'בתיאום' },
    1: { works: true, from: '16:30', label: '' },
    2: { works: true, from: '16:30', label: '' },
    3: { works: true, from: '', label: 'בתיאום' },
    4: { works: true, from: '16:30', label: '' },
    5: { works: true, from: '', label: 'מהבוקר' },
    6: { works: false, from: '', label: '' },
  };
  function fresh() {
    return { v: 1, clients: [], appts: [], overrides: {}, schedule: JSON.parse(JSON.stringify(DEFAULT_SCHEDULE)), lastBackup: null, prefs: { kind: 'story', design: { story: 'window', post: 'band' } }, dismiss: {} };
  }
  let S;
  try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || 'null') || {}); } catch (e) { S = fresh(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('לא הצלחתי לשמור. אולי הזיכרון בטלפון מלא.'); } };
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // ---------- helpers ----------
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const dm = d => `${d.getDate()}.${d.getMonth() + 1}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const startOfWeek = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - x.getDay()); return x; };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clientById = id => S.clients.find(c => c.id === id);
  const hoursText = sch => sch.from ? `מ-${sch.from}` : (sch.label || 'עובדת');

  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }

  function openSheet(html, onMount) {
    $('#sheet').innerHTML = html; $('#modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (onMount) onMount($('#sheet'));
  }
  function closeSheet() { $('#modal').classList.add('hidden'); $('#sheet').innerHTML = ''; document.body.style.overflow = ''; }
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeSheet(); });

  function confirmBox(text, yes = 'כן', no = 'ביטול') {
    return new Promise(res => {
      openSheet(`<h3>${esc(text)}</h3><div class="actions"><button class="btn danger" id="cYes">${esc(yes)}</button><button class="btn" id="cNo">${esc(no)}</button></div>`, sh => {
        sh.querySelector('#cYes').onclick = () => { closeSheet(); res(true); };
        sh.querySelector('#cNo').onclick = () => { closeSheet(); res(false); };
      });
    });
  }

  // Israeli numbers: 05X... -> 9725X...
  function waNumber(phone) {
    let d = String(phone || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.startsWith('00')) d = d.slice(2);
    if (d.startsWith('0')) d = '972' + d.slice(1);
    return d;
  }
  function waLink(phone, text) { const n = waNumber(phone); return n ? `https://wa.me/${n}${text ? '?text=' + encodeURIComponent(text) : ''}` : ''; }
  const WA_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>';

  // ---------- tabs ----------
  function showTab(name) {
    $$('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
    $$('.bottom button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
    window.scrollTo(0, 0);
    if (name === 'calendar') renderCalendar();
    if (name === 'clients') renderClients();
    if (name === 'settings') renderSettings();
    if (name === 'create') refreshClientSelect();
  }
  $$('.bottom button').forEach(b => b.onclick = () => showTab(b.dataset.tab));
  $('#btnSettings').onclick = () => showTab('settings');

  // =====================================================================
  // CREATE
  // =====================================================================
  const C = {
    kind: S.prefs.kind || 'story',
    design: Object.assign({ story: 'window', post: 'band' }, S.prefs.design),
    photo: null, x: 0, y: 0, zoom: 1, mx: 0, my: 0, pendingBias: false,
    logoPos: S.prefs.logoPos || 'bottom',
    theme: Object.assign({}, S.prefs.theme), // one color per design, e.g. { 'story:full': 'cocoa' }
    chip: '', custom: '',
    slots: ['', '', '', '', ''],
  };
  const CHIPS = ['זוהר לפני האירוע ✨', 'עוד לקוחה זוהרת 🤎', 'שיזוף בהתזה', 'לקביעת תור בהודעה'];
  const DESIGNS = { story: [['window', 'חלון'], ['full', 'מסך מלא']], post: [['band', 'פס תחתון'], ['window', 'חלון']] };
  const preview = $('#preview');
  let lastLayout = null;

  function caption() {
    if (C.kind === 'post' && C.design.post === 'window') return '';
    return (C.custom.trim() || C.chip || '').trim();
  }
  const designKey = (kind, design) => (kind === 'slots' ? 'slots:main' : `${kind}:${design}`);
  const themeOf = (kind, design) => { const k = designKey(kind, design); return C.theme[k] || KOY.DEFAULT_THEME[k]; };
  function state() {
    return { kind: C.kind, design: C.design[C.kind], photo: C.photo, x: C.x, y: C.y, zoom: C.zoom, caption: caption(), slots: C.slots, logoPos: C.logoPos, theme: themeOf(C.kind, C.design[C.kind]) };
  }
  let raf = 0;
  function draw() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      lastLayout = KOY.render(preview, state());
      if (lastLayout && lastLayout.offset) {
        const o = lastLayout.offset;
        C.x = o.x; C.y = o.y; C.mx = o.mx || 0; C.my = o.my || 0;
        // new portrait photo: start a little higher, since faces usually sit in the top part
        if (C.pendingBias && C.photo) { C.pendingBias = false; if (C.my > 0) { C.y = C.my * 0.55; draw(); return; } }
      }
      updateSave();
    });
  }

  function renderDesigns() {
    const box = $('#designs'); box.innerHTML = '';
    if (C.kind === 'slots') return;
    for (const [id, label] of DESIGNS[C.kind]) {
      const b = document.createElement('button');
      b.className = 'design' + (C.design[C.kind] === id ? ' on' : '');
      const full = document.createElement('canvas');
      KOY.render(full, { kind: C.kind, design: id, photo: C.photo, x: C.x, y: C.y, zoom: C.zoom, caption: '', logoPos: C.logoPos, theme: themeOf(C.kind, id) });
      const mini = document.createElement('canvas');
      mini.width = 216; mini.height = Math.round(216 * full.height / full.width);
      mini.getContext('2d').drawImage(full, 0, 0, mini.width, mini.height);
      b.appendChild(mini);
      const s = document.createElement('span'); s.textContent = label; b.appendChild(s);
      b.onclick = () => { C.design[C.kind] = id; S.prefs.design = C.design; save(); renderDesigns(); renderTextCard(); updateLogoRow(); renderSwatches(); draw(); };
      box.appendChild(b);
    }
  }
  // Color choice from the approved palette; remembered separately for each design
  function renderSwatches() {
    const box = $('#swatches'); box.innerHTML = '';
    const cur = themeOf(C.kind, C.design[C.kind]);
    $('#colorHint').textContent = C.kind === 'story' && C.design.story === 'full'
      ? 'הצבע של הפס התחתון, מאחורי הלוגו. תמונה בהירה? נסי צבע כהה.'
      : 'תמונה בהירה? נסי רקע כהה, כדי שהתמונה תבלוט.';
    for (const [id, t] of Object.entries(KOY.THEMES)) {
      const b = document.createElement('button');
      b.className = 'swatch' + (id === cur ? ' on' : '');
      b.dataset.theme = id;
      b.setAttribute('aria-pressed', id === cur ? 'true' : 'false');
      const dot = document.createElement('i');
      dot.style.background = t.bg; dot.style.color = t.text; dot.textContent = 'א';
      const s = document.createElement('span'); s.textContent = t.name;
      b.append(dot, s);
      b.onclick = () => {
        C.theme[designKey(C.kind, C.design[C.kind])] = id; S.prefs.theme = C.theme; save();
        renderSwatches(); renderDesigns(); draw();
      };
      box.appendChild(b);
    }
  }
  function updateLogoRow() {
    $('#logoPosRow').classList.toggle('hidden', !(C.kind === 'story' && C.design.story === 'full'));
    $$('#logoPosSeg button').forEach(b => b.classList.toggle('on', b.dataset.pos === C.logoPos));
  }
  $$('#logoPosSeg button').forEach(b => b.onclick = () => { C.logoPos = b.dataset.pos; S.prefs.logoPos = C.logoPos; save(); updateLogoRow(); draw(); });
  function renderChips() {
    const box = $('#chips'); box.innerHTML = '';
    const all = [['', 'בלי טקסט'], ...CHIPS.map(c => [c, c])];
    for (const [val, label] of all) {
      const b = document.createElement('button');
      b.className = 'chip' + ((C.chip === val && !C.custom) ? ' on' : '');
      b.textContent = label;
      b.onclick = () => { C.chip = val; C.custom = ''; $('#customText').value = ''; renderChips(); draw(); };
      box.appendChild(b);
    }
  }
  function renderTextCard() {
    const noText = C.kind === 'post' && C.design.post === 'window';
    $('#textCard').hidden = C.kind === 'slots';
    $('#chips').classList.toggle('hidden', noText);
    $('#customText').classList.toggle('hidden', noText);
    $('#noTextNote').classList.toggle('hidden', !noText);
  }
  function renderSlotRows() {
    const box = $('#slotRows'); box.innerHTML = '';
    C.slots.forEach((v, i) => {
      const inp = document.createElement('input');
      inp.className = 'field'; inp.style.marginBottom = '8px'; inp.maxLength = 28;
      inp.placeholder = `שורה ${i + 1}`; inp.value = v;
      inp.oninput = () => { C.slots[i] = inp.value; draw(); };
      box.appendChild(inp);
    });
  }
  function setKind(k) {
    C.kind = k; S.prefs.kind = k; save();
    $$('#kindSeg button').forEach(b => b.classList.toggle('on', b.dataset.kind === k));
    const isSlots = k === 'slots';
    $('#uploadBox').hidden = isSlots || !!C.photo;
    $('#photoCard').hidden = isSlots || !C.photo;
    $('#dragHint').classList.toggle('hidden', isSlots || !C.photo);
    $('#designCard').hidden = isSlots;
    $('#slotsCard').hidden = !isSlots;
    $('#consentCard').hidden = isSlots;
    renderDesigns(); renderTextCard(); updateLogoRow(); renderSwatches(); draw();
  }
  $$('#kindSeg button').forEach(b => b.onclick = () => setKind(b.dataset.kind));

  $('#fileInput').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      C.photo = await KOY.loadPhoto(f); C.x = 0; C.y = 0; C.zoom = 1; $('#zoom').value = 1; C.pendingBias = true;
      $('#consent').checked = false; $('#clientSel').value = '';
      setKind(C.kind === 'slots' ? 'story' : C.kind);
      showDragOverlay();
      $('#previewWrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) { toast('לא הצלחתי לפתוח את התמונה. נסי תמונה אחרת.'); }
    e.target.value = '';
  });
  $('#changePhoto').onclick = () => $('#fileInput').click();
  $('#zoom').oninput = e => { C.zoom = +e.target.value; draw(); };

  // overlay hint: shown when a photo is added, hidden on first touch
  let overlayT;
  function showDragOverlay() {
    const o = $('#dragOverlay'); o.classList.remove('hidden'); o.style.opacity = '1';
    clearTimeout(overlayT); overlayT = setTimeout(hideDragOverlay, 3500);
  }
  function hideDragOverlay() { const o = $('#dragOverlay'); o.style.opacity = '0'; setTimeout(() => o.classList.add('hidden'), 400); }

  // arrow pad: tap = small step, hold = keeps moving
  const STEP = 24; let edgeToastAt = 0, holdT = null;
  function nudge(dir) {
    if (!C.photo) return;
    const bx = C.x, by = C.y;
    if (dir === 'up') C.y -= STEP; if (dir === 'down') C.y += STEP;
    if (dir === 'left') C.x -= STEP; if (dir === 'right') C.x += STEP;
    C.x = Math.max(-C.mx, Math.min(C.mx, C.x)); C.y = Math.max(-C.my, Math.min(C.my, C.y));
    if (C.x === bx && C.y === by && Date.now() - edgeToastAt > 2500) {
      edgeToastAt = Date.now();
      toast('התמונה כבר בקצה. אפשר להגדיל או להקטין אותה בסרגל "גודל"');
    }
    draw();
  }
  $$('[data-move]').forEach(b => {
    const stop = () => { clearInterval(holdT); holdT = null; };
    b.addEventListener('pointerdown', e => { e.preventDefault(); nudge(b.dataset.move); stop(); holdT = setInterval(() => nudge(b.dataset.move), 90); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop));
  });
  $('#centerBtn').onclick = () => { C.x = 0; C.y = 0; draw(); };
  $('#customText').oninput = e => { C.custom = e.target.value; renderChips(); draw(); };

  // drag + pinch on the preview
  const ptrs = new Map(); let pinch0 = null;
  preview.addEventListener('pointerdown', e => { if (!C.photo || C.kind === 'slots') return; hideDragOverlay(); preview.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y), z: C.zoom }; } });
  preview.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return;
    const prev = ptrs.get(e.pointerId); const cur = { x: e.clientX, y: e.clientY }; ptrs.set(e.pointerId, cur);
    const k = preview.width / preview.clientWidth;
    if (ptrs.size === 1) { C.x += (cur.x - prev.x) * k; C.y += (cur.y - prev.y) * k; draw(); }
    else if (ptrs.size === 2 && pinch0) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); C.zoom = Math.max(1, Math.min(3, pinch0.z * d / pinch0.d)); $('#zoom').value = C.zoom; draw(); }
  });
  const endPtr = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = null; };
  preview.addEventListener('pointerup', endPtr); preview.addEventListener('pointercancel', endPtr);

  // client + consent
  function refreshClientSelect() {
    const sel = $('#clientSel'); const cur = sel.value;
    sel.innerHTML = '<option value="">בלי לבחור לקוחה</option>' + [...S.clients].sort((a, b) => a.name.localeCompare(b.name, 'he')).map(c => `<option value="${c.id}">${esc(c.name)}${c.consent ? ' · אישרה פרסום' : ''}</option>`).join('');
    sel.value = cur && clientById(cur) ? cur : '';
  }
  $('#clientSel').onchange = () => { const c = clientById($('#clientSel').value); if (c && c.consent) { $('#consent').checked = true; toast('האישור של ' + c.name + ' שמור אצלך ✓'); } updateSave(); };
  $('#consent').onchange = () => {
    const c = clientById($('#clientSel').value);
    if (c && $('#consent').checked && !c.consent) { c.consent = true; c.consentDate = keyOf(new Date()); save(); refreshClientSelect(); $('#clientSel').value = c.id; }
    updateSave();
  };

  function updateSave() {
    const btn = $('#saveBtn'), hint = $('#saveHint');
    if (C.kind === 'slots') {
      const any = C.slots.some(s => s.trim());
      btn.disabled = !any; hint.textContent = any ? '' : 'כתבי לפחות תור פנוי אחד, או לחצי "מילוי אוטומטי מהיומן"';
      return;
    }
    if (!C.photo) { btn.disabled = true; hint.textContent = 'קודם בוחרים תמונה'; return; }
    if (!$('#consent').checked) { btn.disabled = true; hint.textContent = 'כדי לשמור, סמני שהלקוחה אישרה לפרסם'; return; }
    btn.disabled = false; hint.textContent = 'התמונה נשמרת בטלפון שלך, ומשם מעלים לאינסטגרם';
  }

  $('#fillFromCal').onclick = () => {
    const today = new Date(); const out = [];
    for (let i = 0; i < 7 && out.length < 5; i++) {
      const d = addDays(today, i); const st = dayStatus(d);
      if (st.works) out.push(`${DAYS[d.getDay()]} ${dm(d)} · ${st.text}`);
    }
    C.slots = [...out, '', '', '', '', ''].slice(0, 5);
    renderSlotRows(); draw();
    toast(out.length ? 'מילאתי לפי ימי העבודה ביומן. אפשר לערוך.' : 'אין ימי עבודה ב-7 הימים הקרובים');
  };

  // Step 1: show the finished image full screen. The file is prepared here, so the share sheet
  // opens instantly when she confirms (phones only allow sharing right after a tap).
  let finalOut = null;
  $('#saveBtn').onclick = async () => {
    if ($('#saveBtn').disabled) return;
    const out = document.createElement('canvas');
    KOY.render(out, state());
    const blob = await new Promise(r => out.toBlob(r, 'image/jpeg', 0.92));
    const now = new Date();
    const name = `KOY_${C.kind}_${keyOf(now)}_${pad(now.getHours())}${pad(now.getMinutes())}.jpg`;
    finalOut = { file: new File([blob], name, { type: 'image/jpeg' }), url: URL.createObjectURL(blob), name };
    $('#finalImg').src = finalOut.url;
    $('#finalPreview').classList.remove('hidden'); document.body.style.overflow = 'hidden';
  };
  function closeFinal() {
    $('#finalPreview').classList.add('hidden'); document.body.style.overflow = '';
    if (finalOut) { const u = finalOut.url; setTimeout(() => URL.revokeObjectURL(u), 4000); finalOut = null; }
  }
  $('#finalBack').onclick = closeFinal;
  // Step 2: save / share
  $('#finalSave').onclick = async () => {
    const f = finalOut; if (!f) return;
    try {
      if (navigator.canShare && navigator.canShare({ files: [f.file] })) {
        await navigator.share({ files: [f.file], title: 'KOY COSMETICS' });
        closeFinal(); toast('מוכן! עכשיו אפשר להעלות לאינסטגרם ✨');
        return;
      }
    } catch (err) { if (err && err.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = f.url; a.download = f.name;
    document.body.appendChild(a); a.click(); a.remove();
    closeFinal(); toast('נשמר בטלפון ✨ עכשיו אפשר להעלות לאינסטגרם');
  };

  // =====================================================================
  // CALENDAR
  // =====================================================================
  let weekStart = startOfWeek(new Date());
  function dayStatus(d) {
    const k = keyOf(d), o = S.overrides[k], sch = S.schedule[d.getDay()];
    if (o && o.off) return { works: false, text: 'לא עובדת', manual: true };
    if (o && o.on) return { works: true, text: hoursText(sch.works ? sch : { label: 'בתיאום' }), manual: true };
    return sch.works ? { works: true, text: hoursText(sch) } : { works: false, text: 'לא עובדת' };
  }
  function renderCalendar() {
    const end = addDays(weekStart, 6);
    $('#weekLabel').textContent = `${dm(weekStart)} – ${dm(end)}`;
    const todayK = keyOf(new Date()); const box = $('#days'); box.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i), k = keyOf(d), st = dayStatus(d);
      const appts = S.appts.filter(a => a.date === k).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      const el = document.createElement('div');
      el.className = 'day' + (k === todayK ? ' today' : '') + (st.works ? '' : ' off');
      el.innerHTML = `<div class="dayHead"><div><span class="dayName">${DAYS[d.getDay()]}</span><span class="dayDate">${dm(d)}</span></div>
        <button class="status" data-k="${k}" aria-label="שינוי יום עבודה">${st.works ? 'עובדת · ' + esc(st.text) : 'לא עובדת'}</button></div>
        <div class="appts">${appts.map(a => { const c = clientById(a.clientId) || { name: a.name || 'לקוחה' };
          return `<div class="appt" data-id="${a.id}"><span class="t">${esc(a.time || '')}</span><span class="n">${esc(c.name)}<br><span class="pl">${a.place === 'home' ? 'בבית הלקוחה' : 'אצלי'}${a.note ? ' · ' + esc(a.note) : ''}</span></span>${c.phone ? `<button class="wa" data-wa="${a.id}" aria-label="תזכורת בוואטסאפ">${WA_ICON}</button>` : ''}</div>`; }).join('')}</div>
        <button class="btn ghost small addAppt" data-add="${k}">+ תור</button>`;
      box.appendChild(el);
    }
    box.querySelectorAll('.status').forEach(b => b.onclick = () => toggleDay(b.dataset.k));
    box.querySelectorAll('[data-add]').forEach(b => b.onclick = () => apptForm(null, b.dataset.add));
    box.querySelectorAll('.appt').forEach(r => r.onclick = e => { if (e.target.closest('.wa')) return; apptForm(S.appts.find(a => a.id === r.dataset.id)); });
    box.querySelectorAll('[data-wa]').forEach(b => b.onclick = e => { e.stopPropagation(); sendReminder(S.appts.find(a => a.id === b.dataset.wa)); });
  }
  function toggleDay(k) {
    const d = parseKey(k), sch = S.schedule[d.getDay()], o = S.overrides[k];
    if (o) delete S.overrides[k];
    else S.overrides[k] = sch.works ? { off: true } : { on: true };
    save(); renderCalendar();
    toast(dayStatus(d).works ? 'סימנתי: עובדת ביום הזה' : 'סימנתי: חופש ביום הזה');
  }
  $('#prevWeek').onclick = () => { weekStart = addDays(weekStart, -7); renderCalendar(); };
  $('#nextWeek').onclick = () => { weekStart = addDays(weekStart, 7); renderCalendar(); };
  $('#todayBtn').onclick = () => { weekStart = startOfWeek(new Date()); renderCalendar(); };

  function sendReminder(a) {
    const c = clientById(a.clientId); if (!c || !c.phone) return toast('אין מספר טלפון ללקוחה');
    const d = parseKey(a.date), first = c.name.split(' ')[0];
    const text = `היי ${first} 🤎\nתזכורת לתור שלך ביום ${DAYS[d.getDay()]} ${dm(d)}${a.time ? ' בשעה ' + a.time : ''}${a.place === 'home' ? ' (אצלך בבית)' : ''}.\nנתראה! קרן · KOY COSMETICS`;
    window.open(waLink(c.phone, text), '_blank');
  }

  function apptForm(a, dateKey) {
    const isNew = !a; a = a || { id: uid(), date: dateKey, time: '', place: 'studio', note: '', clientId: '' };
    const c = clientById(a.clientId);
    const sch = S.schedule[parseKey(a.date).getDay()];
    const defTime = a.time || sch.from || '18:00';
    openSheet(`<h3>${isNew ? 'תור חדש' : 'עריכת תור'} · ${DAYS[parseKey(a.date).getDay()]} ${dm(parseKey(a.date))}</h3>
      <label class="f">שם הלקוחה</label><input class="field" id="aName" list="clientNames" value="${esc(c ? c.name : '')}" placeholder="שם">
      <datalist id="clientNames">${S.clients.map(x => `<option value="${esc(x.name)}">`).join('')}</datalist>
      <label class="f">טלפון</label><input class="field" id="aPhone" type="tel" inputmode="tel" value="${esc(c ? c.phone : '')}" placeholder="050-0000000">
      <label class="f">שעה</label><input class="field" id="aTime" type="time" value="${esc(defTime)}">
      <label class="f">איפה</label><div class="seg small" id="aPlace"><button data-p="studio" class="${a.place !== 'home' ? 'on' : ''}">אצלי</button><button data-p="home" class="${a.place === 'home' ? 'on' : ''}">בבית הלקוחה</button></div>
      <label class="f">הערה <span class="opt">(לא חובה)</span></label><input class="field" id="aNote" value="${esc(a.note)}" placeholder="למשל: לפני חתונה">
      <div class="actions"><button class="btn primary" id="aSave">שמירה</button>${isNew ? '' : '<button class="btn danger" id="aDel">מחיקה</button>'}<button class="btn ghost" id="aCancel">ביטול</button></div>`, sh => {
      let place = a.place;
      sh.querySelectorAll('#aPlace button').forEach(b => b.onclick = () => { place = b.dataset.p; sh.querySelectorAll('#aPlace button').forEach(x => x.classList.toggle('on', x === b)); });
      sh.querySelector('#aName').oninput = e => { const m = S.clients.find(x => x.name === e.target.value.trim()); if (m && m.phone) sh.querySelector('#aPhone').value = m.phone; };
      sh.querySelector('#aCancel').onclick = closeSheet;
      sh.querySelector('#aSave').onclick = () => {
        const name = sh.querySelector('#aName').value.trim(); const phone = sh.querySelector('#aPhone').value.trim();
        if (!name) return toast('כתבי את שם הלקוחה');
        let cl = S.clients.find(x => x.name === name);
        if (!cl) { cl = { id: uid(), name, phone, notes: '', consent: false, created: keyOf(new Date()) }; S.clients.push(cl); }
        else if (phone && !cl.phone) cl.phone = phone;
        Object.assign(a, { clientId: cl.id, time: sh.querySelector('#aTime').value, place, note: sh.querySelector('#aNote').value.trim() });
        if (isNew) S.appts.push(a);
        save(); closeSheet(); renderCalendar(); toast('התור נשמר ✓');
      };
      const del = sh.querySelector('#aDel');
      if (del) del.onclick = async () => { closeSheet(); if (await confirmBox('למחוק את התור?', 'מחיקה')) { S.appts = S.appts.filter(x => x.id !== a.id); save(); renderCalendar(); toast('התור נמחק'); } };
    });
  }

  // =====================================================================
  // CLIENTS
  // =====================================================================
  function lastVisit(c) {
    const todayK = keyOf(new Date());
    const past = S.appts.filter(a => a.clientId === c.id && a.date <= todayK).map(a => a.date).sort();
    const next = S.appts.filter(a => a.clientId === c.id && a.date > todayK).map(a => a.date).sort();
    return { last: past[past.length - 1], next: next[0] };
  }
  function renderClients() {
    const q = $('#clientSearch').value.trim();
    const list = [...S.clients].filter(c => !q || c.name.includes(q) || (c.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§')).sort((a, b) => a.name.localeCompare(b.name, 'he'));
    const box = $('#clientList');
    if (!S.clients.length) { box.innerHTML = '<div class="empty">עוד אין לקוחות.<br>לחצי על "+ לקוחה", או הוסיפי תור ביומן והלקוחה תישמר כאן לבד.</div>'; return; }
    if (!list.length) { box.innerHTML = '<div class="empty">לא נמצאו לקוחות</div>'; return; }
    box.innerHTML = list.map(c => { const v = lastVisit(c);
      return `<div class="client" data-id="${c.id}"><div class="avatar">${esc(c.name.trim().charAt(0))}</div><div class="info"><div class="nm">${esc(c.name)}</div><div class="meta">${esc(c.phone || 'אין טלפון')}${v.next ? ' · תור הבא ' + dm(parseKey(v.next)) : v.last ? ' · ביקור אחרון ' + dm(parseKey(v.last)) : ''}</div></div><span class="badge ${c.consent ? 'yes' : 'no'}">${c.consent ? 'מאשרת פרסום' : 'בלי אישור פרסום'}</span></div>`; }).join('');
    box.querySelectorAll('.client').forEach(el => el.onclick = () => clientForm(clientById(el.dataset.id)));
  }
  $('#clientSearch').oninput = renderClients;
  $('#addClient').onclick = () => clientForm(null);

  function clientForm(c) {
    const isNew = !c; c = c || { id: uid(), name: '', phone: '', notes: '', consent: false, created: keyOf(new Date()) };
    const hist = S.appts.filter(a => a.clientId === c.id).sort((a, b) => b.date.localeCompare(a.date));
    openSheet(`<h3>${isNew ? 'לקוחה חדשה' : esc(c.name)}</h3>
      <label class="f">שם</label><input class="field" id="cName" value="${esc(c.name)}" placeholder="שם הלקוחה">
      <label class="f">טלפון</label><input class="field" id="cPhone" type="tel" inputmode="tel" value="${esc(c.phone)}" placeholder="050-0000000">
      <label class="f">הערות <span class="opt">(גוון מועדף, אירוע, רגישויות)</span></label><textarea class="field" id="cNotes">${esc(c.notes)}</textarea>
      <label class="check"><input type="checkbox" id="cConsent" ${c.consent ? 'checked' : ''}><span>מאשרת לפרסם תמונות שלה${c.consentDate ? ' (מ-' + dm(parseKey(c.consentDate)) + ')' : ''}</span></label>
      ${!isNew && c.phone ? `<div class="actions"><a class="btn" href="${waLink(c.phone, '')}" target="_blank" rel="noopener">${WA_ICON} וואטסאפ</a><a class="btn" href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}">חיוג</a></div>` : ''}
      ${hist.length ? `<label class="f">תורים</label><div class="hist">${hist.map(a => `<div>${DAYS[parseKey(a.date).getDay()]} ${dm(parseKey(a.date))}${a.time ? ' · ' + esc(a.time) : ''}${a.place === 'home' ? ' · בבית' : ''}${a.note ? ' · ' + esc(a.note) : ''}</div>`).join('')}</div>` : ''}
      <div class="actions"><button class="btn primary" id="cSave">שמירה</button>${isNew ? '' : '<button class="btn danger" id="cDel">מחיקה</button>'}<button class="btn ghost" id="cCancel">ביטול</button></div>`, sh => {
      sh.querySelector('#cCancel').onclick = closeSheet;
      sh.querySelector('#cSave').onclick = () => {
        const name = sh.querySelector('#cName').value.trim(); if (!name) return toast('כתבי שם');
        const consent = sh.querySelector('#cConsent').checked;
        if (consent && !c.consent) c.consentDate = keyOf(new Date());
        Object.assign(c, { name, phone: sh.querySelector('#cPhone').value.trim(), notes: sh.querySelector('#cNotes').value.trim(), consent });
        if (isNew) S.clients.push(c);
        save(); closeSheet(); renderClients(); refreshClientSelect(); toast('נשמר ✓');
      };
      const del = sh.querySelector('#cDel');
      if (del) del.onclick = async () => { closeSheet(); if (await confirmBox(`למחוק את ${c.name} ואת התורים שלה?`, 'מחיקה')) { S.clients = S.clients.filter(x => x.id !== c.id); S.appts = S.appts.filter(a => a.clientId !== c.id); save(); renderClients(); refreshClientSelect(); toast('נמחק'); } };
    });
  }

  // =====================================================================
  // SETTINGS
  // =====================================================================
  function renderSettings() {
    const box = $('#schedRows'); box.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const s = S.schedule[i];
      const row = document.createElement('div'); row.className = 'sched';
      row.innerHTML = `<input type="checkbox" ${s.works ? 'checked' : ''} aria-label="עובדת ביום ${DAYS[i]}"><span class="dn">${DAYS[i]}</span>
        <input class="field from" type="time" value="${esc(s.from)}" aria-label="משעה" ${s.works ? '' : 'disabled'}>
        <input class="field label" value="${esc(s.label)}" placeholder="או: בתיאום" maxlength="14" ${s.works ? '' : 'disabled'}>`;
      const [cb, from, label] = row.querySelectorAll('input');
      cb.onchange = () => { s.works = cb.checked; from.disabled = label.disabled = !cb.checked; save(); };
      from.onchange = () => { s.from = from.value; save(); };
      label.oninput = () => { s.label = label.value; save(); };
      box.appendChild(row);
    }
    $('#lastBackup').textContent = S.lastBackup ? `גיבוי אחרון: ${dm(parseKey(S.lastBackup))}` : 'עוד לא נשמר גיבוי';
    renderInstall();
  }

  $('#exportBtn').onclick = async () => {
    const data = JSON.stringify(Object.assign({}, S, { exported: new Date().toISOString(), app: 'KOY Studio' }), null, 1);
    const name = `KOY-backup-${keyOf(new Date())}.json`;
    const file = new File([data], name, { type: 'application/json' });
    S.lastBackup = keyOf(new Date()); save(); renderSettings();
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'גיבוי KOY Studio' }); toast('הגיבוי מוכן ✓'); return; } } catch (err) { if (err && err.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    toast('הגיבוי נשמר ✓');
  };
  $('#importInput').onchange = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!d || !Array.isArray(d.clients) || !Array.isArray(d.appts)) throw new Error('bad');
      if (!(await confirmBox(`לשחזר גיבוי עם ${d.clients.length} לקוחות ו-${d.appts.length} תורים? זה יחליף את מה שיש עכשיו.`, 'שחזור'))) return;
      S = Object.assign(fresh(), d); delete S.exported; delete S.app; save();
      renderSettings(); refreshClientSelect(); toast('הגיבוי שוחזר ✓');
    } catch (err) { toast('הקובץ הזה לא נראה כמו גיבוי של KOY Studio'); }
  };
  $('#wipeBtn').onclick = async () => {
    if (!(await confirmBox('למחוק את כל הלקוחות והיומן מהטלפון?', 'כן, למחוק'))) return;
    if (!(await confirmBox('בטוח? אי אפשר לבטל את זה.', 'מחיקה סופית'))) return;
    S = fresh(); save(); renderSettings(); refreshClientSelect(); toast('הכול נמחק');
  };

  // ---------- install (home screen) ----------
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; renderInstall(); });
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  function installHelp() {
    if (isStandalone()) return 'האפליקציה מותקנת ✓';
    if (isIOS()) return 'באייפון: לוחצים על כפתור השיתוף (ריבוע עם חץ) בספארי, ואז "הוספה למסך הבית".';
    return 'באנדרואיד: לוחצים על "התקנה במסך הבית" כאן, או בתפריט של כרום על "התקנת אפליקציה".';
  }
  function renderInstall() {
    $('#installText').textContent = installHelp();
    $('#installBtn').classList.toggle('hidden', !installEvt || isStandalone());
  }
  $('#installBtn').onclick = async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice.catch(() => {}); installEvt = null; renderInstall(); };

  // ---------- banners ----------
  function banners() {
    const ib = $('#installBanner');
    if (!isStandalone() && !(S.dismiss.install && Date.now() - S.dismiss.install < 7 * 864e5)) {
      ib.innerHTML = `<span>טיפ: כדאי להתקין את האפליקציה במסך הבית, כדי שהלקוחות והיומן יישמרו בבטחה. <b>הגדרות ← התקנה</b></span><button aria-label="סגירה">×</button>`;
      ib.classList.remove('hidden');
      ib.querySelector('button').onclick = () => { S.dismiss.install = Date.now(); save(); ib.classList.add('hidden'); };
    }
    const bb = $('#backupBanner');
    const hasData = S.clients.length || S.appts.length;
    const old = !S.lastBackup || (Date.now() - parseKey(S.lastBackup).getTime()) > 30 * 864e5;
    if (hasData && old && !(S.dismiss.backup && Date.now() - S.dismiss.backup < 7 * 864e5)) {
      bb.innerHTML = `<span>הגיע הזמן לשמור גיבוי של הלקוחות והיומן. <b>הגדרות ← גיבוי</b></span><button aria-label="סגירה">×</button>`;
      bb.classList.remove('hidden');
      bb.querySelector('button').onclick = () => { S.dismiss.backup = Date.now(); save(); bb.classList.add('hidden'); };
    }
  }

  // ---------- start ----------
  KOY.ready.then(() => {
    renderChips(); renderSlotRows(); refreshClientSelect(); setKind(C.kind); banners();
  });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    // when a new version is published, reload once so the installed app picks it up
    const hadController = !!navigator.serviceWorker.controller; let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').then(r => r.update()).catch(() => {}));
  }
  window.__koy = { S: () => S, C };   // for automated tests only
})();
