import { describe, expect, it } from "vitest";
import { getPrivateRouteTitle } from "./privateRouteMetadata";

describe("private route metadata", () => {
  it.each([
    ["/cobranza", "Cobranza de residentes"],
    ["/personal/equipo", "Equipo"],
    ["/residents/new", "Nuevo residente"],
    ["/residents/abc/edit", "Editar residente"],
    ["/residents/abc", "Ficha del residente"],
    ["/operacion/turnos/abc", "Entrega de turno"],
    ["/cumplimiento/requisito/abc", "Requisito de cumplimiento"],
    ["/superadmin/clientes", "Uso por ELEAM"],
  ])("resolves %s", (pathname, expected) => {
    expect(getPrivateRouteTitle(pathname)).toBe(expected);
  });

  it("uses a safe product title for an unknown private route", () => {
    expect(getPrivateRouteTitle("/ruta-futura")).toBe("FichaEleam");
  });
});
