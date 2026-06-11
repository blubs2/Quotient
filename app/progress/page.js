"use client";
// Progress: your assessment history charted per domain, plus your current
// per-domain ratings. The "is this working?" page.
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/components/AppProvider";
import { MiniChart, RatingsStrip } from "@/components/charts";
import { RATED_DOMAINS } from "@/lib/domains";

export default function ProgressPage() {
  const { user, configured } = useApp();
  const [runs, setRuns] = useState(null);

  useEffect(() => {
    if (!user || !supabase) {
      setRuns([]);
      return;
    }
    supabase
      .from("assessments")
      .select("domains, memory, speed, created_at")
      .order("created_at", { ascending: true })
      .then(({ data }) => setRuns(data || []));
  }, [user]);

  const seriesFor = (domain) =>
    (runs || [])
      .filter((r) => r.domains?.[domain]?.n > 0)
      .map((r) => Math.round((100 * r.domains[domain].ok) / r.domains[domain].n));

  const speedSeries = (runs || [])
    .filter((r) => r.speed?.n > 0)
    .map((r) => r.speed.ok);
  const memorySeries = (runs || [])
    .filter((r) => Array.isArray(r.memory) && r.memory.length)
    .map((r) => Math.round((100 * r.memory.filter((t) => t.ok).length) / r.memory.length));

  return (
    <div>
      <div className="qz-screen-head">
        <Link href="/" className="qz-back">← Back</Link>
        <div className="qz-eyebrow">Progress</div>
      </div>

      <div className="qz-eyebrow" style={{ margin: "6px 0" }}>Domain ratings</div>
      <RatingsStrip />
      <p className="qz-note" style={{ margin: "0 0 18px", textAlign: "left", maxWidth: "none" }}>
        Ratings move with every timed answer (Daily + Assessment), weighted by question
        difficulty — like chess Elo. They are performance ratings on these item types,
        not IQ estimates.
      </p>

      {!configured || !user ? (
        <div className="qz-card">
          <p style={{ fontFamily: "var(--serif)", lineHeight: 1.6 }}>
            {configured ? (
              <><Link href="/login">Sign in</Link> to save assessment runs and see your history charted here.</>
            ) : (
              <>Connect Supabase to enable saved history.</>
            )}
          </p>
        </div>
      ) : runs === null ? (
        <div className="qz-card"><p className="qz-note">Loading…</p></div>
      ) : runs.length === 0 ? (
        <div className="qz-card">
          <p style={{ fontFamily: "var(--serif)", lineHeight: 1.6 }}>
            No assessment runs saved yet. <Link href="/assessment">Take your first Assessment</Link> — each
            run adds a point to these charts, and the trend over weeks is the honest
            answer to &quot;am I getting better at this?&quot;
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {RATED_DOMAINS.map((d) => {
            const s = seriesFor(d);
            if (!s.length) return null;
            return (
              <div className="qz-card" key={d} style={{ padding: 14 }}>
                <div className="qz-eyebrow">{d} · {runs.length} run{runs.length > 1 ? "s" : ""}</div>
                <MiniChart points={s} />
              </div>
            );
          })}
          {memorySeries.length > 0 && (
            <div className="qz-card" style={{ padding: 14 }}>
              <div className="qz-eyebrow">Working Memory</div>
              <MiniChart points={memorySeries} />
            </div>
          )}
          {speedSeries.length > 0 && (
            <div className="qz-card" style={{ padding: 14 }}>
              <div className="qz-eyebrow">Processing Speed · correct in 45s</div>
              <MiniChart points={speedSeries} max={Math.max(30, ...speedSeries)} min={0} suffix="" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
