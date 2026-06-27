import { describe, it, expect } from 'vitest';
import { buildStudentTemplateWorkbook, TEMPLATE_SAMPLE_ROWS } from '../template';
import { importStudentsFromWorkbook } from '../studentImport';

describe('Excel template', () => {
  it('round-trips: the generated template is re-importable by the import engine', async () => {
    const bytes = await buildStudentTemplateWorkbook();
    const res = await importStudentsFromWorkbook(bytes);

    expect(res.errors).toHaveLength(0);
    expect(res.valid).toHaveLength(TEMPLATE_SAMPLE_ROWS.length);

    const codes = res.valid.map((s) => s.student_code);
    expect(codes).toEqual(['8A-01', '8A-02', '8A-03']);

    const an = res.valid[0];
    expect(an.full_name).toBe('Nguyễn Văn An'); // diacritics intact
    expect(an.gender).toBe('M'); // "Nam" normalized
    expect(an.dob).toBe('01/01/2012'); // date kept as written
    expect(an.note).toBe('Lớp trưởng');

    expect(res.valid[1].gender).toBe('F'); // "Nữ" normalized
    expect(res.valid[1].note).toBeNull(); // blank note → null
  });
});
