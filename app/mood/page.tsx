import { auth } from "@clerk/nextjs/server";
import { fetchFourPaintings } from "@/lib/museum";
import MoodFlow from "./MoodFlow";

// Reading the session makes this page render per request, so every visit,
// including a refresh, draws four new paintings.
export default async function MoodPage() {
  await auth.protect();
  const draw = await fetchFourPaintings();
  return <MoodFlow draw={draw} />;
}
