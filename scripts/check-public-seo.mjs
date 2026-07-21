import fs from "node:fs";
import path from "node:path";

import {
  PRIVATE_NOINDEX_ROUTES,
  PUBLIC_ROUTES,
} from "../src/content/decreto20Eleam.js";

const ORIGIN = "https://fichaeleam.cl";
const root = process.cwd();
const dist = path.join(root, "dist");
const errors = [];

function fail(message) {
  errors.push(message);
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function rel(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, "/");
}

function withTrailingSlash(routePath = "/") {
  if (!routePath || routePath === "/") return "/";
  return routePath.endsWith("/") ? routePath : `${routePath}/`;
}

function routeUrl(routePath = "/") {
  return `${ORIGIN}${withTrailingSlash(routePath)}`;
}

function routeFile(routePath = "/") {
  if (routePath === "/") return path.join(dist, "index.html");
  return path.join(dist, routePath.replace(/^\/+|\/+$/g, ""), "index.html");
}

function getAttr(tag, attr) {
  const match = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match?.[1] ?? "";
}

function htmlTags(html, regex) {
  return [...html.matchAll(regex)].map((match) => match[0]);
}

function metaContent(html, key, value) {
  const tags = htmlTags(html, /<meta\b[^>]*>/gi);
  for (const tag of tags) {
    if (getAttr(tag, key) === value) return getAttr(tag, "content");
  }
  return "";
}

function canonicalUrls(html) {
  return htmlTags(html, /<link\b[^>]*rel=["']canonical["'][^>]*>/gi)
    .map((tag) => getAttr(tag, "href"))
    .filter(Boolean);
}

function jsonLdBlocks(html) {
  return [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function sqlString(value = "") {
  return String(value).replace(/''/g, "'");
}

function loadPostSlugs() {
  const filePath = path.join(root, "supabase_blog_seed.sql");
  if (!exists(filePath)) return [];
  const sql = read(filePath);
  const slugs = [];
  const rowRegex = /\(\s*'((?:''|[^'])*)'\s*,\s*'((?:''|[^'])*)'\s*,\s*'((?:''|[^'])*)'\s*,\s*'((?:''|[^'])*)'\s*,\s*'((?:''|[^'])*)'\s*,\s*ARRAY\[([\s\S]*?)\]\s*,\s*(\d+)\s*,\s*'((?:''|[^'])*)'\s*,\s*'([^']+)'\s*,\s*now\(\)\s*-\s*interval\s*'([^']+)'\s*,\s*(true|false)\s*,\s*\$post\$([\s\S]*?)\$post\$\s*\)/g;
  for (const match of sql.matchAll(rowRegex)) {
    if (match[9] === "publicado") slugs.push(sqlString(match[1]));
  }
  return [...new Set(slugs)];
}

function titleText(html) {
  return (html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
}

const seenTitles = new Map();
const seenDescriptions = new Map();

function assertIndexedPage(routePath, html) {
  const expectedCanonical = routeUrl(routePath);
  const canonicals = canonicalUrls(html);
  if (canonicals.length !== 1) {
    fail(`${routePath}: debe tener exactamente un canonical; encontrados ${canonicals.length}.`);
  } else if (canonicals[0] !== expectedCanonical) {
    fail(`${routePath}: canonical esperado ${expectedCanonical}, encontrado ${canonicals[0]}.`);
  }

  const robots = metaContent(html, "name", "robots").toLowerCase();
  if (!robots || robots.includes("noindex")) {
    fail(`${routePath}: robots meta debe permitir indexacion.`);
  }

  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  if (h1Count !== 1) {
    fail(`${routePath}: debe tener exactamente un H1; encontrados ${h1Count}.`);
  }

  const ogUrl = metaContent(html, "property", "og:url");
  if (ogUrl !== expectedCanonical) {
    fail(`${routePath}: og:url debe coincidir con canonical.`);
  }

  if (/Pagina no encontrada|URL no existe/i.test(html)) {
    fail(`${routePath}: parece una pagina 404 o soft 404.`);
  }

  const blocks = jsonLdBlocks(html);
  if (!blocks.length) {
    fail(`${routePath}: falta JSON-LD.`);
  }
  for (const block of blocks) {
    try {
      JSON.parse(block);
    } catch (error) {
      fail(`${routePath}: JSON-LD invalido (${error.message}).`);
    }
  }

  // ── Endurecimiento: sin fugas de interpolacion ───────────────
  if (/\bundefined\b/i.test(html)) {
    fail(`${routePath}: el HTML contiene "undefined" (interpolacion rota).`);
  }
  if (/href=""/.test(html) || /href="undefined"/i.test(html)) {
    fail(`${routePath}: contiene un enlace vacio (href vacio o "undefined").`);
  }
  if (/<p class="article-summary">\s*<\/p>/.test(html)) {
    fail(`${routePath}: el resumen (article-summary) esta vacio.`);
  }

  // ── Titulo: presente, de largo razonable y unico ─────────────
  const title = titleText(html);
  if (!title) {
    fail(`${routePath}: falta <title>.`);
  } else {
    if (title.length > 70) fail(`${routePath}: <title> demasiado largo (${title.length} > 70).`);
    const dupTitle = seenTitles.get(title);
    if (dupTitle) fail(`${routePath}: <title> duplicado con ${dupTitle}.`);
    else seenTitles.set(title, routePath);
  }

  // ── Description: presente, en rango y unica ──────────────────
  const description = metaContent(html, "name", "description").trim();
  if (!description) {
    fail(`${routePath}: falta meta description.`);
  } else {
    if (description.length < 50 || description.length > 165) {
      fail(`${routePath}: meta description fuera de rango (${description.length}, esperado 50-165).`);
    }
    const dupDesc = seenDescriptions.get(description);
    if (dupDesc) fail(`${routePath}: meta description duplicada con ${dupDesc}.`);
    else seenDescriptions.set(description, routePath);
  }

  // ── Imagen social y Twitter card ─────────────────────────────
  const ogImage = metaContent(html, "property", "og:image");
  if (!/^https:\/\//.test(ogImage)) {
    fail(`${routePath}: og:image debe ser una URL absoluta https.`);
  }
  if (!metaContent(html, "name", "twitter:card")) {
    fail(`${routePath}: falta twitter:card.`);
  }
}

function collectFiles(dir, predicate = () => true) {
  if (!exists(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const relative = rel(full);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", "assets"].includes(entry.name)) continue;
      out.push(...collectFiles(full, predicate));
    } else if (predicate(full, relative)) {
      out.push(full);
    }
  }
  return out;
}

function allowedHistoricalRedirect(filePath, line) {
  const relative = rel(filePath);
  const oldSlug = ["blog/ds", "-14-2017-fiscalizacion-seremi-eleam"].join("");
  return (
    (relative === "scripts/generate-public-seo.mjs" || relative === "dist/.htaccess")
    && line.includes(oldSlug)
  );
}

function assertNoDeprecatedNormativeCopy() {
  const patterns = [
    new RegExp(["DS\\s*", "14\\b"].join(""), "i"),
    new RegExp(["14", "\\/2017"].join(""), "i"),
    new RegExp(["decreto\\s+", "14\\b"].join(""), "i"),
    new RegExp(["ds", "-14"].join(""), "i"),
  ];
  const files = [
    path.join(root, "index.html"),
    path.join(root, "supabase_schema.sql"),
    path.join(root, "supabase_blog_seed.sql"),
    ...collectFiles(path.join(root, "src"), (filePath) => /\.(?:js|jsx|ts|tsx|css|html|txt|md)$/.test(filePath)),
    ...collectFiles(path.join(root, "scripts"), (filePath) => /\.mjs$/.test(filePath)),
    ...collectFiles(path.join(root, "public"), (filePath) => /\.(?:html|xml|txt|json|md)$/.test(filePath)),
    ...collectFiles(dist, (filePath) => /\.(?:html|xml|txt|json|htaccess)$/.test(filePath) || path.basename(filePath) === ".htaccess"),
  ];

  for (const filePath of files) {
    if (!exists(filePath)) continue;
    const text = read(filePath);
    const lines = text.split(/\r?\n/);
    for (const pattern of patterns) {
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        if (!pattern.test(line)) continue;
        if (allowedHistoricalRedirect(filePath, line)) continue;
        fail(`${rel(filePath)}:${index + 1}: contiene referencia normativa antigua no permitida.`);
      }
    }
  }
}

if (!exists(dist)) {
  fail("No existe dist. Ejecuta npm run build antes del check SEO.");
}

const postSlugs = loadPostSlugs();
const routePaths = [
  ...PUBLIC_ROUTES.map((route) => route.path),
  ...postSlugs.map((slug) => `/blog/${slug}`),
];

for (const routePath of routePaths) {
  const filePath = routeFile(routePath);
  if (!exists(filePath)) {
    fail(`${routePath}: falta HTML prerenderizado en ${rel(filePath)}.`);
    continue;
  }
  assertIndexedPage(routePath, read(filePath));
}

const requiredFiles = ["robots.txt", "sitemap.xml", "llms.txt", ".htaccess", "404.html"];
for (const file of requiredFiles) {
  if (!exists(path.join(dist, file))) fail(`dist/${file} no existe.`);
}

const sitemapPath = path.join(dist, "sitemap.xml");
if (exists(sitemapPath)) {
  const sitemap = read(sitemapPath);
  const locs = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));
  const expected = new Set(routePaths.map(routeUrl));
  for (const url of expected) {
    if (!locs.has(url)) fail(`sitemap.xml no contiene ${url}.`);
  }
  for (const url of locs) {
    if (!expected.has(url)) fail(`sitemap.xml contiene URL no canonica o no publica: ${url}.`);
  }
  for (const privateRoute of PRIVATE_NOINDEX_ROUTES) {
    if (sitemap.includes(`${ORIGIN}${privateRoute}`)) {
      fail(`sitemap.xml contiene ruta privada ${privateRoute}.`);
    }
  }
}

const indexPath = path.join(dist, "index.html");
if (exists(indexPath)) {
  const indexHtml = read(indexPath);
  const match = indexHtml.match(/var publicPaths = (\[[\s\S]*?\]);/);
  if (!match) {
    fail("dist/index.html no contiene la lista 'var publicPaths' del detector de ruta pública.");
  } else {
    let injected = [];
    try {
      injected = JSON.parse(match[1]);
    } catch {
      fail("dist/index.html: la lista 'var publicPaths' no es JSON válido.");
    }
    const expected = PUBLIC_ROUTES.map((route) => route.path);
    const missing = expected.filter((p) => !injected.includes(p));
    if (missing.length) {
      fail(`dist/index.html: 'var publicPaths' no incluye rutas públicas: ${missing.join(", ")}. El prerender de esas rutas quedaría oculto tras el spinner.`);
    }
  }
}

const robotsPath = path.join(dist, "robots.txt");
if (exists(robotsPath)) {
  const robots = read(robotsPath);
  if (!robots.includes(`Sitemap: ${ORIGIN}/sitemap.xml`)) {
    fail("robots.txt debe declarar el sitemap canonico.");
  }
  for (const privateRoute of PRIVATE_NOINDEX_ROUTES) {
    if (!robots.includes(`Disallow: ${withTrailingSlash(privateRoute)}`)) {
      fail(`robots.txt debe bloquear rastreo de ${privateRoute}.`);
    }
  }
}

const htaccessPath = path.join(dist, ".htaccess");
if (exists(htaccessPath)) {
  const htaccess = read(htaccessPath);
  const oldSlug = ["blog/ds", "-14-2017-fiscalizacion-seremi-eleam"].join("");
  if (!htaccess.includes(oldSlug) || !htaccess.includes("/blog/decreto-20-fiscalizacion-seremi-eleam/")) {
    fail(".htaccess debe redirigir el slug historico hacia el contenido DS 20.");
  }
  if (!/RewriteRule\s+\.\s+-\s+\[R=404,L\]/.test(htaccess)) {
    fail(".htaccess debe devolver 404 real para rutas publicas inexistentes.");
  }
  if (!/X-Robots-Tag\s+"noindex,\s*nofollow"/.test(htaccess)) {
    fail(".htaccess debe emitir X-Robots-Tag noindex para rutas privadas.");
  }
}

const notFoundPath = path.join(dist, "404.html");
if (exists(notFoundPath)) {
  const notFound = read(notFoundPath);
  const robots = metaContent(notFound, "name", "robots").toLowerCase();
  if (!robots.includes("noindex")) fail("404.html debe tener robots noindex.");
}

assertNoDeprecatedNormativeCopy();

console.log("Public SEO audit");
console.log(`- Public routes: ${PUBLIC_ROUTES.length}`);
console.log(`- Blog posts: ${postSlugs.length}`);
console.log(`- Checked URLs: ${routePaths.length}`);

if (errors.length) {
  console.error("\nSEO errors:");
  for (const message of errors) console.error(`- ${message}`);
  process.exit(1);
}

console.log("\nSEO OK.");
