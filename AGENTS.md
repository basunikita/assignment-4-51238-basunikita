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

## Rules

- **Keys live only in `.env.local`, which the student writes.**
  - Never read, print or search a `.env` file by any means. The deny rule in `.claude/settings.json` blocks the Read tool, and `cat`, `grep`, `head` and the like are just as off-limits.
  - No Supabase secret or service-role key is used anywhere.
- **The museum API is called only from the server.** Every request to `https://api.artic.edu/api/v1` sends `AIC-User-Agent: Mood Tracker (MPCS 51238 class project)`. The museum blocks requests without that header, and browsers can't send it to another site.
- **Museum images load only in the visitor's browser,** through a plain `<img>` from `https://www.artic.edu/iiif/2/...`. They never go through the server or the Next.js image optimizer, because the image server blocks both.
- **Queries on `picks` never filter by `user_id` in code.** Row-level security does that, and the Playwright privacy test only proves something because of it.
- **Read the docs first.** Before writing Next.js routing, auth gating, server actions or caching code, read the matching guide in `node_modules/next/dist/docs/`.
- **Commits and pushes.** Each commit names the handout step it belongs to. Push only when the student says so.

## Commands

These get filled in when the Next.js app is created (Task 2 of the build plan).
