// Procedural question engine, v2 — now with a difficulty system.
// Every generator takes (rng, diff) where diff is 1 (easy), 2 (medium), 3 (hard).
// Pure data in, pure data out — no JSX here.
import { shuffle, pick } from "./rng";
import { VOCAB } from "./data/vocab";
import { ANALOGIES } from "./data/analogies";
import { ANTONYMS } from "./data/antonyms";

// Matrix generation lives in lib/matrix.js; other subtests in their modules.
export { genMatrix, SHAPES, FILLS } from "./matrix";
export { genArithmetic } from "./quant";
export { genWeights } from "./fluid";
export { genBlocks, genRotation } from "./spatial";

/* ================= Antonyms (Verbal Comprehension) ================= */
export function genAntonym(rng, exclude = new Set()) {
  const pool = ANTONYMS.map((a, i) => ({ a, i })).filter(({ i }) => !exclude.has(i));
  const { a: item, i: idx } = pool.length
    ? pool[Math.floor(rng() * pool.length)]
    : { a: ANTONYMS[0], i: 0 };
  const opts = [...item.opts].sort(() => rng() - 0.5);
  return {
    cat: "antonyms",
    diff: 2,
    bankIndex: idx,
    prompt: item.w,
    sub: "select the OPPOSITE",
    options: opts,
    correct: opts.indexOf(item.ans),
    explanation: item.note,
  };
}

/* ================= Number series ================= */
/* diff 1: single constant rule. diff 2: two-step or self-referential rules.
   diff 3: composed or accelerating rules. */
export function genSeries(rng, diff = 1) {
  const family =
    diff === 1
      ? pick(["arith", "geo"], rng)
      : diff === 2
      ? pick(["secondDiff", "alternating", "fib", "squaresK"], rng)
      : pick(["mulAdd", "sqDiffs", "factorialish", "interleavedGeo"], rng);

  let terms = [], ans = 0, explanation = "";

  if (family === "arith") {
    const a = 2 + Math.floor(rng() * 14), d = 3 + Math.floor(rng() * 8);
    terms = [0, 1, 2, 3, 4].map((i) => a + i * d);
    ans = a + 5 * d;
    explanation = `Constant step. Each term adds ${d}: ${terms.join(" → ")}. So ${terms[4]} + ${d} = ${ans}.`;
  } else if (family === "geo") {
    const a = 2 + Math.floor(rng() * 4), r = 2 + Math.floor(rng() * 2);
    terms = [0, 1, 2, 3, 4].map((i) => a * Math.pow(r, i));
    ans = a * Math.pow(r, 5);
    explanation = `Constant ratio. Each term multiplies by ${r}: ${terms.join(" → ")}. So ${terms[4]} × ${r} = ${ans}.`;
  } else if (family === "secondDiff") {
    const a = 1 + Math.floor(rng() * 8), d0 = 2 + Math.floor(rng() * 3), k = 1 + Math.floor(rng() * 3);
    terms = [a];
    let d = d0;
    for (let i = 0; i < 4; i++) {
      terms.push(terms[terms.length - 1] + d);
      d += k;
    }
    const diffs = terms.slice(1).map((t, i) => t - terms[i]);
    ans = terms[4] + d;
    explanation = `The gaps themselves grow. Differences are ${diffs.join(", ")} — each gap increases by ${k}. The next gap is ${d}, so ${terms[4]} + ${d} = ${ans}.`;
  } else if (family === "alternating") {
    const a1 = 3 + Math.floor(rng() * 8), d1 = 2 + Math.floor(rng() * 5);
    const a2 = 20 + Math.floor(rng() * 20), d2 = -(1 + Math.floor(rng() * 4));
    terms = [a1, a2, a1 + d1, a2 + d2, a1 + 2 * d1];
    ans = a2 + 2 * d2;
    explanation = `Two interleaved chains. Positions 1, 3, 5 step by +${d1} (${a1}, ${a1 + d1}, ${a1 + 2 * d1}); positions 2, 4 step by ${d2} (${a2}, ${a2 + d2}). The 6th term continues the second chain: ${a2 + d2} − ${Math.abs(d2)} = ${ans}.`;
  } else if (family === "fib") {
    const a = 1 + Math.floor(rng() * 4), b = a + 1 + Math.floor(rng() * 4);
    terms = [a, b];
    for (let i = 0; i < 3; i++) terms.push(terms[terms.length - 1] + terms[terms.length - 2]);
    ans = terms[4] + terms[3];
    explanation = `Each term is the SUM of the two before it (Fibonacci rule): ${terms[0]} + ${terms[1]} = ${terms[2]}, ${terms[1]} + ${terms[2]} = ${terms[3]}, and so on. Next: ${terms[3]} + ${terms[4]} = ${ans}.`;
  } else if (family === "squaresK") {
    const k = -2 + Math.floor(rng() * 7);
    const tag = k === 0 ? "" : k > 0 ? `+${k}` : `−${Math.abs(k)}`;
    terms = [1, 2, 3, 4, 5].map((n) => n * n + k);
    ans = 36 + k;
    explanation = `Perfect squares${k === 0 ? "" : k > 0 ? ` plus ${k}` : ` minus ${Math.abs(k)}`}: 1²${tag}=${terms[0]}, 2²${tag}=${terms[1]}, 3²${tag}=${terms[2]}… The 6th term is 6²${tag} = ${ans}.`;
  } else if (family === "mulAdd") {
    const a = 2 + Math.floor(rng() * 4), m = 2, add = 2 + Math.floor(rng() * 5);
    terms = [a];
    for (let i = 0; i < 4; i++) {
      const prev = terms[terms.length - 1];
      terms.push(i % 2 === 0 ? prev * m : prev + add);
    }
    ans = terms[4] * m; // ops applied: ×,+,×,+ -> next is ×
    explanation = `Two operations alternate: ×${m}, then +${add}, repeating. ${terms[0]} ×${m} = ${terms[1]}, ${terms[1]} +${add} = ${terms[2]}, ${terms[2]} ×${m} = ${terms[3]}, ${terms[3]} +${add} = ${terms[4]}. The next operation in the cycle is ×${m}: ${terms[4]} × ${m} = ${ans}.`;
  } else if (family === "sqDiffs") {
    const a = 1 + Math.floor(rng() * 10);
    terms = [a];
    for (let n = 1; n <= 4; n++) terms.push(terms[terms.length - 1] + n * n);
    ans = terms[4] + 25;
    const diffs = terms.slice(1).map((t, i) => t - terms[i]);
    explanation = `The differences are the perfect squares: ${diffs.join(", ")} (that's 1², 2², 3², 4²). The next difference is 5² = 25, so ${terms[4]} + 25 = ${ans}.`;
  } else if (family === "factorialish") {
    const a = 1 + Math.floor(rng() * 2);
    terms = [a];
    for (let m = 2; m <= 5; m++) terms.push(terms[terms.length - 1] * m);
    ans = terms[4] * 6;
    explanation = `The multiplier itself grows: ×2, ×3, ×4, ×5 (${terms[0]} ×2 = ${terms[1]}, ${terms[1]} ×3 = ${terms[2]}, …). The next step is ×6: ${terms[4]} × 6 = ${ans}.`;
  } else {
    // interleavedGeo: geometric chain interleaved with arithmetic chain
    const g = 2 + Math.floor(rng() * 3), d = 3 + Math.floor(rng() * 6), b = 5 + Math.floor(rng() * 10);
    terms = [g, b, g * 2, b + d, g * 4];
    ans = b + 2 * d;
    explanation = `Two interleaved chains with DIFFERENT rules. Positions 1, 3, 5 double each time (${g}, ${g * 2}, ${g * 4}); positions 2, 4 add ${d} (${b}, ${b + d}). The 6th term continues the adding chain: ${b + d} + ${d} = ${ans}.`;
  }

  const spread =
    diff >= 3
      ? [ans + 2, ans - 2, ans + 4, ans - 4, ans + 6, ans + 10]
      : [ans + 1, ans - 1, ans + 2, ans - 2, ans + 3, ans + 5];
  const offs = shuffle(spread, rng);
  const opts = shuffle([ans, ...offs.filter((o) => o !== ans && o > 0).slice(0, 3)], rng);
  return {
    cat: "series",
    diff,
    tpl: family,
    prompt: terms.join("   "),
    options: opts.map(String),
    correct: opts.indexOf(ans),
    explanation,
  };
}

/* ================= Verbal analogies ================= */
export function genAnalogy(rng, exclude = new Set(), diff = 0) {
  // diff 0 = any difficulty; otherwise prefer items whose d tag matches.
  let pool = ANALOGIES.map((a, i) => ({ a, i })).filter(({ i }) => !exclude.has(i));
  if (diff > 0) {
    const tier = pool.filter(({ a }) => (a.d || 1) === diff);
    if (tier.length) pool = tier;
  }
  if (!pool.length) pool = ANALOGIES.map((a, i) => ({ a, i }));
  const { a: item, i: idx } = pick(pool, rng);
  const opts = shuffle(item.opts, rng);
  return {
    cat: "analogies",
    diff: item.d || 1,
    bankIndex: idx,
    prompt: `${item.a.toUpperCase()} : ${item.b.toUpperCase()}  ::  ${item.c.toUpperCase()} : ?`,
    options: opts,
    correct: opts.indexOf(item.ans),
    explanation: `Relation — ${item.rel}. ${item.why}`,
  };
}

/* ================= Vocabulary ================= */
export function genVocabQ(word, rng, diff = 1) {
  // At higher difficulty, distractor definitions share the word's part of
  // speech, so you can't eliminate options on grammar alone.
  let candidates = VOCAB.filter((v) => v.w !== word.w);
  if (diff >= 2) {
    const samePos = candidates.filter((v) => v.pos === word.pos);
    if (samePos.length >= 3) candidates = samePos;
  }
  const others = shuffle(candidates, rng).slice(0, 3);
  const opts = shuffle([word, ...others], rng);
  return {
    cat: "vocab",
    diff,
    word,
    prompt: word.w,
    sub: word.pos,
    options: opts.map((o) => o.def),
    correct: opts.findIndex((o) => o.w === word.w),
    explanation: `${word.w} (${word.pos}) — ${word.def}. "${word.ex}" ${word.note}`,
  };
}
