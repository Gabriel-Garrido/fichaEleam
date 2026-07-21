import { describe, expect, it } from "vitest";
import {
  AUTOEVALUACION_FAQ,
  AUTOEVALUACION_ITEMS,
  AUTOEVAL_NIVEL_COPY,
  autoevalEventValue,
  autoevalNivel,
  scoreAutoevaluacion,
} from "./autoevaluacionDs20";

describe("autoevaluacionDs20", () => {
  it("tiene 10 preguntas con campos completos e ids únicos", () => {
    expect(AUTOEVALUACION_ITEMS).toHaveLength(10);
    const ids = new Set(AUTOEVALUACION_ITEMS.map((i) => i.id));
    expect(ids.size).toBe(10);
    for (const item of AUTOEVALUACION_ITEMS) {
      expect(item.pregunta.endsWith("?")).toBe(true);
      expect(item.ambito).toBeTruthy();
      expect(item.articulo).toBeTruthy();
      expect(item.ayuda).toBeTruthy();
      if (item.recurso) {
        expect(item.recurso.to.startsWith("/")).toBe(true);
        expect(item.recurso.label).toBeTruthy();
      }
    }
  });

  it("calcula el puntaje y los pendientes", () => {
    const respuestas = Object.fromEntries(AUTOEVALUACION_ITEMS.map((i) => [i.id, true]));
    respuestas.dotacion = false;
    respuestas.reclamos = false;
    const score = scoreAutoevaluacion(respuestas);
    expect(score.total).toBe(10);
    expect(score.si).toBe(8);
    expect(score.pct).toBe(80);
    expect(score.completo).toBe(true);
    expect(score.nivel).toBe("alto");
    expect(score.pendientes.map((i) => i.id)).toEqual(["dotacion", "reclamos"]);
  });

  it("score parcial: sin respuestas no es completo y pct usa el total", () => {
    const score = scoreAutoevaluacion({ dotacion: true });
    expect(score.respondidas).toBe(1);
    expect(score.completo).toBe(false);
    expect(score.pct).toBe(10);
  });

  it("niveles con copy definido", () => {
    expect(autoevalNivel(80)).toBe("alto");
    expect(autoevalNivel(79)).toBe("medio");
    expect(autoevalNivel(50)).toBe("medio");
    expect(autoevalNivel(49)).toBe("bajo");
    for (const nivel of ["alto", "medio", "bajo"]) {
      expect(AUTOEVAL_NIVEL_COPY[nivel].titulo).toBeTruthy();
      expect(AUTOEVAL_NIVEL_COPY[nivel].texto).toBeTruthy();
    }
  });

  it("autoevalEventValue genera el formato compacto", () => {
    const respuestas = Object.fromEntries(AUTOEVALUACION_ITEMS.map((i) => [i.id, true]));
    respuestas.dotacion = false;
    expect(autoevalEventValue(scoreAutoevaluacion(respuestas))).toBe("s:9|t:10|p:90");
    expect(autoevalEventValue(scoreAutoevaluacion({}))).toBeNull();
  });

  it("FAQ con preguntas y respuestas completas", () => {
    expect(AUTOEVALUACION_FAQ.length).toBeGreaterThanOrEqual(3);
    for (const item of AUTOEVALUACION_FAQ) {
      expect(item.q.endsWith("?")).toBe(true);
      expect(item.a.length).toBeGreaterThan(40);
    }
  });
});
