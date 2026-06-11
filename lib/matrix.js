// Matrix reasoning engine v3.1 — Mensa-style layered puzzles.
//
// Cells are SEMANTIC objects converted to render specs ({ els, marks }) at
// the end. Difficulty comes from how many independent rules run at once and
// how subtle the distractors are. Every rule's DIRECTION (ascending or
// descending) and every Latin square's layout are randomized, so each
// template is a large family rather than one puzzle — explanations are
// generated from the actual parameters, so they always match.
import { shuffle, pick } from "./rng";

export const SHAPES = ["circle", "square", "triangle", "diamond"];
const ROTATABLE = ["square", "triangle", "diamond"];
export const FILLS = ["outline", "half", "solid"];
const FW = { outline: "outline", half: "shaded", solid: "solid" };
const MARKS = ["h", "v", "d1", "d2"];
const QUAD = [[30, 30], [70, 30], [30, 70], [70, 70]];

const dirSeq = (rng, arr) => (rng() < 0.5 ? [...arr] : [...arr].reverse());
const plural = (n, w) => (n === 1 ? `one ${w}` : n === 2 ? `two ${w}s` : `three ${w}s`);
/* Two distinct Latin-square layouts: (r+c)%3 and (r+2c)%3. Using different
   formulas for simultaneous latin rules decorrelates them. */
const latinA = (vals) => (r, c) => vals[(r + c) % 3];
const latinB = (vals) => (r, c) => vals[(r + 2 * c) % 3];
const latinPair = (rng) => (rng() < 0.5 ? [latinA, latinB] : [latinB, latinA]);

/* ---------------- semantic -> render conversion ---------------- */
function toRender(cell) {
  if (!cell) return null;
  if (cell.rays) return { rays: [...cell.rays].sort((a, b) => a - b) };
  if (cell.marks) return { marks: [...cell.marks].sort() };
  if (cell.parts) {
    return {
      els: cell.parts.map((p) => ({
        shape: p.shape, cx: QUAD[p.pos][0], cy: QUAD[p.pos][1], s: 26, rot: 0, fill: "solid",
      })),
    };
  }
  const els = [];
  const count = cell.count || 1;
  const hasExtras = cell.inner || cell.dots;
  const pos =
    count === 1
      ? [[50, 50, hasExtras ? 52 : 62]]
      : count === 2
      ? [[31, 31, 30], [69, 69, 30]]
      : [[50, 27, 26], [29, 69, 26], [71, 69, 26]];
  for (const p of pos)
    els.push({ shape: cell.shape, cx: p[0], cy: p[1], s: p[2], rot: cell.rot || 0, fill: cell.fill });
  if (cell.inner)
    els.push({
      shape: cell.inner, cx: 50, cy: 50, s: 22, rot: 0,
      fill: cell.fill === "solid" ? "knock" : "solid",
    });
  if (cell.dots) {
    const dotPos = [[87, 13], [13, 13], [13, 87]];
    for (let i = 0; i < cell.dots; i++)
      els.push({ shape: "circle", cx: dotPos[i][0], cy: dotPos[i][1], s: 9, rot: 0, fill: "solid" });
  }
  return { els };
}

const sig = (c) => JSON.stringify(c);

function finish(grid, answer, distractorList, explanation, diff, rng, topUp = []) {
  const seen = new Set([sig(answer)]);
  const ds = [];
  for (const d of [...distractorList, ...shuffle(topUp, rng)]) {
    const k = sig(d);
    if (!seen.has(k) && ds.length < 5) { seen.add(k); ds.push(d); }
  }
  const semOptions = shuffle([answer, ...ds], rng);
  const correct = semOptions.indexOf(answer);
  const tpl = CURRENT_TPL;
  return {
    cat: "matrices",
    diff,
    tpl,
    grid: grid.map((row) => row.map(toRender)),
    options: semOptions.map(toRender),
    correct,
    explanation,
  };
}
let CURRENT_TPL = "";

/* ---------------- the main generator ---------------- */
export function genMatrix(rng, diff = 1) {
  const easy = ["rowShapeCount", "colShapeFill", "rotCount", "dotsFill"];
  const med = ["colShapeRotRow", "countRowFillCol", "latinFill", "innerLatin", "latinDots", "rayUnion", "rayRotate"];
  const hard = ["tripleRule", "dualLatin", "doubleLatinShapes", "latinDotsFill", "rotCountFill", "xor", "union", "rayXor", "rayMinus", "rayRotate", "rayXor"];
  const template = pick(diff === 1 ? easy : diff === 2 ? med : hard, rng);
  CURRENT_TPL = template;

  if (template === "xor") return genXor(rng, diff);
  if (template === "union") return genUnion(rng, diff);
  if (template.startsWith("ray")) return genRays(rng, diff, template);

  const grid = [[null, null, null], [null, null, null], [null, null, null]];
  let cellAt, explanation;
  const base = { count: 1, fill: "solid", rot: 0, inner: null, dots: 0 };
  const fillRun = (F) => F.map((f) => FW[f]).join(" → ");

  if (template === "rowShapeCount") {
    const s = shuffle(SHAPES, rng).slice(0, 3);
    const C = dirSeq(rng, [1, 2, 3]);
    cellAt = (r, c) => ({ ...base, shape: s[r], count: C[c] });
    explanation = `Two rules. ROW RULE: each row keeps one shape (${s.join(" → ")}, top to bottom). COLUMN RULE: the count runs ${C.join(" → ")} left to right. The missing cell: ${plural(C[2], `solid ${s[2]}`)}.`;
  } else if (template === "colShapeFill") {
    const s = shuffle(SHAPES, rng).slice(0, 3);
    const F = dirSeq(rng, FILLS);
    cellAt = (r, c) => ({ ...base, shape: s[c], fill: F[r] });
    explanation = `Two rules. COLUMN RULE: each column keeps one shape (${s.join(", ")}, left to right). ROW RULE: the fill runs ${fillRun(F)} going down. The missing cell: a ${FW[F[2]]} ${s[2]}.`;
  } else if (template === "rotCount") {
    const sh = pick(ROTATABLE, rng);
    const R = dirSeq(rng, [0, 45, 90]);
    const C = dirSeq(rng, [1, 2, 3]);
    cellAt = (r, c) => ({ ...base, shape: sh, fill: "outline", count: C[r], rot: R[c] });
    explanation = `One shape (${sh}), two rules. COLUMN RULE: rotation runs ${R.join("° → ")}° left to right. ROW RULE: the count runs ${C.join(" → ")} going down. The missing cell: ${plural(C[2], sh)} rotated ${R[2]}°.`;
  } else if (template === "dotsFill") {
    const sh = pick(SHAPES, rng);
    const D = dirSeq(rng, [1, 2, 3]);
    const F = dirSeq(rng, FILLS);
    cellAt = (r, c) => ({ ...base, shape: sh, fill: F[r], dots: D[c] });
    explanation = `One shape (${sh}), two rules. COLUMN RULE: the corner dots run ${D.join(" → ")} left to right. ROW RULE: the ${sh}'s fill runs ${fillRun(F)} going down. The missing cell: a ${FW[F[2]]} ${sh} with ${plural(D[2], "corner dot")}.`;
  } else if (template === "colShapeRotRow") {
    const s = shuffle(ROTATABLE, rng);
    const R = dirSeq(rng, [0, 45, 90]);
    cellAt = (r, c) => ({ ...base, shape: s[c], fill: "half", rot: R[r] });
    explanation = `Two crossing rules. COLUMN RULE: each column keeps one shape (${s.join(", ")}, left to right). ROW RULE: rotation runs ${R.join("° → ")}° going down. The missing cell: a ${s[2]} rotated ${R[2]}°.`;
  } else if (template === "countRowFillCol") {
    const sh = pick(SHAPES, rng);
    const C = dirSeq(rng, [1, 2, 3]);
    const F = dirSeq(rng, FILLS);
    cellAt = (r, c) => ({ ...base, shape: sh, count: C[r], fill: F[c] });
    explanation = `One shape (${sh}), two crossing rules. ROW RULE: the count runs ${C.join(" → ")} going down. COLUMN RULE: the fill runs ${fillRun(F)} left to right. The missing cell: ${plural(C[2], `${FW[F[2]]} ${sh}`)}.`;
  } else if (template === "latinFill") {
    const s = shuffle(SHAPES, rng).slice(0, 3);
    const L = pick([latinA, latinB], rng)(s);
    const F = dirSeq(rng, FILLS);
    cellAt = (r, c) => ({ ...base, shape: L(r, c), fill: F[r] });
    explanation = `A Latin square: every row and every column contains each of the three shapes exactly once. Row 3 already shows a ${L(2, 0)} and a ${L(2, 1)}, so the missing shape is the ${L(2, 2)}. The fill follows the row (${fillRun(F)} going down), so the answer is a ${FW[F[2]]} ${L(2, 2)}.`;
  } else if (template === "innerLatin") {
    const outer = pick(SHAPES, rng);
    const innerSet = shuffle(SHAPES.filter((x) => x !== outer), rng);
    const L = pick([latinA, latinB], rng)(innerSet);
    cellAt = (r, c) => ({ ...base, shape: outer, fill: "outline", inner: L(r, c) });
    explanation = `The outer ${outer} never changes — the rule lives in the INNER shape, which forms a Latin square: each row and column contains each inner shape (${innerSet.join(", ")}) exactly once. Row 3 already shows ${L(2, 0)} and ${L(2, 1)} inside, so the missing cell is a ${outer} containing a ${L(2, 2)}.`;
  } else if (template === "latinDots") {
    const s = shuffle(SHAPES, rng).slice(0, 3);
    const L = pick([latinA, latinB], rng)(s);
    const D = dirSeq(rng, [1, 2, 3]);
    cellAt = (r, c) => ({ ...base, shape: L(r, c), fill: "half", dots: D[r] });
    explanation = `Two independent rules. SHAPES form a Latin square (each row and column has each shape once) — row 3 shows ${L(2, 0)} and ${L(2, 1)}, so the missing shape is the ${L(2, 2)}. DOTS follow the row: ${D.join(", ")} going down. The missing cell: a shaded ${L(2, 2)} with ${plural(D[2], "corner dot")}.`;
  } else if (template === "tripleRule") {
    const s = shuffle(SHAPES, rng).slice(0, 3);
    const C = dirSeq(rng, [1, 2, 3]);
    const F = dirSeq(rng, FILLS);
    cellAt = (r, c) => ({ ...base, shape: s[r], count: C[c], fill: F[c] });
    explanation = `Three simultaneous rules. ROW RULE: each row keeps one shape (${s.join(" → ")}). COLUMN RULES: the count runs ${C.join(" → ")} AND the fill runs ${fillRun(F)}, both left to right. All three converge on: ${plural(C[2], `${FW[F[2]]} ${s[2]}`)}.`;
  } else if (template === "dualLatin") {
    const s = shuffle(SHAPES, rng).slice(0, 3);
    const fillPerm = shuffle(FILLS, rng);
    const [LSf, LFf] = latinPair(rng);
    const LS = LSf(s), LF = LFf(fillPerm);
    cellAt = (r, c) => ({ ...base, shape: LS(r, c), fill: LF(r, c) });
    explanation = `TWO independent Latin squares at once. Shapes: each row and column contains each shape exactly once — row 3 shows ${LS(2, 0)} and ${LS(2, 1)}, leaving the ${LS(2, 2)}. Fills: each row and column also contains each fill exactly once — row 3 shows ${FW[LF(2, 0)]} and ${FW[LF(2, 1)]}, leaving ${FW[LF(2, 2)]}. Answer: a ${FW[LF(2, 2)]} ${LS(2, 2)}. Solving one square tells you nothing about the other.`;
  } else if (template === "doubleLatinShapes") {
    const outerSet = shuffle(SHAPES, rng).slice(0, 3);
    const innerSet = shuffle(SHAPES, rng).slice(0, 3);
    const [LOf, LIf] = latinPair(rng);
    const LO = LOf(outerSet), LI = LIf(innerSet);
    cellAt = (r, c) => ({ ...base, shape: LO(r, c), fill: "outline", inner: LI(r, c) });
    explanation = `Two nested Latin squares. OUTER shapes: each row and column contains each of ${outerSet.join(", ")} once — row 3 leaves the ${LO(2, 2)}. INNER shapes: each row and column contains each of ${innerSet.join(", ")} once — row 3 leaves the ${LI(2, 2)}. Answer: a ${LO(2, 2)} containing a ${LI(2, 2)}. The outer and inner patterns are independent — solving one tells you nothing about the other.`;
  } else if (template === "latinDotsFill") {
    const s = shuffle(SHAPES, rng).slice(0, 3);
    const [LSf, LDf] = latinPair(rng);
    const LS = LSf(s), LD = LDf([1, 2, 3]);
    const F = dirSeq(rng, FILLS);
    cellAt = (r, c) => ({ ...base, shape: LS(r, c), fill: F[c], dots: LD(r, c) });
    explanation = `Three rules. SHAPES form a Latin square — row 3 leaves the ${LS(2, 2)}. DOTS also form a Latin square (1, 2, 3 in every row and column) — row 3 shows ${LD(2, 0)} and ${LD(2, 1)} dots, leaving ${LD(2, 2)}. FILL runs ${fillRun(F)} by column. Answer: a ${FW[F[2]]} ${LS(2, 2)} with ${plural(LD(2, 2), "corner dot")}.`;
  } else {
    // rotCountFill
    const sh = pick(ROTATABLE, rng);
    const R = dirSeq(rng, [0, 45, 90]);
    const C = dirSeq(rng, [1, 2, 3]);
    const F = dirSeq(rng, FILLS);
    cellAt = (r, c) => ({ ...base, shape: sh, count: C[r], rot: R[c], fill: F[r] });
    explanation = `One shape (${sh}), three rules. ROW RULES: the count runs ${C.join(" → ")} going down AND the fill runs ${fillRun(F)} going down. COLUMN RULE: rotation runs ${R.join("° → ")}° left to right. Answer: ${plural(C[2], `${FW[F[2]]} ${sh}`)} rotated ${R[2]}°.`;
  }

  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) grid[r][c] = cellAt(r, c);
  const answer = grid[2][2];
  grid[2][2] = null;

  // Rule-aware distractors: each violates exactly one rule. At diff 3, shape
  // swaps come from shapes actually present in the grid (more plausible).
  const gridShapes = [...new Set(grid.flat().filter(Boolean).map((x) => x.shape))];
  const shapePool = (diff >= 3 ? gridShapes : SHAPES).filter((x) => x !== answer.shape);
  const altShape = () => pick(shapePool.length ? shapePool : SHAPES.filter((x) => x !== answer.shape), rng);
  const altFill = () => pick(FILLS.filter((x) => x !== answer.fill), rng);
  const cand = [
    { ...answer, shape: altShape() },
    { ...answer, fill: altFill() },
    answer.count > 1 ? { ...answer, count: answer.count - 1 } : { ...answer, count: 2 },
    answer.dots
      ? { ...answer, dots: (answer.dots % 3) + 1 }
      : answer.inner
      ? { ...answer, inner: pick(SHAPES.filter((x) => x !== answer.inner && x !== answer.shape), rng) }
      : answer.shape !== "circle"
      ? { ...answer, rot: (answer.rot + 45) % 180 }
      : { ...answer, count: answer.count === 3 ? 2 : answer.count + 1 },
    { ...answer, shape: altShape(), fill: altFill() },
    answer.inner
      ? { ...answer, inner: null }
      : answer.dots
      ? { ...answer, dots: answer.dots === 1 ? 3 : answer.dots - 1, fill: altFill() }
      : { ...answer, count: answer.count === 3 ? 1 : answer.count + 1, fill: altFill() },
  ];
  const topUp = [];
  for (const s of SHAPES) for (const f of FILLS) topUp.push({ ...answer, shape: s, fill: f });
  for (const n of [1, 2, 3]) topUp.push({ ...answer, count: n });
  return finish(grid, answer, cand, explanation, diff, rng, topUp);
}

/* ---------------- XOR line-logic (APM style) ---------------- */
function genXor(rng, diff) {
  const alphabet = shuffle(MARKS, rng).slice(0, 3 + Math.floor(rng() * 2));
  const subset = () => alphabet.filter(() => rng() < 0.55);
  const xor = (a, b) => [...a.filter((m) => !b.includes(m)), ...b.filter((m) => !a.includes(m))];
  const rows = [];
  for (let r = 0; r < 3; r++) {
    let A, B, C;
    do {
      A = subset(); B = subset(); C = xor(A, B);
    } while (!A.length || !B.length || !C.length || sig([...A].sort()) === sig([...B].sort()));
    rows.push([{ marks: [...A].sort() }, { marks: [...B].sort() }, { marks: [...C].sort() }]);
  }
  const grid = rows.map((row) => row.map((x) => ({ marks: x.marks })));
  const answer = grid[2][2];
  grid[2][2] = null;

  const A = rows[2][0].marks, B = rows[2][1].marks;
  const union = [...new Set([...A, ...B])].sort();
  const inter = A.filter((m) => B.includes(m)).sort();
  const unused = MARKS.filter((m) => !answer.marks.includes(m));
  const cand = [
    { marks: union },
    inter.length ? { marks: inter } : { marks: [...A] },
    { marks: [...A] },
    { marks: [...B] },
    answer.marks.length > 1 ? { marks: answer.marks.slice(1) } : { marks: [...answer.marks, unused[0]].filter(Boolean).sort() },
    unused.length ? { marks: [...answer.marks, unused[0]].sort() } : { marks: answer.marks.slice(0, 1) },
  ].filter((c) => c.marks.length);
  const topUp = [];
  for (let mask = 1; mask < 16; mask++)
    topUp.push({ marks: MARKS.filter((_, i) => mask & (1 << i)).sort() });
  const explanation = `This is a line-combination rule. In every row, the third figure contains exactly the lines that appear in ONE of the first two figures — but not in both (an XOR rule: shared lines cancel out). In row 3, the first two figures share ${inter.length ? `${inter.length === 1 ? "a line" : "lines"}, which therefore cancel${inter.length === 1 ? "s" : ""} out` : "no lines, so every line carries through"}. The answer keeps only the unshared lines. The most tempting wrong option is the simple overlay of both figures (the union) — that ignores the cancellation.`;
  return finish(grid, answer, cand, explanation, diff, rng, topUp);
}

/* ---------------- union / figure addition (APM style) ---------------- */
function genUnion(rng, diff) {
  const rows = [];
  for (let r = 0; r < 3; r++) {
    const nQuads = 3 + Math.floor(rng() * 2);
    const quads = shuffle([0, 1, 2, 3], rng).slice(0, nQuads);
    const shapeOf = {};
    for (const q of quads) shapeOf[q] = pick(SHAPES, rng);
    const split = 1 + Math.floor(rng() * (nQuads - 1));
    const aQ = quads.slice(0, split), bQ = quads.slice(split);
    const mk = (qs) => ({ parts: qs.map((q) => ({ pos: q, shape: shapeOf[q] })).sort((x, y) => x.pos - y.pos) });
    rows.push([mk(aQ), mk(bQ), mk(quads)]);
  }
  const grid = rows.map((row) => [...row]);
  const answer = grid[2][2];
  grid[2][2] = null;

  const parts = answer.parts;
  const empty = [0, 1, 2, 3].filter((q) => !parts.some((p) => p.pos === q));
  const cand = [
    { parts: parts.slice(1) },
    { parts: parts.slice(0, -1) },
    { parts: parts.map((p, i) => (i === 0 ? { ...p, shape: pick(SHAPES.filter((s) => s !== p.shape), rng) } : p)) },
    rows[2][0],
    rows[2][1],
    empty.length
      ? { parts: [...parts.map((p, i) => (i === 0 ? { ...p, pos: empty[0] } : p))].sort((x, y) => x.pos - y.pos) }
      : { parts: parts.slice(1) },
  ].filter((c) => c.parts.length);
  const topUp = [];
  for (let i = 0; i < parts.length; i++) {
    for (const s of SHAPES)
      if (s !== parts[i].shape)
        topUp.push({ parts: parts.map((p, j) => (j === i ? { ...p, shape: s } : p)) });
    if (parts.length > 1) topUp.push({ parts: parts.filter((_, j) => j !== i) });
  }
  const explanation = `This is a figure-addition rule. In every row, the third panel is the first panel and the second panel SUPERIMPOSED — each small shape keeps its exact position and identity, and nothing is gained or lost. The first two panels in a row never overlap, so the third is simply both combined. The wrong options each break the rule subtly: one drops a shape, one swaps a shape's identity, one moves a shape to the wrong quadrant, and two are just the first or second panel copied.`;
  return finish(grid, answer, cand, explanation, diff, rng, topUp);
}

/* ---------------- Ray figures (the Mensa house style) ----------------
   Cells are sets of rays at the 8 compass directions from a center dot.
   Rules: rotation of the whole figure across a row, union (figure
   addition), XOR (shared rays cancel), and subtraction. */
const DIRS = [0, 1, 2, 3, 4, 5, 6, 7];
const rotRays = (S, k) => S.map((d) => (d + k) % 8).sort((a, b) => a - b);
const mirrorRays = (S) => S.map((d) => (8 - d) % 8).sort((a, b) => a - b);

function raySubset(rng, min, max) {
  const size = min + Math.floor(rng() * (max - min + 1));
  return shuffle(DIRS, rng).slice(0, size).sort((a, b) => a - b);
}

function genRays(rng, diff, template) {
  CURRENT_TPL = template;
  const grid = [[null, null, null], [null, null, null], [null, null, null]];
  let answer, explanation;
  const cand = [];

  if (template === "rayRotate") {
    const k = diff >= 3 ? 1 : 2; // 45° steps are subtler than 90°
    for (let r = 0; r < 3; r++) {
      const base = raySubset(rng, diff >= 3 ? 3 : 2, diff >= 3 ? 5 : 3);
      for (let c = 0; c < 3; c++) grid[r][c] = { rays: rotRays(base, c * k) };
    }
    answer = grid[2][2];
    explanation = `Each row holds ONE figure that rotates ${k * 45}° clockwise at every step — the rays all move together, like the hands of a clock turning as a unit. Take the third row's middle figure and rotate every ray another ${k * 45}°: that's the answer. The traps: a mirror image (flipped, not rotated), the figure rotated the wrong amount, and versions with a ray added or missing.`;
    const prev = grid[2][1];
    cand.push(
      { rays: mirrorRays(answer.rays) },
      { rays: rotRays(prev.rays, k * 2) },
      { rays: [...prev.rays] },
      answer.rays.length > 2 ? { rays: answer.rays.slice(1) } : { rays: rotRays(answer.rays, 1) },
      { rays: rotRays(answer.rays, 1) }
    );
  } else {
    const setRow = (r, A, B, C) => {
      grid[r][0] = { rays: [...A].sort((x, y) => x - y) };
      grid[r][1] = { rays: [...B].sort((x, y) => x - y) };
      grid[r][2] = { rays: [...C].sort((x, y) => x - y) };
    };
    const xor = (a, b) => [...a.filter((m) => !b.includes(m)), ...b.filter((m) => !a.includes(m))];
    for (let r = 0; r < 3; r++) {
      let A, B, C;
      if (template === "rayUnion") {
        const both = shuffle(DIRS, rng).slice(0, 4 + Math.floor(rng() * 3));
        const split = 1 + Math.floor(rng() * (both.length - 1));
        A = both.slice(0, split); B = both.slice(split); C = both;
      } else if (template === "rayMinus") {
        do { A = raySubset(rng, 4, 6); } while (A.length < 4);
        B = shuffle([...A], rng).slice(0, 1 + Math.floor(rng() * (A.length - 2)));
        C = A.filter((d) => !B.includes(d));
      } else {
        // rayXor
        do {
          A = raySubset(rng, 2, 5); B = raySubset(rng, 2, 5); C = xor(A, B);
        } while (!C.length || JSON.stringify([...A].sort()) === JSON.stringify([...B].sort()));
      }
      setRow(r, A, B, C);
    }
    answer = grid[2][2];
    const A = grid[2][0].rays, B = grid[2][1].rays;
    const union = [...new Set([...A, ...B])].sort((x, y) => x - y);
    const inter = A.filter((d) => B.includes(d)).sort((x, y) => x - y);
    if (template === "rayUnion") {
      explanation = `Figure addition: within each row, the third figure is the first two SUPERIMPOSED — every ray keeps its exact direction, nothing gained, nothing lost. Combine the third row's two figures ray by ray. The traps drop a ray, add a stray ray, or rotate the whole result.`;
      cand.push(
        answer.rays.length > 1 ? { rays: answer.rays.slice(1) } : { rays: rotRays(answer.rays, 1) },
        { rays: [...new Set([...answer.rays, (answer.rays[0] + 1) % 8])].sort((x, y) => x - y) },
        { rays: rotRays(answer.rays, 1) },
        { rays: [...A] },
        { rays: [...B] }
      );
    } else if (template === "rayMinus") {
      explanation = `A subtraction rule: in each row, the third figure is the FIRST figure with the second figure's rays removed. Take the third row's first figure and erase every ray that appears in the second. The biggest trap is the union (all rays kept) — addition is the rule your eye expects.`;
      cand.push(
        { rays: union },
        { rays: [...A] },
        { rays: [...B] },
        answer.rays.length > 1 ? { rays: answer.rays.slice(0, -1) } : { rays: rotRays(answer.rays, 1) },
        { rays: rotRays(answer.rays, 1) }
      );
    } else {
      explanation = `An XOR rule: the third figure keeps exactly the rays that appear in ONE of the first two figures — rays they share cancel out. In row 3 the first two figures ${inter.length ? "share " + (inter.length === 1 ? "a ray, which vanishes" : inter.length + " rays, which vanish") : "share no rays, so all carry through"}. The most tempting wrong answer is the plain overlay (union) — it ignores the cancellation.`;
      cand.push(
        { rays: union },
        inter.length ? { rays: inter } : { rays: [...A] },
        { rays: [...A] },
        { rays: [...B] },
        answer.rays.length > 1 ? { rays: answer.rays.slice(1) } : { rays: rotRays(answer.rays, 1) }
      );
    }
  }

  grid[2][2] = null;
  const topUp = [];
  for (let i = 0; i < 40; i++) topUp.push({ rays: raySubset(rng, 1, 6) });
  return finish(grid, answer, cand, explanation, diff, rng, topUp);
}
