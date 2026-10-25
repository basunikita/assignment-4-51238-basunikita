# Mood Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Assignment 4 mood tracker. Signed-in people pick one of four random Art Institute paintings every time they open the app and see all their picks as a near-square grid of tiny pictures. Each person's picks are kept private by Clerk and Supabase row-level security, and the app is deployed on Vercel.

**Architecture:**
- A Next.js App Router app with one public page (`/`) and one signed-in page (`/mood`).
- The `/mood` server component draws four random paintings from the museum's API on every request and hands them to a client component that runs pick, then save, then grid.
- A server action saves the pick to Supabase using the visitor's Clerk session token, then reads back all of their picks. Row-level security is the only thing limiting those rows to the visitor.

**Tech Stack:**
- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, ESLint, the same setup as Assignment 3
- `@clerk/nextjs`, installed by `npx -y clerk@latest init`
- `@supabase/supabase-js` with Clerk as a third-party auth provider
- `node --test` for library tests, as in Assignment 3
- Playwright with `@clerk/testing` for the end-to-end test
- Vercel Hobby for hosting

**Spec:** `docs/superpowers/specs/2026-10-21-mood-tracker-design.md`. Read it before any task. The handout is `../Design, Build, Ship - Assignment 4 - Full Stack App.pdf`.

## How this plan runs

The student is iterating through the handout with the agent, so the plan stops at points only they can act on:

- **🧑 Student:** steps the agent must not do. These are account sign-ups, anything that puts a key into `.env.local`, connecting MCP servers, and Vercel or Clerk dashboard work. Stop, tell the student exactly what to do, and wait.
- **💬 Checkpoint:** a decision the student makes. Present the plan's default with its reason, wait for an answer, and update the affected tasks if it differs.
- **🎓 Ask your agent:** each handout step ends with a prompt. Answer it for the student in the chat, without being asked, when the step's work is done, then wait for them before starting the next task.
- **Commits:** at least one per step, with the step named in the message, in the plain-sentence style of Assignment 3. Only push when the student says so.

## Global Constraints

- **Four paintings per open:** `PAINTINGS_PER_OPEN = 4`. There's no skip and no "show me four others" button. Every request to `/mood`, including a refresh, draws four new paintings, and nothing about them is stored before a pick.
- **Pick screen copy:** heading `How are you feeling right now?`, hint `Pick the painting closest to your mood.` Paintings are shown whole (`object-fit: contain`), with no title or artist.
- **Grid:** `columns = ceil(sqrt(n))`, `rows = ceil(n / columns)`, oldest at the top left in reading order. The box stays a fixed size: `GRID_BOX_PX = 340`, `GRID_GAP_PX = 3`, and squares are `floor((340 - 3 × (columns - 1)) / columns)` px. Squares use `object-fit: cover`. The newest pick is outlined. No dates or labels appear on the grid.
- **Hover card:** shows the bigger image, title, artist, the work's date, and `Picked Wed, Oct 21, 2026 · 9:15 AM` in the visitor's time zone. Tapping a square shows the same card. While an image loads, its square uses the painting's main color, `hsl(h, s%, l%)`.
- **Museum API:**
  - Every request to `https://api.artic.edu/api/v1` sends `AIC-User-Agent: Mood Tracker (MPCS 51238 class project)`, and only from the server.
  - Images load straight in the visitor's browser from `https://www.artic.edu/iiif/2/{image_id}/full/{width},/0/default.jpg` through a plain `<img>`, never through the server or `next/image` optimization.
  - Widths: 200 for grid squares, 400 for the pick screen and hover card.
- **Painting pool:** `is_public_domain` is true, `image_id` exists, and `classification_title.keyword` is `painting`.
- **Picks queries:** reads of `picks` never filter by `user_id` in code. Row-level security does it, and the Step 7 test only proves something because of that.
- **Keys:**
  - Keys live only in `.env.local`, which the student writes.
  - `.claude/settings.json` denies `Read(./.env)` and `Read(./.env.*)`.
  - The agent never reads or prints a `.env` file by any other means either: `cat`, `grep` or `head`.
- **Environment variables:**
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `E2E_USER_A_EMAIL` and `E2E_USER_A_PASSWORD`
  - `E2E_USER_B_EMAIL` and `E2E_USER_B_PASSWORD`

  There is no Supabase secret or service-role key anywhere.
- **Next.js 16 differs from older versions.** Before writing routing, auth gating (`proxy.ts`, which replaces `middleware.ts`), server actions or caching code, read the relevant guide in `node_modules/next/dist/docs/`.
- **Free tiers only.** Clerk stays on development keys.

## Review Focus

1. **Double-click or double-tap on a painting** should save one pick, not two. The `flowReducer` test in Task 8 pins this, and so does the double-click check in Task 9's spec.
2. **The save fails after the pick** (session ended, Supabase unreachable). You should see "Your pick couldn't be saved." with a Try again button that retries the same painting. The pick must not disappear and the screen must not go blank. The `flowReducer` tests in Task 8 pin this.
3. **The museum answers with a Cloudflare HTML challenge instead of JSON,** or not at all. The pick screen should show the museum-unavailable state within 8 seconds, not crash or spin forever. The `fetchFourPaintings` tests in Task 6 pin this.
4. **An artwork with missing fields** (no artist, no date, no color, no alt text). Expect "Unknown artist", no date line, a neutral grey placeholder, and an empty alt. The `toPainting` tests in Task 6 pin this.
5. **A crafted save request carrying someone else's `user_id`.** It must be ignored: the row's owner always comes from the session token. The `toInsert` test in Task 7 pins this, and so does the row-level security `with check` in Task 5.

---

### Task 1: Step 2, plan the data model in AGENTS.md

**Files:**
- Create: `AGENTS.md`

**Interfaces:**
- Produces: the `picks` table definition that Tasks 5 and 7 implement, and the project rules every later task follows.

- [ ] **Step 1: Branches.** `main` doesn't exist yet. Point it at the approved design commit and work on a build branch:

```bash
git branch main design/mood-tracker
git switch -c build/mood-tracker
```

- [ ] **Step 2: 💬 Checkpoint, the data model.** Present this default and ask whether to keep it.

  It's one table, `picks`. Each row copies the painting's display fields, so the grid can show hundreds of squares without calling the museum for each one.

  | column | type | notes |
  |---|---|---|
  | `id` | `bigint generated always as identity primary key` | |
  | `user_id` | `text not null default (auth.jwt() ->> 'sub')` | the Clerk user ID, always taken from the session token |
  | `artwork_id` | `integer not null` | the museum's `id` |
  | `title` | `text not null` | |
  | `artist` | `text not null` | |
  | `date_display` | `text` | |
  | `image_id` | `text not null` | |
  | `alt_text` | `text` | |
  | `color_h`, `color_s`, `color_l` | `smallint` | null when the museum has no color |
  | `picked_at` | `timestamptz not null default now()` | |

  Row-level security allows two things, both for the `authenticated` role:
  - select where `user_id = (select auth.jwt() ->> 'sub')`
  - insert with check `user_id = (select auth.jwt() ->> 'sub')`

  There are no update or delete policies, because the spec has no editing or deleting.

  If the student changes the model, update Tasks 5 and 7 before going on.

- [ ] **Step 3: Write `AGENTS.md`.** Include:
  - one paragraph on what the app is, with a link to the spec and this plan
  - the agreed data model as above, with both policies in plain words
  - the project rules from Global Constraints: keys, never reading `.env` files by any means, museum API from the server with the header, images only through `<img>`, and no `user_id` filters in picks queries
  - a Commands section with placeholders that Task 2 fills in

  Leave room for the `nextjs-agent-rules` block that `next dev` adds in Task 2.

- [ ] **Step 4: 🎓 Ask your agent.** "Draw a diagram of my tables: what each one holds, and how each row belongs to one person." Draw it as a diagram in the chat.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md
git commit -m "Step 2: plan the data model in AGENTS.md"
```

### Task 2: Create the Next.js app

**Files:**
- Create: the files `create-next-app` generates (`app/`, `public/`, `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`)
- Modify: `.gitignore`, `AGENTS.md`, `package.json`, `tsconfig.json`

**Interfaces:**
- Produces: these npm scripts:
  - `npm run dev`
  - `npm run build`
  - `npm run lint`
  - `npm test`, which is `node --test 'tests/*.test.mjs'`

  Tests import `../lib/*.ts` directly. Node 24 strips types, so use only erasable TypeScript in `lib/`: no `enum` and no parameter properties.

- [ ] **Step 1: Scaffold in a temp folder.** `create-next-app` refuses a folder that already holds `AGENTS.md`.

```bash
TMP="$(mktemp -d)"
npx -y create-next-app@16 "$TMP/app" --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --skip-install --disable-git --yes
```

  Expected: the command prints "Success! Created app".

- [ ] **Step 2: Copy it in without overwriting ours.**

```bash
rsync -a --exclude AGENTS.md --exclude CLAUDE.md --exclude .gitignore "$TMP/app/" ./
```

  Then:
  - Start `.gitignore` from the scaffold's version and keep the `.superpowers/` lines.
  - If the scaffold produced `AGENTS.md` or `CLAUDE.md`, merge anything useful into our `AGENTS.md`. Don't add a `CLAUDE.md`.

- [ ] **Step 3: Match Assignment 3's setup.**
  - Add `"allowImportingTsExtensions": true` to `tsconfig.json`.
  - Add `"test": "node --test 'tests/*.test.mjs'"` to `package.json`.
  - Run `npm install`.
  - Fill in the Commands section of `AGENTS.md`.

- [ ] **Step 4: Verify.** Run these in order:
  - `npm run lint`: passes with no errors.
  - `npm run build`: prints "Compiled successfully".
  - `npm run dev`, then load `http://localhost:3000`: the Next.js starter page renders. Stop the server afterwards.

  Commit the `nextjs-agent-rules` block that `next dev` adds to `AGENTS.md`.

- [ ] **Step 5: 🧑 Student.** Ask them to run `/context` in Claude Code and confirm that `AGENTS.md` is listed as loaded.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Create the Next.js app with Assignment 3's setup"
```

### Task 3: Step 3, protect the keys

**Files:**
- Create: `.claude/settings.json`

- [ ] **Step 1: Write the deny rule**, exactly as in the handout:

```json
{ "permissions": { "deny": ["Read(./.env)", "Read(./.env.*)"] } }
```

- [ ] **Step 2: Verify.**
  - `git check-ignore -v .env.local` prints the `.gitignore` line that matches it.
  - Attempt `Read` on `./.env.local`, which doesn't exist yet. Expected: the permission system denies it, rather than "file not found". If it isn't denied, ask the student to restart the Claude Code session so the new settings load, then try again.

- [ ] **Step 3: 🧑 Student.** They create an empty `.env.local` themselves. It gets filled in Tasks 4, 5 and 9.

- [ ] **Step 4: 🎓 Ask your agent.** "Explain why this deny rule protects my keys. Then explain the difference between my publishable and secret keys, and where each one is allowed to go." Include in the answer:
  - The rule covers the `Read` tool only. That's why `AGENTS.md` also forbids `cat` and `grep` on `.env` files.
  - The `NEXT_PUBLIC_` variables end up in the browser bundle. `CLERK_SECRET_KEY` must stay on the server.

- [ ] **Step 5: Commit**

```bash
git add .claude/settings.json
git commit -m "Step 3: deny agent reads of .env files"
```

### Task 4: Step 4, sign-in with Clerk

**Files:**
- Created by `clerk init`: whatever it adds. Expect at least `@clerk/nextjs` in `package.json`, a `ClerkProvider` in `app/layout.tsx`, a `proxy.ts`, and keys in `.env.local`.
- Modify: `proxy.ts`, `app/layout.tsx`
- Create: `app/page.tsx` (replaces the starter page), `app/mood/page.tsx` (a placeholder until Task 8)

**Interfaces:**
- Produces:
  - `/` is public.
  - `/mood(.*)` needs a signed-in visitor.
  - On the server, `auth()` from `@clerk/nextjs/server` gives `{ userId, getToken }`.

- [ ] **Step 1: 🧑 Student.** They run `npx -y clerk@latest init` in their own terminal, because it signs them in and writes keys into `.env.local`. In the Clerk dashboard (development instance) they also turn on email and password sign-in, which Task 9 needs.

- [ ] **Step 2: Review what `clerk init` changed.** Use `git status` and `git diff`, never `.env.local`. Keep its structure.

- [ ] **Step 3: Gate `/mood`.** In `proxy.ts`, `clerkMiddleware` plus `createRouteMatcher(['/mood(.*)'])` calls `auth.protect()`.

- [ ] **Step 4: Landing page `app/page.tsx`.**
  - A signed-in visitor gets `redirect('/mood')`.
  - Otherwise show the heading `Mood Tracker`, the line `Pick the painting that feels like you right now, and watch your moods add up.`, and Clerk's sign-in and sign-up buttons. Use the component names from the installed `@clerk/nextjs` version.
  - Add Clerk's `UserButton`, which handles sign-out, to the `/mood` placeholder page.

- [ ] **Step 5: Verify signed out.**
  - With `npm run dev` running, `curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/mood` prints a 3xx code and a Clerk sign-in URL.
  - The `curl` check above stands in for the browser check: the agent's automated browser may be blocked from Clerk's sign-in page. The student also checks in their own browser that signed out, `/mood` asks them to sign in, and that signing in reaches `/mood`.

- [ ] **Step 6: 🎓 Ask your agent.** "Show me how the Clerk CLI works: what clerk init added to my project, file by file."

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Step 4: sign in with Clerk; /mood needs a signed-in visitor"
```

### Task 5: Step 5, Supabase connected to Clerk, with row-level security

**Files:**
- Create: `supabase/migrations/<UTC yyyymmddhhmmss>_create_picks.sql`, `lib/supabase-server.ts`
- Modify: `package.json` (adds `@supabase/supabase-js`)

**Interfaces:**
- Consumes: the data model from Task 1, and `auth()` from Task 4.
- Produces: `createServerSupabase(): Promise<SupabaseClient>` in `lib/supabase-server.ts`. It's built with `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { accessToken: async () => (await auth()).getToken() })`.

- [ ] **Step 1: 🧑 Student.**
  1. Create a free Supabase project, and set its usage alerts.
  2. Add the Supabase MCP server, scoped to that project, with write access:

     ```bash
     claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?project_ref=<project-ref>"
     ```

     Sign in when prompted.
  3. Connect Clerk: in Clerk's dashboard, turn on its Supabase integration, which adds the `role: authenticated` claim. Then in Supabase, go to Authentication → Sign In / Providers → Clerk and add the Clerk domain.
  4. Put `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.

- [ ] **Step 2: Write the migration file.** It creates the table from Task 1, an index on `(user_id, picked_at)`, `enable row level security`, and the two policies:
  - `"People can read their own picks"`: `for select to authenticated using ((select auth.jwt() ->> 'sub') = user_id)`
  - `"People can add their own picks"`: `for insert to authenticated with check ((select auth.jwt() ->> 'sub') = user_id)`

- [ ] **Step 3: Apply it with the MCP `apply_migration` tool** (name `create_picks`), using the same SQL as the file.

- [ ] **Step 4: Verify with MCP `execute_sql`:**
  - `select relrowsecurity from pg_class where relname = 'picks'` returns `true`.
  - `select policyname, cmd from pg_policies where tablename = 'picks'` returns exactly the two policies, `SELECT` and `INSERT`.
  - `get_advisors` (security) reports nothing for `picks`.

- [ ] **Step 5: Install the client and write `lib/supabase-server.ts`.** Run `npm install @supabase/supabase-js`. Then `npm run build` passes.

- [ ] **Step 6: 🎓 Ask your agent.** "Explain each row-level security policy in plain words, then show me a query that one of them would block." Use an insert with another person's `user_id` as the example.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Step 5: picks table in Supabase with row-level security, connected to Clerk"
```

### Task 6: Step 6, the museum API, called from the server

**Files:**
- Create: `lib/museum.ts`, `tests/museum.test.mjs`

**Interfaces:**
- Produces, from `lib/museum.ts`:
  - `type Painting = { artworkId: number; title: string; artist: string; dateDisplay: string | null; imageId: string; altText: string | null; color: { h: number; s: number; l: number } | null }`
  - `type FourPaintings = { status: 'ok'; paintings: Painting[] } | { status: 'empty' } | { status: 'unavailable' }`
  - `const PAINTINGS_PER_OPEN = 4`
  - `const AIC_USER_AGENT = 'Mood Tracker (MPCS 51238 class project)'`
  - `imageUrl(imageId: string, width: 200 | 400): string`
  - `toPainting(raw: unknown): Painting | null`
  - `distinctRandomPositions(count: number, total: number, random: () => number): number[]`
  - `fetchFourPaintings(options?: { fetchImpl?: typeof fetch; random?: () => number; timeoutMs?: number }): Promise<FourPaintings>`, where `timeoutMs` defaults to `8000`

- [ ] **Step 1: 💬 Checkpoint, where the API is called, and the designed states.** Present these defaults:
  - **Call the museum from the server.** It blocks requests without `AIC-User-Agent`. Browsers can't send that header to another site, because their pre-check request is blocked. A server can.
  - **Fallback if Vercel's servers get challenged** (checked in Task 10): a plain browser `GET` with no extra headers. The museum allows any site to read its responses.
  - **Loading:** four placeholder squares and `Finding four paintings…`
  - **Nothing found** (fewer than four valid paintings): `The museum didn't send back enough paintings.` plus a Try again button.
  - **Museum down:** `The museum's collection isn't answering right now.` plus a Try again button. Try again reloads `/mood`, which draws four new paintings.
  - **Question for the student:** when the museum is down, should there be a way to reach your grid without picking? The default is no, which keeps "you must pick". If they say yes, add a `loadPicks()` server action to Task 7 and a "See your grid" link in that state.

  Update this task and Task 8 to match their answers.

  **Decided 2026-10-25:** keep the defaults, except that you can see your grid when the museum is down. The nothing-found state offers it too (my call). Tasks 7 and 8 below include this.

- [ ] **Step 2: 🎓 Ask your agent.** "Draw a diagram of one request, from the click to the screen: the browser, my server, Clerk, Supabase, and the API."

- [ ] **Step 3: Write the failing tests in `tests/museum.test.mjs`.**

  Use a fake `fetchImpl` that records `{ url, headers }`, honours `init.signal`, and answers:
  - `limit=0` with `Response.json({ pagination: { total }, data: [] })`
  - `limit=1&page=n` with one raw artwork whose `id` is `n`

  The fixture `raw` is:

```js
{ id: 81535, title: "Sea View, Calm Weather", artist_title: "Édouard Manet", artist_display: "Édouard Manet (French, 1832–1883)", date_display: "1864", image_id: "8be90e71", thumbnail: { alt_text: "A work made of oil on canvas." }, color: { h: 176, l: 46, s: 18, percentage: 0.31, population: 1756 } }
```

```js
test("an image link points at the museum's image server", () =>
  assert.equal(imageUrl("abc", 200), "https://www.artic.edu/iiif/2/abc/full/200,/0/default.jpg"));
test("an artwork becomes a painting", () => assert.deepEqual(toPainting(raw), {
  artworkId: 81535, title: "Sea View, Calm Weather", artist: "Édouard Manet", dateDisplay: "1864",
  imageId: "8be90e71", altText: "A work made of oil on canvas.", color: { h: 176, s: 18, l: 46 } }));
test("the artist falls back to the first line of artist_display, then Unknown artist", ...);
  // artist_title null + artist_display "Édouard Manet (French, 1832–1883)\nParis" → "Édouard Manet (French, 1832–1883)"; both null → "Unknown artist"
test("missing date, alt text and color become null, and a missing title becomes Untitled", ...);
test("an artwork without an id or image_id is not a painting", ...); // → null
test("four distinct positions, all inside the collection", ...);
  // 200 runs of distinctRandomPositions(4, 668, Math.random): 4 distinct integers in 1..668
test("never more positions than paintings", () =>
  assert.deepEqual(distinctRandomPositions(4, 3, Math.random).sort(), [1, 2, 3]));
test("every museum request carries the AIC-User-Agent header", ...);
test("asks for the count first, then four different pages of one painting each", ...);
  // 5 calls; the first has limit=0; the other 4 have limit=1 and distinct page values in 1..668
test("returns four paintings when the museum answers", ...); // status "ok", 4 paintings
test("fewer than four paintings in the collection is empty", ...); // total 3 → { status: "empty" }
test("a Cloudflare challenge page is unavailable", ...);
  // 403 text/html "<!DOCTYPE html>…Just a moment…" → { status: "unavailable" }
test("a network error is unavailable", ...);
test("a museum that never answers is unavailable after the timeout", ...);
  // fetch hangs until aborted; timeoutMs 50 → "unavailable"
```

- [ ] **Step 4: Run them to watch them fail.** `npm test`: FAIL, with `lib/museum.ts` not found.

- [ ] **Step 5: Implement `lib/museum.ts`.**
  - Use `GET https://api.artic.edu/api/v1/artworks/search` with `params=` the URL-encoded `JSON.stringify({ query: PAINTING_QUERY })`.
  - The count request adds `limit=0`. Each painting request adds `limit=1&page=<position>&fields=id,title,artist_title,artist_display,date_display,image_id,thumbnail,color`.
  - Run the four painting requests in parallel, each with `cache: 'no-store'` and the header.
  - One `AbortSignal.timeout(timeoutMs)` covers the whole draw.
  - A non-OK response, or a body that isn't JSON, makes the result `unavailable`.
  - Round the color to integers.

- [ ] **Step 6: Run them to watch them pass.** `npm test`: all museum tests PASS.

- [ ] **Step 7: Check against the real museum.** Run a one-off script, `node -e` importing `./lib/museum.ts`, that calls `fetchFourPaintings()` and prints the four titles. Expected: `status: 'ok'` with four titles.

- [ ] **Step 8: Commit**

```bash
git add lib/museum.ts tests/museum.test.mjs
git commit -m "Step 6: draw four random public-domain paintings from the museum, on the server"
```

### Task 7: Saving a pick and reading the history

**Files:**
- Create: `lib/picks.ts`, `tests/picks.test.mjs`, `app/mood/actions.ts`

**Interfaces:**
- Consumes: `Painting` from Task 6, and `createServerSupabase()` from Task 5.
- Produces, from `lib/picks.ts`:
  - `type SavedPick = Painting & { id: number; pickedAt: string }`
  - `type PickRow`: the table's columns as in Task 1, minus `user_id`, in snake_case
  - `fromRow(row: PickRow): SavedPick`
  - `toInsert(painting: Painting): Omit<PickRow, 'id' | 'picked_at'>`
  - `isPainting(value: unknown): value is Painting`
- Produces, from `app/mood/actions.ts` (`'use server'`):
  - `savePick(choice: Painting): Promise<PicksResult>`
  - `loadPicks(): Promise<PicksResult>`, for seeing your grid when the museum is down
  - `type PicksResult = { ok: true; picks: SavedPick[] } | { ok: false; message: string }`

- [ ] **Step 1: Write the failing tests in `tests/picks.test.mjs`.**

```js
test("a database row becomes a saved pick", ...);
  // every column maps: artwork_id→artworkId, image_id→imageId, alt_text→altText,
  // color_h/s/l→color (null when any is null), picked_at→pickedAt
test("toInsert never carries an owner, even if the input has one", () => {
  const row = toInsert({ ...painting, user_id: "someone-else", id: 9 });
  assert.equal("user_id" in row, false);
  assert.equal("id" in row, false);
});
test("isPainting accepts a painting from the museum", ...);
test("isPainting rejects a wrong-typed or missing field", ...);
  // artworkId "1", missing imageId, color { h: "1" }
test("isPainting rejects a title or artist longer than 1000 characters", ...);
```

- [ ] **Step 2: Run them to watch them fail.** `npm test`: FAIL, with `lib/picks.ts` not found.

- [ ] **Step 3: Implement `lib/picks.ts`.**

- [ ] **Step 4: Run them to watch them pass.** `npm test`: PASS.

- [ ] **Step 5: Implement `savePick` in `app/mood/actions.ts`.**
  1. If `(await auth()).userId` is null, return `{ ok: false, message: "Your session ended. Sign in again to save your pick." }`.
  2. If `!isPainting(choice)`, return `{ ok: false, message: "Your pick couldn't be saved." }`.
  3. Insert `toInsert(choice)`. On error, return `{ ok: false, message: "Your pick couldn't be saved." }`.
  4. Select every column from `picks`, ordered by `picked_at` then `id`, ascending. **Don't filter by `user_id`.**
  5. Return `{ ok: true, picks: rows.map(fromRow) }`.

  `loadPicks()` repeats steps 1, 4 and 5 without the insert. On no session, it returns `{ ok: false, message: "Your session ended. Sign in again to see your picks." }`. On a select error, it returns `{ ok: false, message: "Your picks couldn't be loaded." }`. Steps 4 and 5 are shared by both functions.

- [ ] **Step 6: Verify.** `npm run build` passes. The end-to-end proof comes in Task 9.

- [ ] **Step 7: Commit**

```bash
git add lib/picks.ts tests/picks.test.mjs app/mood/actions.ts
git commit -m "Save a pick and read back the history, relying on row-level security"
```

### Task 8: The pick screen, the history grid and the hover card

**Files:**
- Create:
  - `lib/grid.ts`, `lib/format.ts`, `lib/mood-flow.ts`
  - `tests/grid.test.mjs`, `tests/format.test.mjs`, `tests/mood-flow.test.mjs`
  - `app/mood/loading.tsx`, `app/mood/MoodFlow.tsx`, `app/mood/PickScreen.tsx`, `app/mood/HistoryGrid.tsx`
- Modify: `app/mood/page.tsx`

**Interfaces:**
- Consumes: `fetchFourPaintings`, `imageUrl`, `Painting` (Task 6); `savePick`, `SavedPick` (Task 7).
- Produces:
  - `lib/grid.ts`:
    - `GRID_BOX_PX = 340`
    - `GRID_GAP_PX = 3`
    - `gridShape(count: number, boxPx?: number, gapPx?: number): { columns: number; rows: number; tilePx: number }`
  - `lib/format.ts`:
    - `formatPickedAt(iso: string, timeZone?: string): string`
  - `lib/mood-flow.ts`:
    - `type FlowState = { step: 'picking' } | { step: 'saving'; choice: Painting } | { step: 'save-failed'; choice: Painting; message: string } | { step: 'loading-grid' } | { step: 'grid-failed'; message: string } | { step: 'history'; picks: SavedPick[]; newestIsNew: boolean }`
    - `type FlowAction = { type: 'pick'; painting: Painting } | { type: 'view-grid' } | { type: 'picks-loaded'; picks: SavedPick[] } | { type: 'failed'; message: string } | { type: 'retry' }`
    - `flowReducer(state: FlowState, action: FlowAction): FlowState`. Any action not listed in the tests returns the same state object.

- [ ] **Step 1: Write the failing tests.**

```js
// tests/grid.test.mjs
test("40 picks make 7 across by 6 down at 46px", () => assert.deepEqual(gridShape(40), { columns: 7, rows: 6, tilePx: 46 }));
test("150 picks make 13 by 12 at 23px", () => assert.deepEqual(gridShape(150), { columns: 13, rows: 12, tilePx: 23 }));
test("50 picks make 8 by 7 at 39px", () => assert.deepEqual(gridShape(50), { columns: 8, rows: 7, tilePx: 39 }));
test("one pick fills the box", () => assert.deepEqual(gridShape(1), { columns: 1, rows: 1, tilePx: 340 }));
test("no picks, no grid", () => assert.deepEqual(gridShape(0), { columns: 0, rows: 0, tilePx: 0 }));

// tests/format.test.mjs — note: normal spaces, not the U+202F that Intl puts before AM/PM
test("pick time reads like the mockup", () =>
  assert.equal(formatPickedAt("2026-10-21T14:15:00Z", "America/Chicago"), "Picked Wed, Oct 21, 2026 · 9:15 AM"));
test("pick time uses the visitor's time zone, even across midnight", () =>
  assert.equal(formatPickedAt("2026-12-01T00:05:00Z", "America/Chicago"), "Picked Mon, Nov 30, 2026 · 6:05 PM"));

// tests/mood-flow.test.mjs
test("picking a painting starts saving it", ...);            // picking + pick → { step: "saving", choice }
test("a second pick while saving is ignored", ...);          // saving + pick → same state object
test("a saved pick shows the history with the newest marked", ...); // saving + picks-loaded → { step: "history", picks, newestIsNew: true }
test("a failed save keeps the chosen painting", ...);        // saving + failed → { step: "save-failed", choice, message }
test("try again re-saves the same painting", ...);           // save-failed + retry → { step: "saving", choice }
test("a stray picks-loaded event while picking is ignored", ...); // picking + picks-loaded → same state object
test("seeing the grid without picking loads it", ...);       // picking + view-grid → { step: "loading-grid" }
test("a grid seen without a pick marks no newest pick", ...); // loading-grid + picks-loaded → { step: "history", picks, newestIsNew: false }
test("a failed grid load can be retried", ...);              // loading-grid + failed → { step: "grid-failed", message }; then retry → { step: "loading-grid" }
test("seeing the grid while saving is ignored", ...);        // saving + view-grid → same state object
```

- [ ] **Step 2: Run them to watch them fail.** `npm test`: FAIL, with the three modules not found.

- [ ] **Step 3: Implement `lib/grid.ts`, `lib/format.ts` and `lib/mood-flow.ts`.** In `formatPickedAt`, replace ` ` with a normal space.

- [ ] **Step 4: Run them to watch them pass.** `npm test`: all PASS.

- [ ] **Step 5: Build the pages.** Match the Global Constraints and the spec:
  - **`app/mood/page.tsx`** (server): renders fresh on every request (check the Next 16 caching docs). It calls `fetchFourPaintings()` and renders `<MoodFlow draw={result} />`.
  - **`app/mood/loading.tsx`:** the loading state from Task 6.
  - **`MoodFlow.tsx`** (client): uses `useReducer(flowReducer, { step: 'picking' })`. On `saving`, it calls `savePick`. On `loading-grid`, it calls `loadPicks`. Either result dispatches `picks-loaded` or `failed`. Try again on the museum states calls `router.refresh()`. **See your grid** on the museum-down and nothing-found states dispatches `view-grid`. It shows `UserButton` top-right.
  - **`PickScreen.tsx`:** a 2×2 grid of `<button>`s about 230px each. It must fit at 375px wide. Each has an `aria-label` of `Painting N of 4`, an `<img>` at width 400 with `alt` set to `altText ?? ''` and `object-fit: contain`, and the main color as background. While saving, the chosen one is highlighted, the others are dimmed, and the buttons are disabled. It also shows the empty, unavailable and save-failed states.
  - **`HistoryGrid.tsx`:** CSS grid from `gridShape(picks.length)`. Each square is a focusable button with `data-pick-id={id}` and `aria-label={title}`, containing an `<img>` at width 200, `object-fit: cover`, with the main-color background. The last square is outlined only when `newestIsNew` is true. With no picks, it shows `No picks yet.`
  - **The card:** hover, focus or tap shows it, positioned beside the square and flipped to stay on screen. It contains the image (400), title, artist, `dateDisplay` (left out when null), and `formatPickedAt(pickedAt)`.
  - **Images:** plain `<img>` with `// eslint-disable-next-line @next/next/no-img-element`. The museum's image server blocks the optimizer.
  - **Fallbacks:** a null color uses `hsl(0, 0%, 75%)`.

- [ ] **Step 6: Verify.**
  - `npm run lint` and `npm run build` pass.
  - The agent's browser can't load the museum's images, so the agent checks layout and states using the color placeholders.
  - **🧑 Student:** in their own browser, they check that the four paintings show whole, that a pick lands on the grid with the newest square outlined, that the hover card shows the right details, that refreshing draws four new paintings, and that the layout works at phone width.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Step 6: pick screen, history grid and hover card, with loading, empty and unavailable states"
```

### Task 9: Step 7, a Playwright test that two people can't see each other's picks

**Files:**
- Create: `playwright.config.ts`, `e2e/global.setup.ts`, `e2e/privacy.spec.ts`
- Create: `supabase/migrations/<ts>_break_rls_on_purpose.sql` and `supabase/migrations/<ts>_restore_rls.sql`
- Modify: `package.json` (add `"e2e": "playwright test"`), `.gitignore` (Playwright's output folders)

**Interfaces:**
- Consumes:
  - `data-pick-id` on grid squares and `aria-label="Painting N of 4"` on pick buttons (Task 8)
  - the `E2E_USER_*` variables

- [ ] **Step 1: 🧑 Student.** In the Clerk dashboard, they create two test users with email and password, for example `moodtest+a+clerk_test@example.com` and `moodtest+b+clerk_test@example.com`. They put `E2E_USER_A_EMAIL`, `E2E_USER_A_PASSWORD`, `E2E_USER_B_EMAIL` and `E2E_USER_B_PASSWORD` in `.env.local`.

- [ ] **Step 2: Set up Playwright.**

```bash
npm install -D @playwright/test @clerk/testing dotenv
npx playwright install chromium
```

  - `playwright.config.ts` loads `.env.local` with `dotenv` (the test process reads it; the agent doesn't).
  - It uses `baseURL: 'http://localhost:3000'` and `webServer: { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true }`.
  - It points `globalSetup` at `e2e/global.setup.ts`, which runs `clerkSetup()`.

- [ ] **Step 3: Write `e2e/privacy.spec.ts`.**
  - Sign in with `clerk.signIn({ page, signInParams: { strategy: 'password', identifier, password } })` from `@clerk/testing/playwright`, on a page already at `/`.
  - A helper, `pickAPainting(page): Promise<string>`, clicks `Painting 1 of 4` and waits for the grid. It returns the outlined square's `data-pick-id`.

```ts
test("two people can't see each other's picks", async ({ browser }) => {
  // A signs in (own context) and picks → pickA. B signs in (own context) and picks → pickB.
  // B's grid: [data-pick-id=pickA] count 0, [data-pick-id=pickB] count 1.
  // A reloads /mood and picks again: [data-pick-id=pickB] count 0.
});
test("a signed-out visitor sees no one's picks", async ({ page }) => {
  // goto /mood → the URL is no longer /mood, and no [data-pick-id] exists.
  // Don't depend on Clerk's hosted sign-in page rendering.
});
test("double-clicking a painting saves one pick", async ({ browser }) => {
  // A: note the grid size after one pick; reload; dblclick "Painting 1 of 4"; grid size grew by exactly 1.
});
```

- [ ] **Step 4: Run it with row-level security working.** `npm run e2e`: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Step 7: Playwright test that two people can't see each other's picks"
```

- [ ] **Step 6: Break row-level security on purpose.**
  - Write `<ts>_break_rls_on_purpose.sql` with `create policy "BROKEN ON PURPOSE: everyone can read every pick" on public.picks for select to authenticated using (true);` and apply it with MCP `apply_migration`.
  - Run `npm run e2e`. Expected: "two people can't see each other's picks" FAILS, because B's grid shows A's pick.
  - Show the student the failure output.

- [ ] **Step 7: Commit the broken state**, so the history shows it:

```bash
git add supabase/migrations
git commit -m "Step 7: break row-level security on purpose (the test fails)"
```

- [ ] **Step 8: Fix it.**
  - Write `<ts>_restore_rls.sql` with `drop policy "BROKEN ON PURPOSE: everyone can read every pick" on public.picks;` and apply it.
  - `npm run e2e`: 3 passed.
  - MCP `pg_policies` shows only the two original policies.

- [ ] **Step 9: 🎓 Ask your agent.** "Explain why the test failed when I broke row-level security, in one sentence I could say in class."

- [ ] **Step 10: Commit**

```bash
git add supabase/migrations
git commit -m "Step 7: restore row-level security (the test passes)"
```

### Task 10: Step 8, review and deploy

**Files:**
- Create: `README.md`. It covers what the app is, how to run it, the environment variable names (not their values), how privacy works, the commands, and the reminder that Supabase pauses after a week without use.

- [ ] **Step 1: Write `README.md`.** `npm test`, `npm run lint` and `npm run build` all pass. Commit it: "Write the README".

- [ ] **Step 2: Review.**
  - Run the `security-review` skill on `build/mood-tracker` (the student can type `/security-review`), and fix or answer each finding with a commit per fix.
  - **🧑 Student:** they read the branch's diff themselves (`git diff main...build/mood-tracker`).

- [ ] **Step 3: Merge.** With the student's go-ahead, run `git switch main && git merge --no-ff build/mood-tracker`. Then `npm test` and `npm run build` pass on `main`.

- [ ] **Step 4: 🧑 Student.**
  1. Push `main` and the branches, after saying yes to the push.
  2. Import the repo into Vercel (Hobby) and set the four app environment variables in Vercel. The `E2E_*` ones aren't needed there.
  3. Deploy.
  4. Set Vercel's spending and usage alerts.

- [ ] **Step 5: Verify on the live URL.** The student does this in their own browser:
  - Signed out, the landing page shows and `/mood` asks you to sign in.
  - A new account can pick, and the grid shows the pick.
  - After signing out and back in on another device or browser, the picks are still there.
  - **If the pick screen shows "isn't answering" on Vercel but works locally,** Vercel's servers are being challenged. Switch `fetchFourPaintings` to run in the browser with a plain `GET` and no custom headers (the museum allows any site), keep the same states, re-run `npm run e2e`, and redeploy.

- [ ] **Step 6: 🧑 Student.** A classmate makes an account on the live URL and uses it.

- [ ] **Step 7: 🎓 Ask your agent.**
  - "Quiz me on how my app works, one question at a time, and tell me what I got wrong. Start with the questions in Be Ready to Explain."
  - Then: "Walk me through the free tier limits for each service my app uses, and how to set usage limits and spending alerts for each one."
