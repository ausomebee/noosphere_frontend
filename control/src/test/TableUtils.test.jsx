import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportTableData, printTableData } from '../utils/TableUtils';

describe('exportTableData', () => {
  let createElementSpy;
  let clickMock;

  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => 'blob:test');
    clickMock = vi.fn();
    createElementSpy = vi.spyOn(document, 'createElement');
  });

  afterEach(() => {
    createElementSpy.mockRestore();
  });

  it('exports with columns', () => {
    const mockLink = { href: '', download: '', click: clickMock };
    createElementSpy.mockImplementation((tag) => {
      if (tag === 'a') return mockLink;
      return document.createElement(tag);
    });

    const data = [
      { name: 'John', email: 'john@test.com' },
      { name: 'Jane', email: 'jane@test.com' },
    ];
    const columns = [
      { key: 'name', header: 'Name' },
      { key: 'email', header: 'Email' },
    ];

    exportTableData(data, columns, 'test.csv');
    expect(clickMock).toHaveBeenCalled();
    expect(mockLink.download).toBe('test.csv');
  });

  it('exports without columns (key-value format)', () => {
    const mockLink = { href: '', download: '', click: clickMock };
    createElementSpy.mockImplementation((tag) => {
      if (tag === 'a') return mockLink;
      return document.createElement(tag);
    });

    const data = { Plan: 'Basic', Amount: '$100' };
    exportTableData(data);
    expect(clickMock).toHaveBeenCalled();
  });
});

describe('printTableData', () => {
  it('opens print window with columns', () => {
    const writeMock = vi.fn();
    const closeMock = vi.fn();
    const printMock = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({
      document: {
        write: writeMock,
        close: closeMock,
      },
      print: printMock,
    });

    const data = [{ name: 'John' }];
    const columns = [{ key: 'name', header: 'Name' }];
    printTableData(data, columns, 'Test');

    expect(writeMock).toHaveBeenCalled();
    expect(closeMock).toHaveBeenCalled();
    expect(printMock).toHaveBeenCalled();
    const html = writeMock.mock.calls[0][0];
    expect(html).toContain('Test');
    expect(html).toContain('Name');
    expect(html).toContain('John');
  });

  it('opens print window without columns (key-value)', () => {
    const writeMock = vi.fn();
    const closeMock = vi.fn();
    const printMock = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({
      document: { write: writeMock, close: closeMock },
      print: printMock,
    });

    const data = { Plan: 'Basic', Amount: '$100' };
    printTableData(data, [], 'KV Test');

    expect(writeMock).toHaveBeenCalled();
    const html = writeMock.mock.calls[0][0];
    expect(html).toContain('Key');
    expect(html).toContain('Value');
    expect(html).toContain('Plan');
    expect(html).toContain('Basic');
  });
});

describe('printTableData escaping', () => {
  const capture = () => {
    const writeMock = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({
      document: { write: writeMock, close: vi.fn() },
      print: vi.fn(),
    });
    return () => writeMock.mock.calls[0][0];
  };

  it('writes markup in cells, headers and the title as text, not HTML', () => {
    const html = capture();
    printTableData(
      [{ name: '<img src=x onerror="alert(1)">' }],
      [{ key: 'name', header: '<b>Name</b>' }],
      "</title><script>alert('t')</script>"
    );
    const out = html();
    expect(out).not.toContain('<img');
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('<b>');
    expect(out).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(out).toContain('&lt;b&gt;Name&lt;/b&gt;');
    expect(out).toContain('&lt;/title&gt;&lt;script&gt;alert(&#39;t&#39;)&lt;/script&gt;');
  });

  it('escapes key/value rows too', () => {
    const html = capture();
    printTableData({ '<k>': '<v>', nested: { a: '<x>' } }, [], 'KV');
    const out = html();
    expect(out).toContain('<td>&lt;k&gt;</td><td>&lt;v&gt;</td>');
    expect(out).toContain('{&quot;a&quot;:&quot;&lt;x&gt;&quot;}');
  });

  it('leaves ordinary text exactly as before', () => {
    const html = capture();
    printTableData(
      [{ name: 'John', count: 0, missing: null }],
      [
        { key: 'name', header: 'Name' },
        { key: 'count', header: 'Count' },
        { key: 'missing', header: 'Missing' },
      ],
      'Tenants'
    );
    const out = html();
    expect(out).toContain('<title>Tenants</title>');
    expect(out).toContain('<h1>Tenants</h1>');
    expect(out).toContain('<th>S/N</th><th>Name</th><th>Count</th><th>Missing</th>');
    // Falsy values still print as empty cells, as they always have.
    expect(out).toContain('<tr><td>1</td><td>John</td><td></td><td></td></tr>');
  });
});

describe('exportTableToPDF', () => {
  it('generates PDF with columns', async () => {
    const saveMock = vi.fn();
    const textMock = vi.fn();
    const autoTableMock = vi.fn();
    const mockDoc = {
      internal: { pageSize: { getWidth: () => 297 } },
      setFontSize: vi.fn(),
      text: textMock,
      save: saveMock,
    };

    vi.doMock('jspdf', () => ({ jsPDF: function() { return mockDoc; } }));
    vi.doMock('jspdf-autotable', () => ({ default: autoTableMock }));

    const { exportTableToPDF } = await import('../utils/TableUtils');
    const data = [{ name: 'John', email: 'john@test.com' }];
    const columns = [{ key: 'name', header: 'Name' }, { key: 'email', header: 'Email' }];

    await exportTableToPDF(data, columns, 'test.pdf', 'Test Table');
    expect(saveMock).toHaveBeenCalledWith('test.pdf');
    expect(textMock).toHaveBeenCalledWith('Test Table', expect.any(Number), expect.any(Number));
  });

  it('generates PDF without columns (key-value)', async () => {
    const saveMock = vi.fn();
    const autoTableMock = vi.fn();
    const mockDoc = {
      internal: { pageSize: { getWidth: () => 297 } },
      setFontSize: vi.fn(),
      text: vi.fn(),
      save: saveMock,
    };

    vi.doMock('jspdf', () => ({ jsPDF: function() { return mockDoc; } }));
    vi.doMock('jspdf-autotable', () => ({ default: autoTableMock }));

    const { exportTableToPDF } = await import('../utils/TableUtils');
    const data = { Plan: 'Basic', Amount: { currency: 'USD' } };
    await exportTableToPDF(data, [], 'kv.pdf', 'KV');
    expect(saveMock).toHaveBeenCalledWith('kv.pdf');
  });
});
