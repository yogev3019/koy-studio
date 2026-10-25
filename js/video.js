/* Studio core — video stories and reels (shared by KOY Studio and AK Studio).
   The client's video plays inside the chosen design on a canvas, and the canvas (with the video's sound)
   is recorded in real time on the phone with MediaRecorder: a 20-second video takes about 20 seconds.
   MP4 (H.264) is preferred because Instagram and the phone gallery accept it; WebM only as a last resort.
   Nothing is uploaded anywhere. */
(function () {
  'use strict';
  const MAX_SEC = 90;
  const TYPES = [
    'video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1.4D0028,mp4a.40.2', 'video/mp4;codecs=avc1.42E028,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm',
  ];

  function pickMime() {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return null;
    for (const t of TYPES) { try { if (MediaRecorder.isTypeSupported(t)) return t; } catch (e) { /* try the next */ } }
    return null;
  }
  const isVideoFile = f => /^video\//.test(f.type || '') || /\.(mp4|mov|m4v|webm|3gp)$/i.test(f.name || '');

  /* Opens a video file into a muted, looping, inline <video> (never shown; it is drawn onto canvases). */
  function loadVideo(file) {
    return new Promise((resolve, reject) => {
      const v = document.createElement('video');
      v.muted = true; v.defaultMuted = true; v.playsInline = true; v.loop = true; v.preload = 'auto';
      v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
      const url = URL.createObjectURL(file);
      let done = false;
      const t = setTimeout(() => finish(new Error('timeout')), 20000);
      function finish(err) {
        if (done) return; done = true; clearTimeout(t);
        if (err || !v.videoWidth) { URL.revokeObjectURL(url); reject(err || new Error('video')); return; }
        v._url = url; resolve(v);
      }
      ['loadeddata', 'canplay', 'playing'].forEach(ev => v.addEventListener(ev, () => { if (v.videoWidth) finish(); }));
      v.addEventListener('error', () => finish(new Error('video')));
      v.src = url;
      const p = v.play(); // iPhones only load the picture once playback starts (muted playback is allowed)
      if (p && p.catch) p.catch(() => {});
    });
  }
  function unload(v) {
    if (!v) return;
    try { v.pause(); } catch (e) { /* ok */ }
    if (v._url) URL.revokeObjectURL(v._url);
    v.removeAttribute('src'); v.load();
  }
  const limitOf = v => Math.min(isFinite(v.duration) && v.duration > 0 ? v.duration : MAX_SEC, MAX_SEC);

  // The video's sound goes only into the recording, never to the speakers.
  let actx = null;
  function audioRoute(v) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!actx) actx = new AC();
      if (actx.state !== 'running') actx.resume();
      if (!v._audioDest) {
        const src = actx.createMediaElementSource(v);
        const dest = actx.createMediaStreamDestination();
        src.connect(dest);
        v._audioDest = dest;
      }
      return v._audioDest;
    } catch (e) { return null; }
  }

  /* Records the design. Call it straight from a tap: phones only allow playback with sound from a tap.
     o = { canvas, video, draw(endAlpha), keepAudio, endSec, onProgress(0..1) }
     Returns { promise → { blob, type, ext, seconds }, cancel() }. */
  function record(o) {
    const mime = pickMime();
    const v = o.video;
    let settled = false, resolveP, rejectP;
    const promise = new Promise((res, rej) => { resolveP = res; rejectP = rej; });
    const err = code => Object.assign(new Error(code), { code });
    if (!mime) { rejectP(err('unsupported')); return { promise, cancel() {} }; }

    const stream = o.canvas.captureStream(30);
    let routed = false;
    if (o.keepAudio) {
      const dest = audioRoute(v);
      if (dest) { dest.stream.getAudioTracks().forEach(t => stream.addTrack(t)); routed = true; }
    }
    const limit = limitOf(v), endSec = o.endSec || 0, total = limit + endSec;

    // start from the beginning, inside the tap
    v.pause(); v.loop = false; v.muted = !routed; v.currentTime = 0;
    const playing = v.play();

    let rec = null, raf = 0, phase = 'seek', endStart = 0, wake = null;
    const chunks = [], t0 = performance.now();
    function startRec() {
      rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8000000, audioBitsPerSecond: 128000 });
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = onStop;
      rec.onerror = () => fail(err('recorder'));
      rec.start(1000);
    }
    function frame() {
      raf = 0;
      if (settled) return;
      if (phase === 'seek') {
        if (!v.seeking && !v.paused && v.currentTime < 0.5) { phase = 'video'; o.draw(0); startRec(); }
        else if (performance.now() - t0 > 8000) { fail(err('play')); return; }
      } else if (phase === 'video') {
        o.draw(0);
        if (o.onProgress) o.onProgress(Math.min(1, v.currentTime / total));
        if (v.ended || v.currentTime >= limit - 0.03) {
          v.pause();
          if (!endSec) { stop(); return; }
          phase = 'end'; endStart = performance.now();
        }
      }
      if (phase === 'end') {
        const t = (performance.now() - endStart) / 1000;
        o.draw(Math.min(1, t / 0.4));
        if (o.onProgress) o.onProgress(Math.min(1, (limit + t) / total));
        if (t >= endSec) { stop(); return; }
      }
      raf = requestAnimationFrame(frame);
    }
    function stop() { if (rec && rec.state !== 'inactive') rec.stop(); else onStop(); }
    function onStop() {
      if (settled) return;
      settled = true; cleanup();
      const type = mime.split(';')[0];
      const blob = new Blob(chunks, { type });
      if (!blob.size) { rejectP(err('empty')); return; }
      resolveP({ blob, type, ext: type === 'video/mp4' ? 'mp4' : 'webm', seconds: total });
    }
    function fail(e) {
      if (settled) return;
      settled = true;
      try { if (rec && rec.state !== 'inactive') { rec.onstop = null; rec.stop(); } } catch (x) { /* ok */ }
      cleanup(); rejectP(e);
    }
    function cleanup() {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      try { v.pause(); } catch (x) { /* ok */ }
      v.muted = true; v.loop = true;
      stream.getVideoTracks().forEach(t => t.stop()); // the sound route is kept for the next video
      if (wake) wake.release().catch(() => {});
    }
    // leaving the app stops the drawing, so the recording would freeze: stop and say so
    function onVis() { if (document.hidden) fail(err('hidden')); }
    document.addEventListener('visibilitychange', onVis);
    if (playing && playing.catch) playing.catch(() => fail(err('play')));
    if (navigator.wakeLock && navigator.wakeLock.request) {
      navigator.wakeLock.request('screen').then(w => { if (settled) w.release().catch(() => {}); else wake = w; }).catch(() => {});
    }
    raf = requestAnimationFrame(frame);
    return { promise, cancel: () => fail(err('cancelled')) };
  }

  window.StudioVideo = { MAX_SEC, pickMime, isVideoFile, loadVideo, unload, limitOf, record };
})();
