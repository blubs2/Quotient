"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { mulberry32, dateSeed, dailyNumber } from "@/lib/rng";
import { genMatrix, genSeries, genAntonym, genArithmetic, genWeights, genRotation } from "@/lib/generators";
import { QuestionCard, ProgressDots } from "@/components/ui";
import { useApp } from "@/components/AppProvider";
import { NamePrompt } from "@/components/charts";
import { Leaderboard } from "@/components/leaderboard";

const DIFF_LABEL = { 1: "warm-up", 2: "standard", 3: "hard" };

export default function DailyPage() {
  const { logAttempt, saveDaily, rateAnswer } = useApp();
  const dn = dailyNumber();
  // Five questions, ramping easy -> hard. Seeded by date: identical worldwide.
  const daily = useMemo(() => {
    const rng = mulberry32(dateSeed());
    const T = (q, t) => ({ ...q, timeLimit: t });
    return [
      T(genMatrix(rng, 2), 60),
      T(genArithmetic(rng, 2), 45),
      T(genAntonym(rng), 25),
      T(genWeights(rng, 2), 60),
      T(genRotation(rng, 2), 35),
      T(genMatrix(rng, 3), 75),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [results, setResults] = useState([]);
  const [msTotal, setMsTotal] = useState(0);
  const [copied, setCopied] = useState(false);
  const idx = results.length;
  const done = idx >= daily.length;
  const score = results.filter(Boolean).length;

  const answer = (ok, ms) => {
    const q = daily[idx];
    logAttempt(q.cat, ok, ms, { tpl: q.tpl || q.cat, diff: q.diff || null, timed: true });
    rateAnswer(q, ok);
    const totalNow = msTotal + (ms || 0);
    setMsTotal(totalNow);
    const next = [...results, ok];
    setResults(next);
    if (next.length === daily.length) saveDaily(dn, next, totalNow);
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
            {score === 6
              ? "Perfect, under the clock. Respect."
              : score >= 4
              ? "Solid — the clock is half the difficulty."
              : "Timed questions feel different. That's the point — pacing is a skill."}
            {" "}Same six questions for everyone today. #{dn + 1} arrives at midnight.
          </p>
          <button className="qz-primary" onClick={share}>{copied ? "Copied!" : "Copy share result"}</button>
          <NamePrompt />
          <Leaderboard dailyNumber={dn} />
        </div>
      )}
    </div>
  );
}
