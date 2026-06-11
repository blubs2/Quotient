"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useApp } from "./AppProvider";

/* ---------------- SVG renderers ---------------- */
function Glyph({ shape, cx, cy, s, rot, fill }) {
  const style =
    fill === "solid"
      ? { fill: "var(--ink)", stroke: "var(--ink)", strokeWidth: 4 }
      : fill === "half"
      ? { fill: "var(--ink)", fillOpacity: 0.3, stroke: "var(--ink)", strokeWidth: 4 }
      : { fill: "none", stroke: "var(--ink)", strokeWidth: 4.5 };
  const tr = `rotate(${rot || 0} ${cx} ${cy})`;
  if (shape === "circle") return <circle cx={cx} cy={cy} r={s / 2} {...style} />;
  if (shape === "square")
    return <rect x={cx - s / 2} y={cy - s / 2} width={s} height={s} transform={tr} {...style} />;
  if (shape === "triangle") {
    const h = s * 0.92;
    return (
      <polygon
        points={`${cx},${cy - h / 2} ${cx - s / 2},${cy + h / 2} ${cx + s / 2},${cy + h / 2}`}
        transform={tr}
        {...style}
      />
    );
  }
  return (
    <polygon
      points={`${cx},${cy - s / 2} ${cx + s / 2},${cy} ${cx},${cy + s / 2} ${cx - s / 2},${cy}`}
      transform={tr}
      {...style}
    />
  );
}

export function Cell({ spec, size = 84, missing = false }) {
  if (missing || !spec)
    return (
      <svg viewBox="0 0 100 100" width={size} height={size} aria-label="missing cell">
        <text x="50" y="62" textAnchor="middle" fontSize="44" fill="var(--cobalt)" fontFamily="var(--mono)">?</text>
      </svg>
    );
  const { shape, count, fill, rot } = spec;
  const pos =
    count === 1
      ? [[50, 50, 46]]
      : count === 2
      ? [[31, 31, 30], [69, 69, 30]]
      : [[50, 27, 26], [29, 69, 26], [71, 69, 26]];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      {pos.map((p, i) => (
        <Glyph key={i} shape={shape} cx={p[0]} cy={p[1]} s={p[2]} rot={rot} fill={fill} />
      ))}
    </svg>
  );
}

/* ---------------- progress dots ---------------- */
export function ProgressDots({ results, total }) {
  return (
    <div className="qz-dots" aria-label="progress">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={
            "qz-dot " + (i < results.length ? (results[i] ? "qz-dot-ok" : "qz-dot-no") : "")
          }
        />
      ))}
    </div>
  );
}

/* ---------------- question card ---------------- */
const LETTERS = ["A", "B", "C", "D", "E", "F"];
const CAT_LABEL = {
  matrices: "Matrix Reasoning",
  series: "Number Series",
  analogies: "Verbal Analogy",
  vocab: "Vocabulary",
};

export function QuestionCard({ q, onAnswer, qNum, qTotal }) {
  const [selected, setSelected] = useState(null);
  const startRef = useRef(Date.now());
  const revealed = selected !== null;
  const choose = (i) => {
    if (!revealed) setSelected(i);
  };
  return (
    <div className="qz-card">
      <div className="qz-card-head">
        <div className="qz-eyebrow">
          {CAT_LABEL[q.cat]}
          {qTotal ? ` · ${qNum}/${qTotal}` : ""}
        </div>
        {q.cat === "vocab" && <div className="qz-eyebrow">define the word</div>}
      </div>

      {q.cat === "matrices" ? (
        <div className="qz-matrix">
          {q.grid.map((row, r) =>
            row.map((cell, c) => (
              <div key={r + "-" + c} className={"qz-mcell" + (cell ? "" : " qz-mcell-missing")}>
                <Cell spec={cell} missing={!cell} size={76} />
              </div>
            ))
          )}
        </div>
      ) : (
        <div className={"qz-prompt" + (q.cat === "vocab" ? " qz-prompt-word" : "")}>
          {q.prompt}
          {q.sub && <span className="qz-pos"> {q.sub}</span>}
        </div>
      )}

      <div className={"qz-opts" + (q.cat === "matrices" ? " qz-opts-grid" : "")}>
        {q.options.map((opt, i) => {
          let cls = "qz-opt";
          if (revealed) {
            if (i === q.correct) cls += " qz-opt-correct";
            else if (i === selected) cls += " qz-opt-wrong";
            else cls += " qz-opt-dim";
          }
          return (
            <button key={i} className={cls} onClick={() => choose(i)} disabled={revealed}>
              <span className="qz-opt-letter">{LETTERS[i]}</span>
              {q.cat === "matrices" ? <Cell spec={opt} size={56} /> : <span>{opt}</span>}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className={"qz-explain " + (selected === q.correct ? "qz-explain-ok" : "qz-explain-no")}>
          <div className="qz-verdict">
            {selected === q.correct ? "Correct" : `Not quite — the answer is ${LETTERS[q.correct]}`}
          </div>
          <p>{q.explanation}</p>
          <button
            className="qz-next"
            onClick={() => onAnswer(selected === q.correct, Date.now() - startRef.current)}
          >
            Continue →
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- header ---------------- */
export function Chrome() {
  const app = useApp();
  return (
    <header className="qz-chrome">
      <Link href="/" className="qz-chrome-logo">QUOTIENT</Link>
      <nav className="qz-chrome-nav">
        <Link href="/daily">Daily</Link>
        <Link href="/session">Session</Link>
        <Link href="/practice">Practice</Link>
        <Link href="/vault">Vault</Link>
        {app?.user ? (
          <button className="qz-chrome-auth" onClick={app.signOut} title={app.user.email}>
            Sign out
          </button>
        ) : (
          <Link href="/login" className="qz-chrome-auth">Sign in</Link>
        )}
      </nav>
    </header>
  );
}
