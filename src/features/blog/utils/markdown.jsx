// Renderer markdown minimalista, sin dependencias.
// Soporta:
//   # H1 / ## H2 / ### H3
//   párrafos
//   **bold** *italic*
//   listas - / 1.
//   > blockquote
//   `inline code` y ```bloques de código```
//   [text](url) (interno y externo)
//   ![alt](url)
//   tablas pipe ( | a | b | )
//   --- separadores
//
// Devuelve un array de elementos React. React escapa el texto y los enlaces
// se normalizan a http(s), anchors o rutas internas para evitar esquemas
// peligrosos como javascript: y data:.

import React from "react";

const KEY = (() => { let i = 0; return () => `md-${++i}`; })();

function hasControlChars(value) {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

export function normalizeMarkdownUrl(url) {
  const value = String(url || "").trim();
  if (!value || hasControlChars(value)) return null;
  if (value.startsWith("#")) return value;
  if (value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")) return value;
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

function renderInline(text) {
  if (!text) return null;
  const tokens = [];
  let rest = text;
  let safety = 0;
  while (rest.length && safety++ < 1000) {
    // images ![alt](url)
    let m = rest.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (m && m.index !== undefined) {
      if (m.index > 0) tokens.push(rest.slice(0, m.index));
      const src = normalizeMarkdownUrl(m[2]);
      tokens.push(src
        ? <img key={KEY()} src={src} alt={m[1]} loading="lazy" className="my-4 rounded-xl border border-slate-100" />
        : m[1]);
      rest = rest.slice(m.index + m[0].length);
      continue;
    }
    // links [text](url)
    m = rest.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (m && m.index !== undefined) {
      if (m.index > 0) tokens.push(rest.slice(0, m.index));
      const href = normalizeMarkdownUrl(m[2]);
      if (href) {
        const isExternal = /^https?:\/\//i.test(href);
        tokens.push(
          <a
            key={KEY()}
            href={href}
            {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="text-teal-700 underline hover:no-underline font-medium"
          >
            {m[1]}
          </a>,
        );
      } else {
        tokens.push(m[1]);
      }
      rest = rest.slice(m.index + m[0].length);
      continue;
    }
    // inline code
    m = rest.match(/`([^`]+)`/);
    if (m && m.index !== undefined) {
      if (m.index > 0) tokens.push(rest.slice(0, m.index));
      tokens.push(<code key={KEY()} className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[0.9em]">{m[1]}</code>);
      rest = rest.slice(m.index + m[0].length);
      continue;
    }
    // bold
    m = rest.match(/\*\*([^*]+)\*\*/);
    if (m && m.index !== undefined) {
      if (m.index > 0) tokens.push(rest.slice(0, m.index));
      tokens.push(<strong key={KEY()}>{m[1]}</strong>);
      rest = rest.slice(m.index + m[0].length);
      continue;
    }
    // italic
    m = rest.match(/(?<![*\w])\*([^*]+)\*(?![*\w])/);
    if (m && m.index !== undefined) {
      if (m.index > 0) tokens.push(rest.slice(0, m.index));
      tokens.push(<em key={KEY()}>{m[1]}</em>);
      rest = rest.slice(m.index + m[0].length);
      continue;
    }
    tokens.push(rest);
    rest = "";
  }
  return tokens;
}

function slugifyHeading(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 80);
}

export function renderMarkdown(md) {
  if (!md) return null;
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;

  const flushPara = (buf) => {
    if (!buf.length) return;
    const text = buf.join(" ").trim();
    if (text) out.push(<p key={KEY()} className="text-slate-700 leading-relaxed my-3">{renderInline(text)}</p>);
  };

  while (i < lines.length) {
    const line = lines[i];

    // fenced code block
    if (/^```/.test(line)) {
      const block = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        block.push(lines[i]); i++;
      }
      i++;
      out.push(
        <pre key={KEY()} className="bg-slate-900 text-slate-100 rounded-xl p-4 overflow-x-auto text-sm my-4">
          <code>{block.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const text  = h[2];
      const id    = slugifyHeading(text);
      const cls = level === 1
        ? "text-3xl font-black text-slate-900 mt-8 mb-4"
        : level === 2
        ? "text-2xl font-bold text-slate-900 mt-8 mb-3 border-b border-slate-100 pb-2"
        : level === 3
        ? "text-xl font-bold text-slate-900 mt-6 mb-2"
        : "text-lg font-semibold text-slate-800 mt-4 mb-2";
      const Tag = `h${Math.min(level + 1, 6)}`; // bump 1 nivel para que h2 sea el principal
      out.push(<Tag key={KEY()} id={id} className={cls}>{renderInline(text)}</Tag>);
      i++;
      continue;
    }

    // hr
    if (/^---+\s*$/.test(line)) {
      out.push(<hr key={KEY()} className="my-8 border-slate-200" />);
      i++;
      continue;
    }

    // blockquote (consecutive)
    if (/^>\s?/.test(line)) {
      const block = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        block.push(lines[i].replace(/^>\s?/, "")); i++;
      }
      out.push(
        <blockquote key={KEY()} className="border-l-4 border-teal-300 bg-teal-50/50 pl-4 py-2 italic text-slate-700 my-4">
          {block.map((l, idx) => (
            <p key={idx} className="my-1">{renderInline(l)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }

    // unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      out.push(
        <ul key={KEY()} className="list-disc list-outside pl-5 my-3 space-y-1 text-slate-700">
          {items.map((it, idx) => <li key={idx}>{renderInline(it)}</li>)}
        </ul>,
      );
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      out.push(
        <ol key={KEY()} className="list-decimal list-outside pl-5 my-3 space-y-1 text-slate-700">
          {items.map((it, idx) => <li key={idx}>{renderInline(it)}</li>)}
        </ol>,
      );
      continue;
    }

    // table (simple) | a | b |
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[-:\s|]+\|\s*$/.test(lines[i + 1])) {
      const headers = line.split("|").slice(1, -1).map((c) => c.trim());
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(lines[i].split("|").slice(1, -1).map((c) => c.trim()));
        i++;
      }
      out.push(
        <div key={KEY()} className="my-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[640px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>{headers.map((h, idx) => <th key={idx} className="px-3 py-2 text-left font-semibold border-b border-slate-200">{renderInline(h)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-slate-100 last:border-0">
                  {r.map((c, ci) => <td key={ci} className="px-3 py-2 text-slate-700">{renderInline(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // empty line
    if (!line.trim()) { i++; continue; }

    // paragraph (acumular líneas hasta blank o block)
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|>\s?|---+|```|\s*[-*]\s|\s*\d+\.\s|\s*\|)/.test(lines[i])) {
      buf.push(lines[i]); i++;
    }
    flushPara(buf);
  }

  return out;
}

export function extractTOC(md) {
  if (!md) return [];
  const out = [];
  for (const line of md.split("\n")) {
    const h = line.match(/^(#{2,3})\s+(.*)$/); // h2 y h3
    if (h) out.push({ level: h[1].length, text: h[2], id: slugifyHeading(h[2]) });
  }
  return out;
}
