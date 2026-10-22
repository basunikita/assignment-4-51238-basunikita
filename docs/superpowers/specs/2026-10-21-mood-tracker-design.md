# Mood Tracker — Design

MPCS 51238 Design, Build, Ship · Assignment 4 (Full Stack App) · due Tuesday, October 27, 2026, 5:30 PM
Written 2026-10-21 from a design conversation with the student. Working title: **Mood Tracker** (a placeholder, not decided).

Decisions are marked as follows:

- **Decided** means the student said it or chose it.
- **Accepted** means I proposed it as a guess and the student agreed.
- **My call** means I decided it and the student has not objected yet.

## Intent

A mood tracker where you say how you feel by picking a painting, not a word. Every time you open the app, it shows four random paintings from the Art Institute of Chicago, and you pick the one closest to how you feel. Every pick is saved. Your history is a near-square grid of tiny pictures of the paintings you picked.

Why, in the student's words: "I want to be able to see from a glance how I was feeling each time."

This is also the course's full-stack assignment. Classmates must be able to create an account and use the app, and each person sees only their own picks.

## Goals

- On every open, pick a mood from four random paintings.
- See every past pick at a glance as a grid of tiny pictures, with details on hover.
- Sign up, sign in and sign out with Clerk. Picks are stored in Supabase, with row-level security so each person sees only their own.
- Meet every requirement in the Assignment 4 handout (see Constraints).

## Non-goals for this version

- No words, notes, mood labels or ratings attached to a pick.
- No searching or browsing the museum's collection.
- No calendar and no dates on the grid.
- No skipping the pick, and no "show me four others" button.
- No editing or deleting picks (my call: it keeps the row-level security rules to reading and inserting).
- No trends, streaks, reminders or notifications.

## Anti-goals: it fails if these happen, even if it works

- The history reads like a calendar or a spreadsheet. It should be pictures, not dates.
- Anyone, signed in or not, can see another person's picks.
- An API key or secret ends up in the code or the git history.
- It gets built in one shot. The course marks a one-shot submission incomplete. The work goes through the handout's eight steps in order, the commits show that progress, and the student can explain each step.

## The experience

### Signed out (my call)

A simple landing page shows the app's name, one line on what it does, and Clerk's sign-in and sign-up buttons. It shows no data. Every other page sends a signed-out visitor to sign in.

### Opening the app: the pick screen (decided)

- **Every time you open the app, you must pick a mood before you see anything else.** Loading or refreshing the page counts as opening it (accepted). Switching back to a browser tab that is already open does not (accepted).
- Opening the app twice in ten minutes means two picks. That is intended.
- Four random paintings, not six (decided).
- Each painting is shown whole, not cropped, because cropping changes the painting (accepted). There's no title or artist, so you pick by feel (accepted).
- Heading: "How are you feeling right now?" Hint: "Pick the painting closest to your mood." (wording from the mockup; it can change)
- There is no skip (decided) and no "show me four others" button (accepted).
- Refreshing before you pick shows four new paintings, because a refresh counts as opening the app. That is fine (decided). "No reshuffle" only means there is no button for it. Nothing about the four waiting to be picked is stored.
- Clicking a painting saves the pick immediately. You then see the history grid, with the new pick outlined in the bottom-right corner.
- The four come only from public-domain paintings that have an image (accepted). See the API section.
- In the mockup, the four sat in a 2×2 grid of square cells about 230px wide, with each painting fitted inside its cell and the cell's background set to the painting's main color. The builder decides the final sizes, and the screen must work at phone width.

### History grid (decided)

- There's one tiny picture per pick, for every pick. Oldest is at the top left and newest at the bottom right, in reading order (accepted).
- No dates or labels appear on the grid (decided).
- **Shape:** as close to a square as possible: `columns = ceil(sqrt(n))`, `rows = ceil(n / columns)`. The last row may be partly filled. Examples: 40 picks make 7 × 6, and 150 picks make 13 × 12.
- **The grid stays the same size, and the squares shrink as picks add up** (decided). The mockup used a 340px box with 3px gaps, which gives 46px squares at 40 picks and about 23px at 150. The builder picks the box size, which must fit at phone width. The builder also picks a minimum square size, if any, for very large histories.
- Each square shows the painting cropped to fill the square (`object-fit: cover`). That's fine at this size. Only the pick screen must show paintings whole.
- **Hover** over a square shows a card with:
  - a bigger image of the painting
  - its title
  - the artist
  - the work's date
  - the date and time you picked it, for example "Picked Wed, Oct 21, 2026 · 9:15 AM"
- On touch screens, tapping a square shows the same card (accepted).
- While a tiny picture loads, its square is filled with the painting's main color from the API's `color` field (accepted).
- The grid is only reachable after a pick in the current visit, so it always has at least one picture.

## The Art Institute of Chicago API: what was verified on 2026-10-21

- **Base URL:** `https://api.artic.edu/api/v1`. No API key is needed.
- **The `AIC-User-Agent` header is required in practice.** This was re-checked later on 2026-10-21. Script requests that sent `AIC-User-Agent: <app name>` all worked, including image requests. The same requests without the header got a Cloudflare challenge (HTTP 403, `cf-mitigated: challenge`). A browser can't send that header to another site without first sending a pre-check (`OPTIONS`) request, and the pre-check got the challenge too. Responses do allow any site to read them (`access-control-allow-origin: *`). So a browser could make a plain request with no extra headers, but that hasn't been tried from a real browser.
- **Counting:** `limit=0` returns `pagination.total` with no artworks (668 for the filter below). Asking for a page past the end returns HTTP 403 with `{"status":403,"error":"Invalid number of results",...}`.
- **Search as GET:** the Elasticsearch query also works as a `params` query parameter holding the JSON, alongside `limit`, `page` and `fields`.
- **Search:** `POST /artworks/search` with a JSON body. The body takes an Elasticsearch `query`, `fields`, `limit` and `page`.
- **Filter for the pool of paintings:**
  - `is_public_domain` is true
  - `image_id` exists
  - `classification_title.keyword` is `painting`

  This gives 668 artworks.
- **Random doesn't work as expected:** a `function_score` query with `random_score` ignored its seed. Seeds 1, 999, 12345 and 424242 all returned the same paintings in the same order. Asking for a random `page` does return different paintings. The builder chooses how to draw four distinct random paintings, for example four `limit=1` requests on random pages, or one larger page and four picked from it. Four consecutive results from one random page (`limit=4`) would only ever produce 167 fixed groups of four, so avoid that.
- **Fields the app needs:** `id`, `title`, `artist_display` or `artist_title`, `date_display`, `image_id`, `thumbnail.alt_text`, `color` (`h`, `s`, `l`), and `is_public_domain`. It also needs `config.iiif_url` from the response.
- **Image links:** `{iiif_url}/{image_id}/full/{width},/0/default.jpg`. The mockups used 400 wide for the pick screen and hover card, and 200 wide for tiny squares. 843 is the museum's usual large size.
- **The image server blocks bots.** Image requests from curl without the header, and from an automated browser, got a Cloudflare challenge or "you have been blocked". The student's own browser loads them fine. So **images must load straight from the museum into the visitor's browser** through plain `<img>` tags, or `next/image` with `unoptimized`. They must never go through the app's server or the Next.js image optimizer, which fetches images on the server.
- **Data API from a server:** JSON requests with the header from curl on this laptop worked. Requests from Vercel's servers have not been tried. This matters for Step 6.
- **"Nothing found":** a keyword search (`q=`) never comes back empty. A made-up word returned all 133,169 artworks with near-zero relevance scores. An empty result only comes from filters. An unknown artwork ID returns HTTP 404 with `{"status":404,"error":"Not found",...}`.
- **License:** all data is CC0 except the `description` field, which is CC-BY. The app doesn't use `description`.

## Constraints

### From the handout

- **Stack:** Next.js and Tailwind CSS, Clerk for sign-in, Supabase for the database, one external API, a GitHub repo, and Vercel's free Hobby plan. Stay on Clerk's development keys.
- **Steps, in order:**
  1. API
  2. Data model in `AGENTS.md`
  3. Keys and deny rule
  4. Clerk
  5. Supabase, with an MCP server scoped to one project, Clerk connected as a third-party auth provider, and migrations with row-level security on every table
  6. Where the API is called, plus the loading, nothing-found and API-down states
  7. A Playwright test that two users can't see each other's data, watched failing (with row-level security broken on purpose) before it passes
  8. Branch, `/security-review`, deploy to Vercel, and a classmate makes an account and uses it

  Each step ends with an "Ask your agent" explanation for the student.
- **Data:** each table holding someone's data has a `user_id` column. Most apps need two or three tables. The data model goes in `AGENTS.md` and must be read before anything is built.
- **Keys:** keys go in `.env.local`, which the student creates. `.claude/settings.json` denies `Read(./.env)` and `Read(./.env.*)`.
- **Persistence:** picks are still there after signing out and back in on another device.
- **Context file:** `AGENTS.md` is the project's context file. There is no `CLAUDE.md`.
- **Free tiers only,** with usage limits and alerts set wherever offered. Supabase pauses a free project after a week without use.

### My call

- **Match Assignment 3's setup:**
  - Next.js 16 with the App Router
  - React 19
  - TypeScript
  - Tailwind CSS 4
  - ESLint

## Order of work, and what the repo has to show

### What the handout asks for

- **Submission:** the Vercel URL, plus the GitHub URL with a `README.md` and "a commit history that shows your progress".
- **"Ask your agent" prompts:** these are for the student's own learning and for explaining the work in class. The handout doesn't ask for them to be written down in the repo.
- **Step 7:** the test has to be watched failing before it passes. In class, the student must explain what the failure looked like and what changed.
- **Classmate:** the handout asks only that the app is live and that a classmate can make an account and use it. It asks for no other proof.

### My calls

- **Order of work:**
  1. Step 2: write the data model in `AGENTS.md`. No code yet, because it must be read before anything is built.
  2. Create the Next.js app with Assignment 3's setup.
  3. Step 3: add the deny rule. The student creates `.env.local`.
  4. Step 4: Clerk, with the landing page and a page that only signed-in visitors can open.
  5. Step 5: Supabase, the tables and row-level security.
  6. Step 6: the pick screen with the API, the history grid, the hover card, and the loading, nothing-found and API-down states.
  7. Step 7: the Playwright test.
  8. Step 8: review and deploy.
- **Commits:**
  - At least one commit per step, with the step named in the message.
  - In Step 7, breaking row-level security on purpose and fixing it are separate commits, so the history shows the failure.
  - Work happens on branches that merge into `main`, with `/security-review` run before merging.

## Decided later, at the matching handout step (not now)

- **Step 2, the data model.** Is one `picks` table enough, or is a second table worth having? Does each pick store a copy of the painting's display fields (title, artist, date, `image_id`, color), so the grid shows without asking the API for every square, or only the artwork ID? My recommendation: one `picks` table with a copy of the display fields, because the grid can hold hundreds of squares. That is still for the student to agree to in Step 2.
- **Step 6, the API.** Is the API called in the browser or on the server? Also: what the pick screen shows while the four paintings load, what happens if fewer than four come back, and what happens when the museum's API is down. Because picking can't be skipped, the API-down case has to decide whether you can still reach your grid.

## Left to the builder

- Exact sizes, spacing, colors, type and motion, within the layouts above. Everything must work at phone width.
- Pages and URLs, as long as you pick before anything else on every page load.
- How to draw four distinct random paintings, within the limits above.
- The hover card's position and how it avoids running off screen.
- The landing page's look and its one line of copy.
