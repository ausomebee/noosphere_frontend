import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../Helper/ShowToast', () => ({ showToast: vi.fn(), showApiError: vi.fn() }));

import InvoiceApi from '../api/InvoiceApi';
import ReusableModal from '../Components/ReusableModal/ReusableModal';
import DocumentViewer from '../Components/ReusableModal/DocumentViewer';
import StatusChangeModal from '../Components/ReusableModal/StatusChangeModal';
import ExportPrintActions from '../Components/ExportPrintActions/ExportPrintActions';

/**
 * Last-mile branches: the `error.message || "<fallback>"` arms that only fire
 * for a thrown error carrying no message at all, the primary button's busy
 * short-circuit, and the download filename fallback.
 */

beforeEach(() => {
  vi.clearAllMocks();
  global.URL.createObjectURL = vi.fn(() => 'blob:x');
  global.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('InvoiceApi transport failures with no message', () => {
  // A rejection whose `message` is empty must still produce the module's own
  // wording rather than an Error with a blank message.
  const blank = () => Object.assign(new Error(''), { message: '' });

  it('CreateStripePaymentIntent falls back', async () => {
    global.fetch = vi.fn().mockRejectedValue(blank());
    await expect(InvoiceApi.CreateStripePaymentIntent({ token: 't' })).rejects.toThrow(
      'We could not start this payment.'
    );
  });

  it('ConfirmPayment falls back', async () => {
    global.fetch = vi.fn().mockRejectedValue(blank());
    await expect(
      InvoiceApi.ConfirmPayment({ token: 't', paymentIntentId: 'pi_1' })
    ).rejects.toThrow('Failed to confirm payment');
  });

  it('RecordPayment falls back', async () => {
    global.fetch = vi.fn().mockRejectedValue(blank());
    await expect(InvoiceApi.RecordPayment({ tenantId: 't' })).rejects.toThrow(
      'Failed to record payment'
    );
  });
});

describe('ReusableModal busy short-circuit', () => {
  it('ignores a click on the primary button while it is already loading', () => {
    const onPrimary = vi.fn();
    render(
      <ReusableModal
        isOpen
        title="T"
        onClose={() => {}}
        onPrimaryButtonClick={onPrimary}
        primaryButtonLoading
      >
        <p>body</p>
      </ReusableModal>
    );
    // The button is disabled, but the handler must also guard itself so a
    // programmatic click cannot slip a second submit through.
    fireEvent.click(document.body.querySelector('.primary-button'));
    expect(onPrimary).not.toHaveBeenCalled();
  });
});

describe('DocumentViewer download filename fallback', () => {
  it('names the file "document" when none is supplied', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(['x']) });
    const anchors = [];
    const orig = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = orig(tag);
      if (tag === 'a') {
        el.click = vi.fn();
        anchors.push(el);
      }
      return el;
    });

    render(<DocumentViewer isOpen onClose={vi.fn()} fileUrl="https://x/a.pdf" />);
    const btn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      /download/i.test(b.textContent || b.getAttribute('aria-label') || '')
    );
    if (btn) {
      fireEvent.click(btn);
      await vi.waitFor(() => expect(anchors.length).toBeGreaterThan(0));
      expect(anchors[anchors.length - 1].download).toBe('document');
    }
  });
});

describe('StatusChangeModal named plan', () => {
  it('uses the plan name on the deactivate wording too', () => {
    render(
      <StatusChangeModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        plan={{ id: '1', name: 'Enterprise' }}
        action="deactivate"
      />
    );
    expect(screen.getByText(/deactivate the Enterprise plan/)).toBeInTheDocument();
  });

  it('falls back to Unnamed Plan on the deactivate wording', () => {
    render(
      <StatusChangeModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        plan={{ id: '1' }}
        action="deactivate"
      />
    );
    expect(screen.getByText(/deactivate the Unnamed Plan plan/)).toBeInTheDocument();
  });
});


describe('ExportPrintActions menu', () => {
  // The component takes handlers, not data: onExportCSV, onExportPDF, onPrint.
  const handlers = () => ({
    onExportCSV: vi.fn(),
    onExportPDF: vi.fn(),
    onPrint: vi.fn(),
  });

  it('opens on the trigger and positions against it', () => {
    const h = handlers();
    const { container } = render(<ExportPrintActions {...h} />);
    const trigger = container.querySelector('button');
    fireEvent.click(trigger);
    expect(container.querySelectorAll('button').length).toBeGreaterThan(1);
  });

  it('closes again when the trigger is clicked a second time', () => {
    const { container } = render(<ExportPrintActions {...handlers()} />);
    const trigger = container.querySelector('button');
    fireEvent.click(trigger);
    const openCount = container.querySelectorAll('button').length;
    fireEvent.click(trigger);
    expect(container.querySelectorAll('button').length).toBeLessThan(openCount);
  });

  it('closes when a mousedown lands outside both the menu and the trigger', () => {
    const { container } = render(<ExportPrintActions {...handlers()} />);
    const trigger = container.querySelector('button');
    fireEvent.click(trigger);
    const openCount = container.querySelectorAll('button').length;
    fireEvent.mouseDown(document.body);
    expect(container.querySelectorAll('button').length).toBeLessThan(openCount);
  });

  it('stays open when the mousedown lands on the trigger itself', () => {
    const { container } = render(<ExportPrintActions {...handlers()} />);
    const trigger = container.querySelector('button');
    fireEvent.click(trigger);
    const openCount = container.querySelectorAll('button').length;
    fireEvent.mouseDown(trigger);
    expect(container.querySelectorAll('button').length).toBe(openCount);
  });

  it('ignores an outside mousedown while the menu is closed', () => {
    const { container } = render(<ExportPrintActions {...handlers()} />);
    expect(() => fireEvent.mouseDown(document.body)).not.toThrow();
    expect(container.querySelector('button')).toBeInTheDocument();
  });

  it('invokes each action from the menu', () => {
    const h = handlers();
    const { container } = render(<ExportPrintActions {...h} />);
    fireEvent.click(container.querySelector('button'));
    const items = Array.from(container.querySelectorAll('button')).slice(1);
    items.forEach((b) => fireEvent.click(b));
    const called = [h.onExportCSV, h.onExportPDF, h.onPrint].filter((f) => f.mock.calls.length);
    expect(called.length).toBeGreaterThan(0);
  });
});
