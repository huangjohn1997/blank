/* ═══════════════════════════════════════════════════════════════════════
   Corpora and counting machinery shared by Chapters 1–4.

   Two corpora, for two different jobs:

   • C.PROSE — natural narrative written for this book (so that it is
     free of licensing questions and small enough to count live in the
     browser). Split into a training part and a held-out part that the
     counting models never see. Used for n-gram counting, sampling,
     coverage, Zipf, and tokenizer training.

   • C.world() — a generated "small world" text over a ~50-token
     vocabulary with deliberate semantic structure. Used where we need
     embeddings to converge in a second on a phone, and where we need to
     control an association imbalance in order to watch it become
     geometry.

   Both are honest about scale: a real corpus is 10^6–10^9 times larger.
   Every exhibit that depends on that difference says so.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const C = (window.C = {});

  /* ── the narrative corpus ──────────────────────────────────────────── */
  C.PROSE = {
    title: 'The Harbour Light',
    note: 'Written for this book: about 1,100 words of narrative, plus a short held-out passage the counting models never see. It is smaller than a frontier training corpus by roughly ten orders of magnitude, and every exhibit that depends on that gap says so.',
    train: `
The keeper of the harbour light woke before the gulls. He filled the lamp with oil, trimmed the wick, and climbed the ninety steps to the lantern room. From the gallery he could see the whole of the little town: the market square, the row of grey houses along the quay, the river running down from the hills, and the long grey line of the sea. The keeper had climbed the ninety steps every morning for thirty years. He knew the sound of every stair. He knew which of the boats in the harbour would go out with the tide and which would stay tied to the quay, and he knew, by the colour of the water beyond the point, whether the fishermen would come back before dark.

In the town below, the baker was already at work. She lit the oven before dawn, because the oven took an hour to come up to heat, and the fishermen wanted bread before they went out. The baker had learned the trade from her mother, who had learned it from hers. She could tell by the smell of the dough whether the morning would be warm. When the bread came out of the oven she set the loaves on the sill to cool, and the smell went down the street and along the quay, and the men on the boats knew that the bread was ready.

The girl who carried the bread to the harbour was eleven years old. Every morning she took the basket from the baker, walked the length of the quay, and gave a loaf to each of the boats. The men paid her in coins, and sometimes in fish. She liked the fish better than the coins, because the coins went to her mother and the fish she could carry home herself. She knew the name of every boat in the harbour, and she knew that the keeper of the light would trade her a story for a loaf of bread.

The keeper had many stories. He had a story about the winter the harbour froze, and a story about the ship that came into the bay with no one aboard, and a story about the night the light went out. The girl liked the story about the night the light went out best of all, because in that story the keeper was young and afraid, and because he told it differently every time. Once the ship in the story was carrying grain. Once it was carrying coal. Once the keeper did not say what the ship was carrying, and the girl decided that this was the true version.

The market opened at eight. The farmers came down from the hills with grain and apples and cheese, and the fishermen came up from the quay with whatever the sea had given them, and for two hours the square was the loudest place in the town. A man sold rope. A woman sold cloth. The blacksmith mended what the winter had broken. By ten the square was quiet again, and the traders had gone back up the road to the hills, and the town went back to the sound of the water against the stones.

The storm came in September, out of the south, and it came faster than anyone expected. The keeper saw it first, from the gallery: a grey wall standing on the water an hour beyond the point. He rang the bell. The bell had hung in the lantern room for sixty years and had been rung eleven times, and every time it was rung the boats came in. The fishermen heard the bell and turned for the harbour. The baker heard the bell and shuttered the windows. The girl heard the bell and ran the length of the quay, counting the boats as they came, and when she had counted eleven she stopped, because there were twelve.

The twelfth boat belonged to a young man who had bought it that spring. He had bought it with money he did not have, and he had gone further out than the others because the fish were further out, and he did not hear the bell. The keeper watched the grey wall come across the water and he watched the small shape of the twelfth boat, and he did the only thing a keeper can do, which is to make the light as bright as it will go and to keep it turning.

The storm took the roof off the barn at the edge of the town and it took two windows out of the church and it broke the oldest boat in the harbour against the quay. It did not take the twelfth boat. The young man came in an hour after dark, with his sail gone and his hands cut, and he said afterwards that he had steered for the light the whole way, and that the light had never once faltered, and the keeper said that this was what the light was for.

The girl carried bread to the twelfth boat every morning after that, and the young man paid her in fish, and she carried the fish home to her mother. The baker put a loaf aside for the keeper each morning, and the girl carried it up the ninety steps, and the keeper told her a story, and slowly the story about the night the light went out changed into a story about the night the light stayed on.

Years went by in the way that years go by in a town beside the sea. The keeper grew old. His hands shook when he trimmed the wick, and the ninety steps took him twice as long as they had, and then three times as long. In the last winter he did not climb them at all. The girl, who was no longer a girl, climbed them for him. She filled the lamp with oil, and trimmed the wick, and kept the light turning, and in the morning she came down and told the old keeper what the water had looked like beyond the point.

When the men came from the city to fit the electric lamp, they said that the light would no longer need a keeper. The town was not sure whether this was a good thing. The light was brighter, and it did not need oil, and it did not go out. But no one climbed the ninety steps in the morning, and no one rang the bell, and no one stood in the gallery and looked at the colour of the water and knew what the day would be. The woman who had been the girl kept the key to the lantern room, and once a year, on the anniversary of the storm, she climbed the ninety steps and stood in the gallery and looked out past the point at the long grey line of the sea.
`,
    test: `
The new keeper of the harbour light was not a keeper at all but a machine in a grey box, and it woke before the gulls because it never slept. In the town below, the baker's grandson lit the oven before dawn, because the oven still took an hour to come up to heat, and the fishermen still wanted bread before they went out. The boats went out with the tide. The market opened at eight, and the farmers came down from the hills with grain, and by ten the square was quiet again. In September a storm came in out of the south, faster than anyone expected, and no bell rang, because there was no longer a bell to ring; but every radio in the harbour spoke at once, and the boats turned for the light, and the light did not falter, because the light had never once been the part that faltered.
`
  };

  /* ── tokenising for the counting models ────────────────────────────── */
  /* Deliberately crude: lowercase, split on whitespace, peel punctuation
     into its own tokens. Chapter 2 replaces this with a learned tokenizer
     and explains why nobody does it this way any more. */
  C.words = function (text) {
    return text
      .toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/[—–]/g, ' ')
      .replace(/([.,:;!?()"])/g, ' $1 ')
      .split(/\s+/)
      .filter(Boolean);
  };

  let _tr = null, _te = null;
  C.trainTokens = function () { return (_tr = _tr || C.words(C.PROSE.train)); };
  C.testTokens = function () { return (_te = _te || C.words(C.PROSE.test)); };

  C.counts = function (toks) {
    const m = new Map();
    toks.forEach(t => m.set(t, (m.get(t) || 0) + 1));
    return m;
  };
  C.types = function (toks) { return C.counts(toks).size; };

  /* ── n-gram counting model ─────────────────────────────────────────── */
  /* model.table : Map<contextString, {total, next: Map<token,count>}>
     Context for n = 1 is the empty string (a unigram model). */
  const _cache = {};
  C.ngram = function (n, toks) {
    const key = 'n' + n;
    if (!toks && _cache[key]) return _cache[key];
    const T = toks || C.trainTokens();
    const table = new Map();
    for (let i = n - 1; i < T.length; i++) {
      const ctx = n === 1 ? '' : T.slice(i - n + 1, i).join(' ');
      let e = table.get(ctx);
      if (!e) { e = { total: 0, next: new Map() }; table.set(ctx, e); }
      e.total++;
      e.next.set(T[i], (e.next.get(T[i]) || 0) + 1);
    }
    const model = { n, table, V: C.counts(T).size, tokens: T.length };
    if (!toks) _cache[key] = model;
    return model;
  };

  /* Distribution over next tokens given a context, with optional add-k
     smoothing spread over the whole vocabulary. Returns the top rows plus
     the mass that smoothing moved onto everything unseen. */
  C.dist = function (model, ctxTokens, k, top) {
    const n = model.n;
    const ctx = n === 1 ? '' : ctxTokens.slice(-(n - 1)).join(' ');
    const e = model.table.get(ctx);
    const V = model.V;
    k = k || 0;
    const rows = [];
    let seenMass = 0, denom;
    if (!e) {
      denom = k * V;
      return { ctx, found: false, rows: [], V, denom, unseenP: denom ? k / denom : 1 / V, total: 0 };
    }
    denom = e.total + k * V;
    e.next.forEach((c, t) => {
      const p = (c + k) / denom;
      rows.push({ tok: t, count: c, p });
      seenMass += p;
    });
    rows.sort((a, b) => b.p - a.p || (a.tok < b.tok ? -1 : 1));
    return {
      ctx, found: true, rows: top ? rows.slice(0, top) : rows, allRows: rows,
      V, denom, total: e.total, seenMass, unseenP: k ? k / denom : 0,
      unseenTypes: V - e.next.size
    };
  };

  /* Generation. Pure counting model: when a context has never been seen,
     the model has nothing to say — we report that rather than hide it. */
  C.sample = function (n, opts) {
    opts = opts || {};
    const model = C.ngram(n);
    const rnd = opts.rnd || Math.random;
    const T = C.trainTokens();
    const maxLen = opts.len || 60;
    let out;
    if (opts.seedText && opts.seedText.length) out = opts.seedText.slice();
    else {
      const start = Math.floor(rnd() * (T.length - n));
      out = T.slice(start, start + Math.max(1, n - 1));
    }
    let deadEnd = false;
    while (out.length < maxLen) {
      const d = C.dist(model, out, 0);
      if (!d.found || !d.allRows || !d.allRows.length) { deadEnd = true; break; }
      let rows = d.allRows;
      const temp = opts.temp == null ? 1 : opts.temp;
      let ps;
      if (temp === 1) ps = rows.map(r => r.p);
      else {
        const z = rows.map(r => Math.log(Math.max(r.p, 1e-12)) / Math.max(temp, 0.01));
        const m = Math.max.apply(null, z), ez = z.map(v => Math.exp(v - m));
        const s = ez.reduce((a, b) => a + b, 0);
        ps = ez.map(v => v / s);
      }
      let u = rnd(), i = 0;
      while (i < ps.length - 1 && (u -= ps[i]) > 0) i++;
      out.push(rows[i].tok);
    }
    return { tokens: out, deadEnd };
  };

  /* How much of unseen text does a counting model have any opinion about? */
  C.coverage = function (n) {
    const model = C.ngram(n), T = C.testTokens();
    let ctxSeen = 0, gramSeen = 0, total = 0;
    for (let i = n - 1; i < T.length; i++) {
      total++;
      const ctx = n === 1 ? '' : T.slice(i - n + 1, i).join(' ');
      const e = model.table.get(ctx);
      if (e) { ctxSeen++; if (e.next.has(T[i])) gramSeen++; }
    }
    return { n, total, ctxSeen, gramSeen, ctxUnseen: total - ctxSeen, gramUnseen: total - gramSeen };
  };

  /* Cross-entropy in bits per token on held-out text, under add-k. */
  C.score = function (n, k, toks) {
    const model = C.ngram(n), T = toks || C.testTokens();
    let bits = 0, count = 0, infinite = 0;
    for (let i = n - 1; i < T.length; i++) {
      const d = C.dist(model, T.slice(Math.max(0, i - n + 1), i), k);
      let p;
      if (!d.found) p = k ? 1 / model.V : 0;          // unseen context: uniform under smoothing, nothing without
      else {
        const row = (d.allRows || []).find(r => r.tok === T[i]);
        p = row ? row.p : (k ? k / d.denom : 0);
      }
      count++;
      if (p <= 0) { infinite++; }
      else bits += -Math.log2(p);
    }
    const avg = infinite ? Infinity : bits / count;
    return { n, k, bits: avg, ppl: infinite ? Infinity : Math.pow(2, avg), count, infinite };
  };

  C.zipf = function (toks) {
    const m = C.counts(toks || C.trainTokens());
    return Array.from(m.entries())
      .map(([tok, c]) => ({ tok, c }))
      .sort((a, b) => b.c - a.c || (a.tok < b.tok ? -1 : 1))
      .map((r, i) => ({ ...r, rank: i + 1 }));
  };

  /* ── the generated "small world" ───────────────────────────────────── */
  const LEX = {
    animals: ['dog', 'cat', 'wolf', 'sparrow', 'trout', 'horse'],
    foods: ['bread', 'meat', 'grain', 'fish', 'apples', 'cheese'],
    roles: ['keeper', 'baker', 'sailor', 'farmer', 'nurse', 'engineer', 'doctor', 'teacher'],
    places: ['harbour', 'market', 'river', 'kitchen', 'barn', 'town'],
    motion: ['runs', 'walks', 'sails', 'rides'],
    consume: ['eats', 'drinks', 'tastes']
  };
  C.LEX = LEX;

  /* Roles carry a controllable pronoun association. skew = 0 gives every
     role the same 50/50 pronoun distribution; skew = 1 gives the strongest
     imbalance. Nothing else about the corpus changes. */
  const ROLE_TILT = { nurse: -1, teacher: -0.7, doctor: 0.7, engineer: 1, sailor: 0.8, keeper: 0.4, baker: -0.3, farmer: 0.5 };

  C.world = function (opts) {
    opts = opts || {};
    const skew = opts.skew == null ? 0.85 : opts.skew;
    const nSent = opts.n || 2400;
    const rnd = T_rng(opts.seed || 11);
    const pick = a => a[Math.floor(rnd() * a.length)];
    const sents = [];
    for (let i = 0; i < nSent; i++) {
      const r = rnd();
      if (r < 0.20) sents.push(['the', pick(LEX.animals), pick(LEX.consume), 'the', pick(LEX.foods)]);
      else if (r < 0.34) sents.push(['the', pick(LEX.roles), pick(LEX.consume), 'the', pick(LEX.foods)]);
      else if (r < 0.46) sents.push(['the', pick(LEX.animals), pick(LEX.motion), 'by', 'the', pick(LEX.places)]);
      else if (r < 0.58) sents.push(['the', pick(LEX.roles), pick(LEX.motion), 'to', 'the', pick(LEX.places)]);
      else if (r < 0.66) sents.push(['the', pick(LEX.animals), 'sleeps', 'in', 'the', pick(LEX.places)]);
      else if (r < 0.74) sents.push(['the', pick(LEX.roles), 'works', 'in', 'the', pick(LEX.places)]);
      else if (r < 0.80) sents.push(['the', pick(LEX.animals), 'drinks', 'at', 'the', 'bank', 'of', 'the', 'river']);
      else if (r < 0.86) sents.push(['the', pick(LEX.roles), 'walks', 'to', 'the', 'bank', 'in', 'the', 'town']);
      else if (r < 0.90) sents.push(['the', 'bank', 'lends', 'money', 'to', 'the', pick(LEX.roles)]);
      else {
        const role = pick(LEX.roles);
        const tilt = (ROLE_TILT[role] || 0) * skew;      // −1 → she, +1 → he
        const pHe = 0.5 + 0.5 * tilt;
        sents.push(['the', role, 'said', rnd() < pHe ? 'he' : 'she', 'was', 'tired']);
      }
    }
    const toks = [];
    sents.forEach(s => { s.forEach(w => toks.push(w)); toks.push('.'); });
    const vocab = Array.from(new Set(toks)).sort();
    const idOf = {};
    vocab.forEach((w, i) => (idOf[w] = i));
    return { sents, tokens: toks, vocab, idOf, skew, classOf: classOf };
  };

  function classOf(w) {
    if (LEX.animals.indexOf(w) >= 0) return 'animal';
    if (LEX.foods.indexOf(w) >= 0) return 'food';
    if (LEX.roles.indexOf(w) >= 0) return 'role';
    if (LEX.places.indexOf(w) >= 0) return 'place';
    if (LEX.motion.indexOf(w) >= 0 || LEX.consume.indexOf(w) >= 0 ||
        ['sleeps', 'works', 'walks', 'lends', 'said', 'was'].indexOf(w) >= 0) return 'verb';
    if (['he', 'she'].indexOf(w) >= 0) return 'pronoun';
    return 'other';
  }
  C.classOf = classOf;

  function T_rng(seed) {
    let s = seed >>> 0 || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  /* Context signature: how often each token appears within a window of
     the target. The raw material of Chapter 4. */
  C.signatures = function (world, win) {
    win = win || 2;
    const V = world.vocab.length, idOf = world.idOf, toks = world.tokens;
    const sig = {};
    world.vocab.forEach(w => (sig[w] = new Float64Array(V)));
    for (let i = 0; i < toks.length; i++) {
      const w = toks[i];
      if (w === '.') continue;
      for (let d = -win; d <= win; d++) {
        if (!d) continue;
        const j = i + d;
        if (j < 0 || j >= toks.length) continue;
        if (toks[j] === '.') continue;
        sig[w][idOf[toks[j]]]++;
      }
    }
    return sig;
  };
})();
