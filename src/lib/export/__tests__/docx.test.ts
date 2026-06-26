import { describe, expect, it } from 'vitest';

import { buildDocumentXml, modelToDocx } from '../docx';
import type { ExportModel } from '../exportModel';

const docModel: ExportModel = {
  artifactType: 'minutes',
  title: 'BIÊN BẢN HỌP LỚP',
  meta: ['Lớp: 8A    Tuần: Tuần 1'],
  blocks: [
    { heading: true, text: '1. Tình hình chung' },
    { heading: false, text: 'Ghi nhận cho 4 học sinh <ổn định> & tiến bộ.' },
  ],
  table: null,
  filenameBase: '8a-bien-ban-tuan-1',
};

const tableModel: ExportModel = {
  artifactType: 'comments',
  title: 'Danh sách nhận xét',
  meta: [],
  blocks: [],
  table: { columns: ['Mã', 'Tên'], rows: [['8A-01', 'An']] },
  filenameBase: '8a-nhan-xet',
};

describe('buildDocumentXml', () => {
  it('renders a centered bold title and bold headings', () => {
    const xml = buildDocumentXml(docModel);
    expect(xml).toContain('<w:jc w:val="center"/>');
    expect(xml).toContain('BIÊN BẢN HỌP LỚP');
    // The heading run carries bold (<w:b/>); the plain paragraph does not.
    expect(xml).toContain('<w:rPr><w:b/></w:rPr><w:t xml:space="preserve">1. Tình hình chung</w:t>');
  });

  it('escapes XML-significant characters in body text', () => {
    const xml = buildDocumentXml(docModel);
    expect(xml).toContain('&lt;ổn định&gt; &amp; tiến bộ.');
    expect(xml).not.toContain('<ổn định>');
  });

  it('renders a table when the model has no blocks', () => {
    const xml = buildDocumentXml(tableModel);
    expect(xml).toContain('<w:tbl>');
    expect(xml).toContain('8A-01');
    expect(xml).toContain('<w:tblBorders>');
  });
});

describe('modelToDocx', () => {
  it('produces a ZIP (PK header) containing the three OOXML parts', () => {
    const bytes = modelToDocx(docModel);
    expect(bytes[0]).toBe(0x50); // 'P'
    expect(bytes[1]).toBe(0x4b); // 'K'
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('[Content_Types].xml');
    expect(text).toContain('_rels/.rels');
    expect(text).toContain('word/document.xml');
  });
});
