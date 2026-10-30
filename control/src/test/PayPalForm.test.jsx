import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// The real buttons load PayPal's SDK from the network. The probe keeps the four
// callbacks so each one can be driven with the payloads PayPal would send.
const paypal = vi.hoisted(() => ({ props: null }));
vi.mock('@paypal/react-paypal-js', () => ({
  PayPalButtons: (props) => {
    paypal.props = props;
    return <div data-testid="paypal-buttons" />;
  },
}));

import PayPalForm from '../Pages/Payment/PayPalForm';

/**
 * The PayPal leg of the payment page.
 *
 * It is pure translation: it builds the order PayPal expects on the way out and
 * flattens PayPal's capture response into the app's own result shape on the way
 * back. The interesting parts are all fallbacks — a missing currency, a missing
 * payer email, a capture with no id of its own, and a payer with only half a
 * name — plus the fact that both failure callbacks are optional-chained, so a
 * caller that passes no `onError` must not blow up.
 */

const order = (over = {}) => ({
  id: 'ORDER-1',
  purchase_units: [{ payments: { captures: [{ id: 'CAPTURE-1' }] } }],
  payer: { name: { given_name: 'Ada', surname: 'Bell' } },
  ...over,
});

const actionsFor = (result) => ({
  order: {
    create: vi.fn().mockResolvedValue('ORDER-TOKEN'),
    capture: vi.fn().mockResolvedValue(result),
  },
});

let onSuccess;
let onError;

const renderForm = (over = {}) => {
  onSuccess = vi.fn();
  onError = vi.fn();
  return render(
    <PayPalForm
      amount="49.5"
      currency="EUR"
      tenantId="t1"
      email="ada@example.com"
      onSuccess={onSuccess}
      onError={onError}
      {...over}
    />
  );
};

const approve = async (result, data = { orderID: 'ORDER-TOKEN' }) => {
  const actions = actionsFor(result);
  await act(async () => {
    await paypal.props.onApprove(data, actions);
  });
  return actions;
};

beforeEach(() => {
  paypal.props = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('rendering', () => {
  it('explains the redirect and mounts the buttons', () => {
    renderForm();
    expect(
      screen.getByText(
        'You will be redirected to PayPal to complete your payment securely.'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('paypal-buttons')).toBeInTheDocument();
    expect(paypal.props.style).toEqual({
      layout: 'vertical',
      color: 'gold',
      shape: 'rect',
      label: 'pay',
    });
  });
});

describe('creating the order', () => {
  it('sends the amount at two decimal places in the currency given', async () => {
    renderForm();
    const actions = actionsFor(order());
    await act(async () => { await paypal.props.createOrder({}, actions); });
    expect(actions.order.create).toHaveBeenCalledWith({
      purchase_units: [{ amount: { currency_code: 'EUR', value: '49.50' } }],
      payer: { email_address: 'ada@example.com' },
    });
  });

  it('defaults to dollars when no currency was chosen', async () => {
    renderForm({ currency: undefined });
    const actions = actionsFor(order());
    await act(async () => { await paypal.props.createOrder({}, actions); });
    expect(actions.order.create.mock.calls[0][0].purchase_units[0].amount)
      .toEqual({ currency_code: 'USD', value: '49.50' });
  });

  it('omits the payer block entirely when there is no email', async () => {
    renderForm({ email: '' });
    const actions = actionsFor(order());
    await act(async () => { await paypal.props.createOrder({}, actions); });
    expect(actions.order.create.mock.calls[0][0]).not.toHaveProperty('payer');
  });
});

describe('a completed payment', () => {
  it('flattens the capture into the app result shape', async () => {
    renderForm();
    await approve(order());
    expect(onSuccess).toHaveBeenCalledWith({
      status: 'Successful',
      transactionId: 'ORDER-1',
      transactionRef: 'CAPTURE-1',
      last4: null,
      name: 'Ada Bell',
      token: 'ORDER-TOKEN',
      tenantId: 't1',
      paymentMethod: 'paypal',
      amount: '49.5',
      currency: 'EUR',
    });
  });

  it('falls back to the order id when the capture has none', async () => {
    renderForm();
    await approve(order({ purchase_units: [] }));
    expect(onSuccess.mock.calls[0][0].transactionRef).toBe('ORDER-1');
  });

  it('falls back to the order id when there are no purchase units at all', async () => {
    renderForm();
    await approve(order({ purchase_units: undefined }));
    expect(onSuccess.mock.calls[0][0].transactionRef).toBe('ORDER-1');
  });

  it('trims a name the payer only half filled in', async () => {
    renderForm();
    await approve(order({ payer: { name: { given_name: 'Ada' } } }));
    expect(onSuccess.mock.calls[0][0].name).toBe('Ada');
  });

  it('leaves the name empty for a payer with no name block', async () => {
    renderForm();
    await approve(order({ payer: undefined }));
    expect(onSuccess.mock.calls[0][0].name).toBe('');
  });
});

describe('a payment that goes wrong', () => {
  it('reports the reason PayPal gave', () => {
    renderForm();
    act(() => { paypal.props.onError(new Error('instrument declined')); });
    expect(onError).toHaveBeenCalledWith({
      status: 'failed',
      error: 'instrument declined',
      paymentMethod: 'paypal',
    });
  });

  it('falls back to its own wording for an error with no message', () => {
    renderForm();
    act(() => { paypal.props.onError({}); });
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'PayPal error' })
    );
  });

  it('reports a cancellation as its own status', () => {
    renderForm();
    act(() => { paypal.props.onCancel(); });
    expect(onError).toHaveBeenCalledWith({
      status: 'cancelled',
      error: 'Payment was cancelled.',
      paymentMethod: 'paypal',
    });
  });

  it('shrugs off a failure when the caller supplied no error handler', () => {
    renderForm({ onError: undefined });
    expect(() => {
      act(() => { paypal.props.onError(new Error('boom')); });
      act(() => { paypal.props.onCancel(); });
    }).not.toThrow();
  });
});
