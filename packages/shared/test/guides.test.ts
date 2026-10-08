import { describe, expect, it } from "vitest";
import { GUIDE_KEYS, type Guide } from "../src/guides";
import { en } from "../src/guides/en";
import { es } from "../src/guides/es";
import { ar } from "../src/guides/ar";

// The same guide in every language: same sections, steps and points, so nothing is left out.
const shape = (g: Guide) => g.sections.map((s) => [!!s.text, s.steps?.length ?? 0, s.points?.length ?? 0]);

describe("page guides", () => {
  it("cover every page in English, with no extras", () => {
    expect(Object.keys(en).sort()).toEqual([...GUIDE_KEYS].sort());
  });

  it.each([["Spanish", es], ["Arabic", ar]] as const)("are complete in %s and match the English section for section", (_, book) => {
    expect(Object.keys(book).sort()).toEqual([...GUIDE_KEYS].sort());
    for (const key of GUIDE_KEYS) expect([key, shape(book[key])]).toEqual([key, shape(en[key])]);
  });

  it.each([["English", en], ["Spanish", es], ["Arabic", ar]] as const)("have no empty text in %s", (_, book) => {
    for (const key of GUIDE_KEYS) {
      const g = book[key];
      const texts = [g.title, g.summary, g.who, ...g.sections.flatMap((s) => [s.heading, s.text ?? "x", ...(s.steps ?? []), ...(s.points ?? [])])];
      expect([key, texts.filter((x) => !x.trim())]).toEqual([key, []]);
    }
  });
});
