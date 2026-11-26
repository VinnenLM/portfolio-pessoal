/* Pugzzle - lógica pura (gerador, solver, dicas). Funciona no navegador e no Node. */
(function (root) {
  'use strict';

  const COLORS = [
    { id: 'vermelho', name: 'vermelho', hex: '#e0605a' },
    { id: 'amarelo', name: 'amarelo', hex: '#f2c94c' },
    { id: 'azul', name: 'azul', hex: '#5b8def' },
    { id: 'roxo', name: 'roxo', hex: '#9b6bd6' },
    { id: 'rosa', name: 'rosa', hex: '#f49ac2' },
    { id: 'cinza', name: 'cinza', hex: '#9aa0a6' },
    { id: 'verde', name: 'verde', hex: '#6cc070' },
    { id: 'laranja', name: 'laranja', hex: '#f2994a' },
    { id: 'marrom', name: 'marrom', hex: '#9c6b4a' },
    { id: 'bege', name: 'bege', hex: '#f6ecd9' },
  ];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rnd) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const popcount = (m) => { let c = 0; while (m) { m &= m - 1; c++; } return c; };

  /* ---------- Geração ---------- */

  // Uma pug por linha/coluna, sem se tocar (diagonal incluída).
  function randomSolution(n, rnd) {
    const cols = new Array(n).fill(-1);
    const used = new Array(n).fill(false);
    function bt(r) {
      if (r === n) return true;
      const order = shuffle([...Array(n).keys()], rnd);
      for (const c of order) {
        if (used[c]) continue;
        if (r > 0 && Math.abs(cols[r - 1] - c) <= 1) continue;
        cols[r] = c; used[c] = true;
        if (bt(r + 1)) return true;
        used[c] = false;
      }
      cols[r] = -1;
      return false;
    }
    bt(0);
    return cols;
  }

  // Cresce n regiões conexas a partir das células da solução.
  function growRegions(n, sol, rnd) {
    const g = new Int8Array(n * n).fill(-1);
    for (let r = 0; r < n; r++) g[r * n + sol[r]] = r;
    let left = n * n - n;
    while (left > 0) {
      const opts = [];
      for (let i = 0; i < n * n; i++) {
        if (g[i] !== -1) continue;
        const r = (i / n) | 0, c = i % n;
        if (r > 0 && g[i - n] >= 0) opts.push(i, g[i - n]);
        if (r < n - 1 && g[i + n] >= 0) opts.push(i, g[i + n]);
        if (c > 0 && g[i - 1] >= 0) opts.push(i, g[i - 1]);
        if (c < n - 1 && g[i + 1] >= 0) opts.push(i, g[i + 1]);
      }
      const k = Math.floor(rnd() * (opts.length / 2)) * 2;
      g[opts[k]] = opts[k + 1];
      left--;
    }
    return g;
  }

  // Conta soluções (para no limite).
  function countSolutions(g, n, limit) {
    const usedC = new Uint8Array(n), usedG = new Uint8Array(n);
    let count = 0;
    (function bt(r, prevC) {
      if (count >= limit) return;
      if (r === n) { count++; return; }
      for (let c = 0; c < n; c++) {
        if (usedC[c] || Math.abs(c - prevC) <= 1) continue;
        const reg = g[r * n + c];
        if (usedG[reg]) continue;
        usedC[c] = 1; usedG[reg] = 1;
        bt(r + 1, c);
        usedC[c] = 0; usedG[reg] = 0;
        if (count >= limit) return;
      }
    })(0, -10);
    return count;
  }

  // A região `reg` continua conexa se a célula `skip` sair dela?
  function stillConnected(g, n, reg, skip) {
    let start = -1, total = 0;
    for (let i = 0; i < n * n; i++) if (g[i] === reg && i !== skip) { total++; if (start < 0) start = i; }
    if (total === 0) return false;
    const seen = new Uint8Array(n * n); const stack = [start]; seen[start] = 1; let cnt = 1;
    while (stack.length) {
      const i = stack.pop(); const r = (i / n) | 0, c = i % n;
      const nb = [];
      if (r > 0) nb.push(i - n); if (r < n - 1) nb.push(i + n); if (c > 0) nb.push(i - 1); if (c < n - 1) nb.push(i + 1);
      for (const j of nb) if (!seen[j] && g[j] === reg && j !== skip) { seen[j] = 1; cnt++; stack.push(j); }
    }
    return cnt === total;
  }

  // Busca local: move células de fronteira (nunca a da solução) para reduzir o nº de soluções.
  function refine(g, n, sol, rnd, grp) {
    const isSol = new Uint8Array(n * n);
    for (let r = 0; r < n; r++) isSol[r * n + sol[r]] = 1;
    const CAP = 64;
    let cnt = countSolutions(g, n, CAP);
    for (let it = 0; it < 4000 && cnt > 1; it++) {
      const i = Math.floor(rnd() * n * n);
      if (isSol[i]) continue;
      const r = (i / n) | 0, c = i % n;
      const nb = [];
      if (r > 0) nb.push(i - n); if (r < n - 1) nb.push(i + n); if (c > 0) nb.push(i - 1); if (c < n - 1) nb.push(i + 1);
      const diff = nb.filter((j) => g[j] !== g[i] && (!grp || grp[j] === grp[i]));
      if (!diff.length) continue;
      const old = g[i];
      if (!stillConnected(g, n, old, i)) continue;
      g[i] = g[diff[Math.floor(rnd() * diff.length)]];
      const nc = countSolutions(g, n, CAP);
      if (nc <= cnt) cnt = nc; else g[i] = old;
    }
    return cnt;
  }


  /* ---------- Fases temáticas ---------- */
  // Cada tema devolve um grupo por quadrado (nenhuma cor atravessa dois grupos).
  // `exact`: grupo -> nº de pugs que ele deve ter (1 = o grupo inteiro vira uma única cor, formando o desenho).
  const nx = (c, n) => ((c + 0.5) / n) * 2 - 1;
  const inPoly = (x, y, pts) => {
    let ins = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
    }
    return ins;
  };
  const STAR = (() => { const a = []; for (let k = 0; k < 10; k++) { const R = k % 2 ? 0.42 : 1.0, t = -Math.PI / 2 + (k * Math.PI) / 5; a.push([R * Math.cos(t) * 0.98, R * Math.sin(t) * 0.98 + 0.05]); } return a; })();
  const shape = (f) => (r, c, n) => (f(nx(c, n), nx(r, n), n) ? 0 : 1);
  const THEMES = {
    coracao: { name: 'Coração', minN: 8, exact: { 0: 1 }, fn: shape((x, y) => { const X = x * 1.25, Y = -y * 1.25 + 0.15; return Math.pow(X * X + Y * Y - 1, 3) - X * X * Y * Y * Y <= 0; }) },
    estrela: { name: 'Estrela', minN: 8, exact: { 0: 1 }, fn: shape((x, y) => inPoly(x, y, STAR)) },
    diamante: { name: 'Diamante', minN: 7, exact: { 0: 1 }, fn: shape((x, y) => Math.abs(x) + Math.abs(y) <= 0.7) },
    bola: { name: 'Bola', minN: 7, exact: { 0: 1 }, fn: shape((x, y) => x * x + y * y <= 0.55) },
    cruz: { name: 'Cruz', minN: 7, exact: { 0: 1 }, fn: shape((x, y) => (Math.abs(x) <= 0.26 || Math.abs(y) <= 0.26) && Math.abs(x) <= 0.9 && Math.abs(y) <= 0.9) },
    xis: { name: 'X', minN: 7, exact: { 0: 1 }, fn: shape((x, y) => Math.abs(Math.abs(x) - Math.abs(y)) <= 0.27) },
    moldura: { name: 'Moldura', minN: 6, fn: (r, c, n) => (Math.min(r, c, n - 1 - r, n - 1 - c) === 0 ? 0 : 1) },
    diagonal: { name: 'Diagonal', minN: 6, fn: (r, c) => (r <= c ? 0 : 1) },
    quadrantes: { name: 'Quadrantes', minN: 6, fn: (r, c, n) => (r < n / 2 ? 0 : 2) + (c < n / 2 ? 0 : 1) },
    faixas: { name: 'Faixas', minN: 6, fn: (r, c, n) => { const d = r - c; return d < -n / 4 ? 0 : d > n / 4 ? 2 : 1; } },
  };
  const THEME_IDS = Object.keys(THEMES);

  function components(grp, n) {
    const comp = new Int16Array(n * n).fill(-1); let k = 0;
    for (let i = 0; i < n * n; i++) {
      if (comp[i] >= 0) continue;
      const st = [i]; comp[i] = k;
      while (st.length) {
        const j = st.pop(), r = (j / n) | 0, c = j % n;
        for (const q of [r > 0 ? j - n : -1, r < n - 1 ? j + n : -1, c > 0 ? j - 1 : -1, c < n - 1 ? j + 1 : -1]) {
          if (q >= 0 && comp[q] < 0 && grp[q] === grp[j]) { comp[q] = k; st.push(q); }
        }
      }
      k++;
    }
    return { comp, count: k };
  }

  function growInGroups(n, sol, rnd, grp) {
    const g = new Int8Array(n * n).fill(-1);
    for (let r = 0; r < n; r++) g[r * n + sol[r]] = r;
    let left = n * n - n;
    while (left > 0) {
      const opts = [];
      for (let i = 0; i < n * n; i++) {
        if (g[i] !== -1) continue;
        const r = (i / n) | 0, c = i % n;
        for (const j of [r > 0 ? i - n : -1, r < n - 1 ? i + n : -1, c > 0 ? i - 1 : -1, c < n - 1 ? i + 1 : -1]) {
          if (j >= 0 && g[j] >= 0 && grp[j] === grp[i]) opts.push(i, g[j]);
        }
      }
      if (!opts.length) return null;
      const k = Math.floor(rnd() * (opts.length / 2)) * 2;
      g[opts[k]] = opts[k + 1];
      left--;
    }
    return g;
  }

  function generateThemed(n, seed, id, maxMs) {
    const t0 = Date.now();
    const th = THEMES[id];
    if (!th || n < th.minN) return null;
    const rnd = mulberry32(((seed >>> 0) * 2654435761 + n * 193 + id.length * 7) >>> 0);
    const grp = new Int8Array(n * n);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) grp[r * n + c] = th.fn(r, c, n);
    const { comp, count } = components(grp, n);
    const groups = new Set(grp);
    for (let a = 0; a < 1e9; a++) {
      if (Date.now() - t0 > (maxMs || 3000)) return null;
      const sol = randomSolution(n, rnd);
      const has = new Uint8Array(count), per = {};
      for (let r = 0; r < n; r++) { const i = r * n + sol[r]; has[comp[i]] = 1; per[grp[i]] = (per[grp[i]] || 0) + 1; }
      if (has.some((v) => !v)) continue;
      if (th.exact && Object.keys(th.exact).some((k) => per[k] !== th.exact[k])) continue;
      if ([...groups].some((k) => !per[k])) continue;
      const g = growInGroups(n, sol, rnd, grp);
      if (g && refine(g, n, sol, rnd, grp) === 1) return { n, regions: Array.from(g), solution: sol, theme: id, attempts: a + 1 };
    }
    return null;
  }

  // Monta uma fase temática a partir dos tabuleiros pré-gerados, com giro/espelho sorteados pela seed.
  function fromThemed(data, id, n, seed) {
    const list = data && data[id] && data[id][n];
    if (!list || !list.length) return null;
    const rnd = mulberry32(((seed >>> 0) * 40503 + n * 31) >>> 0);
    const e = list[Math.floor(rnd() * list.length)], t = Math.floor(rnd() * 8);
    const flip = t & 1, rot = t >> 1;
    const map = (r, c) => {
      if (flip) c = n - 1 - c;
      for (let k = 0; k < rot; k++) { const nr = c, nc = n - 1 - r; r = nr; c = nc; }
      return [r, c];
    };
    const regs = new Array(n * n), sol = new Array(n), relabel = {}; let next = 0;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const [r2, c2] = map(r, c);
      regs[r2 * n + c2] = +e.r[r * n + c];
    }
    for (let i = 0; i < n * n; i++) { if (!(regs[i] in relabel)) relabel[regs[i]] = next++; regs[i] = relabel[regs[i]]; }
    for (let r = 0; r < n; r++) { const [r2, c2] = map(r, +e.s[r]); sol[r2] = c2; }
    return { n, regions: regs, solution: sol, theme: id };
  }

  // Gera um puzzle determinístico (mesma seed => mesmo tabuleiro) com solução única.
  function generate(n, seed) {
    const rnd = mulberry32(((seed >>> 0) * 2654435761 + n * 97) >>> 0);
    for (let a = 0; a < 500; a++) {
      const sol = randomSolution(n, rnd);
      const g = growRegions(n, sol, rnd);
      if (refine(g, n, sol, rnd) === 1) {
        return { n, regions: Array.from(g), solution: sol, attempts: a + 1 };
      }
    }
    throw new Error('Não foi possível gerar puzzle ' + n + 'x' + n);
  }

  // n cores sorteadas (pela seed) entre as 10.
  function pickColors(n, seed) {
    const rnd = mulberry32((seed >>> 0) + 12345);
    return shuffle(COLORS.slice(), rnd).slice(0, n);
  }

  function validateSolution(puz) {
    const { n, regions, solution } = puz;
    const cols = new Set(), regs = new Set();
    for (let r = 0; r < n; r++) {
      const c = solution[r];
      if (c < 0 || c >= n) return false;
      cols.add(c); regs.add(regions[r * n + c]);
      if (r > 0 && Math.abs(solution[r - 1] - c) <= 1) return false;
    }
    return cols.size === n && regs.size === n;
  }

  /* ---------- Dicas ---------- */

  // pugs[r] = coluna do pug colocado na linha r, ou -1.
  function baseCandidates(n, regions, pugs) {
    const cand = new Uint8Array(n * n).fill(1);
    for (let r = 0; r < n; r++) {
      const c = pugs[r];
      if (c < 0) continue;
      for (let k = 0; k < n; k++) { cand[r * n + k] = 0; cand[k * n + c] = 0; }
      const reg = regions[r * n + c];
      for (let i = 0; i < n * n; i++) if (regions[i] === reg) cand[i] = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < n && cc >= 0 && cc < n) cand[rr * n + cc] = 0;
      }
    }
    for (let r = 0; r < n; r++) if (pugs[r] >= 0) cand[r * n + pugs[r]] = 1;
    return cand;
  }

  const joinList = (arr) => arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join(', ') + ' e ' + arr[arr.length - 1];

  function nextDeduction(n, regions, pugs, cand, names) {
    const N = n * n;
    const rowSolved = new Uint8Array(n), colSolved = new Uint8Array(n), regSolved = new Uint8Array(n);
    for (let r = 0; r < n; r++) if (pugs[r] >= 0) {
      rowSolved[r] = 1; colSolved[pugs[r]] = 1; regSolved[regions[r * n + pugs[r]]] = 1;
    }
    const regCand = Array.from({ length: n }, () => []);
    const rowCand = Array.from({ length: n }, () => []);
    const colCand = Array.from({ length: n }, () => []);
    for (let i = 0; i < N; i++) {
      if (!cand[i]) continue;
      const r = (i / n) | 0, c = i % n, g = regions[i];
      if (regSolved[g] || rowSolved[r] || colSolved[c]) continue;
      regCand[g].push(i); rowCand[r].push(i); colCand[c].push(i);
    }
    const regs = [], rows = [], cols = [];
    for (let k = 0; k < n; k++) {
      if (!regSolved[k]) regs.push(k);
      if (!rowSolved[k]) rows.push(k);
      if (!colSolved[k]) cols.push(k);
    }

    // 1) Só um lugar possível
    for (const g of regs) if (regCand[g].length === 1) {
      return { type: 'single', place: regCand[g][0], highlight: [regCand[g][0]], elim: [],
        text: `A cor ${names[g]} só tem um lugar possível: aqui. Cada cor precisa de 1 pug.` };
    }
    for (const r of rows) if (rowCand[r].length === 1) {
      return { type: 'single', place: rowCand[r][0], highlight: [rowCand[r][0]], elim: [],
        text: `Na linha ${r + 1} só sobrou um quadrado possível: aqui. Cada linha precisa de 1 pug.` };
    }
    for (const c of cols) if (colCand[c].length === 1) {
      return { type: 'single', place: colCand[c][0], highlight: [colCand[c][0]], elim: [],
        text: `Na coluna ${c + 1} só sobrou um quadrado possível: aqui. Cada coluna precisa de 1 pug.` };
    }

    // 2) Grupos: k cores presas em k linhas/colunas, ou k linhas/colunas com só k cores
    const maxK = Math.max(regs.length, rows.length) - 1;
    const regMaskAll = regs.reduce((m, g) => m | (1 << g), 0);
    const rowMaskAll = rows.reduce((m, g) => m | (1 << g), 0);
    const colMaskAll = cols.reduce((m, g) => m | (1 << g), 0);
    const bits = (m) => { const a = []; for (let b = 0; b < n; b++) if (m & (1 << b)) a.push(b); return a; };

    for (let k = 1; k <= maxK; k++) {
      for (let mask = 1; mask < (1 << n); mask++) {
        if (popcount(mask) !== k || (mask & regMaskAll) !== mask) continue;
        const gs = bits(mask);
        let rm = 0, cm = 0; const hl = [];
        for (const g of gs) for (const i of regCand[g]) { rm |= 1 << ((i / n) | 0); cm |= 1 << (i % n); hl.push(i); }
        if (popcount(rm) === k) {
          const elim = [];
          for (const r of bits(rm)) for (const i of rowCand[r]) if (!(mask & (1 << regions[i]))) elim.push(i);
          if (elim.length) return { type: 'group', elim, highlight: hl, text: k === 1
            ? `Todo o ${names[gs[0]]} está na linha ${bits(rm)[0] + 1}. Cada linha tem só 1 pug, então o pug dessa linha é ${names[gs[0]]}: as outras cores dela podem ser riscadas.`
            : `As cores ${joinList(gs.map((g) => names[g]))} só cabem nas linhas ${joinList(bits(rm).map((x) => x + 1))}. Esses pugs ficam nelas, então as outras cores dessas linhas podem ser riscadas.` };
        }
        if (popcount(cm) === k) {
          const elim = [];
          for (const c of bits(cm)) for (const i of colCand[c]) if (!(mask & (1 << regions[i]))) elim.push(i);
          if (elim.length) return { type: 'group', elim, highlight: hl, text: k === 1
            ? `Todo o ${names[gs[0]]} está na coluna ${bits(cm)[0] + 1}. Cada coluna tem só 1 pug, então o pug dessa coluna é ${names[gs[0]]}: as outras cores dela podem ser riscadas.`
            : `As cores ${joinList(gs.map((g) => names[g]))} só cabem nas colunas ${joinList(bits(cm).map((x) => x + 1))}. Esses pugs ficam nelas, então as outras cores dessas colunas podem ser riscadas.` };
        }
      }
      for (const [lineMask, lineCand, label, plural] of [[rowMaskAll, rowCand, 'linha', 'linhas'], [colMaskAll, colCand, 'coluna', 'colunas']]) {
        for (let mask = 1; mask < (1 << n); mask++) {
          if (popcount(mask) !== k || (mask & lineMask) !== mask) continue;
          const ls = bits(mask);
          let gm = 0; const hl = [];
          for (const l of ls) for (const i of lineCand[l]) { gm |= 1 << regions[i]; hl.push(i); }
          if (popcount(gm) !== k) continue;
          const elim = [];
          for (const g of bits(gm)) for (const i of regCand[g]) {
            const l = label === 'linha' ? ((i / n) | 0) : (i % n);
            if (!(mask & (1 << l))) elim.push(i);
          }
          if (elim.length) {
            const gs = bits(gm);
            return { type: 'group', elim, highlight: hl, text: k === 1
              ? `Na ${label} ${ls[0] + 1} só sobrou a cor ${names[gs[0]]}. Ela precisa de 1 pug, então o ${names[gs[0]]} fica nela: os outros quadrados ${names[gs[0]]} podem ser riscados.`
              : `As ${plural} ${joinList(ls.map((x) => x + 1))} só têm as cores ${joinList(gs.map((g) => names[g]))}. Esses pugs precisam ficar nelas, então essas cores podem ser riscadas fora delas.` };
          }
        }
      }
    }

    // 3) Teste de suposição (um passo): se o pug ficasse aqui, algo ficaria sem lugar
    for (const g of regs) for (const i of regCand[g]) {
      const r = (i / n) | 0, c = i % n;
      const c2 = Uint8Array.from(cand);
      for (let k = 0; k < n; k++) { c2[r * n + k] = 0; c2[k * n + c] = 0; }
      for (let j = 0; j < N; j++) if (regions[j] === g) c2[j] = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < n && cc >= 0 && cc < n) c2[rr * n + cc] = 0;
      }
      let why = null;
      for (const g2 of regs) {
        if (g2 === g || why) continue;
        if (!regCand[g2].some((j) => c2[j])) why = `a cor ${names[g2]}`;
      }
      for (const r2 of rows) {
        if (r2 === r || why) continue;
        if (!rowCand[r2].some((j) => c2[j])) why = `a linha ${r2 + 1}`;
      }
      for (const c3 of cols) {
        if (c3 === c || why) continue;
        if (!colCand[c3].some((j) => c2[j])) why = `a coluna ${c3 + 1}`;
      }
      if (why) return { type: 'lookahead', elim: [i], highlight: [i],
        text: `Se o pug ficasse aqui, ${why} ficaria sem nenhum lugar (lembre: pugs não podem se tocar). Então este quadrado pode ser riscado.` };
    }
    return null;
  }

  // marks[i] = 1 se o jogador já riscou o quadrado. Devolve a próxima dica nova ou null.
  function findHint(n, regions, pugs, marks, names) {
    const cand = baseCandidates(n, regions, pugs);
    for (let guard = 0; guard < 400; guard++) {
      const h = nextDeduction(n, regions, pugs, cand, names);
      if (!h) return null;
      if (h.place != null) return h;
      const fresh = h.elim.filter((i) => !marks[i]);
      if (fresh.length) return Object.assign({}, h, { elim: fresh });
      h.elim.forEach((i) => { cand[i] = 0; });
    }
    return null;
  }

  const api = { COLORS, THEMES, THEME_IDS, generateThemed, fromThemed, mulberry32, generate, pickColors, countSolutions, validateSolution, baseCandidates, findHint, nextDeduction };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PugLogic = api;
})(typeof self !== 'undefined' ? self : this);
