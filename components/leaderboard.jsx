"use client";
// Daily leaderboard: rank by score (desc), then total time (asc).
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useApp } from "./AppProvider";

export function Leaderboard({ dailyNumber }) {
  const { user, configured } = useApp();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (!supabase) { setRows([]); return; }
    let cancelled = false;
    (async () => {
      const { data: results } = await supabase
        .from("daily_results")
        .select("user_id, results, ms")
        .eq("daily_number", dailyNumber);
      if (!results || cancelled) { setRows([]); return; }
      const ids = [...new Set(results.map((r) => r.user_id))];
      const { data: names } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", ids);
      const nameOf = Object.fromEntries((names || []).map((n) => [n.user_id, n.display_name]));
      const ranked = results
        .map((r) => ({
          uid: r.user_id,
          name: nameOf[r.user_id] || "anonymous",
          score: (r.results || []).filter(Boolean).length,
          total: (r.results || []).length,
          ms: r.ms,
        }))
        .sort((a, b) => b.score - a.score || (a.ms ?? Infinity) - (b.ms ?? Infinity))
        .slice(0, 25);
      if (!cancelled) setRows(ranked);
    })();
    return () => { cancelled = true; };
  }, [dailyNumber]);

  if (!configured) return null;
  if (rows === null) return <p className="qz-note">Loading leaderboard…</p>;
  if (!rows.length) return <p className="qz-note">No results yet today — you might be first.</p>;

  return (
    <div style={{ marginTop: 18, textAlign: "left" }}>
      <div className="qz-eyebrow" style={{ marginBottom: 8 }}>Today&apos;s leaderboard</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {rows.map((r, i) => (
          <div key={r.uid} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "7px 12px",
            border: "1.5px solid " + (user && r.uid === user.id ? "var(--cobalt)" : "var(--line)"),
            borderRadius: 8, background: user && r.uid === user.id ? "rgba(43,75,216,.05)" : "var(--card)",
            fontFamily: "var(--mono)", fontSize: 13,
          }}>
            <span style={{ width: 26, color: "var(--graphite)" }}>{i + 1}</span>
            <span style={{ flex: 1, fontFamily: "var(--sans, inherit)", fontWeight: 600 }}>{r.name}</span>
            <span>{r.score}/{r.total}</span>
            <span style={{ color: "var(--graphite)", width: 64, textAlign: "right" }}>
              {r.ms != null ? (r.ms / 1000).toFixed(0) + "s" : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
