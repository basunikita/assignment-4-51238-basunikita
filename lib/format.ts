const NARROW_NO_BREAK_SPACE = / /g;

export function formatPickedAt(iso: string, timeZone?: string): string {
  const when = new Date(iso);
  const date = when.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  });
  const time = when.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone });
  return `Picked ${date} · ${time}`.replace(NARROW_NO_BREAK_SPACE, " ");
}
