import assert from "node:assert/strict";
import test from "node:test";
import { formatPickedAt } from "../lib/format.ts";

// Intl puts a narrow no-break space (U+202F) before AM/PM; the app shows a normal space.
test("pick time reads like the mockup", () => {
  assert.equal(formatPickedAt("2026-10-21T14:15:00Z", "America/Chicago"), "Picked Wed, Oct 21, 2026 · 9:15 AM");
});

test("pick time uses the visitor's time zone, even across midnight", () => {
  assert.equal(formatPickedAt("2026-12-01T00:05:00Z", "America/Chicago"), "Picked Mon, Nov 30, 2026 · 6:05 PM");
});

test("pick times come back from Postgres with a +00:00 offset", () => {
  assert.equal(formatPickedAt("2026-10-21T14:15:00+00:00", "America/Chicago"), "Picked Wed, Oct 21, 2026 · 9:15 AM");
});
