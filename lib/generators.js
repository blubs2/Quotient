// Procedural question engine, v2 — now with a difficulty system.
// Every generator takes (rng, diff) where diff is 1 (easy), 2 (medium), 3 (hard).
// Pure data in, pure data out — no JSX here.
import { shuffle, pick } from "./rng";
import { VOCAB } from "./data/vocab";
import { ANALOGIES } from "./data/analogies";

export const SHAPES = ["circle", "square", "triangle", "diamond"];
const ROTATABLE = ["square", "triangle", "diamond"];
export const FILLS = ["outline", "half", "solid"];

/* ================= Matrix reasoning (Raven's-style) ================= */
/* diff 1: one or two simple rules.
   diff 2: two rules on crossing axes, including rotation.
   diff 3: Latin squares and triple-rule grids, with subtler distractors. */
export function genMatrix(rng, diff = 1) {
  const grid = [[null, null, null], [null, null, null], [null, null, null]];
  let explanation = "";

  const easy = ["rowShapeCount", "colShapeFill", "rotCount"];
  const med = ["colShapeRotRow", "countRowFillCol"];
  const hard = ["latin", "tripleRule"];
  const template = pick(diff === 1 ? easy : diff === 2 ? med : hard, rng);

  if (template === "rowShapeCount") {
    const rowShapes = shuffle(SHAPES, rng).slice(0, 3);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        grid[r][c] = { shape: rowShapes[r], count: c + 1, fill: "solid", rot: 0 };
    explanation = `Two rules. ROW RULE: each row keeps a single shape (${rowShapes.join(" → ")}, top to bottom). COLUMN RULE: the count climbs 1 → 2 → 3 left to right. The missing cell needs three solid ${rowShapes[2]}s.`;
  } else if (template === "colShapeFill") {
    const colShapes = shuffle(SHAPES, rng).slice(0, 3);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        grid[r][c] = { shape: colShapes[c], count: 1, fill: FILLS[r], rot: 0 };
    explanation = `Two rules. COLUMN RULE: each column keeps a single shape (${colShapes.join(", ")}, left to right). ROW RULE: the fill deepens going down — outline → shaded → solid. The missing cell must be a solid ${colShapes[2]}.`;
  } else if (template === "rotCount") {
    const shape = pick(ROTATABLE, rng);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        grid[r][c] = { shape, count: r + 1, fill: "outline", rot: c * 45 };
    explanation = `One shape (${shape}), two rules. COLUMN RULE: rotation advances 45° per step left to right (0° → 45° → 90°). ROW RULE: the count climbs 1 → 2 → 3 top to bottom. The missing cell needs three ${shape}s rotated 90°.`;
  } else if (template === "colShapeRotRow") {
    const colShapes = shuffle(ROTATABLE, rng);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        grid[r][c] = { shape: colShapes[c], count: 1, fill: "half", rot: r * 45 };
    explanation = `Two rules on crossing axes. COLUMN RULE: each column keeps a single shape (${colShapes.join(", ")}, left to right). ROW RULE: rotation advances 45° per row going down (0° → 45° → 90°). The missing cell is a ${colShapes[2]} rotated 90°.`;
  } else if (template === "countRowFillCol") {
    const shape = pick(SHAPES, rng);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        grid[r][c] = { shape, count: r + 1, fill: FILLS[c], rot: 0 };
    explanation = `One shape (${shape}), two crossing rules. ROW RULE: the count climbs 1 → 2 → 3 going down. COLUMN RULE: the fill deepens left to right — outline → shaded → solid. The missing cell needs three solid ${shape}s.`;
  } else if (template === "latin") {
    const perm = shuffle(SHAPES, rng).slice(0, 3);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        grid[r][c] = { shape: perm[(r + c) % 3], count: 1, fill: FILLS[r], rot: 0 };
    const missing = perm[(2 + 2) % 3];
    const inRow = [perm[2 % 3], perm[3 % 3]];
    explanation = `This is a Latin square: every row and every column contains each of the three shapes exactly once. Row 3 already shows a ${inRow[0]} and a ${inRow[1]}, so the missing shape is the ${missing}. A second rule sets the fill by row (outline → shaded → solid going down), so the answer is a solid ${missing}.`;
  } else {
    // tripleRule: three simultaneous rules
    const rowShapes = shuffle(SHAPES, rng).slice(0, 3);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        grid[r][c] = { shape: rowShapes[r], count: c + 1, fill: FILLS[c], rot: 0 };
    explanation = `Three simultaneous rules. ROW RULE: each row keeps one shape (${rowShapes.join(" → ")}). COLUMN RULE 1: the count climbs 1 → 2 → 3 left to right. COLUMN RULE 2: the fill also deepens left to right (outline → shaded → solid). All three rules point to the same answer: three solid ${rowShapes[2]}s.`;
  }

  const answer = grid[2][2];
  grid[2][2] = null;

  // Distractors: perturb attributes of the answer. At diff 3 we also pull
  // shapes from elsewhere in the grid, which reads as more plausible.
  const gridShapes = [...new Set(grid.flat().filter(Boolean).map((x) => x.shape))];
  const otherShapes = (diff >= 3 ? gridShapes : SHAPES).filter((s) => s !== answer.shape);
  const shapeAlt = () =>
    pick(otherShapes.length ? otherShapes : SHAPES.filter((s) => s !== answer.shape), rng);
  const perturb = [
    { ...answer, shape: shapeAlt() },
    { ...answer, count: answer.count === 1 ? 2 : answer.count - 1 },
    { ...answer, fill: pick(FILLS.filter((f) => f !== answer.fill), rng) },
    ...(answer.shape !== "circle"
      ? [{ ...answer, rot: (answer.rot + 45) % 180 }]
      : [{ ...answer, count: answer.count === 3 ? 2 : 3 }]),
    { ...answer, shape: shapeAlt(), fill: pick(FILLS.filter((f) => f !== answer.fill), rng) },
    { ...answer, count: answer.count === 3 ? 1 : answer.count + 1, fill: pick(FILLS.filter((f) => f !== answer.fill), rng) },
  ];
  const seen = new Set([JSON.stringify(answer)]);
  const distractors = [];
  for (const p of perturb) {
    const k = JSON.stringify(p);
    if (!seen.has(k) && distractors.length < 5) {
      seen.add(k);
      distractors.push(p);
    }
  }
  const options = shuffle([answer, ...distractors], rng);
  return { cat: "matrices", diff, grid, options, correct: options.indexOf(answer), explanation };
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
