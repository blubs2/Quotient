# QUOTIENT

Daily cognitive training: procedurally generated matrix reasoning, number series,
verbal analogies, and FSRS spaced-repetition vocabulary — with every answer explained.

Built with Next.js (App Router) + Supabase + ts-fsrs. Installable as a PWA.

## Architecture

```
lib/
  rng.js          seeded RNG; date-seeding powers the shared Daily Challenge
  generators.js   procedural question engine (pure data, no UI)
  srs.js          FSRS scheduling wrapper (ts-fsrs)
  supabase.js     client; null when unconfigured -> app runs in guest mode
  data/           vocab deck + analogy bank (grow these freely)
components/
  AppProvider.jsx auth, SRS sync, attempt logging, guest fallback
  ui.jsx          SVG puzzle renderer, QuestionCard, header
app/
  page.js         home   /daily  /session  /practice  /vault  /login
supabase/schema.sql   3 tables + Row Level Security
```

## Launch checklist (0 -> live on your domain)

### 1. Run it locally (works immediately, guest mode)
```bash
npm install
npm run dev        # http://localhost:3000
```

### 2. Create the backend (~10 minutes, free)
1. Go to [supabase.com](https://supabase.com) -> New project.
2. SQL Editor -> New query -> paste the contents of `supabase/schema.sql` -> Run.
3. Authentication -> Providers -> Email: make sure **Email** is enabled
   (magic links / OTP are on by default).
4. Project Settings -> API: copy the **Project URL** and **anon public key**.
5. `cp .env.local.example .env.local` and paste both values in.
6. Restart `npm run dev` — sign-in, syncing, and the attempts log now work.

### 3. Deploy (~10 minutes, free)
1. Push this folder to a GitHub repo.
2. [vercel.com](https://vercel.com) -> Add New Project -> import the repo.
3. In the Vercel project settings, add the two environment variables from `.env.local`.
4. Deploy. You're live on a `.vercel.app` URL.

### 4. Point your domain
1. Vercel -> your project -> Settings -> Domains -> add `yourdomain.com`.
2. Vercel shows you exactly which DNS records to set (an A record to
   `76.76.21.21` and/or a CNAME to `cname.vercel-dns.com`). Add them at your
   registrar. SSL is automatic.
3. In Supabase -> Authentication -> URL Configuration, set **Site URL** to
   `https://yourdomain.com` so magic links redirect to your domain.

### 5. PWA
Already wired (manifest + service worker + icons). On mobile, "Add to Home
Screen" installs it like an app. Replace `public/icons/` with branded icons
whenever you're ready.

## Extending

- **More words:** append to `lib/data/vocab.js`. New entries automatically join
  the SRS rotation and Word Vault.
- **More analogies:** append to `lib/data/analogies.js`.
- **New question types** (syllogisms, spatial rotation): add a generator to
  `lib/generators.js` returning `{cat, prompt|grid, options, correct, explanation}`
  and it plugs into every mode.
- **Analytics:** add PostHog or Plausible in `app/layout.js` for session-length
  and dosage data.

## The study

The `attempts` table logs every answer with category, correctness, response
time, and timestamp — which is the raw dataset for a pre/post design:
baseline test -> N minutes/day for 4-8 weeks -> post-test with novel items.

**Marketing/claims note:** keep public claims to "measurably improves
vocabulary, reasoning-item performance, and retention." Lumosity's $2M FTC
settlement (2016) was specifically for unsupported "improves cognition/IQ"
claims. If you later publish with user data, add a privacy policy and
informed-consent flow first.
