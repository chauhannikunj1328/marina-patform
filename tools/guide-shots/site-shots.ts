// Takes the product screenshots the public website shows (Home's hero, feature tabs, account and
// app cards, "How it works"): the website's search results and owner account, the dock office's web
// app, and the Marina Berths app, in every language. Saved to apps/website/public/shots/.
//
//   npm run site-shots                 every picture, every language
//   npm run site-shots -- --lang es    one language
//
// Needs the website, web app and customer app dev servers running (see the README) and Google Chrome.
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type Browser, type Page } from "playwright-core";
import sharp from "sharp";
import { addLang, setLang, t, type Lang } from "../../packages/shared/src/i18n";
import { addDays, today } from "../../packages/shared/src/date";
import { es } from "../../packages/shared/src/i18n/es";
import { ar } from "../../packages/shared/src/i18n/ar";

addLang("es", es);
addLang("ar", ar);

const ROOT = join(import.meta.dirname, "../..");
const OUT = join(ROOT, "apps/website/public/shots");
const URL = {
  website: process.env.SITE_URL ?? "http://localhost:5174",
  web: process.env.WEB_URL ?? "http://localhost:5173",
  customer: process.env.CUSTOMER_URL ?? "http://localhost:8082",
};
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
const langs = (arg("lang")?.split(",") ?? ["en", "es", "ar"]) as Lang[];
const tr = (text: string, lang: Lang) => { setLang(lang); return t(text); };
/** The website's address for a page in a language: /es/account. */
const site = (path: string, lang: Lang) => `${URL.website}${lang === "en" ? "" : `/${lang}`}${path}`;

const start = addDays(today(), 14), end = addDays(today(), 17);

type App = "website" | "web" | "customer";
const VIEW: Record<App, { width: number; height: number; out: number }> = {
  website: { width: 1280, height: 800, out: 1600 },
  web: { width: 1280, height: 800, out: 1600 },
  customer: { width: 390, height: 844, out: 600 },
};

async function context(browser: Browser, app: App, lang: Lang) {
  const v = VIEW[app];
  const c = await browser.newContext({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: 2, colorScheme: "light", locale: lang === "ar" ? "ar" : lang === "es" ? "es-ES" : "en-US", hasTouch: app === "customer" });
  await c.addInitScript(({ lang, json }) => {
    try {
      localStorage.setItem("marina.site.theme", "light");
      localStorage.setItem("mms.theme", "light");
      localStorage.setItem("marina.theme", JSON.stringify("light"));
      // The website and web app keep the language as plain text, the phone app as JSON.
      localStorage.setItem("marina.lang", json ? JSON.stringify(lang) : lang);
    } catch { /* storage unavailable */ }
  }, { lang, json: app === "customer" });
  return c;
}

async function settle(page: Page, lang: Lang) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1200);
  // No Read button, pop-up messages or caret in the pictures.
  await page.addStyleTag({ content: `[aria-label="${tr("Read the guide for this page", lang)}"], [aria-live="polite"] { visibility: hidden !important; } * { caret-color: transparent !important; }` });
}

async function save(page: Page, app: App, name: string, lang: Lang) {
  await settle(page, lang);
  const png = await page.screenshot();
  const webp = await sharp(png).resize({ width: VIEW[app].out }).webp({ quality: 80 }).toBuffer();
  await writeFile(join(OUT, `${name}-${lang}.webp`), webp);
  console.log(`  ${name}-${lang}.webp`);
}

async function website(browser: Browser, lang: Lang) {
  const c = await context(browser, "website", lang);
  const page = await c.newPage();
  await page.goto(site(`/book?start=${start}&end=${end}&length=34`, lang));
  await save(page, "website", "web-results", lang);
  // Sign in as the demo owner (the sign-in page fills it in during development).
  await page.goto(site("/sign-in", lang));
  await page.getByText("owner@marina.com", { exact: true }).click();
  await page.locator("form button[type=submit]").click();
  await page.waitForURL((u) => u.pathname.includes("/account"), { timeout: 15000 });
  await page.goto(site("/account", lang));
  await save(page, "website", "web-account", lang);
  await page.goto(site("/account/invoices", lang));
  await page.waitForTimeout(800);
  await page.locator("main a[href*='/account/invoices/']").first().click();
  await save(page, "website", "web-invoice", lang);
  await page.goto(site("/account/contracts", lang));
  await save(page, "website", "web-contracts", lang);
  await c.close();
}

async function office(browser: Browser, lang: Lang) {
  const c = await context(browser, "web", lang);
  const page = await c.newPage();
  await page.goto(`${URL.web}/login`);
  await page.getByText("admin@marina.com", { exact: true }).click();
  await page.locator("form button[type=submit]").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });
  await page.goto(`${URL.web}/bookings?status=pending`);
  // Close a welcome dialog if one opens.
  for (let i = 0; i < 2; i++) if (await page.getByRole("dialog").count()) { await page.keyboard.press("Escape"); await page.waitForTimeout(250); }
  // Show the list of requests: scroll the tabs above it to the top.
  await page.waitForTimeout(800);
  await page.getByRole("tablist").first().evaluate((el) => el.scrollIntoView({ block: "start" }));
  await save(page, "web", "office-requests", lang);
  await c.close();
}

async function customer(browser: Browser, lang: Lang) {
  const c = await context(browser, "customer", lang);
  const page = await c.newPage();
  await page.goto(`${URL.customer}/results?start=${start}&end=${end}&length=34`);
  await save(page, "customer", "app-book", lang);
  await page.goto(`${URL.customer}/sign-in`);
  await page.waitForTimeout(1500);
  await page.getByLabel(tr("Use the demo boat owner account", lang), { exact: true }).click({ timeout: 10000 });
  await page.getByRole("button", { name: tr("Sign in", lang), exact: true }).click();
  // Signing in goes back to the previous screen; opened directly there isn't one, so carry on from here.
  await page.waitForTimeout(2000);
  await page.goto(`${URL.customer}/invoices`);
  await page.waitForTimeout(1500);
  await page.getByText(/INV-\d+/).first().click();
  await page.waitForFunction(() => location.pathname.startsWith("/invoice/"), undefined, { timeout: 10000 });
  await save(page, "customer", "app-invoice", lang);
  await c.close();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME });
  try {
    for (const lang of langs) {
      console.log(lang);
      await website(browser, lang);
      await office(browser, lang);
      await customer(browser, lang);
    }
  } finally {
    await browser.close();
  }
}

await main();
