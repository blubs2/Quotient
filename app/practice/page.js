"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { mulberry32, pick } from "@/lib/rng";
import { genMatrix, genSeries, genAnalogy, genVocabQ, genAntonym, genArithmetic, genWeights, genBlocks, genRotation } from "@/lib/generators";
import { VOCAB } from "@/lib/data/vocab";
import { ANALOGIES } from "@/lib/data/analogies";
import { QuestionCard } from "@/components/ui";
import { useApp } from "@/components/AppProvider";

const CATS = [
  { id: "mixed", label: "Mixed" },
  { id: "matrices", label: "Matrices" },
  { id: "weights", label: "Weights" },
  { id: "blocks", label: "Blocks" },
  { id: "rotation", label: "Rotation" },
  { id: "series", label: "Series" },
  { id: "arithmetic", label: "Arithmetic" },
  { id: "antonyms", label: "Antonyms" },
  { id: "analogies", label: "Analogies" },
  { id: "vocab", label: "Vocabulary" },
];
const LEVELS = [
  { id: 0, label: "Adaptive" },
  { id: 1, label: "Easy" },
  { id: 2, label: "Medium" },
  { id: 3, label: "Hard" },
];

export default function PracticePage() {
  const { logAttempt, reviewWord } = useApp();
  const [cat, setCat] = useState("mixed");
  const [level, setLevel] = useState(0); // 0 = adaptive
  const [tick, setTick] = useState(0);
  const [run, setRun] = useState({ n: 0, ok: 0, streak: 0, best: 0 });
  const usedAnalogies = useMemo(() => new Set(), []);

  // Adaptive: difficulty climbs with your streak (3 right -> medium,
  // 6 right -> hard) and resets to easy on a miss.
  const diff = level === 0 ? 1 + Math.min(2, Math.floor(run.streak / 2)) : level;
  // Anti-repeat: remember the last 30 question signatures and regenerate
  // (up to 8 tries) if we'd serve one the player has just seen.
  const recentRef = useRef([]);

  const q = useMemo(() => {
    let out = null, key = "";
    for (let attempt = 0; attempt < 8; attempt++) {
      const rng = mulberry32((Date.now() + tick * 7919 + attempt * 104729) % 2147483647);
      const c = cat === "mixed"
        ? pick(["matrices", "weights", "blocks", "rotation", "series", "arithmetic", "antonyms", "analogies", "vocab"], rng)
        : cat;
      if (c === "matrices") out = genMatrix(rng, diff);
      else if (c === "weights") out = genWeights(rng, Math.max(2, diff));
      else if (c === "blocks") out = genBlocks(rng, diff);
      else if (c === "rotation") out = genRotation(rng, diff);
      else if (c === "series") out = genSeries(rng, diff);
      else if (c === "arithmetic") out = genArithmetic(rng, diff);
      else if (c === "antonyms") out = genAntonym(rng);
      else if (c === "analogies") {
        if (usedAnalogies.size >= ANALOGIES.length) usedAnalogies.clear();
        out = genAnalogy(rng, usedAnalogies, diff);
      } else out = genVocabQ(pick(VOCAB, rng), rng, diff);
      key = out.cat + ":" + JSON.stringify(out.grid || out.heights || out.target || out.scales || out.prompt);
      if (!recentRef.current.includes(key)) break;
    }
    if (out.cat === "analogies") usedAnalogies.add(out.bankIndex);
    recentRef.current = [...recentRef.current.filter((k) => k !== key), key].slice(-30);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, tick]);

  const answer = (ok, ms) => {
    logAttempt(q.cat, ok, ms);
    if (q.cat === "vocab") reviewWord(q.word.w, ok);
    setRun((r) => {
      const streak = ok ? r.streak + 1 : 0;
      return { n: r.n + 1, ok: r.ok + (ok ? 1 : 0), streak, best: Math.max(r.best, streak) };
    });
    setTick((t) => t + 1);
  };

  return (
    <div>
      <div className="qz-screen-head">
        <Link href="/" className="qz-back">← Back</Link>
        <div className="qz-eyebrow">Infinite Practice</div>
      </div>
      <div className="qz-chips">
        {CATS.map((c) => (
          <button
            key={c.id}
            className={"qz-chip" + (cat === c.id ? " qz-chip-on" : "")}
            onClick={() => { setCat(c.id); setTick((t) => t + 1); }}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="qz-chips">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            className={"qz-chip" + (level === l.id ? " qz-chip-on" : "")}
            onClick={() => { setLevel(l.id); setTick((t) => t + 1); }}
          >
            {l.label}
          </button>
        ))}
      </div>
      <div className="qz-runstats">
        <span>{run.n} answered</span>
        <span>{run.n ? Math.round((100 * run.ok) / run.n) : 0}% accuracy</span>
        <span>streak {run.streak} (best {run.best})</span>
        <span>level {diff}{level === 0 ? " (auto)" : ""}</span>
      </div>
      <QuestionCard key={tick + cat + "-" + level} q={q} onAnswer={answer} />
    </div>
  );
}
