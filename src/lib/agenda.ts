export const BLOCKS: [number, number][] = [
  [9 * 60, 13 * 60],
  [14 * 60, 18 * 60],
];
export const STEP = 20;

export type Busy = { start_min: number; duration_min: number };

export function fmt(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function isWorkday(d: Date) {
  const w = d.getDay();
  return w >= 1 && w <= 5;
}

export function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** All 20-min slots of the day, each marked free if a service of `duration` fits there. */
export function slotsFor(duration: number, busy: Busy[], minStart = 0) {
  const out: { start: number; free: boolean }[] = [];
  for (const [a, b] of BLOCKS) {
    for (let s = a; s < b; s += STEP) {
      const e = s + duration;
      const overlap = busy.some((x) => x.start_min < e && s < x.start_min + x.duration_min);
      out.push({ start: s, free: e <= b && !overlap && s >= minStart });
    }
  }
  return out;
}
