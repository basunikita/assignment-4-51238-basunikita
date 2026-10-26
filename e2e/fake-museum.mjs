// A stand-in for the Art Institute's search API, so the privacy test depends
// on Clerk and Supabase only. It answers the two requests lib/museum.ts makes:
// the count (limit=0) and one painting per page (limit=1&page=n).
import { createServer } from "node:http";

const PORT = Number(process.env.FAKE_MUSEUM_PORT ?? 4010);
const TOTAL = 50;

function painting(page) {
  return {
    id: 900000 + page,
    title: `Test painting ${page}`,
    artist_title: "Test Artist",
    artist_display: "Test Artist",
    date_display: "2026",
    image_id: `00000000-0000-0000-0000-${String(page).padStart(12, "0")}`,
    thumbnail: { alt_text: "A test painting." },
    color: { h: (page * 37) % 360, s: 40, l: 50 },
  };
}

createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://localhost:${PORT}`);
  if (url.pathname !== "/api/v1/artworks/search") {
    response.writeHead(404).end();
    return;
  }
  const page = Number(url.searchParams.get("page"));
  const data = url.searchParams.get("limit") === "0" ? [] : [painting(page)];
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({ pagination: { total: TOTAL }, data }));
}).listen(PORT, () => console.log(`fake museum on http://localhost:${PORT}`));
