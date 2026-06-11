"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useApp } from "./AppProvider";

/* ---------------- SVG renderers ---------------- */
/* Cells arrive as render specs: { els: [...] } for shape layers, or
   { marks: [...] } for line-logic puzzles. "knock" fill cuts an inner shape
   out of a solid outer one. */
function El({ shape, cx, cy, s, rot, fill }) {
  const style =
    fill === "solid"
      ? { fill: "var(--ink)", stroke: "var(--ink)", strokeWidth: 3.5 }
      : fill === "half"
      ? { fill: "var(--ink)", fillOpacity: 0.3, stroke: "var(--ink)", strokeWidth: 3.5 }
      : fill === "knock"
      ? { fill: "var(--card)", stroke: "var(--card)", strokeWidth: 2 }
      : { fill: "none", stroke: "var(--ink)", strokeWidth: 4 };
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

const MARK_LINES = {
  h: [16, 50, 84, 50],
  v: [50, 16, 50, 84],
  d1: [22, 22, 78, 78],
  d2: [22, 78, 78, 22],
};

export function Cell({ spec, size = 84, missing = false }) {
  if (missing || !spec)
    return (
      <svg viewBox="0 0 100 100" width={size} height={size} aria-label="missing cell">
        <text x="50" y="62" textAnchor="middle" fontSize="44" fill="var(--cobalt)" fontFamily="var(--mono)">?</text>
      </svg>
    );
  const els = spec.els || [];
  const marks = spec.marks || [];
  const rays = spec.rays || [];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      {rays.length > 0 && <circle cx="50" cy="50" r="3.5" fill="var(--ink)" />}
      {rays.map((d) => {
        const a = (d * 45 * Math.PI) / 180;
        return (
          <line key={d} x1="50" y1="50" x2={50 + 40 * Math.sin(a)} y2={50 - 40 * Math.cos(a)}
            stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
        );
      })}
      {els.map((el, i) => (
        <El key={i} {...el} />
      ))}
      {marks.map((m) => {
        const [x1, y1, x2, y2] = MARK_LINES[m];
        return <line key={m} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink)" strokeWidth="4.5" strokeLinecap="round" />;
      })}
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

/* ---------------- subtest renderers ---------------- */
const WSYM = { tri: "▲", cir: "●", sqr: "■" };

export function ShapeGroup({ items, size = 26 }) {
  return (
    <span style={{ fontSize: size, letterSpacing: 4, lineHeight: 1 }}>
      {items.map((k, i) => <span key={i}>{WSYM[k]}</span>)}
    </span>
  );
}

export function WeightsView({ scales, qLeft }) {
  const Scale = ({ L, R, q }) => (
    <div className="qz-scale">
      <div className="qz-pan"><ShapeGroup items={L} /></div>
      <div className="qz-beam">{q ? "= ?" : "="}</div>
      <div className="qz-pan">{R ? <ShapeGroup items={R} /> : <span className="qz-qmark">?</span>}</div>
    </div>
  );
  return (
    <div className="qz-weights">
      {scales.map((s, i) => <Scale key={i} L={s.L} R={s.R} />)}
      <Scale L={qLeft} R={null} q />
    </div>
  );
}

export function BlocksView({ heights, size = 200 }) {
  const n = heights.length;
  const u = 17; // iso unit
  const cubes = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      for (let z = 0; z < heights[y][x]; z++) cubes.push([x, y, z]);
  cubes.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]) || a[2] - b[2]);
  const px = (x, y) => 100 + (x - y) * u;
  const py = (x, y, z) => 60 + (x + y) * u * 0.55 - z * u * 0.95;
  return (
    <svg viewBox="0 0 200 160" width={size} height={size * 0.8} style={{ display: "block", margin: "0 auto" }}>
      {cubes.map(([x, y, z], i) => {
        const cx = px(x, y), cy = py(x, y, z);
        const top = `${cx},${cy - u * 0.55} ${cx + u},${cy} ${cx},${cy + u * 0.55} ${cx - u},${cy}`;
        const left = `${cx - u},${cy} ${cx},${cy + u * 0.55} ${cx},${cy + u * 0.55 + u * 0.95} ${cx - u},${cy + u * 0.95}`;
        const right = `${cx + u},${cy} ${cx},${cy + u * 0.55} ${cx},${cy + u * 0.55 + u * 0.95} ${cx + u},${cy + u * 0.95}`;
        return (
          <g key={i} stroke="var(--ink)" strokeWidth="1" strokeLinejoin="round">
            <polygon points={top} fill="var(--card)" />
            <polygon points={left} fill="var(--ink)" fillOpacity="0.25" />
            <polygon points={right} fill="var(--ink)" fillOpacity="0.55" />
          </g>
        );
      })}
    </svg>
  );
}

export function PolyView({ cells, size = 78 }) {
  const maxX = Math.max(...cells.map((c) => c[0])) + 1;
  const maxY = Math.max(...cells.map((c) => c[1])) + 1;
  const m = Math.max(maxX, maxY);
  const u = 88 / m;
  const ox = (100 - maxX * u) / 2, oy = (100 - maxY * u) / 2;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      {cells.map(([x, y], i) => (
        <rect key={i} x={ox + x * u} y={oy + y * u} width={u} height={u}
          fill="var(--ink)" fillOpacity="0.85" stroke="var(--card)" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

/* ---------------- question card ---------------- */
const LETTERS = ["A", "B", "C", "D", "E", "F"];
const CAT_LABEL = {
  matrices: "Matrix Reasoning",
  series: "Number Series",
  analogies: "Verbal Analogy",
  vocab: "Vocabulary",
  antonyms: "Antonyms",
  arithmetic: "Arithmetic",
  weights: "Figure Weights",
  blocks: "Block Counting",
  rotation: "Mental Rotation",
};
const CAT_HINT = {
  weights: "the first scales are balanced — what balances the last one?",
  blocks: "how many cubes in total, including hidden ones?",
  rotation: "which is the SAME shape, only rotated?",
  antonyms: "select the OPPOSITE",
};

export function QuestionCard({ q, onAnswer, qNum, qTotal }) {
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(q.timeLimit ?? null);
  const startRef = useRef(Date.now());
  const revealed = selected !== null;
  const choose = (i) => {
    if (!revealed) setSelected(i);
  };
  useEffect(() => {
    if (q.timeLimit == null || revealed) return;
    if (timeLeft <= 0) {
      setSelected(-1); // -1 = timed out
      return;
    }
    const t = setTimeout(() => setTimeLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, revealed, q.timeLimit]);

  const isGridOpts = q.cat === "matrices" || q.optionType === "poly";

  return (
    <div className="qz-card">
      <div className="qz-card-head">
        <div className="qz-eyebrow">
          {CAT_LABEL[q.cat] || q.cat}
          {qTotal ? ` · ${qNum}/${qTotal}` : ""}
        </div>
        {q.cat === "vocab" && <div className="qz-eyebrow">define the word</div>}
        {CAT_HINT[q.cat] && <div className="qz-eyebrow qz-hint">{CAT_HINT[q.cat]}</div>}
      </div>

      {q.timeLimit != null && !revealed && (
        <div className="qz-timer">
          <div className="qz-timer-bar" style={{ width: `${(100 * timeLeft) / q.timeLimit}%`,
            background: timeLeft <= 5 ? "var(--no)" : "var(--cobalt)" }} />
        </div>
      )}

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
      ) : q.cat === "weights" ? (
        <WeightsView scales={q.scales} qLeft={q.qLeft} />
      ) : q.cat === "blocks" ? (
        <BlocksView heights={q.heights} />
      ) : q.cat === "rotation" ? (
        <div style={{ textAlign: "center", margin: "8px 0 14px" }}>
          <PolyView cells={q.target} size={108} />
        </div>
      ) : (
        <div className={"qz-prompt" + (q.cat === "vocab" || q.cat === "antonyms" ? " qz-prompt-word" : "")}>
          {q.prompt}
          {q.sub && <span className="qz-pos"> {q.sub}</span>}
        </div>
      )}

      <div className={"qz-opts" + (isGridOpts ? " qz-opts-grid" : "")}>
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
              {q.cat === "matrices" ? (
                <Cell spec={opt} size={56} />
              ) : q.optionType === "poly" ? (
                <PolyView cells={opt} size={62} />
              ) : q.optionType === "shapes" ? (
                <ShapeGroup items={opt} size={20} />
              ) : (
                <span>{opt}</span>
              )}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className={"qz-explain " + (selected === q.correct ? "qz-explain-ok" : "qz-explain-no")}>
          <div className="qz-verdict">
            {selected === -1
              ? `Time's up — the answer is ${LETTERS[q.correct]}`
              : selected === q.correct
              ? "Correct"
              : `Not quite — the answer is ${LETTERS[q.correct]}`}
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
        <Link href="/assessment">Assess</Link>
        <Link href="/practice">Practice</Link>
        <Link href="/session">Session</Link>
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
