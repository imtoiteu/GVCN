// M7 — Print-friendly HTML (the PDF path).
//
// PDF export is intentionally done via a clean print page + the webview/browser "Save as PDF"
// (or print) flow rather than bundling a PDF engine — the safest, dependency-free option for this
// codebase. `modelToPrintHtml` returns a self-contained HTML document (UTF-8, Vietnamese-ready) that
// auto-opens the print dialog; the caller opens it in a new window. Pure and deterministic.

import type { ExportModel, ExportTable } from './exportModel';

/** Escape text for use in HTML element content / attributes. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function tableHtml(t: ExportTable): string {
  const head = `<tr>${t.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>`;
  const body = t.rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
    .join('');
  return `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

const STYLE = `
  * { box-sizing: border-box; }
  body { font-family: "Times New Roman", Georgia, serif; font-size: 13pt; color: #111;
         max-width: 800px; margin: 24px auto; padding: 0 16px; line-height: 1.5; }
  h1 { text-align: center; font-size: 16pt; margin: 0 0 4px; }
  .meta { text-align: center; color: #333; margin: 2px 0; }
  h2 { font-size: 13pt; margin: 16px 0 4px; }
  p { margin: 4px 0; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #444; padding: 6px 8px; text-align: left; vertical-align: top;
           white-space: pre-wrap; }
  th { background: #f0f0f0; }
  @media print { body { margin: 0; } .no-print { display: none; } }
`;

/** Build a self-contained, print-ready HTML document for a model. */
export function modelToPrintHtml(model: ExportModel): string {
  const parts: string[] = [];
  parts.push(`<h1>${esc(model.title)}</h1>`);
  for (const m of model.meta) parts.push(`<p class="meta">${esc(m)}</p>`);

  if (model.blocks.length > 0) {
    for (const b of model.blocks) {
      parts.push(b.heading ? `<h2>${esc(b.text)}</h2>` : `<p>${esc(b.text)}</p>`);
    }
  } else if (model.table) {
    parts.push(tableHtml(model.table));
  } else {
    parts.push('<p>(Không có nội dung để xuất.)</p>');
  }

  return (
    '<!doctype html><html lang="vi"><head><meta charset="utf-8">' +
    `<title>${esc(model.title)}</title><style>${STYLE}</style></head><body>` +
    parts.join('') +
    // Auto-open the print dialog once rendered; the user picks "Save as PDF".
    '<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},200);});</script>' +
    '</body></html>'
  );
}
