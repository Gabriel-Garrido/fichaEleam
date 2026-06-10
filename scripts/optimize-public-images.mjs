/**
 * One-time asset optimizer for the public site.
 *
 * - Logos: trims transparent padding, resizes, exports crisp WebP (with alpha).
 * - Dashboards: downscales to a sane max width and exports WebP (~70-80% smaller
 *   than the source PNGs).
 *
 * Output goes to src/assets/images/opt/ so the bundler (Vite) hashes and serves
 * them. The PNGs in public/marketing/ are kept untouched for OG/social previews
 * (publicSrc), which some scrapers still prefer over WebP.
 *
 * Run: node scripts/optimize-public-images.mjs
 */
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { existsSync, mkdirSync, statSync } from "node:fs";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = join(ROOT, "src/assets/images/opt");

mkdirSync(OUT_DIR, { recursive: true });

const firstExisting = (...candidates) => {
  for (const c of candidates) {
    const p = join(ROOT, c);
    if (existsSync(p)) return p;
  }
  throw new Error(`No source found among: ${candidates.join(", ")}`);
};

const DASHBOARDS = [
  {
    out: "hero.webp",
    source: firstExisting(
      "public/marketing/fichaeleam-hero-demo-soporte.png",
      "src/assets/images/fichaeleam-hero.png",
    ),
  },
  {
    out: "software.webp",
    source: firstExisting(
      "public/marketing/software-eleam-dashboard-signos-residente.png",
      "src/assets/images/software-eleam-dashboard-signos-residente.png",
    ),
  },
  {
    out: "comparison.webp",
    source: firstExisting(
      "src/assets/images/excel-papel-vs-fichaeleam-dashboard.png",
      "public/marketing/excel-papel-vs-fichaeleam-dashboard.png",
    ),
  },
  {
    out: "shift.webp",
    source: firstExisting(
      "src/assets/images/entrega-turno-equipo-clinico-dashboard.png",
      "public/marketing/entrega-turno-equipo-clinico-dashboard.png",
    ),
  },
];

const LOGOS = [
  { out: "logo-horizontal.webp", source: "src/assets/images/logos/fichaeleam-logo-horizontal-color.png", height: 132, trim: true },
  { out: "logo-horizontal-teal.webp", source: "src/assets/images/logos/fichaeleam-logo-horizontal-teal.png", height: 132, trim: true },
  { out: "logo-wordmark.webp", source: "src/assets/images/logos/fichaeleam-wordmark-color.png", height: 96, trim: true },
  { out: "logo-symbol.webp", source: "src/assets/images/logos/fichaeleam-logo-symbol-color.png", height: 192, trim: true },
  { out: "app-icon.webp", source: "src/assets/images/logos/fichaeleam-app-icon-color.png", height: 160, trim: false },
];

const kb = (p) => `${Math.round(statSync(p).size / 1024)} KB`;

async function buildDashboards() {
  for (const { out, source } of DASHBOARDS) {
    const dest = join(OUT_DIR, out);
    await sharp(source)
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 80, effort: 5 })
      .toFile(dest);
    console.log(`dashboard ${out.padEnd(18)} ${kb(source).padStart(8)} -> ${kb(dest)}`);
  }
}

async function buildLogos() {
  for (const { out, source, height, trim } of LOGOS) {
    const src = join(ROOT, source);
    const dest = join(OUT_DIR, out);
    let pipe = sharp(src);
    if (trim) pipe = pipe.trim({ threshold: 12 });
    await pipe
      .resize({ height, withoutEnlargement: true })
      .webp({ quality: 92, effort: 6, alphaQuality: 100 })
      .toFile(dest);
    console.log(`logo      ${out.padEnd(18)} ${kb(src).padStart(8)} -> ${kb(dest)}`);
  }
}

await buildDashboards();
await buildLogos();
console.log(`\nDone. Optimized assets in ${OUT_DIR}`);
