import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { listCoachIds } from "./coachCatalog";

const root = "src";
const ownDirectory = "src/features/featureCoach";

function sourceFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(jsx?|tsx?)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

const consumers = sourceFiles(root)
  .filter((path) => !path.replaceAll("\\", "/").startsWith(ownDirectory))
  .map((path) => ({ path: relative(root, path), source: readFileSync(path, "utf8") }));

const tooltipSource = readFileSync("src/components/Tooltip.jsx", "utf8");
const coachHookSource = readFileSync("src/features/featureCoach/useFeatureCoach.js", "utf8");
const coachTriggerSource = readFileSync("src/features/featureCoach/FeatureCoachTrigger.jsx", "utf8");

describe("integración de ayudas contextuales", () => {
  it.each(listCoachIds())("%s está conectado a una vista activa", (coachId) => {
    expect(
      consumers.some(({ source }) => source.includes(`"${coachId}"`)),
      `La guía ${coachId} no debe quedar huérfana`,
    ).toBe(true);
  });

  it("toda integración literal tiene una guía registrada", () => {
    const registered = new Set(listCoachIds());
    const referenced = consumers.flatMap(({ source }) => [
      ...source.matchAll(/coachFeatureId="([^"]+)"/g),
      ...source.matchAll(/<FeatureCoach\s+featureId="([^"]+)"/g),
    ].map((match) => match[1]));
    expect(referenced.filter((id) => !registered.has(id))).toEqual([]);
  });

  it("las ayudas breves exponen su descripción sin semántica de menú", () => {
    expect(tooltipSource).toContain('"aria-describedby"');
    expect(tooltipSource).toContain('role="tooltip"');
    expect(tooltipSource).not.toContain('aria-haspopup');
  });

  it("la guía devuelve el foco al control que la abrió", () => {
    expect(coachHookSource).toContain("returnFocusRef.current?.focus?.()");
    expect(coachTriggerSource).not.toContain('title="Abrir ayuda');
  });
});
