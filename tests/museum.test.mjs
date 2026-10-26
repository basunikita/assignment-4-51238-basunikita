import assert from "node:assert/strict";
import test, { mock } from "node:test";
import {
  AIC_USER_AGENT,
  colorCss,
  distinctRandomPositions,
  fetchFourPaintings,
  fetchMuseumImage,
  imageUrl,
  isMuseumImageId,
  toPainting,
} from "../lib/museum.ts";

// Failures are logged on the server; capture the log so tests can check it and the output stays clean.
const consoleError = mock.method(console, "error", () => {});

const raw = {
  id: 81535,
  title: "Sea View, Calm Weather",
  artist_title: "Édouard Manet",
  artist_display: "Édouard Manet (French, 1832–1883)",
  date_display: "1864",
  image_id: "8be90e71",
  thumbnail: { alt_text: "A work made of oil on canvas." },
  color: { h: 176, l: 46, s: 18, percentage: 0.31, population: 1756 },
};

function fakeMuseum({ total = 668, respond } = {}) {
  const calls = [];
  async function fetchImpl(url, init = {}) {
    const parsed = new URL(String(url));
    calls.push({ url: parsed, headers: new Headers(init.headers) });
    if (respond) return respond(parsed, init);
    if (parsed.searchParams.get("limit") === "0") {
      return Response.json({ pagination: { total }, data: [] });
    }
    const page = Number(parsed.searchParams.get("page"));
    return Response.json({ pagination: { total }, data: [{ ...raw, id: page }] });
  }
  return { calls, fetchImpl };
}

test("an image link points at the app's own image route", () => {
  assert.equal(imageUrl("abc", 200), "/art/abc/200");
});

test("isMuseumImageId accepts the museum's IDs and rejects anything else", () => {
  assert.equal(isMuseumImageId("8be90e71-83c3-3f98-a972-4acb9ce0e773"), true);
  assert.equal(isMuseumImageId("../x"), false);
  assert.equal(isMuseumImageId("a/b"), false);
  assert.equal(isMuseumImageId(""), false);
  assert.equal(isMuseumImageId("x".repeat(101)), false);
  assert.equal(isMuseumImageId(42), false);
});

test("a painting's main color becomes CSS, and a missing one becomes grey", () => {
  assert.equal(colorCss({ h: 176, s: 18, l: 46 }), "hsl(176 18% 46%)");
  assert.equal(colorCss(null), "hsl(0 0% 75%)");
});

test("an artwork becomes a painting", () => {
  assert.deepEqual(toPainting(raw), {
    artworkId: 81535,
    title: "Sea View, Calm Weather",
    artist: "Édouard Manet",
    dateDisplay: "1864",
    imageId: "8be90e71",
    altText: "A work made of oil on canvas.",
    color: { h: 176, s: 18, l: 46 },
  });
});

test("the artist falls back to the first line of artist_display, then Unknown artist", () => {
  const multiLine = { ...raw, artist_title: null, artist_display: "Édouard Manet (French, 1832–1883)\nParis" };
  assert.equal(toPainting(multiLine).artist, "Édouard Manet (French, 1832–1883)");
  assert.equal(toPainting({ ...raw, artist_title: null, artist_display: null }).artist, "Unknown artist");
});

test("missing date, alt text and color become null, and a missing title becomes Untitled", () => {
  const sparse = toPainting({ ...raw, title: null, date_display: null, thumbnail: null, color: null });
  assert.equal(sparse.title, "Untitled");
  assert.equal(sparse.dateDisplay, null);
  assert.equal(sparse.altText, null);
  assert.equal(sparse.color, null);
});

test("color values are rounded to whole numbers", () => {
  assert.deepEqual(toPainting({ ...raw, color: { h: 176.6, s: 18.2, l: 45.5 } }).color, { h: 177, s: 18, l: 46 });
});

test("an artwork without an id or image_id is not a painting", () => {
  assert.equal(toPainting({ ...raw, id: undefined }), null);
  assert.equal(toPainting({ ...raw, image_id: null }), null);
  assert.equal(toPainting(undefined), null);
});

test("four distinct positions, all inside the collection", () => {
  for (let run = 0; run < 200; run++) {
    const positions = distinctRandomPositions(4, 668, Math.random);
    assert.equal(positions.length, 4);
    assert.equal(new Set(positions).size, 4);
    assert.ok(positions.every((p) => Number.isInteger(p) && p >= 1 && p <= 668), String(positions));
  }
});

test("never more positions than paintings", () => {
  assert.deepEqual(distinctRandomPositions(4, 3, Math.random).sort(), [1, 2, 3]);
});

test("positions stay distinct even with a random source stuck at one value", () => {
  const positions = distinctRandomPositions(4, 668, () => 0);
  assert.equal(new Set(positions).size, 4);
});

test("every museum request carries the AIC-User-Agent header", async () => {
  const museum = fakeMuseum();
  await fetchFourPaintings({ fetchImpl: museum.fetchImpl });
  assert.ok(museum.calls.length > 0);
  for (const call of museum.calls) assert.equal(call.headers.get("AIC-User-Agent"), AIC_USER_AGENT);
});

test("asks for the count first, then four different pages of one painting each", async () => {
  const museum = fakeMuseum();
  await fetchFourPaintings({ fetchImpl: museum.fetchImpl });
  assert.equal(museum.calls.length, 5);
  const [count, ...pages] = museum.calls.map((call) => call.url.searchParams);
  assert.equal(count.get("limit"), "0");
  assert.ok(pages.every((params) => params.get("limit") === "1"));
  const pageNumbers = pages.map((params) => Number(params.get("page")));
  assert.equal(new Set(pageNumbers).size, 4);
  assert.ok(pageNumbers.every((n) => n >= 1 && n <= 668));
  assert.match(pages[0].get("fields"), /image_id/);
  assert.match(count.get("params"), /is_public_domain/);
});

test("returns four paintings when the museum answers", async () => {
  const result = await fetchFourPaintings({ fetchImpl: fakeMuseum().fetchImpl });
  assert.equal(result.status, "ok");
  assert.equal(result.paintings.length, 4);
  assert.equal(result.paintings[0].imageId, "8be90e71");
});

test("requests go to the apiBase it is given", async () => {
  const museum = fakeMuseum();
  await fetchFourPaintings({ fetchImpl: museum.fetchImpl, apiBase: "http://localhost:4010/api/v1" });
  assert.ok(museum.calls.every((call) => call.url.href.startsWith("http://localhost:4010/api/v1/artworks/search")));
});

test("fewer than four paintings in the collection is empty", async () => {
  const result = await fetchFourPaintings({ fetchImpl: fakeMuseum({ total: 3 }).fetchImpl });
  assert.deepEqual(result, { status: "empty" });
});

test("a page that comes back without a usable painting is empty", async () => {
  const museum = fakeMuseum({
    respond: (url) =>
      url.searchParams.get("limit") === "0"
        ? Response.json({ pagination: { total: 668 }, data: [] })
        : Response.json({ pagination: { total: 668 }, data: [{ ...raw, image_id: null }] }),
  });
  assert.deepEqual(await fetchFourPaintings({ fetchImpl: museum.fetchImpl }), { status: "empty" });
});

test("a Cloudflare challenge page is unavailable", async () => {
  const museum = fakeMuseum({
    respond: () =>
      new Response("<!DOCTYPE html><title>Just a moment...</title>", {
        status: 403,
        headers: { "content-type": "text/html" },
      }),
  });
  assert.deepEqual(await fetchFourPaintings({ fetchImpl: museum.fetchImpl }), { status: "unavailable" });
});

test("a 200 that isn't JSON is unavailable", async () => {
  const museum = fakeMuseum({ respond: () => new Response("<html>maintenance</html>", { status: 200 }) });
  assert.deepEqual(await fetchFourPaintings({ fetchImpl: museum.fetchImpl }), { status: "unavailable" });
});

test("a network error is unavailable", async () => {
  const museum = fakeMuseum({
    respond: () => {
      throw new TypeError("fetch failed");
    },
  });
  assert.deepEqual(await fetchFourPaintings({ fetchImpl: museum.fetchImpl }), { status: "unavailable" });
});

test("a museum that never answers is unavailable after the timeout", async () => {
  const museum = fakeMuseum({
    respond: (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(init.signal.reason));
      }),
  });
  const result = await fetchFourPaintings({ fetchImpl: museum.fetchImpl, timeoutMs: 50 });
  assert.deepEqual(result, { status: "unavailable" });
});

const IMAGE_ID = "8be90e71-83c3-3f98-a972-4acb9ce0e773";
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

function fakeImageServer(respond = () => new Response(JPEG_BYTES, { headers: { "content-type": "image/jpeg" } })) {
  const calls = [];
  async function fetchImpl(url, init = {}) {
    calls.push({ url: String(url), headers: new Headers(init.headers) });
    return respond(url, init);
  }
  return { calls, fetchImpl };
}

test("an image request asks the museum's image server with the AIC-User-Agent header", async () => {
  const server = fakeImageServer();
  await fetchMuseumImage(IMAGE_ID, "400", { fetchImpl: server.fetchImpl });
  assert.equal(server.calls.length, 1);
  assert.equal(server.calls[0].url, `https://www.artic.edu/iiif/2/${IMAGE_ID}/full/400,/0/default.jpg`);
  assert.equal(server.calls[0].headers.get("AIC-User-Agent"), AIC_USER_AGENT);
});

test("a museum image is passed on with a long-lived cache", async () => {
  const response = await fetchMuseumImage(IMAGE_ID, "200", { fetchImpl: fakeImageServer().fetchImpl });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/jpeg");
  assert.equal(response.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), JPEG_BYTES);
});

test("an image ID that isn't the museum's is refused without asking the museum", async () => {
  const server = fakeImageServer();
  const response = await fetchMuseumImage("..%2F..%2Fsecret", "200", { fetchImpl: server.fetchImpl });
  assert.equal(response.status, 404);
  assert.equal(server.calls.length, 0);
});

test("only the two sizes the app uses are allowed", async () => {
  const server = fakeImageServer();
  const response = await fetchMuseumImage(IMAGE_ID, "843", { fetchImpl: server.fetchImpl });
  assert.equal(response.status, 404);
  assert.equal(server.calls.length, 0);
});

test("a Cloudflare challenge becomes a 502 that isn't cached", async () => {
  const server = fakeImageServer(
    () => new Response("<!DOCTYPE html><title>Just a moment...</title>", { status: 403, headers: { "content-type": "text/html" } }),
  );
  const response = await fetchMuseumImage(IMAGE_ID, "200", { fetchImpl: server.fetchImpl });
  assert.equal(response.status, 502);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("an answer that isn't an image is a 502", async () => {
  const server = fakeImageServer(() => new Response("<html>maintenance</html>", { headers: { "content-type": "text/html" } }));
  assert.equal((await fetchMuseumImage(IMAGE_ID, "200", { fetchImpl: server.fetchImpl })).status, 502);
});

test("a network error on an image is a 502", async () => {
  const server = fakeImageServer(() => {
    throw new TypeError("fetch failed");
  });
  assert.equal((await fetchMuseumImage(IMAGE_ID, "200", { fetchImpl: server.fetchImpl })).status, 502);
});

test("an image server that never answers is a 502 after the timeout", async () => {
  const server = fakeImageServer(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(init.signal.reason));
      }),
  );
  const response = await fetchMuseumImage(IMAGE_ID, "200", { fetchImpl: server.fetchImpl, timeoutMs: 50 });
  assert.equal(response.status, 502);
});

test("a museum failure is logged on the server", async () => {
  consoleError.mock.resetCalls();
  const museum = fakeMuseum({ respond: () => new Response("<!DOCTYPE html>", { status: 403, headers: { "content-type": "text/html" } }) });
  await fetchFourPaintings({ fetchImpl: museum.fetchImpl });
  assert.equal(consoleError.mock.callCount(), 1);
  assert.match(String(consoleError.mock.calls[0].arguments.join(" ")), /fetchFourPaintings.*403/);
});

test("a failed image is logged on the server with its ID", async () => {
  consoleError.mock.resetCalls();
  const server = fakeImageServer(() => new Response("<!DOCTYPE html>", { status: 403, headers: { "content-type": "text/html" } }));
  await fetchMuseumImage(IMAGE_ID, "200", { fetchImpl: server.fetchImpl });
  assert.equal(consoleError.mock.callCount(), 1);
  assert.match(String(consoleError.mock.calls[0].arguments.join(" ")), new RegExp(`fetchMuseumImage.*${IMAGE_ID}.*403`));
});

test("a refused image ID isn't logged as a failure", async () => {
  consoleError.mock.resetCalls();
  await fetchMuseumImage("a/b", "200", { fetchImpl: fakeImageServer().fetchImpl });
  assert.equal(consoleError.mock.callCount(), 0);
});
