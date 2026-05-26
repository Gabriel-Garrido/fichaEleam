import { describe, expect, it } from "vitest";
import {
  findUnknownTemplateVariables,
  renderTemplate,
  stageGuideText,
} from "./crmSalesPlaybook";

describe("crmSalesPlaybook templates", () => {
  it("renders allowed variables with safe fallbacks", () => {
    const text = renderTemplate(
      "Hola {{eleam_nombre}} en {{comuna}}: {{dolor_principal}}",
      { eleam_nombre: "ELEAM A", comuna: "Ñuñoa" },
    );
    expect(text).toContain("ELEAM A");
    expect(text).toContain("Ñuñoa");
    expect(text).toContain("ordenar la operación");
  });

  it("detects unknown variables", () => {
    expect(findUnknownTemplateVariables("Hola {{eleam_nombre}} {{foo}}")).toEqual(["foo"]);
  });

  it("returns complete sales guidance by stage", () => {
    const guide = stageGuideText("calificado");
    expect(guide).toContain("Objetivo:");
    expect(guide).toContain("Próxima mejor acción:");
  });
});
