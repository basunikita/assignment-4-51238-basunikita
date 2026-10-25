export const GRID_BOX_PX = 340;
export const GRID_GAP_PX = 3;

// As close to a square as possible, in a box that stays the same size:
// squares shrink as picks add up.
export function gridShape(
  count: number,
  boxPx: number = GRID_BOX_PX,
  gapPx: number = GRID_GAP_PX,
): { columns: number; rows: number; tilePx: number } {
  if (count <= 0) return { columns: 0, rows: 0, tilePx: 0 };
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const tilePx = Math.floor((boxPx - gapPx * (columns - 1)) / columns);
  return { columns, rows, tilePx };
}
