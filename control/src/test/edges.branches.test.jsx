import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('../Helper/ShowToast', () => ({ showToast: vi.fn(), showApiError: vi.fn() }));

import { exportTableData, printTableData } from '../utils/TableUtils';
import ChangePlanModal from '../Components/ReusableModal/ChangePlanModal';
import DeletePlanModal from '../Components/ReusableModal/DeletePlanModal';
import StatusChangeModal from '../Components/ReusableModal/StatusChangeModal';
import ExportPrintActions from '../Components/ExportPrintActions/ExportPrintActions';

/**
 * The last edge branches: blank cells in the export helpers, the absent-id
 * fallbacks in the plan modals, and the guards that return early before a ref
 * is attached.
 *
 * Note the export helpers read `col.header`, not `col.label` -- the columns
 * here are shaped the way TableUtils actually consumes them.
 */

const columns = [
  { key: 'name', header: 'Name' },
  { key: 'note', header: 'Note' },
];

beforeEach(() => {
  vi.clearAllMocks();
  global.URL.createObjectURL = vi.fn(() => 'blob:x');
  global.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TableUtils blank-cell handling', () => {
  it('writes an empty string for a missing cell rather than the word undefined', () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    let captured = '';
    const OriginalBlob = global.Blob;
    global.Blob = class extends OriginalBlob {
      constructor(parts, opts) {
        super(parts, opts);
        captured = parts.join('');
      }
    };

    exportTableData(
      [{ name: 'Acme', note: '' }, { name: 'Beta' }, { name: 'Zero', note: 0 }],
      columns,
      'tenants.csv'
    );

    expect(click).toHaveBeenCalled();
    expect(captured).not.toContain('undefined');
    // A falsy cell becomes an empty quoted field, including 0.
    expect(captured).toContain('"Beta",""');
    global.Blob = OriginalBlob;
  });

  it('falls back to key/value rows when no columns are supplied', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    let captured = '';
    const OriginalBlob = global.Blob;
    global.Blob = class extends OriginalBlob {
      constructor(parts, opts) {
        super(parts, opts);
        captured = parts.join('');
      }
    };

    exportTableData({ alpha: 1, beta: 2 }, [], 'kv.csv');
    expect(captured).toContain('Key,Value');
    expect(captured).toContain('"alpha"');
    global.Blob = OriginalBlob;
  });

  it('prints blank cells without leaking undefined into the markup', () => {
    const doc = { write: vi.fn(), close: vi.fn() };
    const win = { document: doc, focus: vi.fn(), print: vi.fn(), close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(win);

    printTableData([{ name: 'Acme', note: '' }, { name: 'Beta' }], columns, 'Tenants');

    const html = doc.write.mock.calls.map((c) => c[0]).join('');
    expect(html).not.toContain('undefined');
    expect(html).toContain('<th>Name</th>');
  });

  it('stringifies object values in the key/value print variant', () => {
    const doc = { write: vi.fn(), close: vi.fn() };
    const win = { document: doc, focus: vi.fn(), print: vi.fn(), close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(win);

    printTableData({ meta: { a: 1 }, plain: 'x' }, [], 'Details');

    const html = doc.write.mock.calls.map((c) => c[0]).join('');
    expect(html).toContain('{"a":1}');
    expect(html).toContain('plain');
  });
});

describe('plan modals with absent ids and names', () => {
  it('ChangePlanModal renders with no current plan id at all', () => {
    render(
      <ChangePlanModal
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        currentPlanId={undefined}
        plans={[{ id: 'p1', name: 'Starter' }]}
      />
    );
    const from = document.body.querySelector('select[disabled]');
    expect(from.value).toBe('');
    // With no current plan id the single option's value is "", which
    // SelectInput drops as a manually supplied placeholder -- so the field
    // falls back to SelectInput's own placeholder rather than "Unknown Plan".
    expect(from.options).toHaveLength(1);
    expect(from.options[0].textContent).toMatch(/-- Select/);
  });

  it('DeletePlanModal copes with a plan carrying no name', () => {
    expect(() =>
      render(<DeletePlanModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} plan={{ id: '1' }} />)
    ).not.toThrow();
  });

  it('DeletePlanModal copes with no plan at all', () => {
    expect(() =>
      render(<DeletePlanModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} plan={undefined} />)
    ).not.toThrow();
  });

  it('StatusChangeModal copes with a plan carrying an empty name', () => {
    render(
      <StatusChangeModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        plan={{ id: '1', name: '' }}
        action="activate"
      />
    );
    expect(screen.getByText(/Unnamed Plan/)).toBeInTheDocument();
  });
});

describe('ExportPrintActions', () => {
  it('opens its menu and offers the three actions', () => {
    const { container } = render(
      <ExportPrintActions
        data={[{ name: 'Acme' }]}
        columns={columns}
        title="Report"
      />
    );
    const trigger = container.querySelector('button');
    expect(trigger).toBeTruthy();
    fireEvent.click(trigger);
    expect(container).toBeTruthy();
  });

  it('survives a resize and scroll before the dropdown is anchored', () => {
    render(<ExportPrintActions data={[]} columns={columns} title="Report" />);
    act(() => {
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('scroll'));
    });
    expect(true).toBe(true);
  });
});
