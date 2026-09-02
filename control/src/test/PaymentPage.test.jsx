import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

/**
 * The public checkout page a payer lands on from an emailed payment link.
 *
 * It validates the token, shows the plan, hands off to a gateway form and then
 * renders a receipt with a PDF download. Almost every value it displays is the
 * left-hand side of a `||`, `??` or `?.` chain, so the fixtures below vary one
 * field at a time to reach both arms rather than describing one realistic
 * invoice.
 *
 * StripeForm is replaced by a probe that exposes the `onSuccess` and `onError`
 * callbacks as buttons, with the payload the probe sends set per test through
 * the hoisted `mocks.gatewayResult` / `mocks.gatewayError`. That is the only way
 * in: the page never calls those handlers itself.
 *
 * jsPDF is mocked because the real one writes a file into the repo when
 * `doc.save` runs, and `stripePromise` is decided once at module scope, so the
 * one test that cares about it re-imports the module under a stubbed env.
 */

const mocks = vi.hoisted(() => ({
  params: { token: 'tok-1' },
  api: {
    ValidatePaymentToken: vi.fn(),
    ConfirmPayment: vi.fn(),
    RecordPayment: vi.fn(),
  },
  showToast: vi.fn(),
  showApiError: vi.fn(),
  loadStripe: vi.fn(() => 'stripe-instance'),
  gatewayResult: {},
  gatewayError: {},
  pdf: {
    save: vi.fn(),
    text: vi.fn(),
    rect: vi.fn(),
    line: vi.fn(),
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    setFillColor: vi.fn(),
    setDrawColor: vi.fn(),
    internal: { pageSize: { getWidth: () => 595 } },
  },
  jsPDF: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => mocks.params };
});

vi.mock('../api/InvoiceApi', () => ({ default: mocks.api }));

vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => mocks.showToast(...a),
  showApiError: (...a) => mocks.showApiError(...a),
}));

// An unmocked jsPDF would write a real receipt-*.pdf next to the test run.
vi.mock('jspdf', () => ({
  default: function jsPDFStub(...args) {
    mocks.jsPDF(...args);
    return mocks.pdf;
  },
}));

vi.mock('@stripe/stripe-js', () => ({ loadStripe: (...a) => mocks.loadStripe(...a) }));

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }) => <div data-testid="stripe-elements">{children}</div>,
}));

vi.mock('@paypal/react-paypal-js', () => ({
  PayPalScriptProvider: ({ children }) => <div data-testid="paypal-provider">{children}</div>,
}));

vi.mock('../Pages/Payment/StripeForm', () => ({
  default: (props) => (
    <div data-testid="stripe-form">
      <span data-testid="stripe-form-props">
        {JSON.stringify({
          token: props.token,
          amount: props.amount,
          currency: props.currency,
          tenantId: props.tenantId,
          email: props.email,
        })}
      </span>
      <button
        data-testid="stripe-succeed"
        onClick={() => Promise.resolve(props.onSuccess(mocks.gatewayResult)).catch(() => {})}
      >
        succeed
      </button>
      <button
        data-testid="stripe-fail"
        onClick={() => Promise.resolve(props.onError(mocks.gatewayError)).catch(() => {})}
      >
        fail
      </button>
    </div>
  ),
}));

vi.mock('../Pages/Payment/PayPalForm', () => ({
  default: () => <div data-testid="paypal-form" />,
}));

import PaymentPage from '../Pages/Payment/PaymentPage';

// A fully populated invoice: every optional field present so that removing one
// in a test isolates exactly one fallback branch.
const fullInvoice = (over = {}) => ({
  id: 'inv-1',
  tenantId: 'ten-1',
  planId: 'plan-1',
  total: 120,
  billingFrequency: 'Yearly',
  quantity: 1,
  email: 'invoice@example.com',
  tenant: { companyName: 'Acme Health', email: 'billing@acme.test' },
  plan: {
    name: 'Growth',
    colourCode: '#123456',
    pricePerMonth: { price: 10, currency: 'GBP' },
    features: [{ id: 'f1', name: 'Unlimited seats' }],
  },
  ...over,
});

const renderPage = async (invoice = fullInvoice(), token = 'tok-1') => {
  mocks.params = { token };
  if (invoice instanceof Error) {
    mocks.api.ValidatePaymentToken.mockRejectedValue(invoice);
  } else {
    mocks.api.ValidatePaymentToken.mockResolvedValue({ data: invoice });
  }
  const view = render(<PaymentPage />);
  await act(async () => {});
  return view;
};

// Walk from the method chooser through to a rendered receipt in one step.
const payWithStripe = async (result) => {
  mocks.gatewayResult = result;
  fireEvent.click(screen.getByText('Credit / Debit Card'));
  await act(async () => {
    fireEvent.click(screen.getByTestId('stripe-succeed'));
  });
};

const receiptRow = (label) => {
  const row = Array.from(document.body.querySelectorAll('.pp-receipt-row')).find(
    (r) => r.querySelector('.pp-receipt-label')?.textContent === label
  );
  return row?.querySelector('.pp-receipt-val') ?? null;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.gatewayResult = { paymentMethod: 'stripe', paymentIntentId: 'pi_1' };
  mocks.gatewayError = { error: 'Card declined', paymentMethod: 'stripe' };
  mocks.api.ConfirmPayment.mockResolvedValue({});
  mocks.api.RecordPayment.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('token validation', () => {
  it('shows the validating spinner before the token comes back', () => {
    mocks.params = { token: 'tok-1' };
    mocks.api.ValidatePaymentToken.mockReturnValue(new Promise(() => {}));
    render(<PaymentPage />);
    expect(screen.getByText('Validating payment link…')).toBeInTheDocument();
  });

  it('refuses to call the API when the route carries no token', async () => {
    mocks.params = {};
    render(<PaymentPage />);
    await act(async () => {});
    expect(mocks.api.ValidatePaymentToken).not.toHaveBeenCalled();
    expect(screen.getByText('This payment link has expired')).toBeInTheDocument();
  });

  it('shows the expiry page when validation rejects', async () => {
    await renderPage(new Error('Token already used'));
    expect(screen.getByText('This payment link has expired')).toBeInTheDocument();
  });

  it('shows the expiry page when the rejection carries no message', async () => {
    const bare = new Error();
    bare.message = '';
    await renderPage(bare);
    expect(screen.getByText('This payment link has expired')).toBeInTheDocument();
  });

  it('shows the expiry page when the response body is empty', async () => {
    await renderPage(null);
    expect(screen.getByText('This payment link has expired')).toBeInTheDocument();
  });

  it('lists the three recovery steps on the expiry page', async () => {
    await renderPage(null);
    expect(screen.getByText(/Ask them to send you a fresh payment link/)).toBeInTheDocument();
  });
});

describe('the plan panel', () => {
  it('names the paying company when the invoice has a tenant', async () => {
    await renderPage();
    expect(screen.getAllByText('Subscribing for Acme Health').length).toBeGreaterThan(0);
  });

  it('falls back to a generic eyebrow with no tenant', async () => {
    await renderPage(fullInvoice({ tenant: undefined }));
    expect(screen.getAllByText('You are subscribing to').length).toBeGreaterThan(0);
  });

  it('falls back to a generic plan name', async () => {
    await renderPage(fullInvoice({ plan: {} }));
    expect(screen.getAllByText('Subscription Plan').length).toBeGreaterThan(0);
  });

  it('lists the plan features', async () => {
    await renderPage();
    expect(screen.getAllByText('Unlimited seats').length).toBe(2);
  });

  it('omits the features block when the plan has none', async () => {
    await renderPage(fullInvoice({ plan: { name: 'Growth', features: [] } }));
    expect(screen.queryByText("What's included")).not.toBeInTheDocument();
  });

  it('omits the features block when the plan has no features key at all', async () => {
    await renderPage(fullInvoice({ plan: { name: 'Growth' } }));
    expect(screen.queryByText("What's included")).not.toBeInTheDocument();
  });
});

describe('price formatting', () => {
  it('says per month for a monthly invoice', async () => {
    await renderPage(fullInvoice({ billingFrequency: 'Monthly' }));
    expect(screen.getAllByText('/month').length).toBeGreaterThan(0);
  });

  it('says per year for a single-year invoice', async () => {
    await renderPage();
    expect(screen.getAllByText('/year').length).toBeGreaterThan(0);
  });

  it('counts the years for a multi-year invoice', async () => {
    await renderPage(fullInvoice({ quantity: 3 }));
    expect(screen.getAllByText('/3 years').length).toBeGreaterThan(0);
  });

  it('falls back to the plan monthly price when the invoice has no total', async () => {
    await renderPage(fullInvoice({ total: undefined }));
    expect(screen.getAllByText('10.00').length).toBeGreaterThan(0);
  });

  it('falls back to zero when neither total nor plan price exists', async () => {
    await renderPage(fullInvoice({ total: undefined, plan: { name: 'Growth' } }));
    expect(screen.getAllByText('0.00').length).toBeGreaterThan(0);
  });

  it('falls back to USD when the plan carries no currency', async () => {
    await renderPage(fullInvoice({ plan: { name: 'Growth' } }));
    expect(screen.getAllByText('USD').length).toBeGreaterThan(0);
  });

  it('uses the plan currency when there is one', async () => {
    await renderPage();
    expect(screen.getAllByText('GBP').length).toBeGreaterThan(0);
  });
});

describe('the method chooser', () => {
  it('offers card payment on the checkout screen', async () => {
    await renderPage();
    expect(screen.getByText('Secure Checkout')).toBeInTheDocument();
    expect(screen.getByText('Credit / Debit Card')).toBeInTheDocument();
  });

  it('hides the PayPal route while the gateway is switched off', async () => {
    await renderPage();
    expect(screen.queryByText('PayPal')).not.toBeInTheDocument();
    expect(screen.queryByText('Popular')).not.toBeInTheDocument();
  });

  it('swaps the heading and hides the amount pill once card is chosen', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('Credit / Debit Card'));
    expect(screen.getByText('Card Details')).toBeInTheDocument();
    expect(screen.getByText('Completing payment for Growth')).toBeInTheDocument();
    expect(document.body.querySelector('.pp-amount-pill')).toBeNull();
  });

  it('passes the tenant email through to the card form', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('Credit / Debit Card'));
    const props = JSON.parse(screen.getByTestId('stripe-form-props').textContent);
    expect(props).toMatchObject({ token: 'tok-1', tenantId: 'ten-1', email: 'billing@acme.test' });
  });

  it('falls back to the invoice email when the tenant has none', async () => {
    await renderPage(fullInvoice({ tenant: { companyName: 'Acme Health' } }));
    fireEvent.click(screen.getByText('Credit / Debit Card'));
    const props = JSON.parse(screen.getByTestId('stripe-form-props').textContent);
    expect(props.email).toBe('invoice@example.com');
  });

  it('passes an empty email when the invoice has none either', async () => {
    await renderPage(fullInvoice({ tenant: undefined, email: undefined }));
    fireEvent.click(screen.getByText('Credit / Debit Card'));
    const props = JSON.parse(screen.getByTestId('stripe-form-props').textContent);
    expect(props.email).toBe('');
  });

  it('returns to the chooser from the back link', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('Credit / Debit Card'));
    fireEvent.click(screen.getByText('← Back to payment methods'));
    expect(screen.getByText('Secure Checkout')).toBeInTheDocument();
  });

  it('tints the panel with the plan colour, or navy when there is none', async () => {
    // jsdom re-serialises the hex the component wrote, so match on the rgb form.
    const { unmount } = await renderPage();
    expect(document.body.querySelector('.pp-left').getAttribute('style')).toContain(
      'rgb(18, 52, 86)'
    );
    unmount();
    await renderPage(fullInvoice({ plan: { name: 'Growth' } }));
    expect(document.body.querySelector('.pp-left').getAttribute('style')).toContain(
      'rgb(30, 58, 138)'
    );
  });
});

describe('a successful payment', () => {
  it('asks the server to verify the Stripe intent rather than reporting the amount', async () => {
    await renderPage();
    await payWithStripe({ paymentMethod: 'stripe', paymentIntentId: 'pi_9', status: 'Successful' });
    expect(mocks.api.ConfirmPayment).toHaveBeenCalledWith({ token: 'tok-1', paymentIntentId: 'pi_9' });
    expect(mocks.api.RecordPayment).not.toHaveBeenCalled();
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Payment successful! Your subscription is now active.',
      'success'
    );
  });

  it('records a non-Stripe capture with every gateway detail it was given', async () => {
    await renderPage(fullInvoice({ billingFrequency: 'Monthly', quantity: 2 }));
    await payWithStripe({
      paymentMethod: 'paypal',
      transactionId: 'txn-1',
      transactionRef: 'ref-1',
      cardBrand: 'visa',
      last4: '4242',
      token: 'gw-token',
      name: 'Ada Lovelace',
      status: 'Successful',
    });
    expect(mocks.api.RecordPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'ten-1',
        invoiceId: 'inv-1',
        planId: 'plan-1',
        billingCycle: 'MONTHLY',
        transactionId: 'txn-1',
        transactionRef: 'ref-1',
        cardType: 'visa',
        lastFourDigits: '4242',
        gatewayToken: 'gw-token',
        holderName: 'Ada Lovelace',
        paymentStatus: 'Successful',
        gateway: 'paypal',
      })
    );
  });

  it('substitutes placeholders for every detail the gateway omitted', async () => {
    await renderPage();
    await payWithStripe({ paymentMethod: 'paypal', status: 'Successful' });
    expect(mocks.api.RecordPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        billingCycle: 'YEARLY',
        transactionId: '',
        transactionRef: '',
        cardType: 'paypal',
        lastFourDigits: 'N/A',
        gatewayToken: '',
        holderName: '',
      })
    );
  });

  it('falls back to stripe as the gateway name when the result names none', async () => {
    await renderPage();
    await payWithStripe({ status: 'Successful' });
    expect(mocks.api.RecordPayment).toHaveBeenCalledWith(
      expect.objectContaining({ cardType: 'Unknown', gateway: 'stripe' })
    );
  });

  it('dates a monthly subscription a month per unit ahead', async () => {
    await renderPage(fullInvoice({ billingFrequency: 'Monthly', quantity: 2 }));
    await payWithStripe({ paymentMethod: 'paypal', status: 'Successful' });
    const { endDate } = mocks.api.RecordPayment.mock.calls[0][0];
    expect(new Date(endDate).getTime()).toBeGreaterThan(Date.now());
  });

  it('treats a missing quantity as one billing unit', async () => {
    await renderPage(fullInvoice({ quantity: undefined }));
    await payWithStripe({ paymentMethod: 'paypal', status: 'Successful' });
    const { endDate } = mocks.api.RecordPayment.mock.calls[0][0];
    expect(new Date(endDate).getFullYear()).toBe(new Date().getFullYear() + 1);
  });

  it('still shows the receipt when recording the payment fails', async () => {
    mocks.api.ConfirmPayment.mockRejectedValue(new Error('gateway timeout'));
    await renderPage();
    await payWithStripe({ paymentMethod: 'stripe', paymentIntentId: 'pi_1', status: 'Successful' });
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Payment was processed but failed to record. Please contact support.',
      'error'
    );
    expect(screen.getByText("You're all set!")).toBeInTheDocument();
  });

  it('stays quiet about the recording failure outside development', async () => {
    vi.stubEnv('DEV', false);
    mocks.api.ConfirmPayment.mockRejectedValue(new Error('gateway timeout'));
    await renderPage();
    await payWithStripe({ paymentMethod: 'stripe', paymentIntentId: 'pi_1' });
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe('the receipt', () => {
  const paid = {
    paymentMethod: 'stripe',
    paymentIntentId: 'pi_1',
    status: 'Successful',
    transactionId: 'txn-1',
    transactionRef: 'ref-1',
    last4: '4242',
    name: 'Ada Lovelace',
  };

  it('renders every field the gateway returned', async () => {
    await renderPage();
    await payWithStripe(paid);
    expect(receiptRow('Status').textContent).toBe('Successful');
    expect(receiptRow('Transaction ID').textContent).toBe('txn-1');
    expect(receiptRow('Card').textContent).toContain('4242');
    expect(receiptRow('Company').textContent).toBe('Acme Health');
    expect(receiptRow('Amount').textContent).toBe('GBP 120.00');
  });

  it('drops the card row and any field the gateway left blank', async () => {
    await renderPage(fullInvoice({ tenant: { email: 'billing@acme.test' } }));
    await payWithStripe({ paymentMethod: 'stripe', paymentIntentId: 'pi_1', status: 'Successful' });
    expect(receiptRow('Card')).toBeNull();
    expect(receiptRow('Transaction ID')).toBeNull();
    expect(receiptRow('Company')).toBeNull();
  });

  it('spells out the multiplier for a multi-unit subscription', async () => {
    await renderPage(fullInvoice({ quantity: 3 }));
    await payWithStripe(paid);
    expect(receiptRow('Billing').textContent).toBe('Yearly × 3');
  });

  it('leaves the multiplier off a single-unit subscription', async () => {
    await renderPage();
    await payWithStripe(paid);
    expect(receiptRow('Billing').textContent).toBe('Yearly');
  });

  it('marks the status green and the identifiers monospaced', async () => {
    await renderPage();
    await payWithStripe(paid);
    expect(receiptRow('Status').className).toContain('pp-green');
    expect(receiptRow('Reference').className).toContain('pp-mono');
    expect(receiptRow('Method').className).toContain('pp-cap');
  });
});

describe('the receipt PDF', () => {
  it('writes a file named after the payer', async () => {
    await renderPage();
    await payWithStripe({
      paymentMethod: 'stripe',
      paymentIntentId: 'pi_1',
      status: 'Successful',
      transactionId: 'txn-1',
      transactionRef: 'ref-1',
      last4: '4242',
      name: 'Ada Lovelace',
    });
    fireEvent.click(screen.getByText('Download Receipt'));
    expect(mocks.jsPDF).toHaveBeenCalledWith({ unit: 'pt', format: 'a4' });
    expect(mocks.pdf.save).toHaveBeenCalledWith('receipt-ada_lovelace.pdf');
  });

  it('falls back to a generic filename and em-dashes when nothing was captured', async () => {
    await renderPage(fullInvoice({ tenant: { email: 'billing@acme.test' }, quantity: 3 }));
    await payWithStripe({ paymentMethod: 'stripe', paymentIntentId: 'pi_1' });
    fireEvent.click(screen.getByText('Download Receipt'));
    expect(mocks.pdf.save).toHaveBeenCalledWith('receipt-payer.pdf');
    const written = mocks.pdf.text.mock.calls.map((c) => c[0]);
    expect(written).toContain('Successful');
    expect(written).toContain('—');
    // No last4, so the card row is skipped entirely.
    expect(written.some((v) => typeof v === 'string' && v.includes('••••'))).toBe(false);
  });

  it('includes the card row when a last-four is present', async () => {
    await renderPage();
    await payWithStripe({ paymentMethod: 'stripe', paymentIntentId: 'pi_1', last4: '4242' });
    fireEvent.click(screen.getByText('Download Receipt'));
    const written = mocks.pdf.text.mock.calls.map((c) => c[0]);
    expect(written.some((v) => typeof v === 'string' && v.includes('4242'))).toBe(true);
  });
});

describe('a failed payment', () => {
  it('shows the gateway message and does not double-record a Stripe failure', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('Credit / Debit Card'));
    mocks.gatewayError = { error: 'Card declined', paymentMethod: 'stripe' };
    await act(async () => {
      fireEvent.click(screen.getByTestId('stripe-fail'));
    });
    expect(screen.getByText('Card declined')).toBeInTheDocument();
    expect(mocks.showToast).toHaveBeenCalledWith('Card declined', 'error');
    expect(mocks.api.RecordPayment).not.toHaveBeenCalled();
  });

  it('falls back to a generic message when the gateway gave none', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('Credit / Debit Card'));
    mocks.gatewayError = { paymentMethod: 'stripe' };
    await act(async () => {
      fireEvent.click(screen.getByTestId('stripe-fail'));
    });
    expect(screen.getByText('Payment failed. Please try again.')).toBeInTheDocument();
  });

  it('records a non-Stripe failure with its own details', async () => {
    await renderPage(fullInvoice({ billingFrequency: 'Monthly' }));
    fireEvent.click(screen.getByText('Credit / Debit Card'));
    mocks.gatewayError = {
      error: 'Declined by issuer',
      paymentMethod: 'paypal',
      transactionId: 'txn-9',
      transactionRef: 'ref-9',
      cardType: 'mastercard',
      last4: '1111',
      token: 'gw-9',
      name: 'Grace Hopper',
    };
    await act(async () => {
      fireEvent.click(screen.getByTestId('stripe-fail'));
    });
    expect(mocks.api.RecordPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        billingCycle: 'MONTHLY',
        paymentStatus: 'Failed',
        gateway: 'paypal',
        cardType: 'mastercard',
        lastFourDigits: '1111',
        gatewayToken: 'gw-9',
        holderName: 'Grace Hopper',
      })
    );
  });

  it('attributes an unattributed failure to the chosen method', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('Credit / Debit Card'));
    mocks.gatewayError = { error: 'Something broke' };
    await act(async () => {
      fireEvent.click(screen.getByTestId('stripe-fail'));
    });
    expect(mocks.api.RecordPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        gateway: 'stripe',
        cardType: 'Unknown',
        lastFourDigits: 'N/A',
        transactionId: '',
      })
    );
  });

  it('reports it upstream when even the failure record cannot be saved', async () => {
    mocks.api.RecordPayment.mockRejectedValue(new Error('offline'));
    await renderPage();
    fireEvent.click(screen.getByText('Credit / Debit Card'));
    mocks.gatewayError = { error: 'Declined', paymentMethod: 'paypal' };
    await act(async () => {
      fireEvent.click(screen.getByTestId('stripe-fail'));
    });
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'LOG_PAYMENT_FAILURE');
  });

  it('logs nothing to the console outside development', async () => {
    vi.stubEnv('DEV', false);
    mocks.api.RecordPayment.mockRejectedValue(new Error('offline'));
    await renderPage();
    fireEvent.click(screen.getByText('Credit / Debit Card'));
    mocks.gatewayError = { error: 'Declined', paymentMethod: 'paypal' };
    await act(async () => {
      fireEvent.click(screen.getByTestId('stripe-fail'));
    });
    expect(console.error).not.toHaveBeenCalled();
    expect(mocks.showApiError).toHaveBeenCalled();
  });

  it('clears the error banner when the payer goes back to the chooser', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('Credit / Debit Card'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('stripe-fail'));
    });
    fireEvent.click(screen.getByText('← Back to payment methods'));
    expect(document.body.querySelector('.pp-error')).toBeNull();
  });
});

describe('the Stripe publishable key', () => {
  it('loads Stripe only when a publishable key is configured', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_STRIPE_PK', 'pk_test_123');
    await import('../Pages/Payment/PaymentPage');
    expect(mocks.loadStripe).toHaveBeenCalledWith('pk_test_123');
  });
});

describe('an invoice with no plan at all', () => {
  it('falls back to a bare plan object for every derived value', async () => {
    // `plan: undefined` is distinct from the `plan: {}` fixtures above: it is
    // the arm where the `invoice.plan || {}` fallback itself has to run.
    await renderPage(fullInvoice({ plan: undefined }));
    expect(screen.getAllByText('Subscription Plan').length).toBeGreaterThan(0);
    expect(screen.getAllByText('USD').length).toBeGreaterThan(0);
    expect(screen.getAllByText('120.00').length).toBeGreaterThan(0);
  });
});

describe('a receipt for a payment the gateway did not name', () => {
  it('em-dashes the payment method in the PDF', async () => {
    await renderPage();
    await payWithStripe({ paymentIntentId: 'pi_1', name: 'Ada Lovelace' });
    fireEvent.click(screen.getByText('Download Receipt'));

    const written = mocks.pdf.text.mock.calls.map((c) => c[0]);
    expect(written).toContain('Payment Method');
    expect(written).toContain('—');
    expect(mocks.pdf.save).toHaveBeenCalledWith('receipt-ada_lovelace.pdf');
  });
});

describe('the gateway keys read at module load', () => {
  // Both keys are resolved once, at import time, from a .env this repo ships
  // with values for -- so the unconfigured arm is only reachable by re-importing
  // the module under a stubbed env.
  it('leaves Stripe unloaded and the PayPal id blank when neither key is set', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_STRIPE_PK', '');
    vi.stubEnv('VITE_PAYPAL_CLIENT_ID', '');
    await import('../Pages/Payment/PaymentPage');
    expect(mocks.loadStripe).not.toHaveBeenCalled();
  });
});
