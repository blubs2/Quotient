// Procedural question engine. Pure data in, pure data out — no JSX here,
// so the same generators can later power a native app or a test server.
import { shuffle, pick } from "./rng";
import { VOCAB } from "./data/vocab";
import { ANALOGIES } from "./data/analogies";

export const SHAPES = ["circle", "square", "triangle", "diamond"];
export const FILLS = ["outline", "half", "solid"];

/* ---------------- Matrix reasoning (Raven's-style) ---------------- */
export function genMatrix(rng) {
  const template = Math.floor(rng() * 3);
  const grid = [[null, null, null], [null, null, null], [null, null, null]];
  let explanation = "";
  if (template === 0) {
    const rowShapes = shuffle(SHAPES, rng).slice(0, 3);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        grid[r][c] = { shape: rowShapes[r], count: c + 1, fill: "solid", rot: 0 };
    explanation = `Two rules at work. ROW RULE: each row keeps a single shape (${rowShapes.join(" → ")}, top to bottom). COLUMN RULE: the count climbs 1 → 2 → 3 from left to right. The missing cell sits in row 3, column 3, so it must contain three solid ${rowShapes[2]}s.`;
  } else if (template === 1) {
    const colShapes = shuffle(SHAPES, rng).slice(0, 3);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        grid[r][c] = { shape: colShapes[c], count: 1, fill: FILLS[r], rot: 0 };
    explanation = `Two rules at work. COLUMN RULE: each column keeps a single shape (${colShapes.join(", ")}, left to right). ROW RULE: the fill deepens going down — outline → shaded → solid. The missing cell is bottom-right, so it must be a solid ${colShapes[2]}.`;
  } else {
    const shape = pick(["square", "triangle", "diamond"], rng);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        grid[r][c] = { shape, count: r + 1, fill: "outline", rot: c * 45 };
    explanation = `One shape throughout (${shape}), two rules. COLUMN RULE: rotation advances 45° per step, left to right (0° → 45° → 90°). ROW RULE: the count climbs 1 → 2 → 3, top to bottom. The missing cell needs three ${shape}s rotated 90°.`;
  }
  const answer = grid[2][2];
  grid[2][2] = null;
  const perturb = [
    { ...answer, shape: pick(SHAPES.filter((s) => s !== answer.shape), rng) },
    { ...answer, count: answer.count === 1 ? 2 : answer.count - 1 },
    { ...answer, fill: pick(FILLS.filter((f) => f !== answer.fill), rng) },
    ...(answer.shape !== "circle"
      ? [{ ...answer, rot: (answer.rot + 45) % 180 }]
      : [{ ...answer, count: answer.count === 3 ? 2 : 3 }]),
    { ...answer, shape: pick(SHAPES.filter((s) => s !== answer.shape), rng), count: answer.count === 3 ? 1 : answer.count + 1 },
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
  return { cat: "matrices", grid, options, correct: options.indexOf(answer), explanation };
}

/* ---------------- Number series ---------------- */
export function genSeries(rng) {
  const type = Math.floor(rng() * 4);
  let terms = [], ans = 0, explanation = "";
  if (type === 0) {
    const a = 2 + Math.floor(rng() * 14), d = 3 + Math.floor(rng() * 8);
    terms = [0, 1, 2, 3, 4].map((i) => a + i * d);
    ans = a + 5 * d;
    explanation = `Constant step. Each term adds ${d}: ${terms.join(" → ")}. So ${terms[4]} + ${d} = ${ans}.`;
  } else if (type === 1) {
    const a = 2 + Math.floor(rng() * 4), r = 2 + Math.floor(rng() * 2);
    terms = [0, 1, 2, 3, 4].map((i) => a * Math.pow(r, i));
    ans = a * Math.pow(r, 5);
    explanation = `Constant ratio. Each term multiplies by ${r}: ${terms.join(" → ")}. So ${terms[4]} × ${r} = ${ans}.`;
  } else if (type === 2) {
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
  } else {
    const a1 = 3 + Math.floor(rng() * 8), d1 = 2 + Math.floor(rng() * 5);
    const a2 = 20 + Math.floor(rng() * 20), d2 = -(1 + Math.floor(rng() * 4));
    terms = [a1, a2, a1 + d1, a2 + d2, a1 + 2 * d1];
    ans = a2 + 2 * d2;
    explanation = `Two interleaved chains. Positions 1, 3, 5 step by +${d1} (${a1}, ${a1 + d1}, ${a1 + 2 * d1}); positions 2, 4 step by ${d2} (${a2}, ${a2 + d2}). The 6th term continues the second chain: ${a2 + d2} − ${Math.abs(d2)} = ${ans}.`;
  }
  const offs = shuffle([ans + 1, ans - 1, ans + 2, ans - 2, ans + 3, ans + 5], rng);
  const opts = shuffle([ans, ...offs.filter((o) => o !== ans).slice(0, 3)], rng);
  return {
    cat: "series",
    prompt: terms.join("   "),
    options: opts.map(String),
    correct: opts.indexOf(ans),
    explanation,
  };
}

/* ---------------- Verbal analogies ---------------- */
export function genAnalogy(rng, exclude = new Set()) {
  const pool = ANALOGIES.filter((_, i) => !exclude.has(i));
  const item = pick(pool.length ? pool : ANALOGIES, rng);
  const idx = ANALOGIES.indexOf(item);
  const opts = shuffle(item.opts, rng);
  return {
    cat: "analogies",
    bankIndex: idx,
    prompt: `${item.a.toUpperCase()} : ${item.b.toUpperCase()}  ::  ${item.c.toUpperCase()} : ?`,
    options: opts,
    correct: opts.indexOf(item.ans),
    explanation: `Relation — ${item.rel}. ${item.why}`,
  };
}

/* ---------------- Vocabulary ---------------- */
export function genVocabQ(word, rng) {
  const others = shuffle(VOCAB.filter((v) => v.w !== word.w), rng).slice(0, 3);
  const opts = shuffle([word, ...others], rng);
  return {
    cat: "vocab",
    word,
    prompt: word.w,
    sub: word.pos,
    options: opts.map((o) => o.def),
    correct: opts.findIndex((o) => o.w === word.w),
    explanation: `${word.w} (${word.pos}) — ${word.def}. "${word.ex}" ${word.note}`,
  };
}
