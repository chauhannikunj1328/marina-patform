import { describe, expect, it } from "vitest";
import { addDays, addMonths, daysBetween, daysInMonth, lastMonths, nightsInMonth } from "../src/date";

describe("dates", () => {
  it("adds days across months, years and daylight-saving changes", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09"); // US clocks change on 8 Mar 2026
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("counts nights between dates, including across daylight saving", () => {
    expect(daysBetween("2026-03-07", "2026-03-10")).toBe(3);
    expect(daysBetween("2026-10-31", "2026-11-02")).toBe(2);
  });

  it("adds months, clamped to the month's last day", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
  });

  it("splits a stay's nights by month", () => {
    expect(nightsInMonth("2026-09-28", "2026-10-03", "2026-09")).toBe(3);
    expect(nightsInMonth("2026-09-28", "2026-10-03", "2026-10")).toBe(2);
    expect(nightsInMonth("2026-09-28", "2026-10-03", "2026-11")).toBe(0);
  });

  it("lists the last months, oldest first", () => {
    expect(lastMonths(3, "2026-02-10")).toEqual(["2025-12", "2026-01", "2026-02"]);
    expect(daysInMonth("2028-02")).toBe(29);
  });
});
