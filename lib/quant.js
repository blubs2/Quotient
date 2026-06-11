// Quantitative Reasoning: timed mental arithmetic & word problems (WAIS
// Arithmetic style). Numbers are constructed backwards from clean answers.
import { shuffle, pick } from "./rng";

export function genArithmetic(rng, diff = 1) {
  let prompt = "", ans = 0, explanation = "";
  const t = diff === 1
    ? pick(["mult", "pct", "sub"], rng)
    : diff === 2
    ? pick(["discount", "ratio", "rate", "avg"], rng)
    : pick(["reversePct", "work", "twoStep", "fifth"], rng);

  if (t === "mult") {
    const a = 12 + Math.floor(rng() * 14), b = 3 + Math.floor(rng() * 6);
    ans = a * b;
    prompt = `${a} × ${b} = ?`;
    explanation = `Break it apart: ${a} × ${b} = (${a} × ${b - 1}) + ${a} = ${a * (b - 1)} + ${a} = ${ans}. Chunking beats digit-by-digit under time pressure.`;
  } else if (t === "pct") {
    const base = pick([40, 60, 80, 120, 200], rng), p = pick([15, 25, 35, 5], rng);
    ans = (base * p) / 100;
    prompt = `What is ${p}% of ${base}?`;
    explanation = `Use 10% as an anchor: 10% of ${base} is ${base / 10}, so ${p}% = ${p / 5} × ${base / 20}... cleanest: ${p}% of ${base} = ${base} × ${p}/100 = ${ans}. (For 15%: take 10% then add half of it.)`;
  } else if (t === "sub") {
    const a = 200 + Math.floor(rng() * 600), b = 38 + Math.floor(rng() * 120);
    ans = a - b;
    prompt = `${a} − ${b} = ?`;
    explanation = `Round the subtrahend: ${a} − ${b} = ${a} − ${b + (10 - (b % 10))} + ${10 - (b % 10)} = ${ans}. Subtract a round number, then give back the difference.`;
  } else if (t === "discount") {
    const orig = pick([60, 80, 120, 240], rng), d = pick([25, 20, 50, 10], rng);
    ans = orig * (1 - d / 100);
    prompt = `A jacket costs $${orig}. It's discounted ${d}%. What's the sale price?`;
    explanation = `${d}% of ${orig} is ${(orig * d) / 100}, so the price drops to ${orig} − ${(orig * d) / 100} = $${ans}. Faster: pay ${100 - d}% → ${orig} × ${(100 - d) / 100} = ${ans}.`;
  } else if (t === "ratio") {
    const u = 4 + Math.floor(rng() * 5), a = 2 + Math.floor(rng() * 3), b = a + 1 + Math.floor(rng() * 2);
    const total = (a + b) * u;
    ans = b * u;
    prompt = `$${total} is split between two people in the ratio ${a}:${b}. How much does the larger share get?`;
    explanation = `The ratio ${a}:${b} has ${a + b} parts. Each part = ${total} ÷ ${a + b} = ${u}. The larger share is ${b} parts: ${b} × ${u} = $${ans}.`;
  } else if (t === "rate") {
    const speed = pick([40, 60, 80, 90], rng), hours = pick([1.5, 2.5, 0.5, 3], rng);
    ans = speed * hours;
    prompt = `A train travels at ${speed} km/h for ${hours} hours. How far does it go?`;
    explanation = `Distance = speed × time = ${speed} × ${hours} = ${ans} km. For half-hours, halve the speed and add: ${speed} × ${Math.floor(hours)} + ${speed * (hours % 1)}.`;
  } else if (t === "avg") {
    const n = 4, avg = 8 + Math.floor(rng() * 10);
    const others = [avg - 3, avg + 1, avg + 4];
    ans = avg * n - others.reduce((s, x) => s + x, 0);
    prompt = `The average of four numbers is ${avg}. Three of them are ${others.join(", ")}. What is the fourth?`;
    explanation = `If the average of 4 numbers is ${avg}, their total is 4 × ${avg} = ${avg * n}. The three known numbers sum to ${others.reduce((s, x) => s + x, 0)}, so the fourth is ${avg * n} − ${others.reduce((s, x) => s + x, 0)} = ${ans}. Always convert averages to totals.`;
  } else if (t === "reversePct") {
    const orig = pick([80, 120, 150, 200], rng), d = pick([20, 25, 40], rng);
    const sale = orig * (1 - d / 100);
    ans = orig;
    prompt = `After a ${d}% discount, a phone costs $${sale}. What was the original price?`;
    explanation = `The sale price is ${100 - d}% of the original. So original = ${sale} ÷ ${(100 - d) / 100} = $${ans}. The trap is adding ${d}% back to ${sale} — that gives the wrong answer because the percentage was taken of the LARGER number.`;
  } else if (t === "work") {
    const a = pick([6, 4, 3], rng); const b = a * 2;
    ans = (a * b) / (a + b);
    prompt = `Pipe A fills a tank in ${b} hours; pipe B fills it in ${a} hours. Together, how many hours do they take?`;
    explanation = `Add the RATES, not the times. A fills 1/${b} per hour, B fills 1/${a} per hour → together ${a + b}/${a * b} per hour → time = ${a * b}/${a + b} = ${ans} hours. Combined time is always less than the faster pipe alone.`;
  } else if (t === "twoStep") {
    const base = pick([100, 200, 400], rng), up = 50, down = 50;
    ans = base * 1.5 * 0.5;
    prompt = `A stock worth $${base} rises ${up}%, then falls ${down}%. What is it worth now?`;
    explanation = `Percent changes compound — they don't cancel. Rise: ${base} × 1.5 = ${base * 1.5}. Fall: ${base * 1.5} × 0.5 = $${ans}. Up ${up}% then down ${down}% always lands BELOW the start, because the fall applies to the bigger number.`;
  } else {
    // fifth: fraction comparison via common base
    const a = 3 + Math.floor(rng() * 3);
    ans = a * 15;
    prompt = `A number's third is ${a * 5}. What is the number?`;
    explanation = `If one-third of the number is ${a * 5}, the number is 3 × ${a * 5} = ${ans}. Restate "a third of x is y" as x = 3y instantly — don't set up an equation under time pressure.`;
  }

  const spread = shuffle([ans + 2, ans - 2, ans + 5, ans - 5, ans + 10, Math.round(ans * 1.25), Math.round(ans * 0.8)], rng);
  const uniq = [];
  for (const o of spread) if (o !== ans && o > 0 && !uniq.includes(o)) uniq.push(o);
  const opts = shuffle([ans, ...uniq.slice(0, 3)], rng);
  return {
    cat: "arithmetic", diff, tpl: t, prompt,
    options: opts.map((o) => String(Math.round(o * 100) / 100)),
    correct: opts.indexOf(ans),
    explanation,
  };
}
