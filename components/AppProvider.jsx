"use client";
// Global state: auth session, SRS map, lifetime stats. Everything degrades
// gracefully to in-memory "guest mode" when Supabase isn't configured or
// the visitor isn't signed in.
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { schedule, isDue } from "@/lib/srs";
import { VOCAB } from "@/lib/data/vocab";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const CATS = ["matrices", "series", "analogies", "vocab", "antonyms", "arithmetic", "weights", "blocks", "rotation", "memory", "speed"];
const emptyStats = () => Object.fromEntries(CATS.map((c) => [c, { n: 0, ok: 0 }]));

export default function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [srs, setSrs] = useState({}); // word -> { card, due }
  const [stats, setStats] = useState(emptyStats());
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
    supabase
      .from("srs_state")
      .select("word, card, due")
      .then(({ data }) => {
        if (!data) return;
        const map = {};
        for (const row of data) map[row.word] = { card: row.card, due: row.due };
        setSrs(map);
      });
    supabase
      .from("attempts")
      .select("cat, correct")
      .then(({ data }) => {
        if (!data) return;
        const s = emptyStats();
        for (const row of data) {
          if (!s[row.cat]) continue;
          s[row.cat].n += 1;
          if (row.correct) s[row.cat].ok += 1;
        }
        setStats(s);
      });
  }, [user]);

  /* ---- actions ---- */
  const logAttempt = useCallback(
    (cat, correct, ms = null) => {
      setStats((s) => ({
        ...s,
        [cat]: { n: (s[cat]?.n || 0) + 1, ok: (s[cat]?.ok || 0) + (correct ? 1 : 0) },
      }));
      if (user && supabase)
        supabase.from("attempts").insert({ user_id: user.id, cat, correct, ms }).then(() => {});
    },
    [user]
  );

  const reviewWord = useCallback(
    (w, correct) => {
      setSrs((prev) => {
        const next = schedule(prev[w]?.card, correct);
        const entry = { card: next.card, due: next.due.toISOString() };
        if (user && supabase)
          supabase
            .from("srs_state")
            .upsert({ user_id: user.id, word: w, card: next.card, due: entry.due })
            .then(() => {});
        return { ...prev, [w]: entry };
      });
    },
    [user]
  );

  const saveDaily = useCallback(
    (dailyNum, results) => {
      if (user && supabase)
        supabase
          .from("daily_results")
          .upsert({ user_id: user.id, daily_number: dailyNum, results })
          .then(() => {});
    },
    [user]
  );

  // Words due for review: never-seen first, then earliest due date.
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
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        ready,
        srs,
        stats,
        configured: !!supabase,
        logAttempt,
        reviewWord,
        saveDaily,
        dueWords,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
