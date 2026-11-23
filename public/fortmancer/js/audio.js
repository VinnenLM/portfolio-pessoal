'use strict';
/* ============================================================
   FORTMANCER — áudio procedural (WebAudio): música chiptune + efeitos
   ============================================================ */
const Snd = (() => {
  let ctx = null, master, musicG, sfxG, noiseBuf;
  const vol = { music: .6, sfx: .8 };
  const last = {};
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = .9; master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.connect(master);
    musicG = ctx.createGain(); sfxG = ctx.createGain();
    musicG.connect(comp); sfxG.connect(comp);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    setVolumes(vol.music, vol.sfx);
  }
  function suspend() { if (ctx && ctx.state === 'running') ctx.suspend().catch(() => { }); }
  function resume() { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function setVolumes(m, s) {
    vol.music = m; vol.sfx = s;
    if (!ctx) return;
    musicG.gain.setTargetAtTime(m * .5, ctx.currentTime, .05);
    sfxG.gain.setTargetAtTime(s * .8, ctx.currentTime, .05);
  }

  /* ---------- síntese básica ---------- */
  function tone(o) {
    if (!ctx) return;
    const t0 = ctx.currentTime + (o.d || 0), dur = o.t || .1;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + dur);
    const v = (o.v == null ? .25 : o.v);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + .005);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    osc.connect(g); g.connect(o.dest || sfxG);
    osc.start(t0); osc.stop(t0 + dur + .02);
  }
  function noise(o) {
    if (!ctx) return;
    const t0 = ctx.currentTime + (o.d || 0), dur = o.t || .1;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = o.ft || 'bandpass'; f.frequency.setValueAtTime(o.f || 1500, t0);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain(); g.gain.setValueAtTime(o.v || .3, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(o.dest || sfxG);
    src.start(t0, Math.random() * .5); src.stop(t0 + dur + .02);
  }
  const gate = (name, ms) => { const n = performance.now(); if (last[name] && n - last[name] < ms) return false; last[name] = n; return true; };

  const sfx = {
    click() { tone({ f: 660, f2: 880, t: .05, v: .15 }); },
    back()  { tone({ f: 520, f2: 330, t: .07, v: .15 }); },
    buy()   { tone({ f: 660, t: .06, v: .18 }); tone({ f: 880, t: .06, d: .06, v: .18 }); tone({ f: 1320, t: .12, d: .12, v: .16 }); },
    nope()  { tone({ f: 160, f2: 110, t: .15, type: 'sawtooth', v: .15 }); },
    shoot() { if (!gate('shoot', 45)) return; tone({ f: 900 + Math.random() * 200, f2: 300, t: .09, type: 'square', v: .09 }); },
    petshot() { if (!gate('pet', 90)) return; tone({ f: 1400, f2: 700, t: .06, type: 'triangle', v: .07 }); },
    fire()  { noise({ f: 700, f2: 200, t: .3, v: .3, q: .7 }); tone({ f: 220, f2: 70, t: .28, type: 'sawtooth', v: .13 }); },
    boom()  { if (!gate('boom', 60)) return; noise({ f: 500, f2: 90, t: .35, v: .42, q: .5 }); tone({ f: 120, f2: 40, t: .3, type: 'sine', v: .35 }); },
    ice()   { for (let i = 0; i < 5; i++) tone({ f: 1200 + i * 280, f2: 1800 + i * 300, t: .22, d: i * .03, type: 'triangle', v: .09 }); noise({ f: 6000, ft: 'highpass', t: .25, v: .12 }); },
    bolt()  { noise({ f: 3500, f2: 500, t: .22, v: .35, q: 2 }); tone({ f: 1500, f2: 100, t: .18, type: 'sawtooth', v: .12 }); },
    meteor(){ noise({ f: 300, f2: 60, t: .7, v: .4, q: .4 }); tone({ f: 90, f2: 30, t: .6, type: 'sine', v: .4 }); },
    hit()   { if (!gate('hit', 35)) return; noise({ f: 1800, t: .05, v: .16, q: 1.5 }); },
    kill()  { if (!gate('kill', 40)) return; tone({ f: 500, f2: 150, t: .1, type: 'square', v: .12 }); },
    coin()  { if (!gate('coin', 50)) return; tone({ f: 1318, t: .05, v: .1 }); tone({ f: 1760, t: .09, d: .05, v: .1 }); },
    castle(){ if (!gate('castle', 80)) return; noise({ f: 200, f2: 80, t: .22, v: .4, q: .5 }); tone({ f: 90, f2: 50, t: .2, type: 'sine', v: .35 }); },
    barrier(){ if (!gate('barrier', 80)) return; tone({ f: 700, f2: 500, t: .12, type: 'triangle', v: .15 }); },
    wave()  { [0, 7, 12].forEach((s, i) => tone({ f: mtof(57 + s), t: .35, d: i * .12, type: 'sawtooth', v: .12 })); },
    boss()  { tone({ f: 110, f2: 55, t: 1.1, type: 'sawtooth', v: .3 }); tone({ f: 116, f2: 58, t: 1.1, type: 'sawtooth', v: .25 }); noise({ f: 200, f2: 60, t: 1.0, v: .3 }); },
    card()  { [0, 4, 7, 12].forEach((s, i) => tone({ f: mtof(72 + s), t: .12, d: i * .06, v: .13 })); },
    win()   { [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => tone({ f: mtof(64 + s), t: .22, d: i * .13, type: 'square', v: .16 })); },
    lose()  { [0, -2, -4, -7, -12].forEach((s, i) => tone({ f: mtof(57 + s), t: .4, d: i * .22, type: 'triangle', v: .22 })); },
    summon(){ tone({ f: 200, f2: 400, t: .3, type: 'sawtooth', v: .12 }); },
    poison(){ for (let i = 0; i < 4; i++) tone({ f: 300 + i * 90, f2: 700 + i * 120, t: .12, d: i * .07, type: 'sine', v: .12 }); noise({ f: 900, f2: 300, t: .35, v: .12, q: .6 }); },
    roots() { noise({ f: 250, f2: 120, t: .4, v: .3, q: .8 }); tone({ f: 110, f2: 70, t: .35, type: 'sawtooth', v: .13 }); tone({ f: 330, f2: 200, t: .15, d: .1, type: 'square', v: .06 }); },
    light() { [0, 4, 7, 12, 16].forEach((st, i) => tone({ f: mtof(72 + st), t: .5, d: i * .05, type: 'triangle', v: .12 })); noise({ f: 5000, ft: 'highpass', t: .4, v: .06 }); },
    arrow() { if (!gate('arrow', 50)) return; noise({ f: 2600, f2: 1400, t: .06, v: .12, q: 1.5 }); tone({ f: 400, f2: 250, t: .05, type: 'triangle', v: .06 }); },
    ballista() { if (!gate('ball', 80)) return; tone({ f: 130, f2: 60, t: .18, type: 'sawtooth', v: .22 }); noise({ f: 1200, f2: 300, t: .12, v: .2, q: .8 }); },
    tier()  { [0, 4, 7, 12, 16, 19].forEach((st, i) => tone({ f: mtof(60 + st), t: .3, d: i * .09, type: 'square', v: .13 })); noise({ f: 300, f2: 80, t: .5, v: .25 }); },
  };

  /* ---------- música procedural ---------- */
  const MIN = [0, 3, 5, 7, 10, 12, 15, 17];
  const THEMES = {
    menu:   { bpm: 78,  root: 57, prog: [[0, 'm'], [8, 'M'], [3, 'M'], [10, 'M']], bass: 'long',  arp: .06, lead: .08, drums: 0, seed: 7 },
    battle: { bpm: 128, root: 50, prog: [[0, 'm'], [8, 'M'], [10, 'M'], [7, 'm']], bass: 'eighth', arp: .05, lead: .08, drums: 1, seed: 19 },
    boss:   { bpm: 148, root: 46, prog: [[0, 'm'], [1, 'M'], [0, 'm'], [6, 'M']], bass: 'drive',  arp: .06, lead: .09, drums: 2, seed: 43 },
    calm:   { bpm: 92,  root: 53, prog: [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']], bass: 'long',  arp: .06, lead: .07, drums: 0, seed: 31 },
  };
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  let track = null, timer = null;
  function buildMotif(seed) {
    const R = rng(seed), bars = [];
    for (let b = 0; b < 4; b++) {
      const steps = []; let cur = 2 + Math.floor(R() * 3);
      for (let s = 0; s < 8; s++) {
        if (R() < .28) { steps.push(null); continue; }
        cur = clamp(cur + Math.floor(R() * 5) - 2, 0, MIN.length - 1);
        steps.push(MIN[cur]);
      }
      bars.push(steps);
    }
    return bars;
  }
  function play(name, variant) {
    if (!ctx) return;
    if (track && track.name === name && track.variant === (variant || 0)) return;
    stop();
    const th = THEMES[name] || THEMES.battle;
    const g = ctx.createGain(); g.gain.value = 0; g.connect(musicG);
    g.gain.setTargetAtTime(1, ctx.currentTime, .4);
    track = { name, variant: variant || 0, th, g, step: 0, next: ctx.currentTime + .1, motif: buildMotif(th.seed + (variant || 0) * 5) };
    timer = setInterval(sched, 40);
  }
  function stop() {
    if (!track) return;
    const t = track; track = null;
    t.g.gain.setTargetAtTime(0, ctx.currentTime, .15);
    setTimeout(() => { try { t.g.disconnect(); } catch (e) { } }, 900);
    clearInterval(timer); timer = null;
  }
  function sched() {
    if (!track || !ctx) return;
    const T = track, th = T.th, stepDur = 60 / th.bpm / 4;
    while (T.next < ctx.currentTime + .25) {
      const s = T.step, bar = Math.floor(s / 16) % 4, k = s % 16;
      const root = th.root + T.variant + th.prog[bar][0], minor = th.prog[bar][1] === 'm';
      const tones = minor ? [0, 3, 7] : [0, 4, 7];
      const when = T.next, d = when - ctx.currentTime;
      const N = (f, dur, type, v, dest) => tone({ f, t: dur, type, v, d: Math.max(0, d), dest: T.g });
      // baixo
      if (th.bass === 'long') { if (k === 0) N(mtof(root - 12), stepDur * 14, 'triangle', .22); if (k === 8) N(mtof(root - 12 + tones[2]), stepDur * 6, 'triangle', .12); }
      else if (th.bass === 'eighth') { if (k % 2 === 0) N(mtof(root - 12 + (k % 8 === 6 ? 7 : 0)), stepDur * 1.7, 'triangle', .24); }
      else { if (k % 2 === 0) N(mtof(root - 12 + (k % 4 === 2 ? 12 : 0)), stepDur * 1.6, 'sawtooth', .1); if (k === 0 || k === 6 || k === 10) N(mtof(root - 24), stepDur * 2, 'triangle', .22); }
      // arpejo
      if (k % 2 === 0 && th.arp) { const a = [0, 1, 2, 1, 0, 2, 1, 2][(k / 2) % 8]; N(mtof(root + 12 + tones[a]), stepDur * 1.5, 'square', th.arp); }
      // melodia
      if (th.lead && k % 2 === 0) {
        const m = T.motif[bar][k / 2];
        if (m != null) N(mtof(root + 12 + m), stepDur * 2.2, 'square', th.lead);
      }
      // bateria
      if (th.drums) {
        const dd = Math.max(0, d);
        if (k % 8 === 0 || (th.drums === 2 && (k === 6 || k === 14))) { tone({ f: 140, f2: 45, t: .12, type: 'sine', v: .4, d: dd, dest: T.g }); }
        if (k % 8 === 4) noise({ f: 1800, t: .1, v: .22, q: .8, d: dd, dest: T.g });
        if (k % 2 === 0 && th.drums === 2 || k % 4 === 2) noise({ f: 8000, ft: 'highpass', t: .03, v: .08, d: dd, dest: T.g });
      }
      T.next += stepDur; T.step++;
    }
  }
  return { init, resume, suspend, setVolumes, sfx, play, stop, get ctx() { return ctx; } };
})();
