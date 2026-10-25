import { colorCss, imageUrl, type FourPaintings, type Painting } from "@/lib/museum";
import type { FlowState } from "@/lib/mood-flow";
import FindingPaintings from "./FindingPaintings";

type PickState = Extract<FlowState, { step: "picking" | "saving" | "save-failed" }>;

const NOTHING_FOUND = "The museum didn't send back enough paintings.";
const MUSEUM_DOWN = "The museum's collection isn't answering right now.";

const primaryButton =
  "rounded-full bg-zinc-900 px-5 py-2.5 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300";
const secondaryButton =
  "rounded-full border border-zinc-300 px-5 py-2.5 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800";

export default function PickScreen({
  draw,
  state,
  refreshing,
  onPick,
  onRetrySave,
  onTryAgain,
  onViewGrid,
}: {
  draw: FourPaintings;
  state: PickState;
  refreshing: boolean;
  onPick: (painting: Painting) => void;
  onRetrySave: () => void;
  onTryAgain: () => void;
  onViewGrid: () => void;
}) {
  if (refreshing) return <FindingPaintings />;

  if (draw.status !== "ok") {
    return (
      <section className="flex w-full max-w-[476px] flex-col items-center gap-4 pt-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">How are you feeling right now?</h1>
        <p role="alert" className="text-zinc-600 dark:text-zinc-400">
          {draw.status === "empty" ? NOTHING_FOUND : MUSEUM_DOWN}
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={onTryAgain} className={primaryButton}>
            Try again
          </button>
          <button type="button" onClick={onViewGrid} className={secondaryButton}>
            See your grid
          </button>
        </div>
      </section>
    );
  }

  const chosen = state.step === "picking" ? null : state.choice;
  return (
    <section className="flex w-full max-w-[476px] flex-col items-center gap-2 pt-6">
      <h1 className="text-center text-2xl font-semibold tracking-tight">How are you feeling right now?</h1>
      <p className="mb-4 text-center text-zinc-600 dark:text-zinc-400">Pick the painting closest to your mood.</p>
      <div className="grid w-full grid-cols-2 gap-3">
        {draw.paintings.map((painting, index) => {
          const emphasis = chosen === null ? "" : chosen === painting ? "border-zinc-900 dark:border-zinc-100" : "opacity-40";
          return (
            <button
              key={painting.artworkId}
              type="button"
              aria-label={`Painting ${index + 1} of ${draw.paintings.length}`}
              disabled={state.step !== "picking"}
              onClick={() => onPick(painting)}
              style={{ backgroundColor: colorCss(painting.color) }}
              className={`aspect-square overflow-hidden rounded-lg border-2 border-transparent transition enabled:hover:-translate-y-0.5 enabled:hover:border-zinc-900 enabled:hover:shadow-lg focus-visible:border-zinc-900 focus-visible:outline-none dark:enabled:hover:border-zinc-100 ${emphasis}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- the museum's image server blocks the Next.js optimizer */}
              <img
                src={imageUrl(painting.imageId, 400)}
                alt={painting.altText ?? ""}
                className="h-full w-full object-contain"
                onError={(event) => {
                  event.currentTarget.style.visibility = "hidden";
                }}
              />
            </button>
          );
        })}
      </div>
      {state.step === "saving" && (
        <p role="status" className="mt-3 text-zinc-600 dark:text-zinc-400">
          Saving…
        </p>
      )}
      {state.step === "save-failed" && (
        <div role="alert" className="mt-3 flex flex-col items-center gap-3 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">{state.message}</p>
          <button type="button" onClick={onRetrySave} className={primaryButton}>
            Try again
          </button>
        </div>
      )}
    </section>
  );
}
