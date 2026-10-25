import type { Painting } from "./museum.ts";
import type { SavedPick } from "./picks.ts";

export type FlowState =
  | { step: "picking" }
  | { step: "saving"; choice: Painting }
  | { step: "save-failed"; choice: Painting; message: string }
  | { step: "loading-grid"; afterPick: boolean }
  | { step: "grid-failed"; message: string; afterPick: boolean }
  | { step: "history"; picks: SavedPick[]; newestIsNew: boolean };

export type FlowAction =
  | { type: "pick"; painting: Painting }
  | { type: "saved" }
  | { type: "view-grid" }
  | { type: "picks-loaded"; picks: SavedPick[] }
  | { type: "failed"; message: string }
  | { type: "retry" };

// Anything not handled here returns the same state object, which is what
// makes a double-click or a late event harmless.
export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (state.step) {
    case "picking":
      if (action.type === "pick") return { step: "saving", choice: action.painting };
      if (action.type === "view-grid") return { step: "loading-grid", afterPick: false };
      return state;
    case "saving":
      if (action.type === "saved") return { step: "loading-grid", afterPick: true };
      if (action.type === "failed") return { step: "save-failed", choice: state.choice, message: action.message };
      return state;
    case "save-failed":
      return action.type === "retry" ? { step: "saving", choice: state.choice } : state;
    case "loading-grid":
      if (action.type === "picks-loaded") return { step: "history", picks: action.picks, newestIsNew: state.afterPick };
      if (action.type === "failed") return { step: "grid-failed", message: action.message, afterPick: state.afterPick };
      return state;
    case "grid-failed":
      return action.type === "retry" ? { step: "loading-grid", afterPick: state.afterPick } : state;
    case "history":
      return state;
  }
}
