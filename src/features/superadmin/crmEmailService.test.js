import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const singleMock = vi.fn();
  const selectMock = vi.fn(() => ({ single: singleMock }));
  const insertMock = vi.fn(() => ({ select: selectMock }));
  const fromMock = vi.fn(() => ({ insert: insertMock }));

  return { fromMock, insertMock, selectMock, singleMock };
});

vi.mock("../../services/supabaseConfig", () => ({
  supabase: {
    from: mocks.fromMock,
    auth: { getUser: vi.fn() },
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("../../services/edgeFunctionErrors", () => ({
  throwEdgeFunctionError: vi.fn(),
}));

import { bulkInsertProspects, sanitizeProspectWritePayload } from "./crmEmailService";

describe("sanitizeProspectWritePayload", () => {
  it("keeps only CRM prospect columns and converts undefined to null", () => {
    const payload = sanitizeProspectWritePayload(
      {
        eleam_nombre: "ELEAM A",
        notas: "Prospecto con texto libre.",
        facebook_url: undefined,
        correo_sugerido: "no debe insertarse",
        id: "client-side-id",
      },
      { listId: "list-1" },
    );

    expect(payload).toEqual({
      eleam_nombre: "ELEAM A",
      notas: "Prospecto con texto libre.",
      facebook_url: null,
      list_id: null,
    });
  });

  it("normalizes uuid and date fields before PostgREST insert", () => {
    const payload = sanitizeProspectWritePayload(
      {
        eleam_nombre: "ELEAM A",
        list_id: "no-es-uuid",
        demo_lead_id: "",
        eleam_id: "11111111-1111-4111-8111-111111111111",
        proxima_accion_fecha: "2026-06-04T12:30:00.000Z",
      },
      { listId: "22222222-2222-4222-8222-222222222222" },
    );

    expect(payload).toMatchObject({
      list_id: "22222222-2222-4222-8222-222222222222",
      demo_lead_id: null,
      eleam_id: "11111111-1111-4111-8111-111111111111",
      proxima_accion_fecha: "2026-06-04",
    });
  });

  it("keeps no_contactar consistent with estado", () => {
    expect(sanitizeProspectWritePayload({ eleam_nombre: "A", estado: "no_contactar" })).toMatchObject({
      estado: "no_contactar",
      no_contactar: true,
    });
    expect(sanitizeProspectWritePayload({ eleam_nombre: "B", estado: "nuevo", no_contactar: true })).toMatchObject({
      estado: "nuevo",
      no_contactar: false,
    });
  });
});

describe("bulkInsertProspects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts sanitized rows and associates payload errors to rowNumber", async () => {
    mocks.singleMock.mockResolvedValueOnce({
      data: null,
      error: {
        code: "22P02",
        message: "invalid input syntax for type json",
        details: 'Token "Prospecto" is invalid.',
      },
    });

    const result = await bulkInsertProspects("22222222-2222-4222-8222-222222222222", [
      {
        rowNumber: 7,
        label: "ELEAM A",
        payload: {
          eleam_nombre: "ELEAM A",
          notas: "Prospecto con interés alto.",
          correo_sugerido: "no debe llegar a Supabase",
        },
      },
    ]);

    expect(mocks.insertMock).toHaveBeenCalledWith({
      eleam_nombre: "ELEAM A",
      notas: "Prospecto con interés alto.",
      list_id: "22222222-2222-4222-8222-222222222222",
    });
    expect(result.inserted).toBe(0);
    expect(result.errors[0]).toMatchObject({ rowNumber: 7, label: "ELEAM A" });
    expect(result.errors[0].message).toContain("bloque CRM reconstruye crm_prospects");
  });

  it("reports duplicate emails with rowNumber", async () => {
    mocks.singleMock.mockResolvedValueOnce({
      data: null,
      error: {
        code: "23505",
        message: "duplicate key value violates unique constraint",
      },
    });

    const result = await bulkInsertProspects("22222222-2222-4222-8222-222222222222", [
      {
        rowNumber: 12,
        label: "ELEAM B",
        payload: { eleam_nombre: "ELEAM B", email: "contacto@eleamb.cl" },
      },
    ]);

    expect(result.duplicates).toEqual([
      {
        rowNumber: 12,
        label: "ELEAM B",
        email: "contacto@eleamb.cl",
        eleam_nombre: "ELEAM B",
      },
    ]);
    expect(result.errors).toEqual([]);
  });
});
