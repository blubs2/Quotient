"use client";
// Assessment mode — a timed mini-battery modeled on CHC-structured tests
// (CORE/CAIT style): Fluid, Verbal, Quantitative, Visual-Spatial, Working
// Memory, Processing Speed. Produces a domain scorecard, never an "IQ score".
import { useMemo, useState } from "react";
import Link from "next/link";
import { mulberry32 } from "@/lib/rng";
import {
  genMatrix, genSeries, genAnalogy, genAntonym, genArithmetic,
  genWeights, genBlocks, genRotation,
} from "@/lib/generators";
import { QuestionCard, ProgressDots } from "@/components/ui";
import { DigitSpanStage, SequencingStage, SymbolSprintStage } from "@/components/stages";
import { useApp } from "@/components/AppProvider";
import { DOMAIN } from "@/lib/domains";
import Link2 from "next/link";

export default function AssessmentPage() {
  const { logAttempt, rateAnswer, saveAssessment } = useApp();
  const battery = useMemo(() => {
    const rng = mulberry32(Date.now() % 2147483647);
    const T = (q, t) => ({ ...q, timeLimit: t });
    return [
      T(genMatrix(rng, 1), 45),
      T(genAntonym(rng), 25),
      T(genArithmetic(rng, 2), 45),
      T(genMatrix(rng, 2), 60),
      T(genWeights(rng, 2), 60),
      T(genBlocks(rng, 2), 35),
      T(genSeries(rng, 2), 45),
      T(genAnalogy(rng, new Set(), 2), 30),
      T(genRotation(rng, 2), 35),
      T(genArithmetic(rng, 3), 60),
      T(genWeights(rng, 3), 75),
      T(genMatrix(rng, 3), 75),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [phase, setPhase] = useState("intro"); // intro -> battery -> digits -> seq -> sprint -> score
  const [results, setResults] = useState([]); // {cat, ok, ms}
  const [memory, setMemory] = useState(null);
  const [seqRes, setSeqRes] = useState(null);
  const [sprint, setSprint] = useState(null);
  const idx = results.length;

  const answer = (ok, ms) => {
    const q = battery[idx];
    logAttempt(q.cat, ok, ms, { tpl: q.tpl || q.cat, diff: q.diff || null, timed: true });
    rateAnswer(q, ok);
    const next = [...results, { cat: q.cat, ok, ms }];
    setResults(next);
    if (next.length >= battery.length) setPhase("digits");
  };

  const scorecard = () => {
    const domains = {};
    for (const r of results) {
      const d = DOMAIN[r.cat];
      domains[d] = domains[d] || { ok: 0, n: 0, ms: 0 };
      domains[d].ok += r.ok ? 1 : 0;
      domains[d].n += 1;
      domains[d].ms += r.ms || 0;
    }
    return domains;
  };

  return (
    <div>
      <div className="qz-screen-head">
        <Link href="/" className="qz-back">← Back</Link>
        <div className="qz-eyebrow">Assessment · timed battery</div>
      </div>

      {phase === "intro" && (
        <div className="qz-card">
          <div className="qz-eyebrow">Before you start</div>
          <p style={{ fontFamily: "var(--serif)", lineHeight: 1.65 }}>
            Twelve timed questions across Fluid Reasoning, Verbal, Quantitative, and
            Visual-Spatial — then Digit Span, Letter-Number Sequencing, and a 45-second
            Symbol Search sprint. About 12 minutes total. Once the clock starts on a
            question, it doesn&apos;t stop. You&apos;ll get a domain-by-domain scorecard at the
            end — a training profile, not an IQ score.
          </p>
          <button className="qz-primary" onClick={() => setPhase("battery")}>Begin</button>
        </div>
      )}

      {phase === "battery" && (
        <>
          <ProgressDots results={results.map((r) => r.ok)} total={battery.length} />
          <QuestionCard key={idx} q={battery[idx]} onAnswer={answer} qNum={idx + 1} qTotal={battery.length} />
        </>
      )}

      {phase === "digits" && (
        <DigitSpanStage
          onDone={(rs) => {
            rs.forEach((r) => logAttempt("memory", r.ok, null));
            setMemory(rs);
            setPhase("seq");
          }}
        />
      )}

      {phase === "seq" && (
        <SequencingStage
          onDone={(rs) => {
            rs.forEach((r) => logAttempt("memory", r.ok, null));
            setSeqRes(rs);
            setPhase("sprint");
          }}
        />
      )}

      {phase === "sprint" && (
        <SymbolSprintStage
          seconds={45}
          onDone={(s) => {
            logAttempt("speed", s.ok >= s.n * 0.8, null);
            setSprint(s);
            saveAssessment(
              (() => { const d = {}; for (const r of results) { const k = DOMAIN[r.cat]; d[k] = d[k] || { ok: 0, n: 0, ms: 0 }; d[k].ok += r.ok ? 1 : 0; d[k].n += 1; d[k].ms += r.ms || 0; } return d; })(),
              [...(memory || []), ...(seqRes || [])],
              s
            );
            setPhase("score");
          }}
        />
      )}

      {phase === "score" && (
        <div className="qz-card">
          <div className="qz-eyebrow">Your training profile</div>
          <div className="qz-scorecard">
            {Object.entries(scorecard()).map(([d, s]) => (
              <div className="qz-scorerow" key={d}>
                <span className="qz-scorelabel">{d}</span>
                <div className="qz-scoretrack">
                  <div className="qz-scorefill" style={{ width: `${(100 * s.ok) / s.n}%` }} />
                </div>
                <span className="qz-scoreval">{s.ok}/{s.n} · {(s.ms / s.n / 1000).toFixed(0)}s avg</span>
              </div>
            ))}
            {memory && (
              <div className="qz-scorerow">
                <span className="qz-scorelabel">Working Memory</span>
                <div className="qz-scoretrack">
                  <div className="qz-scorefill" style={{ width: `${(100 * (memory.filter((r) => r.ok).length + (seqRes?.filter((r) => r.ok).length || 0))) / (memory.length + (seqRes?.length || 0))}%` }} />
                </div>
                <span className="qz-scoreval">
                  span {Math.max(0, ...memory.filter((r) => r.ok && r.mode === "fwd").map((r) => r.len))} fwd
                </span>
              </div>
            )}
            {sprint && (
              <div className="qz-scorerow">
                <span className="qz-scorelabel">Processing Speed</span>
                <div className="qz-scoretrack">
                  <div className="qz-scorefill" style={{ width: `${sprint.n ? (100 * sprint.ok) / sprint.n : 0}%` }} />
                </div>
                <span className="qz-scoreval">{sprint.ok} in 45s</span>
              </div>
            )}
          </div>
          <p className="qz-note" style={{ marginTop: 16 }}>
            This run is saved. Head to <Link2 href="/progress" style={{ color: "var(--cobalt)" }}>Progress</Link2> to
            see it charted against your past runs — your lowest bar is where practice
            pays off fastest.
          </p>
          <Link href="/" className="qz-primary" style={{ textDecoration: "none", display: "inline-block" }}>Done</Link>
        </div>
      )}
    </div>
  );
}
