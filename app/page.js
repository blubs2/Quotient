"use client";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { VOCAB } from "@/lib/data/vocab";
import { boxOf } from "@/lib/srs";
import { dailyNumber } from "@/lib/rng";

export default function Home() {
  const { stats, srs, user, configured } = useApp();
  const total = Object.values(stats).reduce((s, c) => s + c.n, 0);
  const correct = Object.values(stats).reduce((s, c) => s + c.ok, 0);
  const learned = VOCAB.filter((v) => boxOf(srs[v.w]) >= 3).length;
  const dn = dailyNumber();

  return (
    <div>
      <div className="qz-hero">
        <div className="qz-logo">QUOTIENT</div>
        <div className="qz-tag">Train what&apos;s measurable. Explanations for everything.</div>
      </div>

      <Link href="/daily" className="qz-tile qz-tile-main">
        <div>
          <div className="qz-eyebrow">Daily Challenge #{dn}</div>
          <div className="qz-tile-title">3 puzzles · same for everyone today</div>
        </div>
        <span className="qz-arrow">→</span>
      </Link>

      <Link href="/session" className="qz-tile">
        <div>
          <div className="qz-eyebrow">Today&apos;s Session</div>
          <div className="qz-tile-title">Due vocab reviews + 3 reasoning drills</div>
        </div>
        <span className="qz-arrow">→</span>
      </Link>

      <Link href="/practice" className="qz-tile">
        <div>
          <div className="qz-eyebrow">Infinite Practice</div>
          <div className="qz-tile-title">Unlimited generated questions, by category</div>
        </div>
        <span className="qz-arrow">→</span>
      </Link>

      <Link href="/vault" className="qz-tile">
        <div>
          <div className="qz-eyebrow">Word Vault</div>
          <div className="qz-tile-title">{learned}/{VOCAB.length} words at strength 3+</div>
        </div>
        <span className="qz-arrow">→</span>
      </Link>

      <div className="qz-statbar">
        <div><span className="qz-stat-n">{total}</span><span className="qz-stat-l">answered</span></div>
        <div><span className="qz-stat-n">{total ? Math.round((100 * correct) / total) : 0}%</span><span className="qz-stat-l">accuracy</span></div>
        <div><span className="qz-stat-n">{stats.matrices.n ? Math.round((100 * stats.matrices.ok) / stats.matrices.n) : "–"}</span><span className="qz-stat-l">matrices</span></div>
        <div><span className="qz-stat-n">{stats.vocab.n ? Math.round((100 * stats.vocab.ok) / stats.vocab.n) : "–"}</span><span className="qz-stat-l">vocab</span></div>
      </div>

      {!user && (
        <div className="qz-science" style={{ marginBottom: 14 }}>
          <div className="qz-eyebrow">Save your progress</div>
          <p>
            {configured ? (
              <>You&apos;re in guest mode — reviews and stats reset when you leave. <Link href="/login">Sign in with your email</Link> to keep your review schedule and streak.</>
            ) : (
              <>Supabase isn&apos;t configured yet, so the app is running in guest mode. Add your keys to <code>.env.local</code> to enable accounts and persistence.</>
            )}
          </p>
        </div>
      )}

      <div className="qz-science">
        <div className="qz-eyebrow">The honest claim</div>
        <p>
          Quotient does not promise to raise your IQ — the far-transfer evidence for brain
          training is weak, and we won&apos;t pretend otherwise. It trains three things with real
          evidence behind them: <strong>vocabulary</strong> via spaced repetition (decades of
          replication), <strong>fluid-reasoning item performance</strong> via practice with worked
          explanations, and <strong>retention</strong> via the testing effect. Your scores on
          these constructs will measurably improve. That&apos;s the claim, and it&apos;s provable.
        </p>
      </div>
    </div>
  );
}
