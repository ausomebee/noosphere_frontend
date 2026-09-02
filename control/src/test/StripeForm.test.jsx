import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Stripe's hooks are the form's whole environment: `useStripe` decides whether
// the form may submit at all, and the two Stripe calls are what the submit
// handler is made of.
const { stripe, elements, cardElement, hooks, api } = vi.hoisted(() => {
  const cardElement = { id: 'card-element' };
  const stripe = {
    createPaymentMethod: vi.fn(),
    confirmCardPayment: vi.fn(),
  };
  const elements = { getElement: vi.fn(() => cardElement) };
  const hooks = { stripe, elements };
  const api = { CreateStripePaymentIntent: vi.fn() };
  return { stripe, elements, cardElement, hooks, api };
});

vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: () => hooks.stripe,
  useElements: () => hooks.elements,
  // The real CardElement mounts a cross-origin iframe; a marker is enough.
  CardElement: (props) => <div data-testid="card-element" data-options={!!props.options} />,
}));
vi.mock('../api/InvoiceApi', () => ({ default: api }));

import StripeForm from '../Pages/Payment/StripeForm';

/**
 * The Stripe card form on the public payment page.
 *
 * A submit is a three-step conversation: create a PaymentIntent server-side,
 * tokenise the card, then confirm. Any of the three can fail, and the form
 * treats a confirmed-but-not-succeeded intent as a failure too, so the payer is
 * never told a 3-D Secure drop-out was a payment. Every failure funnels through
 * one catch that both shows the message inline and reports it upwards.
 *
 * The receipt fields come from the PaymentMethod rather than the intent, and
 * each is separately defended, because Stripe omits `card` entirely for some
 * payment method types.
 *
 * `IS_TEST_MODE` is computed once at module load from the publishable key, so
 * the two tests that care about it re-import the module under a stubbed env.
 */

const onSuccess = vi.fn();
const onError = vi.fn();

const renderForm = (props = {}) =>
  render(
    <StripeForm
      token="tok_link"
      amount="49.5"
      currency="USD"
      tenantId="t1"
      onSuccess={onSuccess}
      onError={onError}
      {...props}
    />
  );

const nameField = () => screen.getByPlaceholderText('Name on card');
const submitButton = () => document.body.querySelector('.payment-submit-btn');
const error = () => document.body.querySelector('.payment-form-error');

// The handler is async all the way through, so a click has to be flushed.
const pay = async (name = 'Ada Lovelace') => {
  if (name !== null) fireEvent.change(nameField(), { target: { value: name } });
  await act(async () => {
    fireEvent.click(submitButton());
  });
};

const succeededIntent = {
  id: 'pi_1',
  status: 'succeeded',
  latest_charge: 'ch_1',
};

const visaMethod = { id: 'pm_1', card: { last4: '4242', brand: 'visa' } };

beforeEach(() => {
  vi.clearAllMocks();
  hooks.stripe = stripe;
  hooks.elements = elements;
  elements.getElement.mockReturnValue(cardElement);
  api.CreateStripePaymentIntent.mockResolvedValue({ clientSecret: 'cs_1' });
  stripe.createPaymentMethod.mockResolvedValue({ paymentMethod: visaMethod });
  stripe.confirmCardPayment.mockResolvedValue({ paymentIntent: succeededIntent });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('the form as it is drawn', () => {
  it('prices the button from the amount and currency it was given', () => {
    renderForm();
    expect(submitButton()).toHaveTextContent('Pay USD 49.50');
  });

  it('mounts the card element with its styling options', () => {
    renderForm();
    expect(screen.getByTestId('card-element')).toHaveAttribute('data-options', 'true');
  });

  it('shows the test-card crib under a test publishable key', () => {
    renderForm();
    expect(document.body.querySelector('.stripe-test-hint')).toBeInTheDocument();
  });

  it('hides the crib once a live key is configured', async () => {
    vi.stubEnv('VITE_STRIPE_PK', 'pk_live_abc');
    vi.resetModules();
    const { default: LiveForm } = await import('../Pages/Payment/StripeForm');
    render(<LiveForm token="t" amount="1" currency="USD" onSuccess={onSuccess} />);
    expect(document.body.querySelector('.stripe-test-hint')).not.toBeInTheDocument();
  });

  it('hides the crib when no publishable key is configured at all', async () => {
    vi.stubEnv('VITE_STRIPE_PK', '');
    vi.resetModules();
    const { default: KeylessForm } = await import('../Pages/Payment/StripeForm');
    render(<KeylessForm token="t" amount="1" currency="USD" onSuccess={onSuccess} />);
    expect(document.body.querySelector('.stripe-test-hint')).not.toBeInTheDocument();
  });

  it('shows no error before anything has been tried', () => {
    renderForm();
    expect(error()).toBeNull();
  });

  it('disables the button until Stripe.js has loaded', () => {
    hooks.stripe = null;
    renderForm();
    expect(submitButton()).toBeDisabled();
  });
});

describe('guards before the card is touched', () => {
  it('does nothing at all while Stripe.js is still loading', async () => {
    hooks.stripe = null;
    renderForm();
    // The button is disabled, so the submit has to come from the form itself.
    await act(async () => {
      fireEvent.submit(document.body.querySelector('.payment-form'));
    });
    expect(api.CreateStripePaymentIntent).not.toHaveBeenCalled();
    expect(error()).toBeNull();
  });

  it('does nothing while the Elements group is still loading', async () => {
    hooks.elements = null;
    renderForm();
    await pay();
    expect(api.CreateStripePaymentIntent).not.toHaveBeenCalled();
  });

  it('refuses a blank cardholder name', async () => {
    renderForm();
    // The field is `required`, so the browser blocks the button click before
    // the handler runs; submitting the form directly is what reaches the guard.
    await act(async () => {
      fireEvent.submit(document.body.querySelector('.payment-form'));
    });
    expect(error()).toHaveTextContent('Cardholder name is required.');
    expect(api.CreateStripePaymentIntent).not.toHaveBeenCalled();
  });

  it('refuses a name that is only whitespace', async () => {
    renderForm();
    await pay('   ');
    expect(error()).toHaveTextContent('Cardholder name is required.');
  });
});

describe('a successful payment', () => {
  it('creates the intent from the link token before touching the card', async () => {
    renderForm();
    await pay();
    expect(api.CreateStripePaymentIntent).toHaveBeenCalledWith({ token: 'tok_link' });
    expect(stripe.confirmCardPayment).toHaveBeenCalledWith('cs_1', {
      payment_method: 'pm_1',
    });
  });

  it('tokenises the card with the trimmed name', async () => {
    renderForm();
    await pay('  Ada Lovelace  ');
    expect(stripe.createPaymentMethod).toHaveBeenCalledWith({
      type: 'card',
      card: cardElement,
      billing_details: { name: 'Ada Lovelace' },
    });
  });

  it('includes the payer email in the billing details when there is one', async () => {
    renderForm({ email: 'ada@example.com' });
    await pay();
    expect(stripe.createPaymentMethod.mock.calls[0][0].billing_details).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    });
  });

  it('reports the charge, the card and the amount upwards', async () => {
    renderForm();
    await pay();
    expect(onSuccess).toHaveBeenCalledWith({
      status: 'Successful',
      paymentIntentId: 'pi_1',
      transactionId: 'pi_1',
      transactionRef: 'ch_1',
      last4: '4242',
      cardBrand: 'Visa',
      name: 'Ada Lovelace',
      token: 'pm_1',
      tenantId: 't1',
      paymentMethod: 'stripe',
      amount: '49.5',
      currency: 'USD',
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it('falls back to the intent id when Stripe reports no charge yet', async () => {
    stripe.confirmCardPayment.mockResolvedValue({
      paymentIntent: { id: 'pi_2', status: 'succeeded' },
    });
    renderForm();
    await pay();
    expect(onSuccess.mock.calls[0][0].transactionRef).toBe('pi_2');
  });

  it('says "Card" when the payment method carries no brand', async () => {
    stripe.createPaymentMethod.mockResolvedValue({
      paymentMethod: { id: 'pm_3', card: { last4: '0000' } },
    });
    renderForm();
    await pay();
    expect(onSuccess.mock.calls[0][0].cardBrand).toBe('Card');
    expect(onSuccess.mock.calls[0][0].last4).toBe('0000');
  });

  it('reports no card details at all when Stripe omits the card object', async () => {
    stripe.createPaymentMethod.mockResolvedValue({ paymentMethod: { id: 'pm_4' } });
    renderForm();
    await pay();
    expect(onSuccess.mock.calls[0][0].last4).toBeUndefined();
    expect(onSuccess.mock.calls[0][0].cardBrand).toBe('Card');
  });

  it('spins the button while the charge is in flight', async () => {
    let release;
    api.CreateStripePaymentIntent.mockReturnValue(new Promise((r) => { release = r; }));
    renderForm();
    fireEvent.change(nameField(), { target: { value: 'Ada' } });
    await act(async () => { fireEvent.click(submitButton()); });

    expect(document.body.querySelector('.spinner')).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();

    await act(async () => { release({ clientSecret: 'cs_1' }); });
    expect(document.body.querySelector('.spinner')).not.toBeInTheDocument();
  });
});

describe('a payment that fails', () => {
  it('reports a dead payment link', async () => {
    api.CreateStripePaymentIntent.mockRejectedValue(new Error('Invoice already paid'));
    renderForm();
    await pay();
    expect(error()).toHaveTextContent('Invoice already paid');
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith({
      status: 'failed',
      error: 'Invoice already paid',
      name: 'Ada Lovelace',
      paymentMethod: 'stripe',
      cardType: 'Unknown',
    });
  });

  it('reports a card Stripe refused to tokenise', async () => {
    stripe.createPaymentMethod.mockResolvedValue({
      error: { message: 'Your card number is incomplete.' },
    });
    renderForm();
    await pay();
    expect(error()).toHaveTextContent('Your card number is incomplete.');
    expect(stripe.confirmCardPayment).not.toHaveBeenCalled();
  });

  it('reports a declined confirmation', async () => {
    stripe.confirmCardPayment.mockResolvedValue({
      error: { message: 'Your card was declined.' },
    });
    renderForm();
    await pay();
    expect(error()).toHaveTextContent('Your card was declined.');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('refuses to call an unfinished 3-D Secure challenge a payment', async () => {
    stripe.confirmCardPayment.mockResolvedValue({
      paymentIntent: { id: 'pi_5', status: 'requires_action' },
    });
    renderForm();
    await pay();
    expect(error()).toHaveTextContent(
      'Payment was not completed (status: requires_action). You have not been charged.'
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('says the status is unknown when Stripe returns no intent', async () => {
    stripe.confirmCardPayment.mockResolvedValue({});
    renderForm();
    await pay();
    expect(error()).toHaveTextContent('status: unknown');
  });

  it('falls back to its own wording for a rejection carrying no message', async () => {
    api.CreateStripePaymentIntent.mockRejectedValue({ code: 'network_error' });
    renderForm();
    await pay();
    expect(error()).toHaveTextContent('Payment failed. Please try again.');
  });

  it('survives a caller that supplied no failure handler', async () => {
    api.CreateStripePaymentIntent.mockRejectedValue(new Error('boom'));
    renderForm({ onError: undefined });
    await pay();
    expect(error()).toHaveTextContent('boom');
  });

  it('re-enables the button and clears the old error on the next attempt', async () => {
    api.CreateStripePaymentIntent.mockRejectedValueOnce(new Error('boom'));
    renderForm();
    await pay();
    expect(submitButton()).not.toBeDisabled();

    await pay();
    expect(error()).toBeNull();
    expect(onSuccess).toHaveBeenCalled();
  });
});
