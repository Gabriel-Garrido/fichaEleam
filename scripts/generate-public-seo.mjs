import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createOgImage } from "./create-og-image.mjs";
import { PUBLIC_PLAN_CATALOG, formatPlanPrice } from "../src/features/payment/planCatalog.js";
import {
  DECRETO20_AMBITOS,
  DECRETO20_COPY,
  DECRETO20_FAQ,
  DECRETO20_META,
  DECRETO20_REQUISITOS,
  PRIVATE_NOINDEX_ROUTES,
  PUBLIC_ROUTES,
} from "../src/content/decreto20Eleam.js";
import { DOTACION_META, DOTACION_REGLAS, calcularDotacion } from "../src/content/dotacionRules.js";

const ORIGIN = "https://fichaeleam.cl";
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = join(ROOT, "dist");
const PUBLIC = join(ROOT, "public");
const TEMPLATE_PATH = join(DIST, "index.html");
const OG_PUBLIC = join(PUBLIC, "og-image.png");
const OG_DIST = join(DIST, "og-image.png");
const MARKETING_IMAGES = {
  home: "/marketing/fichaeleam-hero-demo-soporte.png",
  software: "/marketing/software-eleam-dashboard-signos-residente.png",
  seremi: "/marketing/excel-papel-vs-fichaeleam-dashboard.png",
  shift: "/marketing/entrega-turno-equipo-clinico-dashboard.png",
  logo: "/marketing/fichaeleam-app-icon-color.png",
};

const BASE_TITLE = "FichaEleam · Software para ELEAM en Chile";
const BASE_DESCRIPTION =
  "FichaEleam digitaliza la gestión clínica, documental y operativa de ELEAM en Chile: fichas, signos vitales, observaciones, Carpeta SEREMI DS 20 y portal familiar.";

function absoluteUrl(value = "") {
  if (!value) return `${ORIGIN}${MARKETING_IMAGES.home}`;
  return String(value).startsWith("http") ? String(value) : `${ORIGIN}${value}`;
}

// El host sirve cada ruta como directorio (dist/<ruta>/index.html), por lo que
// la URL real lleva slash final. Canonical, og:url, sitemap, JSON-LD y enlaces
// internos deben usar esa misma forma para no chocar con el redireccion 301 de
// Apache (DirectorySlash) y evitar "Rastreada: actualmente sin indexar".
function withTrailingSlash(path = "/") {
  if (!path || path === "/") return "/";
  return path.endsWith("/") ? path : `${path}/`;
}

function routeUrl(path = "/") {
  return `${ORIGIN}${withTrailingSlash(path)}`;
}

function withInternalSlashes(html = "") {
  return html.replace(/href="(\/[^"#?]*)"/g, (match, path) => {
    if (path === "/" || path.endsWith("/")) return match;
    if (path.startsWith("//")) return match;
    if (/\.[a-z0-9]+$/i.test(path)) return match;
    return `href="${path}/"`;
  });
}

function postImage(post) {
  if (post?.cover_url) return absoluteUrl(post.cover_url);
  const text = `${post?.titulo ?? ""} ${(post?.keywords ?? []).join(" ")}`.toLowerCase();
  if (text.includes("seremi") || text.includes("decreto 20") || text.includes("ds 20") || text.includes("fiscal")) {
    return absoluteUrl(MARKETING_IMAGES.seremi);
  }
  if (text.includes("signo") || text.includes("clin") || text.includes("residente")) {
    return absoluteUrl(MARKETING_IMAGES.software);
  }
  return absoluteUrl(MARKETING_IMAGES.shift);
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeXml(value = "") {
  return escapeHtml(value).replace(/&apos;/g, "&#39;");
}

function sqlString(value = "") {
  return String(value).replace(/''/g, "'");
}

function parseKeywords(raw = "") {
  return [...raw.matchAll(/'((?:''|[^'])*)'/g)].map((m) => sqlString(m[1]));
}

function parseIntervalDate(interval = "") {
  const days = Number(interval.match(/(\d+)\s+days?/i)?.[1] ?? 0);
  const date = new Date(Date.now() - days * 86400000);
  return date.toISOString();
}

function loadBlogPosts() {
  const files = ["supabase_blog_seed.sql"];
  const posts = [];
  const postRe = /\(\s*'((?:''|[^'])*)'\s*,\s*'((?:''|[^'])*)'\s*,\s*'((?:''|[^'])*)'\s*,\s*'((?:''|[^'])*)'\s*,\s*'((?:''|[^'])*)'\s*,\s*ARRAY\[([\s\S]*?)\]\s*,\s*(\d+)\s*,\s*'((?:''|[^'])*)'\s*,\s*'([^']+)'\s*,\s*now\(\)\s*-\s*interval\s*'([^']+)'\s*,\s*(true|false)\s*,\s*\$post\$([\s\S]*?)\$post\$\s*\)/g;

  for (const file of files) {
    const path = join(ROOT, file);
    if (!existsSync(path)) continue;
    const sql = readFileSync(path, "utf8");
    for (const match of sql.matchAll(postRe)) {
      const [, slug, titulo, resumen, metaTitle, metaDescription, keywords, minutes, author, estado, interval, destacado, markdown] = match;
      if (estado !== "publicado") continue;
      posts.push({
        slug: sqlString(slug),
        titulo: sqlString(titulo),
        resumen: sqlString(resumen),
        meta_title: sqlString(metaTitle),
        meta_description: sqlString(metaDescription),
        keywords: parseKeywords(keywords),
        tiempo_lectura_min: Number(minutes),
        autor_nombre: sqlString(author),
        publicado_en: parseIntervalDate(interval),
        destacado: destacado === "true",
        contenido_md: markdown.trim(),
      });
    }
  }

  const bySlug = new Map();
  for (const post of posts) bySlug.set(post.slug, post);
  return [...bySlug.values()].sort((a, b) => new Date(b.publicado_en) - new Date(a.publicado_en));
}

function safeUrl(raw = "") {
  const value = String(raw).trim();
  if (!value || /[\u0000-\u001f\u007f]/.test(value)) return null;
  if (value.startsWith("#")) return value;
  if (value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")) return value;
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

function renderInline(text = "") {
  let html = escapeHtml(text);
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    const href = safeUrl(url);
    if (!href) return escapeHtml(alt);
    return `<img src="${escapeHtml(href)}" alt="${escapeHtml(alt)}" loading="lazy">`;
  });
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const href = safeUrl(url);
    if (!href) return escapeHtml(label);
    return `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  return html;
}

function markdownToHtml(markdown = "") {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let inList = false;
  let inOrderedList = false;

  function closeLists() {
    if (inList) out.push("</ul>");
    if (inOrderedList) out.push("</ol>");
    inList = false;
    inOrderedList = false;
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeLists();
      continue;
    }
    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      closeLists();
      const level = Math.min(heading[1].length, 4);
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }
    if (line.startsWith("> ")) {
      closeLists();
      out.push(`<blockquote>${renderInline(line.slice(2))}</blockquote>`);
      continue;
    }
    if (line.startsWith("- ")) {
      if (!inList) {
        closeLists();
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${renderInline(line.slice(2))}</li>`);
      continue;
    }
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      if (!inOrderedList) {
        closeLists();
        out.push("<ol>");
        inOrderedList = true;
      }
      out.push(`<li>${renderInline(ordered[1])}</li>`);
      continue;
    }
    closeLists();
    out.push(`<p>${renderInline(line)}</p>`);
  }
  closeLists();
  return out.join("\n");
}

function stripMarkdown(markdown = "") {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(markdown = "") {
  const text = stripMarkdown(markdown);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

const SECTION_RULES = [
  [/(seremi|ds\s?20|decreto\s?20|fiscaliz|acredita|checklist)/i, "Acreditación SEREMI"],
  [/(signo|cl[ií]nic|barthel|geri[áa]tr|enfermer)/i, "Clínica geriátrica"],
  [/(medicament|kardex|psicotr|emar)/i, "Medicamentos"],
  [/(dato|19\.?628|privacidad|protecci[óo]n de dato)/i, "Protección de datos"],
  [/(famili|20\.?584|comunica)/i, "Familias y derechos"],
  [/(turno|registro|trazabil|ca[íi]da|incidente)/i, "Operación diaria"],
];

function articleSection(post) {
  const haystack = `${post.titulo} ${(post.keywords ?? []).join(" ")}`;
  for (const [re, label] of SECTION_RULES) {
    if (re.test(haystack)) return label;
  }
  return "Gestión de ELEAM";
}

function relatedPosts(post, posts, limit = 3) {
  const keys = new Set((post.keywords ?? []).map((k) => k.toLowerCase()));
  return posts
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({
      p,
      shared: (p.keywords ?? []).filter((k) => keys.has(k.toLowerCase())).length,
    }))
    .sort((a, b) => b.shared - a.shared || new Date(b.p.publicado_en) - new Date(a.p.publicado_en))
    .slice(0, limit)
    .map((s) => s.p);
}

function formatLongDate(iso = "") {
  try {
    return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

function upsertTag(html, regex, tag) {
  if (regex.test(html)) return html.replace(regex, tag);
  return html.replace("</head>", `    ${tag}\n  </head>`);
}

function setMeta(html, name, content) {
  const tag = `<meta name="${name}" content="${escapeHtml(content)}" />`;
  return upsertTag(html, new RegExp(`<meta\\s+name="${name}"[\\s\\S]*?\\/?>`, "i"), tag);
}

function setProperty(html, property, content) {
  const tag = `<meta property="${property}" content="${escapeHtml(content)}" />`;
  return upsertTag(html, new RegExp(`<meta\\s+property="${property}"[\\s\\S]*?\\/?>`, "i"), tag);
}

function setCanonical(html, url) {
  const tag = `<link rel="canonical" href="${escapeHtml(url)}" />`;
  return upsertTag(html, /<link\s+rel="canonical"[\s\S]*?\/?>/i, tag);
}

function jsonLdScript(jsonLd) {
  return `<script type="application/ld+json" data-prerender-jsonld>${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`;
}

function renderPage(template, { path, title, description, type = "website", jsonLd, rootHtml, image = MARKETING_IMAGES.home, imageAlt, article, noIndex = false }) {
  const url = routeUrl(path);
  const ogImage = absoluteUrl(image);
  let html = template.replace(/\s*<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi, "\n");
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = setMeta(html, "description", description);
  html = setMeta(html, "keywords", "ELEAM, ficha clínica ELEAM, fiscalización SEREMI, Decreto N°20, Carpeta SEREMI DS 20, software ELEAM Chile");
  html = setMeta(html, "robots", noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
  html = setCanonical(html, url);
  html = setProperty(html, "og:type", type);
  html = setProperty(html, "og:site_name", "FichaEleam");
  html = setProperty(html, "og:locale", "es_CL");
  html = setProperty(html, "og:url", url);
  html = setProperty(html, "og:title", title);
  html = setProperty(html, "og:description", description);
  html = setProperty(html, "og:image", ogImage);
  html = setProperty(html, "og:image:alt", imageAlt || description);
  html = setProperty(html, "og:image:width", "1792");
  html = setProperty(html, "og:image:height", "1024");
  html = setMeta(html, "twitter:card", "summary_large_image");
  html = setMeta(html, "twitter:title", title);
  html = setMeta(html, "twitter:description", description);
  html = setMeta(html, "twitter:image", ogImage);
  html = setMeta(html, "twitter:image:alt", imageAlt || description);
  if (article) {
    if (article.published) html = setProperty(html, "article:published_time", article.published);
    html = setProperty(html, "article:modified_time", article.modified ?? article.published);
    if (article.section) html = setProperty(html, "article:section", article.section);
    if (article.author) html = setProperty(html, "article:author", article.author);
    const tagMeta = (article.tags ?? [])
      .map((tag) => `<meta property="article:tag" content="${escapeHtml(tag)}" />`)
      .join("\n    ");
    if (tagMeta) html = html.replace("</head>", `    ${tagMeta}\n  </head>`);
  }
  html = html.replace(
    "</head>",
    `    <style id="fichaeleam-prerender-style">.seo-prerender{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:980px;margin:0 auto;padding:40px 20px;color:#0f172a;line-height:1.65}.seo-prerender h1{font-size:clamp(2rem,5vw,4rem);line-height:1.05;margin:0 0 16px}.seo-prerender h2{margin-top:32px}.seo-prerender a{color:#0f766e}.seo-prerender .grid{display:grid;gap:16px}.seo-prerender .card{border:1px solid #e2e8f0;border-radius:14px;padding:18px;background:#fff}.seo-prerender img{max-width:100%;height:auto}</style>\n    ${jsonLdScript(jsonLd)}\n  </head>`,
  );
  const hydratedRoot = `<div id="root">\n${withInternalSlashes(rootHtml)}\n    </div>`;
  if (/<div id="root">[\s\S]*?<\/div>\s*<noscript>/i.test(html)) {
    return html.replace(/<div id="root">[\s\S]*?<\/div>\s*<noscript>/i, `${hydratedRoot}\n    <noscript>`);
  }
  return html.replace('<div id="root"></div>', hydratedRoot);
}

function writeRoute(routePath, html) {
  if (routePath === "/") {
    writeFileSync(join(DIST, "index.html"), html);
    return;
  }
  const targetDir = join(DIST, routePath.replace(/^\/+/, ""));
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(join(targetDir, "index.html"), html);
}

function cleanPrerenderTargets() {
  for (const route of PUBLIC_ROUTES) {
    if (route.path === "/") continue;
    const targetDir = join(DIST, route.path.replace(/^\/+|\/+$/g, ""));
    rmSync(targetDir, { recursive: true, force: true });
  }
  for (const file of ["robots.txt", "sitemap.xml", "llms.txt", "404.html", ".htaccess"]) {
    rmSync(join(DIST, file), { force: true });
  }
}

function buildLandingHtml() {
  const plans = PUBLIC_PLAN_CATALOG.map((plan) => (
    `<li><strong>${escapeHtml(plan.label)}</strong>: ${escapeHtml(formatPlanPrice(plan))} + IVA, hasta ${plan.max_residentes} residentes activos u hospitalizados y ${plan.max_funcionarios} funcionarios.</li>`
  )).join("");
  return `<main class="seo-prerender">
      <h1>FichaEleam &middot; Software para ELEAM en Chile</h1>
      <p class="article-summary">${escapeHtml(BASE_DESCRIPTION)}</p>
      <img src="${MARKETING_IMAGES.home}" alt="Directora de ELEAM usando FichaEleam con dashboard y soporte por WhatsApp" loading="eager">

      <h2>Qu&eacute; resuelve FichaEleam</h2>
      <ul>
        <li><strong>Ficha cl&iacute;nica digital</strong>: diagn&oacute;sticos, alergias, medicamentos, &iacute;ndice de Barthel y nivel de dependencia por residente.</li>
        <li><strong>Signos vitales con alertas</strong>: rangos cl&iacute;nicos validados para persona mayor; alerta inmediata ante valores cr&iacute;ticos.</li>
        <li><strong>Observaciones de turno</strong>: 12 categor&iacute;as con seguimiento obligatorio (ca&iacute;das, medicamentos, alimentaci&oacute;n, higiene, etc.).</li>
        <li><strong>Carpeta SEREMI DS 20</strong>: matriz por art&iacute;culos, evidencia requerida, criticidad, estados fiscalizables y alertas de vencimiento.</li>
        <li><strong>eMAR / Kardex electr&oacute;nico</strong>: administraci&oacute;n de medicamentos por turno con historial inmutable.</li>
        <li><strong>Portal familiar</strong>: cada familiar autorizado ve solo a su residente: signos recientes y registro de visitas.</li>
        <li><strong>Gesti&oacute;n de habitaciones y camas</strong>: inventario, ocupaci&oacute;n y traslados con historial.</li>
      </ul>

      <h2>Planes comerciales (precios netos, sin IVA)</h2>
      <ul>${plans}<li><strong>Institucional</strong>: 35 o m&aacute;s residentes, cotizaci&oacute;n personalizada por WhatsApp +56 9 5118 7764.</li></ul>

      <h2>C&oacute;mo empezar</h2>
      <ol>
        <li>Completa el formulario en <a href="/">fichaeleam.cl</a> o escr&iacute;benos por WhatsApp al +56 9 5118 7764.</li>
        <li>Aprobamos cada solicitud en menos de 24 horas y enviamos por correo el enlace de acceso.</li>
        <li>Recibes una cuenta real con 30 d&iacute;as de prueba gratuita, sin tarjeta de cr&eacute;dito.</li>
      </ol>

      <h2>Marco regulatorio</h2>
      <p>FichaEleam est&aacute; dise&ntilde;ado para apoyar la gesti&oacute;n y evidencia documental exigida por el <strong>Decreto N&deg;20</strong> del MINSAL, la <strong>Ley N&deg;20.584</strong> sobre derechos del paciente y la <strong>Ley N&deg;19.628</strong> sobre protecci&oacute;n de datos personales en Chile.</p>

      <h2>Explora FichaEleam</h2>
      <ul>
        <li><a href="/software-eleam">Software para ELEAM</a>: m&oacute;dulos cl&iacute;nicos y operativos, comparativa con Excel/papel y cumplimiento normativo.</li>
        <li><a href="/acreditacion-seremi">Carpeta SEREMI DS 20</a>: gu&iacute;a por art&iacute;culos, evidencias, vencimientos, transitorios y preparaci&oacute;n de fiscalizaci&oacute;n.</li>
        <li><a href="/preguntas-frecuentes">Preguntas frecuentes</a>: producto, precios, demo, implementaci&oacute;n, seguridad y soporte.</li>
        <li><a href="/pago">Planes y precios</a>: tres planes mensuales y tier institucional para 35+ residentes.</li>
        <li><a href="/blog">Blog FichaEleam</a>: recursos para directores y equipos de ELEAM en Chile.</li>
        <li><a href="/contacto">Contacto</a>: correo, WhatsApp y solicitud de demo gratuito.</li>
      </ul>

      <p><a href="/blog">Ver recursos para ELEAM en el blog</a> &middot; <a href="/pago">Ver planes y precios</a> &middot; <a href="https://wa.me/56951187764">Hablar por WhatsApp</a></p>
    </main>`;
}

function buildPaymentHtml() {
  const cards = PUBLIC_PLAN_CATALOG.map((plan) => (
    `<article class="card"><h2>${escapeHtml(plan.label)}</h2><p><strong>${escapeHtml(formatPlanPrice(plan))} CLP + IVA / mes</strong></p><p>Hasta ${plan.max_residentes} residentes activos u hospitalizados y ${plan.max_funcionarios} funcionarios.</p></article>`
  )).join("");
  return `<main class="seo-prerender">
      <h1>Planes y precios de FichaEleam</h1>
      <p class="article-summary">Precios mensuales para ELEAM en Chile, netos (sin IVA), con pago por MercadoPago. Elige el plan seg&uacute;n el uso real de tu establecimiento: residentes activos u hospitalizados consumen cupo, mientras que egresados y fallecidos no. Las invitaciones pendientes de funcionarios tambi&eacute;n cuentan contra el cupo.</p>
      <img src="${MARKETING_IMAGES.software}" alt="Dashboard de FichaEleam en computador y telefono" loading="eager">
      <div class="grid">${cards}<article class="card"><h2>Institucional</h2><p><strong>Cotizaci&oacute;n personalizada</strong></p><p>Para ELEAM con 35 o m&aacute;s residentes y cupos a medida. Cont&aacute;ctanos por WhatsApp al +56 9 5118 7764.</p></article></div>

      <h2>Qu&eacute; incluye cada plan</h2>
      <ul>
        <li>Ficha cl&iacute;nica digital de cada residente.</li>
        <li>Signos vitales con rangos cl&iacute;nicos validados para persona mayor y alertas autom&aacute;ticas.</li>
        <li>12 tipos de observaciones diarias con seguimiento obligatorio.</li>
        <li>Carpeta SEREMI DS 20 con matriz por art&iacute;culos, criticidad, evidencia, vencimientos y modo fiscalizaci&oacute;n.</li>
        <li>eMAR (kardex electr&oacute;nico) e historial inmutable de administraci&oacute;n de medicamentos.</li>
        <li>Plan de cuidado con tareas por turno.</li>
        <li>Portal familiar restringido al residente vinculado.</li>
        <li>Permisos granulares por funcionario.</li>
        <li>Importaci&oacute;n masiva v&iacute;a Excel.</li>
        <li>Soporte en espa&ntilde;ol por correo y WhatsApp.</li>
      </ul>

      <h2>Demo gratuito</h2>
      <p>Antes de contratar puedes solicitar una cuenta demo con <strong>30 d&iacute;as de prueba sin costo y sin tarjeta de cr&eacute;dito</strong>. Aprobamos cada solicitud en menos de 24 horas.</p>

      <p><a href="/">Solicitar demo gratuito</a> &middot; <a href="https://wa.me/56951187764">Hablar por WhatsApp</a> &middot; <a href="/blog">Ver recursos para ELEAM</a></p>
    </main>`;
}

function buildAcreditacionHtml() {
  const ambitos = DECRETO20_AMBITOS.map((ambito) => (
    `<li><strong>${escapeHtml(ambito.articulo_ref)} · ${escapeHtml(ambito.nombre)}</strong>: ${escapeHtml(ambito.descripcion)}</li>`
  )).join("");
  const criticos = DECRETO20_REQUISITOS
    .filter((requisito) => requisito.criticidad === "critica" || requisito.criticidad === "alta")
    .slice(0, 16)
    .map((requisito) => `<li><strong>${escapeHtml(requisito.articulo_ref)} · ${escapeHtml(requisito.nombre)}</strong>: ${escapeHtml(requisito.medio_verificador)}</li>`)
    .join("");
  const vencimientos = DECRETO20_REQUISITOS
    .filter((requisito) => requisito.requiere_vencimiento)
    .slice(0, 12)
    .map((requisito) => `<li>${escapeHtml(requisito.nombre)}: vigencia sugerida ${escapeHtml(String(requisito.vigencia_dias_sugerida ?? "segun documento"))} dias.</li>`)
    .join("");

  return `<main class="seo-prerender">
      <nav aria-label="Breadcrumb"><a href="/">Inicio</a> &middot; Carpeta SEREMI DS 20</nav>
      <h1>Carpeta SEREMI DS 20 para ELEAM</h1>
      <p class="article-summary">${escapeHtml(DECRETO20_COPY.hero)}</p>
      <img src="${MARKETING_IMAGES.seremi}" alt="Comparativa de carpetas fisicas y dashboard FichaEleam para SEREMI" loading="eager">

      <h2>Norma vigente y fuente oficial</h2>
      <p>La matriz de FichaEleam usa el <strong>${escapeHtml(DECRETO20_META.nombre)}</strong>, vigente desde el <strong>${escapeHtml(DECRETO20_META.vigenciaDesde)}</strong>, con fuente oficial en <a href="${escapeHtml(DECRETO20_META.fuenteUrl)}" rel="noopener nofollow" target="_blank">Ley Chile</a>. La plataforma est&aacute; dise&ntilde;ada para apoyar la gesti&oacute;n y evidencia documental exigida por el Decreto N&deg;20; la validaci&oacute;n final depende de la autoridad sanitaria.</p>

      <h2>Transitorios DS 20</h2>
      <ul>${DECRETO20_META.transitorios.map((item) => `<li><strong>${escapeHtml(item.plazo)}</strong>: ${escapeHtml(item.descripcion)}</li>`).join("")}</ul>

      <h2>Matriz DS 20 por art&iacute;culos</h2>
      <ol>${ambitos}</ol>

      <h2>Evidencia cr&iacute;tica en modo fiscalizaci&oacute;n</h2>
      <ul>${criticos}</ul>

      <h2>Vigencias y actualizaciones</h2>
      <ul>${vencimientos}</ul>

      <h2>Registros vivos vinculados</h2>
      <p>El Decreto N&deg;20 no se resuelve con una carpeta est&aacute;tica. FichaEleam conecta autorizaci&oacute;n sanitaria, direcci&oacute;n t&eacute;cnica, dotaci&oacute;n, ingreso y consentimiento, contrato, inventario, derechos y deberes, reclamos, protocolos, red de salud, reporte SENAMA, programa de atenci&oacute;n integral usuaria, medicamentos, eventos cr&iacute;ticos e inspecci&oacute;n de infraestructura.</p>

      <p><a href="/software-eleam">Ver software para ELEAM</a> &middot; <a href="/preguntas-frecuentes">Preguntas frecuentes</a> &middot; <a href="/pago">Planes y precios</a> &middot; <a href="/contacto">Contacto</a></p>
    </main>`;
}

function buildCalculadoraHtml() {
  const reglas = DOTACION_REGLAS.map((regla) => (
    `<tr><td>${escapeHtml(regla.grupo)}</td><td>${escapeHtml(regla.turno)}</td><td>${escapeHtml(regla.regla)}</td><td>${escapeHtml(regla.articulo)}</td></tr>`
  )).join("");
  const ejemplo = calcularDotacion({ conDependencia: 16, autovalentes: 8 });
  return `<main class="seo-prerender">
      <nav aria-label="Breadcrumb"><a href="/">Inicio</a> &middot; Calculadora de dotaci&oacute;n</nav>
      <h1>Calculadora de dotaci&oacute;n de personal para ELEAM (Decreto N&deg;20)</h1>
      <p class="article-summary">Estima la dotaci&oacute;n m&iacute;nima de cuidadores y apoyo t&eacute;cnico de enfermer&iacute;a de un ELEAM seg&uacute;n los art&iacute;culos 15, 16 y 17 del Decreto N&deg;20 del MINSAL. Ingresa el n&uacute;mero de residentes con dependencia y autovalentes y obt&eacute;n el personal m&iacute;nimo por turno y la brecha respecto de tu dotaci&oacute;n actual. C&aacute;lculo referencial.</p>
      <img src="${MARKETING_IMAGES.shift}" alt="Equipo de un ELEAM en entrega de turno con FichaEleam" loading="eager">

      <h2>C&oacute;mo se calcula la dotaci&oacute;n</h2>
      <table>
        <thead><tr><th>Grupo</th><th>Turno o rol</th><th>Regla</th><th>Art&iacute;culo</th></tr></thead>
        <tbody>${reglas}</tbody>
      </table>

      <h2>Ejemplo: 16 residentes con dependencia y 8 autovalentes</h2>
      <ul>
        <li><strong>Cuidadores turno diurno</strong>: ${ejemplo.requerido.cuidadoresDiurno}.</li>
        <li><strong>Cuidadores turno nocturno</strong>: ${ejemplo.requerido.cuidadoresNocturno} (m&iacute;nimo 2 por el art&iacute;culo 17).</li>
        <li><strong>Apoyo t&eacute;cnico</strong>: ${escapeHtml(ejemplo.requerido.tens.detalle)}</li>
      </ul>

      <h2>Reglas clave del Decreto N&deg;20</h2>
      <ul>
        <li>Residentes con dependencia: 1 cuidador diurno por cada 8 y 1 nocturno por cada 12 (art&iacute;culo 15).</li>
        <li>Residentes autovalentes: 1 cuidador por cada 20 en cada turno (art&iacute;culo 16).</li>
        <li>M&iacute;nimo 2 cuidadores en horario nocturno, siempre (art&iacute;culo 17).</li>
        <li>Apoyo t&eacute;cnico de enfermer&iacute;a seg&uacute;n el grupo de residentes (art&iacute;culos 15, 16 y 18).</li>
      </ul>

      <p>C&aacute;lculo referencial para planificar tu dotaci&oacute;n. La validaci&oacute;n final depende del texto oficial vigente, la pauta del MINSAL y el criterio de la SEREMI. Fuente oficial: <a href="${escapeHtml(DOTACION_META.fuenteUrl)}" rel="noopener nofollow" target="_blank">Ley Chile</a>.</p>

      <p><a href="/acreditacion-seremi">Carpeta SEREMI DS 20</a> &middot; <a href="/software-eleam">Software para ELEAM</a> &middot; <a href="/preguntas-frecuentes">Preguntas frecuentes</a> &middot; <a href="/contacto">Contacto</a></p>
    </main>`;
}

function calculatorAppJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${routeUrl("/calculadora-dotacion-eleam")}#app`,
    name: "Calculadora de dotación de personal para ELEAM",
    description: "Herramienta gratuita para estimar la dotación mínima de cuidadores y TENS de un ELEAM según el Decreto N°20 del MINSAL (Arts. 15-17).",
    url: routeUrl("/calculadora-dotacion-eleam"),
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "es-CL",
    isAccessibleForFree: true,
    image: absoluteUrl(MARKETING_IMAGES.shift),
    offers: { "@type": "Offer", price: "0", priceCurrency: "CLP" },
    publisher: { "@type": "Organization", name: "FichaEleam", url: `${ORIGIN}/` },
  };
}

function buildSoftwareHtml() {
  return `<main class="seo-prerender">
      <nav aria-label="Breadcrumb"><a href="/">Inicio</a> &middot; Software para ELEAM</nav>
      <h1>Software para ELEAM en Chile</h1>
      <p class="article-summary">Ficha cl&iacute;nica digital, signos vitales con alertas, eMAR, programa de atenci&oacute;n integral usuaria, observaciones de turno y Carpeta SEREMI DS 20 en una sola plataforma para ELEAM en Chile.</p>
      <img src="${MARKETING_IMAGES.software}" alt="Dashboard clinico de FichaEleam con signos vitales y ficha de residente" loading="eager">

      <h2>Excel y papel vs FichaEleam</h2>
      <ul>
        <li><strong>Ficha cl&iacute;nica con historial</strong>: Excel no tiene trazabilidad; FichaEleam audita cada cambio.</li>
        <li><strong>Signos vitales</strong>: rangos cl&iacute;nicos validados para persona mayor con alertas cr&iacute;ticas.</li>
        <li><strong>Observaciones por turno</strong>: 12 categor&iacute;as con seguimiento obligatorio y b&uacute;squeda.</li>
        <li><strong>Programa de atenci&oacute;n integral usuaria</strong>: tareas por turno con completaci&oacute;n, omisi&oacute;n, reprogramaci&oacute;n y seguimiento.</li>
        <li><strong>Medicamentos (eMAR)</strong>: kardex electr&oacute;nico con doble validaci&oacute;n y control de stock.</li>
        <li><strong>Carpeta SEREMI DS 20</strong>: matriz por art&iacute;culos con evidencias, criticidad, vigencias y modo fiscalizaci&oacute;n.</li>
        <li><strong>Acceso del equipo</strong>: simult&aacute;neo desde cualquier dispositivo.</li>
        <li><strong>Acceso de familias</strong>: portal con signos recientes y visitas.</li>
        <li><strong>Auditor&iacute;a</strong>: cada cambio queda inmutable.</li>
        <li><strong>Backup</strong>: autom&aacute;tico en la nube.</li>
      </ul>

      <h2>M&oacute;dulos integrados</h2>
      <ul>
        <li>Ficha cl&iacute;nica digital con &iacute;ndice de Barthel y nivel de dependencia.</li>
        <li>Signos vitales por turno con rangos cl&iacute;nicos para persona mayor.</li>
        <li>12 tipos de observaciones diarias.</li>
        <li>Programa de atenci&oacute;n integral usuaria con objetivos, pautas y actividades por categor&iacute;a.</li>
        <li>eMAR (kardex electr&oacute;nico) con stock por lote, receta, temperatura, gaveta, eliminaci&oacute;n y doble validaci&oacute;n.</li>
        <li>Carpeta SEREMI DS 20 con matriz por art&iacute;culos, evidencias, criticidad y transitorios.</li>
        <li>Habitaciones y camas con historial de ocupaci&oacute;n.</li>
        <li>Portal familiar restringido por residente vinculado.</li>
        <li>Entrega de turno con resumen cl&iacute;nico, eMAR y pendientes.</li>
        <li>Permisos granulares por funcionario.</li>
        <li>Importaci&oacute;n masiva v&iacute;a Excel con validadores nativos.</li>
        <li>Trazabilidad e historial inmutable.</li>
      </ul>

      <h2>Gestión normativa chilena</h2>
      <ul>
        <li><strong>Decreto N°20 del MINSAL</strong>: matriz DS 20 por art&iacute;culos, evidencia documental y registros vivos.</li>
        <li><strong>Ley N&deg; 20.584</strong>: derechos y deberes de los pacientes.</li>
        <li><strong>Ley N&deg; 19.628</strong>: protecci&oacute;n de datos personales.</li>
        <li><strong>Aislamiento multi-tenant</strong>: cada ELEAM ve solo sus datos (Row Level Security).</li>
      </ul>

      <p><a href="/acreditacion-seremi">Gu&iacute;a SEREMI completa</a> &middot; <a href="/preguntas-frecuentes">FAQ</a> &middot; <a href="/pago">Planes y precios</a> &middot; <a href="/contacto">Contacto</a></p>
    </main>`;
}

function buildFaqHtml() {
  const sections = [
    { titulo: "Producto", items: [
      ["&iquest;Qu&eacute; es FichaEleam?", "Software web especializado para ELEAM en Chile que centraliza ficha cl&iacute;nica, signos vitales, observaciones, programa integral, eMAR, habitaciones, portal familiar y Carpeta SEREMI DS 20."],
      ["&iquest;En qu&eacute; se diferencia de un software gen&eacute;rico?", "Trae matriz DS 20 por art&iacute;culos, rangos cl&iacute;nicos para personas mayores, turnos ma&ntilde;ana/tarde/noche y manejo de controlados con doble validaci&oacute;n."],
      ["&iquest;Es web o de escritorio?", "Es web. Funciona en cualquier dispositivo con navegador moderno y conexi&oacute;n a internet."],
    ]},
    { titulo: "Precios y planes", items: [
      ["&iquest;Cu&aacute;nto cuesta?", "Tres planes mensuales en CLP + IVA: $50.000 (hasta 14 residentes), $80.000 (hasta 24), $120.000 (hasta 34). Plan institucional para 35+."],
      ["&iquest;C&oacute;mo se paga?", "MercadoPago con tarjeta chilena. Cobro mensual autom&aacute;tico, cancelable en cualquier momento."],
      ["&iquest;Hay costo de implementaci&oacute;n?", "No. Activaci&oacute;n inmediata, sin fee de setup."],
    ]},
    { titulo: "Demo y prueba gratuita", items: [
      ["&iquest;C&oacute;mo solicito un demo?", "Completa el formulario en la p&aacute;gina principal. Aprobamos en menos de 24 horas y enviamos el acceso por correo."],
      ["&iquest;Cu&aacute;nto dura la prueba?", "30 d&iacute;as con acceso completo, sin tarjeta de cr&eacute;dito."],
    ]},
    { titulo: "Implementaci&oacute;n", items: [
      ["&iquest;Cu&aacute;nto demora implementar?", "Menos de 24 horas. Puedes operar turnos completos al final del primer d&iacute;a."],
      ["&iquest;Puedo importar mis datos desde Excel?", "S&iacute;. Plantillas oficiales para residentes y funcionarios con validadores nativos."],
    ]},
    { titulo: "Seguridad", items: [
      ["&iquest;Otro ELEAM puede ver mis datos?", "Imposible. Row Level Security a nivel de base de datos: cada consulta filtra por el ELEAM del usuario."],
      ["&iquest;C&oacute;mo resguarda la ley chilena de datos?", "Opera con controles t&eacute;cnicos y organizacionales alineados con la Ley N&deg; 19.628 y la Ley N&deg; 20.584."],
    ]},
    { titulo: "Soporte", items: [
      ["&iquest;C&oacute;mo recibo soporte?", "Por correo a contacto@fichaeleam.cl y por WhatsApp al +56 9 5118 7764."],
      ["&iquest;C&oacute;mo cancelo?", "Desde el panel del administrador. Sin penalidades ni cl&aacute;usulas de permanencia."],
    ]},
  ];
  const html = sections.map((s) => (
    `<h2>${s.titulo}</h2>${s.items.map(([q, a]) => `<h3>${q}</h3><p>${a}</p>`).join("")}`
  )).join("");
  return `<main class="seo-prerender">
      <nav aria-label="Breadcrumb"><a href="/">Inicio</a> &middot; Preguntas frecuentes</nav>
      <h1>Preguntas frecuentes sobre FichaEleam</h1>
      <p class="article-summary">Respuestas a las consultas m&aacute;s frecuentes de directores, administradores y equipos cl&iacute;nicos de ELEAM en Chile sobre FichaEleam: producto, precios, demo, implementaci&oacute;n, seguridad, equipo y soporte.</p>
      <img src="${MARKETING_IMAGES.shift}" alt="Equipo clinico usando FichaEleam para entrega de turno" loading="eager">
      ${html}
      <p><a href="/contacto">&iquest;Otra pregunta? Escr&iacute;benos &rarr;</a></p>
    </main>`;
}

function buildContactoHtml() {
  return `<main class="seo-prerender">
      <nav aria-label="Breadcrumb"><a href="/">Inicio</a> &middot; Contacto</nav>
      <h1>Contacto FichaEleam</h1>
      <p class="article-summary">Cont&aacute;ctanos por correo, WhatsApp o solicita una demo gratuita para tu ELEAM en Chile. Respondemos en horario h&aacute;bil con prioridad a casos urgentes.</p>
      <img src="${MARKETING_IMAGES.home}" alt="Contacto y demo de FichaEleam para ELEAM en Chile" loading="eager">

      <h2>Canales de contacto</h2>
      <ul>
        <li><strong>Demo gratuito</strong>: <a href="/">formulario en fichaeleam.cl</a> &mdash; cuenta real con 30 d&iacute;as de prueba, aprobaci&oacute;n en menos de 24 horas.</li>
        <li><strong>WhatsApp</strong>: <a href="https://wa.me/56951187764">+56 9 5118 7764</a> &mdash; respuesta en minutos en horario h&aacute;bil.</li>
        <li><strong>Correo</strong>: <a href="mailto:contacto@fichaeleam.cl">contacto@fichaeleam.cl</a> &mdash; respuesta en menos de 24 horas.</li>
      </ul>

      <h2>Informaci&oacute;n comercial</h2>
      <ul>
        <li>Producto: Software de gesti&oacute;n cl&iacute;nica y acreditaci&oacute;n SEREMI para ELEAM en Chile.</li>
        <li>Marco normativo: Decreto N°20 (MINSAL), Ley N&deg; 20.584, Ley N&deg; 19.628.</li>
        <li>Ubicaci&oacute;n: Santiago, Chile &middot; 100% web.</li>
        <li>Idioma de soporte: Espa&ntilde;ol.</li>
        <li>Horario: Lunes a viernes, 9:00 a 19:00 (hora de Chile).</li>
        <li>Forma de pago: MercadoPago (tarjeta de cr&eacute;dito o d&eacute;bito).</li>
        <li>Moneda: Pesos chilenos (CLP), precios netos sin IVA.</li>
      </ul>

      <p><a href="/preguntas-frecuentes">FAQ completa</a> &middot; <a href="/software-eleam">Software ELEAM</a> &middot; <a href="/acreditacion-seremi">Acreditaci&oacute;n SEREMI</a> &middot; <a href="/pago">Planes y precios</a></p>
    </main>`;
}

function buildBlogHtml(posts) {
  const items = posts.map((post) => (
    `<article class="card"><p>${escapeHtml(articleSection(post))} &middot; <time datetime="${post.publicado_en}">${escapeHtml(formatLongDate(post.publicado_en))}</time></p><h2><a href="/blog/${escapeHtml(post.slug)}">${escapeHtml(post.titulo)}</a></h2><p>${escapeHtml(post.resumen)}</p><p>${post.tiempo_lectura_min} min de lectura &middot; ${escapeHtml(post.autor_nombre)}</p></article>`
  )).join("");
  return `<main class="seo-prerender">
      <nav aria-label="Breadcrumb"><a href="/">Inicio</a> &middot; Blog</nav>
      <h1>Blog FichaEleam &middot; Recursos para ELEAM en Chile</h1>
      <p class="article-summary">Gu&iacute;as pr&aacute;cticas para directores y equipos de ELEAM en Chile: Decreto N°20, fiscalizaci&oacute;n SEREMI, fichas cl&iacute;nicas, signos vitales, medicamentos, trazabilidad, protecci&oacute;n de datos y operaci&oacute;n diaria.</p>
      <img src="${MARKETING_IMAGES.shift}" alt="Blog de FichaEleam para gestion de ELEAM en Chile" loading="eager">
      <div class="grid">${items}</div>
      <p><a href="/software-eleam">Software para ELEAM</a> &middot; <a href="/acreditacion-seremi">Acreditaci&oacute;n SEREMI</a> &middot; <a href="/preguntas-frecuentes">Preguntas frecuentes</a> &middot; <a href="/pago">Planes y precios</a> &middot; <a href="/">Solicitar demo gratuito</a></p>
    </main>`;
}

function buildPostHtml(post, posts = []) {
  const tags = (post.keywords ?? [])
    .slice(0, 6)
    .map((tag) => `<li>${escapeHtml(tag)}</li>`)
    .join("");
  const related = relatedPosts(post, posts).map((item) => (
    `<li><a href="/blog/${escapeHtml(item.slug)}">${escapeHtml(item.titulo)}</a> &mdash; ${escapeHtml(item.resumen)}</li>`
  )).join("");
  return `<main class="seo-prerender">
      <nav aria-label="Breadcrumb"><a href="/">Inicio</a> &middot; <a href="/blog">Blog</a> &middot; ${escapeHtml(articleSection(post))}</nav>
      <article>
        <p><time datetime="${post.publicado_en}">${escapeHtml(formatLongDate(post.publicado_en))}</time> &middot; ${post.tiempo_lectura_min} min de lectura &middot; ${escapeHtml(post.autor_nombre)}</p>
        <h1>${escapeHtml(post.titulo)}</h1>
        <p class="article-summary"><strong>${escapeHtml(post.resumen)}</strong></p>
        <img src="${postImage(post)}" alt="${escapeHtml(post.cover_alt || post.titulo)}" loading="eager">
        ${tags ? `<ul aria-label="Temas del artículo">${tags}</ul>` : ""}
        ${markdownToHtml(post.contenido_md)}
      </article>

      <aside class="card" aria-label="Sobre FichaEleam">
        <h2>FichaEleam &middot; Software para ELEAM en Chile</h2>
        <p>Carpeta SEREMI DS 20, fichas cl&iacute;nicas digitales, signos vitales con alertas, eMAR, programa integral y portal familiar. Cuenta demo real con 30 d&iacute;as de prueba gratuita.</p>
        <p><a href="/">Solicitar demo gratuito</a> &middot; <a href="/software-eleam">Ver software para ELEAM</a> &middot; <a href="/acreditacion-seremi">Gu&iacute;a SEREMI</a> &middot; <a href="/pago">Planes y precios</a> &middot; <a href="https://wa.me/56951187764">WhatsApp +56 9 5118 7764</a></p>
      </aside>

      ${related ? `<section aria-label="Art&iacute;culos relacionados"><h2>Sigue leyendo</h2><ul>${related}</ul></section>` : ""}
    </main>`;
}

function softwareJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "FichaEleam",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `${ORIGIN}/`,
    image: absoluteUrl(MARKETING_IMAGES.home),
    screenshot: absoluteUrl(MARKETING_IMAGES.software),
    publisher: {
      "@type": "Organization",
      name: "FichaEleam",
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(MARKETING_IMAGES.logo),
      },
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "CLP",
      lowPrice: "50000",
      highPrice: "120000",
      offerCount: "4",
      offers: [
        ...PUBLIC_PLAN_CATALOG.map((plan) => ({
          "@type": "Offer",
          name: plan.nombre,
          price: String(plan.precio_clp),
          priceCurrency: "CLP",
          description: `Hasta ${plan.max_residentes} residentes activos u hospitalizados y ${plan.max_funcionarios} funcionarios.`,
        })),
        {
          "@type": "Offer",
          name: "Plan institucional",
          priceCurrency: "CLP",
          description: "Cotización personalizada para ELEAM con 35 o más residentes.",
        },
      ],
    },
  };
}

function breadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: routeUrl(it.url),
    })),
  };
}

function faqPageJsonLd(qa) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

function howToJsonLd({ name, description, totalTime, steps }) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    ...(totalTime && { totalTime }),
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

function contactPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contacto FichaEleam",
    url: `${ORIGIN}/contacto`,
    description: "Contacto FichaEleam por correo, WhatsApp y solicitud de demo gratuito.",
    mainEntity: {
      "@type": "Organization",
      name: "FichaEleam",
      email: "contacto@fichaeleam.cl",
      telephone: "+56-9-5118-7764",
      url: ORIGIN,
      areaServed: { "@type": "Country", name: "Chile" },
      availableLanguage: ["es-CL"],
    },
  };
}

const SEREMI_FAQ = DECRETO20_FAQ;

const SEREMI_STEPS = [
  { name: "Identifica artículos aplicables", text: "Revisa autorización sanitaria, modificaciones, infraestructura, dirección técnica, dotación y registros obligatorios DS 20." },
  { name: "Carga evidencia con vigencia", text: "Adjunta documentos, registros operativos y responsables por requisito con fecha de vencimiento cuando corresponda." },
  { name: "Prioriza brechas críticas", text: "Revisa criticidad, observados, vencidos, no cumple y requisitos que requieren actualización." },
  { name: "Activa modo fiscalización", text: "Exporta una vista de Carpeta SEREMI DS 20 por artículos, evidencias y estados fiscalizables." },
];

const CALCULADORA_STEPS = [
  { name: "Cuenta a tus residentes por grupo", text: "Separa residentes con dependencia funcional de los autovalentes o independientes, según la valoración geriátrica." },
  { name: "Calcula la dotación requerida", text: "La herramienta aplica los artículos 15, 16 y 17 del Decreto N°20 y entrega los cuidadores mínimos por turno y el apoyo técnico de enfermería." },
  { name: "Compara con tu dotación actual", text: "Ingresa los cuidadores que tienes por turno para ver la brecha y detectar déficit antes de una fiscalización SEREMI." },
];

const CALCULADORA_FAQ = [
  { q: "¿Cómo se calcula la dotación mínima de un ELEAM?", a: "Para residentes con dependencia, 1 cuidador diurno por cada 8 y 1 nocturno por cada 12; para autovalentes, 1 cuidador por cada 20 en cada turno; y un mínimo de 2 cuidadores nocturnos siempre (Arts. 15-17 del Decreto N°20). Es un cálculo referencial." },
  { q: "¿Cuál es el mínimo de cuidadores en la noche?", a: "El artículo 17 exige al menos 2 cuidadores en horario nocturno, cualquiera sea el número de residentes o su nivel de dependencia." },
  { q: "¿Qué pasa con el técnico o auxiliar de enfermería?", a: "Con residentes con dependencia se requiere un auxiliar o técnico de enfermería 12 horas diurnas y uno de llamada nocturna; con solo autovalentes, uno de llamada las 24 horas." },
  { q: "¿Este resultado garantiza el cumplimiento ante la SEREMI?", a: "No. Es una estimación referencial. La validación final depende del texto oficial vigente, la pauta del MINSAL y el criterio de la SEREMI de Salud." },
];

const SOFTWARE_FAQ = [
  { q: "¿Por qué un software especializado y no Excel?", a: "Excel no tiene trazabilidad. FichaEleam fue construido para ELEAM en Chile: matriz DS 20 por artículos, rangos clínicos para personas mayores, turnos mañana/tarde/noche y controlados con doble validación." },
  { q: "¿Cuánto cuesta?", a: "Tres planes mensuales en CLP + IVA: $50.000 (14 residentes), $80.000 (24), $120.000 (34). Institucional 35+ a cotización." },
  { q: "¿Es seguro guardar datos de residentes en la nube?", a: "Sí. Aislamiento por ELEAM con Row Level Security, encriptación en tránsito y reposo, y controles alineados con la Ley N° 19.628 y la Ley N° 20.584." },
  { q: "¿Cuánto demora la implementación?", a: "Menos de 24 horas. Puedes operar turnos completos al final del primer día." },
];

const ALL_FAQ = [
  ...SOFTWARE_FAQ,
  { q: "¿Cómo solicito un demo?", a: "Completa el formulario en la página principal. Aprobamos en menos de 24 horas y enviamos el acceso por correo." },
  { q: "¿Cuánto dura la prueba gratuita?", a: "30 días con acceso completo, sin tarjeta de crédito." },
  { q: "¿Puedo importar datos desde Excel?", a: "Sí. Plantillas oficiales para residentes y funcionarios con validadores nativos." },
  { q: "¿Otro ELEAM puede ver mis datos?", a: "Imposible. Row Level Security: cada consulta filtra por el ELEAM del usuario." },
  { q: "¿Cómo recibo soporte?", a: "Por correo a contacto@fichaeleam.cl y por WhatsApp al +56 9 5118 7764." },
  { q: "¿Cómo cancelo la suscripción?", a: "Desde el panel del administrador. Sin penalidades ni cláusulas de permanencia." },
];

function blogListJsonLd(posts) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Blog FichaEleam",
    url: routeUrl("/blog"),
    image: absoluteUrl(MARKETING_IMAGES.shift),
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.titulo,
      url: routeUrl(`/blog/${post.slug}`),
      image: postImage(post),
      datePublished: post.publicado_en,
      author: { "@type": "Organization", name: post.autor_nombre },
    })),
  };
}

function postJsonLd(post) {
  const pageUrl = routeUrl(`/blog/${post.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": ["Article", "BlogPosting"],
    "@id": pageUrl,
    headline: post.titulo,
    description: post.meta_description || post.resumen,
    url: pageUrl,
    image: {
      "@type": "ImageObject",
      url: postImage(post),
      width: 1792,
      height: 1024,
    },
    thumbnailUrl: postImage(post),
    datePublished: post.publicado_en,
    dateModified: post.publicado_en,
    articleSection: articleSection(post),
    wordCount: countWords(post.contenido_md),
    timeRequired: `PT${post.tiempo_lectura_min}M`,
    inLanguage: "es-CL",
    author: {
      "@type": "Organization",
      name: post.autor_nombre || "FichaEleam",
      url: ORIGIN,
    },
    publisher: {
      "@type": "Organization",
      "@id": `${ORIGIN}/#organization`,
      name: "FichaEleam",
      url: ORIGIN,
      logo: { "@type": "ImageObject", url: absoluteUrl(MARKETING_IMAGES.logo) },
    },
    isPartOf: {
      "@type": "Blog",
      "@id": routeUrl("/blog"),
      name: "Blog FichaEleam",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pageUrl,
    },
    keywords: post.keywords.join(", "),
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", ".article-summary"],
    },
  };
}

function buildRobots() {
  const allowed = PUBLIC_ROUTES.map((route) => `Allow: ${withTrailingSlash(route.path)}`).join("\n");
  const disallowed = PRIVATE_NOINDEX_ROUTES.map((route) => `Disallow: ${withTrailingSlash(route)}`).join("\n");
  return `# FichaEleam - robots.txt
# Software de gestion clinica, documental y operativa para ELEAM en Chile.
# ${ORIGIN}

User-agent: *
Allow: /
${allowed}
Allow: /og-image.png
Allow: /favicon.svg
Allow: /marketing/
${disallowed}

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: meta-externalagent
Allow: /

User-agent: meta-externalfetcher
Allow: /

User-agent: FacebookBot
Allow: /

User-agent: Amazonbot
Allow: /

User-agent: Applebot
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: DuckAssistBot
Allow: /

User-agent: Bytespider
Allow: /

User-agent: cohere-ai
Allow: /

User-agent: AI2Bot
Allow: /

User-agent: YouBot
Allow: /

User-agent: Diffbot
Allow: /

Sitemap: ${ORIGIN}/sitemap.xml

# Informacion de la plataforma para modelos de lenguaje:
# ${ORIGIN}/llms.txt
`;
}

function buildSitemap(posts) {
  const today = new Date().toISOString().slice(0, 10);
  const routeMeta = {
    "/": { image: MARKETING_IMAGES.home, imageTitle: "Software FichaEleam para ELEAM en Chile" },
    "/acreditacion-seremi": { image: MARKETING_IMAGES.seremi, imageTitle: "Carpeta SEREMI DS 20 para ELEAM" },
    "/software-eleam": { image: MARKETING_IMAGES.software, imageTitle: "Dashboard de FichaEleam para gestion clinica" },
    "/calculadora-dotacion-eleam": { image: MARKETING_IMAGES.shift, imageTitle: "Calculadora de dotacion de personal para ELEAM DS 20" },
    "/blog": { image: MARKETING_IMAGES.shift, imageTitle: "Blog FichaEleam para gestion de ELEAM" },
    "/preguntas-frecuentes": { image: MARKETING_IMAGES.shift, imageTitle: "Preguntas frecuentes de FichaEleam" },
    "/pago": { image: MARKETING_IMAGES.software, imageTitle: "Planes y precios de FichaEleam" },
    "/contacto": { image: MARKETING_IMAGES.home, imageTitle: "Contacto FichaEleam" },
  };
  const urls = [
    ...PUBLIC_ROUTES.map((route) => ({
      loc: route.path,
      priority: route.priority,
      changefreq: route.changefreq,
      lastmod: today,
      image: routeMeta[route.path]?.image ?? MARKETING_IMAGES.home,
      imageTitle: routeMeta[route.path]?.imageTitle ?? "FichaEleam",
    })),
    ...posts.map((post) => ({
      loc: `/blog/${post.slug}`,
      priority: post.destacado ? "0.8" : "0.7",
      changefreq: "monthly",
      lastmod: post.publicado_en.slice(0, 10),
      image: postImage(post),
      imageTitle: post.titulo,
    })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map((url) => `  <url>
    <loc>${escapeXml(routeUrl(url.loc))}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
    <image:image>
      <image:loc>${escapeXml(absoluteUrl(url.image))}</image:loc>
      <image:title>${escapeXml(url.imageTitle)}</image:title>
    </image:image>
  </url>`).join("\n")}
</urlset>
`;
}

function buildLlms(posts) {
  const planLines = PUBLIC_PLAN_CATALOG.map(
    (plan) => `- ${plan.label}: ${formatPlanPrice(plan)} CLP + IVA al mes, hasta ${plan.max_residentes} residentes activos u hospitalizados y ${plan.max_funcionarios} funcionarios.`,
  ).join("\n");
  const postLines = posts.map((post) => (
    `- [${post.titulo}](${ORIGIN}/blog/${post.slug}) — ${articleSection(post)}, ${post.tiempo_lectura_min} min: ${post.resumen}`
  )).join("\n");
  const routeLines = PUBLIC_ROUTES.map((route) => `- ${ORIGIN}${withTrailingSlash(route.path)}`).join("\n");
  const articleLines = DECRETO20_AMBITOS.map((ambito) => `- ${ambito.articulo_ref}: ${ambito.nombre}`).join("\n");
  return `# FichaEleam

> Software de gestion clinica, documental y operativa para ELEAM (Establecimientos de Larga Estadia para Personas Mayores) en Chile.

FichaEleam esta disenado para apoyar la gestion y evidencia documental exigida por el ${DECRETO20_META.nombre}. La matriz SEREMI DS 20 se organiza por articulos, criticidad, tipo de evidencia, origen documental u operacional y estados fiscalizables: pendiente, en revision, vigente, observado, vencido, no cumple, no aplica y requiere actualizacion.

**Web**: ${ORIGIN}
**Blog**: ${ORIGIN}/blog
**Planes y precios**: ${ORIGIN}/pago
**Demo gratuito**: formulario en ${ORIGIN} (aprobacion en menos de 24 horas)
**Email**: contacto@fichaeleam.cl
**WhatsApp**: +56 9 5118 7764 (https://wa.me/56951187764)
**Fuente oficial DS 20**: ${DECRETO20_META.fuenteUrl}
**Vigencia DS 20**: ${DECRETO20_META.vigenciaDesde}

## Imagenes oficiales para buscadores y modelos

- Hero producto: ${absoluteUrl(MARKETING_IMAGES.home)}
- Dashboard clinico: ${absoluteUrl(MARKETING_IMAGES.software)}
- Comparativa Excel/papel vs FichaEleam: ${absoluteUrl(MARKETING_IMAGES.seremi)}
- Entrega de turno y equipo clinico: ${absoluteUrl(MARKETING_IMAGES.shift)}
- Icono de marca: ${absoluteUrl(MARKETING_IMAGES.logo)}

## Planes comerciales

${planLines}
- Institucional (35+ residentes): cotizacion personalizada por WhatsApp, cupos a medida.

Los residentes activos y hospitalizados consumen cupo. Residentes egresados o fallecidos no consumen cupo. Los funcionarios creados y las invitaciones pendientes de funcionarios consumen cupo; familiares no consumen cupo de funcionarios. Pago mensual con MercadoPago.

## Funcionalidades principales

- Ficha clinica digital de residentes (diagnosticos, alergias, medicamentos, indice de Barthel, dependencia)
- Signos vitales por turno con rangos clinicos para personas mayores y alertas criticas
- Observaciones de turno con seguimiento obligatorio
- Carpeta SEREMI DS 20 por articulos, evidencia, criticidad, vigencias y modo fiscalizacion
- Programa de atencion integral usuaria con tareas por turno
- Gestion de habitaciones y camas con historial de ocupacion
- eMAR (kardex electronico), stock, receta, frio, temperatura, gaveta, eliminacion y control
- Eventos adversos y eventos criticos con seguimiento
- Portal para familias del residente con visitas y signos recientes
- Gestion de equipo con permisos granulares por funcionario
- Importacion masiva via Excel con validadores nativos
- Cuenta demo real con 30 dias de prueba gratuita

## Matriz DS 20

${articleLines}

## Rutas publicas

${routeLines}

## Articulos publicados

${postLines}

## Marco regulatorio (Chile)

- Decreto N 20 MINSAL: reglamento vigente para ELEAM, con enfoque de derechos, autorizacion sanitaria, direccion tecnica, dotacion, infraestructura, protocolos, programa integral, registros, fiscalizacion y transitorios.
- Ley N 20.584: derechos y deberes de los pacientes, incluyendo derecho a la informacion y acceso al historial clinico.
- Ley N 19.628: proteccion de datos personales. Aplica al tratamiento de datos sensibles de salud de residentes.
- SENAMA y SEREMI de Salud: organismos relacionados con supervision, reportes y fiscalizacion de ELEAM.

## Glosario

- ELEAM: Establecimiento de Larga Estadia para Personas Mayores.
- SEREMI: Secretaria Regional Ministerial de Salud. Autoriza, supervisa y fiscaliza ELEAM.
- Carpeta SEREMI DS 20: conjunto de documentos, registros operativos y evidencias exigibles por articulo.
- Ficha clinica: registro digital de la historia clinica de cada residente (diagnosticos, medicamentos, signos vitales y observaciones).
- Indice de Barthel: escala de valoracion funcional 0-100 para personas mayores.
- Nivel de dependencia: clasificacion segun Barthel: leve (61-99), moderado (41-60), severo (21-40), total (0-20).
- Kardex / eMAR: registro de administracion de medicamentos por residente; eMAR es la version electronica con historial inmutable.
- Programa de atencion integral usuaria: plan operativo vivo que ordena objetivos, cuidados, actividades y seguimiento.
- HACCP: analisis de peligros y puntos criticos de control para la operacion de cocina.
- Turno: manana, tarde o noche.

## Como solicitar el demo gratuito

1. Completa el formulario en ${ORIGIN} o escribe por WhatsApp al +56 9 5118 7764.
2. El equipo de FichaEleam revisa cada solicitud y responde en menos de 24 horas.
3. Recibes por correo un enlace de acceso a una cuenta real con 30 dias de prueba sin costo y sin tarjeta de credito.
4. Despues de los 30 dias eliges el plan segun el numero de residentes y pagas con MercadoPago.
`;
}

function buildNotFoundHtml(template) {
  return renderPage(template, {
    path: "/404",
    title: "Pagina no encontrada · FichaEleam",
    description: "La URL solicitada no existe en FichaEleam. Revisa las rutas publicas o vuelve al inicio.",
    image: MARKETING_IMAGES.home,
    imageAlt: "FichaEleam para ELEAM en Chile",
    noIndex: true,
    jsonLd: breadcrumbJsonLd([{ name: "Inicio", url: "/" }, { name: "Pagina no encontrada", url: "/404" }]),
    rootHtml: `<main class="seo-prerender"><h1>Pagina no encontrada</h1><p class="article-summary">Esta URL no existe o cambio de ubicacion.</p><p><a href="/">Volver al inicio</a> &middot; <a href="/blog">Ver blog</a> &middot; <a href="/acreditacion-seremi">Carpeta SEREMI DS 20</a></p></main>`,
  });
}

function escapeRewriteSegment(route) {
  return route.replace(/^\/+/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildHtaccess() {
  const privatePattern = PRIVATE_NOINDEX_ROUTES.map(escapeRewriteSegment).join("|");
  return `Options -Indexes
DirectoryIndex index.html
ErrorDocument 404 /404.html

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTPS} off
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteRule ^blog/ds-14-2017-fiscalizacion-seremi-eleam/?$ /blog/decreto-20-fiscalizacion-seremi-eleam/ [R=301,L]
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
  RewriteRule ^(${privatePattern})(/.*)?$ /index.html [L]
  RewriteRule . - [R=404,L]
</IfModule>

<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "DENY"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
  Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
  Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src-elem 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.mercadopago.com https://*.mercadopago.cl https://*.mercadopago.com.ar https://*.mercadopago.com.br https://*.mercadopago.com.mx https://*.mercadopago.com.co https://*.mercadopago.com.pe https://*.mercadopago.com.uy https://api.mercadopago.com; frame-src 'self' https://*.mercadopago.com https://*.mercadopago.cl https://*.mercadopago.com.ar https://*.mercadopago.com.br https://*.mercadopago.com.mx https://*.mercadopago.com.co https://*.mercadopago.com.pe https://*.mercadopago.com.uy; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://*.mercadopago.com https://*.mercadopago.cl https://*.mercadopago.com.ar https://*.mercadopago.com.br https://*.mercadopago.com.mx https://*.mercadopago.com.co https://*.mercadopago.com.pe https://*.mercadopago.com.uy; object-src 'none'; manifest-src 'self'"
  SetEnvIf Request_URI "^/(assets|marketing)/" long_cache
  SetEnvIf Request_URI "^/(${privatePattern})(/|$)" noindex_route
  Header always set X-Robots-Tag "noindex, nofollow" env=noindex_route
  Header always set Cache-Control "max-age=31536000, immutable" env=long_cache
  <FilesMatch "^(index\\.html|404\\.html|robots\\.txt|sitemap\\.xml|llms\\.txt)$">
    Header always set Cache-Control "no-cache, no-store, must-revalidate"
    Header always set Pragma "no-cache"
    Header always set Expires "0"
  </FilesMatch>
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml text/plain application/xml
</IfModule>
`;
}

function main() {
  if (!existsSync(TEMPLATE_PATH)) {
    throw new Error("dist/index.html no existe. Ejecuta vite build antes del postbuild SEO.");
  }
  if (!existsSync(OG_PUBLIC)) createOgImage(OG_PUBLIC);
  copyFileSync(OG_PUBLIC, OG_DIST);

  const template = readFileSync(TEMPLATE_PATH, "utf8");
  const posts = loadBlogPosts();
  cleanPrerenderTargets();

  writeRoute("/", renderPage(template, {
    path: "/",
    title: BASE_TITLE,
    description: BASE_DESCRIPTION,
    image: MARKETING_IMAGES.home,
    imageAlt: "Directora de ELEAM usando FichaEleam con dashboard y soporte",
    jsonLd: softwareJsonLd(),
    rootHtml: buildLandingHtml(),
  }));

  writeRoute("/pago", renderPage(template, {
    path: "/pago",
    title: "Planes y precios FichaEleam",
    description: "Planes mensuales para ELEAM en Chile con cupos claros de residentes y funcionarios, pago por MercadoPago y opción institucional.",
    image: MARKETING_IMAGES.software,
    imageAlt: "Dashboard de FichaEleam para planes y precios de ELEAM",
    jsonLd: softwareJsonLd(),
    rootHtml: buildPaymentHtml(),
  }));

  writeRoute("/acreditacion-seremi", renderPage(template, {
    path: "/acreditacion-seremi",
    title: "Carpeta SEREMI DS 20 para ELEAM · FichaEleam",
    description: "Guía actualizada de Carpeta SEREMI DS 20 para ELEAM en Chile: artículos, evidencia, vigencias, transitorios y modo fiscalización.",
    image: MARKETING_IMAGES.seremi,
    imageAlt: "Comparativa de carpeta SEREMI fisica y digital en FichaEleam",
    jsonLd: [
      breadcrumbJsonLd([{ name: "Inicio", url: "/" }, { name: "Acreditación SEREMI", url: "/acreditacion-seremi" }]),
      faqPageJsonLd(SEREMI_FAQ),
      howToJsonLd({
        name: "Cómo preparar la Carpeta SEREMI DS 20 de un ELEAM en Chile",
        description: "Pasos para organizar evidencia documental y operativa del Decreto N°20 y mantener una carpeta fiscalizable.",
        totalTime: "P30D",
        steps: SEREMI_STEPS,
      }),
    ],
    rootHtml: buildAcreditacionHtml(),
  }));

  writeRoute("/software-eleam", renderPage(template, {
    path: "/software-eleam",
    title: "Software para ELEAM en Chile · Gestión clínica y SEREMI",
    description: "Software web especializado para ELEAM en Chile: ficha clínica digital, signos vitales, eMAR, observaciones, programa integral usuaria y Carpeta SEREMI DS 20.",
    image: MARKETING_IMAGES.software,
    imageAlt: "Dashboard clinico de FichaEleam con signos vitales y ficha de residente",
    jsonLd: [
      breadcrumbJsonLd([{ name: "Inicio", url: "/" }, { name: "Software para ELEAM", url: "/software-eleam" }]),
      faqPageJsonLd(SOFTWARE_FAQ),
      softwareJsonLd(),
    ],
    rootHtml: buildSoftwareHtml(),
  }));

  writeRoute("/calculadora-dotacion-eleam", renderPage(template, {
    path: "/calculadora-dotacion-eleam",
    title: "Calculadora de dotación de personal para ELEAM · Decreto N°20",
    description: "Calcula la dotación mínima de cuidadores y TENS de tu ELEAM según el Decreto N°20 (Arts. 15-17): turno diurno, nocturno, mínimo 2 nocturnos y brecha.",
    image: MARKETING_IMAGES.shift,
    imageAlt: "Equipo de un ELEAM en entrega de turno con FichaEleam",
    jsonLd: [
      breadcrumbJsonLd([{ name: "Inicio", url: "/" }, { name: "Calculadora de dotación", url: "/calculadora-dotacion-eleam" }]),
      faqPageJsonLd(CALCULADORA_FAQ),
      howToJsonLd({
        name: "Cómo calcular la dotación de personal de un ELEAM según el Decreto N°20",
        description: "Pasos para estimar los cuidadores y el apoyo técnico de enfermería mínimos por turno.",
        steps: CALCULADORA_STEPS,
      }),
      calculatorAppJsonLd(),
    ],
    rootHtml: buildCalculadoraHtml(),
  }));

  writeRoute("/preguntas-frecuentes", renderPage(template, {
    path: "/preguntas-frecuentes",
    title: "Preguntas frecuentes · FichaEleam",
    description: "Preguntas frecuentes sobre FichaEleam: precios, planes, demo gratuito, implementación, seguridad de datos, equipo y permisos, soporte. Software para ELEAM en Chile.",
    image: MARKETING_IMAGES.shift,
    imageAlt: "Equipo clinico usando FichaEleam en entrega de turno",
    jsonLd: [
      breadcrumbJsonLd([{ name: "Inicio", url: "/" }, { name: "Preguntas frecuentes", url: "/preguntas-frecuentes" }]),
      faqPageJsonLd(ALL_FAQ),
    ],
    rootHtml: buildFaqHtml(),
  }));

  writeRoute("/contacto", renderPage(template, {
    path: "/contacto",
    title: "Contacto · FichaEleam",
    description: "Contacto FichaEleam: correo contacto@fichaeleam.cl, WhatsApp +56 9 5118 7764 y solicitud de demo gratuito. Software para ELEAM en Chile.",
    image: MARKETING_IMAGES.home,
    imageAlt: "Contacto y demo de FichaEleam para ELEAM en Chile",
    jsonLd: [
      breadcrumbJsonLd([{ name: "Inicio", url: "/" }, { name: "Contacto", url: "/contacto" }]),
      contactPageJsonLd(),
    ],
    rootHtml: buildContactoHtml(),
  }));

  writeRoute("/blog", renderPage(template, {
    path: "/blog",
    title: "Blog FichaEleam · Recursos para ELEAM en Chile",
    description: "Guías prácticas sobre Decreto N°20, fiscalización SEREMI, registros clínicos, trazabilidad y operación diaria de ELEAM en Chile.",
    image: MARKETING_IMAGES.shift,
    imageAlt: "Blog de FichaEleam para gestion de ELEAM en Chile",
    jsonLd: blogListJsonLd(posts),
    rootHtml: buildBlogHtml(posts),
  }));

  for (const post of posts) {
    const description = post.meta_description || post.resumen || stripMarkdown(post.contenido_md).slice(0, 155);
    writeRoute(`/blog/${post.slug}`, renderPage(template, {
      path: `/blog/${post.slug}`,
      title: post.meta_title || `${post.titulo} · FichaEleam`,
      description,
      type: "article",
      image: postImage(post),
      imageAlt: post.cover_alt || post.titulo,
      article: {
        published: post.publicado_en,
        modified: post.publicado_en,
        section: articleSection(post),
        author: post.autor_nombre,
        tags: post.keywords,
      },
      jsonLd: [
        postJsonLd(post),
        breadcrumbJsonLd([
          { name: "Inicio", url: "/" },
          { name: "Blog", url: "/blog" },
          { name: post.titulo, url: `/blog/${post.slug}` },
        ]),
      ],
      rootHtml: buildPostHtml(post, posts),
    }));
  }

  writeFileSync(join(DIST, "robots.txt"), buildRobots());
  writeFileSync(join(DIST, "sitemap.xml"), buildSitemap(posts));
  writeFileSync(join(DIST, "llms.txt"), buildLlms(posts));
  writeFileSync(join(DIST, "404.html"), buildNotFoundHtml(template));
  writeFileSync(join(DIST, ".htaccess"), buildHtaccess());

  console.log(`SEO postbuild listo: ${posts.length} posts prerenderizados para ${ORIGIN}`);
}

main();
