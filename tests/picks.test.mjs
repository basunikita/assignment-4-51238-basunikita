import assert from "node:assert/strict";
import test from "node:test";
import { fromRow, isPainting, toInsert } from "../lib/picks.ts";

const painting = {
  artworkId: 81535,
  title: "Sea View, Calm Weather",
  artist: "Édouard Manet",
  dateDisplay: "1864",
  imageId: "8be90e71-83c3-3f98-a972-4acb9ce0e773",
  altText: "A work made of oil on canvas.",
  color: { h: 176, s: 18, l: 46 },
};

const row = {
  id: 7,
  artwork_id: 81535,
  title: "Sea View, Calm Weather",
  artist: "Édouard Manet",
  date_display: "1864",
  image_id: "8be90e71-83c3-3f98-a972-4acb9ce0e773",
  alt_text: "A work made of oil on canvas.",
  color_h: 176,
  color_s: 18,
  color_l: 46,
  picked_at: "2026-10-21T14:15:00+00:00",
};

test("a database row becomes a saved pick", () => {
  assert.deepEqual(fromRow(row), { ...painting, id: 7, pickedAt: "2026-10-21T14:15:00+00:00" });
});

test("a row missing any color part has no color", () => {
  assert.equal(fromRow({ ...row, color_s: null }).color, null);
});

test("a painting becomes the columns to insert", () => {
  assert.deepEqual(toInsert(painting), {
    artwork_id: 81535,
    title: "Sea View, Calm Weather",
    artist: "Édouard Manet",
    date_display: "1864",
    image_id: "8be90e71-83c3-3f98-a972-4acb9ce0e773",
    alt_text: "A work made of oil on canvas.",
    color_h: 176,
    color_s: 18,
    color_l: 46,
  });
});

test("toInsert never carries an owner, even if the input has one", () => {
  const inserted = toInsert({ ...painting, user_id: "someone-else", id: 9 });
  assert.equal("user_id" in inserted, false);
  assert.equal("id" in inserted, false);
});

test("isPainting accepts a painting from the museum", () => {
  assert.equal(isPainting(painting), true);
  assert.equal(isPainting({ ...painting, dateDisplay: null, altText: null, color: null }), true);
});

test("isPainting rejects a wrong-typed or missing field", () => {
  assert.equal(isPainting({ ...painting, artworkId: "1" }), false);
  assert.equal(isPainting({ ...painting, imageId: undefined }), false);
  assert.equal(isPainting({ ...painting, color: { h: "1", s: 18, l: 46 } }), false);
  assert.equal(isPainting({ ...painting, title: "" }), false);
  assert.equal(isPainting(null), false);
});

test("isPainting rejects a title or artist longer than 1000 characters", () => {
  assert.equal(isPainting({ ...painting, title: "x".repeat(1001) }), false);
  assert.equal(isPainting({ ...painting, artist: "x".repeat(1001) }), false);
  assert.equal(isPainting({ ...painting, title: "x".repeat(1000) }), true);
});

test("isPainting rejects an image ID that isn't a museum image ID", () => {
  assert.equal(isPainting({ ...painting, imageId: "../../etc" }), false);
  assert.equal(isPainting({ ...painting, imageId: "a/b" }), false);
  assert.equal(isPainting({ ...painting, imageId: "x".repeat(101) }), false);
});
