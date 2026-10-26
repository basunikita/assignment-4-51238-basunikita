"use client";

import { UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useReducer, useRef, useTransition } from "react";
import { flowReducer } from "@/lib/mood-flow";
import type { FourPaintings, Painting } from "@/lib/museum";
import { loadPicks, savePick } from "./actions";
import HistoryGrid from "./HistoryGrid";
import PickScreen from "./PickScreen";

export default function MoodFlow({ draw }: { draw: FourPaintings }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(flowReducer, { step: "picking" });
  const [refreshing, startRefresh] = useTransition();
  // The reducer already ignores a second click; this keeps it from reaching the server too.
  const busy = useRef(false);

  async function load() {
    try {
      const result = await loadPicks();
      dispatch(result.ok ? { type: "picks-loaded", picks: result.picks } : { type: "failed", message: result.message });
    } catch {
      dispatch({ type: "failed", message: "Your picks couldn't be loaded." });
    }
  }

  async function save(choice: Painting) {
    try {
      const result = await savePick(choice);
      if (!result.ok) {
        dispatch({ type: "failed", message: result.message });
        return;
      }
    } catch {
      dispatch({ type: "failed", message: "Your pick couldn't be saved." });
      return;
    }
    dispatch({ type: "saved" });
    await load();
  }

  async function once(start: () => void, work: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    start();
    try {
      await work();
    } finally {
      busy.current = false;
    }
  }

  let content;
  if (state.step === "history") {
    content = <HistoryGrid picks={state.picks} newestIsNew={state.newestIsNew} />;
  } else if (state.step === "loading-grid") {
    content = (
      <p role="status" className="pt-12 text-zinc-600 dark:text-zinc-400">
        Loading your picks…
      </p>
    );
  } else if (state.step === "grid-failed") {
    content = (
      <div role="alert" className="flex flex-col items-center gap-3 pt-12 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">{state.message}</p>
        <button
          type="button"
          onClick={() => once(() => dispatch({ type: "retry" }), load)}
          className="rounded-full bg-zinc-900 px-5 py-2.5 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Try again
        </button>
      </div>
    );
  } else {
    content = (
      <PickScreen
        draw={draw}
        state={state}
        refreshing={refreshing}
        onPick={(painting) => {
          if (state.step === "picking") once(() => dispatch({ type: "pick", painting }), () => save(painting));
        }}
        onRetrySave={() => {
          if (state.step === "save-failed") {
            const { choice } = state;
            once(() => dispatch({ type: "retry" }), () => save(choice));
          }
        }}
        onTryAgain={() => startRefresh(() => router.refresh())}
        onViewGrid={() => once(() => dispatch({ type: "view-grid" }), load)}
      />
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-[72px] items-center justify-end px-4">
        <UserButton />
      </header>
      <div className="flex flex-1 flex-col items-center px-4 pb-12">{content}</div>
    </main>
  );
}
