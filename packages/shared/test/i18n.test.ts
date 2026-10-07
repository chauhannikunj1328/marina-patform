import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadLang, setLang, t, tn, tx } from "../src/i18n";
import { es } from "../src/i18n/es";
import { ar } from "../src/i18n/ar";

afterEach(() => setLang("en"));

describe("t / tn / tx", () => {
  it("fills placeholders in English", () => {
    expect(t("Berth {code}", { code: "A-04" })).toBe("Berth A-04");
    expect(t("task|Open")).toBe("Open"); // the part before | only tells translations apart
  });

  it("translates once the language is loaded, and falls back to English", async () => {
    await loadLang("es");
    setLang("es");
    expect(t("{name} updated", { name: "A-04" })).toBe("Se actualizó A-04");
    expect(t("Text nobody translated")).toBe("Text nobody translated");
  });

  it("picks Arabic plural forms", async () => {
    await loadLang("ar");
    setLang("ar");
    expect(tn(1, "{n} marina", "{n} marinas")).toBe("مارينا واحدة");
    expect(tn(2, "{n} marina", "{n} marinas")).toBe("مارينتان");
    expect(tn(3, "{n} marina", "{n} marinas")).toBe("3 مارينات");
  });

  it("translates finished activity-log sentences by matching phrases", async () => {
    await loadLang("es");
    setLang("es");
    expect(tx("BK-0417 cancelled")).toBe("BK-0417 cancelada");
    expect(tx("Something only said in English")).toBe("Something only said in English");
  });
});

// ---- Every phrase used in the apps has a Spanish and Arabic translation -------------------------
const ROOT = join(import.meta.dirname, "../../..");
const SOURCES = ["apps/web/src", "apps/mobile/src", "packages/shared/src"];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f: string) => {
    const p = join(dir, f);
    if (f === "node_modules" || f === "i18n") return [];
    if (statSync(p).isDirectory()) return files(p);
    return /\.tsx?$/.test(f) ? [p] : [];
  });
}

/** Phrases passed to t(), tr() or tn() in the app code. tn() needs either its singular or plural form. */
function phrases() {
  const single = new Map<string, string>();
  const plural: { one: string; other: string; file: string }[] = [];
  const str = (s: string) => JSON.parse(`"${s}"`) as string;
  for (const f of SOURCES.flatMap((d) => files(join(ROOT, d)))) {
    const src = readFileSync(f, "utf8");
    const rel = f.slice(ROOT.length + 1);
    for (const m of src.matchAll(/\b(?:t|tr)\(\s*"((?:[^"\\]|\\.)*)"/g)) if (/[A-Za-z]{2}/.test(str(m[1]))) single.set(str(m[1]), rel);
    for (const m of src.matchAll(/\btn\([^,]+,\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"/g)) plural.push({ one: str(m[1]), other: str(m[2]), file: rel });
  }
  return { single, plural };
}

describe.each([["Spanish", es], ["Arabic", ar]] as const)("%s translations", (_, table) => {
  const { single, plural } = phrases();

  it("cover every phrase in the apps", () => {
    const missing = [...single].filter(([k]) => table[k] === undefined).map(([k, f]) => `${k}  (${f})`);
    missing.push(...plural.filter((p) => table[p.other] === undefined && table[p.one] === undefined).map((p) => `${p.other}  (${p.file})`));
    expect(missing).toEqual([]);
  });

  it("keep the same {placeholders} as the English", () => {
    const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
    const wrong = Object.entries(table).flatMap(([key, entry]) => {
      const english = key.slice(key.indexOf("|") + 1);
      const forms = typeof entry === "string" ? [entry] : Object.values(entry);
      // Plural forms may leave out {n} (e.g. Arabic "one" and "two" spell the number out).
      const want = vars(english).split(",").filter((v) => v && v !== "n");
      return forms.filter((f) => want.some((v) => !vars(f!).split(",").includes(v))).map((f) => `${key} → ${f}`);
    });
    expect(wrong).toEqual([]);
  });
});
