export type Painting = {
  artworkId: number;
  title: string;
  artist: string;
  dateDisplay: string | null;
  imageId: string;
  altText: string | null;
  color: { h: number; s: number; l: number } | null;
};

export type FourPaintings =
  | { status: "ok"; paintings: Painting[] }
  | { status: "empty" }
  | { status: "unavailable" };

export const PAINTINGS_PER_OPEN = 4;
export const MUSEUM_API = "https://api.artic.edu/api/v1";
// The museum's Cloudflare rules block requests that don't carry this header.
export const AIC_USER_AGENT = "Mood Tracker (MPCS 51238 class project)";

const IIIF_BASE = "https://www.artic.edu/iiif/2";
const PAINTING_QUERY = {
  bool: {
    filter: [
      { term: { is_public_domain: true } },
      { exists: { field: "image_id" } },
      { terms: { "classification_title.keyword": ["painting"] } },
    ],
  },
};
const PAINTING_FIELDS = "id,title,artist_title,artist_display,date_display,image_id,thumbnail,color";

type SearchBody = { pagination?: { total?: unknown }; data?: unknown[] };

const MUSEUM_IMAGE_ID = /^[A-Za-z0-9-]{1,100}$/;
const IMAGE_WIDTHS = ["200", "400"];
const ONE_YEAR_SECONDS = 31536000;

export function isMuseumImageId(value: unknown): value is string {
  return typeof value === "string" && MUSEUM_IMAGE_ID.test(value);
}

// Images come through the app's own /art route: the museum's image server
// challenges any request without the AIC-User-Agent header, and a browser's
// <img> can neither add the header nor pass the challenge.
export function imageUrl(imageId: string, width: 200 | 400): string {
  return `/art/${imageId}/${width}`;
}

export async function fetchMuseumImage(
  imageId: string,
  width: string,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<Response> {
  const { fetchImpl = fetch, timeoutMs = 8000 } = options;
  if (!isMuseumImageId(imageId) || !IMAGE_WIDTHS.includes(width)) return new Response(null, { status: 404 });

  const unavailable = () => new Response(null, { status: 502, headers: { "Cache-Control": "no-store" } });
  try {
    const upstream = await fetchImpl(`${IIIF_BASE}/${imageId}/full/${width},/0/default.jpg`, {
      headers: { "AIC-User-Agent": AIC_USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !contentType.startsWith("image/")) return unavailable();
    // A museum image at a given ID and size never changes, so browsers and Vercel can keep it.
    return new Response(upstream.body, {
      headers: { "Content-Type": contentType, "Cache-Control": `public, max-age=${ONE_YEAR_SECONDS}, immutable` },
    });
  } catch {
    return unavailable();
  }
}

export function colorCss(color: Painting["color"]): string {
  return color ? `hsl(${color.h} ${color.s}% ${color.l}%)` : "hsl(0 0% 75%)";
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export function toPainting(raw: unknown): Painting | null {
  if (typeof raw !== "object" || raw === null) return null;
  const artwork = raw as Record<string, unknown>;
  const imageId = nonEmptyString(artwork.image_id);
  if (typeof artwork.id !== "number" || imageId === null) return null;

  const firstDisplayLine = nonEmptyString(artwork.artist_display)?.split("\n")[0].trim() || null;
  const thumbnail = artwork.thumbnail as { alt_text?: unknown } | null | undefined;
  const color = artwork.color as { h?: unknown; s?: unknown; l?: unknown } | null | undefined;
  const hasColor =
    typeof color?.h === "number" && typeof color.s === "number" && typeof color.l === "number";

  return {
    artworkId: artwork.id,
    title: nonEmptyString(artwork.title) ?? "Untitled",
    artist: nonEmptyString(artwork.artist_title) ?? firstDisplayLine ?? "Unknown artist",
    dateDisplay: nonEmptyString(artwork.date_display),
    imageId,
    altText: nonEmptyString(thumbnail?.alt_text),
    color: hasColor
      ? { h: Math.round(color.h as number), s: Math.round(color.s as number), l: Math.round(color.l as number) }
      : null,
  };
}

// Floyd's sampling: exactly `count` draws, distinct 1-based positions, and it
// always finishes, even with a poor random source.
export function distinctRandomPositions(count: number, total: number, random: () => number): number[] {
  const wanted = Math.min(count, Math.max(0, total));
  const chosen = new Set<number>();
  for (let upper = total - wanted + 1; upper <= total; upper++) {
    const candidate = 1 + Math.floor(random() * upper);
    chosen.add(chosen.has(candidate) ? upper : candidate);
  }
  return [...chosen];
}

async function searchPaintings(
  fetchImpl: typeof fetch,
  apiBase: string,
  params: Record<string, string>,
  signal: AbortSignal,
): Promise<SearchBody> {
  const url = new URL(`${apiBase}/artworks/search`);
  url.searchParams.set("params", JSON.stringify({ query: PAINTING_QUERY }));
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const response = await fetchImpl(url, {
    headers: { "AIC-User-Agent": AIC_USER_AGENT },
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`The museum answered ${response.status}`);
  return (await response.json()) as SearchBody;
}

// The museum's random_score ignores its seed, so instead this counts the
// paintings and fetches four random positions, one painting per page.
export async function fetchFourPaintings(
  options: { fetchImpl?: typeof fetch; random?: () => number; timeoutMs?: number; apiBase?: string } = {},
): Promise<FourPaintings> {
  const {
    fetchImpl = fetch,
    random = Math.random,
    timeoutMs = 8000,
    apiBase = process.env.MUSEUM_API_BASE ?? MUSEUM_API,
  } = options;
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const count = await searchPaintings(fetchImpl, apiBase, { limit: "0" }, signal);
    const total = count.pagination?.total;
    if (typeof total !== "number" || total < PAINTINGS_PER_OPEN) return { status: "empty" };

    const positions = distinctRandomPositions(PAINTINGS_PER_OPEN, total, random);
    const pages = await Promise.all(
      positions.map((page) =>
        searchPaintings(fetchImpl, apiBase, { limit: "1", page: String(page), fields: PAINTING_FIELDS }, signal),
      ),
    );
    const paintings = pages
      .map((body) => toPainting(body.data?.[0]))
      .filter((painting): painting is Painting => painting !== null);
    return paintings.length === PAINTINGS_PER_OPEN ? { status: "ok", paintings } : { status: "empty" };
  } catch {
    return { status: "unavailable" };
  }
}
