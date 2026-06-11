// Seeded RNG + helpers. Seeding by date is what makes the Daily Challenge
// identical for every player on the same day.
export function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
export const shuffle = (arr, rng) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

export function dateSeed(d = new Date()) {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
export function dailyNumber(d = new Date()) {
  const epoch = new Date(2026, 0, 1);
  return Math.max(1, Math.floor((d - epoch) / 86400000) + 1);
}
