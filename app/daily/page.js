"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { mulberry32, dateSeed, dailyNumber } from "@/lib/rng";
import { genMatrix, genSeries, genAnalogy } from "@/lib/generators";
import { QuestionCard, ProgressDots } from "@/components/ui";
import { useApp } from "@/components/AppProvider";

export default function DailyPage() {
  const { logAttempt, saveDaily } = useApp();
  const dn = dailyNumber();
  const daily = useMemo(() => {
    const rng = mulberry32(dateSeed());
    return [genMatrix(rng), genSeries(rng), genAnalogy(rng)];
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
        <div className="qz-eyebrow">Daily Challenge #{dn} · {today}</div>
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
            Same three puzzles for everyone today — seeded by the date. Come back tomorrow for #{dn + 1}.
          </p>
          <button className="qz-primary" onClick={share}>{copied ? "Copied!" : "Copy share result"}</button>
        </div>
      )}
    </div>
  );
}
