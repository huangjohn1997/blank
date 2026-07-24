/* ═══════════════════════════════════════════════════════════════════════
   From Prediction to Agency — shared reading runtime.

   Everything here exists to serve one of five pedagogical commitments:
     1. the reasoning skeleton is visible      → contract + move tracking
     2. memory support never clutters the page → contained help panel
     3. notation is decodable on the spot      → equation reader
     4. answers stay closed until commitment   → checks + reconstruction
     5. irregular self-paced sessions resume   → local progress store
   Labs register themselves and fail independently; a broken exhibit must
   never take the chapter's prose down with it.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const T = (window.T = {});
  const SVGNS = 'http://www.w3.org/2000/svg';

  /* ── store ─────────────────────────────────────────────────────────── */
  const KEY = 'fpta.v1';
  let store = {};
  try { store = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { store = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} };
  T.get = (k, d) => (k in store ? store[k] : d);
  T.set = (k, v) => { store[k] = v; save(); };

  /* ── small helpers ─────────────────────────────────────────────────── */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  T.$ = $; T.$$ = $$;

  T.el = function (tag, attrs, kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'html') e.innerHTML = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k === 'class') e.className = attrs[k];
      else if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k]);
    }
    if (kids) (Array.isArray(kids) ? kids : [kids]).forEach(k => k && e.appendChild(k));
    return e;
  };
  T.s = function (tag, attrs, text) {
    const e = document.createElementNS(SVGNS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  };
  T.svg = function (w, h, cls) {
    const e = T.s('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h, role: 'img' });
    if (cls) e.setAttribute('class', cls);
    e.style.maxWidth = '100%'; e.style.height = 'auto';
    return e;
  };
  T.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  T.fmt = (x, d) => {
    if (!isFinite(x)) return '∞';
    d = d == null ? 2 : d;
    if (Math.abs(x) >= 1e6) return (x / 1e6).toFixed(1) + 'M';
    if (Math.abs(x) >= 1e4) return Math.round(x).toLocaleString('en-US');
    return x.toFixed(d);
  };
  T.pct = (x, d) => (100 * x).toFixed(d == null ? 1 : d) + '%';
  T.rng = function (seed) {                       // deterministic: every reader sees the same run
    let s = seed >>> 0 || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  };
  T.dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
  T.norm = a => Math.sqrt(T.dot(a, a));
  T.cos = (a, b) => { const n = T.norm(a) * T.norm(b); return n === 0 ? 0 : T.dot(a, b) / n; };
  T.softmax = function (z) {
    const m = Math.max.apply(null, z), e = z.map(v => Math.exp(v - m));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map(v => v / s);
  };
  /* top-2 principal directions by power iteration + deflation.
     Used to show a high-dimensional space on a page — and to make the
     lossiness of that view explicit rather than hidden. */
  T.pca2 = function (X, seed) {
    const n = X.length, d = X[0].length, rnd = T.rng(seed || 7);
    const mean = new Array(d).fill(0);
    X.forEach(v => v.forEach((x, j) => (mean[j] += x / n)));
    const C = X.map(v => v.map((x, j) => x - mean[j]));
    const axes = [];
    for (let k = 0; k < 2; k++) {
      let v = Array.from({ length: d }, () => rnd() - 0.5);
      for (let it = 0; it < 90; it++) {
        const u = new Array(d).fill(0);
        for (let i = 0; i < n; i++) { const p = T.dot(C[i], v); for (let j = 0; j < d; j++) u[j] += p * C[i][j]; }
        axes.forEach(a => { const p = T.dot(u, a); for (let j = 0; j < d; j++) u[j] -= p * a[j]; });
        const nn = T.norm(u) || 1;
        v = u.map(x => x / nn);
      }
      axes.push(v);
    }
    return { axes, mean, project: v => axes.map(a => T.dot(v.map((x, j) => x - mean[j]), a)) };
  };

  /* ── contained help panel: glossary + equation reader share one surface ─ */
  const TERMS = {}, EQS = {};
  T.terms = obj => Object.assign(TERMS, obj);
  T.eqs = obj => Object.assign(EQS, obj);

  let panel, lastFocus = null;
  function buildPanel() {
    panel = T.el('div', { id: 'panel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'panel-title', tabindex: '-1' });
    panel.innerHTML =
      '<button class="p-close" aria-label="Close explanation">✕</button>' +
      '<div class="p-kind" id="panel-kind"></div>' +
      '<div class="p-title" id="panel-title"></div>' +
      '<div class="p-body" id="panel-body"></div>';
    document.body.appendChild(panel);
    $('.p-close', panel).addEventListener('click', closePanel);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && panel.dataset.open === '1') closePanel(); });
    document.addEventListener('click', e => {
      if (panel.dataset.open !== '1') return;
      if (panel.contains(e.target) || e.target.closest('.term,[data-ex],.eqn-legend button')) return;
      closePanel();
    });
  }
  function openPanel(kind, title, body, src) {
    if (!panel) buildPanel();
    lastFocus = document.activeElement;
    $('#panel-kind', panel).textContent = kind;
    $('#panel-title', panel).textContent = title;
    $('#panel-body', panel).innerHTML = body + (src ? '<div class="p-src">' + src + '</div>' : '');
    panel.dataset.open = '1';
    panel.scrollTop = 0;
    panel.focus({ preventScroll: true });
  }
  function closePanel() {
    if (!panel) return;
    panel.dataset.open = '0';
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }
  T.openPanel = openPanel;

  function wireTerms() {
    document.addEventListener('click', e => {
      const t = e.target.closest('.term');
      if (!t) return;
      e.preventDefault();
      const k = t.dataset.t, d = TERMS[k];
      if (!d) { openPanel('Term', t.textContent.trim(), '<p>No definition recorded for this term yet.</p>'); return; }
      openPanel('Definition', d.t || t.textContent.trim(), d.b, d.src);
    });
  }

  /* Equation reader. Tapping a marked group opens its reading in the same
     panel; the generated legend below the equation is the keyboard and
     assistive-technology path, so no explanation is trapped inside MathML. */
  function wireEquations() {
    $$('.eqn').forEach(eq => {
      const groups = $$('[data-ex]', eq);
      if (!groups.length) return;
      const seen = [];
      groups.forEach(g => {
        const k = g.getAttribute('data-ex');
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        const label = (EQS[k] && EQS[k].t) || k;
        g.setAttribute('aria-label', 'Explain: ' + label);
        if (seen.indexOf(k) < 0) seen.push(k);
      });
      const legend = T.el('div', { class: 'eqn-legend' });
      legend.appendChild(document.createTextNode('Read a part: '));
      seen.forEach((k, i) => {
        if (i) legend.appendChild(document.createTextNode(' · '));
        const b = T.el('button', { class: 'term', 'data-ex-btn': k, type: 'button', text: (EQS[k] && EQS[k].t) || k });
        legend.appendChild(b);
      });
      eq.appendChild(legend);
    });
    document.addEventListener('click', e => {
      const g = e.target.closest('[data-ex],[data-ex-btn]');
      if (!g) return;
      const k = g.getAttribute('data-ex') || g.getAttribute('data-ex-btn');
      const d = EQS[k];
      if (!d) return;
      e.preventDefault();
      openPanel('Reading the notation', d.t, d.b, d.src);
    });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const g = e.target.closest && e.target.closest('[data-ex]');
      if (!g) return;
      e.preventDefault();
      const d = EQS[g.getAttribute('data-ex')];
      if (d) openPanel('Reading the notation', d.t, d.b, d.src);
    });
  }

  /* ── commitment gates ──────────────────────────────────────────────── */
  function markCheck(box, picked, replay) {
    const ans = parseInt(box.dataset.answer, 10);
    const opts = $$('.opt', box);
    opts.forEach((o, i) => {
      o.setAttribute('aria-pressed', i === picked ? 'true' : 'false');
      if (i === ans) o.dataset.mark = 'right';
      else if (i === picked) o.dataset.mark = 'wrong';
      else o.removeAttribute('data-mark');
      o.disabled = true;
    });
    const shown = {};
    $$('.verdict', box).forEach(v => {
      const f = v.dataset.for;
      const on = f === '*' || f === String(picked) ||
        (f === 'ok' && picked === ans) || (f === 'no' && picked !== ans);
      v.hidden = !on;
      if (on) shown[f] = 1;
    });
    if (!replay) box.setAttribute('data-committed', '1');
  }
  function wireChecks() {
    $$('.check[data-check]').forEach(box => {
      const id = 'q.' + box.dataset.check;
      const prior = T.get(id, null);
      $$('.opt', box).forEach((o, i) => {
        o.setAttribute('aria-pressed', 'false');
        o.addEventListener('click', () => {
          if (box.getAttribute('data-committed') === '1') return;
          T.set(id, i);
          markCheck(box, i, false);
        });
      });
      if (prior != null) markCheck(box, prior, true);
    });
  }
  function wireRecon() {
    $$('.recon[data-recon]').forEach(box => {
      const id = 'r.' + box.dataset.recon;
      const ta = $('textarea', box), btn = $('button', box), model = $('.r-model', box);
      if (!btn || !model) return;
      const prior = T.get(id, null);
      if (ta) {
        if (prior && prior.text) ta.value = prior.text;
        ta.addEventListener('input', () => T.set(id, { text: ta.value, shown: !model.hidden }));
      }
      const reveal = () => { model.hidden = false; btn.hidden = true; T.set(id, { text: ta ? ta.value : '', shown: true }); };
      btn.addEventListener('click', reveal);
      if (prior && prior.shown) { model.hidden = false; btn.hidden = true; }
    });
  }

  /* ── move tracking: the chapter's reasoning skeleton stays visible ── */
  function wireMoves() {
    const secs = $$('section[data-move][id]');
    if (!secs.length) return;
    const items = $$('.contract li[data-target]');
    const links = $$('.aside-nav a[data-target]');
    const light = id => {
      items.forEach(li => li.dataset.live = li.dataset.target === '#' + id ? '1' : '0');
      links.forEach(a => a.classList.toggle('active', a.dataset.target === '#' + id));
      T.set('pos.' + (document.body.dataset.ch || 'x'), id);
    };
    let active = null;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) active = en.target.id; });
      if (active) light(active);
    }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });
    secs.forEach(s => io.observe(s));
  }

  function wireProgress() {
    const bar = $('#prog');
    if (!bar) return;
    const upd = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    };
    document.addEventListener('scroll', upd, { passive: true });
    upd();
  }

  function wireTheme() {
    const btn = $('#theme');
    if (!btn) return;
    const cur = T.get('theme', null);
    if (cur) document.documentElement.setAttribute('data-theme', cur);
    const label = () => {
      const d = document.documentElement.getAttribute('data-theme');
      btn.textContent = d === 'dark' ? 'Light' : d === 'light' ? 'Dark' : 'Dark';
    };
    label();
    btn.addEventListener('click', () => {
      const now = document.documentElement.getAttribute('data-theme');
      const next = now === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      T.set('theme', next); label();
    });
  }

  /* ── labs: independent failure ─────────────────────────────────────── */
  const LABS = [];
  T.lab = (id, fn) => LABS.push([id, fn]);
  function runLabs() {
    LABS.forEach(([id, fn]) => {
      const root = document.getElementById(id);
      if (!root) return;
      try { fn(root); }
      catch (err) {
        console.error('[lab ' + id + ']', err);
        root.innerHTML = '<div class="readout">This exhibit could not start in your browser. ' +
          'The caption below states what it shows, and the surrounding text does not depend on it.</div>';
      }
    });
  }

  /* progress summary for the front matter */
  T.progressSummary = function (chapters) {
    return chapters.map(ch => {
      const ids = ch.checks || [];
      const done = ids.filter(i => T.get('q.' + i, null) != null).length;
      return { id: ch.id, done, total: ids.length, pos: T.get('pos.' + ch.id, null) };
    });
  };

  function boot() {
    buildPanel(); wireTerms(); wireEquations(); wireChecks(); wireRecon();
    wireMoves(); wireProgress(); wireTheme(); runLabs();
    document.documentElement.setAttribute('data-ready', '1');
  }
  /* Boot after DOMContentLoaded, never earlier: deferred chapter scripts
     register their labs after this file executes, so booting on
     readyState === 'interactive' would silently skip every exhibit. */
  if (document.readyState === 'complete') setTimeout(boot, 0);
  else document.addEventListener('DOMContentLoaded', boot, { once: true });

  /* ── shared glossary: terms that recur across chapters ─────────────── */
  T.terms({
    'language-model': {
      t: 'language model',
      b: '<p>A system that assigns a probability to what comes next in a sequence of text. Given some context, it produces a number for <em>every</em> item in its vocabulary, and those numbers sum to 1.</p><p>Note what this definition does <b>not</b> claim: nothing about meaning, intent, or understanding. Everything else in this book is built on top of this one operation.</p>'
    },
    token: {
      t: 'token',
      b: '<p>The unit of text a model actually reads and predicts. Not a word and not a character, but a chunk chosen by a <span class="m">tokenizer</span> — often a whole common word, sometimes a word fragment, sometimes a single byte.</p><p>Chapter 2 builds one. Until then, read “token” as “the model’s atom of text”.</p>'
    },
    vocabulary: {
      t: 'vocabulary',
      b: '<p>The fixed, finite list of tokens a model can read or emit, decided before training and frozen for the model’s lifetime. Its size is written <span class="m">V</span>.</p><p>Every prediction the model makes is a probability distribution over exactly these <span class="m">V</span> items.</p>'
    },
    corpus: {
      t: 'corpus',
      b: '<p>The body of text a model learns from. Plural: corpora.</p><p>The corpus is not neutral background: what it contains, over-contains, and omits shows up later as model behaviour. Chapter 13 treats corpus construction as model design.</p>'
    },
    distribution: {
      t: 'probability distribution',
      b: '<p>An assignment of non-negative numbers to a set of outcomes that sums to 1. Here the outcomes are the <span class="m">V</span> tokens in the vocabulary.</p><p>“The model outputs a distribution” means: it gives every token a share of one unit of belief, and spending more on one token necessarily means spending less on the rest.</p>'
    },
    'cross-entropy': {
      t: 'cross-entropy loss',
      b: '<p>The average surprise, in <span class="m">log</span> units, that a model assigns to text it did not write. For one prediction it is <span class="m">−log p(actual next token)</span>; over a text, the average of that quantity.</p><p>Read in base 2 it is in bits: “how many yes/no questions of uncertainty remained”. Zero means certainty and correctness; infinity means the model called the truth impossible.</p>'
    },
    perplexity: {
      t: 'perplexity',
      b: '<p><span class="m">2</span> raised to the cross-entropy in bits. It converts average surprise into an <em>effective branching factor</em>: a perplexity of 12 means the model was, on average, as uncertain as someone choosing uniformly among 12 options.</p><p>Comparable only between models that share a tokenizer and a test text — different tokenizers change the denominator. See Chapter 2.</p>'
    },
    'held-out': {
      t: 'held-out data',
      b: '<p>Text deliberately kept out of training and used only for measurement. Performance on the training text tells you what a system memorised; performance on held-out text is the first honest evidence of generalisation.</p><p>When held-out text leaks into training, every measurement built on it becomes uninterpretable. That failure has a name — contamination — and Chapter 12 takes it seriously.</p>'
    },
    embedding: {
      t: 'embedding',
      b: '<p>A vector of numbers standing in for a discrete item, learned rather than hand-designed. A token embedding is a row of a lookup table with one row per vocabulary entry.</p><p>The vector is not a description of the token; it is whatever arrangement of numbers made the model’s prediction loss go down.</p>'
    },
    parameter: {
      t: 'parameter',
      b: '<p>A single number inside a model that training is free to change. Weights in matrices, biases, and every entry of the embedding table are parameters.</p><p>“A 7-billion-parameter model” counts these numbers. It says nothing directly about capability, and much about memory and cost.</p>'
    },
    'gradient-descent': {
      t: 'gradient descent',
      b: '<p>The training loop: measure the loss, compute for each parameter the direction that would increase it, and take a small step the other way.</p><p>The size of that step is the learning rate. Chapter 8 builds the mechanism; here you only need the shape — <em>loss goes down by nudging numbers</em>.</p>'
    },
    logit: {
      t: 'logit',
      b: '<p>One raw, unnormalised score the model produces for one vocabulary item, before any conversion into probability. Logits may be any real number, positive or negative.</p><p><span class="m">softmax</span> turns a vector of logits into a probability distribution: exponentiate each, then divide by the total.</p>'
    },
    softmax: {
      t: 'softmax',
      b: '<p>The standard way to turn <span class="m">V</span> arbitrary scores into a distribution over <span class="m">V</span> options: exponentiate every score, then divide each by the sum of all of them.</p><p>Two consequences worth carrying: it never assigns exactly zero, and because exponentials grow fast, small differences in scores become large differences in probability.</p>'
    },
    'dot-product': {
      t: 'dot product',
      b: '<p>Multiply two vectors component by component and add the results: a single number measuring how much they point the same way, scaled by their lengths.</p><p>It is the workhorse of this entire field. Prediction scores, attention weights, and similarity searches are all dot products underneath.</p>'
    }
  });
})();
