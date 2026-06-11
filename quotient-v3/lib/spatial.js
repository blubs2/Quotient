// Visual-Spatial subtests: Block Counting (count cubes including hidden ones
// in an isometric stack) and Mental Rotation (rotation vs. mirror image).
import { shuffle, pick } from "./rng";

/* ---------------- Block Counting ---------------- */
export function genBlocks(rng, diff = 1) {
  const n = diff >= 3 ? 4 : 3;
  const maxH = diff === 1 ? 2 : 3;
  const heights = [];
  let total = 0;
  for (let y = 0; y < n; y++) {
    const row = [];
    for (let x = 0; x < n; x++) {
      // bias toward taller stacks at the back so hidden cubes exist
      const h = Math.floor(rng() * (maxH + 1) * (y < n / 2 ? 1 : 0.8));
      row.push(Math.min(maxH, h));
    }
    heights.push(row);
  }
  // guarantee at least one hidden cube and a non-trivial total
  heights[0][0] = Math.max(heights[0][0], 2);
  heights[1][0] = Math.max(heights[1][0], 1);
  total = heights.flat().reduce((s, h) => s + h, 0);
  if (total < n + 2) {
    heights[0][1] = Math.min(maxH, heights[0][1] + 2);
    total = heights.flat().reduce((s, h) => s + h, 0);
  }
  const colList = heights.flat().filter((h) => h > 0);
  const opts = shuffle([total, total - 1, total + 1, total - 2].filter((v, i, a) => v > 0 && a.indexOf(v) === i), rng);
  while (opts.length < 4) opts.push(total + opts.length);
  return {
    cat: "blocks",
    diff,
    heights,
    options: opts.map(String),
    correct: opts.indexOf(total),
    explanation: `Count column by column, not cube by cube — every column's full height counts, including cubes hidden behind or underneath others. The ${colList.length} occupied columns have heights ${colList.join(", ")}, which sum to ${total}. The classic error is counting only the cubes whose faces you can see.`,
  };
}

/* ---------------- Mental Rotation (rotation vs. mirror) ---------------- */
const normalize = (cells) => {
  const minX = Math.min(...cells.map((c) => c[0]));
  const minY = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y]) => [x - minX, y - minY]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
};
const rot90 = (cells) => normalize(cells.map(([x, y]) => [y, -x]));
const mirror = (cells) => normalize(cells.map(([x, y]) => [-x, y]));
const csig = (cells) => JSON.stringify(normalize(cells));
const rotations = (cells) => {
  const out = [normalize(cells)];
  for (let i = 0; i < 3; i++) out.push(rot90(out[out.length - 1]));
  return out;
};

function randomPolyomino(rng, size) {
  const cells = [[0, 0]];
  const has = new Set(["0,0"]);
  while (cells.length < size) {
    const [bx, by] = pick(cells, rng);
    const [dx, dy] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]], rng);
    const k = `${bx + dx},${by + dy}`;
    if (!has.has(k)) {
      has.add(k);
      cells.push([bx + dx, by + dy]);
    }
  }
  return normalize(cells);
}

export function genRotation(rng, diff = 1) {
  const size = diff >= 3 ? 7 : diff === 2 ? 6 : 5;
  let target;
  // require a CHIRAL polyomino: its mirror must not equal any rotation of it,
  // otherwise "mirror" distractors would be valid answers
  for (let i = 0; i < 200; i++) {
    target = randomPolyomino(rng, size);
    const rots = rotations(target).map((r) => JSON.stringify(r));
    if (!rots.includes(JSON.stringify(mirror(target)))) break;
  }
  const k = 1 + Math.floor(rng() * 3); // 90, 180, or 270 degrees
  let answer = target;
  for (let i = 0; i < k; i++) answer = rot90(answer);

  const m = mirror(target);
  const mRots = rotations(m);
  const rotSigs = new Set(rotations(target).map((r) => JSON.stringify(r)));
  const isValidRotation = (cells) => rotSigs.has(JSON.stringify(normalize(cells)));
  // altered shape: move one extremity cell somewhere else
  const altered = (() => {
    const cells = normalize(target).map((c) => [...c]);
    const idx = cells.length - 1;
    for (let t = 0; t < 50; t++) {
      const [bx, by] = pick(cells, rng);
      const [dx, dy] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]], rng);
      const cand = cells.filter((_, i) => i !== idx).concat([[bx + dx, by + dy]]);
      if (new Set(cand.map((c) => c.join(","))).size === cand.length && !isValidRotation(cand))
        return normalize(cand);
    }
    return normalize(mRots[0]);
  })();

  const seen = new Set([csig(answer)]);
  const distract = [];
  for (const d of [mRots[k % 4], mRots[(k + 1) % 4], altered, mRots[(k + 2) % 4]]) {
    const s = csig(d);
    if (!seen.has(s) && !isValidRotation(d) && distract.length < 3) { seen.add(s); distract.push(d); }
  }
  while (distract.length < 3) {
    const extra = randomPolyomino(rng, size);
    const s = csig(extra);
    if (!seen.has(s) && !isValidRotation(extra)) { seen.add(s); distract.push(extra); }
  }
  const semOpts = shuffle([answer, ...distract], rng);
  return {
    cat: "rotation",
    diff,
    target,
    optionType: "poly",
    options: semOpts,
    correct: semOpts.indexOf(answer),
    explanation: `The answer is the original figure rotated ${k * 90}° — rotation turns a shape but never flips it. The tempting wrong options are MIRROR images (some also rotated): they match the figure's outline lengths but trace it in the opposite handedness. Quick test: pick a distinctive corner and walk the perimeter clockwise — in a mirror image the same landmarks come up counterclockwise.`,
  };
}
