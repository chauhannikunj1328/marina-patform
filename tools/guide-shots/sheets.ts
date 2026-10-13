// Review aid: combines the guide screenshots into labelled contact sheets (guide, section number and
// heading on each tile), so they can be checked against the guide text quickly.
//   npx tsx sheets.ts --lang en --app web --out /tmp/sheets
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { GUIDE_KEYS } from "../../packages/shared/src/guides/types";
import { guideApp, shotFile } from "../../packages/shared/src/guides/shots";
import { SHOTS } from "../../packages/shared/src/guides/specs";
import { en } from "../../packages/shared/src/guides/en";
import type { Lang } from "../../packages/shared/src/i18n";

const ROOT = join(import.meta.dirname, "../..");
const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const lang = (arg("lang") ?? "en") as Lang;
const app = arg("app") ?? "web";
const out = arg("out") ?? "/tmp/guide-sheets";
const mobile = app === "mobile";
const tileW = mobile ? 300 : 760;
const cols = mobile ? 4 : 2;
const rows = mobile ? 2 : 3;
const capH = 44;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function main() {
  await mkdir(out, { recursive: true });
  const tiles: { file: string; label: string }[] = [];
  for (const key of GUIDE_KEYS) {
    if (guideApp(key) !== app) continue;
    (SHOTS[key] ?? []).forEach((shot, i) => {
      if (!shot) return;
      const dir = app === "website" ? "apps/website/public/guides" : "apps/web/public/guides";
      tiles.push({ file: join(ROOT, dir, shotFile(key, i, lang)), label: `${key} #${i + 1} · ${en[key].sections[i].heading}` });
    });
  }
  const per = cols * rows;
  for (let s = 0; s * per < tiles.length; s++) {
    const group = tiles.slice(s * per, s * per + per);
    const parts = await Promise.all(group.map(async (t) => {
      const img = existsSync(t.file) ? await sharp(t.file).resize({ width: tileW }).png().toBuffer() : await sharp({ create: { width: tileW, height: 200, channels: 3, background: "#fee" } }).png().toBuffer();
      const meta = await sharp(img).metadata();
      const cap = Buffer.from(`<svg width="${tileW}" height="${capH}"><rect width="100%" height="100%" fill="#17191e"/><text x="8" y="28" font-family="Arial" font-size="${mobile ? 13 : 18}" fill="#fff">${esc(t.label)}</text></svg>`);
      return { img, h: meta.height ?? 200, cap };
    }));
    const tileH = Math.max(...parts.map((p) => p.h)) + capH;
    const sheet = sharp({ create: { width: cols * tileW + (cols - 1) * 8, height: Math.ceil(parts.length / cols) * (tileH + 8), channels: 3, background: "#888" } });
    const comps = parts.flatMap((p, i) => {
      const x = (i % cols) * (tileW + 8), y = Math.floor(i / cols) * (tileH + 8);
      return [{ input: p.cap, left: x, top: y }, { input: p.img, left: x, top: y + capH }];
    });
    await sheet.composite(comps).webp({ quality: 80 }).toFile(join(out, `${lang}-${app}-${String(s + 1).padStart(2, "0")}.webp`));
  }
  console.log(`${tiles.length} pictures on ${Math.ceil(tiles.length / per)} sheets in ${out}`);
}

void main();
