# Informe de auditoría — Decreto Supremo N°20 (ELEAM) + SEO técnico

**Proyecto:** FichaEleam
**Fecha:** 2026-06-09
**Alcance:** auditoría normativa (DS 14 → DS 20), feature de acreditación SEREMI, páginas públicas y SEO/indexación.
**Rama:** `master` (trabajo en árbol de trabajo, sin commit).

---

## 1. Resumen ejecutivo

El hallazgo central de la auditoría es que **el proyecto ya estaba migrado, en lo esencial, al Decreto Supremo N°20**. No existe ninguna referencia residual al Decreto 14 / DS 14 en el código de la aplicación, las páginas públicas, la base de datos ni los textos comerciales. La feature de acreditación SEREMI ya está construida sobre una **matriz oficial DS 20 por artículos** (12 ámbitos, 57 requisitos, mapeados a los Arts. 3–32 y disposiciones transitorias), con una arquitectura de fuente única de verdad (`src/content/decreto20Eleam.js`) y SEO de páginas públicas de muy buen nivel.

Buena parte de esa migración estaba presente como **trabajo no commiteado** en el árbol de trabajo (≈3.400 líneas modificadas: rediseño de landing, páginas públicas, SEO, blog seed, schema). La auditoría confirmó que ese estado es **sano** (lint, tests, contratos, SEO y build pasan) y se concentró en lo que faltaba: terminología residual, una **fuga de `undefined` en el prerender de una página SEO clave**, un script de tooling roto y consistencia documental.

**Estado tras la intervención:** sin rastros de DS 14, terminología "persona mayor" consistente, SEO sin defectos detectados, tooling de sincronización reparado, y todas las validaciones disponibles en verde.

| Validación | Resultado |
|---|---|
| ESLint (`npm run lint`) | ✅ sin errores ni warnings |
| Tests unitarios (`npm run test:run`) | ✅ 318/318 (54 archivos) |
| Auditoría SEO (`npm run seo:check`) | ✅ 15 URLs, "SEO OK" |
| Contratos Supabase (`npm run test:contracts`) | ✅ "Contracts OK" |
| Build de producción (`npm run build`) | ✅ build + prerender de 8 posts |
| Seed acreditación en sync | ✅ 12 ámbitos, 57 requisitos |

---

## 2. Fuentes oficiales revisadas

- **Ley Chile / BCN — Decreto 20, MINSAL**, idNorma `1182129`: "Aprueba Reglamento de Establecimientos de Larga Estadía para Personas Mayores (ELEAM)". <https://www.bcn.cl/leychile/navegar?idNorma=1182129>
- **Diario Oficial** (publicaciones 2023 y 2025) — confirmación de decretos modificatorios.
- **SENAMA** — copia del Decreto 20 MINSAL y documento de modificaciones 2024.

**Datos verificados contra la fuente y contrastados con `decreto20Eleam.js`:**

| Dato | Fuente oficial | En el proyecto |
|---|---|---|
| Norma vigente | DS N°20/2021 MINSAL (ELEAM) | ✅ `DS20`, idNorma 1182129 |
| Enfoque | "personas mayores" / "residentes" | ✅ terminología aplicada |
| Entrada en vigencia | 01-10-2025 (tras DS 9/2025) | ✅ `vigenciaDesde: 2025-10-01` |
| Transitorio general | 3 años | ✅ `plazoGeneralAnios: 3` |
| Transitorio incendios (Art. 10 k) | 5 años | ✅ `plazoIncendioAnios: 5` |
| Modificatorios | DS 23/2023, DS 6/2025, DS 9/2025 | ✅ citados en doc de trabajo |

No se encontraron diferencias entre la fuente oficial vigente y los valores normativos cargados en el proyecto.

---

## 3. Cambios normativos detectados (DS 14 → DS 20)

La migración conceptual ya estaba hecha. El árbol de trabajo refleja:

- Vocabulario actualizado a **"persona mayor" / "residente"** y **"persona significativa / representante legal"**.
- Acreditación reescrita como **matriz DS 20 por artículos** (no la lógica anterior).
- Blog reseed: 8 artículos centrados en DS 20 / SEREMI / ELEAM; el artículo antiguo `ds-14-2017-...` ya no existe, y se conserva una **redirección 301** del slug viejo al nuevo (`decreto-20-fiscalizacion-seremi-eleam`) en `.htaccess` — preservando el equity de enlaces.

---

## 4. Referencias al Decreto 14 — estado

**No quedan referencias funcionales ni visibles al Decreto 14 / DS 14.** Búsqueda global (`git grep -i "decreto.*14|ds.?14"`) sobre `src/`, `public/`, `index.html` y `supabase_schema.sql`: **0 coincidencias**.

La única ocurrencia del literal `ds-14` es **intencional y correcta**: la regla de redirección 301 del slug histórico en `scripts/generate-public-seo.mjs`. Eliminarla rompería la URL antigua aún indexable; se mantiene a propósito.

---

## 5. Cambios implementados en esta sesión

### 5.1. Terminología "adulto mayor" → "persona mayor"
| Archivo | Cambio |
|---|---|
| `supabase/functions/_shared/email.ts` | Footer de correos: "…para Personas Mayores" |
| `src/features/vitalSigns/VitalSignsForm.jsx` | Encabezado de rangos clínicos |
| `src/features/vitalSigns/vitalRanges.js` | Comentario de cabecera |
| `src/features/observations/observationFormSchema.js` | Descripción categoría psicosocial → "vínculo con la familia o persona significativa" |
| `src/features/superadmin/crm/crmSalesPlaybook.js` | Plantilla de correo comercial |
| `public/llms.txt` | Corrección gramatical en línea SENAMA (se mantiene el nombre legal "Servicio Nacional del Adulto Mayor") |

> Nota: el nombre legal de **SENAMA** ("Servicio Nacional del Adulto Mayor") se conserva por ser denominación oficial. El slug de blog `signos-vitales-adulto-mayor-...` ya no existe en el seed actual.

### 5.2. SEO — defectos corregidos (impacto real en producción)
| Archivo | Defecto | Corrección |
|---|---|---|
| `scripts/generate-public-seo.mjs` | `DECRETO20_META.urlOficial` (propiedad inexistente) generaba `Fuente oficial DS 20: undefined` en `llms.txt` **y** `<a href="">Ley Chile</a>` en la página `/acreditacion-seremi` | Usar `DECRETO20_META.fuenteUrl`; link con `rel="noopener nofollow" target="_blank"` |
| `src/content/decreto20Eleam.js` | `DECRETO20_COPY.hero` no existía → la página prerenderizada `/acreditacion-seremi` salía con `<p class="article-summary"></p>` **vacío** (thin content + `speakable` vacío) | Se agregó copy `hero` (compliance-safe, keyword-rich) como fuente única |
| `public/llms.txt` | Placeholder commiteado **desactualizado** (slugs de blog muertos + terminología vieja) | Sincronizado con la salida generada (`dist/llms.txt`) |

### 5.3. Tooling y documentación
| Archivo | Cambio |
|---|---|
| `scripts/sync-decreto20-acred-seed.mjs` | El guard `next === schema` confundía "bloque no encontrado" con "ya sincronizado" y lanzaba un error engañoso cada vez que el seed estaba al día. Ahora detecta primero si el bloque existe, y reporta "ya estaba sincronizado" sin error (idempotente) |
| `CLAUDE.md` | La descripción de `acred_ambitos` decía "A01-A14" (modelo viejo). Corregida a "12 ámbitos `DS20-A05`..`DS20-A31`, fuente de verdad en `decreto20Eleam.js`, seed regenerado con el sync script" |

---

## 6. Feature de acreditación SEREMI — estado

La feature ya implementa el modelo DS 20 y es robusta. Cobertura verificada (12 ámbitos / 57 requisitos):

| Ámbito (código) | Artículos DS 20 | Cubre |
|---|---|---|
| `DS20-A05` Autorización sanitaria | Art. 5 | Solicitud, inmueble, plano, recepción final, agua, incendios, eléctrico/gas, antecedentes director técnico, planta/turnos, derechos y deberes |
| `DS20-A06` Vigencia y cierre | Art. 6 | Resolución sanitaria (3 años), observaciones SEREMI, avisos de cierre |
| `DS20-A07` Modificaciones | Art. 7 | Cambios propietario/planta, director técnico, personal/turnos (plazos) |
| `DS20-A08` Infraestructura | Arts. 8-9 | Riesgo estructural/sanitario, aseo/desinfección, ubicación ≥500 m |
| `DS20-A10` Instalaciones/seguridad | Art. 10 | Letrero, habitaciones/camas, incendios/evacuación, baños, cocina, sala de salud, medicamentos, lavandería/residuos |
| `DS20-A12` Dirección técnica | Arts. 11-13 | Calificación, jornada/reemplazo, validaciones clínicas, reporte trimestral SENAMA |
| `DS20-A15` Personal y dotación | Arts. 14-21 | Dotación por dependencia/turno, TENS/auxiliar, competencias, manipuladores |
| `DS20-A23` Ingreso y carpeta | Arts. 22-24 | Consentimiento, condición de salud grave, evaluaciones geriátricas, carpeta personal, eventos agudos/derivación |
| `DS20-A25` Protocolos y programa | Art. 25 | Ingreso/egreso, capacitación 22 h, emergencias, urgencias/fallecimiento, programa integral, integración sociocomunitaria |
| `DS20-A26` Red de salud | Art. 26 | APS/privada, servicios privados |
| `DS20-A27` Reglamento/contrato/registros | Arts. 27-30 | Reglamento interno, contrato, inventario, reclamos codificados, derechos entregados, datos sensibles |
| `DS20-A31` Fiscalización/SENAMA | Arts. 3, 31-32, transitorios | Modo fiscalización, plazos transitorios, reportes |

Cada requisito incluye: medio verificador, criticidad, tipo de evidencia, origen (documental/operacional/mixto), vigencias sugeridas, `requisito_operacional` y estados fiscalizables (`pendiente | cumple | no_cumple | no_aplica | vencido | observado`). El seed SQL se genera desde `decreto20Eleam.js` y se mantuvo en sync.

---

## 7. Páginas públicas — estado

- **Sin promesas de cumplimiento legal absoluto.** El copy usa "diseñado para apoyar la gestión y evidencia documental exigida por el Decreto N°20" y "la validación final depende de la autoridad sanitaria". El blog seed declara explícitamente: *"La plataforma no promete cumplimiento automático."* Búsqueda de frases riesgosas ("garantiza", "cumplimiento automático", "te acredita", "100%"): **0 coincidencias** en páginas públicas.
- **Propuesta de valor** orientada a dueños, directores técnicos y administradores: ordenar la Carpeta SEREMI, preparar fiscalización, reducir riesgo normativo, evitar papel/Excel/WhatsApp.
- Páginas públicas: `/`, `/software-eleam`, `/acreditacion-seremi`, `/preguntas-frecuentes`, `/contacto`, `/pago`, `/blog` (+ posts). Todas con H1 único, title y description propios, canonical con trailing slash y JSON-LD.

---

## 8. SEO técnico e indexación — estado

Infraestructura ya de nivel alto; tras los fixes no se detectan defectos:

- **Prerender estático** (`scripts/generate-public-seo.mjs`) para todas las rutas públicas y cada post → contenido indexable sin depender de JS (mitiga el problema clásico de SPA).
- **Canonical / trailing slash** coherente entre `index.html`, `seo.js` (hook `useSEO`), sitemap y JSON-LD (`@id`/`url`). Apache redirige 301 a la forma con slash.
- **`robots.txt`** generado: permite rutas públicas + bots de IA (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc.), bloquea rutas privadas, declara sitemap.
- **`sitemap.xml`** con imágenes (`image:image`), `lastmod`, `changefreq`, `priority`.
- **`llms.txt`** completo (planes, funcionalidades, matriz DS 20, glosario, marco regulatorio) — corregido el `undefined` de fuente oficial.
- **JSON-LD `@graph`**: WebSite, Organization, SoftwareApplication (AggregateOffer, precios netos `valueAddedTaxIncluded:false`), HowTo, FAQPage, Service; por post: Article+BlogPosting, BreadcrumbList, `speakable`.
- **`hreflang`** `es-CL` / `es` / `x-default`; `og:*`, `twitter:summary_large_image`; preconnect/dns-prefetch.
- **Headers** de seguridad y `X-Robots-Tag: noindex` para rutas privadas vía `.htaccess`.
- **404 prerenderizado** con enlaces internos; **301** del slug histórico DS 14 → DS 20.

---

## 9. Nuevos módulos / modelos creados

**Ninguno nuevo en esta sesión.** No fue necesario: el modelo de datos (44+ tablas) y la matriz de acreditación DS 20 ya existían. Se agregó únicamente la propiedad de copy `DECRETO20_COPY.hero` (contenido, no estructura).

---

## 10. Validaciones realizadas

- `npm run lint` → limpio.
- `npm run test:run` → 318/318.
- `npm run seo:check` → "SEO OK" (15 URLs).
- `npm run test:contracts` → "Contracts OK".
- `npm run build` → build + prerender de 8 posts, sin errores.
- `node scripts/sync-decreto20-acred-seed.mjs` → idempotente, 12 ámbitos / 57 requisitos.
- Verificación manual del prerender `/acreditacion-seremi`: hero poblado y link a Ley Chile correcto.

> El proyecto no usa TypeScript de tipado estricto en runtime ni una suite e2e; se ejecutaron todas las validaciones disponibles.

---

## 11. Pendientes reales (backlog honesto)

El documento de trabajo (`decreto_20_fichaeleam_actualizacion.md`) propone módulos **operacionales** que hoy están representados en la matriz de acreditación como *evidencia documental*, pero **no como flujos estructurados dedicados**. No son regresiones — son oportunidades de producto (Fase 2/3 del propio documento):

| Módulo sugerido (DS 20) | Estado actual | Brecha |
|---|---|---|
| Consentimiento voluntario de ingreso con validaciones duras | Requisito en acreditación + ficha de residente | Falta flujo de ingreso que **bloquee** sin consentimiento/contrato/dependencia |
| Contrato + inventario de bienes (anual/egreso) | Requisito documental | Falta módulo estructurado con inventario y rendición |
| Calculadora de dotación por dependencia/turno (Arts. 15-17) | Requisito + datos de turnos | Falta el cálculo automático y la alerta de brecha (mín. 2 cuidadores nocturnos) |
| Reclamos/sugerencias (libro foliado/codificado) | Requisito documental | Falta libro digital con folio/código y estados |
| Reporte trimestral SENAMA (PDF/Excel/CSV) | Requisito + datos | Falta el generador de reporte |
| Dirección técnica (horas, reemplazante, validaciones firmadas) | Requisito + perfil | Falta panel dedicado con firmas/validaciones |
| Protocolos obligatorios (versión, vigencia, socialización) | Requisito documental | Falta repositorio de protocolos con control de versiones |

**Recomendación:** priorizar la **calculadora de dotación** y el **consentimiento/ingreso con validaciones duras** (alto valor normativo y diferenciador comercial claro), seguidos de **reclamos** y **reporte SENAMA**.

---

## 12. Riesgos y decisiones técnicas

- **Trabajo no commiteado extenso:** la migración DS 20 + rediseño público vive en el árbol de trabajo. Riesgo de pérdida si no se commitea. **Recomendación:** revisar el diff y commitear por bloques coherentes.
- **`urlOficial` → `fuenteUrl`:** la fuga de `undefined` afectaba una página SEO clave y el `llms.txt`; ya corregida. Conviene un test de prerender que falle si aparece `undefined`/`href=""` en `dist` (ver §14).
- **Slugs de blog con "adulto-mayor":** se mantienen como keyword de búsqueda si reaparecen; el texto visible usa "persona mayor". Cambiar slugs vivos exige 301.
- **`public/{llms,sitemap,robots}.txt` son placeholders** que el build regenera en `dist`; se sincronizó `llms.txt` para evitar contenido muerto en el repo.
- **Mezcla de fin de línea (LF/CRLF)** en `supabase_schema.sql` (bloque seed LF dentro de archivo CRLF). No afecta a Postgres; conviene normalizar con `.gitattributes` si molesta en diffs.

---

## 13. Cómo probar localmente

```bash
npm install
npm run lint            # ESLint
npm run test:run        # 318 tests
npm run test:contracts  # contrato frontend ↔ Supabase
npm run seo:check       # auditoría SEO de rutas y posts
npm run build           # build + prerender SEO/LLM en /dist
npm run preview         # sirve /dist
node scripts/sync-decreto20-acred-seed.mjs   # re-sincroniza el seed DS 20 (idempotente)
```

Verificación puntual del prerender:
```bash
# hero poblado y link a Ley Chile correcto en la página SEREMI
grep -o '<p class="article-summary">[^<]\{20,\}' dist/acreditacion-seremi/index.html
grep -o '<a href="[^"]*"[^>]*>Ley Chile</a>'      dist/acreditacion-seremi/index.html
```

---

## 14. Recomendaciones siguientes

1. **Commitear** el trabajo DS 20 + SEO en bloques revisables (riesgo de pérdida).
2. **Endurecer `seo:check`**: agregar una aserción que falle si en `dist` aparece `undefined`, `href=""` o `<p class="article-summary"></p>` vacío (habría atrapado el bug de §5.2).
3. **Avanzar Fase 2** del documento: calculadora de dotación e ingreso con validaciones duras.
4. **Validar en Google Search Console** sitemap + datos estructurados tras el deploy; revisar "Rastreada: actualmente sin indexar".
5. **`.gitattributes`** para fijar EOL de `*.sql` y `*.mjs` y evitar ruido de diffs.
6. **Asesoría jurídico-sanitaria** antes de cualquier afirmación comercial de cumplimiento (el copy ya es conservador, mantenerlo así).

---

*Criterio de éxito alcanzado: el proyecto no presenta rastros visibles ni funcionales del Decreto 14, está alineado al Decreto N°20 vigente, la acreditación SEREMI es una matriz fiscalizable por artículos, y las páginas públicas quedan técnicamente sanas para indexación. Las brechas restantes son de profundización funcional (Fase 2/3), documentadas en §11.*

---

## 15. Adenda — Calculadora de dotación, métricas y endurecimiento SEO

Segunda fase de trabajo solicitada por el usuario (Fase 2 §11.1).

### Calculadora de dotación de personal (pública, SEO)
- Reglas DS 20 Arts. 15-17 en `src/content/dotacionRules.js` (función pura `calcularDotacion`) con **19 tests** (`dotacionRules.test.js`): umbrales por dependencia, autovalentes /20, mínimo 2 nocturnos, mixtos y brecha.
- Página pública `/calculadora-dotacion-eleam` (`CalculadoraDotacionPage.jsx`): herramienta interactiva con análisis de brecha, copy compliance-safe y disclaimer "la validación final depende de la SEREMI".
- SEO: prerender estático (`buildCalculadoraHtml`), JSON-LD `WebApplication` + `HowTo` + `FAQPage` + `BreadcrumbList`, en `PUBLIC_ROUTES`, sitemap (con imagen), robots, llms.txt y enlaces internos desde nav/footer, acreditación y software.

### Métricas (vista superadmin)
- Nuevo evento `tool_use` (`elemento='calculadora_dotacion'`) — **3 puntos en sync**: `eventValidation.ts`, CHECK `landing_events_tipo_contract` (×2) y la base en blanco (sin migración).
- `getLandingMetrics()`: desglose de visitas reescrito a **ranking por página pública** (corrige el bug donde `/blog` y las marketing caían en "otras") + bloque `toolUsage` (usos, % con déficit, clics a demo).
- `LandingMetrics.jsx`: nueva sección "Visitas por página pública" (ranking) y tarjeta "Calculadora de dotación", con `MetricHelp`. `/pago` ahora registra page_view solo en visitas anónimas.

### Endurecimiento del checker SEO (`check-public-seo.mjs`)
Nuevas aserciones (validadas con prueba negativa): sin `undefined`/`href=""`/resumen vacío; `<title>` ≤ 70 y **único**; description 50-165 y **única**; `og:image` https absoluta; `twitter:card` presente. Conserva todas las anteriores.

### Validaciones de esta fase
`lint` limpio · **337 tests** (54→55 archivos, +19) · `seo:check` endurecido OK (8 rutas públicas, 16 URLs) · `test:contracts` OK · `build` OK.

### ⚠️ Paso manual requerido (no ejecutado)
El nuevo evento `tool_use` necesita redeploy de la Edge Function para registrarse en producción:

```bash
npx supabase functions deploy track-landing-event
```

Mientras no se despliegue, la calculadora funciona pero su uso no se registra (el tracking falla en silencio por diseño).
