import { describe, expect, it } from "vitest";
import { areaForPath, DEFAULT_PERMISSIONS, levelFor } from "../src/permissions";

describe("permissions", () => {
  it("gives admins full access everywhere", () => {
    expect(levelFor(DEFAULT_PERMISSIONS, "admin", "billing")).toBe("full");
  });

  it("limits managers to their marinas and staff by area", () => {
    expect(levelFor(DEFAULT_PERMISSIONS, "manager", "marinas")).toBe("own");
    expect(levelFor(DEFAULT_PERMISSIONS, "staff", "reports")).toBe("none");
    expect(levelFor(DEFAULT_PERMISSIONS, "staff", "marinas")).toBe("view");
  });

  it("gives nobody access when signed out", () => {
    expect(levelFor(DEFAULT_PERMISSIONS, undefined, "marinas")).toBe("none");
  });

  it("maps pages to areas", () => {
    expect(areaForPath("/marinas")).toBe("marinas");
    expect(areaForPath("/marinas/m-gg")).toBe("marinas");
    expect(areaForPath("/marinas-archive")).toBeUndefined();
  });
});
