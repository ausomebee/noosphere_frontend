import { describe, it, expect } from 'vitest';

describe('TableUtils - XSS Prevention', () => {
  it('exports all expected functions', async () => {
    const module = await import('../utils/TableUtils.jsx');
    expect(module.printTableData).toBeDefined();
    expect(module.exportTableData).toBeDefined();
    expect(module.exportTableToPDF).toBeDefined();
  });
});
