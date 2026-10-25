# Mood Tracker

Every time you open the app, it shows four random public-domain paintings from the Art Institute of Chicago, and you pick the one closest to how you feel. Every pick is saved. Your history is a near-square grid of tiny pictures of your picks, and hovering over a square shows the painting and when you picked it. This is Assignment 4 for MPCS 51238.

- Design: [docs/superpowers/specs/2026-10-21-mood-tracker-design.md](docs/superpowers/specs/2026-10-21-mood-tracker-design.md)
- Build plan: [docs/superpowers/plans/2026-10-21-mood-tracker.md](docs/superpowers/plans/2026-10-21-mood-tracker.md)

## Data model

There is one table, `picks`. Each row is one pick by one person. A row keeps a copy of the painting's display details, so the history grid never has to ask the museum about each square.

| column | type | holds |
|---|---|---|
| `id` | `bigint generated always as identity primary key` | the pick's own number |
| `user_id` | `text not null default (auth.jwt() ->> 'sub')` | the Clerk user ID of the person who picked, always taken from their session token |
| `artwork_id` | `integer not null` | the museum's ID for the painting |
| `title` | `text not null` | the painting's title |
| `artist` | `text not null` | the artist, or "Unknown artist" |
| `date_display` | `text` | when the painting was made, as the museum writes it |
| `image_id` | `text not null` | used to build the painting's image links |
| `alt_text` | `text` | the museum's description for screen readers |
| `color_h`, `color_s`, `color_l` | `smallint` | the painting's main color, shown while the image loads; null when the museum has none |
| `picked_at` | `timestamptz not null default now()` | when the pick was made |

Row-level security is on, with two policies. Both apply only to signed-in people (the `authenticated` role):

- **People can read their own picks.** A row is visible only when its `user_id` matches the `sub` claim in the session token, which is the Clerk user ID.
- **People can add their own picks.** A new row is accepted only when its `user_id` matches the token's `sub`. Because `user_id` defaults to that value, the app never sends it.

There are no update or delete policies, so nobody can change or remove a pick. Signed-out visitors (the `anon` role) have no policy at all, so they see nothing.

Table privileges match the policies. `authenticated` has only `SELECT` and `INSERT` on `picks`, and `anon` has nothing. Supabase grants every privilege by default, including `TRUNCATE`, which row-level security doesn't cover, so `supabase/migrations/*_restrict_picks_grants.sql` revokes the rest. Migrations are applied with the Supabase MCP server's `apply_migration`, and each file is named with the version Supabase records.

## Rules

- **Keys live only in `.env.local`, which the student writes.**
  - Never read, print or search a `.env` file by any means. The deny rule in `.claude/settings.json` blocks the Read tool, and `cat`, `grep`, `head` and the like are just as off-limits.
  - No Supabase secret or service-role key is used anywhere.
- **The museum API is called only from the server.** Every request to `https://api.artic.edu/api/v1` sends `AIC-User-Agent: Mood Tracker (MPCS 51238 class project)`. The museum blocks requests without that header, and browsers can't send it to another site.
- **Museum images load through the app's own route, `/art/{image_id}/{width}`** (built by `imageUrl()` in `lib/museum.ts`). The route fetches from `https://www.artic.edu/iiif/2/...` with the `AIC-User-Agent` header, because the image server challenges every request without it, including a page's `<img>`. It serves the image with a one-year immutable cache and accepts only museum image IDs at widths 200 and 400. Pages use a plain `<img>`, never the Next.js image optimizer, which can't send the header.
- **Queries on `picks` never filter by `user_id` in code.** Row-level security does that, and the Playwright privacy test only proves something because of it.
- **Read the docs first.** Before writing Next.js routing, auth gating, server actions or caching code, read the matching guide in `node_modules/next/dist/docs/`.
- **Commits and pushes.** Each commit names the handout step it belongs to. Push only when the student says so.

## Commands

- `npm run dev`: the app at http://localhost:3000
- `npm run build`: production build
- `npm run lint`: ESLint
- `npm test`: library tests with `node --test` (tests in `tests/*.test.mjs` import `lib/*.ts` directly, so `lib/` uses only erasable TypeScript: no `enum`, no parameter properties)

### Installing packages on the IMC network

Public npm is blocked there. Install through IMC's mirror with per-command settings only, and never change `~/.npmrc`:

```bash
npm_config_registry=https://imc-npm-proxy.trading.imc.intra/repository/npm-proxy/ NODE_USE_SYSTEM_CA=1 npm install <package>
```

Then point the lockfile back at the public registry, so Vercel and classmates can install. The tarballs and checksums are identical:

```bash
sed -i '' 's#https://imc-npm-proxy.trading.imc.intra/repository/npm-proxy/#https://registry.npmjs.org/#g' package-lock.json
grep -c 'imc-npm-proxy' package-lock.json   # must print 0
```

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
