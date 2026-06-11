"use client";
// Working Memory + Processing Speed stages (CAIT/WAIS style). These aren't
// multiple-choice cards — they flash sequences and time responses, so they
// get their own components.
import { useEffect, useRef, useState } from "react";

/* ---------------- Digit Span (forward + backward) ---------------- */
const randDigits = (len) => {
  let s = "";
  while (s.length < len) {
    const d = String(Math.floor(Math.random() * 10));
    if (s[s.length - 1] !== d) s += d; // no immediate repeats, like the WAIS
  }
  return s;
};

function FlashThenType({ sequence, instruction, expected, onDone, flashMs = 900 }) {
  const [shown, setShown] = useState(-1); // -1 idle, then index, then "input"
  const [val, setVal] = useState("");
  const inputRef = useRef(null);
  useEffect(() => {
    setShown(0);
  }, [sequence]);
  useEffect(() => {
    if (shown < 0) return;
    if (shown < sequence.length) {
      const t = setTimeout(() => setShown(shown + 1), flashMs);
      return () => clearTimeout(t);
    }
    inputRef.current?.focus();
  }, [shown, sequence, flashMs]);

  const submit = () => {
    const clean = val.toUpperCase().replace(/[^0-9A-Z]/g, "");
    onDone(clean === expected, clean);
    setVal("");
  };

  return (
    <div style={{ textAlign: "center" }}>
      {shown < sequence.length ? (
        <div className="qz-flash">{shown >= 0 ? sequence[shown] : ""}</div>
      ) : (
        <div>
          <p className="qz-note">{instruction}</p>
          <input
            ref={inputRef}
            className="qz-input"
            style={{ maxWidth: 280, textAlign: "center", fontFamily: "var(--mono)", fontSize: 22, letterSpacing: 4 }}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoComplete="off"
          />
          <div>
            <button className="qz-primary" onClick={submit}>Submit</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DigitSpanStage({ onDone }) {
  // forward: lengths 4,5,6,7 — backward: 3,4,5. Score = correct trials.
  const trials = useRef(
    [4, 5, 6, 7].map((len) => ({ mode: "fwd", seq: randDigits(len) })).concat(
      [3, 4, 5].map((len) => ({ mode: "bwd", seq: randDigits(len) }))
    )
  ).current;
  const [i, setI] = useState(0);
  const [results, setResults] = useState([]);
  const t = trials[i];
  const expected = t.mode === "fwd" ? t.seq : [...t.seq].reverse().join("");

  const done = (ok) => {
    const next = [...results, { ok, mode: t.mode, len: t.seq.length }];
    if (i + 1 >= trials.length) onDone(next);
    else {
      setResults(next);
      setI(i + 1);
    }
  };

  return (
    <div className="qz-card">
      <div className="qz-card-head">
        <div className="qz-eyebrow">Digit Span · {t.mode === "fwd" ? "forward" : "BACKWARD"} · trial {i + 1}/{trials.length}</div>
      </div>
      <FlashThenType
        key={i}
        sequence={t.seq}
        expected={expected}
        instruction={t.mode === "fwd" ? `Type the ${t.seq.length} digits in the order shown.` : `Type the ${t.seq.length} digits in REVERSE order.`}
        onDone={done}
      />
    </div>
  );
}

/* ---------------- Letter-Number Sequencing ---------------- */
const LETTERS_POOL = "BCDFGHJKMPRSTW";
function randMixed(nDigits, nLetters) {
  const items = [];
  while (items.filter((x) => /[0-9]/.test(x)).length < nDigits) {
    const d = String(1 + Math.floor(Math.random() * 9));
    if (!items.includes(d)) items.push(d);
  }
  while (items.filter((x) => /[A-Z]/.test(x)).length < nLetters) {
    const l = LETTERS_POOL[Math.floor(Math.random() * LETTERS_POOL.length)];
    if (!items.includes(l)) items.push(l);
  }
  // interleave
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function SequencingStage({ onDone }) {
  const trials = useRef([
    randMixed(2, 2), randMixed(3, 2), randMixed(3, 3),
  ]).current;
  const [i, setI] = useState(0);
  const [results, setResults] = useState([]);
  const seq = trials[i];
  const expected =
    seq.filter((x) => /[0-9]/.test(x)).sort().join("") +
    seq.filter((x) => /[A-Z]/.test(x)).sort().join("");

  const done = (ok) => {
    const next = [...results, { ok, len: seq.length }];
    if (i + 1 >= trials.length) onDone(next);
    else {
      setResults(next);
      setI(i + 1);
    }
  };

  return (
    <div className="qz-card">
      <div className="qz-card-head">
        <div className="qz-eyebrow">Letter-Number Sequencing · trial {i + 1}/{trials.length}</div>
      </div>
      <FlashThenType
        key={i}
        sequence={seq}
        expected={expected}
        instruction="Type the DIGITS in ascending order, then the LETTERS in alphabetical order. (e.g. 7-K-2 → 27K)"
        onDone={done}
      />
    </div>
  );
}

/* ---------------- Symbol Search sprint (processing speed) ---------------- */
const SYMBOLS = ["◐", "◑", "▲", "▽", "◆", "◇", "■", "□", "●", "○", "✚", "✖", "◭", "◮"];
function makeItem() {
  const pool = [...SYMBOLS].sort(() => Math.random() - 0.5);
  const targets = pool.slice(0, 2);
  const present = Math.random() < 0.5;
  let group = pool.slice(2, 7);
  if (present) group[Math.floor(Math.random() * group.length)] = targets[Math.floor(Math.random() * 2)];
  return { targets, group, present };
}

export function SymbolSprintStage({ seconds = 45, onDone }) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [item, setItem] = useState(makeItem);
  const [score, setScore] = useState({ ok: 0, n: 0 });
  const doneRef = useRef(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone(score);
      }
      return;
    }
    const t = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const answer = (saysPresent) => {
    setScore((s) => ({ ok: s.ok + (saysPresent === item.present ? 1 : 0), n: s.n + 1 }));
    setItem(makeItem());
  };

  return (
    <div className="qz-card">
      <div className="qz-card-head">
        <div className="qz-eyebrow">Symbol Search · {timeLeft}s</div>
        <div className="qz-eyebrow">{score.ok}/{score.n}</div>
      </div>
      <div className="qz-timer">
        <div className="qz-timer-bar" style={{ width: `${(100 * timeLeft) / seconds}%`, background: timeLeft <= 8 ? "var(--no)" : "var(--cobalt)" }} />
      </div>
      <p className="qz-note" style={{ marginTop: 4 }}>Does EITHER target symbol appear in the group? Answer as fast as you can.</p>
      <div className="qz-sprint-row">
        <span className="qz-sprint-targets">{item.targets.join(" ")}</span>
        <span style={{ fontFamily: "var(--mono)", color: "var(--graphite)" }}>→</span>
        <span className="qz-sprint-group">{item.group.join("")}</span>
      </div>
      <div className="qz-yn">
        <button className="qz-primary" onClick={() => answer(true)}>Yes</button>
        <button className="qz-primary" style={{ background: "var(--ink)" }} onClick={() => answer(false)}>No</button>
      </div>
    </div>
  );
}
