"use client";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { dailyNumber } from "@/lib/rng";

export default function Home() {
  const { stats, user, configured } = useApp();
  const total = Object.values(stats).reduce((s, c) => s + c.n, 0);
  const correct = Object.values(stats).reduce((s, c) => s + c.ok, 0);
  const dn = dailyNumber();

  return (
    <div>
      <div className="qz-hero">
        <div className="qz-logo">QUOTIENT</div>
        <div className="qz-tag">Train the test. Every answer explained.</div>
      </div>

      <Link href="/daily" className="qz-tile qz-tile-main">
        <div>
          <div className="qz-eyebrow">Daily Challenge #{dn}</div>
          <div className="qz-tile-title">6 timed questions · same for everyone today</div>
        </div>
        <span className="qz-arrow">→</span>
      </Link>

      <Link href="/assessment" className="qz-tile qz-tile-main">
        <div>
          <div className="qz-eyebrow">Assessment</div>
          <div className="qz-tile-title">Timed CHC battery · domain scorecard · ~12 min</div>
        </div>
        <span className="qz-arrow">→</span>
      </Link>

      <Link href="/practice" className="qz-tile">
        <div>
          <div className="qz-eyebrow">Infinite Practice</div>
          <div className="qz-tile-title">9 question types · adaptive difficulty · untimed</div>
        </div>
        <span className="qz-arrow">→</span>
      </Link>

      <Link href="/session" className="qz-tile">
        <div>
          <div className="qz-eyebrow">Today&apos;s Session</div>
          <div className="qz-tile-title">Vocabulary reviews + reasoning drills</div>
        </div>
        <span className="qz-arrow">→</span>
      </Link>

      <div className="qz-statbar">
        <div><span className="qz-stat-n">{total}</span><span className="qz-stat-l">answered</span></div>
        <div><span className="qz-stat-n">{total ? Math.round((100 * correct) / total) : 0}%</span><span className="qz-stat-l">accuracy</span></div>
        <div><span className="qz-stat-n">{stats.matrices?.n ? Math.round((100 * stats.matrices.ok) / stats.matrices.n) : "–"}</span><span className="qz-stat-l">matrices</span></div>
        <div><span className="qz-stat-n">{stats.arithmetic?.n ? Math.round((100 * stats.arithmetic.ok) / stats.arithmetic.n) : "–"}</span><span className="qz-stat-l">arithmetic</span></div>
      </div>

      {!user && (
        <div className="qz-science" style={{ marginBottom: 14 }}>
          <div className="qz-eyebrow">Save your progress</div>
          <p>
            {configured ? (
              <>You&apos;re in guest mode — stats reset when you leave. <Link href="/login">Sign in with your email</Link> to keep your history and review schedule.</>
            ) : (
              <>Supabase isn&apos;t configured, so the app is running in guest mode. Add keys to <code>.env.local</code> to enable accounts.</>
            )}
          </p>
        </div>
      )}

      <div className="qz-science">
        <div className="qz-eyebrow">What this is (and isn&apos;t)</div>
        <p>
          Quotient makes no claims about raising your IQ. It does something narrower and
          real: it drills the exact item formats used by serious cognitive batteries —
          matrix reasoning, figure weights, block counting, mental rotation, antonyms,
          timed arithmetic, digit span, symbol search — under the same time pressure,
          with a worked explanation for every answer. Familiarity with item formats,
          pattern vocabulary, and pacing are genuine, trainable skills. If you ever sit
          a Mensa admission test or a CHC-structured assessment, you&apos;ll have seen it
          all before.
        </p>
      </div>
    </div>
  );
}
