# Voice and Style Guide
### *How Language Models Learned to Talk*

---

## The voice, in one line

**A good senior engineer walking a new hire through a design lineage.** Warm, mechanical, and honest about its own limits.

That's the synthesis. Not a professor (too much authority distance, too much formalism), not a YouTube explainer (too much affect, not enough load-bearing detail). The senior-engineer register does the work of both, because it's *already* a voice that says "here's why the last guy built it that way, here's what it cost him, here's why we stopped" — which is exactly the shape of this book.

It also inherits the right things from the three sources:

| Source | What the voice takes |
|---|---|
| **Hank Green** | Direct second-person address, transmitted delight, flagged simplification, people in the history, ending on stakes |
| **Feynman** | Mechanism over formalism, concrete case before general form, hostility to names-as-knowledge, refusal of false intuition |
| **First-principles framing** | Every mechanism enters as a response to a constraint; constant sorting of real constraints from inherited ones |

**Who "you" is.** A competent engineer who doesn't happen to know this field. Not a student to be managed. Not a novice to be protected. Someone who has debugged a real system, can read a diagram, and will notice if you're bluffing.

---

## The eighteen rules

### Sentence-level

**1. Second person, present tense, active voice.**
Passive voice hides the agent, and in this material the agent is always either a human making a design choice or a computation actually happening. Both matter too much to hide.
> ✅ You take the dot product of the two vectors.
> ❌ The dot product of the two vectors is taken.

**2. Verbs, not nominalizations.**
ML writing is chronically nominalized. Undo it every time.
> ✅ The model predicts the next token.
> ❌ Prediction of the subsequent token is performed by the model.

**3. Mostly short sentences, varied hard.**
A long clause-laden sentence, then a four-word one. This is where the energy lives, and it is the cheapest way to make dense material feel readable. Read every paragraph aloud; if it has no pulse, rewrite it.

**4. Never "just," "simply," or "merely."**
The single most important rule in this guide. "You just take the gradient" tells a math-anxious reader that the thing they're struggling with is beneath comment. It's a small injury and it accumulates. Same for "obviously," "clearly," and "trivially" — if it were obvious they wouldn't be reading.

**5. Enthusiasm is earned by the object, never asserted by the adverb.**
Don't write "amazingly" or "incredibly" or "this is mind-blowing." State the surprising thing plainly, then one short sentence of reaction. The reader supplies the amazement; your job is to get out of the way.
> ✅ Nobody designed that. It fell out of scale.
> ❌ Remarkably, this incredible capability emerged spontaneously!

### Structural

**6. Every mechanism enters as an answer to a pressure.**
Never open with what a thing *is*. Open with what was breaking. "The transformer consists of" is a banned sentence shape.

**7. Concrete case before general form. Always.**
The canonical sentence is the vehicle. No general statement of a mechanism before a worked instance of it. If you catch yourself writing the general form first, you've written the section backwards.

**8. End every unit on stakes and on the next bottleneck.**
Never on a summary bullet list. The last paragraph of a section is a door, not a filing cabinet.

**9. Track the reader's state out loud.**
> "If it's bothering you that we haven't said where the weights come from — good. That's the next section."

This costs one sentence and buys enormous goodwill. It tells the reader their confusion is on the syllabus rather than a personal failing. Use it especially right after introducing something incomplete.

### Honesty

**10. Name every simplification, in a consistent device.**
Recurring sidebar: **Where this breaks.** Give the clean version, then bound it. Engineering register, like the absolute-maximum-ratings box on a datasheet — not a joke, not an apology.

**11. Never fake intuition that doesn't exist.**
Recurring sidebar: **We don't know why this works.** Scaling laws get one of these. So do several interpretability results. This audience is completely comfortable with an empirical correlation that has no derivation — it's the epistemic status of half of fluid mechanics — and inventing a fake mechanism would cost you their trust for the rest of the book.

**12. No anthropomorphism.**
"The model produces," "the model was trained to," "the model assigns high probability to." Never wants, knows, understands, believes, decides, tries. When behavior *looks* intentional, that's an invitation to explain the mechanism, which is the whole point of the book. If a mentalistic phrase is genuinely the clearest option, flag it once as shorthand and move on.

**13. No neuroscience metaphors. At all.**
"Neurons," "inspired by the brain," "like how you learn." These are inherited constraints on how the field talks about itself, they're misleading, and they're unearned. Cut them.

### Vocabulary

**14. Real term, defined once, in-line, in plain words — then used normally forever.**
Bold on first use, one plain sentence of definition immediately adjacent, then treat it as known. No term appears before it's defined. No term lives only in a glossary. Do not soften the terminology; soften the explanation.

**15. Never explain jargon with more jargon.**
Test every definition: could a reader who knows nothing about this field parse the *explaining* clause? "Attention lets the model attend to relevant tokens" fails. Rewrite until it passes.

**16. Analogies must be concrete, mechanical, and bounded within two paragraphs.**
Draw from the reader's world: projections, valves, buses, bottlenecks, control loops, empirical correlations, non-dimensionalization, tolerance stacks. Every analogy gets a **Where this breaks** within two paragraphs of its introduction. An unbounded analogy is a future misconception with a delay fuse.

### Math

**17. Every equation is sandwiched.**
Plain-language sentence saying what it does → the equation → the shapes going in and out. Never an equation as the first appearance of an idea.

**18. If an equation won't be used again, cut it.**
Decorative math is worse than no math for this audience: it signals "this part is not for you" and costs a reader you don't get back.

---

## Banned phrases

Not stylistic preferences — each one is either empty, dishonest, or corrosive to this specific reader.

| Banned | Why |
|---|---|
| just / simply / merely | Minimizes the reader's real difficulty |
| obviously / clearly / trivially | If it were, they'd have skipped this |
| it's important to note that | Then note it |
| in this section, we will | Just do it |
| delve / dive into / unpack | Filler with a hat on |
| leverage / utilize | Use "use" |
| powerful / robust | Say what it does instead |
| revolutionary / groundbreaking / game-changing | Marketing |
| state-of-the-art | Stale before print |
| the model learns to understand | Anthropomorphism plus vagueness |
| inspired by the human brain | False and load-bearing-ly so |
| as we saw earlier | Say where |
| exclamation marks | One per chapter, maximum, and you probably don't need it |

---

## Worked passage

The opening of §5.3, on the seq2seq bottleneck. This is what the voice looks like at full strength — the pivot of the whole book, so it gets the best prose.

> By 2014, machine translation had a working design and a hard ceiling.
>
> The design was called **sequence-to-sequence**, and the idea is clean. One network reads the French sentence one word at a time, updating an internal state as it goes. When it reaches the end, that state is supposed to hold the meaning of the whole sentence. A second network takes that state and writes out the English, one word at a time.
>
> Now look at where the meaning has to fit. The encoder's final state is a fixed-size vector — say 1,000 numbers. Every French sentence, three words or sixty, gets compressed into exactly 1,000 numbers before a single English word comes out. Nothing downstream ever sees the source sentence. It sees the summary.
>
> You have met this shape before. It's a bottleneck in the ordinary fluid sense: one section whose capacity sets the capacity of the whole system, no matter how good the parts on either side are. And it fails like one. Sutskever's group reported that translation quality degraded as sentences got longer — which is what you'd predict from the diagram. Same 1,000 numbers, more meaning to carry.
>
> Bahdanau, Cho, and Bengio published the fix later that year, and it's almost embarrassingly direct: **stop throwing the intermediate states away.**
>
> The encoder already computed a state after every French word. Under seq2seq, all of them but the last get discarded. So keep them. Then, when the decoder is about to produce its fourth English word, don't hand it one summary — hand it all of the encoder's states, one per French word, and let it take a weighted average of them, choosing the weights itself.
>
> That's it. That's **attention**. It arrives in 2014 as a patch on a recurrent network, three years before anyone builds an architecture out of it, and every mechanism in the remaining nine chapters of this book is a variation on the paragraph you just read.
>
> If it's bothering you that we haven't said how the decoder picks the weights — good. That's §5.4. It's four steps, and you already have all four.

Note what's doing the work: the reader's own domain supplies the bottleneck concept; named humans with a date; no adverb of amazement anywhere; the mechanism stated in one imperative sentence; and the section ends by naming the reader's discomfort instead of papering over it.

---

## Before / after

The same content in the register to avoid:

> ❌ Sequence-to-sequence models utilize an encoder–decoder architecture in which the encoder maps the input sequence to a fixed-dimensional context vector, which is subsequently utilized by the decoder for generation. However, this approach suffers from an information bottleneck, particularly for longer sequences. To address this limitation, Bahdanau et al. (2014) introduced a powerful attention mechanism which allows the decoder to attend to all encoder hidden states.

Everything in it is true. It is four sentences long instead of eight paragraphs. And it teaches nothing, because it names the bottleneck instead of making you feel it, explains attention with the word "attend," and hides two humans and a design decision behind a citation.

---

## Per-section self-review checklist

Run this on every section before it's done:

- [ ] Opens with a pressure or failure, not a definition
- [ ] Concrete instance appears before any general form
- [ ] Every new term: bolded, defined in-line, in plain words
- [ ] No definition explained using other jargon
- [ ] Every analogy bounded by a **Where this breaks**
- [ ] Every equation sandwiched; every equation used again later
- [ ] Zero instances of just / simply / obviously / clearly
- [ ] Zero anthropomorphism, zero brain metaphors
- [ ] At least one named human with a date
- [ ] Reader's likely confusion named out loud at least once
- [ ] Closes on stakes and the next bottleneck
- [ ] Read aloud: the sentences have varied length and a pulse
