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
});
