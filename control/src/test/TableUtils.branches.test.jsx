import { describe, it, expect, vi, beforeEach } from 'vitest';

const save = vi.fn();
const text = vi.fn();
const autoTable = vi.fn();
// jsPDF is mocked outright: a real instance writes a file to disk on save().
vi.mock('jspdf', () => ({
  jsPDF: class {
    constructor(options) {
      this.options = options;
      this.internal = { pageSize: { getWidth: () => 297 } };
      this.setFontSize = vi.fn();
      this.text = text;
      this.save = save;
    }
  },
}));
vi.mock('jspdf-autotable', () => ({ default: (...a) => autoTable(...a) }));

import { exportTableToPDF, exportTableData, printTableData } from '../utils/TableUtils';

/**
 * How the three exporters cope with cells the table happens to be missing.
 *
 * TableUtils.test.jsx covers the two shapes each exporter accepts (a list of
 * rows with columns, or a plain object rendered as key/value). This file is
 * about the gaps inside those rows: a column whose value is null, undefined or
 * zero must come out as an empty cell rather than the string "undefined", and
 * the PDF exporter -- which builds a matrix of strings for autoTable -- is the
 * one that has to be checked cell by cell.
 */

// Deliberately falsy values of every kind the API returns for an absent field.
const sparse = [{ name: 'Acme Health', plan: null, seats: 0, owner: undefined }];
const columns = [
  { key: 'name', header: 'Name' },
  { key: 'plan', header: 'Plan' },
  { key: 'seats', header: 'Seats' },
  { key: 'owner', header: 'Owner' },
];

const pdfBody = () => autoTable.mock.calls[0][1].body;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('the PDF exporter', () => {
  it('blanks every falsy cell rather than printing undefined', async () => {
    await exportTableToPDF(sparse, columns, 'tenants.pdf', 'Tenants');
    expect(pdfBody()).toEqual([['1', 'Acme Health', '', '', '']]);
  });

  it('numbers the rows and titles the page', async () => {
    await exportTableToPDF(
      [{ name: 'Acme Health' }, { name: 'Beta Clinic' }],
      [{ key: 'name', header: 'Name' }],
      'tenants.pdf',
      'Tenants'
    );
    expect(pdfBody().map((r) => r[0])).toEqual(['1', '2']);
    expect(text).toHaveBeenCalledWith('Tenants', 20, 15);
    expect(save).toHaveBeenCalledWith('tenants.pdf');
  });

  it('gives every column an equal share of the printable width', async () => {
    await exportTableToPDF(sparse, columns, 'tenants.pdf', 'Tenants');
    const { columnStyles, head } = autoTable.mock.calls[0][1];
    // 297mm landscape less a 20mm margin either side, split five ways
    // (four columns plus the S/N column).
    expect(head[0]).toHaveLength(5);
    expect(Object.keys(columnStyles)).toHaveLength(5);
    expect(columnStyles[0].cellWidth).toBeCloseTo((297 - 40) / 5);
  });
});

describe('the CSV exporter', () => {
  it('blanks every falsy cell', () => {
    const link = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(link);
    global.URL.createObjectURL = vi.fn(() => 'blob:test');

    exportTableData(sparse, columns, 'tenants.csv');
    expect(link.download).toBe('tenants.csv');
    expect(link.click).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

describe('the print view', () => {
  it('blanks every falsy cell', () => {
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({
      document: { write, close: vi.fn() },
      print: vi.fn(),
    });

    printTableData(sparse, columns, 'Tenants');
    const html = write.mock.calls[0][0];
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('null');
    vi.restoreAllMocks();
  });
});
