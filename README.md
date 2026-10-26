# Mood Tracker

Say how you feel by picking a painting instead of a word. Every time you open the app, it shows four random public-domain paintings from the [Art Institute of Chicago](https://api.artic.edu/docs/), and you pick the one closest to your mood. Every pick is saved, and your history is a near-square grid of tiny pictures. Hover over a square (or tap it) to see the painting and when you picked it.

Assignment 4 (Full Stack App) for MPCS 51238 Design, Build, Ship.

- Design: [docs/superpowers/specs/2026-10-21-mood-tracker-design.md](docs/superpowers/specs/2026-10-21-mood-tracker-design.md)
- Build plan: [docs/superpowers/plans/2026-10-21-mood-tracker.md](docs/superpowers/plans/2026-10-21-mood-tracker.md)

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- [Clerk](https://clerk.com) for sign-up, sign-in and sign-out (development keys)
- [Supabase](https://supabase.com) Postgres for picks, with row-level security, connected to Clerk through Supabase's third-party auth
- The Art Institute of Chicago's public API, which needs no key
- Playwright for the end-to-end privacy test; Vercel's Hobby plan for hosting

## How it works

1. **Opening `/mood`.** The server checks your Clerk session, then asks the museum for four random public-domain paintings. Signed-out visitors are sent to sign in.
2. **Picking.** Clicking a painting calls the `savePick` server function. It checks your session, validates the painting and inserts a row into `picks`. The row's `user_id` comes from your Clerk session token, never from the browser.
3. **The grid.** `loadPicks` reads your picks and the grid appears.
4. **Images.** Images load through the app's own `/art/{imageId}/{width}` route.

Two details explain most of the design:

- **The museum's Cloudflare rules block any request without an `AIC-User-Agent` header.** Browsers can't send that header to another site, so every museum request, data and images alike, goes through the server. The image route accepts only museum image IDs at two sizes, and it caches each image for a year.
- **Who sees what is decided by Supabase, not by the app's code.** The app never filters picks by user. Postgres's row-level security returns only rows whose `user_id` matches the `sub` claim in the session token.

## Privacy

There is one table, `picks`, and row-level security is on. Two policies apply, both only to signed-in people:

- **People can read their own picks:** `(select auth.jwt() ->> 'sub') = user_id`
- **People can add their own picks:** the same check, applied to new rows

There are no update or delete policies. Table privileges match the policies: signed-in people may only `SELECT` and `INSERT`, and signed-out visitors have none. The migrations are in [`supabase/migrations/`](supabase/migrations/), including the deliberate break and fix from the Step 7 test.

## Running it

You need Node 24, a Clerk application (development instance) with email sign-in, and a Supabase project with Clerk added under Authentication → Sign In / Providers → Third-Party Auth.

Create `.env.local` with these variables. Never commit this file; `.gitignore` already excludes it.

| variable | where it comes from | where it's used |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk → API keys | browser and server |
| `CLERK_SECRET_KEY` | Clerk → API keys | server only |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API Keys | server |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys (`sb_publishable_…`) | server |
| `E2E_USER_A_EMAIL`, `E2E_USER_B_EMAIL` | two Clerk test users (`…+clerk_test@example.com`) | Playwright only |

There is no Supabase secret key anywhere. Row-level security protects the data, so the publishable key is enough.

```bash
npm install
npm run dev        # http://localhost:3000
```

Apply the migrations in `supabase/migrations/` in order. This project applied them with the Supabase MCP server.

## Commands

| command | what it does |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build |
| `npm run lint` | ESLint |
| `npm test` | library tests (`node --test`, `tests/*.test.mjs`) |
| `npm run e2e` | Playwright privacy test: two users can't see each other's picks |

`npm run e2e` starts its own app on port 3100 against a small fake museum (`e2e/fake-museum.mjs`), so it tests Clerk and Supabase rather than the network. Stop `npm run dev` first, because Next allows only one dev server per project.

## Free tiers

Everything runs on free tiers: Clerk development keys, Supabase Free, and Vercel Hobby. **Supabase pauses a free project after a week without use,** so open the app now and then until grades are back.
