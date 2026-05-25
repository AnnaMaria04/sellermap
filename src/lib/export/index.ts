// Dependency-free export engine: CSV, Excel-compatible (.xls via HTML), and PDF (print window).
// Used across reports, results, and tables so "Export / Save as PDF" actually produces a file.

export type ExportFormat = "csv" | "excel" | "pdf";

export interface ExportColumn<T> {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  format?: (row: T) => string | number;
}

export interface ExportMeta {
  label: string;
  value: string;
}

export interface ExportOptions<T> {
  filename: string;
  title?: string;
  subtitle?: string;
  columns: ExportColumn<T>[];
  rows: T[];
  format: ExportFormat;
  meta?: ExportMeta[];
}

function cellValue<T>(col: ExportColumn<T>, row: T): string {
  const raw = col.format ? col.format(row) : (row as Record<string, unknown>)[col.key];
  if (raw == null) return "";
  return String(raw);
}

function escapeCsv(value: string): string {
  if (/[",\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function triggerDownload(content: BlobPart, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportCsv<T>(opts: ExportOptions<T>) {
  const lines: string[] = [];
  if (opts.title) lines.push(escapeCsv(opts.title));
  if (opts.subtitle) lines.push(escapeCsv(opts.subtitle));
  opts.meta?.forEach((m) => lines.push(`${escapeCsv(m.label)};${escapeCsv(m.value)}`));
  if (opts.title || opts.meta?.length) lines.push("");

  lines.push(opts.columns.map((c) => escapeCsv(c.label)).join(";"));
  opts.rows.forEach((row) => {
    lines.push(opts.columns.map((c) => escapeCsv(cellValue(c, row))).join(";"));
  });
  // BOM so Excel reads Cyrillic UTF-8 correctly.
  triggerDownload("﻿" + lines.join("\r\n"), "text/csv;charset=utf-8", `${opts.filename}.csv`);
}

function buildTableHtml<T>(opts: ExportOptions<T>): string {
  const headCells = opts.columns
    .map((c) => `<th style="text-align:${c.align ?? "left"}">${escapeHtml(c.label)}</th>`)
    .join("");
  const bodyRows = opts.rows
    .map(
      (row) =>
        `<tr>${opts.columns
          .map(
            (c) =>
              `<td style="text-align:${c.align ?? "left"}">${escapeHtml(cellValue(c, row))}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");
  return `<table><thead><tr>${headCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
}

function exportExcel<T>(opts: ExportOptions<T>) {
  // HTML-table .xls — opens natively in Excel/LibreOffice/Google Sheets.
  const metaHtml = opts.meta?.length
    ? `<table><tbody>${opts.meta
        .map((m) => `<tr><td><b>${escapeHtml(m.label)}</b></td><td>${escapeHtml(m.value)}</td></tr>`)
        .join("")}</tbody></table>`
    : "";
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8" /><style>table{border-collapse:collapse}td,th{border:0.5pt solid #999;padding:4px 8px}th{background:#e8f5ee;font-weight:bold}</style></head>
<body>${opts.title ? `<h2>${escapeHtml(opts.title)}</h2>` : ""}${opts.subtitle ? `<p>${escapeHtml(opts.subtitle)}</p>` : ""}${metaHtml}${buildTableHtml(opts)}</body></html>`;
  triggerDownload("﻿" + html, "application/vnd.ms-excel;charset=utf-8", `${opts.filename}.xls`);
}

function exportPdf<T>(opts: ExportOptions<T>) {
  // Open a styled print window; the browser's print dialog lets the user "Save as PDF".
  const metaHtml = opts.meta?.length
    ? `<div class="meta">${opts.meta
        .map((m) => `<div class="meta-item"><span>${escapeHtml(m.label)}</span><b>${escapeHtml(m.value)}</b></div>`)
        .join("")}</div>`
    : "";
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8" />
<title>${escapeHtml(opts.title ?? opts.filename)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1a1d1f; margin: 32px; }
  .brand { display:flex; align-items:center; gap:8px; font-size:13px; color:#12a063; font-weight:700; letter-spacing:.02em; }
  h1 { font-size: 22px; margin: 12px 0 2px; }
  .subtitle { color:#6b7280; font-size: 13px; margin: 0 0 16px; }
  .meta { display:flex; flex-wrap:wrap; gap:10px 28px; margin: 0 0 20px; padding: 14px 16px; background:#f4f6f8; border-radius:10px; }
  .meta-item { display:flex; flex-direction:column; font-size:12px; }
  .meta-item span { color:#6b7280; }
  .meta-item b { font-size:15px; }
  table { width:100%; border-collapse: collapse; font-size: 12px; }
  thead th { background:#0c0e0f; color:#fff; padding:8px 10px; text-align:left; }
  tbody td { padding:7px 10px; border-bottom:1px solid #e5e7eb; }
  tbody tr:nth-child(even) { background:#f9fafb; }
  .footer { margin-top: 24px; font-size: 11px; color:#9ca3af; }
  @media print { body { margin: 0; } thead { display: table-header-group; } }
</style></head>
<body>
  <div class="brand">◆ SellerMap</div>
  ${opts.title ? `<h1>${escapeHtml(opts.title)}</h1>` : ""}
  ${opts.subtitle ? `<p class="subtitle">${escapeHtml(opts.subtitle)}</p>` : ""}
  ${metaHtml}
  ${buildTableHtml(opts)}
  <div class="footer">Сформировано в SellerMap · ${new Date().toLocaleString("ru-RU")}</div>
  <script>window.onload = function () { window.print(); };</script>
</body></html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    // Popup blocked — fall back to a downloadable HTML file the user can open & print.
    triggerDownload(html, "text/html;charset=utf-8", `${opts.filename}.html`);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

export function exportData<T>(opts: ExportOptions<T>): void {
  if (typeof window === "undefined") return;
  switch (opts.format) {
    case "csv":
      return exportCsv(opts);
    case "excel":
      return exportExcel(opts);
    case "pdf":
      return exportPdf(opts);
  }
}
