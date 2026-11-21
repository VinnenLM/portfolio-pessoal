/* Deadfront - efeitos sonoros sintetizados (WebAudio, sem arquivos) */
(function () {
  const DF = window.DF;
  let ac = null, master = null, noiseBuf = null;
  const last = {};
  DF.muted = false;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0.35; master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
  }
  DF.audioInit = init;

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

  const S = {
    shoot() { noise(0.07, 0.35, 5000); tone(260, 0.07, 'square', 0.12, 90); },
    shotgun() { noise(0.2, 0.7, 3500); tone(140, 0.18, 'sawtooth', 0.2, 50); },
    sniper() { noise(0.25, 0.7, 6000); tone(180, 0.3, 'sawtooth', 0.22, 40); },
    reload() { tone(900, 0.03, 'square', 0.12); tone(600, 0.04, 'square', 0.12, 0, 0.18); },
    switch() { tone(700, 0.04, 'square', 0.1); },
    hurt() { tone(170, 0.25, 'sawtooth', 0.3, 55); noise(0.12, 0.3, 1200); },
    bite() { noise(0.08, 0.25, 900); },
    die() { tone(130, 0.22, 'square', 0.14, 45); },
    bossdie() { tone(110, 1.0, 'sawtooth', 0.35, 28); noise(0.9, 0.5, 800); },
    wood() { noise(0.06, 0.4, 700); tone(120, 0.06, 'square', 0.1, 70); },
    break() { noise(0.3, 0.6, 1200); tone(90, 0.3, 'sawtooth', 0.2, 40); },
    build() { tone(320, 0.08, 'square', 0.15, 200); noise(0.08, 0.3, 900); },
    heal() { tone(520, 0.12, 'sine', 0.2); tone(780, 0.16, 'sine', 0.2, 0, 0.1); },
    pickup() { tone(620, 0.08, 'triangle', 0.22, 900); tone(900, 0.1, 'triangle', 0.2, 1200, 0.07); },
    drop() { tone(880, 0.1, 'sine', 0.12); },
    wave() { tone(90, 0.7, 'sawtooth', 0.28, 60); },
    wavedone() { tone(520, 0.12, 'triangle', 0.2); tone(660, 0.12, 'triangle', 0.2, 0, 0.12); tone(780, 0.2, 'triangle', 0.2, 0, 0.24); },
    boom() { noise(0.55, 0.9, 900); tone(70, 0.5, 'sawtooth', 0.4, 28); },
    boss() { tone(70, 1.0, 'sawtooth', 0.4, 45); noise(0.6, 0.3, 500); },
    stomp() { noise(0.35, 0.8, 500); tone(55, 0.35, 'sine', 0.5, 30); },
    roar() { tone(95, 0.5, 'sawtooth', 0.3, 160); },
    spit() { tone(520, 0.12, 'sine', 0.14, 260); },
    spike() { tone(1200, 0.05, 'square', 0.1, 600); },
    bear() { tone(300, 0.06, 'square', 0.25, 120); noise(0.1, 0.4, 2500); },
    win() { [0, 1, 2, 3].forEach((i) => tone([520, 660, 780, 1040][i], 0.25, 'triangle', 0.25, 0, i * 0.15)); },
    lose() { tone(200, 0.9, 'sawtooth', 0.3, 40); },
    click() { tone(500, 0.04, 'square', 0.08); }
  };

  DF.sfx = function (name) {
    if (DF.muted || !ac) return;
    const now = performance.now();
    if (last[name] && now - last[name] < 45) return; last[name] = now;
    if (S[name]) S[name]();
  };
})();
