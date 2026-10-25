import { useEffect, useRef, useState } from "react";
import { formatPickedAt } from "@/lib/format";
import { GRID_GAP_PX, gridShape } from "@/lib/grid";
import { colorCss, imageUrl } from "@/lib/museum";
import type { SavedPick } from "@/lib/picks";

type Active = { pick: SavedPick; anchor: DOMRect };

const CARD_WIDTH = 240;
const CARD_HEIGHT_ESTIMATE = 300;
const CARD_GAP = 12;
const EDGE = 8;

function cardPosition(anchor: DOMRect): { left: number; top: number } {
  const { innerWidth: width, innerHeight: height } = window;
  const besideTop = Math.max(EDGE, Math.min(anchor.top - 20, height - CARD_HEIGHT_ESTIMATE - EDGE));
  if (anchor.right + CARD_GAP + CARD_WIDTH <= width - EDGE) return { left: anchor.right + CARD_GAP, top: besideTop };
  if (anchor.left - CARD_GAP - CARD_WIDTH >= EDGE) return { left: anchor.left - CARD_GAP - CARD_WIDTH, top: besideTop };
  // Too narrow for either side, as on a phone: centre it above or below the square.
  const below = anchor.bottom + CARD_GAP;
  const top = below + CARD_HEIGHT_ESTIMATE <= height - EDGE ? below : Math.max(EDGE, anchor.top - CARD_GAP - CARD_HEIGHT_ESTIMATE);
  return { left: Math.max(EDGE, (width - CARD_WIDTH) / 2), top };
}

function PickCard({ pick, anchor }: Active) {
  return (
    <div
      role="tooltip"
      style={{ ...cardPosition(anchor), width: CARD_WIDTH }}
      className="pointer-events-none fixed z-50 rounded-xl border border-zinc-200 bg-white p-2.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="h-44 w-full overflow-hidden rounded-md" style={{ backgroundColor: colorCss(pick.color) }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- the museum's image server blocks the Next.js optimizer */}
        <img
          src={imageUrl(pick.imageId, 400)}
          alt={pick.altText ?? ""}
          className="h-full w-full object-contain"
          onError={(event) => {
            event.currentTarget.style.visibility = "hidden";
          }}
        />
      </div>
      <p className="mt-2 line-clamp-3 text-sm font-semibold leading-snug">{pick.title}</p>
      <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
        {pick.artist}
        {pick.dateDisplay ? `, ${pick.dateDisplay}` : ""}
      </p>
      <p className="mt-1.5 text-xs">{formatPickedAt(pick.pickedAt)}</p>
    </div>
  );
}

export default function HistoryGrid({ picks, newestIsNew }: { picks: SavedPick[]; newestIsNew: boolean }) {
  const [active, setActive] = useState<Active | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // A tap elsewhere or a scroll closes the card; on touch screens there is no mouse to leave the grid.
  useEffect(() => {
    if (!active) return;
    const closeIfOutside = (event: PointerEvent) => {
      if (!gridRef.current?.contains(event.target as Node)) setActive(null);
    };
    const close = () => setActive(null);
    document.addEventListener("pointerdown", closeIfOutside);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", closeIfOutside);
      window.removeEventListener("scroll", close, true);
    };
  }, [active]);

  if (picks.length === 0) {
    return <p className="pt-12 text-center text-zinc-600 dark:text-zinc-400">No picks yet.</p>;
  }

  const { columns, tilePx } = gridShape(picks.length);
  const show = (pick: SavedPick, element: HTMLElement) => setActive({ pick, anchor: element.getBoundingClientRect() });

  return (
    <section className="flex flex-col items-center gap-5 pt-6">
      <h1 className="text-center text-2xl font-semibold tracking-tight">
        {newestIsNew ? "Saved. Here's every mood so far." : "Every mood so far"}
      </h1>
      <div
        ref={gridRef}
        className="grid w-fit"
        style={{ gridTemplateColumns: `repeat(${columns}, ${tilePx}px)`, gridAutoRows: `${tilePx}px`, gap: GRID_GAP_PX }}
        onMouseLeave={() => setActive(null)}
      >
        {picks.map((pick, index) => {
          const isNewest = newestIsNew && index === picks.length - 1;
          return (
            <button
              key={pick.id}
              type="button"
              data-pick-id={pick.id}
              aria-label={pick.title}
              style={{ backgroundColor: colorCss(pick.color) }}
              onMouseEnter={(event) => show(pick, event.currentTarget)}
              onFocus={(event) => show(pick, event.currentTarget)}
              onBlur={() => setActive(null)}
              onClick={(event) => show(pick, event.currentTarget)}
              className={`overflow-hidden rounded-[3px] transition-transform hover:z-10 hover:scale-110 focus-visible:z-10 focus-visible:scale-110 focus-visible:outline-none ${
                isNewest ? "ring-2 ring-zinc-900 ring-offset-1 dark:ring-zinc-100 dark:ring-offset-zinc-950" : ""
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- the museum's image server blocks the Next.js optimizer */}
              <img
                src={imageUrl(pick.imageId, 200)}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.visibility = "hidden";
                }}
              />
            </button>
          );
        })}
      </div>
      {active && <PickCard pick={active.pick} anchor={active.anchor} />}
    </section>
  );
}
