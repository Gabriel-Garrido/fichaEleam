const INSTRUCTIONS_SHEET = "Instrucciones";
const TEMPLATE_DATA_START_ROW = 2;
const TEMPLATE_DATA_END_ROW = 501;

function normalizeHeader(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cellValue(value) {
  if (value == null) return "";
  return value;
}

async function loadWriter() {
  const [writerMod, utilityMod] = await Promise.all([
    import("write-excel-file/browser"),
    import("write-excel-file/utility"),
  ]);
  return {
    writeXlsxFile: writerMod.default ?? writerMod,
    utility: utilityMod,
  };
}

async function loadReader() {
  const mod = await import("read-excel-file/browser");
  return {
    readXlsxFile: mod.default ?? mod,
    readSheet: mod.readSheet,
  };
}

function isRowsTable(value) {
  return Array.isArray(value) && (value.length === 0 || Array.isArray(value[0]));
}

function getRowsFromWorkbook(workbook, config) {
  if (isRowsTable(workbook)) return workbook;
  if (!Array.isArray(workbook)) return [];

  const targetSheet =
    workbook.find((sheet) => sheet?.sheet === config.sheetName) ??
    workbook.find((sheet) => sheet?.sheet !== INSTRUCTIONS_SHEET) ??
    workbook[0];

  return isRowsTable(targetSheet?.data) ? targetSheet.data : [];
}

function textCell(value, options = {}) {
  return {
    type: String,
    value: String(value ?? ""),
    wrap: true,
    alignVertical: "top",
    ...options,
  };
}

function dataCell(value) {
  if (value instanceof Date) return { type: Date, value };
  if (typeof value === "number") return { type: Number, value };
  return textCell(value);
}

function columnName(index) {
  let column = "";
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    value = Math.floor((value - 1) / 26);
  }
  return column;
}

function getRange(columnIndex) {
  const column = columnName(columnIndex);
  return `${column}${TEMPLATE_DATA_START_ROW}:${column}${TEMPLATE_DATA_END_ROW}`;
}

function getFirstDataCell(columnIndex) {
  return `${columnName(columnIndex)}${TEMPLATE_DATA_START_ROW}`;
}

function isDateColumn(column) {
  return column.key.startsWith("fecha_");
}

function createColumnValidation(column, columnIndex) {
  const cell = getFirstDataCell(columnIndex);
  const base = {
    sqref: getRange(columnIndex),
    allowBlank: !column.required,
  };

  if (column.validationList?.length) {
    return {
      ...base,
      type: "list",
      formula1: `"${column.validationList.join(",")}"`,
      promptTitle: "Selecciona una opción",
      prompt: `Valores permitidos: ${column.validationList.join(", ")}.`,
      errorTitle: "Valor no permitido",
      error: `Usa uno de estos valores: ${column.validationList.join(", ")}.`,
    };
  }

  if (isDateColumn(column)) {
    return {
      ...base,
      type: "date",
      operator: "between",
      formula1: "DATE(1900,1,1)",
      formula2: "DATE(2100,12,31)",
      promptTitle: "Fecha",
      prompt: "Usa formato AAAA-MM-DD o una fecha real de Excel.",
      errorTitle: "Fecha inválida",
      error: "Ingresa una fecha válida entre 1900-01-01 y 2100-12-31.",
    };
  }

  if (column.key === "indice_barthel") {
    return {
      ...base,
      type: "whole",
      operator: "between",
      formula1: "0",
      formula2: "100",
      promptTitle: "Índice Barthel",
      prompt: "Ingresa un número entero entre 0 y 100.",
      errorTitle: "Valor fuera de rango",
      error: "El Índice Barthel debe estar entre 0 y 100.",
    };
  }

  if (column.key === "email") {
    return {
      ...base,
      type: "custom",
      formula1: column.required
        ? `AND(LEN(TRIM(${cell}))>0,ISNUMBER(SEARCH("@",${cell})))`
        : `OR(${cell}="",ISNUMBER(SEARCH("@",${cell})))`,
      promptTitle: "Correo electrónico",
      prompt: "Ingresa un correo válido, por ejemplo nombre@dominio.cl.",
      errorTitle: "Correo inválido",
      error: "El correo debe contener @ y no puede quedar vacío si es obligatorio.",
    };
  }

  if (column.key === "rut") {
    return {
      ...base,
      type: "custom",
      formula1: `OR(${cell}="",AND(ISNUMBER(SEARCH("-",${cell})),LEN(${cell})>=8,LEN(${cell})<=12))`,
      promptTitle: "RUT",
      prompt: "Usa un RUT con guion, por ejemplo 12.345.678-5.",
      errorTitle: "RUT incompleto",
      error: "El RUT debe incluir guion y tener un largo válido.",
    };
  }

  if (column.required) {
    return {
      ...base,
      type: "custom",
      formula1: `LEN(TRIM(${cell}))>0`,
      promptTitle: "Campo obligatorio",
      prompt: "Completa esta columna antes de importar.",
      errorTitle: "Dato requerido",
      error: "Este campo no puede quedar vacío.",
    };
  }

  return null;
}

function buildDataValidations(config) {
  return config.columns
    .map((column, index) => createColumnValidation(column, index))
    .filter(Boolean);
}

function buildDataValidationFeature(utility) {
  const {
    getOrderOfSiblings,
    insertElementMarkupAccordingToOrderOfSiblings,
    sanitizeAttributeValue,
    sanitizeTextContent,
  } = utility;

  const boolAttr = (value) => (value ? "1" : "0");
  const attrs = (values) =>
    Object.entries(values)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => `${key}="${sanitizeAttributeValue(String(value))}"`)
      .join(" ");

  const validationXml = (validation) => {
    const xmlAttrs = attrs({
      type: validation.type,
      operator: validation.operator,
      allowBlank: boolAttr(validation.allowBlank),
      showInputMessage: "1",
      showErrorMessage: "1",
      errorStyle: "stop",
      sqref: validation.sqref,
      promptTitle: validation.promptTitle,
      prompt: validation.prompt,
      errorTitle: validation.errorTitle,
      error: validation.error,
    });
    let xml = `<dataValidation ${xmlAttrs}>`;
    xml += `<formula1>${sanitizeTextContent(validation.formula1)}</formula1>`;
    if (validation.formula2) xml += `<formula2>${sanitizeTextContent(validation.formula2)}</formula2>`;
    xml += "</dataValidation>";
    return xml;
  };

  return {
    files: {
      transform: {
        "xl/worksheets/sheet{id}.xml": {
          transform(xml, sheetOptions) {
            const validations = sheetOptions.dataValidations;
            if (!validations?.length) return xml;
            const validationsXml = `<dataValidations count="${validations.length}">${validations
              .map(validationXml)
              .join("")}</dataValidations>`;
            return insertElementMarkupAccordingToOrderOfSiblings(
              xml,
              validationsXml,
              getOrderOfSiblings("xl/worksheets/sheet{id}.xml", "worksheet"),
              "worksheet",
            );
          },
        },
      },
    },
  };
}

export async function downloadExcelTemplate(config) {
  const { writeXlsxFile, utility } = await loadWriter();

  const instructionsRows = [
    [textCell(config.title, { fontWeight: "bold", fontSize: 16, color: "#0F766E" })],
    [textCell("Cómo usar esta planilla", { fontWeight: "bold", color: "#334155" })],
    ...config.instructions.map((item) => [textCell(item)]),
    [textCell("")],
    [textCell("Columnas obligatorias", { fontWeight: "bold" }), textCell(config.columns.filter((c) => c.required).map((c) => c.header).join(", "))],
    [textCell("Formato de fecha", { fontWeight: "bold" }), textCell("Usa AAAA-MM-DD, por ejemplo 2026-05-13. También puedes usar una fecha real de Excel.")],
    [textCell("Valores controlados", { fontWeight: "bold" }), textCell("Cuando una columna indique opciones, escribe exactamente uno de los valores sugeridos.")],
  ];

  const headerRow = config.columns.map((column) =>
    textCell(column.header, {
      fontWeight: "bold",
      color: "#FFFFFF",
      backgroundColor: "#0F766E",
      alignVertical: "center",
    }),
  );

  const dataRows = [
    headerRow,
    ...config.sampleRows.map((row) => config.columns.map((column) => dataCell(row[column.key] ?? ""))),
  ];

  const workbook = writeXlsxFile(
    [
      {
        sheet: INSTRUCTIONS_SHEET,
        data: instructionsRows,
        columns: [{ width: 32 }, { width: 96 }],
      },
      {
        sheet: config.sheetName,
        data: dataRows,
        columns: config.columns.map((column) => ({ width: column.width ?? 18 })),
        dataValidations: buildDataValidations(config),
        stickyRowsCount: 1,
      },
    ],
    {
      fontFamily: "Calibri",
      fontSize: 11,
      features: [buildDataValidationFeature(utility)],
    },
  );

  await workbook.toFile(config.templateFilename);
}

export async function readExcelRows(file, config) {
  if (!file) throw new Error("Selecciona una planilla Excel.");
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("Sube un archivo .xlsx. Si estás usando Excel, guarda la planilla como Libro de Excel (.xlsx).");
  }

  const { readXlsxFile, readSheet } = await loadReader();
  let sheetRows = [];
  if (typeof readSheet === "function") {
    try {
      sheetRows = await readSheet(file, config.sheetName);
    } catch {
      const workbook = await readXlsxFile(file);
      sheetRows = getRowsFromWorkbook(workbook, config);
    }
  } else {
    const workbook = await readXlsxFile(file, { sheet: config.sheetName });
    sheetRows = getRowsFromWorkbook(workbook, config);
  }

  if (!sheetRows?.length) throw new Error("La planilla no tiene una hoja de datos válida.");

  const expected = new Map();
  for (const column of config.columns) {
    expected.set(normalizeHeader(column.header), column.key);
    for (const alias of column.aliases ?? []) expected.set(normalizeHeader(alias), column.key);
  }

  const headerMap = new Map();
  const headerRow = Array.isArray(sheetRows[0]) ? sheetRows[0] : [];
  if (!headerRow.length) {
    throw new Error(`No se encontraron títulos de columnas en la hoja ${config.sheetName}.`);
  }
  headerRow.forEach((value, index) => {
    const key = expected.get(normalizeHeader(value));
    if (key) headerMap.set(key, index);
  });

  const missing = config.columns.filter((column) => column.required && !headerMap.has(column.key));
  if (missing.length) {
    throw new Error(`Faltan columnas obligatorias: ${missing.map((column) => column.header).join(", ")}.`);
  }

  const rows = [];
  sheetRows.slice(1).forEach((row, index) => {
    const raw = {};
    let hasData = false;
    for (const column of config.columns) {
      const cellIndex = headerMap.get(column.key);
      const value = cellIndex != null ? cellValue(row[cellIndex]) : "";
      raw[column.key] = value;
      if (String(value ?? "").trim() !== "") hasData = true;
    }
    if (hasData) rows.push({ rowNumber: index + 2, raw });
  });

  return rows;
}
