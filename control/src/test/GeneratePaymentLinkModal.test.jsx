import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

/**
 * The two-tab modal an admin uses to put a paid plan in front of a tenant: pick
 * a plan type and renewal term on the first tab, then read the generated link
 * and the tenant's link history on the second.
 *
 * ReusableModal, the inputs and Button are all left real, because the modal's
 * behaviour is mostly which footer button it shows for which tab and whether the
 * pickers are wired to the right state -- mocking the shell away would leave
 * nothing to test. Only the two API modules and the toast helper are replaced.
 *
 * The plan card is a stack of `||` fallbacks over a plan record, so plans are
 * built from `plan()` with one field removed at a time rather than as realistic
 * catalogue entries.
 */

const mocks = vi.hoisted(() => ({
  billing: { GetPlanByPlanType: vi.fn() },
  invoice: {
    GeneratePaymentLink: vi.fn(),
    GetInvoiceHistory: vi.fn(),
    RegeneratePaymentLink: vi.fn(),
  },
  showToast: vi.fn(),
  showApiError: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({
  default: () => ({ accessToken: 'token', refreshToken: 'refresh' }),
}));
vi.mock('../api/BillingApis', () => ({ default: mocks.billing }));
vi.mock('../api/InvoiceApi', () => ({ default: mocks.invoice }));
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => mocks.showToast(...a),
  showApiError: (...a) => mocks.showApiError(...a),
}));

import GeneratePaymentLinkModal from '../Components/ReusableModal/GeneratePaymentLinkModal';

const plan = (over = {}) => ({
  id: 'p1',
  name: 'Growth',
  active: true,
  colourCode: '#123456',
  pricePerMonth: { currency: '£', price: 49 },
  forStorage: '500GB',
  features: [{ id: 'f1', name: 'Unlimited seats' }],
  extraFeaturesWithPrice: [{ pricePerMonth: { price: 5 } }],
  extraFeatures: [{ id: 'x1', name: 'Dedicated CSM' }],
  ...over,
});

const onClose = vi.fn();

const renderModal = async (props = {}) => {
  const view = render(
    <GeneratePaymentLinkModal isOpen onClose={onClose} tenantId="t1" {...props} />
  );
  await act(async () => {});
  return view;
};

const selectByLabel = (label) =>
  Array.from(document.body.querySelectorAll('.input-group')).find(
    (g) => g.querySelector('.input-label')?.textContent.startsWith(label)
  ).querySelector('select');

const choosePlan = async (id = 'p1') => {
  await act(async () => {
    fireEvent.change(selectByLabel('Select Plan'), { target: { value: id } });
  });
};

const chooseFrequency = async (value) => {
  await act(async () => {
    fireEvent.change(selectByLabel('Renewal Frequency'), { target: { value } });
  });
};

const generate = async () => {
  await act(async () => {
    fireEvent.click(screen.getByText('Generate payment link'));
  });
};

const openHistoryTab = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Payment Link' }));
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
  document.execCommand = vi.fn(() => true);
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  mocks.billing.GetPlanByPlanType.mockResolvedValue({ data: [plan()] });
  mocks.invoice.GetInvoiceHistory.mockResolvedValue({ data: [] });
  mocks.invoice.GeneratePaymentLink.mockResolvedValue({ data: 'https://pay.test/abc' });
  mocks.invoice.RegeneratePaymentLink.mockResolvedValue({ data: 'https://pay.test/xyz' });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('opening and closing', () => {
  it('renders nothing while closed and fetches no plans', async () => {
    render(<GeneratePaymentLinkModal isOpen={false} onClose={onClose} tenantId="t1" />);
    await act(async () => {});
    expect(document.body.querySelector('.modal-content')).toBeNull();
    expect(mocks.billing.GetPlanByPlanType).not.toHaveBeenCalled();
  });

  it('loads the standard plans as soon as it opens', async () => {
    await renderModal();
    expect(mocks.billing.GetPlanByPlanType).toHaveBeenCalledWith(
      expect.objectContaining({ planType: 'STANDARD' })
    );
    expect(screen.getByText('Generate Payment Link')).toBeInTheDocument();
  });

  it('discards the admin\'s choices when it is closed again', async () => {
    const { rerender } = await renderModal();
    await chooseFrequency('monthly');
    await choosePlan();
    await openHistoryTab();

    rerender(<GeneratePaymentLinkModal isOpen={false} onClose={onClose} tenantId="t1" />);
    await act(async () => {});
    rerender(<GeneratePaymentLinkModal isOpen onClose={onClose} tenantId="t1" />);
    await act(async () => {});

    expect(screen.getByText('Generate payment link')).toBeInTheDocument();
    expect(selectByLabel('Renewal Frequency').value).toBe('');
    expect(document.body.querySelector('.modal-plan-card')).toBeNull();
  });

  it('closes from the cancel button', async () => {
    await renderModal();
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('the plan pickers', () => {
  it('refetches when the plan type is switched to enterprise', async () => {
    await renderModal();
    const enterprise = document.body.querySelector('input[value="ENTERPRISE"]');
    await act(async () => {
      fireEvent.click(enterprise);
    });
    expect(mocks.billing.GetPlanByPlanType).toHaveBeenLastCalledWith(
      expect.objectContaining({ planType: 'ENTERPRISE' })
    );
  });

  it('offers only the active plans', async () => {
    mocks.billing.GetPlanByPlanType.mockResolvedValue({
      data: [plan({ id: 'p1', name: 'Growth' }), plan({ id: 'p2', name: 'Retired', active: false })],
    });
    await renderModal();
    const options = Array.from(selectByLabel('Select Plan').options).map((o) => o.textContent);
    expect(options).toContain('Growth');
    expect(options).not.toContain('Retired');
  });

  it('copes with a response that carries no plan array', async () => {
    mocks.billing.GetPlanByPlanType.mockResolvedValue({});
    await renderModal();
    expect(selectByLabel('Select Plan').options).toHaveLength(1);
  });

  it('points the admin at the plan catalogue when there are none', async () => {
    mocks.billing.GetPlanByPlanType.mockResolvedValue({ data: [] });
    await renderModal();
    expect(screen.getByText(/No plans found/)).toBeInTheDocument();
  });

  it('reports a failed plan load and leaves the picker empty', async () => {
    mocks.billing.GetPlanByPlanType.mockRejectedValue(new Error('500'));
    await renderModal();
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOAD_PLANS');
    expect(selectByLabel('Select Plan').options).toHaveLength(1);
  });

  it('disables the plan picker while the catalogue is in flight', () => {
    mocks.billing.GetPlanByPlanType.mockReturnValue(new Promise(() => {}));
    render(<GeneratePaymentLinkModal isOpen onClose={onClose} tenantId="t1" />);
    expect(selectByLabel('Select Plan')).toBeDisabled();
  });

  it('clears a chosen plan when the plan type changes underneath it', async () => {
    await renderModal();
    await choosePlan();
    expect(document.body.querySelector('.modal-plan-card')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(document.body.querySelector('input[value="ENTERPRISE"]'));
    });
    expect(document.body.querySelector('.modal-plan-card')).toBeNull();
  });

  it('drops the card again when the picker is returned to its placeholder', async () => {
    await renderModal();
    await choosePlan();
    await choosePlan('');
    expect(document.body.querySelector('.modal-plan-card')).toBeNull();
  });
});

describe('the plan card', () => {
  it('shows the plan colour, price and storage allowance', async () => {
    await renderModal();
    await choosePlan();
    expect(document.body.querySelector('.modal-plan-header').getAttribute('style')).toContain(
      'rgb(18, 52, 86)'
    );
    expect(screen.getByText('£49 PER MONTH')).toBeInTheDocument();
    expect(screen.getByText('500GB DATA STORAGE')).toBeInTheDocument();
    expect(screen.getByText('$5 FOR EVERY EXTRA CLIENT')).toBeInTheDocument();
    expect(screen.getByText('Unlimited seats')).toBeInTheDocument();
  });

  it('falls back on every missing pricing field', async () => {
    mocks.billing.GetPlanByPlanType.mockResolvedValue({
      data: [
        plan({
          colourCode: undefined,
          pricePerMonth: undefined,
          forStorage: undefined,
          extraFeaturesWithPrice: [{}],
        }),
      ],
    });
    await renderModal();
    await choosePlan();
    expect(document.body.querySelector('.modal-plan-header').getAttribute('style')).toContain(
      'rgb(0, 58, 155)'
    );
    expect(screen.getByText('$0 PER MONTH')).toBeInTheDocument();
    expect(screen.getByText('Unlimited DATA STORAGE')).toBeInTheDocument();
    expect(screen.getByText('$0 FOR EVERY EXTRA CLIENT')).toBeInTheDocument();
  });

  it('omits the extra-client line when the plan prices no extras', async () => {
    mocks.billing.GetPlanByPlanType.mockResolvedValue({
      data: [plan({ extraFeaturesWithPrice: [] })],
    });
    await renderModal();
    await choosePlan();
    expect(screen.queryByText(/FOR EVERY EXTRA CLIENT/)).not.toBeInTheDocument();
  });

  it('renders a feature given as a bare string', async () => {
    mocks.billing.GetPlanByPlanType.mockResolvedValue({
      data: [plan({ features: ['Audit log'] })],
    });
    await renderModal();
    await choosePlan();
    expect(screen.getByText('Audit log')).toBeInTheDocument();
  });

  it('says so when the plan lists no features', async () => {
    mocks.billing.GetPlanByPlanType.mockResolvedValue({ data: [plan({ features: [] })] });
    await renderModal();
    await choosePlan();
    expect(screen.getByText('No features available')).toBeInTheDocument();
  });

  it('says so when the plan has no features key at all', async () => {
    mocks.billing.GetPlanByPlanType.mockResolvedValue({ data: [plan({ features: undefined })] });
    await renderModal();
    await choosePlan();
    expect(screen.getByText('No features available')).toBeInTheDocument();
  });

  it('hides the extras block on a standard plan', async () => {
    await renderModal();
    await choosePlan();
    expect(screen.queryByText('PLAN EXTRAS')).not.toBeInTheDocument();
  });

  it('shows the extras block on an enterprise plan that has some', async () => {
    await renderModal();
    await act(async () => {
      fireEvent.click(document.body.querySelector('input[value="ENTERPRISE"]'));
    });
    await choosePlan();
    expect(screen.getByText('PLAN EXTRAS')).toBeInTheDocument();
    expect(screen.getByText('Dedicated CSM')).toBeInTheDocument();
  });

  it('hides the extras block on an enterprise plan with none', async () => {
    mocks.billing.GetPlanByPlanType.mockResolvedValue({ data: [plan({ extraFeatures: [] })] });
    await renderModal();
    await act(async () => {
      fireEvent.click(document.body.querySelector('input[value="ENTERPRISE"]'));
    });
    await choosePlan();
    expect(screen.queryByText('PLAN EXTRAS')).not.toBeInTheDocument();
  });
});

describe('generating the link', () => {
  it('refuses without a plan', async () => {
    await renderModal();
    await generate();
    expect(mocks.showToast).toHaveBeenCalledWith('Please select a plan', 'error');
    expect(mocks.invoice.GeneratePaymentLink).not.toHaveBeenCalled();
  });

  it('refuses without a renewal frequency', async () => {
    await renderModal();
    await choosePlan();
    await generate();
    expect(mocks.showToast).toHaveBeenCalledWith('Please select a renewal frequency', 'error');
    expect(mocks.invoice.GeneratePaymentLink).not.toHaveBeenCalled();
  });

  it('sends a monthly term as a single month', async () => {
    await renderModal();
    await choosePlan();
    await chooseFrequency('monthly');
    await generate();
    expect(mocks.invoice.GeneratePaymentLink).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 't1',
        planId: 'p1',
        billingFrequency: 'Monthly',
        quantity: 1,
      })
    );
  });

  it('sends a single-year term as one year', async () => {
    await renderModal();
    await choosePlan();
    await chooseFrequency('1_year');
    await generate();
    expect(mocks.invoice.GeneratePaymentLink).toHaveBeenCalledWith(
      expect.objectContaining({ billingFrequency: 'Yearly', quantity: 1 })
    );
  });

  it('sends a multi-year term with its count', async () => {
    await renderModal();
    await choosePlan();
    await chooseFrequency('10_years');
    await generate();
    expect(mocks.invoice.GeneratePaymentLink).toHaveBeenCalledWith(
      expect.objectContaining({ billingFrequency: 'Yearly', quantity: 10 })
    );
  });

  it('moves to the link tab and shows what it generated', async () => {
    await renderModal();
    await choosePlan();
    await chooseFrequency('monthly');
    await generate();
    expect(screen.getByText('https://pay.test/abc')).toBeInTheDocument();
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Payment link generated successfully!',
      'success'
    );
    expect(screen.getByText('Close')).toBeInTheDocument();
    // The modal passes `secondaryButtonText: null` on this tab, but
    // ReusableModal still renders the button and falls back to "Cancel".
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('still switches tabs when the response carries no link', async () => {
    mocks.invoice.GeneratePaymentLink.mockResolvedValue({});
    await renderModal();
    await choosePlan();
    await chooseFrequency('monthly');
    await generate();
    expect(document.body.querySelector('.payment-link-row')).toBeNull();
    expect(screen.getByText(/No payment link generated yet/)).toBeInTheDocument();
  });

  it('stays on the settings tab when generation fails', async () => {
    mocks.invoice.GeneratePaymentLink.mockRejectedValue(new Error('502'));
    await renderModal();
    await choosePlan();
    await chooseFrequency('monthly');
    await generate();
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'GENERATE_PAYMENT_LINK');
    expect(screen.getByText('Generate payment link')).toBeInTheDocument();
  });

  it('closes from the footer once the link tab is showing', async () => {
    await renderModal();
    await openHistoryTab();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('copying the link', () => {
  const copy = async () => {
    await act(async () => {
      fireEvent.click(screen.getByText('Copy link'));
    });
  };

  const withLink = async () => {
    await renderModal();
    await choosePlan();
    await chooseFrequency('monthly');
    await generate();
  };

  it('uses the clipboard API on a secure page', async () => {
    await withLink();
    await copy();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://pay.test/abc');
    expect(mocks.showToast).toHaveBeenLastCalledWith('Link copied to clipboard!', 'success');
  });

  it('falls back to a hidden textarea on an insecure page', async () => {
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    await withLink();
    await copy();
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(mocks.showToast).toHaveBeenLastCalledWith('Link copied to clipboard!', 'success');
  });

  it('reports a copy that the browser refused', async () => {
    navigator.clipboard.writeText.mockRejectedValueOnce(new Error('denied'));
    await withLink();
    await copy();
    expect(mocks.showToast).toHaveBeenLastCalledWith('Failed to copy link', 'error');
  });
});

describe('the link history', () => {
  const history = [
    { tokenId: 'k1', event: 'PAYMENT_LINK_GENERATED', time: '2026-01-02T09:05:00Z' },
    { tokenId: 'k2', event: 'PAYMENT_LINK_EXPIRED', time: '2026-01-09T09:05:00Z' },
    { tokenId: 'k3', event: 'PAYMENT_LINK_REGENERATED', time: '2026-01-10T09:05:00Z' },
    { tokenId: 'k4', event: 'PAYMENT_LINK_EXPIRED', time: '2026-01-17T09:05:00Z' },
    { tokenId: 'k5', event: 'PAYMENT_LINK_PAID', time: '2026-01-18T09:05:00Z' },
    { event: 'SOMETHING_NEW', time: '2026-01-19T09:05:00Z' },
  ];

  it('fetches the history only once the link tab is opened', async () => {
    await renderModal();
    expect(mocks.invoice.GetInvoiceHistory).not.toHaveBeenCalled();
    await openHistoryTab();
    expect(mocks.invoice.GetInvoiceHistory).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 't1' })
    );
  });

  it('says nothing has been generated when there is no history', async () => {
    await renderModal();
    await openHistoryTab();
    expect(screen.getByText(/No payment link generated yet/)).toBeInTheDocument();
  });

  it('shows a loader while the history is in flight', async () => {
    mocks.invoice.GetInvoiceHistory.mockReturnValue(new Promise(() => {}));
    await renderModal();
    await openHistoryTab();
    expect(document.body.querySelector('.section-loader')).toBeInTheDocument();
  });

  it('names each event in plain language and passes an unknown one through', async () => {
    mocks.invoice.GetInvoiceHistory.mockResolvedValue({ data: history });
    await renderModal();
    await openHistoryTab();
    const texts = Array.from(document.body.querySelectorAll('.history-entry-text')).map(
      (e) => e.textContent
    );
    expect(texts[0]).toContain('Payment link generated');
    expect(texts[1]).toContain('Payment link expired');
    expect(texts[2]).toContain('Payment link regenerated');
    expect(texts[4]).toContain('Plan purchase payment made on');
    expect(texts[5]).toContain('SOMETHING_NEW');
  });

  it('stamps each entry with a zero-padded local date and time', async () => {
    mocks.invoice.GetInvoiceHistory.mockResolvedValue({
      data: [{ tokenId: 'k1', event: 'PAYMENT_LINK_GENERATED', time: '2026-01-02T09:05:00Z' }],
    });
    await renderModal();
    await openHistoryTab();
    expect(document.body.querySelector('.history-entry-text').textContent).toMatch(
      /\d{2}\.\d{2}\.26, \d{2}:\d{2}$/
    );
  });

  it('offers regeneration against the most recent expiry only', async () => {
    mocks.invoice.GetInvoiceHistory.mockResolvedValue({ data: history });
    await renderModal();
    await openHistoryTab();
    const buttons = screen.getAllByText('Regenerate link');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].closest('.history-entry').textContent).toContain('17.01.26');
  });

  it('shows no regenerate button when nothing has expired', async () => {
    mocks.invoice.GetInvoiceHistory.mockResolvedValue({ data: [history[0]] });
    await renderModal();
    await openHistoryTab();
    expect(screen.queryByText('Regenerate link')).not.toBeInTheDocument();
  });

  it('treats a response with no data as an empty history', async () => {
    mocks.invoice.GetInvoiceHistory.mockResolvedValue({});
    await renderModal();
    await openHistoryTab();
    expect(screen.getByText(/No payment link generated yet/)).toBeInTheDocument();
  });

  it('logs a failed history fetch in development', async () => {
    mocks.invoice.GetInvoiceHistory.mockRejectedValue(new Error('500'));
    await renderModal();
    await openHistoryTab();
    expect(console.error).toHaveBeenCalled();
    expect(screen.getByText(/No payment link generated yet/)).toBeInTheDocument();
  });

  it('stays quiet about a failed history fetch in production', async () => {
    vi.stubEnv('DEV', false);
    mocks.invoice.GetInvoiceHistory.mockRejectedValue(new Error('500'));
    await renderModal();
    await openHistoryTab();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('does not fetch a history for a tenant it was never given', async () => {
    await renderModal({ tenantId: undefined });
    await openHistoryTab();
    expect(mocks.invoice.GetInvoiceHistory).not.toHaveBeenCalled();
  });

  it('replaces the shown link when regeneration succeeds', async () => {
    mocks.invoice.GetInvoiceHistory.mockResolvedValue({ data: history });
    await renderModal();
    await openHistoryTab();
    await act(async () => {
      fireEvent.click(screen.getByText('Regenerate link'));
    });
    expect(screen.getByText('https://pay.test/xyz')).toBeInTheDocument();
    expect(mocks.showToast).toHaveBeenLastCalledWith('Payment link regenerated!', 'success');
  });

  it('clears the shown link when regeneration returns nothing', async () => {
    mocks.invoice.GetInvoiceHistory.mockResolvedValue({ data: history });
    mocks.invoice.RegeneratePaymentLink.mockResolvedValue({});
    await renderModal();
    await openHistoryTab();
    await act(async () => {
      fireEvent.click(screen.getByText('Regenerate link'));
    });
    expect(document.body.querySelector('.payment-link-row')).toBeNull();
  });

  it('reports a failed regeneration', async () => {
    mocks.invoice.GetInvoiceHistory.mockResolvedValue({ data: history });
    mocks.invoice.RegeneratePaymentLink.mockRejectedValue(new Error('502'));
    await renderModal();
    await openHistoryTab();
    await act(async () => {
      fireEvent.click(screen.getByText('Regenerate link'));
    });
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'REGENERATE_PAYMENT_LINK');
  });
});

describe('plan extras without their own ids', () => {
  it('still lists an extra that arrives without an id', async () => {
    // The list key falls back to the array index; nothing else identifies the
    // row, so an id-less extra must still render.
    mocks.billing.GetPlanByPlanType.mockResolvedValue({
      data: [plan({ extraFeatures: [{ name: 'Dedicated CSM' }, { name: 'Onboarding' }] })],
    });
    await renderModal();
    await act(async () => {
      fireEvent.click(document.body.querySelector('input[value="ENTERPRISE"]'));
    });
    await choosePlan();
    expect(screen.getByText('Dedicated CSM')).toBeInTheDocument();
    expect(screen.getByText('Onboarding')).toBeInTheDocument();
  });
});
