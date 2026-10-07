export function downloadCsv(filename: string, head: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [head, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface Sheet {
  name: string;
  head: string[];
  rows: (string | number)[][];
}

/**
 * Excel workbook with one sheet per table (SpreadsheetML 2003 XML, which Excel, Numbers and
 * Google Sheets open directly). Numbers stay numbers so totals work in the spreadsheet.
 */
export function downloadWorkbook(filename: string, sheets: Sheet[]) {
  const x = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const cell = (v: string | number) => (typeof v === "number" && Number.isFinite(v) ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>` : `<Cell><Data ss:Type="String">${x(String(v ?? ""))}</Data></Cell>`);
  const sheet = (s: Sheet) =>
    `<Worksheet ss:Name="${x(s.name.slice(0, 31))}"><Table>` +
    `<Row>${s.head.map((h) => `<Cell ss:StyleID="h"><Data ss:Type="String">${x(h)}</Data></Cell>`).join("")}</Row>` +
    s.rows.map((r) => `<Row>${r.map(cell).join("")}</Row>`).join("") +
    `</Table></Worksheet>`;
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">` +
    `<Styles><Style ss:ID="h"><Font ss:Bold="1"/></Style></Styles>` +
    sheets.map(sheet).join("") +
    `</Workbook>`;
  const url = URL.createObjectURL(new Blob([xml], { type: "application/vnd.ms-excel" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
