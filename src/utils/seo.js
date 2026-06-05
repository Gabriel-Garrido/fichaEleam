// Hook + helpers SEO sin dependencias externas (sin react-helmet).
// Modifica document.title y los <meta> existentes; registra JSON-LD
// inyectando un <script type="application/ld+json"> con un id estable
// para reemplazarlo en cambios de ruta.

import { useEffect } from "react";

const ORIGIN = "https://fichaeleam.cl";
const DEFAULT_OG_IMAGE = "/marketing/fichaeleam-hero-demo-soporte.png";
const DEFAULT_LOGO = "/marketing/fichaeleam-app-icon-color.png";

function absoluteUrl(value) {
  if (!value) return null;
  return value.startsWith("http") ? value : `${ORIGIN}${value}`;
}

// El host sirve cada ruta pública como directorio (/<ruta>/), por lo que la URL
// real lleva slash final. Canonical, og:url y los @id de JSON-LD deben usar esa
// misma forma para coincidir con el prerender y el sitemap, y no quedar como
// "URL alternativa con redirección" en Google.
function withTrailingSlash(path = "/") {
  if (!path || path === "/") return "/";
  return path.endsWith("/") ? path : `${path}/`;
}

function routeUrl(path = "/") {
  return `${ORIGIN}${withTrailingSlash(path)}`;
}

function setMeta(attr, name, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLinkRel(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setJsonLd(id, data) {
  let el = document.head.querySelector(`script[data-jsonld="${id}"]`);
  if (data == null) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.setAttribute("type", "application/ld+json");
    el.setAttribute("data-jsonld", id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function cleanArticleMetas() {
  [...document.head.querySelectorAll("meta[data-seo-article]")].forEach((el) => el.remove());
}

function setArticleMeta(prop, content) {
  if (!content) return;
  const el = document.createElement("meta");
  el.setAttribute("property", prop);
  el.setAttribute("data-seo-article", "");
  el.setAttribute("content", content);
  document.head.appendChild(el);
}

/**
 * useSEO — inyecta metadatos por ruta.
 *
 *   useSEO({
 *     title: "FichaEleam · Gestión SEREMI",
 *     description: "Plataforma chilena para ELEAM...",
 *     path: "/blog",                    // canonical = ORIGIN + path
 *     image: "/og-image.png",
 *     imageAlt: "Vista previa de FichaEleam",
 *     type: "article" | "website",
 *     keywords: ["ELEAM", "SEREMI"],
 *     jsonLd: {...} | [{...}],
 *     noIndex: false,
 *     publishedTime: "2025-01-01T00:00:00Z",  // solo para type="article"
 *     modifiedTime:  "2025-06-01T00:00:00Z",  // solo para type="article"
 *     author: "Equipo FichaEleam",             // solo para type="article"
 *   })
 */
export function useSEO({
  title,
  description,
  path,
  image,
  imageAlt,
  type = "website",
  keywords,
  jsonLd,
  noIndex = false,
  publishedTime,
  modifiedTime,
  author,
} = {}) {
  useEffect(() => {
    const fullTitle = title
      ? (title.includes("FichaEleam") ? title : `${title} · FichaEleam`)
      : "FichaEleam · Software de gestión clínica y SEREMI para ELEAM en Chile";

    document.title = fullTitle;

    setMeta("name", "description", description ?? "");
    if (Array.isArray(keywords) && keywords.length) {
      setMeta("name", "keywords", keywords.join(", "));
    }
    setMeta("name", "robots", noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");

    const canonical = path ? routeUrl(path) : ORIGIN;
    setLinkRel("canonical", canonical);

    // Open Graph — base
    setMeta("property", "og:type", type);
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description ?? "");
    setMeta("property", "og:locale", "es_CL");
    setMeta("property", "og:site_name", "FichaEleam");
    const ogImage = absoluteUrl(image || DEFAULT_OG_IMAGE);
    if (ogImage) setMeta("property", "og:image", ogImage);
    if (ogImage) {
      setMeta("property", "og:image:alt", imageAlt || description || fullTitle);
      setMeta("property", "og:image:width", "1792");
      setMeta("property", "og:image:height", "1024");
    }

    // Open Graph — artículo (se limpian en cleanup para no contaminar otras rutas)
    cleanArticleMetas();
    if (type === "article") {
      if (publishedTime) setArticleMeta("og:article:published_time", publishedTime);
      if (modifiedTime || publishedTime) setArticleMeta("og:article:modified_time", modifiedTime ?? publishedTime);
      if (author) setArticleMeta("og:article:author", author);
      if (Array.isArray(keywords)) {
        keywords.forEach((tag) => setArticleMeta("og:article:tag", tag));
      }
    }

    // Twitter / X
    setMeta("name", "twitter:card", ogImage ? "summary_large_image" : "summary");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description ?? "");
    if (ogImage) setMeta("name", "twitter:image", ogImage);
    if (ogImage) setMeta("name", "twitter:image:alt", imageAlt || description || fullTitle);

    // JSON-LD por ruta. id "page" se reemplaza al volver a llamar.
    if (jsonLd) {
      const arr = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      arr.forEach((d, i) => setJsonLd(`page-${i}`, d));
    } else {
      [...document.head.querySelectorAll('script[data-jsonld^="page-"]')]
        .forEach((el) => el.remove());
    }

    return () => {
      [...document.head.querySelectorAll('script[data-jsonld^="page-"]')]
        .forEach((el) => el.remove());
      cleanArticleMetas();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path, image, imageAlt, type, JSON.stringify(keywords), JSON.stringify(jsonLd), noIndex, publishedTime, modifiedTime, author]);
}

// ─────────────────────────────────────────────────────────────
// Helpers JSON-LD
// ─────────────────────────────────────────────────────────────

export function articleJsonLd({ titulo, resumen, slug, image, publicadoEn, actualizadoEn, autor, keywords, wordCount }) {
  const obj = {
    "@context": "https://schema.org",
    "@type": ["Article", "BlogPosting"],
    "@id": routeUrl(`/blog/${slug}`),
    "headline": titulo,
    "description": resumen,
    "image": absoluteUrl(image || DEFAULT_OG_IMAGE),
    "thumbnailUrl": absoluteUrl(image || DEFAULT_OG_IMAGE),
    "datePublished": publicadoEn ?? undefined,
    "dateModified": actualizadoEn ?? publicadoEn ?? undefined,
    "author": {
      "@type": "Person",
      "name": autor ?? "Equipo FichaEleam",
      "url": routeUrl("/blog"),
    },
    "publisher": {
      "@type": "Organization",
      "@id": `${ORIGIN}/#organization`,
      "name": "FichaEleam",
      "url": ORIGIN,
      "logo": {
        "@type": "ImageObject",
        "url": absoluteUrl(DEFAULT_LOGO),
      },
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": routeUrl(`/blog/${slug}`),
    },
    "isPartOf": {
      "@type": "Blog",
      "@id": routeUrl("/blog"),
      "name": "Blog FichaEleam",
    },
    "keywords": keywords?.join(", "),
    "inLanguage": "es-CL",
    // SpeakableSpecification indica a LLMs/voice qué extractos son más relevantes
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": ["h1", ".article-summary"],
    },
  };
  if (wordCount) obj.wordCount = wordCount;
  return obj;
}

export function breadcrumbJsonLd(items) {
  // items: [{name, url}]
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((it, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": it.name,
      "item": it.url.startsWith("http") ? it.url : routeUrl(it.url),
    })),
  };
}

export function faqJsonLd(qa) {
  // qa: [{q, a}]
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": qa.map(({ q, a }) => ({
      "@type": "Question",
      "name": q,
      "acceptedAnswer": { "@type": "Answer", "text": a },
    })),
  };
}

export function howToJsonLd({ name, description, totalTime, steps = [] }) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": name,
    "description": description,
    ...(totalTime && { "totalTime": totalTime }),
    "step": steps.map((s, i) => ({
      "@type": "HowToStep",
      "position": i + 1,
      "name": s.name,
      "text": s.text,
      ...(s.url && { "url": s.url.startsWith("http") ? s.url : `${ORIGIN}${s.url}` }),
    })),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${ORIGIN}/#organization`,
    "name": "FichaEleam",
    "url": ORIGIN,
    "logo": `${ORIGIN}/og-image.png`,
    "image": absoluteUrl(DEFAULT_OG_IMAGE),
    "description": "Software de gestión clínica y acreditación SEREMI para ELEAM en Chile.",
    "areaServed": { "@type": "Country", "name": "Chile" },
    "contactPoint": [{
      "@type": "ContactPoint",
      "telephone": "+56-9-5118-7764",
      "contactType": "sales",
      "email": "contacto@fichaeleam.cl",
      "availableLanguage": ["Spanish"],
      "areaServed": "CL",
    }],
    "sameAs": [],
  };
}

// Blog schema para la página de listado, con blogPost items para motores y LLMs.
export function blogListJsonLd(posts = []) {
  const base = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": routeUrl("/blog"),
    "name": "Blog FichaEleam",
    "description": "Recursos para Establecimientos de Larga Estadía para Adultos Mayores (ELEAM) en Chile: gestión clínica, DS 14/2017, acreditación SEREMI y buenas prácticas.",
    "url": routeUrl("/blog"),
    "inLanguage": "es-CL",
    "publisher": {
      "@type": "Organization",
      "@id": `${ORIGIN}/#organization`,
      "name": "FichaEleam",
      "url": ORIGIN,
    },
  };
  if (posts.length > 0) {
    base.blogPost = posts.map((p) => ({
      "@type": "BlogPosting",
      "@id": routeUrl(`/blog/${p.slug}`),
      "headline": p.titulo,
      "description": p.resumen,
      "datePublished": p.publicado_en,
      ...(p.actualizado_en && { "dateModified": p.actualizado_en }),
      "url": routeUrl(`/blog/${p.slug}`),
      "image": absoluteUrl(p.cover_url || DEFAULT_OG_IMAGE),
      "author": {
        "@type": "Person",
        "name": p.autor_nombre ?? "Equipo FichaEleam",
      },
      ...(p.keywords?.length && { "keywords": p.keywords.join(", ") }),
    }));
  }
  return base;
}

export const SITE_ORIGIN = ORIGIN;
