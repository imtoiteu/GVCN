import { describe, expect, it } from 'vitest';

import { modelToPrintHtml } from '../printHtml';
import type { ExportModel } from '../exportModel';

const docModel: ExportModel = {
  artifactType: 'weeklyReport',
  title: 'BÁO CÁO TUẦN',
  meta: ['Lớp: 8A'],
  blocks: [
    { heading: true, text: '1. Tổng quan' },
    { heading: false, text: 'Ghi nhận <ổn định> & tiến bộ.' },
  ],
  table: null,
  filenameBase: '8a-bao-cao-tuan-1',
};

describe('modelToPrintHtml', () => {
  const html = modelToPrintHtml(docModel);

  it('is a UTF-8 HTML document with the title as <h1>', () => {
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('<h1>BÁO CÁO TUẦN</h1>');
  });

  it('renders headings as <h2> and paragraphs as <p>, with escaping', () => {
    expect(html).toContain('<h2>1. Tổng quan</h2>');
    expect(html).toContain('<p>Ghi nhận &lt;ổn định&gt; &amp; tiến bộ.</p>');
  });

  it('auto-triggers printing', () => {
    expect(html).toContain('window.print()');
  });

  it('renders a table for list models', () => {
    const html2 = modelToPrintHtml({
      ...docModel,
      blocks: [],
      table: { columns: ['Mã', 'Tên'], rows: [['8A-01', 'An']] },
    });
    expect(html2).toContain('<th>Mã</th>');
    expect(html2).toContain('<td>8A-01</td>');
  });
});
