"use client";
import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    setErr("");
    if (!supabase) {
      setErr("Supabase isn't configured yet — add keys to .env.local first.");
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    if (error) setErr(error.message);
    else setSent(true);
  };

  return (
    <div className="qz-login">
      <div className="qz-card">
        <div className="qz-eyebrow">Sign in</div>
        {sent ? (
          <p style={{ fontFamily: "var(--serif)", lineHeight: 1.6 }}>
            Check your email — we sent a magic link to <strong>{email}</strong>. Click it and
            you&apos;ll land back here, signed in. No password to remember.
          </p>
        ) : (
          <>
            <p style={{ fontFamily: "var(--serif)", lineHeight: 1.6 }}>
              Enter your email and we&apos;ll send a one-tap sign-in link. Your review schedule,
              stats, and daily results sync to your account.
            </p>
            <input
              className="qz-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button className="qz-primary" onClick={send}>Send magic link</button>
            {err && <p style={{ color: "var(--no)", fontSize: 14 }}>{err}</p>}
          </>
        )}
        <p style={{ marginTop: 18 }}><Link href="/">← Back home</Link></p>
      </div>
    </div>
  );
}
