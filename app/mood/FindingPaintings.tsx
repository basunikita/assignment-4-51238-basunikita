import { PAINTINGS_PER_OPEN } from "@/lib/museum";

export default function FindingPaintings() {
  return (
    <section aria-busy="true" className="flex w-full max-w-[476px] flex-col items-center gap-2 pt-6">
      <h1 className="text-center text-2xl font-semibold tracking-tight">How are you feeling right now?</h1>
      <p role="status" className="mb-4 text-center text-zinc-600 dark:text-zinc-400">
        Finding four paintings…
      </p>
      <div className="grid w-full grid-cols-2 gap-3">
        {Array.from({ length: PAINTINGS_PER_OPEN }, (_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>
    </section>
  );
}
