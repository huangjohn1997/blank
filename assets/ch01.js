/* ═══════════════════════════════════════════════════════════════════════
   Chapter 1 — exhibits. Every number on the page is computed here, live,
   from the corpus in corpus.js. Nothing is hard-coded prose arithmetic.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const el = T.el, s = T.s;

  /* ── notation reader ──────────────────────────────────────────────── */
  T.eqs({
    joint: { t: 'P(w₁ … w_T)', b: '<p>The probability of one specific passage of <span class="m">T</span> words — the whole thing, in that order. <span class="m">w</span> means “a word” and the little number is its position, so <span class="m">w₃</span> is the third one.</p><p>For <em>the boats went out</em>, <span class="m">T = 4</span>, and this is a single number: how much of its belief the model spent on exactly that sequence out of every 4-word sequence it could have expected.</p>' },
    prod: { t: 'that ∏ sign', b: '<p>It means “multiply all of these together”, once for each value of <span class="m">t</span> from 1 up to <span class="m">T</span>. Its cousin <span class="m">∑</span> does the same thing with addition.</p><p>It’s loop notation. If <span class="m">T = 3</span> it just means three things multiplied together, one per word.</p>' },
    cond: { t: 'P(wₜ ∣ w₁:ₜ₋₁)', b: '<p>The vertical bar means “given”. So: the odds of the word at position <span class="m">t</span>, given everything before it. That’s what <span class="m">w₁:ₜ₋₁</span> is shorthand for — positions 1 through <span class="m">t−1</span>.</p><p>This one expression is the model’s entire output. Everything else in the equation is just bookkeeping around it.</p>' },
    phat: { t: 'the hat on P̂', b: '<p>A hat means “estimated from a sample” rather than “the actual truth”. It matters here, because the counts come from one finite pile of text, so the estimate carries that pile’s accidents.</p><p>No hat means the idealised number we wish we had.</p>' },
    numer: { t: 'count(c, w)', b: '<p>How many times, in the whole corpus, context <span class="m">c</span> was followed immediately by word <span class="m">w</span>. A plain integer you could get by hand with enough coffee.</p>' },
    denom: { t: 'count(c)', b: '<p>How many times context <span class="m">c</span> showed up at all, no matter what came next. Dividing by it is what turns raw tallies into odds that add up to 1.</p><p>And when it’s zero, the whole thing is undefined. That case is §1.5, and it eats the model.</p>' },
    loss: { t: 'L — the loss', b: '<p>One number for how well a model did on a text: average bits of surprise per word. Lower is better. Zero would mean it called every word correctly with total confidence.</p><p>Worth keeping landmarks in your head: a good modern model sits at a small handful of bits per token, a bad one at many.</p>' },
    sum: { t: 'the sum over positions', b: '<p>Add up the thing on the right, once per word. Together with the <span class="m">1/T</span> out front, this is just “take the average”.</p>' },
    log: { t: 'log₂', b: '<p>The base-2 logarithm: the power you’d raise 2 to in order to get your number. <span class="m">log₂(1/8) = −3</span>, because <span class="m">2⁻³ = 1/8</span>.</p><p>Probabilities are below 1, so their logs are always negative — which is why there’s a minus sign out front, to make the loss a positive number. Base 2 gives you bits. Natural log gives you “nats”. It changes the units, not the ranking.</p>' },
    ptrue: { t: 'P(the word that actually showed up)', b: '<p>This is the important bit of the whole objective. We don’t ask what the model’s favourite word was. We ask what it bet on the word that <em>actually happened</em>.</p><p>So a model can have the right favourite and still score badly by hedging, and it can have the wrong favourite and score fine by keeping the truth plausible.</p>' },
    ppl: { t: 'PPL — perplexity', b: '<p>2 raised to the loss. It turns bits into “how many equally likely options was it choosing between”, which most people find easier to feel.</p><p>Perplexity 1 = psychic. Perplexity equal to the vocabulary size = learned nothing beyond the word list.</p>' },
    phatk: { t: 'P̂ₖ — the smoothed estimate', b: '<p>Same count-and-divide, but with a constant <span class="m">k</span> added to every tally first. The subscript just says how much insurance you bought.</p>' },
    k: { t: '+ k on top', b: '<p>Pretend you saw this continuation <span class="m">k</span> extra times. At <span class="m">k = 0.1</span>, a word you never saw is treated as having shown up a tenth of a time. Small — but crucially not zero.</p>' },
    kv: { t: '+ kV on the bottom', b: '<p><span class="m">V</span> is the vocabulary size. You added <span class="m">k</span> to each of <span class="m">V</span> possible next words, so the total has to grow by <span class="m">kV</span> or the odds stop adding to 1.</p><p>Which is why a big <span class="m">k</span> with a big vocabulary is destructive: the insurance premium comes straight out of the words you actually observed.</p>' }
  });

  T.terms({
    'n-gram': { t: 'n-gram model', b: '<p>A model that guesses the next word from only the previous <span class="m">n−1</span> words, with the odds worked out by counting. A trigram model (<span class="m">n = 3</span>) looks back exactly two words.</p><p>Historically huge, now mostly instructive: it’s the cleanest example of a model whose failure comes from its <em>representation</em> rather than its size.</p>' },
    entropy: { t: 'entropy', b: '<p>How unsure a set of odds is, in bits — before you find out the answer. All the belief on one word: entropy 0. Spread evenly over 16 words: entropy 4.</p><p>Cross-entropy (the loss) measures a model against reality. Entropy measures the model’s own indecision. Related, not the same.</p>' }
  });

  const fmtP = p => (p >= 0.0995 ? p.toFixed(2) : p >= 0.001 ? p.toFixed(3) : p.toExponential(1));

  function statRow(items) {
    const row = el('div', { class: 'stat-row' });
    items.forEach(it => {
      row.appendChild(el('div', { class: 'stat' + (it.tone ? ' ' + it.tone : '') },
        [el('span', { class: 'k', text: it.k }), el('span', { class: 'v', html: it.v })]));
    });
    return row;
  }

  function barTable(rows, max, cols) {
    const wrap = el('div', { class: 'scroller' });
    const tb = el('table', { class: 'grid' });
    const head = el('tr');
    (cols || ['Continuation', 'count', 'P', '']).forEach(c => head.appendChild(el('th', { text: c })));
    tb.appendChild(el('thead', null, head));
    const body = el('tbody');
    rows.forEach(r => {
      const tr = el('tr', r.hi ? { 'data-hi': '1' } : null);
      tr.appendChild(el('td', null, el('span', { class: 'm', text: r.tok })));
      tr.appendChild(el('td', { class: 'n', text: r.count == null ? '—' : String(r.count) }));
      tr.appendChild(el('td', { class: 'n', text: fmtP(r.p) }));
      const cell = el('td', null);
      const bg = el('div', { class: 'bar-bg', style: 'width:5.5rem' });
      bg.appendChild(el('div', { class: 'bar' + (r.hi ? ' v' : ''), style: 'width:' + (100 * r.p / (max || 1)).toFixed(1) + '%;height:100%' }));
      cell.appendChild(bg);
      tr.appendChild(cell);
      body.appendChild(tr);
    });
    tb.appendChild(body);
    wrap.appendChild(tb);
    return wrap;
  }

  const entropyOf = rows => -rows.reduce((a, r) => a + (r.p > 0 ? r.p * Math.log2(r.p) : 0), 0);

  /* ── 1.1 · Two kinds of gap ───────────────────────────────────────── */
  T.lab('lab-1-1', function (root) {
    const ITEMS = [
      { prefix: 'he filled the lamp with', opts: ['oil', 'water', 'coins', 'bread'], n: 5 },
      { prefix: 'the keeper had climbed the ninety', opts: ['stairs', 'steps', 'years', 'boats'], n: 4 },
      { prefix: 'the keeper', opts: ['had', 'saw', 'grew', 'of'], n: 2, open: true }
    ];
    ITEMS.forEach((item, idx) => {
      const box = el('div', { style: 'margin:.2rem 0 1.1rem;padding-bottom:.9rem;border-bottom:1px solid var(--rule-soft)' });
      box.appendChild(el('div', { class: 'readout', style: 'background:transparent;border:0;padding:0 0 .5rem;font-size:.95rem;color:var(--ink)', html: '<b>' + item.prefix + '</b> <span style="color:var(--vermilion)">___</span>' }));
      const optWrap = el('div', { class: 'seg', style: 'margin-bottom:.5rem' });
      const out = el('div');
      const storeKey = 'q.c1f1.' + idx;

      function reveal(picked) {
        const model = C.ngram(item.n);
        const ctx = C.words(item.prefix);
        const d = C.dist(model, ctx, 0);
        const rows = (d.allRows || []).slice(0, 6).map(r => ({ ...r, hi: r.tok === picked }));
        const max = rows.length ? rows[0].p : 1;
        const H = d.found ? entropyOf(d.allRows) : NaN;
        const hit = (d.allRows || []).find(r => r.tok === picked);
        const kSm = 0.1;
        const pSm = d.found ? ((hit ? hit.count : 0) + kSm) / (d.total + kSm * d.V) : 1 / d.V;
        out.innerHTML = '';
        out.appendChild(statRow([
          { k: 'context seen', v: (d.found ? d.total : 0) + '<small>×</small>' },
          { k: 'distinct continuations', v: d.found ? String(d.allRows.length) : '0' },
          { k: 'how open the gap is', v: (isNaN(H) ? '—' : T.fmt(H, 2)) + '<small> bits</small>', tone: H > 1.5 ? 'warn' : 'good' },
          { k: 'your pick’s surprise', v: T.fmt(-Math.log2(pSm), 1) + '<small> bits</small>', tone: hit ? '' : 'warn' }
        ]));
        out.appendChild(el('p', { class: 'hint-scroll', style: 'margin:.55rem 0 .3rem', html: 'What the corpus actually did after <span class="m">' + item.prefix + '</span>:' }));
        out.appendChild(barTable(rows, max));
        out.appendChild(el('p', {
          class: 'fig-cap', style: 'margin-top:.45rem',
          html: item.open
            ? '<b>' + d.allRows.length + ' different continuations</b>, none dominant: ' + T.fmt(H, 2) + ' bits of genuine indecision. A model that names one word here is misrepresenting the corpus.'
            : 'One continuation, ' + (d.found ? d.total : 0) + ' occurrence' + ((d.found ? d.total : 0) === 1 ? '' : 's') + ', <b>' + T.fmt(H, 2) + ' bits</b> of indecision. The context did nearly all the work here. Now look at how thin the evidence for that confidence actually is.'
        }));
      }

      item.opts.forEach(o => {
        const b = el('button', { type: 'button', text: o });
        b.addEventListener('click', () => {
          if (box.dataset.done === '1') return;
          box.dataset.done = '1';
          T.set(storeKey, o);
          Array.from(optWrap.children).forEach(c => { c.setAttribute('aria-pressed', c.textContent === o ? 'true' : 'false'); c.disabled = true; });
          reveal(o);
        });
        optWrap.appendChild(b);
      });
      box.appendChild(optWrap);
      box.appendChild(out);
      root.appendChild(box);
      const prior = T.get(storeKey, null);
      if (prior) {
        box.dataset.done = '1';
        Array.from(optWrap.children).forEach(c => { c.setAttribute('aria-pressed', c.textContent === prior ? 'true' : 'false'); c.disabled = true; });
        reveal(prior);
      }
    });
  });

  /* ── 1.2 · product vs sum ─────────────────────────────────────────── */
  T.lab('lab-1-2', function (root) {
    const SENT = C.words('the boats went out with the tide .');
    const model = C.ngram(3), k = 0.1;
    let step = 0, mode = 'sum';

    const ctlSeg = el('div', { class: 'seg' });
    [['sum', 'add surprise'], ['prod', 'multiply probabilities']].forEach(([m, label]) => {
      const b = el('button', { type: 'button', text: label });
      b.addEventListener('click', () => { mode = m; render(); });
      ctlSeg.appendChild(b);
    });
    const btnStep = el('button', { class: 'btn', type: 'button', text: 'Step' });
    const btnAll = el('button', { class: 'btn ghost', type: 'button', text: 'All' });
    const btnReset = el('button', { class: 'btn ghost', type: 'button', text: 'Reset' });
    btnStep.addEventListener('click', () => { step = Math.min(SENT.length, step + 1); render(); });
    btnAll.addEventListener('click', () => { step = SENT.length; render(); });
    btnReset.addEventListener('click', () => { step = 0; render(); });
    root.appendChild(el('div', { class: 'ctl' }, [ctlSeg, btnStep, btnAll, btnReset]));
    const out = el('div');
    root.appendChild(out);

    function pAt(i) {
      const d = C.dist(model, SENT.slice(Math.max(0, i - 2), i), k);
      if (!d.found) return { p: 1 / model.V, unseen: true };
      const row = (d.allRows || []).find(r => r.tok === SENT[i]);
      return { p: row ? row.p : k / d.denom, unseen: !row };
    }

    function render() {
      Array.from(ctlSeg.children).forEach((c, i) => c.setAttribute('aria-pressed', (i === 0 ? 'sum' : 'prod') === mode ? 'true' : 'false'));
      out.innerHTML = '';
      const tb = el('table', { class: 'grid' });
      const head = el('tr');
      ['#', 'token', 'P(token ∣ two before)', 'surprise', mode === 'sum' ? 'running total (bits)' : 'running product'].forEach(c => head.appendChild(el('th', { text: c })));
      tb.appendChild(el('thead', null, head));
      const body = el('tbody');
      let prod = 1, bits = 0;
      for (let i = 0; i < step; i++) {
        const { p, unseen } = pAt(i);
        prod *= p; bits += -Math.log2(p);
        const tr = el('tr', unseen ? { 'data-hi': '1' } : null);
        tr.appendChild(el('td', { class: 'n', text: String(i + 1) }));
        tr.appendChild(el('td', null, el('span', { class: 'm', text: SENT[i] })));
        tr.appendChild(el('td', { class: 'n', text: fmtP(p) }));
        tr.appendChild(el('td', { class: 'n', text: T.fmt(-Math.log2(p), 1) }));
        tr.appendChild(el('td', { class: 'n', text: mode === 'sum' ? T.fmt(bits, 1) : (prod < 1e-4 ? prod.toExponential(2) : prod.toFixed(5)) }));
        body.appendChild(tr);
      }
      tb.appendChild(body);
      out.appendChild(el('div', { class: 'scroller' }, tb));
      if (!step) {
        out.appendChild(el('div', { class: 'readout', style: 'margin-top:.5rem', html: 'Hit <b>Step</b> to score <span class="m">' + SENT.join(' ') + '</span> one word at a time, using a trigram model with a little smoothing.' }));
      } else {
        out.appendChild(statRow([
          { k: 'tokens scored', v: step + '<small>/' + SENT.length + '</small>' },
          { k: 'joint probability', v: prod < 1e-4 ? prod.toExponential(1) : prod.toFixed(5), tone: prod < 1e-6 ? 'warn' : '' },
          { k: 'total surprise', v: T.fmt(bits, 1) + '<small> bits</small>' },
          { k: 'per token', v: T.fmt(bits / step, 2) + '<small> bits</small>', tone: 'good' }
        ]));
        if (step === SENT.length) {
          out.appendChild(el('p', {
            class: 'fig-cap', style: 'margin-top:.5rem',
            html: 'Joint probability: <b>' + prod.toExponential(1) + '</b>. The only thing you can read off that number is “small”. The exact same information as <b>' +
              T.fmt(bits / step, 2) + ' bits per word</b> can be compared to any other passage of any length. Highlighted rows are places where the model had never seen this context before and fell back on insurance.'
          }));
        }
      }
    }
    render();
  });

  /* ── 1.3 · the counting model, queried ────────────────────────────── */
  T.lab('lab-1-3', function (root) {
    const PRESETS = ['filled the lamp with', 'the keeper', 'the ninety', 'out of the', 'the girl', 'came down from the'];
    let n = 3, ctxText = 'the keeper';

    const seg = el('div', { class: 'seg' });
    [1, 2, 3, 4, 5].forEach(v => {
      const b = el('button', { type: 'button', text: 'n=' + v });
      b.addEventListener('click', () => { n = v; render(); });
      seg.appendChild(b);
    });
    const sel = el('select', { 'aria-label': 'Context' });
    PRESETS.forEach(p => sel.appendChild(el('option', { value: p, text: p })));
    sel.value = ctxText;
    sel.addEventListener('change', () => { ctxText = sel.value; render(); });
    const rand = el('button', { class: 'btn ghost', type: 'button', text: 'Random context from corpus' });
    rand.addEventListener('click', () => {
      const Tk = C.trainTokens();
      const i = 3 + Math.floor(Math.random() * (Tk.length - 8));
      ctxText = Tk.slice(i, i + 4).join(' ');
      if (![].some.call(sel.options, o => o.value === ctxText)) sel.appendChild(el('option', { value: ctxText, text: ctxText }));
      sel.value = ctxText;
      render();
    });
    root.appendChild(el('div', { class: 'ctl' }, [seg, sel]));
    root.appendChild(el('div', { class: 'ctl' }, [rand]));
    const out = el('div');
    root.appendChild(out);

    function render() {
      Array.from(seg.children).forEach((c, i) => c.setAttribute('aria-pressed', i + 1 === n ? 'true' : 'false'));
      const model = C.ngram(n);
      const words = C.words(ctxText);
      const used = n === 1 ? [] : words.slice(-(n - 1));
      const d = C.dist(model, words, 0);
      let once = 0, tot = 0;
      model.table.forEach(e => { tot++; if (e.total === 1) once++; });
      out.innerHTML = '';
      out.appendChild(el('div', {
        class: 'readout',
        html: 'what the model actually looks at, at <b>n=' + n + '</b>: ' + (used.length ? '<b>' + used.join(' ') + '</b>' : '<i>none — a unigram model ignores context entirely</i>') +
          (n > 1 && used.length < n - 1 ? ' <span style="color:var(--vermilion)">(shorter than n−1 — pick a longer context)</span>' : '')
      }));
      out.appendChild(statRow([
        { k: 'context seen', v: d.found ? String(d.total) : '0', tone: d.found ? '' : 'warn' },
        { k: 'distinct continuations', v: d.found ? String(d.allRows.length) : '—' },
        { k: 'prediction entropy', v: d.found ? T.fmt(entropyOf(d.allRows), 2) + '<small> bits</small>' : '—' },
        { k: 'contexts seen only once', v: T.pct(once / tot, 0), tone: once / tot > 0.7 ? 'warn' : '' }
      ]));
      if (!d.found) {
        out.appendChild(el('div', { class: 'readout', style: 'margin-top:.5rem;color:var(--vermilion)', html: 'This context never happens in the corpus. So the counting model has <b>nothing to report</b> — not a bad guess, no guess. Equation 1.2 is dividing by zero right now.' }));
      } else {
        out.appendChild(el('div', { style: 'height:.5rem' }));
        out.appendChild(barTable(d.allRows.slice(0, 8), d.allRows[0].p));
      }
    }
    render();
  });

  /* ── 1.4 · generation, with copying made visible ──────────────────── */
  T.lab('lab-1-4', function (root) {
    const W = 6;                                     // copied span = W consecutive tokens
    let n = 3, temp = 1.0, seed = 1234;
    const grams = new Set();
    (function () {
      const Tk = C.trainTokens();
      for (let i = 0; i + W <= Tk.length; i++) grams.add(Tk.slice(i, i + W).join(' '));
    })();

    const seg = el('div', { class: 'seg' });
    [2, 3, 4, 5].forEach(v => {
      const b = el('button', { type: 'button', text: 'n=' + v });
      b.addEventListener('click', () => { n = v; render(); });
      seg.appendChild(b);
    });
    const tempWrap = el('div', { class: 'ctl-g' });
    const tempLab = el('div', { class: 'ctl-l', html: 'temperature <span class="v">1.00</span>' });
    const temps = el('input', { type: 'range', min: '0.4', max: '1.6', step: '0.1', value: '1', 'aria-label': 'Temperature' });
    temps.addEventListener('input', () => { temp = parseFloat(temps.value); T.$('.v', tempLab).textContent = temp.toFixed(2); render(); });
    tempWrap.appendChild(tempLab); tempWrap.appendChild(temps);
    const again = el('button', { class: 'btn', type: 'button', text: 'Generate' });
    again.addEventListener('click', () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; render(); });
    root.appendChild(el('div', { class: 'ctl' }, [seg, tempWrap, again]));
    const out = el('div');
    root.appendChild(out);

    function render() {
      Array.from(seg.children).forEach(c => c.setAttribute('aria-pressed', c.textContent === 'n=' + n ? 'true' : 'false'));
      const r = C.sample(n, { rnd: T.rng(seed), temp, len: 64 });
      const toks = r.tokens;
      const copied = new Array(toks.length).fill(false);
      for (let i = 0; i + W <= toks.length; i++) {
        if (grams.has(toks.slice(i, i + W).join(' '))) for (let j = i; j < i + W; j++) copied[j] = true;
      }
      const copyRate = copied.filter(Boolean).length / toks.length;
      out.innerHTML = '';
      const body = el('div', { class: 'readout', style: 'font-family:var(--serif);font-size:1rem;line-height:1.7' });
      let html = '', run = null;
      toks.forEach((t, i) => {
        const glue = /^[.,:;!?)"]$/.test(t) || i === 0 ? '' : ' ';
        if (copied[i] !== run) { if (run !== null) html += copied[i] ? '' : '</mark>'; if (copied[i]) html += glue + '<mark>'; run = copied[i]; html += copied[i] ? t : glue + t; }
        else html += glue + t;
      });
      if (run) html += '</mark>';
      body.innerHTML = html + (r.deadEnd ? ' <span style="color:var(--vermilion);font-family:var(--sans);font-size:.8rem">▮ stopped: this context never occurred in the corpus, so the model had nothing to say.</span>' : '');
      out.appendChild(body);
      out.appendChild(statRow([
        { k: 'context length', v: (n - 1) + '<small> token' + (n === 2 ? '' : 's') + '</small>' },
        { k: 'verbatim from corpus', v: T.pct(copyRate, 0), tone: copyRate > 0.6 ? 'warn' : copyRate < 0.15 ? 'good' : '' },
        { k: 'reads as', v: n <= 2 ? 'local noise' : n === 3 ? 'drifting' : n === 4 ? 'mostly recited' : 'recitation' }
      ]));
      out.appendChild(el('p', { class: 'hint-scroll', style: 'margin-top:.4rem', html: 'Highlighted = ' + W + ' or more words in a row that appear word-for-word in the corpus.' }));
    }
    render();
  });

  /* ── 1.5 · scoring held-out text ──────────────────────────────────── */
  T.lab('lab-1-5', function (root) {
    const KS = [0, 0.001, 0.01, 0.1, 0.5, 1];
    let n = 3, ki = 0;

    const seg = el('div', { class: 'seg' });
    [2, 3, 4].forEach(v => {
      const b = el('button', { type: 'button', text: 'n=' + v });
      b.addEventListener('click', () => { n = v; render(); });
      seg.appendChild(b);
    });
    const kWrap = el('div', { class: 'ctl-g' });
    const kLab = el('div', { class: 'ctl-l', html: 'smoothing k <span class="v">0</span>' });
    const kIn = el('input', { type: 'range', min: '0', max: String(KS.length - 1), step: '1', value: '0', 'aria-label': 'Smoothing k' });
    kIn.addEventListener('input', () => { ki = parseInt(kIn.value, 10); T.$('.v', kLab).textContent = String(KS[ki]); render(); });
    kWrap.appendChild(kLab); kWrap.appendChild(kIn);
    root.appendChild(el('div', { class: 'ctl' }, [seg, kWrap]));
    const out = el('div');
    root.appendChild(out);

    function render() {
      Array.from(seg.children).forEach(c => c.setAttribute('aria-pressed', c.textContent === 'n=' + n ? 'true' : 'false'));
      const k = KS[ki], model = C.ngram(n), Tk = C.testTokens();
      const per = [];
      for (let i = n - 1; i < Tk.length; i++) {
        const d = C.dist(model, Tk.slice(Math.max(0, i - n + 1), i), k);
        let p;
        if (!d.found) p = k ? 1 / model.V : 0;
        else { const row = (d.allRows || []).find(r => r.tok === Tk[i]); p = row ? row.p : (k ? k / d.denom : 0); }
        per.push({ tok: Tk[i], p, bits: p > 0 ? -Math.log2(p) : Infinity });
      }
      const zeros = per.filter(x => !isFinite(x.bits)).length;
      const finite = per.filter(x => isFinite(x.bits));
      const avg = zeros ? Infinity : finite.reduce((a, x) => a + x.bits, 0) / finite.length;
      const worst = finite.slice().sort((a, b) => b.bits - a.bits)[0];
      out.innerHTML = '';
      out.appendChild(statRow([
        { k: 'loss (bits / token)', v: zeros ? '∞' : T.fmt(avg, 2), tone: zeros ? 'warn' : '' },
        { k: 'perplexity', v: zeros ? '∞' : T.fmt(Math.pow(2, avg), 1), tone: zeros ? 'warn' : '' },
        { k: 'tokens called impossible', v: String(zeros), tone: zeros ? 'warn' : 'good' },
        { k: 'hardest token', v: worst ? '<span class="m">' + worst.tok + '</span> <small>' + T.fmt(worst.bits, 1) + ' bits</small>' : '—' }
      ]));
      const strip = el('div', { class: 'toks', style: 'margin-top:.6rem' });
      per.slice(0, 70).forEach(x => {
        const b = !isFinite(x.bits) ? 1 : Math.min(1, x.bits / 14);
        const cls = !isFinite(x.bits) ? 'tok new' : b > 0.55 ? 'tok b' : 'tok';
        strip.appendChild(el('span', { class: cls, text: x.tok, title: (isFinite(x.bits) ? T.fmt(x.bits, 1) + ' bits' : 'probability zero — infinite surprise') }));
      });
      out.appendChild(strip);
      out.appendChild(el('p', {
        class: 'hint-scroll', style: 'margin-top:.4rem',
        html: zeros
          ? '<b style="color:var(--vermilion)">' + zeros + ' word' + (zeros === 1 ? '' : 's') + ' got probability exactly zero</b> (vermilion). Each one is the model claiming that something which then happened was impossible. One is enough to make the average infinite — so the score can’t tell a nearly-good model from a hopeless one.'
          : 'Nothing was called impossible any more. The loss is finite, and honestly pretty bad. Ochre marks words that cost more than about 8 bits.'
      }));
    }
    render();
  });

  /* ── 1.6 · the coverage cliff ─────────────────────────────────────── */
  T.lab('lab-1-6', function (root) {
    const NS = [1, 2, 3, 4, 5, 6];
    const data = NS.map(n => C.coverage(n));
    const W = 560, H = 250, L = 46, B = 44, Rr = 8, Tt = 26;
    const svg = T.svg(W, H);
    svg.setAttribute('aria-label', 'Share of held-out positions whose context or full n-gram was never seen in training, for n from 1 to 6.');
    const x = i => L + (i + 0.5) * ((W - L - Rr) / NS.length);
    const y = v => Tt + (1 - v) * (H - Tt - B);
    [0, 0.25, 0.5, 0.75, 1].forEach(v => {
      svg.appendChild(s('line', { x1: L, x2: W - Rr, y1: y(v), y2: y(v), stroke: 'var(--grid)', 'stroke-width': 1 }));
      svg.appendChild(s('text', { x: L - 6, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 10, fill: 'var(--ink-3)' }, (v * 100) + '%'));
    });
    const bw = (W - L - Rr) / NS.length * 0.3;
    data.forEach((d, i) => {
      const ctxU = d.ctxUnseen / d.total, gU = d.gramUnseen / d.total;
      svg.appendChild(s('rect', { x: x(i) - bw - 2, y: y(ctxU), width: bw, height: Math.max(1, y(0) - y(ctxU)), fill: 'var(--s1)', rx: 2 }));
      svg.appendChild(s('rect', { x: x(i) + 2, y: y(gU), width: bw, height: Math.max(1, y(0) - y(gU)), fill: 'var(--s2)', rx: 2 }));
      svg.appendChild(s('text', { x: x(i), y: H - B + 16, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--ink-2)' }, 'n=' + d.n));
      svg.appendChild(s('text', { x: x(i) - bw / 2 - 2, y: y(ctxU) - 4, 'text-anchor': 'middle', 'font-size': 9.5, fill: 'var(--s1)' }, Math.round(ctxU * 100) + ''));
      svg.appendChild(s('text', { x: x(i) + bw / 2 + 2, y: y(gU) - 4, 'text-anchor': 'middle', 'font-size': 9.5, fill: 'var(--s2)' }, Math.round(gU * 100) + ''));
    });
    svg.appendChild(s('line', { x1: L, x2: W - Rr, y1: y(0), y2: y(0), stroke: 'var(--axis)', 'stroke-width': 1 }));
    svg.appendChild(s('text', { x: L, y: 12, 'font-size': 10.5, fill: 'var(--s1)', 'font-weight': 600 }, '■ context never seen'));
    svg.appendChild(s('text', { x: L + 128, y: 12, 'font-size': 10.5, fill: 'var(--s2)', 'font-weight': 600 }, '■ context+continuation never seen'));
    svg.appendChild(s('text', { x: 12, y: H / 2, 'font-size': 10, fill: 'var(--ink-3)', transform: 'rotate(-90 12 ' + H / 2 + ')', 'text-anchor': 'middle' }, 'share of held-out positions'));
    root.appendChild(el('div', { class: 'scroller' }, svg));
    const d5 = data[4];
    root.appendChild(statRow([
      { k: 'corpus size', v: C.trainTokens().length.toLocaleString('en-US') + '<small> tokens</small>' },
      { k: 'vocabulary', v: String(C.ngram(1).V) },
      { k: 'at n=5, context unseen', v: T.pct(d5.ctxUnseen / d5.total, 0), tone: 'warn' },
      { k: 'at n=5, 5-gram unseen', v: T.pct(d5.gramUnseen / d5.total, 0), tone: 'warn' }
    ]));
    root.appendChild(el('p', {
      class: 'hint-scroll', style: 'margin-top:.4rem',
      html: 'Scored on ' + C.testTokens().length + ' words the model has never seen. A real corpus is many orders of magnitude bigger, which pushes these bars down — Exhibit 1.7 is about how far down, and why not to zero.'
    }));
  });

  /* ── 1.7 · Zipf and Heaps ─────────────────────────────────────────── */
  T.lab('lab-1-7', function (root) {
    const z = C.zipf(), Tk = C.trainTokens();
    let view = 'freq';
    const seg = el('div', { class: 'seg' });
    [['freq', 'frequency of tokens'], ['growth', 'growth of vocabulary']].forEach(([v, label]) => {
      const b = el('button', { type: 'button', text: label });
      b.addEventListener('click', () => { view = v; render(); });
      seg.appendChild(b);
    });
    root.appendChild(el('div', { class: 'ctl' }, [seg]));
    const out = el('div');
    root.appendChild(out);

    function freqView() {
      const W = 560, H = 260, L = 46, B = 42, Rr = 12, Tt = 18;
      const svg = T.svg(W, H);
      svg.setAttribute('aria-label', 'Token frequency against frequency rank on logarithmic axes: a near-straight declining line, the signature of a heavy tail.');
      const maxR = Math.log10(z.length), maxC = Math.log10(z[0].c);
      const px = r => L + (Math.log10(r) / maxR) * (W - L - Rr);
      const py = c => Tt + (1 - Math.log10(c) / maxC) * (H - Tt - B);
      [1, 10, 100, 1000].forEach(v => {
        if (v > z.length) return;
        svg.appendChild(s('line', { x1: px(v), x2: px(v), y1: Tt, y2: py(1), stroke: 'var(--grid)' }));
        svg.appendChild(s('text', { x: px(v), y: H - B + 15, 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--ink-3)' }, String(v)));
      });
      [1, 10, 100].forEach(v => {
        if (v > z[0].c) return;
        svg.appendChild(s('line', { x1: L, x2: W - Rr, y1: py(v), y2: py(v), stroke: 'var(--grid)' }));
        svg.appendChild(s('text', { x: L - 6, y: py(v) + 4, 'text-anchor': 'end', 'font-size': 10, fill: 'var(--ink-3)' }, String(v)));
      });
      z.forEach(r => svg.appendChild(s('circle', { cx: px(r.rank), cy: py(r.c), r: 1.9, fill: 'var(--s1)', opacity: 0.55 })));
      [z[0], z[1], z[9], z[Math.floor(z.length / 2)], z[z.length - 1]].forEach(r => {
        svg.appendChild(s('circle', { cx: px(r.rank), cy: py(r.c), r: 3.2, fill: 'var(--s2)' }));
        svg.appendChild(s('text', { x: px(r.rank) + 6, y: py(r.c) - 4, 'font-size': 10, fill: 'var(--s2)', 'font-weight': 600 }, '“' + r.tok + '” ×' + r.c));
      });
      svg.appendChild(s('text', { x: (W + L) / 2, y: H - 6, 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--ink-3)' }, 'frequency rank (log)'));
      svg.appendChild(s('text', { x: 12, y: H / 2, 'font-size': 10, fill: 'var(--ink-3)', transform: 'rotate(-90 12 ' + H / 2 + ')', 'text-anchor': 'middle' }, 'occurrences (log)'));
      const hapax = z.filter(r => r.c === 1).length;
      const top10 = z.slice(0, 10).reduce((a, r) => a + r.c, 0);
      return {
        svg, stats: [
          { k: 'distinct tokens', v: String(z.length) },
          { k: 'occur exactly once', v: T.pct(hapax / z.length, 0), tone: 'warn' },
          { k: 'text covered by top 10', v: T.pct(top10 / Tk.length, 0) },
          { k: 'most common', v: '<span class="m">' + z[0].tok + '</span> <small>×' + z[0].c + '</small>' }
        ],
        note: 'Both axes are logarithmic, so a straight line means every halving of rank roughly doubles the frequency. What that does to a counting model: most of the vocabulary is starved of evidence by construction, and the words it has plenty of evidence about are mostly “the” and “of”.'
      };
    }

    function growthView() {
      const pts = [];
      for (let f = 0.05; f <= 1.0001; f += 0.05) {
        const cut = Math.floor(Tk.length * f);
        pts.push({ f, tokens: cut, types: C.types(Tk.slice(0, cut)) });
      }
      const W = 560, H = 260, L = 52, B = 42, Rr = 14, Tt = 18;
      const svg = T.svg(W, H);
      svg.setAttribute('aria-label', 'Vocabulary size against corpus size: a rising curve that does not flatten.');
      const maxT = pts[pts.length - 1].tokens, maxV = pts[pts.length - 1].types;
      const px = t => L + (t / maxT) * (W - L - Rr);
      const py = v => Tt + (1 - v / (maxV * 1.05)) * (H - Tt - B);
      [0, 0.25, 0.5, 0.75, 1].forEach(g => {
        svg.appendChild(s('line', { x1: L, x2: W - Rr, y1: py(maxV * g), y2: py(maxV * g), stroke: 'var(--grid)' }));
        svg.appendChild(s('text', { x: L - 6, y: py(maxV * g) + 4, 'text-anchor': 'end', 'font-size': 10, fill: 'var(--ink-3)' }, String(Math.round(maxV * g))));
      });
      let d = '';
      pts.forEach((p, i) => (d += (i ? ' L' : 'M') + px(p.tokens) + ' ' + py(p.types)));
      svg.appendChild(s('path', { d, fill: 'none', stroke: 'var(--s1)', 'stroke-width': 2.2 }));
      pts.forEach(p => svg.appendChild(s('circle', { cx: px(p.tokens), cy: py(p.types), r: 2.6, fill: 'var(--s1)' })));
      // a straight line from origin through the halfway point, to show the curve is not flattening to a ceiling
      const half = pts[Math.floor(pts.length / 2)];
      svg.appendChild(s('line', { x1: px(0), y1: py(0), x2: px(maxT), y2: py(half.types * (maxT / half.tokens)), stroke: 'var(--s3)', 'stroke-dasharray': '4 4', 'stroke-width': 1.4 }));
      svg.appendChild(s('text', { x: W - Rr - 4, y: Tt + 12, 'text-anchor': 'end', 'font-size': 10, fill: 'var(--s3)' }, 'straight-line growth, for comparison'));
      [0, 0.5, 1].forEach(f => {
        svg.appendChild(s('text', { x: px(maxT * f), y: H - B + 15, 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--ink-3)' }, Math.round(maxT * f).toLocaleString('en-US')));
      });
      svg.appendChild(s('text', { x: (W + L) / 2, y: H - 6, 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--ink-3)' }, 'corpus size (tokens read so far)'));
      svg.appendChild(s('text', { x: 13, y: H / 2, 'font-size': 10, fill: 'var(--ink-3)', transform: 'rotate(-90 13 ' + H / 2 + ')', 'text-anchor': 'middle' }, 'distinct tokens seen'));
      const last = pts[pts.length - 1], prev = pts[pts.length - 2];
      return {
        svg, stats: [
          { k: 'vocabulary at 50% of corpus', v: String(pts[Math.floor(pts.length / 2)].types) },
          { k: 'vocabulary at 100%', v: String(last.types) },
          { k: 'new tokens in the final 5%', v: String(last.types - prev.types), tone: 'warn' },
          { k: 'growth still positive?', v: 'yes', tone: 'warn' }
        ],
        note: 'The curve bends — each new chunk of text brings fewer new words than the last — but it never flattens out, and the final slice still introduces words that had never appeared. This slowing-but-endless growth shows up in corpora of every size; it’s known as Heaps’ law. And since every new word creates new contexts, a counting model never runs out of contexts it has never seen.'
      };
    }

    function render() {
      Array.from(seg.children).forEach((c, i) => c.setAttribute('aria-pressed', (i === 0 ? 'freq' : 'growth') === view ? 'true' : 'false'));
      const r = view === 'freq' ? freqView() : growthView();
      out.innerHTML = '';
      out.appendChild(el('div', { class: 'scroller' }, r.svg));
      out.appendChild(statRow(r.stats));
      out.appendChild(el('p', { class: 'hint-scroll', style: 'margin-top:.45rem', html: r.note }));
    }
    render();
  });
})();
