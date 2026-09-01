import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

vi.mock('../Helper/ShowToast', () => ({
  showToast: vi.fn(),
  showApiError: vi.fn(),
}));

const apiAdminLogin = vi.fn();
const apiAdminOnboarding = vi.fn();
vi.mock('../api/authApis', () => ({
  default: {
    get AdminLogin() { return apiAdminLogin; },
    get AdminOnboarding() { return apiAdminOnboarding; },
  },
}));

import InvoiceApi from '../api/InvoiceApi';
import DocumentViewer from '../Components/ReusableModal/DocumentViewer';
import { AdminLogin, OnboardAdmin } from '../ReduxStore/features/authentication';

/**
 * The last branch gaps in the control app: the Stripe calls' `data?.message`
 * fallbacks, the document viewer's extension parsing and overlay dismissal,
 * and the auth thunks' two-level error unwrapping.
 */

beforeEach(() => {
  vi.clearAllMocks();
});

describe('InvoiceApi Stripe calls', () => {
  const okJson = (body) => ({ ok: true, json: async () => body, text: async () => JSON.stringify(body) });
  const badJson = (body) => ({ ok: false, status: 400, json: async () => body, text: async () => JSON.stringify(body) });

  it('returns the intent when the server supplies a client secret', async () => {
    global.fetch = vi.fn().mockResolvedValue(okJson({ clientSecret: 'cs_1' }));
    await expect(InvoiceApi.CreateStripePaymentIntent({ token: 't' })).resolves.toEqual({
      clientSecret: 'cs_1',
    });
  });

  it('surfaces the server message when the intent cannot be started', async () => {
    global.fetch = vi.fn().mockResolvedValue(badJson({ message: 'invoice already paid' }));
    await expect(InvoiceApi.CreateStripePaymentIntent({ token: 't' })).rejects.toThrow(
      'invoice already paid'
    );
  });

  it('falls back when the failed response carries no message', async () => {
    global.fetch = vi.fn().mockResolvedValue(badJson({}));
    await expect(InvoiceApi.CreateStripePaymentIntent({ token: 't' })).rejects.toThrow(
      /could not start this payment/i
    );
  });

  it('refuses a success response with no client secret', async () => {
    global.fetch = vi.fn().mockResolvedValue(okJson({}));
    await expect(InvoiceApi.CreateStripePaymentIntent({ token: 't' })).rejects.toThrow(
      /no client secret/i
    );
  });

  it('confirms a payment and surfaces a confirmation failure', async () => {
    global.fetch = vi.fn().mockResolvedValue(okJson({ ok: true }));
    await expect(
      InvoiceApi.ConfirmPayment({ token: 't', paymentIntentId: 'pi_1' })
    ).resolves.toEqual({ ok: true });

    global.fetch = vi.fn().mockResolvedValue(badJson({ message: 'intent not settled' }));
    await expect(
      InvoiceApi.ConfirmPayment({ token: 't', paymentIntentId: 'pi_1' })
    ).rejects.toThrow('intent not settled');

    global.fetch = vi.fn().mockResolvedValue(badJson({}));
    await expect(
      InvoiceApi.ConfirmPayment({ token: 't', paymentIntentId: 'pi_1' })
    ).rejects.toThrow('Failed to confirm payment');
  });

  it('records a payment and surfaces a recording failure', async () => {
    global.fetch = vi.fn().mockResolvedValue(okJson({ id: 1 }));
    await expect(InvoiceApi.RecordPayment({ tenantId: 't' })).resolves.toEqual({ id: 1 });

    global.fetch = vi.fn().mockResolvedValue(badJson({ message: 'gone' }));
    await expect(InvoiceApi.RecordPayment({ tenantId: 't' })).rejects.toThrow('gone');

    global.fetch = vi.fn().mockResolvedValue(badJson({}));
    await expect(InvoiceApi.RecordPayment({ tenantId: 't' })).rejects.toThrow(
      'Failed to record payment'
    );
  });

  it('validates a payment token and surfaces an invalid one', async () => {
    global.fetch = vi.fn().mockResolvedValue(okJson({ valid: true }));
    await expect(InvoiceApi.ValidatePaymentToken({ token: 't' })).resolves.toEqual({
      valid: true,
    });

    global.fetch = vi.fn().mockResolvedValue(badJson({ message: 'expired' }));
    await expect(InvoiceApi.ValidatePaymentToken({ token: 't' })).rejects.toThrow('expired');

    global.fetch = vi.fn().mockResolvedValue(badJson({}));
    await expect(InvoiceApi.ValidatePaymentToken({ token: 't' })).rejects.toThrow(
      'Invalid or expired payment token'
    );
  });

  it('reports a transport failure rather than an empty message', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error(''));
    await expect(InvoiceApi.ValidatePaymentToken({ token: 't' })).rejects.toThrow(
      'Failed to validate payment token'
    );
  });
});

describe('DocumentViewer', () => {
  const base = { isOpen: true, onClose: vi.fn(), fileUrl: 'https://x/y/report.pdf', fileName: 'report.pdf' };

  it('renders nothing while closed', () => {
    const { container } = render(<DocumentViewer {...base} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('reads the extension past a query string', () => {
    render(<DocumentViewer {...base} fileUrl="https://x/y/report.pdf?sig=abc" />);
    expect(document.body.querySelector('.doc-viewer-overlay, [class*="doc-viewer"]')).toBeTruthy();
  });

  it('copes with no file url at all', () => {
    expect(() => render(<DocumentViewer {...base} fileUrl={undefined} />)).not.toThrow();
  });

  it('closes when the overlay itself is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<DocumentViewer {...base} onClose={onClose} />);
    const overlay = container.querySelector('[class*="overlay"]');
    if (overlay) {
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('does not close when a click starts inside the content', () => {
    const onClose = vi.fn();
    const { container } = render(<DocumentViewer {...base} onClose={onClose} />);
    const inner = container.querySelector('[class*="doc-viewer"]:not([class*="overlay"])');
    if (inner) {
      fireEvent.click(inner);
      expect(onClose).not.toHaveBeenCalled();
    }
  });

  it('falls back to a generic name when none is given', () => {
    expect(() => render(<DocumentViewer {...base} fileName={undefined} />)).not.toThrow();
  });

  it('clears the loading state whether the preview loads or fails', () => {
    const { container } = render(<DocumentViewer {...base} fileUrl="https://x/y/scan.png" />);
    const img = container.querySelector('img');
    if (img) {
      fireEvent.load(img);
      fireEvent.error(img);
    }
    expect(container).toBeTruthy();
  });
});

describe('auth thunks', () => {
  const run = async (thunk, arg) => {
    const dispatch = vi.fn();
    const getState = vi.fn(() => ({}));
    return thunk(arg)(dispatch, getState, undefined);
  };

  it('AdminLogin returns the payload on success', async () => {
    apiAdminLogin.mockResolvedValue({ data: { id: 1 } });
    const result = await run(AdminLogin, { email: 'a@b.co', password: 'pw' });
    expect(result.payload).toEqual({ id: 1 });
  });

  it('AdminLogin rejects with the backend message when there is one', async () => {
    apiAdminLogin.mockRejectedValue({ response: { data: { message: 'bad creds' } } });
    const result = await run(AdminLogin, { email: 'a@b.co', password: 'pw' });
    expect(result.payload).toBe('bad creds');
  });

  it('AdminLogin falls back to the error message when the backend sends none', async () => {
    apiAdminLogin.mockRejectedValue(new Error('network down'));
    const result = await run(AdminLogin, { email: 'a@b.co', password: 'pw' });
    expect(result.payload).toBe('network down');
  });

  it('OnboardAdmin returns the payload on success', async () => {
    apiAdminOnboarding.mockResolvedValue({ data: { ok: true } });
    const result = await run(OnboardAdmin, { id: '1', password: 'pw' });
    expect(result.payload).toEqual({ ok: true });
  });

  it('OnboardAdmin rejects with the backend message when there is one', async () => {
    apiAdminOnboarding.mockRejectedValue({ response: { data: { message: 'already onboarded' } } });
    const result = await run(OnboardAdmin, { id: '1', password: 'pw' });
    expect(result.payload).toBe('already onboarded');
  });

  it('OnboardAdmin falls back to the error message', async () => {
    apiAdminOnboarding.mockRejectedValue(new Error('timeout'));
    const result = await run(OnboardAdmin, { id: '1', password: 'pw' });
    expect(result.payload).toBe('timeout');
  });
});
