import assert from "node:assert/strict";
import test from "node:test";
import { redirectsSignedOutVisitors } from "../lib/routes.ts";

test("opening /mood signed out goes to sign-in", () => {
  assert.equal(redirectsSignedOutVisitors("/mood", false), true);
  assert.equal(redirectsSignedOutVisitors("/mood/anything", false), true);
});

test("a server action posted to /mood answers for itself instead of redirecting", () => {
  assert.equal(redirectsSignedOutVisitors("/mood", true), false);
});

test("other pages don't redirect", () => {
  assert.equal(redirectsSignedOutVisitors("/", false), false);
  assert.equal(redirectsSignedOutVisitors("/moody", false), false);
  assert.equal(redirectsSignedOutVisitors("/sign-in", false), false);
});
