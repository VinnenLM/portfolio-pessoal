/* Deadfront - efeitos sonoros e música ambiente sintetizados (WebAudio, sem arquivos) */
(function () {
  const DF = window.DF;
  let ac = null, master = null, noiseBuf = null, musicBus = null, evBus = null;
  let musicOn = false, mode = 'menu', nextEv = 0, schedTimer = 0, tension = null, tensionGain = null, droneGain = null;
  const last = {};
  DF.muted = false;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); startMusic(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.2;
      master = ac.createGain(); master.gain.value = DF.muted ? 0 : 1.0;
      master.connect(comp); comp.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      startMusic();
    } catch (e) { ac = null; }
  }
  DF.audioInit = init;
  DF.applyMute = function () { if (master) master.gain.value = DF.muted ? 0 : 1.0; };
  document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else ac.resume(); });

  function tone(f0, dur, type, vol, f1, delay) {
    if (!ac) return; const t = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, cutoff, delay) {
    if (!ac) return; const t = ac.currentTime + (delay || 0);
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff || 3000;
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }

  // ---------------------------------------------------------------- música de terror (procedural)
  function startMusic() {
    if (!ac || musicOn) return; musicOn = true;
    musicBus = ac.createGain(); musicBus.gain.value = 0.6; musicBus.connect(master);
    // eco longo (reverb barata) para os sons esporádicos
    const dl = ac.createDelay(1.5); dl.delayTime.value = 0.46;
    const fb = ac.createGain(); fb.gain.value = 0.52;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600;
    dl.connect(lp); lp.connect(fb); fb.connect(dl);
    const wet = ac.createGain(); wet.gain.value = 0.55; dl.connect(wet); wet.connect(musicBus);
    evBus = ac.createGain(); evBus.gain.value = 1; evBus.connect(musicBus); evBus.connect(dl);

    // drone grave com leve desafinação
    droneGain = ac.createGain(); droneGain.gain.value = 0.34;
    const dlp = ac.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 220; dlp.Q.value = 4;
    [55, 55.55, 82.4].forEach((f, i) => { const o = ac.createOscillator(); o.type = i === 2 ? 'triangle' : 'sawtooth'; o.frequency.value = f; const g = ac.createGain(); g.gain.value = i === 2 ? 0.3 : 0.5; o.connect(g); g.connect(dlp); o.start(); });
    dlp.connect(droneGain); droneGain.connect(musicBus);
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.06; const lg = ac.createGain(); lg.gain.value = 110; lfo.connect(lg); lg.connect(dlp.frequency); lfo.start();

    // pad dissonante (lá, si bemol, mi) com swell lento
    const padG = ac.createGain(); padG.gain.value = 0.0;
    [110, 116.54, 164.81, 220.8].forEach((f) => { const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = ac.createGain(); g.gain.value = 0.07; o.connect(g); g.connect(padG); o.start(); });
    padG.connect(musicBus);
    const lfo2 = ac.createOscillator(); lfo2.frequency.value = 0.045; const lg2 = ac.createGain(); lg2.gain.value = 0.5; lfo2.connect(lg2); lg2.connect(padG.gain);
    const off = ac.createConstantSource ? ac.createConstantSource() : null; if (off) { off.offset.value = 0.6; off.connect(padG.gain); off.start(); }
    lfo2.start();

    // tensão (só em combate/chefe): tremolo grave
    tension = ac.createOscillator(); tension.type = 'triangle'; tension.frequency.value = 41.2;
    tensionGain = ac.createGain(); tensionGain.gain.value = 0;
    const trem = ac.createOscillator(); trem.frequency.value = 2.2; const tg = ac.createGain(); tg.gain.value = 0.5; trem.connect(tg);
    const tgain2 = ac.createGain(); tgain2.gain.value = 0.5; tg.connect(tgain2.gain); tension.connect(tgain2); tgain2.connect(tensionGain); tensionGain.connect(musicBus);
    tension.start(); trem.start();

    nextEv = ac.currentTime + 3;
    schedTimer = setInterval(schedule, 400);
  }

  function evTone(f0, f1, dur, vol, type, vib) {
    const t = ac.currentTime; const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (vib) { const l = ac.createOscillator(); l.frequency.value = 5.5; const lg = ac.createGain(); lg.gain.value = f0 * 0.012; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.1); }
    o.connect(g); g.connect(evBus); o.start(t); o.stop(t + dur + 0.1);
  }
  function evNoise(dur, vol, f0, f1) {
    const t = ac.currentTime; const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 6; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(evBus); s.start(t, Math.random()); s.stop(t + dur + 0.1);
  }
  const EVENTS = [
    () => { const f = 520 + Math.random() * 380; evTone(f, f * 0.94, 3.2, 0.1, 'sine', true); },                // lamento agudo
    () => { evTone(60, 32, 0.6, 0.5, 'sine'); setTimeout(() => ac && evTone(58, 30, 0.6, 0.38, 'sine'), 260); }, // batida de coração
    () => { evNoise(1.6, 0.16, 250, 900); },                                                                    // rangido
    () => { evTone(233, 232, 4.5, 0.09, 'sine'); evTone(311, 310, 4, 0.06, 'sine'); evTone(466, 464, 3, 0.04, 'triangle'); }, // sino distante
    () => { evNoise(2.4, 0.1, 1500, 300); }                                                                     // vento
  ];
  function schedule() {
    if (!ac || ac.state !== 'running') return;
    const now = ac.currentTime;
    const boss = mode === 'boss', game = mode === 'game' || boss;
    tensionGain.gain.setTargetAtTime(boss ? 0.55 : game ? 0.14 : 0, now, 1.2);
    droneGain.gain.setTargetAtTime(boss ? 0.5 : 0.34, now, 1.5);
    if (now >= nextEv) {
      const idx = boss && Math.random() < 0.5 ? 1 : Math.floor(Math.random() * EVENTS.length);
      try { EVENTS[idx](); } catch (e) { /* ignora */ }
      nextEv = now + (boss ? 2.5 + Math.random() * 3 : game ? 5 + Math.random() * 6 : 7 + Math.random() * 8);
    }
  }
  DF.musicMode = function (m) { mode = m; };

  // ---------------------------------------------------------------- efeitos
  const S = {
    shoot() { noise(0.08, 0.5, 5200); tone(260, 0.08, 'square', 0.2, 90); },
    shotgun() { noise(0.25, 1.0, 3500); tone(140, 0.2, 'sawtooth', 0.3, 50); },
    sniper() { noise(0.3, 1.0, 6000); tone(180, 0.35, 'sawtooth', 0.32, 40); },
    reloaded() { tone(420, 0.05, 'square', 0.22); tone(840, 0.07, 'square', 0.22, 0, 0.06); },
    reload() { tone(900, 0.04, 'square', 0.2); tone(600, 0.05, 'square', 0.2, 0, 0.18); },
    switch() { tone(700, 0.05, 'square', 0.16); },
    hurt() { tone(170, 0.28, 'sawtooth', 0.45, 55); noise(0.14, 0.45, 1200); },
    bite() { noise(0.1, 0.4, 900); },
    die() { tone(130, 0.25, 'square', 0.22, 45); noise(0.1, 0.2, 700); },
    bossdie() { tone(110, 1.2, 'sawtooth', 0.5, 28); noise(1.0, 0.7, 800); },
    wood() { noise(0.07, 0.6, 700); tone(120, 0.07, 'square', 0.16, 70); },
    break() { noise(0.35, 0.9, 1200); tone(90, 0.35, 'sawtooth', 0.3, 40); },
    build() { tone(320, 0.09, 'square', 0.22, 200); noise(0.09, 0.45, 900); },
    heal() { tone(520, 0.14, 'sine', 0.3); tone(780, 0.18, 'sine', 0.3, 0, 0.1); },
    pickup() { tone(620, 0.09, 'triangle', 0.32, 900); tone(900, 0.12, 'triangle', 0.3, 1200, 0.07); },
    drop() { tone(880, 0.12, 'sine', 0.2); },
    wave() { tone(90, 0.8, 'sawtooth', 0.4, 60); },
    wavedone() { tone(520, 0.14, 'triangle', 0.3); tone(660, 0.14, 'triangle', 0.3, 0, 0.12); tone(780, 0.24, 'triangle', 0.3, 0, 0.24); },
    boom() { noise(0.6, 1.2, 900); tone(70, 0.55, 'sawtooth', 0.55, 28); },
    boss() { tone(70, 1.2, 'sawtooth', 0.55, 45); noise(0.7, 0.45, 500); },
    stomp() { noise(0.4, 1.1, 500); tone(55, 0.4, 'sine', 0.7, 30); },
    roar() { tone(95, 0.6, 'sawtooth', 0.45, 160); noise(0.4, 0.3, 700); },
    spit() { tone(520, 0.14, 'sine', 0.22, 260); },
    spike() { tone(1200, 0.06, 'square', 0.16, 600); },
    bear() { tone(300, 0.07, 'square', 0.35, 120); noise(0.12, 0.55, 2500); },
    zap() { noise(0.12, 0.3, 3500); tone(900, 0.1, 'sawtooth', 0.2, 300); },
    flame() { noise(0.12, 0.35, 1800); },
    throw() { noise(0.15, 0.25, 900); tone(300, 0.12, 'triangle', 0.2, 600); },
    holy() { noise(0.9, 0.9, 1200); [523, 659, 784, 1046].forEach((f, i) => tone(f, 1.2, 'sine', 0.35, 0, i * 0.06)); },
    drop() { [0, 1, 2].forEach((i) => tone([660, 880, 1100][i], 0.25, 'triangle', 0.3, 0, i * 0.1)); },
    rocket() { noise(0.3, 0.7, 1500); tone(200, 0.3, 'sawtooth', 0.25, 80); },
    win() { [0, 1, 2, 3].forEach((i) => tone([520, 660, 780, 1040][i], 0.3, 'triangle', 0.38, 0, i * 0.15)); },
    lose() { tone(200, 1.0, 'sawtooth', 0.45, 40); },
    click() { tone(500, 0.05, 'square', 0.14); }
  };

  DF.sfx = function (name) {
    if (DF.muted || !ac) return;
    const now = performance.now();
    if (last[name] && now - last[name] < (name === 'flame' ? 120 : 45)) return; last[name] = now;
    if (S[name]) S[name]();
  };
})();
