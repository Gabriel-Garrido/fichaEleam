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

function buildAcreditacionHtml() {
  return `<main class="seo-prerender">
      <nav aria-label="Breadcrumb"><a href="/">Inicio</a> &middot; Acreditaci&oacute;n SEREMI</nav>
      <h1>Acreditaci&oacute;n SEREMI para tu ELEAM &middot; Gu&iacute;a DS 14/2017</h1>
      <p class="article-summary">Todo lo que un director o administrador de un Establecimiento de Larga Estad&iacute;a para Adultos Mayores debe saber sobre los 14 &aacute;mbitos, los 70+ requisitos, los plazos de vencimiento y c&oacute;mo llegar a la fiscalizaci&oacute;n con la carpeta al d&iacute;a.</p>

      <h2>&iquest;Qu&eacute; es la acreditaci&oacute;n SEREMI?</h2>
      <p>La Secretar&iacute;a Regional Ministerial de Salud (SEREMI) es la autoridad sanitaria que autoriza, supervisa y fiscaliza los ELEAM en Chile. Su marco normativo es el Decreto Supremo N&deg; 14 de 2017 del Ministerio de Salud.</p>

      <h2>Los 14 &aacute;mbitos del DS 14/2017</h2>
      <ol>
        <li><strong>A01 Antecedentes legales</strong>: constituci&oacute;n, vigencia, RUT, representante legal.</li>
        <li><strong>A02 Autorizaci&oacute;n sanitaria</strong>: resoluci&oacute;n SEREMI, permisos municipales, recepci&oacute;n final.</li>
        <li><strong>A03 Infraestructura y condiciones sanitarias</strong>: planos, electricidad SEC, gas, agua potable, ascensores, calderas.</li>
        <li><strong>A04 Seguridad y evacuaci&oacute;n</strong>: plan de emergencia, extintores, simulacros, se&ntilde;al&eacute;tica y luces.</li>
        <li><strong>A05 Direcci&oacute;n t&eacute;cnica</strong>: director t&eacute;cnico, contrato y aceptaci&oacute;n SEREMI.</li>
        <li><strong>A06 Personal y dotaci&oacute;n</strong>: n&oacute;mina, contratos, t&iacute;tulos, salud y capacitaciones.</li>
        <li><strong>A07 Protocolos obligatorios</strong>: PCI, lavado de manos, medicamentos, residuos, emergencias.</li>
        <li><strong>A08 Residentes y carpetas personales</strong>: fichas, evaluaciones Barthel/MMSE, planes individualizados.</li>
        <li><strong>A09 Contratos y derechos</strong>: contrato de residencia, consentimientos, carta de derechos.</li>
        <li><strong>A10 Medicamentos y registros</strong>: inventario, kardex, recetas, controlados, QF asesor.</li>
        <li><strong>A11 Alimentaci&oacute;n y manipulaci&oacute;n</strong>: minutas, manipuladores, HACCP, dietas especiales.</li>
        <li><strong>A12 Aseo, lavander&iacute;a y plagas</strong>: programas y bit&aacute;coras de aseo, lavander&iacute;a, residuos, plagas.</li>
        <li><strong>A13 Reclamos y comunicaci&oacute;n</strong>: libro de reclamos, sugerencias, reuniones con familias.</li>
        <li><strong>A14 Fiscalizaciones y subsanaciones</strong>: actas, plan de subsanaci&oacute;n, comunicaciones con SEREMI.</li>
      </ol>

      <h2>C&oacute;mo preparar la carpeta SEREMI</h2>
      <ol>
        <li>Re&uacute;ne los antecedentes legales (A01).</li>
        <li>Obt&eacute;n la autorizaci&oacute;n sanitaria (A02).</li>
        <li>Acredita infraestructura, seguridad y servicios (A03&ndash;A04).</li>
        <li>Designa direcci&oacute;n t&eacute;cnica y dotaci&oacute;n (A05&ndash;A06).</li>
        <li>Documenta protocolos obligatorios (A07).</li>
        <li>Arma carpetas individuales por residente (A08&ndash;A09).</li>
        <li>Controla medicamentos y alimentaci&oacute;n (A10&ndash;A11).</li>
        <li>Operaci&oacute;n diaria: aseo, comunicaci&oacute;n y fiscalizaciones (A12&ndash;A14).</li>
      </ol>

      <h2>Documentos que se vencen</h2>
      <ul>
        <li>Resoluci&oacute;n sanitaria de funcionamiento: anual.</li>
        <li>Vigencia de la persona jur&iacute;dica: 180 d&iacute;as.</li>
        <li>Certificado de instalaci&oacute;n el&eacute;ctrica SEC: 3 a&ntilde;os.</li>
        <li>Informe de potabilidad del agua: anual.</li>
        <li>Fumigaci&oacute;n y desratizaci&oacute;n: 180 d&iacute;as.</li>
        <li>Certificado de extintores: anual.</li>
        <li>Simulacros de evacuaci&oacute;n: 180 d&iacute;as.</li>
        <li>Credencial del director t&eacute;cnico: anual.</li>
        <li>Evaluaci&oacute;n Barthel del residente: 180 d&iacute;as.</li>
        <li>Plan de cuidado individualizado: 180 d&iacute;as.</li>
        <li>Minuta alimentaria visada: 30 d&iacute;as.</li>
        <li>Bit&aacute;cora HACCP de temperaturas: 30 d&iacute;as.</li>
      </ul>

      <h2>C&oacute;mo FichaEleam digitaliza tu acreditaci&oacute;n</h2>
      <p>14 &aacute;mbitos y 70+ requisitos pre-cargados, versiones de cada documento, alertas 30 d&iacute;as antes del vencimiento, estados claros por requisito, observaciones de fiscalizaci&oacute;n con plazo y responsable, auditor&iacute;a inmutable, permisos por funcionario y export imprimible.</p>

      <p><a href="/software-eleam">Ver software para ELEAM</a> &middot; <a href="/preguntas-frecuentes">Preguntas frecuentes</a> &middot; <a href="/pago">Planes y precios</a> &middot; <a href="/contacto">Contacto</a></p>
    </main>`;
}

function buildSoftwareHtml() {
  return `<main class="seo-prerender">
      <nav aria-label="Breadcrumb"><a href="/">Inicio</a> &middot; Software para ELEAM</nav>
      <h1>Software para ELEAM en Chile</h1>
      <p class="article-summary">Ficha cl&iacute;nica digital, signos vitales con alertas, eMAR, plan de cuidado, observaciones de turno y carpeta SEREMI &mdash; en una sola plataforma construida exclusivamente para Establecimientos de Larga Estad&iacute;a para Adultos Mayores en Chile.</p>

      <h2>Excel y papel vs FichaEleam</h2>
      <ul>
        <li><strong>Ficha cl&iacute;nica con historial</strong>: Excel no tiene trazabilidad; FichaEleam audita cada cambio.</li>
        <li><strong>Signos vitales</strong>: rangos cl&iacute;nicos validados para adulto mayor con alertas cr&iacute;ticas.</li>
        <li><strong>Observaciones por turno</strong>: 12 categor&iacute;as con seguimiento obligatorio y b&uacute;squeda.</li>
        <li><strong>Plan de cuidado</strong>: tareas por turno con completaci&oacute;n y notas.</li>
        <li><strong>Medicamentos (eMAR)</strong>: kardex electr&oacute;nico con doble validaci&oacute;n y control de stock.</li>
        <li><strong>Carpeta SEREMI</strong>: 14 &aacute;mbitos pre-cargados con alertas de vencimiento.</li>
        <li><strong>Acceso del equipo</strong>: simult&aacute;neo desde cualquier dispositivo.</li>
        <li><strong>Acceso de familias</strong>: portal con signos recientes y visitas.</li>
        <li><strong>Auditor&iacute;a</strong>: cada cambio queda inmutable.</li>
        <li><strong>Backup</strong>: autom&aacute;tico en la nube.</li>
      </ul>

      <h2>M&oacute;dulos integrados</h2>
      <ul>
        <li>Ficha cl&iacute;nica digital con &iacute;ndice de Barthel y nivel de dependencia.</li>
        <li>Signos vitales por turno con rangos cl&iacute;nicos para adulto mayor.</li>
        <li>12 tipos de observaciones diarias.</li>
        <li>Plan de cuidado con objetivos, pautas y actividades por categor&iacute;a.</li>
        <li>eMAR (kardex electr&oacute;nico) con stock por lote y doble validaci&oacute;n.</li>
        <li>Carpeta SEREMI DS 14/2017 con los 14 &aacute;mbitos y +70 requisitos.</li>
        <li>Habitaciones y camas con historial de ocupaci&oacute;n.</li>
        <li>Portal familiar restringido por residente vinculado.</li>
        <li>Entrega de turno con resumen cl&iacute;nico, eMAR y pendientes.</li>
        <li>Permisos granulares por funcionario.</li>
        <li>Importaci&oacute;n masiva v&iacute;a Excel con validadores nativos.</li>
        <li>Trazabilidad e historial inmutable.</li>
      </ul>

      <h2>Cumplimiento normativo chileno</h2>
      <ul>
        <li><strong>DS 14/2017 del MINSAL</strong>: 14 &aacute;mbitos y +70 requisitos pre-cargados.</li>
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
      ["&iquest;Qu&eacute; es FichaEleam?", "Software web especializado para ELEAM en Chile que centraliza ficha cl&iacute;nica, signos vitales, observaciones, plan de cuidado, eMAR, habitaciones, portal familiar y carpeta SEREMI DS 14/2017."],
      ["&iquest;En qu&eacute; se diferencia de un software gen&eacute;rico?", "Trae los 14 &aacute;mbitos del DS 14/2017 pre-cargados, rangos cl&iacute;nicos para adulto mayor, turnos ma&ntilde;ana/tarde/noche y manejo de controlados con doble validaci&oacute;n."],
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
      ["&iquest;Cumple con la ley chilena?", "S&iacute;. Operamos bajo la Ley N&deg; 19.628 y la Ley N&deg; 20.584."],
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
      ${html}
      <p><a href="/contacto">&iquest;Otra pregunta? Escr&iacute;benos &rarr;</a></p>
    </main>`;
}

function buildContactoHtml() {
  return `<main class="seo-prerender">
      <nav aria-label="Breadcrumb"><a href="/">Inicio</a> &middot; Contacto</nav>
      <h1>Contacto FichaEleam</h1>
      <p class="article-summary">Cont&aacute;ctanos por correo, WhatsApp o solicita una demo gratuita para tu ELEAM en Chile. Respondemos en horario h&aacute;bil con prioridad a casos urgentes.</p>

      <h2>Canales de contacto</h2>
      <ul>
        <li><strong>Demo gratuito</strong>: <a href="/">formulario en fichaeleam.cl</a> &mdash; cuenta real con 30 d&iacute;as de prueba, aprobaci&oacute;n en menos de 24 horas.</li>
        <li><strong>WhatsApp</strong>: <a href="https://wa.me/56951187764">+56 9 5118 7764</a> &mdash; respuesta en minutos en horario h&aacute;bil.</li>
        <li><strong>Correo</strong>: <a href="mailto:contacto@fichaeleam.cl">contacto@fichaeleam.cl</a> &mdash; respuesta en menos de 24 horas.</li>
      </ul>

      <h2>Informaci&oacute;n comercial</h2>
      <ul>
        <li>Producto: Software de gesti&oacute;n cl&iacute;nica y acreditaci&oacute;n SEREMI para ELEAM en Chile.</li>
        <li>Marco normativo: DS 14/2017 (MINSAL), Ley N&deg; 20.584, Ley N&deg; 19.628.</li>
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

function breadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${ORIGIN}${it.url}`,
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

const SEREMI_FAQ = [
  { q: "¿Qué es la acreditación SEREMI de un ELEAM?", a: "Proceso por el cual la SEREMI autoriza y supervisa el funcionamiento de un ELEAM en Chile bajo el DS 14/2017 del MINSAL." },
  { q: "¿Cuáles son los 14 ámbitos del DS 14/2017?", a: "Antecedentes legales, autorización sanitaria, infraestructura, seguridad, dirección técnica, personal, protocolos, residentes, contratos, medicamentos, alimentación, aseo, reclamos, fiscalizaciones." },
  { q: "¿Qué documentos se vencen y hay que renovar?", a: "Resolución sanitaria (anual), vigencia jurídica (180 días), informe de potabilidad (anual), extintores (anual), fumigación (180 días), simulacros (180 días), Barthel (180 días)." },
  { q: "¿Cómo digitalizar la carpeta SEREMI?", a: "Con FichaEleam: 14 ámbitos y 70+ requisitos pre-cargados, evidencias versionadas con alertas de vencimiento y export imprimible." },
];

const SEREMI_STEPS = [
  { name: "Reúne antecedentes legales", text: "Escritura de constitución, vigencia, RUT y poder del representante legal (Ámbito A01)." },
  { name: "Obtén la autorización sanitaria", text: "Resolución SEREMI, CIP municipal, permiso de edificación y recepción final (A02)." },
  { name: "Acredita infraestructura y seguridad", text: "Certificados SEC eléctricos y de gas, agua, plan de emergencia, extintores, simulacros (A03–A04)." },
  { name: "Designa dirección técnica y dotación", text: "Credencial del director técnico, nómina, contratos, certificados de salud (A05–A06)." },
  { name: "Documenta protocolos obligatorios", text: "PCI, lavado de manos, medicamentos, residuos, emergencias clínicas (A07)." },
  { name: "Arma carpetas individuales por residente", text: "Ficha clínica, Barthel, MMSE, PAI, contrato de residencia, carta de derechos (A08–A09)." },
  { name: "Controla medicamentos y alimentación", text: "Inventario, kardex, controlados, QF asesor, minutas HACCP, manipuladores (A10–A11)." },
  { name: "Operación diaria y fiscalizaciones", text: "Aseo, lavandería, residuos, plagas, reclamos, comunicación con familias, actas SEREMI (A12–A14)." },
];

const SOFTWARE_FAQ = [
  { q: "¿Por qué un software especializado y no Excel?", a: "Excel no tiene trazabilidad. FichaEleam fue construido exclusivamente para ELEAM en Chile: 14 ámbitos pre-cargados, rangos clínicos para adulto mayor, turnos mañana/tarde/noche, controlados con doble validación." },
  { q: "¿Cuánto cuesta?", a: "Tres planes mensuales en CLP + IVA: $50.000 (14 residentes), $80.000 (24), $120.000 (34). Institucional 35+ a cotización." },
  { q: "¿Es seguro guardar datos de residentes en la nube?", a: "Sí. Aislamiento por ELEAM con Row Level Security, encriptación en tránsito y reposo, cumple con la Ley N° 19.628 y la Ley N° 20.584." },
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
Allow: /acreditacion-seremi
Allow: /software-eleam
Allow: /preguntas-frecuentes
Allow: /contacto
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
    { loc: "/acreditacion-seremi", priority: "0.95", changefreq: "monthly", lastmod: today },
    { loc: "/software-eleam", priority: "0.95", changefreq: "monthly", lastmod: today },
    { loc: "/blog", priority: "0.9", changefreq: "daily", lastmod: today },
    { loc: "/preguntas-frecuentes", priority: "0.85", changefreq: "monthly", lastmod: today },
    { loc: "/pago", priority: "0.85", changefreq: "monthly", lastmod: today },
    { loc: "/contacto", priority: "0.7", changefreq: "monthly", lastmod: today },
    ...posts.map((post) => ({
      loc: `/blog/${post.slug}`,
      priority: post.destacado ? "0.8" : "0.7",
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
- [Software para ELEAM](${ORIGIN}/software-eleam): comparativa con Excel/papel, modulos integrados, cumplimiento normativo y FAQ.
- [Acreditacion SEREMI](${ORIGIN}/acreditacion-seremi): guia DS 14/2017 con los 14 ambitos, vencimientos tipicos y pasos para preparar la carpeta.
- [Preguntas frecuentes](${ORIGIN}/preguntas-frecuentes): respuestas sobre producto, precios, demo, implementacion, seguridad, equipo y soporte.
- [Planes y precios](${ORIGIN}/pago): checkout MercadoPago y detalle de cupos.
- [Blog FichaEleam](${ORIGIN}/blog): recursos para ELEAM en Chile.
- [Contacto](${ORIGIN}/contacto): canales (correo, WhatsApp, demo) e informacion comercial.

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

  writeRoute("/acreditacion-seremi", renderPage(template, {
    path: "/acreditacion-seremi",
    title: "Acreditación SEREMI ELEAM · Guía DS 14/2017 actualizada",
    description: "Guía completa de acreditación SEREMI para ELEAM en Chile: los 14 ámbitos del DS 14/2017, requisitos, vencimientos y cómo preparar tu carpeta SEREMI sin sorpresas.",
    jsonLd: [
      breadcrumbJsonLd([{ name: "Inicio", url: "/" }, { name: "Acreditación SEREMI", url: "/acreditacion-seremi" }]),
      faqPageJsonLd(SEREMI_FAQ),
      howToJsonLd({
        name: "Cómo preparar la carpeta SEREMI de un ELEAM en Chile",
        description: "Pasos para reunir la documentación de los 14 ámbitos del DS 14/2017 y mantener la acreditación SEREMI vigente.",
        totalTime: "P30D",
        steps: SEREMI_STEPS,
      }),
    ],
    rootHtml: buildAcreditacionHtml(),
  }));

  writeRoute("/software-eleam", renderPage(template, {
    path: "/software-eleam",
    title: "Software para ELEAM en Chile · Gestión clínica y SEREMI",
    description: "Software web especializado para ELEAM en Chile: ficha clínica digital, signos vitales con alertas, eMAR, observaciones por turno, plan de cuidado y carpeta SEREMI DS 14/2017.",
    jsonLd: [
      breadcrumbJsonLd([{ name: "Inicio", url: "/" }, { name: "Software para ELEAM", url: "/software-eleam" }]),
      faqPageJsonLd(SOFTWARE_FAQ),
      softwareJsonLd(),
    ],
    rootHtml: buildSoftwareHtml(),
  }));

  writeRoute("/preguntas-frecuentes", renderPage(template, {
    path: "/preguntas-frecuentes",
    title: "Preguntas frecuentes · FichaEleam",
    description: "Preguntas frecuentes sobre FichaEleam: precios, planes, demo gratuito, implementación, seguridad de datos, equipo y permisos, soporte. Software para ELEAM en Chile.",
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
    jsonLd: [
      breadcrumbJsonLd([{ name: "Inicio", url: "/" }, { name: "Contacto", url: "/contacto" }]),
      contactPageJsonLd(),
    ],
    rootHtml: buildContactoHtml(),
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
