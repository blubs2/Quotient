"use client";
// Global state: auth, SRS, lifetime stats, Elo ratings, profile. Everything
// degrades gracefully to in-memory "guest mode" when Supabase isn't
// configured or the visitor isn't signed in.
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { schedule, isDue } from "@/lib/srs";
import { VOCAB } from "@/lib/data/vocab";
import { DOMAIN, RATED_DOMAINS } from "@/lib/domains";
import { START_RATING, itemRating, eloUpdate } from "@/lib/elo";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const CATS = ["matrices", "series", "analogies", "vocab", "antonyms", "arithmetic", "weights", "blocks", "rotation", "memory", "speed"];
const emptyStats = () => Object.fromEntries(CATS.map((c) => [c, { n: 0, ok: 0 }]));
const emptyRatings = () => Object.fromEntries(RATED_DOMAINS.map((d) => [d, { rating: START_RATING, n: 0 }]));

export default function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [srs, setSrs] = useState({});
  const [stats, setStats] = useState(emptyStats());
  const [ratings, setRatings] = useState(emptyRatings());
  const [profile, setProfile] = useState(null); // { display_name }
  const [ready, setReady] = useState(false);

  /* ---- auth wiring ---- */
  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  /* ---- load persisted state on sign-in ---- */
  useEffect(() => {
    if (!user || !supabase) return;
    supabase.from("srs_state").select("word, card, due").then(({ data }) => {
      if (!data) return;
      const map = {};
      for (const row of data) map[row.word] = { card: row.card, due: row.due };
      setSrs(map);
    });
    supabase.from("attempts").select("cat, correct").then(({ data }) => {
      if (!data) return;
      const s = emptyStats();
      for (const row of data) {
        if (!s[row.cat]) continue;
        s[row.cat].n += 1;
        if (row.correct) s[row.cat].ok += 1;
      }
      setStats(s);
    });
    supabase.from("ratings").select("domain, rating, n").then(({ data }) => {
      if (!data) return;
      setRatings((prev) => {
        const next = { ...prev };
        for (const row of data) next[row.domain] = { rating: row.rating, n: row.n };
        return next;
      });
    });
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setProfile(data || null);
    });
  }, [user]);

  /* ---- actions ---- */
  const logAttempt = useCallback(
    (cat, correct, ms = null, meta = null) => {
      setStats((s) => ({
        ...s,
        [cat]: { n: (s[cat]?.n || 0) + 1, ok: (s[cat]?.ok || 0) + (correct ? 1 : 0) },
      }));
      if (user && supabase)
        supabase.from("attempts").insert({ user_id: user.id, cat, correct, ms, meta }).then(() => {});
    },
    [user]
  );

  // Elo update — call ONLY for timed answers (daily + assessment)
  const rateAnswer = useCallback(
    (q, ok) => {
      const domain = DOMAIN[q.cat];
      if (!domain) return;
      setRatings((prev) => {
        const cur = prev[domain] || { rating: START_RATING, n: 0 };
        const rating = eloUpdate(cur.rating, itemRating(q), ok, cur.n);
        const entry = { rating, n: cur.n + 1 };
        if (user && supabase)
          supabase.from("ratings").upsert({ user_id: user.id, domain, rating, n: entry.n, updated_at: new Date().toISOString() }).then(() => {});
        return { ...prev, [domain]: entry };
      });
    },
    [user]
  );

  const reviewWord = useCallback(
    (w, correct) => {
      setSrs((prev) => {
        const next = schedule(prev[w]?.card, correct);
        const entry = { card: next.card, due: next.due.toISOString() };
        if (user && supabase)
          supabase.from("srs_state").upsert({ user_id: user.id, word: w, card: next.card, due: entry.due }).then(() => {});
        return { ...prev, [w]: entry };
      });
    },
    [user]
  );

  const saveDaily = useCallback(
    (dailyNum, results, ms = null) => {
      if (user && supabase)
        supabase.from("daily_results").upsert({ user_id: user.id, daily_number: dailyNum, results, ms }).then(() => {});
    },
    [user]
  );

  const saveAssessment = useCallback(
    (domains, memory, speed) => {
      if (user && supabase)
        supabase.from("assessments").insert({ user_id: user.id, domains, memory, speed }).then(() => {});
    },
    [user]
  );

  const setDisplayName = useCallback(
    async (name) => {
      const clean = name.trim();
      if (!/^[A-Za-z0-9_]{3,20}$/.test(clean))
        return "Names are 3-20 characters: letters, numbers, underscores.";
      if (!user || !supabase) return "Sign in first to claim a name.";
      const { error } = await supabase.from("profiles").upsert({ user_id: user.id, display_name: clean });
      if (error) return error.message;
      setProfile({ display_name: clean });
      return null;
    },
    [user]
  );

  const dueWords = useCallback(
    (limit = 6) => {
      const now = new Date();
      const due = VOCAB.filter((v) => isDue(srs[v.w], now));
      due.sort((a, b) => {
        const da = srs[a.w]?.due ? new Date(srs[a.w].due) : 0;
        const db = srs[b.w]?.due ? new Date(srs[b.w].due) : 0;
        return da - db;
      });
      return due.slice(0, limit);
    },
    [srs]
  );

  const signOut = useCallback(() => {
    if (supabase) supabase.auth.signOut();
    setSrs({});
    setStats(emptyStats());
    setRatings(emptyRatings());
    setProfile(null);
  }, []);

  return (
    <Ctx.Provider
      value={{
        user, ready, srs, stats, ratings, profile,
        configured: !!supabase,
        logAttempt, rateAnswer, reviewWord, saveDaily, saveAssessment,
        setDisplayName, dueWords, signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
