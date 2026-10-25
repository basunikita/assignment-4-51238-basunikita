import assert from "node:assert/strict";
import test from "node:test";
import { flowReducer } from "../lib/mood-flow.ts";

const painting = {
  artworkId: 81535,
  title: "Sea View, Calm Weather",
  artist: "Édouard Manet",
  dateDisplay: "1864",
  imageId: "8be90e71-83c3-3f98-a972-4acb9ce0e773",
  altText: null,
  color: null,
};
const picks = [{ ...painting, id: 1, pickedAt: "2026-10-21T14:15:00+00:00" }];

test("picking a painting starts saving it", () => {
  assert.deepEqual(flowReducer({ step: "picking" }, { type: "pick", painting }), { step: "saving", choice: painting });
});

test("a second pick while saving is ignored", () => {
  const saving = { step: "saving", choice: painting };
  assert.equal(flowReducer(saving, { type: "pick", painting: { ...painting, artworkId: 2 } }), saving);
});

test("a saved pick loads the grid, then shows it with the newest marked", () => {
  const loading = flowReducer({ step: "saving", choice: painting }, { type: "saved" });
  assert.deepEqual(loading, { step: "loading-grid", afterPick: true });
  assert.deepEqual(flowReducer(loading, { type: "picks-loaded", picks }), { step: "history", picks, newestIsNew: true });
});

test("a failed save keeps the chosen painting", () => {
  assert.deepEqual(flowReducer({ step: "saving", choice: painting }, { type: "failed", message: "Your pick couldn't be saved." }), {
    step: "save-failed",
    choice: painting,
    message: "Your pick couldn't be saved.",
  });
});

test("try again re-saves the same painting", () => {
  const failed = { step: "save-failed", choice: painting, message: "Your pick couldn't be saved." };
  assert.deepEqual(flowReducer(failed, { type: "retry" }), { step: "saving", choice: painting });
});

test("a stray picks-loaded event while picking is ignored", () => {
  const picking = { step: "picking" };
  assert.equal(flowReducer(picking, { type: "picks-loaded", picks }), picking);
});

test("seeing the grid without picking loads it", () => {
  assert.deepEqual(flowReducer({ step: "picking" }, { type: "view-grid" }), { step: "loading-grid", afterPick: false });
});

test("a grid seen without a pick marks no newest pick", () => {
  assert.deepEqual(flowReducer({ step: "loading-grid", afterPick: false }, { type: "picks-loaded", picks }), {
    step: "history",
    picks,
    newestIsNew: false,
  });
});

test("a failed grid load after a save retries the load, never the save", () => {
  const failed = flowReducer({ step: "loading-grid", afterPick: true }, { type: "failed", message: "Your picks couldn't be loaded." });
  assert.deepEqual(failed, { step: "grid-failed", message: "Your picks couldn't be loaded.", afterPick: true });
  assert.deepEqual(flowReducer(failed, { type: "retry" }), { step: "loading-grid", afterPick: true });
});

test("seeing the grid while saving is ignored", () => {
  const saving = { step: "saving", choice: painting };
  assert.equal(flowReducer(saving, { type: "view-grid" }), saving);
});
