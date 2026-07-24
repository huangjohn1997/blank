# How Language Models Learned to Talk
### A survey course on the history and mechanics of large language models
*Designed for non-CS undergraduates with engineering intuition and rusty math*

---

## 0. Design brief

**Target student.** A junior/senior mechanical engineering major. Has taken calculus, differential equations, statics/dynamics, thermo, and probably a controls or signals course. Is *not* bad at math — is bad at *symbol-pushing without physical meaning*. Will happily reason about steepest descent, weighted averages, power-law fits, feedback loops, and dimensional analysis. Will disengage instantly at a proof.

**Two goals, held in tension:**
1. **Historical literacy** — know the sequence of ideas and why each one arrived when it did.
2. **Mechanical literacy** — be able to draw the data flow through a transformer from memory and say what each block does and why it's there.

**The resolution:** history is the *spine*, mechanism is the *meat*. Every unit follows the same four-beat structure:

> **(1) What broke.** The concrete failure of the previous state of the art.
> **(2) The fix.** The one new mechanical idea, taught properly.
> **(3) The lab.** Students touch it, break it, measure it.
> **(4) The new bottleneck.** Which sets up next week.

This is how engineers actually think about design lineage, and it means no mechanism is ever introduced unmotivated.

---

## 1. The math budget

State this on day one and never violate it. **The entire course uses four mathematical objects.**

| Object | What it means here | Engineering hook |
|---|---|---|
| **Vector** | A thing's coordinates in "meaning space" | State vector; a point in phase space |
| **Dot product** | How aligned two things are | Projection; work = F·d; correlation |
| **Softmax** | Turn raw scores into weights that sum to 1 | Boltzmann distribution; temperature literally is temperature |
| **Gradient descent** | Roll downhill on an error surface | Steepest descent; any optimization they've seen |

Everything else in the course — attention, embeddings, MLP blocks, LayerNorm, the whole transformer — is these four composed. Say it in week 1, then explicitly point at the budget every time you use one. Students stop bracing for new math around week 4, and that's when real learning starts.

**Corollary — things to deliberately *not* teach:**
- Backpropagation derivations. Teach it as "the chain rule, run automatically, at scale." One conceptual lecture, zero derivations.
- Probability theory beyond "these numbers sum to 1."
- Anything requiring matrix calculus notation.
- Optimizer internals (Adam is "gradient descent with momentum and per-parameter step sizes" — done).

---

## 2. Two unifying devices

These are what make the course feel designed rather than assembled. Use both relentlessly.

### 2.1 The canonical sentence

Pick one sentence in week 1 and trace it through **every single architecture** all semester:

> `The engineer torqued the bolt until it ___`

- **Week 2 (n-gram):** count how often each word follows "until it" in a corpus. Get `was`, `is`, `stopped`.
- **Week 4 (word2vec):** show that `bolt` and `screw` are neighbors, `bolt` and `bolted` are not as close as you'd hope, and `torqued` has no context-dependence at all.
- **Week 6 (LSTM):** watch the hidden state carry "engineer" forward, and watch it forget by word 40.
- **Week 8 (transformer):** show the attention heads. One head links `it` → `bolt`. Show it. This is the moment the course lands.
- **Week 11 (RLHF'd chat model):** ask the same thing and get a helpful paragraph about fastener torque specs. Ask *why the behavior changed* when the mechanism didn't.

Same sentence, eight architectures, one semester. Students see the capability ratchet with their own eyes on a fixed input.

### 2.2 The tensor free-body diagram

ME students already do dimensional bookkeeping — it's how they catch their own errors. Reuse the habit directly.

Require every architecture sketch to be annotated with **shapes**: `[batch, tokens, d_model]` in, what each block does to those dimensions, and shapes out. Grade it like a free-body diagram: did you account for everything, do the dimensions reconcile, is every arrow labeled.

This single move converts "incomprehensible deep learning diagram" into a familiar genre of engineering drawing, and it makes attention's shape gymnastics (`[tokens, tokens]` attention matrix from `[tokens, d_head]` inputs) something they can *check* rather than accept.

---

## 3. Course arc

Eight parts, 14 weeks. Compressions for a 10-week quarter noted in §7.

### Part I — Prediction as the whole game (Weeks 1–2)

**Historical anchor:** Shannon, *A Mathematical Theory of Communication* (1948) and *Prediction and Entropy of Printed English* (1951).

The single most important idea in the course, and it predates neural networks by 60 years: **a model of language is a machine that assigns probabilities to what comes next, and getting good at that requires understanding.** Everything after this is engineering.

- Shannon's guessing game, run live in class with students guessing letters. Compute the class's entropy estimate on the board.
- Prediction ⇄ compression. If you can predict it, you don't have to send it. This reframing pays off all semester (and explains why "just autocomplete" is a category error).
- n-gram models built by hand from a small corpus. Bigrams, trigrams. Generate text. It's funny, it's local, it has no memory.
- **The wall:** vocabulary of 50,000 words means a trigram table has 10^14 cells. You will never see most of them. Sparsity is not a tuning problem, it's a wall. (Bengio's "curse of dimensionality" framing, 2003.)

**Lab 1:** Build a bigram and trigram generator on a corpus of their choosing. Plot Zipf's law from their own data. Watch quality improve with n, then watch it collapse into memorized quotes at n=6.

### Part II — Words become vectors (Weeks 3–4)

**Historical anchors:** Bengio et al., *A Neural Probabilistic Language Model* (2003); Mikolov et al., word2vec (2013); Pennington et al., GloVe (2014).

- The distributional hypothesis: "you shall know a word by the company it keeps." Meaning as *position*, not definition.
- Cosine similarity — pure dot product, from the math budget. This is where the budget starts earning trust.
- The famous analogies (`king - man + woman ≈ queen`) — and immediately, honestly, their limits and the cherry-picking critique.
- Why this beats n-grams: `bolt` and `screw` now *share* statistical evidence. Generalization instead of counting.
- **The wall:** one vector per word, forever. `bank` has one vector. Word order is discarded. There is no such thing as context.

**Lab 2:** Explore pretrained embeddings — nearest neighbors, analogies, and a required deliverable: *find and document three places the embedding space is wrong or biased.* Then project to 2D and look at the clusters.

### Part III — Memory, and the bottleneck that broke it (Weeks 5–6)

**Historical anchors:** Elman RNN (1990); Hochreiter & Schmidhuber, LSTM (1997); Sutskever et al., seq2seq (2014); Bahdanau et al., attention (2014).

- RNNs as a **discrete-time state-space system**. For an ME who has seen controls, this is a gift: `h[t+1] = f(h[t], x[t])`. Same object, new application.
- Vanishing gradients as a stability/decay problem — repeated multiplication by something < 1. They've seen this.
- LSTM gates as **valves on an information pipe**: what to write, what to keep, what to read. Draw it as a plumbing diagram, not equations.
- seq2seq for translation, and the fatal design flaw: the entire source sentence squeezed through **one fixed-size vector**. Name it what it is — a bottleneck, in the fluid sense.
- Bahdanau's fix: let the decoder *look back* at all encoder states and take a weighted average, with weights it computes itself. **This is attention.** It arrives in 2014 as a patch on RNNs, three years before it becomes the whole architecture. Historically this is the pivot of the entire course, and teaching attention here — as a fix to a bottleneck the students already feel — is far more effective than introducing it inside the transformer.

**Lab 3:** Train a small character-level RNN and LSTM on the same data. Plot loss curves. Then feed both a long-range dependency and show the RNN failing where the LSTM holds. Measure where the LSTM fails too.

### Part IV — The transformer (Weeks 7–8) ← *the center of the course*

**Historical anchor:** Vaswani et al., *Attention Is All You Need* (2017).

Budget two full weeks. Everything before this was setup; everything after is scale and steering.

**Week 7 — the mechanism.**
- The radical move: throw away recurrence, keep only attention. Why? Because recurrence is *sequential* and sequential means you cannot use a GPU properly. **The transformer is, in large part, an architecture designed for the hardware.** Say this out loud — it's the most engineering-legible fact in the course.
- Query/Key/Value as a **soft database lookup**: each token asks a question (Q), every token advertises what it has (K), match strength is a dot product, softmax turns matches into weights, and you take a weighted average of the answers (V). Four steps, all inside the math budget.
- Multi-head attention as **parallel sensor channels** — different heads track different relationships (syntax, coreference, position). Show real heads with a visualization tool; do not describe them, show them.
- Positional encoding: if you removed order, you must add it back. Explain why the sinusoidal scheme is a set of clocks at different frequencies — Fourier intuition they already have.
- The residual stream as a **shared bus** each layer reads from and writes to. This framing (from later interpretability work) is anachronistic but so much clearer than "skip connections" that it's worth the sin.
- LayerNorm as **normalization/non-dimensionalization** to keep signals in range.

**Week 8 — the full stack.**
- Assemble the block: attention → MLP → repeat N times. Attention *moves information between positions*; the MLP *processes information at a position*. That's the whole division of labor.
- Tokenization (BPE) — taught here and never skipped, because it explains a huge fraction of the weird behavior students will encounter. Show them `strawberry` and the letter-counting failure. Show a tokenizer visualizer.
- Encoder vs. decoder vs. encoder-decoder, and causal masking.
- **Full end-to-end trace of the canonical sentence** through a real small model, with shapes annotated at every step.

**Lab 4 (two weeks, the midterm artifact):** Train a small GPT from scratch — Karpathy's nanoGPT or makemore is the right scaffold. The math is pre-written; students do **ablations, not derivations**: remove positional encoding, remove the MLP, use one head instead of eight, shrink the context window. Report loss and sample quality for each. Deliverable is a lab report in the format they already know from ME labs: hypothesis, method, data, discussion.

### Part V — Pretraining and scale (Weeks 9–10)

**Historical anchors:** ELMo (2018), BERT (2018), GPT-1/2/3 (2018–2020), Kaplan scaling laws (2020), Chinchilla (2022).

- The paradigm shift: stop training task-specific models. Pretrain once on everything, then adapt. Transfer learning arrives in NLP.
- BERT (bidirectional, masked, an *encoder* — great at understanding, can't generate) vs. GPT (causal, autoregressive, a *decoder* — generates). Why the generative branch won the public.
- GPT-2's staged release and the first serious "should we ship this" argument. Good discussion seminar.
- GPT-3 and **in-context learning** — the genuinely surprising empirical result that a big enough next-word predictor learns new tasks from examples in the prompt, with no weight updates. Emphasize that nobody designed this. It fell out of scale.
- **Scaling laws as empirical power-law correlations.** This is the most ME-native topic in the course. Loss vs. compute on a log-log plot is a straight line. It is exactly a Moody diagram, a drag correlation, an S-N fatigue curve: an empirical fit that works, with no first-principles derivation. Then Chinchilla: the field was systematically under-training on data relative to parameters, and a better fit changed everyone's design point.
- Sutton's *Bitter Lesson* as the reading, paired against it.

**Lab 5:** Give students a table of real models (params, tokens, training FLOPs, reported loss/benchmark). Have them fit the power law themselves, plot it, and extrapolate. Then have them find where the extrapolation is known to fail. Straight dimensional-analysis muscle.

### Part VI — Steering: from text predictor to assistant (Weeks 11–12)

**Historical anchors:** FLAN / T5 instruction tuning (2021–22), InstructGPT (2022), Constitutional AI (2022), ChatGPT (Nov 2022), GPT-4 (2023), DPO (2023).

The most under-taught part of LLM history and the part that actually explains the product students use.

- The gap: a raw pretrained model *completes documents*. It does not answer questions. Show a base model vs. a chat model on the same prompt — this demo is worth an entire lecture.
- **Supervised fine-tuning:** show it what good answers look like.
- **RLHF as a control loop.** Collect human preference comparisons → fit a reward model (a learned sensor for "did humans like this") → optimize the policy against it. Draw it as a block diagram with a feedback path, because that's what it is. Then talk about **reward hacking as sensor gaming** — optimizing the measurement instead of the thing. Every controls student understands this failure mode immediately.
- Constitutional AI / RLAIF: replace some human labeling with model-generated critique against written principles.
- DPO: skip the separate reward model, optimize preferences directly. Simpler, and the direction the field moved.
- **Why ChatGPT was the moment.** Not a new architecture. A new *interface* on a steered model. Genuinely important history: the capability existed and almost nobody noticed until the wrapper changed.
- System prompts, chat templates, refusals, sycophancy, and the honest observation that "personality" is a training artifact.

**Lab 6:** Prompt-engineering-as-experiment. Same task, systematically varied prompts, measured accuracy across n trials with variance reported. Framed explicitly as **an instrument calibration lab** — the model is a noisy instrument and you are characterizing it. This kills magical thinking better than any lecture.

### Part VII — The current era (Week 13)

Fast-moving, so teach the *categories* rather than the leaderboard. Frame each as a response to a specific pressure.

| Pressure | Response |
|---|---|
| Inference is expensive | KV caching, quantization, FlashAttention, speculative decoding, distillation |
| Dense models waste compute | Mixture-of-experts — route each token to a few specialists |
| Context is too short | Long-context attention variants, position-encoding extensions (RoPE and friends) |
| Models don't know your data | RAG — retrieve, then condition on what you retrieved |
| Models can't act | Tool use, function calling, agents |
| Hard problems need more thinking | **Inference-time compute** — chain-of-thought, then RL on verifiable rewards (math, code) to train models that reason before answering. The 2024–25 shift, and the reason "scale the pretraining run" is no longer the only axis. |
| Closed weights concentrate power | Open-weight model families and the ecosystem around them |

Emphasize the meta-story: **the field moved from "scale the training run" to "scale the training run *and* the thinking time."** That's a second scaling axis, and it reframes the Part V power laws.

**Lab 7:** Run a small open-weight model locally (Ollama or llama.cpp). Feel the tokens-per-second. Change quantization and watch the quality/speed/memory trade. Nothing demystifies an LLM faster than one running on their own laptop with the fan on.

### Part VIII — Honest accounting (Week 14)

Not a bolted-on ethics week. A *failure-mode analysis*, which is a standard engineering deliverable.

- **Hallucination as a mechanism, not a mystery.** The model is trained to produce likely continuations, not true ones. Nothing in the objective rewards abstention. Connect back to Week 1: it's a probability machine, and it always has been.
- Calibration, and why "confidently wrong" is the expected behavior of an uncalibrated system.
- Evaluation and benchmark contamination — why leaderboard numbers are soft.
- Interpretability: what we actually know (induction heads, features, some circuits) and how much we don't.
- Compute, energy, and cost economics. Water and power per training run. Real numbers.
- Data provenance, labor behind preference data, copyright.
- Where the historical trend line might break.

---

## 4. Weekly rhythm

Keep it identical every week so students spend zero effort on logistics.

| Component | Time | Purpose |
|---|---|---|
| **Mechanism lecture** | 75 min | The one new idea, taught with diagrams and the canonical sentence |
| **Paper seminar** | 50 min | One primary source, discussed against three fixed questions |
| **Lab** | 110 min | Hands-on, Colab, math pre-written, ablation-driven |
| **Timeline ritual** | 5 min | Add this week's models to the wall timeline |

**The three fixed seminar questions**, used for every paper all semester:
1. What was broken before this paper?
2. What is the one new idea, in two sentences and one sketch?
3. What did it cost — compute, data, complexity, or new failure modes?

Students read primary sources from week 1. Most of the landmark LLM papers are readable by a motivated non-specialist if you tell them to skip §4 and the appendices, and give them the three questions as a filter. Do tell them to skip the math they can't parse — permission to skim is what makes primary-source reading survivable.

---

## 5. The wall timeline

Physical, cumulative, and the single best "beautiful" artifact in the course. A long strip of butcher paper, 1948 on the left, present day on the right. Every week, students add cards for that week's models with:

- Name, year, lab
- Parameters, training tokens, training FLOPs (when public)
- The one-line "what it fixed"

By week 14 the wall shows three things no lecture can: the **arrival of the exponential** around 2018, the **long slow prehistory** before it, and the **branching** into open/closed, dense/MoE, reasoning/non-reasoning. Students photograph it constantly. Make the same data available as a shared spreadsheet so Lab 5's power-law fit uses numbers they collected themselves.

---

## 6. Assessment

No closed-book exams with derivations — they'd test exactly the skill this audience doesn't have and doesn't need.

| Component | Weight | Form |
|---|---|---|
| Weekly mechanism sketch | 20% | One page, hand-drawn, shapes annotated. Graded like a free-body diagram. |
| Paper responses | 15% | Three questions, ~300 words, 10 of 13 weeks |
| Labs 1–3, 5–7 | 25% | ME-format lab reports |
| Midterm: build-a-GPT (Lab 4) | 20% | Working model + ablation study + report |
| Capstone | 20% | See below |

**Capstone, two tracks, student's choice:**

- **Track A — Empirical.** Pick a claim about LLM behavior. Design an experiment. Run it with enough trials to report variance. Write it up. ("Does chain-of-thought help on this task family?" "Where does this model's arithmetic break?" "How does quantization affect factual recall?")
- **Track B — Historical.** Take one idea and trace it end to end: where it came from, who resisted it, what it displaced, what it cost, and where it stands now. Attention, tokenization, MoE, RLHF, and scaling laws all support a strong version of this.

Both end in a **poster session** at the wall timeline. Posters are a format ME students already know, they force clarity, and they make the last day of the course feel like something.

---

## 7. Compressions and variants

**10-week quarter.** Merge Parts I and II into two weeks (n-grams and embeddings together). Cut Part III to one week — LSTMs as history, but keep Bahdanau attention, it's load-bearing. Keep two weeks on the transformer, non-negotiable. Merge Parts VII and VIII into one week. Drop Lab 5 and fold the power-law fit into a lecture demo.

**No-code / general-education variant.** Replace Lab 4 (build-a-GPT) with a guided walkthrough of an existing implementation plus a much heavier interpretability-visualization lab. Keep every other lab; they're all runnable by someone who can edit a Colab cell.

**Heavier-math variant.** If the room turns out to be stronger than expected, the natural additions are the actual softmax-attention algebra with explicit matrices, the scaling-law fit as a real regression with error bars, and one lecture on backprop through a two-layer net by hand. Add these as *optional* appendix sessions rather than raising the floor — the math budget is a promise, and breaking it midway costs you the anxious students permanently.

---

## 8. Failure modes to avoid

Things that reliably wreck this course:

1. **Starting with the transformer.** It looks arbitrary without the bottleneck it was built to escape. Six weeks of setup is not a delay, it's the reason the mechanism makes sense.
2. **Skipping tokenization.** It's boring to teach and it explains an enormous share of observed weirdness. Teach it.
3. **Teaching backprop derivations.** Highest cost, lowest return, for this audience.
4. **Chasing the news cycle.** Anything model-specific will be stale by the time you teach it twice. Teach pressures and responses; let students slot new releases into the pressure table themselves.
5. **Anthropomorphizing.** Say "the model produces" and "the model was trained to," not "the model wants" or "the model knows." Students inherit your framing exactly.
6. **Treating ethics as an appendix.** Reframed as failure-mode analysis and distributed across units, it lands. As a final-week bolt-on, it reads as optional.
7. **Letting labs become tutorials.** The value is in the ablation and the measurement, not in running the provided cells. Every lab needs a "break it and report what happened" requirement.

---

## 9. Tooling

All free or near-free, all browser-based unless noted.

- **Colab** for every lab. GPU tier is sufficient through Lab 4.
- **nanoGPT / makemore** (Karpathy) as the build-a-GPT scaffold. His *Zero to Hero* videos are the right optional-supplement for the strongest students.
- **A tokenizer visualizer** for the BPE lecture.
- **An embedding projector** for Lab 2.
- **An attention-visualization library** (BertViz or circuitsvis) for Week 7 — this is where the canonical sentence pays off, so budget setup time.
- **Ollama or llama.cpp** for Lab 7's local model. Verify it runs on the weakest laptop in the room *before* assigning it.
- **A shared spreadsheet** mirroring the wall timeline, feeding Lab 5.
