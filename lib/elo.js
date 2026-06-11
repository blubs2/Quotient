// Elo-style per-domain rating. Each question carries an implicit item rating
// from its difficulty tier; your domain rating moves toward your true level
// with every TIMED answer. It's a performance rating — never an IQ claim.
export const START_RATING = 1200;
export const itemRating = (q) => 900 + (q.diff || 2) * 200; // 1100 / 1300 / 1500

export function eloUpdate(rating, itemR, ok, n = 0) {
  // higher K early so new players converge fast, then stabilize
  const k = n < 15 ? 40 : n < 50 ? 28 : 18;
  const expected = 1 / (1 + Math.pow(10, (itemR - rating) / 400));
  return Math.round(rating + k * ((ok ? 1 : 0) - expected));
}
