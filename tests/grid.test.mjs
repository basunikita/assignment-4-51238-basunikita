import assert from "node:assert/strict";
import test from "node:test";
import { gridShape } from "../lib/grid.ts";

test("40 picks make 7 across by 6 down at 46px", () => {
  assert.deepEqual(gridShape(40), { columns: 7, rows: 6, tilePx: 46 });
});

test("150 picks make 13 by 12 at 23px", () => {
  assert.deepEqual(gridShape(150), { columns: 13, rows: 12, tilePx: 23 });
});

test("50 picks make 8 by 7 at 39px", () => {
  assert.deepEqual(gridShape(50), { columns: 8, rows: 7, tilePx: 39 });
});

test("one pick fills the box", () => {
  assert.deepEqual(gridShape(1), { columns: 1, rows: 1, tilePx: 340 });
});

test("no picks, no grid", () => {
  assert.deepEqual(gridShape(0), { columns: 0, rows: 0, tilePx: 0 });
});

test("a different box and gap are respected", () => {
  assert.deepEqual(gridShape(4, 100, 4), { columns: 2, rows: 2, tilePx: 48 });
});
