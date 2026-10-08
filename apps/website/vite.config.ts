import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createSeed } from "../../packages/shared/src/index";
import { headTags, publicPages, type PageMeta } from "./src/lib/seo";

const shared = fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url));

/** The site's public address: SITE_URL, or the production domain Vercel sets while building. */
const SITE_URL = process.env.SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");

/**
 * After the build: one HTML file per public page with its own title, description, canonical URL,
 * link-preview tags and structured data (crawlers and link previews don't run the app's
 * JavaScript), plus robots.txt, sitemap.xml and a 404 page that isn't indexed.
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
      const page = (m: PageMeta) => strip(shell).replace("</head>", `    ${headTags(m, SITE_URL)}\n  </head>`);
      const db = createSeed();
      const pages = publicPages(db, SITE_URL);
      for (const m of pages) {
        const file = m.path === "/" ? join(outDir, "index.html") : join(outDir, m.path.slice(1), "index.html");
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, page(m));
      }
      writeFileSync(join(outDir, "404.html"), page({ title: "Page not found · Marina", description: "We couldn't find that page.", path: "/404", noindex: true }));
      writeFileSync(join(outDir, "robots.txt"), [
        "User-agent: *",
        "Allow: /",
        "Disallow: /account",
        "Disallow: /book/checkout",
        "Disallow: /sign-in",
        "Disallow: /register",
        "Disallow: /forgot-password",
        ...(SITE_URL ? ["", `Sitemap: ${SITE_URL}/sitemap.xml`] : []),
        "",
      ].join("\n"));
      if (SITE_URL) {
        const day = new Date().toISOString().slice(0, 10);
        writeFileSync(join(outDir, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((m) => `  <url><loc>${SITE_URL}${m.path === "/" ? "/" : m.path}</loc><lastmod>${day}</lastmod></url>`).join("\n")}\n</urlset>\n`);
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
