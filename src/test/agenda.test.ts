import { describe, it, expect } from "vitest";
import { slotsFor } from "@/lib/agenda";

const free = (d: number, busy = [] as { start_min: number; duration_min: number }[]) =>
  slotsFor(d, busy).filter((s) => s.free).map((s) => s.start);

describe("agenda", () => {
  it("has 24 twenty-minute slots Mon-Fri 9-13 and 14-18", () => {
    expect(slotsFor(20, []).length).toBe(24);
    expect(free(20)[0]).toBe(540);
    expect(free(20)).not.toContain(780);
  });
  it("a booked slot can't be booked again", () => {
    expect(free(20, [{ start_min: 600, duration_min: 20 }])).not.toContain(600);
  });
  it("a 60-min fitting must fit before lunch or closing", () => {
    expect(free(60)).not.toContain(740);
    expect(free(60)).toContain(720);
    expect(free(60)).not.toContain(1040);
  });
  it("a 40-min booking blocks the following slot", () => {
    expect(free(20, [{ start_min: 600, duration_min: 40 }])).not.toContain(620);
  });
});
