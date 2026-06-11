import { fsrs, generatorParameters, createEmptyCard, Rating } from "ts-fsrs";

const f = fsrs(generatorParameters({ enable_fuzz: true }));

function revive(card) {
  if (!card) return createEmptyCard();
  return {
    ...card,
    due: new Date(card.due),
    last_review: card.last_review ? new Date(card.last_review) : undefined,
  };
}

// One review step. Binary grading for now (the UI is right/wrong);
// FSRS supports 4 grades if you later add "hard"/"easy" buttons.
export function schedule(prevCard, correct) {
  const card = revive(prevCard);
  const rec = f.repeat(card, new Date());
  const next = rec[correct ? Rating.Good : Rating.Again].card;
  return { card: next, due: next.due };
}

export function isDue(entry, now = new Date()) {
  if (!entry || !entry.due) return true; // never-seen words are always due
  return new Date(entry.due) <= now;
}

// Compress FSRS stability (days) into 0-5 pips for the Word Vault UI.
export function boxOf(entry) {
  if (!entry || !entry.card) return 0;
  const s = entry.card.stability || 0;
  return Math.min(5, 1 + Math.floor(Math.log2(1 + s)));
}
