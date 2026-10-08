import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { addLang, createSeed, isRtl, LANGS, setLang, type Lang } from "../../packages/shared/src/index";
import { es } from "../../packages/shared/src/i18n/es";
import { ar } from "../../packages/shared/src/i18n/ar";
import { headTags, publicPages, withLang, type PageMeta } from "./src/lib/seo";

addLang("es", es);
addLang("ar", ar);

const shared = fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url));

/** The site's public address: SITE_URL, or the production domain Vercel sets while building. */
const SITE_URL = process.env.SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");

/** Pages that need an account or are part of booking: not crawled, in any language. */
const PRIVATE = ["/account", "/book/checkout", "/sign-in", "/register", "/forgot-password"];

/**
 * After the build: one HTML file per public page and language (/marinas, /es/marinas,
 * /ar/marinas) with its own title, description, canonical URL, language alternates, link-preview
 * tags and structured data (crawlers and link previews don't run the app's JavaScript), plus
 * robots.txt, sitemap.xml and a 404 page that isn't indexed.
 */
function seoPages(): Plugin {
  let outDir = "dist";
  return {
    name: "marina-seo-pages",
    apply: "build",
    configResolved(c) {
      outDir = c.build.outDir;
    },
    closeBundle() {
      const shell = readFileSync(join(outDir, "index.html"), "utf8");
      const strip = (html: string) => html
        .replace(/\s*<title>[\s\S]*?<\/title>/, "")
        .replace(/\s*<meta (name|property)="(description|robots|og:[a-z:_]+|twitter:[a-z]+)"[^>]*>/g, "")
        .replace(/\s*<link rel="canonical"[^>]*>/g, "");
      const page = (m: PageMeta, l: Lang) => strip(shell)
        .replace(/<html lang="[^"]*"[^>]*>/, `<html lang="${l}" dir="${isRtl(l) ? "rtl" : "ltr"}">`)
        .replace("</head>", `    ${headTags(m, SITE_URL)}\n  </head>`);
      const db = createSeed();
      const byLang = new Map<Lang, PageMeta[]>();
      for (const { code: l } of LANGS) {
        setLang(l);
        const pages = publicPages(db, SITE_URL);
        byLang.set(l, pages);
        for (const m of pages) {
          const path = withLang(m.path, l);
          const file = path === "/" ? join(outDir, "index.html") : join(outDir, path.slice(1), "index.html");
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, page(m, l));
        }
      }
      setLang("en");
      writeFileSync(join(outDir, "404.html"), page({ title: "Page not found · Marina", description: "We couldn't find that page.", path: "/404", noindex: true }, "en"));
      writeFileSync(join(outDir, "robots.txt"), [
        "User-agent: *",
        "Allow: /",
        ...LANGS.flatMap((l) => PRIVATE.map((p) => `Disallow: ${withLang(p, l.code)}`)),
        ...(SITE_URL ? ["", `Sitemap: ${SITE_URL}/sitemap.xml`] : []),
        "",
      ].join("\n"));
      if (SITE_URL) {
        // Every page in every language, each listing its translations (hreflang) for search engines.
        const day = new Date().toISOString().slice(0, 10);
        const url = (path: string) => `${SITE_URL}${path}`;
        const entries = LANGS.flatMap(({ code: l }) => byLang.get(l)!.map((m) => [
          `  <url>`,
          `    <loc>${url(withLang(m.path, l))}</loc>`,
          `    <lastmod>${day}</lastmod>`,
          ...LANGS.map((x) => `    <xhtml:link rel="alternate" hreflang="${x.code}" href="${url(withLang(m.path, x.code))}" />`),
          `    <xhtml:link rel="alternate" hreflang="x-default" href="${url(m.path)}" />`,
          `  </url>`,
        ].join("\n")));
        writeFileSync(join(outDir, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join("\n")}\n</urlset>\n`);
      } else {
        this.warn("SITE_URL isn't set, so there's no sitemap.xml and no canonical URLs. Set SITE_URL (Vercel sets it automatically).");
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), seoPages()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@marina/shared": shared,
    },
  },
  // The shared package lives outside this app's folder.
  // PORT is set when a tool picks the port (e.g. the preview runner); otherwise Vite's default.
  server: { port: process.env.PORT ? Number(process.env.PORT) : undefined, fs: { allow: ["../.."] } },
});
