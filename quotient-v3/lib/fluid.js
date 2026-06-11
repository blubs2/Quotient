// Figure Weights (WAIS/CAIT style): balance-scale algebra with shapes.
import { shuffle, pick } from "./rng";

const SHAPE_KEYS = ["tri", "cir", "sqr"];
const SYM = { tri: "▲", cir: "●", sqr: "■" };
const NAME = { tri: "triangle", cir: "circle", sqr: "square" };

// enumerate all multisets of the three shapes up to a given size
function multisets(maxSize) {
  const out = [];
  for (let i = 0; i <= maxSize; i++)
    for (let j = 0; j + i <= maxSize; j++)
      for (let k = 0; k + j + i <= maxSize; k++) {
        if (i + j + k === 0) continue;
        out.push({ tri: i, cir: j, sqr: k });
      }
  return out;
}
const toArr = (m) => [
  ...Array(m.tri).fill("tri"),
  ...Array(m.cir).fill("cir"),
  ...Array(m.sqr).fill("sqr"),
];
const weigh = (m, w) => m.tri * w.tri + m.cir * w.cir + m.sqr * w.sqr;
const msig = (m) => `${m.tri}-${m.cir}-${m.sqr}`;
const label = (m) =>
  SHAPE_KEYS.filter((k) => m[k]).map((k) => `${m[k]}${SYM[k]}`).join(" + ");

export function genWeights(rng, diff = 2) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const vals = shuffle([1, 2, 3, 4, 5], rng).slice(0, 3);
    const w = { tri: vals[0], cir: vals[1], sqr: vals[2] };
    const all = multisets(diff >= 3 ? 4 : 3);

    // two given balances: each relates a different pair of shapes
    const balFor = (kA, kB) => {
      const cands = [];
      for (let a = 1; a <= 3; a++)
        for (let b = 1; b <= 3; b++)
          if (a * w[kA] === b * w[kB] && (a > 1 || b > 1)) cands.push([a, b]);
      if (!cands.length)
        for (let a = 1; a <= 4; a++)
          for (let b = 1; b <= 4; b++)
            if (a * w[kA] === b * w[kB]) cands.push([a, b]);
      return cands.length ? pick(cands, rng) : null;
    };
    const pairs = shuffle([["tri", "cir"], ["cir", "sqr"], ["tri", "sqr"]], rng);
    const b1 = balFor(...pairs[0]);
    const b2 = balFor(...pairs[1]);
    if (!b1 || !b2) continue;
    const scales = [
      { L: Array(b1[0]).fill(pairs[0][0]), R: Array(b1[1]).fill(pairs[0][1]) },
      { L: Array(b2[0]).fill(pairs[1][0]), R: Array(b2[1]).fill(pairs[1][1]) },
    ];

    // question pan: a mixed multiset; answer: a DIFFERENT multiset, same weight
    const qCands = all.filter((m) => toArr(m).length >= 2 && new Set(toArr(m)).size >= 2);
    const qL = pick(qCands, rng);
    const target = weigh(qL, w);
    const equal = all.filter((m) => weigh(m, w) === target && msig(m) !== msig(qL));
    if (equal.length < 1) continue;
    const answer = pick(equal, rng);
    const near = shuffle(all.filter((m) => Math.abs(weigh(m, w) - target) <= 2 && weigh(m, w) !== target), rng);
    if (near.length < 3) continue;
    const semOpts = shuffle([answer, ...near.slice(0, 3)], rng);

    const wText = SHAPE_KEYS.map((k) => `${NAME[k]} = ${w[k]}`).join(", ");
    return {
      cat: "weights",
      diff,
      scales,
      qLeft: toArr(qL),
      optionType: "shapes",
      options: semOpts.map(toArr),
      correct: semOpts.indexOf(answer),
      explanation: `Solve the scales like equations. Scale 1: ${scales[0].L.length}${SYM[scales[0].L[0]]} = ${scales[0].R.length}${SYM[scales[0].R[0]]}. Scale 2: ${scales[1].L.length}${SYM[scales[1].L[0]]} = ${scales[1].R.length}${SYM[scales[1].R[0]]}. One consistent set of weights is ${wText} (any proportional set gives the same answer). The question pan (${label(qL)}) totals ${target}. Only ${label(answer)} also totals ${target} — every other option is off by 1 or 2.`,
    };
  }
  // pathological fallback (practically unreachable)
  return genWeights(() => Math.random(), diff);
}
