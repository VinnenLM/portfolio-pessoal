/* Pugzzle - áudio: música calma gerada com Web Audio, efeitos e voz (SpeechSynthesis pt-BR) */
(function (root) {
  'use strict';

  let ctx = null, voiceBus, master, musicBus, sfxBus, timer = null, nextBar = 0, barIdx = 0;
  const opts = { music: true, sfx: true, voice: true };
  const BPM = 64, BEAT = 60 / BPM, BAR = BEAT * 4;
  const CHORDS = [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]]; // C, Am, F, G
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
  const base = 130.81; // C3
  const hz = (semi, mult) => base * (mult || 1) * Math.pow(2, semi / 12);

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.85; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.0001;
    const delay = ctx.createDelay(1.5); delay.delayTime.value = BEAT * 0.75;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700;
    musicBus.connect(master); musicBus.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.7; sfxBus.connect(master);
    setMusic(opts.music);
    voiceBus = ctx.createGain(); voiceBus.gain.value = 1.15; voiceBus.connect(master);
    loadVoices();
  }

  function tone(freq, t, dur, o) {
    o = o || {};
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t + dur);
    const peak = o.gain || 0.1, att = o.attack || 0.015, rel = o.release || 0.25;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
    osc.connect(g); g.connect(o.bus || sfxBus);
    osc.start(t); osc.stop(t + dur + rel + 0.05);
  }

  function scheduleBar(t) {
    const chord = CHORDS[barIdx % CHORDS.length];
    for (const s of chord) {
      tone(hz(s), t, BAR * 0.95, { type: 'triangle', gain: 0.035, attack: 1.0, release: 1.3, bus: musicBus });
      tone(hz(s, 2), t, BAR * 0.9, { type: 'sine', gain: 0.02, attack: 1.2, release: 1.3, bus: musicBus });
    }
    for (let k = 0; k < 8; k++) {
      if (Math.random() < 0.5) {
        const note = PENTA[Math.floor(Math.random() * PENTA.length)];
        tone(hz(note, 4), t + k * BEAT / 2, 0.3, { type: 'sine', gain: 0.045, attack: 0.01, release: 0.9, bus: musicBus });
      }
    }
    barIdx++;
  }

  function pump() {
    if (!ctx) return;
    while (nextBar < ctx.currentTime + 2) { scheduleBar(nextBar); nextBar += BAR; }
  }

  function setMusic(on) {
    opts.music = on;
    if (!ctx) return;
    const now = ctx.currentTime;
    if (on) {
      musicBus.gain.cancelScheduledValues(now);
      musicBus.gain.setTargetAtTime(0.55, now, 0.4);
      if (!timer) { nextBar = Math.max(nextBar, now + 0.1); pump(); timer = setInterval(pump, 600); }
    } else {
      musicBus.gain.cancelScheduledValues(now);
      musicBus.gain.setTargetAtTime(0.0001, now, 0.12);
      if (timer) { clearInterval(timer); timer = null; }
      nextBar = 0;
    }
  }

  const SFX = {
    place(t) { tone(660, t, 0.08, { type: 'triangle', gain: 0.18 }); tone(990, t + 0.07, 0.12, { type: 'triangle', gain: 0.16 }); },
    mark(t) { tone(420, t, 0.05, { type: 'sine', gain: 0.12, release: 0.08 }); },
    error(t) { tone(190, t, 0.22, { type: 'sawtooth', gain: 0.09, slideTo: 90, release: 0.12 }); },
    bonus(t) { [880, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.07, 0.1, { type: 'sine', gain: 0.12 })); },
    life(t) { [523, 659, 784].forEach((f, i) => tone(f, t + i * 0.08, 0.14, { type: 'triangle', gain: 0.14 })); },
    win(t) { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.12, 0.25, { type: 'triangle', gain: 0.16, release: 0.5 })); },
    lose(t) { [392, 330, 262].forEach((f, i) => tone(f, t + i * 0.2, 0.3, { type: 'triangle', gain: 0.13, release: 0.4 })); },
    bark(t) {
      [0, 0.21].forEach((d, k) => {
        const f0 = k ? 640 : 720;
        tone(f0, t + d, 0.1, { type: 'sawtooth', gain: 0.16, slideTo: 300, release: 0.06, attack: 0.008 });
        tone(f0 * 0.5, t + d, 0.1, { type: 'square', gain: 0.07, slideTo: 150, release: 0.05, attack: 0.008 });
        const len = Math.floor(ctx.sampleRate * 0.06), buf = ctx.createBuffer(1, len, ctx.sampleRate), ch = buf.getChannelData(0);
        for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
        bp.type = 'bandpass'; bp.frequency.value = 1400; g.gain.value = 0.12;
        src.buffer = buf; src.connect(bp); bp.connect(g); g.connect(sfxBus); src.start(t + d);
      });
    },
    buy(t) { [784, 988, 1319].forEach((f, i) => tone(f, t + i * 0.06, 0.1, { type: 'square', gain: 0.05 })); },
  };

  function sfx(name) {
    if (!ctx || !opts.sfx || !SFX[name]) return;
    if (ctx.state === 'suspended') ctx.resume();
    SFX[name](ctx.currentTime + 0.01);
  }

  const VOZ = ['01-bom', '02-otimo', '03-muito-bem', '04-excelente', '05-incrivel', '06-fantastico', '07-sensacional', '08-epico', '09-perfeito', '10-lendario'];
  const clips = {};
  let curClip = null;
  function preload() {
    if (typeof Audio === 'undefined') return;
    VOZ.forEach((n, i) => { try { const a = new Audio('assets/voz/' + n + '.mp3'); a.preload = 'auto'; clips[i] = a; } catch (e) { /* ignore */ } });
  }
  // Vozes decodificadas no Web Audio: tocam na hora, mesmo em acertos rápidos (o <audio> falhava no Android)
  const bufs = {};
  let curSrc = null;
  function loadVoices() {
    if (!ctx || typeof fetch === 'undefined') return;
    VOZ.forEach((n, i) => {
      if (bufs[i]) return;
      fetch('assets/voz/' + n + '.mp3').then((r) => r.arrayBuffer())
        .then((ab) => new Promise((ok, no) => ctx.decodeAudioData(ab, ok, no)))
        .then((b) => { bufs[i] = b; }).catch(() => { /* usa o <audio> como reserva */ });
    });
  }
  function playBuf(i) {
    if (curSrc) { try { curSrc.g.gain.cancelScheduledValues(ctx.currentTime); curSrc.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.015); curSrc.s.stop(ctx.currentTime + 0.08); } catch (e) { /* ignore */ } }
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = bufs[i]; s.connect(g); g.connect(voiceBus); g.gain.value = 1;
    s.start(ctx.currentTime + 0.02); curSrc = { s, g };
    s.onended = () => { if (curSrc && curSrc.s === s) curSrc = null; };
  }
  function say(text, idx) {
    if (!opts.voice) return;
    if (idx != null && ctx && bufs[idx]) {
      if (ctx.state === 'suspended') ctx.resume();
      try { playBuf(idx); return; } catch (e) { /* tenta o <audio> */ }
    }
    const a = idx != null ? clips[idx] : null;
    if (a) {
      try {
        if (curClip) { curClip.pause(); curClip.currentTime = 0; }
        a.currentTime = 0; a.volume = 1; curClip = a;
        const pr = a.play(); if (pr && pr.catch) pr.catch(() => speak(text));
        return;
      } catch (e) { /* cai na voz sintética */ }
    }
    speak(text);
  }
  function speak(text) {
    const ss = root.speechSynthesis;
    if (!opts.voice || !ss || typeof SpeechSynthesisUtterance === 'undefined') return;
    try {
      ss.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'pt-BR'; u.rate = 1.05; u.pitch = 1.25; u.volume = 1;
      const v = (ss.getVoices() || []).find((x) => /pt[-_]BR/i.test(x.lang));
      if (v) u.voice = v;
      ss.speak(u);
    } catch (e) { /* sem voz disponível */ }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend(); else ctx.resume();
    });
  }

  root.PugAudio = {
    init, preload, sfx, say, setMusic,
    setSfx(v) { opts.sfx = v; },
    setVoice(v) { opts.voice = v; if (!v) { if (root.speechSynthesis) root.speechSynthesis.cancel(); if (curClip) curClip.pause(); if (curSrc) { try { curSrc.s.stop(); } catch (e) { /* ignore */ } curSrc = null; } } },
    configure(s) { opts.music = !!s.music; opts.sfx = !!s.sfx; opts.voice = !!s.voice; },
  };
})(typeof self !== 'undefined' ? self : this);
