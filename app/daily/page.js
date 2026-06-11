"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { mulberry32, dateSeed, dailyNumber } from "@/lib/rng";
import { genMatrix, genSeries, genAnalogy, genVocabQ } from "@/lib/generators";
import { VOCAB } from "@/lib/data/vocab";
import { QuestionCard, ProgressDots } from "@/components/ui";
import { useApp } from "@/components/AppProvider";

const DIFF_LABEL = { 1: "warm-up", 2: "standard", 3: "hard" };

export default function DailyPage() {
  const { logAttempt, saveDaily } = useApp();
  const dn = dailyNumber();
  // Five questions, ramping easy -> hard. Seeded by date: identical worldwide.
  const daily = useMemo(() => {
    const rng = mulberry32(dateSeed());
    const wordOfDay = VOCAB[dn % VOCAB.length];
    return [
      genMatrix(rng, 1),
      genSeries(rng, 2),
      genVocabQ(wordOfDay, rng, 2),
      genAnalogy(rng, new Set(), 3),
      genMatrix(rng, 3),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [results, setResults] = useState([]);
  const [copied, setCopied] = useState(false);
  const idx = results.length;
  const done = idx >= daily.length;
  const score = results.filter(Boolean).length;

  const answer = (ok, ms) => {
    logAttempt(daily[idx].cat, ok, ms);
    const next = [...results, ok];
    setResults(next);
    if (next.length === daily.length) saveDaily(dn, next);
  };

  const share = () => {
    const squares = results.map((r) => (r ? "\u{1F7E9}" : "\u{1F7E5}")).join("");
    const txt = `QUOTIENT Daily #${dn}\n${squares} ${score}/${daily.length}\n${typeof window !== "undefined" ? window.location.origin : ""}`;
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => setCopied(true)).catch(() => setCopied(true));
    else setCopied(true);
  };

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div>
      <div className="qz-screen-head">
        <Link href="/" className="qz-back">← Back</Link>
        <div className="qz-eyebrow">Daily #{dn} · {today}{!done && daily[idx] ? ` · ${DIFF_LABEL[daily[idx].diff] || ""}` : ""}</div>
      </div>
      <ProgressDots results={results} total={daily.length} />
      {!done ? (
        <QuestionCard key={idx} q={daily[idx]} onAnswer={answer} qNum={idx + 1} qTotal={daily.length} />
      ) : (
        <div className="qz-card qz-result">
          <div className="qz-eyebrow">Result</div>
          <div className="qz-bigscore">{score}/{daily.length}</div>
          <div className="qz-squares">{results.map((r, i) => <span key={i}>{r ? "\u{1F7E9}" : "\u{1F7E5}"}</span>)}</div>
          <p className="qz-note">
            {score === 5
              ? "Perfect — including the hard tier. Respect."
              : score >= 3
              ? "Solid. Questions 4 and 5 are meant to bite."
              : "The ramp gets steep at the end — that's by design. Tomorrow's another shot."}
            {" "}Same five puzzles for everyone today. #{dn + 1} arrives at midnight.
          </p>
          <button className="qz-primary" onClick={share}>{copied ? "Copied!" : "Copy share result"}</button>
        </div>
      )}
    </div>
  );
}
