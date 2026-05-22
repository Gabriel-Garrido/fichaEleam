import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createOgImage } from "./create-og-image.mjs";
import { PUBLIC_PLAN_CATALOG, formatPlanPrice } from "../src/features/payment/planCatalog.js";

const ORIGIN = "https://fichaeleam.cl";
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = join(ROOT, "dist");
const PUBLIC = join(ROOT, "public");
const TEMPLATE_PATH = join(DIST, "index.html");
const OG_PUBLIC = join(PUBLIC, "og-image.png");
const OG_DIST = join(DIST, "og-image.png");

const BASE_TITLE = "FichaEleam · Software para ELEAM en Chile";
const BASE_DESCRIPTION =
  "FichaEleam digitaliza la gestión clínica y documental de ELEAM en Chile: fichas, signos vitales, observaciones, Carpeta SEREMI DS 14/2017 y portal familiar.";

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

function renderPage(template, { path, title, description, type = "website", jsonLd, rootHtml }) {
  const url = `${ORIGIN}${path === "/" ? "/" : path}`;
  let html = template;
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = setMeta(html, "description", description);
  html = setCanonical(html, url);
  html = setProperty(html, "og:type", type);
  html = setProperty(html, "og:url", url);
  html = setProperty(html, "og:title", title);
  html = setProperty(html, "og:description", description);
  html = setProperty(html, "og:image", `${ORIGIN}/og-image.png`);
  html = setMeta(html, "twitter:title", title);
  html = setMeta(html, "twitter:description", description);
  html = setMeta(html, "twitter:image", `${ORIGIN}/og-image.png`);
  html = html.replace(
    "</head>",
    `    <style id="fichaeleam-prerender-style">.seo-prerender{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:980px;margin:0 auto;padding:40px 20px;color:#0f172a;line-height:1.65}.seo-prerender h1{font-size:clamp(2rem,5vw,4rem);line-height:1.05;margin:0 0 16px}.seo-prerender h2{margin-top:32px}.seo-prerender a{color:#0f766e}.seo-prerender .grid{display:grid;gap:16px}.seo-prerender .card{border:1px solid #e2e8f0;border-radius:14px;padding:18px;background:#fff}.seo-prerender img{max-width:100%;height:auto}</style>\n    ${jsonLdScript(jsonLd)}\n  </head>`,
  );
  return html.replace('<div id="root"></div>', `<div id="root">\n${rootHtml}\n    </div>`);
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

function buildLandingHtml() {
  const plans = PUBLIC_PLAN_CATALOG.map((plan) => (
    `<li><strong>${escapeHtml(plan.label)}</strong>: ${escapeHtml(formatPlanPrice(plan))} + IVA, hasta ${plan.max_residentes} residentes activos u hospitalizados y ${plan.max_funcionarios} funcionarios.</li>`
  )).join("");
  return `<main class="seo-prerender">
      <h1>FichaEleam &middot; Software para ELEAM en Chile</h1>
      <p class="article-summary">${escapeHtml(BASE_DESCRIPTION)}</p>

      <h2>Qu&eacute; resuelve FichaEleam</h2>
      <ul>
        <li><strong>Ficha cl&iacute;nica digital</strong>: diagn&oacute;sticos, alergias, medicamentos, &iacute;ndice de Barthel y nivel de dependencia por residente.</li>
        <li><strong>Signos vitales con alertas</strong>: rangos cl&iacute;nicos validados para adulto mayor; alerta inmediata ante valores cr&iacute;ticos.</li>
        <li><strong>Observaciones de turno</strong>: 12 categor&iacute;as con seguimiento obligatorio (ca&iacute;das, medicamentos, alimentaci&oacute;n, higiene, etc.).</li>
        <li><strong>Carpeta SEREMI DS 14/2017</strong>: los 14 &aacute;mbitos y m&aacute;s de 70 requisitos pre-cargados. Sub&iacute; evidencias con vencimiento; el sistema avisa 30 d&iacute;as antes.</li>
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
      <p>FichaEleam cumple con el <strong>DS 14/2017</strong> del MINSAL, la <strong>Ley N&deg;20.584</strong> sobre derechos del paciente y la <strong>Ley N&deg;19.628</strong> sobre protecci&oacute;n de datos personales en Chile.</p>

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
      <div class="grid">${cards}<article class="card"><h2>Institucional</h2><p><strong>Cotizaci&oacute;n personalizada</strong></p><p>Para ELEAM con 35 o m&aacute;s residentes y cupos a medida. Cont&aacute;ctanos por WhatsApp al +56 9 5118 7764.</p></article></div>

      <h2>Qu&eacute; incluye cada plan</h2>
      <ul>
        <li>Ficha cl&iacute;nica digital de cada residente.</li>
        <li>Signos vitales con rangos cl&iacute;nicos validados para adulto mayor y alertas autom&aacute;ticas.</li>
        <li>12 tipos de observaciones diarias con seguimiento obligatorio.</li>
        <li>Carpeta SEREMI DS 14/2017 con los 14 &aacute;mbitos y m&aacute;s de 70 requisitos pre-cargados.</li>
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

function buildBlogHtml(posts) {
  const items = posts.map((post) => (
    `<article class="card"><h2><a href="/blog/${escapeHtml(post.slug)}">${escapeHtml(post.titulo)}</a></h2><p>${escapeHtml(post.resumen)}</p><p>${post.tiempo_lectura_min} min · ${escapeHtml(post.autor_nombre)}</p></article>`
  )).join("");
  return `<main class="seo-prerender">
      <h1>Blog FichaEleam</h1>
      <p>Recursos prácticos para directores y equipos de ELEAM en Chile: DS 14/2017, fiscalización SEREMI, fichas clínicas, trazabilidad y operación diaria.</p>
      <div class="grid">${items}</div>
    </main>`;
}

function buildPostHtml(post) {
  return `<main class="seo-prerender">
      <article>
        <p>${post.tiempo_lectura_min} min · ${escapeHtml(post.autor_nombre)}</p>
        <h1>${escapeHtml(post.titulo)}</h1>
        <p><strong>${escapeHtml(post.resumen)}</strong></p>
        ${markdownToHtml(post.contenido_md)}
      </article>
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
    image: `${ORIGIN}/og-image.png`,
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

function blogListJsonLd(posts) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Blog FichaEleam",
    url: `${ORIGIN}/blog`,
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.titulo,
      url: `${ORIGIN}/blog/${post.slug}`,
      datePublished: post.publicado_en,
      author: { "@type": "Organization", name: post.autor_nombre },
    })),
  };
}

function postJsonLd(post) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.titulo,
    description: post.meta_description || post.resumen,
    url: `${ORIGIN}/blog/${post.slug}`,
    image: `${ORIGIN}/og-image.png`,
    datePublished: post.publicado_en,
    dateModified: post.publicado_en,
    author: { "@type": "Organization", name: post.autor_nombre },
    publisher: { "@type": "Organization", name: "FichaEleam", logo: { "@type": "ImageObject", url: `${ORIGIN}/og-image.png` } },
    mainEntityOfPage: `${ORIGIN}/blog/${post.slug}`,
    keywords: post.keywords.join(", "),
  };
}

function buildRobots() {
  return `# FichaEleam - robots.txt
# Software de gestion clinica y acreditacion SEREMI para ELEAM en Chile.
# ${ORIGIN}

User-agent: *
Allow: /
Allow: /blog
Allow: /pago
Allow: /og-image.png
Allow: /favicon.svg

Disallow: /dashboard
Disallow: /residents
Disallow: /vital-signs
Disallow: /observations
Disallow: /accreditation
Disallow: /equipo
Disallow: /superadmin
Disallow: /familiar
Disallow: /turnos
Disallow: /permisos
Disallow: /camas
Disallow: /pago/return
Disallow: /reset-password
Disallow: /cambiar-clave
Disallow: /recuperar-acceso
Disallow: /login

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
  const urls = [
    { loc: "/", priority: "1.0", changefreq: "weekly", lastmod: today },
    { loc: "/blog", priority: "0.9", changefreq: "daily", lastmod: today },
    { loc: "/pago", priority: "0.8", changefreq: "monthly", lastmod: today },
    ...posts.map((post) => ({
      loc: `/blog/${post.slug}`,
      priority: post.destacado ? "0.85" : "0.75",
      changefreq: "monthly",
      lastmod: post.publicado_en.slice(0, 10),
    })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${escapeXml(`${ORIGIN}${url.loc}`)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join("\n")}
</urlset>
`;
}

function buildLlms(posts) {
  const planLines = PUBLIC_PLAN_CATALOG.map(
    (plan) => `- ${plan.label}: ${formatPlanPrice(plan)} CLP + IVA al mes, hasta ${plan.max_residentes} residentes activos u hospitalizados y ${plan.max_funcionarios} funcionarios.`,
  ).join("\n");
  const postLines = posts.map((post) => (
    `- [${post.titulo}](${ORIGIN}/blog/${post.slug}): ${post.resumen}`
  )).join("\n");
  return `# FichaEleam

> Software de gestion clinica y acreditacion SEREMI para ELEAM (Establecimientos de Larga Estadia para Adultos Mayores) en Chile.

FichaEleam es el unico software disenado exclusivamente para ELEAM en Chile. Cubre los 14 ambitos del DS 14/2017 con fichas clinicas digitales, signos vitales con alertas clinicas para adultos mayores, observaciones de turno con 12 categorias, carpeta SEREMI lista para fiscalizacion, gestion de habitaciones y camas, eMAR (kardex electronico de medicamentos) y portal de acceso para familias de residentes.

**Web**: ${ORIGIN}
**Blog**: ${ORIGIN}/blog
**Planes y precios**: ${ORIGIN}/pago
**Demo gratuito**: formulario en ${ORIGIN} (aprobacion en menos de 24 horas)
**Email**: contacto@fichaeleam.cl
**WhatsApp**: +56 9 5118 7764 (https://wa.me/56951187764)

## Planes comerciales

${planLines}
- Institucional (35+ residentes): cotizacion personalizada por WhatsApp, cupos a medida.

Los residentes activos y hospitalizados consumen cupo. Residentes egresados o fallecidos no consumen cupo. Los funcionarios creados y las invitaciones pendientes de funcionarios consumen cupo; familiares no consumen cupo de funcionarios. Pago mensual con MercadoPago.

## Funcionalidades principales

- Ficha clinica digital de residentes (diagnosticos, alergias, medicamentos, indice de Barthel, dependencia)
- Signos vitales por turno con rangos clinicos para adulto mayor y alertas criticas
- 12 tipos de observaciones de turno con seguimiento obligatorio
- Carpeta SEREMI DS 14/2017 (14 ambitos y +70 requisitos pre-cargados) con vencimientos y export imprimible
- Gestion de habitaciones y camas con historial de ocupacion
- eMAR (kardex electronico) con historial inmutable y control de stock
- Plan de cuidado con tareas por turno
- Portal para familias del residente con visitas y signos recientes
- Gestion de equipo con permisos granulares por funcionario
- Importacion masiva via Excel con validadores nativos
- Cuenta demo real con 30 dias de prueba gratuita

## Rutas publicas

- [Inicio](${ORIGIN}/): producto, demo gratuito, funcionalidades y precios.
- [Planes y precios](${ORIGIN}/pago): checkout MercadoPago y detalle de cupos.
- [Blog FichaEleam](${ORIGIN}/blog): recursos para ELEAM en Chile.

## Articulos publicados

${postLines}

## Marco regulatorio (Chile)

- DS 14/2017: reglamento de ELEAM del Ministerio de Salud. Los 14 ambitos y +70 requisitos vienen pre-cargados en FichaEleam.
- Ley N 20.584: derechos y deberes de los pacientes, incluyendo derecho a la informacion y acceso al historial clinico.
- Ley N 19.628: proteccion de datos personales. Aplica al tratamiento de datos sensibles de salud de residentes.
- SENAMA y SEREMI de Salud: organismos que supervisan y fiscalizan los ELEAM en cada region.

## Glosario

- ELEAM: Establecimiento de Larga Estadia para Adultos Mayores.
- SEREMI: Secretaria Regional Ministerial de Salud. Fiscaliza y acredita los ELEAM.
- DS 14/2017: Decreto Supremo del MINSAL. Define los 14 ambitos de acreditacion.
- Indice de Barthel: escala de valoracion funcional 0-100 del adulto mayor.
- Kardex / eMAR: registro de administracion de medicamentos por residente.
- Turno: manana, tarde o noche.
`;
}

function buildHtaccess() {
  return `Options -Indexes
DirectoryIndex index.html

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTPS} off
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
  RewriteRule . /index.html [L]
</IfModule>

<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "DENY"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
  Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
  Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src-elem 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.mercadopago.com https://*.mercadopago.cl https://*.mercadopago.com.ar https://*.mercadopago.com.br https://*.mercadopago.com.mx https://*.mercadopago.com.co https://*.mercadopago.com.pe https://*.mercadopago.com.uy https://api.mercadopago.com; frame-src 'self' https://*.mercadopago.com https://*.mercadopago.cl https://*.mercadopago.com.ar https://*.mercadopago.com.br https://*.mercadopago.com.mx https://*.mercadopago.com.co https://*.mercadopago.com.pe https://*.mercadopago.com.uy; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://*.mercadopago.com https://*.mercadopago.cl https://*.mercadopago.com.ar https://*.mercadopago.com.br https://*.mercadopago.com.mx https://*.mercadopago.com.co https://*.mercadopago.com.pe https://*.mercadopago.com.uy; object-src 'none'; manifest-src 'self'"
  SetEnvIf Request_URI "^/assets/" long_cache
  Header always set Cache-Control "max-age=31536000, immutable" env=long_cache
  <FilesMatch "^(index\\.html|robots\\.txt|sitemap\\.xml|llms\\.txt)$">
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

  writeRoute("/", renderPage(template, {
    path: "/",
    title: BASE_TITLE,
    description: BASE_DESCRIPTION,
    jsonLd: softwareJsonLd(),
    rootHtml: buildLandingHtml(),
  }));

  writeRoute("/pago", renderPage(template, {
    path: "/pago",
    title: "Planes y precios FichaEleam",
    description: "Planes mensuales para ELEAM en Chile con cupos claros de residentes y funcionarios, pago por MercadoPago y opción institucional.",
    jsonLd: softwareJsonLd(),
    rootHtml: buildPaymentHtml(),
  }));

  writeRoute("/blog", renderPage(template, {
    path: "/blog",
    title: "Blog FichaEleam · Recursos para ELEAM en Chile",
    description: "Guías prácticas sobre DS 14/2017, fiscalización SEREMI, registros clínicos, trazabilidad y operación diaria de ELEAM en Chile.",
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
      jsonLd: postJsonLd(post),
      rootHtml: buildPostHtml(post),
    }));
  }

  writeFileSync(join(DIST, "robots.txt"), buildRobots());
  writeFileSync(join(DIST, "sitemap.xml"), buildSitemap(posts));
  writeFileSync(join(DIST, "llms.txt"), buildLlms(posts));
  writeFileSync(join(DIST, ".htaccess"), buildHtaccess());

  console.log(`SEO postbuild listo: ${posts.length} posts prerenderizados para ${ORIGIN}`);
}

main();
