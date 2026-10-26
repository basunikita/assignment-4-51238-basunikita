"use server";

import { auth } from "@clerk/nextjs/server";
import type { Painting } from "@/lib/museum";
import { fromRow, isPainting, PICK_COLUMNS, toInsert, type PickRow, type SavedPick } from "@/lib/picks";
import { createServerSupabase } from "@/lib/supabase-server";

export type SaveResult = { ok: true } | { ok: false; message: string };
export type PicksResult = { ok: true; picks: SavedPick[] } | { ok: false; message: string };

export async function savePick(choice: Painting): Promise<SaveResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, message: "Your session ended. Sign in again to save your pick." };
  if (!isPainting(choice)) return { ok: false, message: "Your pick couldn't be saved." };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("picks").insert(toInsert(choice));
  if (error) {
    console.error("savePick: insert failed:", error.code, error.message);
    return { ok: false, message: "Your pick couldn't be saved." };
  }
  return { ok: true };
}

export async function loadPicks(): Promise<PicksResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, message: "Your session ended. Sign in again to see your picks." };

  const supabase = await createServerSupabase();
  // No user_id filter on purpose: row-level security returns only this
  // person's rows, and the Playwright privacy test depends on that.
  const { data, error } = await supabase
    .from("picks")
    .select(PICK_COLUMNS)
    .order("picked_at", { ascending: true })
    .order("id", { ascending: true })
    .returns<PickRow[]>();
  if (error || !data) {
    console.error("loadPicks: select failed:", error?.code, error?.message);
    return { ok: false, message: "Your picks couldn't be loaded." };
  }
  return { ok: true, picks: data.map(fromRow) };
}
