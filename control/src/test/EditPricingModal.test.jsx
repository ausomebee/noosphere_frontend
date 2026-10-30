import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const showToast = vi.fn();
vi.mock('../Helper/ShowToast', () => ({ showToast: (...a) => showToast(...a) }));

import EditPricingModal from '../Components/ReusableModal/EditPricingModal';

/**
 * The edit-plan wizard.
 *
 * Almost all of its work is done before anything renders: it reshapes a plan
 * row from the plans table -- where price, extra clients and storage all arrive
 * as display strings like "200 USD / month" -- back into the form's own fields.
 * The yearly price is derived rather than stored, so it is always twelve times
 * whatever number it managed to pull out of the monthly string.
 *
 * The modal itself is a two-tab wizard: the footer buttons change meaning with
 * the tab, and only the last tab's primary button saves.
 */

const onClose = vi.fn();
const onSave = vi.fn();

const features = [
  { id: 'f1', name: 'Invoicing' },
  { id: 'f2', name: 'Reporting' },
];

const plan = (over = {}) => ({
  id: 'p1',
  name: 'Pro',
  type: 'standard',
  colourCode: '#112233',
  pricing: { cost: '200 USD / month', extra: '25 clients', storage: '500GB', userType: 'clients' },
  features: [{ id: 'f1', name: 'Invoicing' }],
  extraFeatures: [{ id: 'x1', name: 'Extra storage' }],
  ...over,
});

const renderModal = (props = {}) =>
  render(
    <EditPricingModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      plan={plan()}
      features={features}
      {...props}
    />
  );

const primary = () => document.body.querySelector('.primary-button');
const secondary = () => document.body.querySelector('.secondary-button');

// `handleNextClick` is async, so ReusableModal holds the button until the
// promise settles rather than for its usual fixed 600ms.
const clickPrimary = async () => {
  await act(async () => {
    fireEvent.click(primary());
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  onSave.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('when it renders at all', () => {
  it('renders nothing while closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Edit Plan')).not.toBeInTheDocument();
  });

  it('opens on the first tab', () => {
    renderModal();
    expect(screen.getByText('Edit Plan')).toBeInTheDocument();
    expect(primary().textContent).toBe('Next');
    expect(secondary().textContent).toBe('Cancel');
  });

  it('opens against no plan at all without falling over', () => {
    renderModal({ plan: null });
    expect(screen.getByText('Edit Plan')).toBeInTheDocument();
  });
});

describe('stepping through the tabs', () => {
  it('moves forward and changes the footer wording', async () => {
    renderModal();
    await clickPrimary();
    expect(primary().textContent).toBe('Save');
    expect(secondary().textContent).toBe('Previous');
  });

  it('steps back again', async () => {
    renderModal();
    await clickPrimary();
    fireEvent.click(secondary());
    expect(primary().textContent).toBe('Next');
    expect(secondary().textContent).toBe('Cancel');
  });

  it('closes from the first tab rather than stepping back off the end', () => {
    renderModal();
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
  });

  it('refuses to advance while a required field is blank', async () => {
    renderModal({ plan: null });
    await clickPrimary();
    expect(showToast).toHaveBeenCalledWith('Please fill in all required fields.', 'error');
    expect(primary().textContent).toBe('Next');
  });
});

describe('saving', () => {
  it('sends the reshaped plan and closes', async () => {
    renderModal();
    await clickPrimary();
    await clickPrimary();

    expect(onSave).toHaveBeenCalled();
    const [payload] = onSave.mock.calls[0];
    expect(payload.name).toBe('Pro');
    expect(payload.colourCode).toBe('#112233');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('derives the yearly price from the monthly one', async () => {
    renderModal();
    await clickPrimary();
    await clickPrimary();
    const [payload] = onSave.mock.calls[0];
    expect(payload.pricing.pricePerMonth.amount).toBe('200');
    expect(payload.pricing.pricePerYear.amount).toBe('2400.00');
  });

  it('reads the currency out of the display string', async () => {
    renderModal({ plan: plan({ pricing: { cost: '150 EUR / month' } }) });
    await clickPrimary();
    await clickPrimary();
    const [payload] = onSave.mock.calls[0];
    expect(payload.pricing.pricePerMonth.currency).toBe('EUR');
  });

  it('stays open when the save is refused', async () => {
    onSave.mockRejectedValue(new Error('server said no'));
    renderModal();
    await clickPrimary();
    await clickPrimary();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('reshaping a plan row', () => {
  const payloadFor = async (over) => {
    renderModal({ plan: plan(over) });
    await clickPrimary();
    await clickPrimary();
    return onSave.mock.calls[0]?.[0];
  };

  it('capitalises an enterprise plan type', async () => {
    const payload = await payloadFor({ type: 'enterprise' });
    expect(payload.type).toBe('Enterprise');
  });

  it('treats any other type as standard', async () => {
    const payload = await payloadFor({ type: 'whatever' });
    expect(payload.type).toBe('Standard');
  });

  it('names a plan the row left blank', async () => {
    const payload = await payloadFor({ name: '' });
    expect(payload.name).toBe('Unnamed Plan');
  });

  it('defaults a plan with no colour to black', async () => {
    const payload = await payloadFor({ colourCode: null });
    expect(payload.colourCode).toBe('#000000');
  });

  it('refuses to save a plan whose row carried no cost at all', async () => {
    // With no cost string to parse, both prices come back as "0", which the
    // form's own validation then rejects as non-positive.
    await payloadFor({ pricing: {} });
    expect(showToast).toHaveBeenCalledWith(
      'Monthly price must be a positive number.',
      'error'
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('falls back to dollars when the cost names no currency', async () => {
    const payload = await payloadFor({ pricing: { cost: '200 / month' } });
    expect(payload.pricing.pricePerMonth.currency).toBe('USD');
  });

  it('keeps the features the plan already had', async () => {
    const payload = await payloadFor({});
    expect(payload.features).toEqual([{ id: 'f1', name: 'Invoicing' }]);
  });

  it.each([
    ['delivered as a bare name', ['Invoicing']],
    ['with neither id nor name', [{}]],
  ])('refuses to save a feature %s', async (_case, planFeatures) => {
    // Such a row is given a generated `temp-N` id, which does not match
    // anything in the feature list the modal was handed, so validation blocks
    // the save until the user re-picks it.
    await payloadFor({ features: planFeatures });
    expect(showToast).toHaveBeenCalledWith('All features must be selected.', 'error');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('copes with a plan whose features are not a list', async () => {
    const payload = await payloadFor({ features: undefined });
    expect(payload.features).toEqual([]);
  });

  it('copes with a plan whose extras are not a list', async () => {
    const payload = await payloadFor({ extraFeatures: undefined });
    expect(payload.extraPricing).toEqual([]);
  });

  it('refuses to save an extra feature the row did not identify', async () => {
    await payloadFor({ extraFeatures: [{}] });
    expect(onSave).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalled();
  });
});

describe('rows the plans table hands back malformed', () => {
  const payloadFor = async (over) => {
    renderModal({ plan: plan(over) });
    await clickPrimary();
    await clickPrimary();
    return onSave.mock.calls[0]?.[0];
  };

  it('reads a feature delivered as a bare string', async () => {
    // `f.name || f || 'Unnamed Feature'` takes its middle arm when the row is a
    // plain string rather than an object.
    await payloadFor({ features: ['Invoicing'] });
    expect(showToast).toHaveBeenCalledWith('All features must be selected.', 'error');
  });

  it('treats a cost with no number in it as zero', async () => {
    await payloadFor({ pricing: { cost: 'free forever USD' } });
    expect(showToast).toHaveBeenCalledWith(
      'Monthly price must be a positive number.',
      'error'
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('defaults an unparseable client count to ten', async () => {
    const payload = await payloadFor({
      pricing: { cost: '200 USD / month', extra: 'lots of clients' },
    });
    expect(payload.pricing.clients).toBe('10');
  });

  it('keeps a storage figure it can read', async () => {
    const payload = await payloadFor({
      pricing: { cost: '200 USD / month', storage: '750GB' },
    });
    expect(payload.pricing.storage).toBe('750GB');
  });

  it('reads an unlimited storage allowance', async () => {
    const payload = await payloadFor({
      pricing: { cost: '200 USD / month', storage: 'unlimited' },
    });
    expect(payload.pricing.storage).toBe('unlimitedGB');
  });
});

describe('a feature row with nothing in it', () => {
  const payloadFor = async (over) => {
    renderModal({ plan: plan(over) });
    await clickPrimary();
    await clickPrimary();
    return onSave.mock.calls[0]?.[0];
  };

  it('names an empty feature row rather than leaving it blank', async () => {
    // An empty string has no `name` and is falsy itself, so the last arm of
    // `f.name || f || 'Unnamed Feature'` is the only one left.
    await payloadFor({ features: [''] });
    expect(showToast).toHaveBeenCalledWith('All features must be selected.', 'error');
    expect(onSave).not.toHaveBeenCalled();
  });
});
