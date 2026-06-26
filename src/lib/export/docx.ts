// M7 — Minimal OOXML (.docx) writer.
//
// Builds a small, valid WordprocessingML document from an ExportModel and packs it with the
// store-only ZIP writer. No template engine, no dependency: just the three parts Word needs
// ([Content_Types].xml, _rels/.rels, word/document.xml). Vietnamese text is UTF-8 inside the XML,
// which Word renders with full diacritics. Pure and deterministic.
//
// The document.xml builder is exported separately so its structure is unit-tested without unzipping.

import type { ExportModel, ExportTable } from './exportModel';
import { zipStore } from './zip';

const encoder = new TextEncoder();

const CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ' +
  'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  '</Types>';

const RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" ' +
  'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" ' +
  'Target="word/document.xml"/>' +
  '</Relationships>';

/** Escape the five XML-significant characters. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** One paragraph (`<w:p>`), optionally bold and/or centered. */
function para(text: string, opts: { bold?: boolean; center?: boolean } = {}): string {
  const pPr = opts.center ? '<w:pPr><w:jc w:val="center"/></w:pPr>' : '';
  const rPr = opts.bold ? '<w:rPr><w:b/></w:rPr>' : '';
  return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
}

function cell(text: string, bold: boolean): string {
  return `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>${para(text, { bold })}</w:tc>`;
}

function row(cells: string[], bold: boolean): string {
  return `<w:tr>${cells.map((c) => cell(c, bold)).join('')}</w:tr>`;
}

function table(t: ExportTable): string {
  const sides = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'];
  const borders =
    '<w:tblBorders>' +
    sides.map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join('') +
    '</w:tblBorders>';
  const tblPr = `<w:tblPr><w:tblW w:w="0" w:type="auto"/>${borders}</w:tblPr>`;
  const header = row(t.columns, true);
  const body = t.rows.map((r) => row(r, false)).join('');
  return `<w:tbl>${tblPr}${header}${body}</w:tbl>`;
}

/** Build the `word/document.xml` body for a model (title → meta → blocks, or a table fallback). */
export function buildDocumentXml(model: ExportModel): string {
  const body: string[] = [];
  body.push(para(model.title, { bold: true, center: true }));
  for (const m of model.meta) body.push(para(m));

  if (model.blocks.length > 0) {
    for (const b of model.blocks) body.push(para(b.text, { bold: b.heading }));
  } else if (model.table) {
    body.push(table(model.table));
  } else {
    body.push(para('(Không có nội dung để xuất.)'));
  }

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    `<w:body>${body.join('')}<w:sectPr/></w:body>` +
    '</w:document>'
  );
}

/** Render an ExportModel as .docx bytes. */
export function modelToDocx(model: ExportModel): Uint8Array {
  return zipStore([
    { name: '[Content_Types].xml', data: encoder.encode(CONTENT_TYPES) },
    { name: '_rels/.rels', data: encoder.encode(RELS) },
    { name: 'word/document.xml', data: encoder.encode(buildDocumentXml(model)) },
  ]);
}

/** MIME type for a .docx download. */
export const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
