// Hook + helpers SEO sin dependencias externas (sin react-helmet).
// Modifica document.title y los <meta> existentes; registra JSON-LD
// inyectando un <script type="application/ld+json"> con un id estable
// para reemplazarlo en cambios de ruta.

import { useEffect } from "react";

const ORIGIN = "https://app.fichaeleam.cl";

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

/**
 * useSEO — inyecta metadatos por ruta.
 *
 *   useSEO({
 *     title: "FichaEleam · Gestión SEREMI",
 *     description: "Plataforma chilena para ELEAM...",
 *     path: "/blog",                    // canonical = ORIGIN + path
 *     image: "/og-image.png",
 *     type: "article" | "website",
 *     keywords: ["ELEAM", "SEREMI"],
 *     jsonLd: {...} | [{...}],
 *     noIndex: false,
 *   })
 */
export function useSEO({
  title,
  description,
  path,
  image,
  type = "website",
  keywords,
  jsonLd,
  noIndex = false,
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
    setMeta("name", "robots", noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1");

    const canonical = path ? `${ORIGIN}${path}` : ORIGIN;
    setLinkRel("canonical", canonical);

    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description ?? "");
    setMeta("property", "og:type", type);
    setMeta("property", "og:url", canonical);
    if (image) setMeta("property", "og:image", image.startsWith("http") ? image : `${ORIGIN}${image}`);

    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description ?? "");
    if (image) setMeta("name", "twitter:image", image.startsWith("http") ? image : `${ORIGIN}${image}`);

    // JSON-LD por ruta. id "page" se reemplaza al volver a llamar.
    if (jsonLd) {
      const arr = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      arr.forEach((d, i) => setJsonLd(`page-${i}`, d));
    } else {
      // Limpia anteriores
      [...document.head.querySelectorAll('script[data-jsonld^="page-"]')]
        .forEach((el) => el.remove());
    }

    return () => {
      [...document.head.querySelectorAll('script[data-jsonld^="page-"]')]
        .forEach((el) => el.remove());
    };
    // El effect se reejecuta cuando cambian los serializados; eslint no
    // puede inferir igualdad estructural de keywords/jsonLd y aceptamos
    // la complejidad explícita en las deps porque el costo es despreciable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path, image, type, JSON.stringify(keywords), JSON.stringify(jsonLd), noIndex]);
}

// ─────────────────────────────────────────────────────────────
// Helpers JSON-LD
// ─────────────────────────────────────────────────────────────

export function articleJsonLd({ titulo, resumen, slug, image, publicadoEn, actualizadoEn, autor, keywords }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": titulo,
    "description": resumen,
    "image": image ? (image.startsWith("http") ? image : `${ORIGIN}${image}`) : `${ORIGIN}/og-image.png`,
    "datePublished": publicadoEn ?? undefined,
    "dateModified": actualizadoEn ?? publicadoEn ?? undefined,
    "author": {
      "@type": "Person",
      "name": autor ?? "Equipo FichaEleam",
    },
    "publisher": {
      "@type": "Organization",
      "name": "FichaEleam",
      "logo": {
        "@type": "ImageObject",
        "url": `${ORIGIN}/og-image.png`,
      },
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${ORIGIN}/blog/${slug}`,
    },
    "keywords": keywords?.join(", "),
    "inLanguage": "es-CL",
  };
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
      "item": it.url.startsWith("http") ? it.url : `${ORIGIN}${it.url}`,
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

export const SITE_ORIGIN = ORIGIN;
