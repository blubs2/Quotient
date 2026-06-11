"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { mulberry32, pick } from "@/lib/rng";
import { genMatrix, genSeries, genAnalogy, genVocabQ } from "@/lib/generators";
import { VOCAB } from "@/lib/data/vocab";
import { ANALOGIES } from "@/lib/data/analogies";
import { QuestionCard } from "@/components/ui";
import { useApp } from "@/components/AppProvider";

const CATS = [
  { id: "mixed", label: "Mixed" },
  { id: "matrices", label: "Matrices" },
  { id: "series", label: "Series" },
  { id: "analogies", label: "Analogies" },
  { id: "vocab", label: "Vocabulary" },
];

export default function PracticePage() {
  const { logAttempt, reviewWord } = useApp();
  const [cat, setCat] = useState("mixed");
  const [tick, setTick] = useState(0);
  const [run, setRun] = useState({ n: 0, ok: 0, streak: 0, best: 0 });
  const usedAnalogies = useMemo(() => new Set(), []);

  const q = useMemo(() => {
    const rng = mulberry32((Date.now() + tick * 7919) % 2147483647);
    const c = cat === "mixed" ? pick(["matrices", "series", "analogies", "vocab"], rng) : cat;
    if (c === "matrices") return genMatrix(rng);
    if (c === "series") return genSeries(rng);
    if (c === "analogies") {
      if (usedAnalogies.size >= ANALOGIES.length) usedAnalogies.clear();
      const a = genAnalogy(rng, usedAnalogies);
      usedAnalogies.add(a.bankIndex);
      return a;
    }
    return genVocabQ(pick(VOCAB, rng), rng);
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
      <div className="qz-runstats">
        <span>{run.n} answered</span>
        <span>{run.n ? Math.round((100 * run.ok) / run.n) : 0}% accuracy</span>
        <span>streak {run.streak} (best {run.best})</span>
      </div>
      <QuestionCard key={tick + cat} q={q} onAnswer={answer} />
    </div>
  );
}
