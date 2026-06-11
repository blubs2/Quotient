"use client";
// Lightweight SVG charts + shared progression widgets. No chart library —
// these are a few dozen lines and load instantly.
import { useState } from "react";
import { useApp } from "./AppProvider";
import { RATED_DOMAINS } from "@/lib/domains";

/* ---- line chart: series = [{ y }], y in 0..100 ---- */
export function MiniChart({ points, height = 72, max = 100, min = 0, suffix = "%" }) {
  const w = 280, h = height, pad = 8;
  if (!points.length) return null;
  const xs = points.map((_, i) => pad + (i * (w - 2 * pad)) / Math.max(1, points.length - 1));
  const ys = points.map((p) => h - pad - ((p - min) * (h - 2 * pad)) / (max - min));
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--line)" strokeWidth="2" />
      {points.length > 1 && <path d={path} fill="none" stroke="var(--cobalt)" strokeWidth="2.5" strokeLinejoin="round" />}
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r="3.5" fill={i === xs.length - 1 ? "var(--cobalt)" : "var(--card)"} stroke="var(--cobalt)" strokeWidth="2" />
      ))}
      <text x={w - pad} y={ys[ys.length - 1] - 8} textAnchor="end" fontSize="12" fontFamily="var(--mono)" fill="var(--ink)">
        {points[points.length - 1]}{suffix}
      </text>
    </svg>
  );
}

/* ---- ratings strip (home + progress) ---- */
export function RatingsStrip() {
  const { ratings } = useApp();
  return (
    <div className="qz-statbar">
      {RATED_DOMAINS.map((d) => (
        <div key={d}>
          <span className="qz-stat-n">{ratings[d]?.rating ?? 1200}</span>
          <span className="qz-stat-l">{d.split(" ")[0]}</span>
        </div>
      ))}
    </div>
  );
}

/* ---- display-name claim form ---- */
export function NamePrompt({ onClaimed }) {
  const { profile, user, setDisplayName, configured } = useApp();
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  if (profile || !configured) return null;
  if (!user)
    return <p className="qz-note">Sign in to claim a name and appear on the leaderboard.</p>;
  const claim = async () => {
    const e = await setDisplayName(val);
    if (e) setErr(e);
    else {
      setErr("");
      onClaimed && onClaimed();
    }
  };
  return (
    <div style={{ textAlign: "center", margin: "10px 0" }}>
      <p className="qz-note" style={{ marginBottom: 6 }}>Claim a leaderboard name:</p>
      <input className="qz-input" style={{ maxWidth: 240, textAlign: "center", fontFamily: "var(--mono)" }}
        value={val} placeholder="e.g. matrix_destroyer" onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && claim()} />
      <div><button className="qz-primary" onClick={claim}>Claim</button></div>
      {err && <p style={{ color: "var(--no)", fontSize: 13 }}>{err}</p>}
    </div>
  );
}
