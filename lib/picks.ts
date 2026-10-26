import { isMuseumImageId, type Painting } from "./museum.ts";

export type SavedPick = Painting & { id: number; pickedAt: string };

export type PickRow = {
  id: number;
  artwork_id: number;
  title: string;
  artist: string;
  date_display: string | null;
  image_id: string;
  alt_text: string | null;
  color_h: number | null;
  color_s: number | null;
  color_l: number | null;
  picked_at: string;
};

export const PICK_COLUMNS =
  "id, artwork_id, title, artist, date_display, image_id, alt_text, color_h, color_s, color_l, picked_at";

const MAX_TEXT_LENGTH = 1000;

export function fromRow(row: PickRow): SavedPick {
  const hasColor = row.color_h !== null && row.color_s !== null && row.color_l !== null;
  return {
    id: row.id,
    artworkId: row.artwork_id,
    title: row.title,
    artist: row.artist,
    dateDisplay: row.date_display,
    imageId: row.image_id,
    altText: row.alt_text,
    color: hasColor ? { h: row.color_h as number, s: row.color_s as number, l: row.color_l as number } : null,
    pickedAt: row.picked_at,
  };
}

// Builds the row from named fields only, so a stray user_id or id on the
// input can never reach the insert; user_id comes from the session token.
export function toInsert(painting: Painting): Omit<PickRow, "id" | "picked_at"> {
  return {
    artwork_id: painting.artworkId,
    title: painting.title,
    artist: painting.artist,
    date_display: painting.dateDisplay,
    image_id: painting.imageId,
    alt_text: painting.altText,
    color_h: painting.color?.h ?? null,
    color_s: painting.color?.s ?? null,
    color_l: painting.color?.l ?? null,
  };
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_TEXT_LENGTH;
}

function isOptionalText(value: unknown): boolean {
  return value === null || isText(value);
}

function isColor(value: unknown): boolean {
  if (value === null) return true;
  if (typeof value !== "object") return false;
  const { h, s, l } = value as Record<string, unknown>;
  return [h, s, l].every((part) => Number.isInteger(part));
}

// The pick arrives from the browser, so every field is checked before it
// goes near the database.
export function isPainting(value: unknown): value is Painting {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    Number.isInteger(p.artworkId) &&
    isText(p.title) &&
    isText(p.artist) &&
    isOptionalText(p.dateDisplay) &&
    isMuseumImageId(p.imageId) &&
    isOptionalText(p.altText) &&
    isColor(p.color)
  );
}
