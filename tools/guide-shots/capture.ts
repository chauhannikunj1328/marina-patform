// Takes the page guides' screenshots: opens each page in each language, does the steps, draws numbered
// red boxes around the elements a guide section talks about, and saves a WebP.
//
//   npm run shots                       every guide, every language
//   npm run shots -- --only w.bookings  one guide (or a prefix: --only w.)
//   npm run shots -- --lang es          one language
//
// Needs the three dev servers running (see the README) and Google Chrome installed.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "playwright-core";
import sharp from "sharp";
import { addLang, setLang, t, type Lang } from "../../packages/shared/src/i18n";
import { es } from "../../packages/shared/src/i18n/es";
import { ar } from "../../packages/shared/src/i18n/ar";
import { GUIDE_KEYS, type GuideKey } from "../../packages/shared/src/guides/types";
import { guideApp, shotFile, type Shot, type ShotAction, type ShotUser, type Target } from "../../packages/shared/src/guides/shots";
import { SHOTS } from "../../packages/shared/src/guides/specs";

addLang("es", es);
addLang("ar", ar);

const ROOT = join(import.meta.dirname, "../..");
const URL = { web: process.env.WEB_URL ?? "http://localhost:5173", website: process.env.SITE_URL ?? "http://localhost:5174", mobile: process.env.MOBILE_URL ?? "http://localhost:8081" };
/** Where each app's pictures are saved. The phone app's are served by the web app. */
const OUT = { web: "apps/web/public/guides", website: "apps/website/public/guides", mobile: "apps/web/public/guides" };
const VIEWPORT = { web: { width: 1280, height: 800, scale: 1 }, website: { width: 1280, height: 800, scale: 1 }, mobile: { width: 390, height: 844, scale: 2 } };
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
const langs = (arg("lang")?.split(",") ?? ["en", "es", "ar"]) as Lang[];
const only = arg("only");

/** English UI text in the language being captured. */
const tr = (text: string, lang: Lang, vars?: Record<string, string>) => { setLang(lang); return t(text, vars); };

function locate(page: Page, target: Target, lang: Lang): Locator {
  const scope = target.inDialog ? page.getByRole("dialog").last() : page;
  const exact = target.exact ?? true;
  if (target.translateVars && target.vars) target = { ...target, vars: Object.fromEntries(Object.entries(target.vars).map(([k, v]) => [k, tr(v, lang)])) };
  let loc: Locator;
  if (target.css) loc = scope.locator(target.css);
  else if (target.label) loc = scope.getByLabel(tr(target.label, lang, target.vars), { exact });
  else if (target.role) loc = scope.getByRole(target.role, target.name ? { name: tr(target.name, lang, target.vars), exact } : {});
  else if (target.text) loc = scope.getByText(tr(target.text, lang, target.vars), { exact });
  else if (target.placeholder) loc = scope.getByPlaceholder(tr(target.placeholder, lang, target.vars), { exact });
  else throw new Error("Empty target");
  // Only visible elements (the phone app keeps other tabs' screens loaded but hidden).
  loc = loc.filter({ visible: true }).nth(target.nth ?? 0);
  // Box the whole card (web app and website cards) or a parent instead of the element itself.
  if (target.card) loc = loc.locator('xpath=ancestor::*[contains(@class,"rounded-[16px]") or contains(@class,"rounded-[20px]")][1]');
  for (let i = 0; i < (target.up ?? 0); i++) loc = loc.locator("xpath=..");
  return loc;
}

async function act(page: Page, a: ShotAction, lang: Lang) {
  if ("click" in a) await locate(page, a.click, lang).click({ timeout: 8000 });
  else if ("fill" in a) await locate(page, a.fill, lang).fill(a.value, { timeout: 8000 });
  else if ("press" in a) await page.keyboard.press(a.press);
  else if ("scroll" in a) await locate(page, a.scroll, lang).scrollIntoViewIfNeeded({ timeout: 8000 });
  else if ("wait" in a) await page.waitForTimeout(a.wait);
  await page.waitForTimeout(350);
}

/**
 * Runs in the page. Scrolls the boxes' scroll containers so all of them are on screen and not under a
 * sticky header or footer, then returns the (1-based) numbers of any box that still isn't fully visible.
 */
function placeInView(els: Element[]): number[] {
  const vw = innerWidth, vh = innerHeight;
  const MARGIN = 20; // room for the red outline and its number badge
  // Fixed or sticky bars along the top and bottom edges (but not one that holds a box, like the site header's buttons).
  let barTop = 0, barBottom = 0;
  for (const e of document.querySelectorAll("body *")) {
    const pos = getComputedStyle(e).position;
    if (pos !== "fixed" && pos !== "sticky") continue;
    const r = e.getBoundingClientRect();
    if (!r.height || r.height > vh / 3 || r.width < vw / 2 || els.some((b) => e.contains(b))) continue;
    if (r.top <= 4) barTop = Math.max(barTop, r.bottom);
    else if (r.bottom >= vh - 4) barBottom = Math.max(barBottom, vh - r.top);
  }
  const scroller = (el: Element) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 1) return p;
    }
    return document.scrollingElement ?? document.documentElement;
  };
  // Sideways first (wide tables), then up and down: per scroll container, bring all its boxes into view
  // together (centred when they fit, otherwise the first ones at the top).
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.left < 0 || r.right > vw) el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
  }
  const groups = new Map<Element, Element[]>();
  for (const el of els) { const s = scroller(el); groups.set(s, [...(groups.get(s) ?? []), el]); }
  // A scroll container that isn't the whole page (the app's main panel, below its top bar) clips what's shown.
  const area = (s: Element) => {
    const page = s === document.scrollingElement || s === document.documentElement;
    const c = page ? { top: 0, bottom: vh } : s.getBoundingClientRect();
    return { top: Math.max(barTop, c.top), bottom: Math.min(vh - barBottom, c.bottom) };
  };
  for (const [s, group] of groups) {
    const a = area(s), lo = a.top + MARGIN, hi = a.bottom - MARGIN / 2;
    const rs = group.map((g) => g.getBoundingClientRect());
    const uTop = Math.min(...rs.map((r) => r.top)), uBottom = Math.max(...rs.map((r) => r.bottom));
    if (uTop >= lo && uBottom <= hi) continue;
    const room = hi - lo, height = uBottom - uTop;
    const delta = height <= room ? uTop - lo - (room - height) / 2 : uTop - lo;
    s.scrollBy({ top: delta, behavior: "instant" });
  }
  return els.flatMap((el, i) => {
    const r = el.getBoundingClientRect(), a = area(scroller(el));
    const tall = r.height > a.bottom - a.top - MARGIN; // taller than the visible area: its top must show
    const ok = r.top >= a.top - 2 && (tall || r.bottom <= a.bottom + 2) && r.left >= -2 && r.right <= vw + 2;
    return ok ? [] : [i + 1];
  });
}

/** Draws numbered red boxes over the given rectangles. */
async function drawBoxes(page: Page, rects: { x: number; y: number; width: number; height: number }[]) {
  await page.evaluate((rects) => {
    document.getElementById("guide-shot-boxes")?.remove();
    const layer = document.createElement("div");
    layer.id = "guide-shot-boxes";
    Object.assign(layer.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: "2147483647" });
    const rtl = document.documentElement.dir === "rtl";
    rects.forEach((r, i) => {
      const pad = 5;
      const box = document.createElement("div");
      Object.assign(box.style, {
        position: "fixed", left: `${r.x - pad}px`, top: `${r.y - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px`,
        border: "3px solid #E5322D", borderRadius: "10px", boxShadow: "0 0 0 4px rgba(229,50,45,0.18)", boxSizing: "border-box",
      });
      layer.appendChild(box);
      if (rects.length > 1) {
        const badge = document.createElement("div");
        badge.textContent = String(i + 1);
        Object.assign(badge.style, {
          position: "fixed", top: `${Math.max(2, r.y - pad - 13)}px`, [rtl ? "left" : "left"]: rtl ? `${r.x + r.width + pad - 13}px` : `${Math.max(2, r.x - pad - 13)}px`,
          width: "26px", height: "26px", borderRadius: "13px", background: "#E5322D", color: "#fff", font: "700 14px/26px Inter, Arial, sans-serif",
          textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        });
        layer.appendChild(badge);
      }
    });
    document.body.appendChild(layer);
  }, rects);
}

const CREDENTIALS: Record<Exclude<ShotUser, "visitor">, string> = { admin: "admin@marina.com", manager: "manager@marina.com", staff: "staff@marina.com", owner: "owner@marina.com" };

async function signIn(page: Page, app: "web" | "website" | "mobile", who: ShotUser, lang: Lang) {
  if (who === "visitor") return;
  if (app === "web") {
    await page.goto(`${URL.web}/login`);
    await page.getByText(CREDENTIALS[who], { exact: true }).click();
    await page.locator("form button[type=submit]").click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });
  } else if (app === "website") {
    await page.goto(`${URL.website}/sign-in`);
    await page.getByText(CREDENTIALS[who], { exact: true }).click();
    await page.locator("form button[type=submit]").click();
    await page.waitForURL((u) => u.pathname.startsWith("/account"), { timeout: 15000 });
  } else {
    await page.goto(`${URL.mobile}/login`);
    // The demo buttons' labels use the role's name in the app's language, in lower case.
    const role = tr({ admin: "Admin", manager: "Manager", staff: "Staff" }[who as "admin" | "manager" | "staff"], lang).toLowerCase();
    await page.getByRole("button", { name: tr("Use the demo {role} account", lang, { role }), exact: true }).click({ timeout: 10000 });
    await page.getByRole("button", { name: tr("Sign in", lang), exact: true }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
  }
  await page.waitForTimeout(1200);
}

async function newContext(browser: Browser, app: "web" | "website" | "mobile", lang: Lang): Promise<BrowserContext> {
  const v = VIEWPORT[app];
  const context = await browser.newContext({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: v.scale, colorScheme: "light", locale: lang === "ar" ? "ar" : lang === "es" ? "es-ES" : "en-US", hasTouch: app === "mobile" });
  await context.addInitScript(({ lang, app }) => {
    try {
      if (app === "mobile") localStorage.setItem("marina.lang", JSON.stringify(lang));
      else localStorage.setItem("marina.lang", lang);
      localStorage.setItem("mms.theme", "light");
      localStorage.setItem("marina.site.theme", "light");
    } catch { /* storage unavailable */ }
  }, { lang, app });
  return context;
}

async function capture(page: Page, app: "web" | "website" | "mobile", key: GuideKey, index: number, shot: Shot, lang: Lang) {
  await page.goto(`${URL[app]}${shot.path}`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(900);
  // Close anything left open (welcome dialogs, menus).
  for (let i = 0; i < 2; i++) if (await page.getByRole("dialog").count()) { await page.keyboard.press("Escape"); await page.waitForTimeout(250); }
  for (const a of shot.actions ?? []) await act(page, a, lang);
  // Hide the Read button and pop-up messages.
  await page.addStyleTag({ content: `[aria-label="${tr("Read the guide for this page", lang)}"], [aria-live="polite"] { visibility: hidden !important; }` });
  const boxes = await Promise.all(shot.boxes.map((b) => locate(page, b, lang)));
  const handles = [];
  for (const [i, b] of boxes.entries()) {
    const h = await b.elementHandle({ timeout: 8000 }).catch(() => null);
    if (!h) throw new Error(`box ${i + 1} not found: ${JSON.stringify(shot.boxes[i])}`);
    handles.push(h);
  }
  // Scroll so every box is on screen and clear of sticky headers; fail rather than save a picture with a box missing.
  // tsx wraps inner functions in a __name() helper that the page doesn't have.
  await page.evaluate("globalThis.__name ??= (f) => f");
  const offscreen = await page.evaluate(placeInView, handles);
  if (offscreen.length) throw new Error(`box ${offscreen.join(", ")} off screen: ${offscreen.map((n) => JSON.stringify(shot.boxes[n - 1])).join(" ")}`);
  // Let map tiles finish loading so maps aren't grey.
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>("img.leaflet-tile")].every((i) => i.complete), null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(300);
  const rects = [];
  for (const [i, b] of boxes.entries()) {
    const r = await b.boundingBox({ timeout: 8000 });
    if (!r) throw new Error(`box ${i + 1} not visible: ${JSON.stringify(shot.boxes[i])}`);
    rects.push(r);
  }
  await drawBoxes(page, rects);
  const png = await page.screenshot({ type: "png" });
  const file = join(ROOT, OUT[app], shotFile(key, index, lang));
  await mkdir(dirname(file), { recursive: true });
  const img = sharp(png);
  await writeFile(file, await (app === "mobile" ? img.resize({ width: 600 }) : img).webp({ quality: 74 }).toBuffer());
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const keys = GUIDE_KEYS.filter((k) => !only || k === only || k.startsWith(only));
  const failures: string[] = [];
  let done = 0;
  for (const lang of langs) {
    // One signed-in browser per app and user, reused for every picture.
    const pages = new Map<string, Page>();
    for (const key of keys) {
      const app = guideApp(key);
      for (const [index, shot] of (SHOTS[key] ?? []).entries()) {
        if (!shot) continue;
        const id = `${app}:${shot.as}`;
        try {
          let page = pages.get(id);
          if (!page) {
            const context = await newContext(browser, app, lang);
            page = await context.newPage();
            await signIn(page, app, shot.as, lang);
            pages.set(id, page);
          }
          await capture(page, app, key, index, shot, lang);
          done++;
          process.stdout.write(".");
        } catch (e) {
          let seen = "";
          if (process.env.DEBUG) {
            const page = pages.get(id);
            seen = page ? await page.evaluate(() => [...new Set([...document.querySelectorAll("[role=button],button,[role=tab],input,textarea,h1,h2,h3")]
              .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
              .map((e) => (e.getAttribute("aria-label") || e.getAttribute("placeholder") || e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 34)))].join(" | ")).catch(() => "") : "";
          }
          failures.push(`${lang} ${key} #${index}: ${(e as Error).message.split("\n")[0]}${seen ? `\n    seen: ${seen}` : ""}`);
          process.stdout.write("x");
        }
      }
    }
    for (const p of pages.values()) await p.context().close();
  }
  await browser.close();
  console.log(`\n${done} pictures saved.`);
  if (failures.length) {
    console.log(`${failures.length} failed:\n${failures.join("\n")}`);
    process.exitCode = 1;
  }
}

void main();
