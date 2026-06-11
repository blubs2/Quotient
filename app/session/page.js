"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { mulberry32 } from "@/lib/rng";
import { genMatrix, genSeries, genAnalogy, genVocabQ } from "@/lib/generators";
import { QuestionCard, ProgressDots } from "@/components/ui";
import { useApp } from "@/components/AppProvider";

export default function SessionPage() {
  const { dueWords, logAttempt, reviewWord } = useApp();
  const queue = useMemo(() => {
    const rng = mulberry32(Date.now() % 2147483647);
    const qs = dueWords(6).map((w) => genVocabQ(w, rng));
    qs.splice(Math.min(2, qs.length), 0, genMatrix(rng));
    qs.splice(Math.min(5, qs.length), 0, genSeries(rng));
    qs.push(genAnalogy(rng));
    return qs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [results, setResults] = useState([]);
  const idx = results.length;
  const done = idx >= queue.length;
  const score = results.filter(Boolean).length;

  const answer = (ok, ms) => {
    const q = queue[idx];
    logAttempt(q.cat, ok, ms);
    if (q.cat === "vocab") reviewWord(q.word.w, ok);
    setResults([...results, ok]);
  };

  return (
    <div>
      <div className="qz-screen-head">
        <Link href="/" className="qz-back">← Back</Link>
        <div className="qz-eyebrow">Today&apos;s Session · ~6 min</div>
      </div>
      <ProgressDots results={results} total={queue.length} />
      {!done ? (
        <QuestionCard key={idx} q={queue[idx]} onAnswer={answer} qNum={idx + 1} qTotal={queue.length} />
      ) : (
        <div className="qz-card qz-result">
          <div className="qz-eyebrow">Session complete</div>
          <div className="qz-bigscore">{score}/{queue.length}</div>
          <p className="qz-note">
            Words you missed reset to a short interval and will resurface soon. Words you knew
            earned a longer wait. That spacing gradient — FSRS under the hood — is the entire
            engine of durable vocabulary gain.
          </p>
          <Link href="/" className="qz-primary" style={{ textDecoration: "none", display: "inline-block" }}>Done</Link>
        </div>
      )}
    </div>
  );
}
