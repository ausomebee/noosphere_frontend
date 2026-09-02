import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

const showToast = vi.fn();
vi.mock('../Helper/ShowToast', () => ({ showToast: (...a) => showToast(...a) }));

import PricingPlanModal from '../Components/ReusableModal/PricingModal';

/**
 * The add-a-plan wizard.
 *
 * The modal itself is thin -- almost everything lives in `usePricingForm`,
 * which is exercised here for real rather than stubbed, because the wizard's
 * only job is deciding what the two footer buttons mean on each tab and what
 * happens when they are pressed.
 *
 * Both footer buttons change meaning with the tab: Next becomes Save on the
 * last one, Cancel becomes Previous everywhere but the first. A blank plan name
 * or a zero price is refused by the tab's own validation, which raises its own
 * toast before the wizard adds a second, more general one.
 */

const onClose = vi.fn();
const onSave = vi.fn();

const features = [
  { id: 'f1', name: 'Invoicing' },
  { id: 'f2', name: 'Reporting' },
];

const renderModal = (props = {}) =>
  render(
    <PricingPlanModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      features={features}
      admins={[{ id: 'a1', name: 'Ada Bell' }]}
      {...props}
    />
  );

const primary = () => document.body.querySelector('.primary-button');
const secondary = () => document.body.querySelector('.secondary-button');
const planName = () => document.body.querySelector('#planName');
const prices = () =>
  [...document.body.querySelectorAll('.pricing-plan-custom-modal-content input[type="text"]')];

// `handleNextClick` is async, so ReusableModal awaits it instead of applying
// its fixed 600ms lock.
const clickPrimary = async () => {
  await act(async () => {
    fireEvent.click(primary());
  });
};

const nameThePlan = (value = 'Growth') =>
  fireEvent.change(planName(), { target: { value } });

const priceIt = (month = '200', year = '2000') => {
  fireEvent.change(prices()[0], { target: { value: month } });
  fireEvent.change(prices()[1], { target: { value: year } });
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
    expect(screen.queryByText('Add New Plan')).not.toBeInTheDocument();
  });

  it('opens on the first tab', () => {
    renderModal();
    expect(screen.getByText('Add New Plan')).toBeInTheDocument();
    expect(primary().textContent).toBe('Next');
    expect(secondary().textContent).toBe('Cancel');
  });

  it('starts on the plan type it was told to', () => {
    renderModal({ initialPlanType: 'Enterprise' });
    // An enterprise plan gets an account manager picker the standard one lacks.
    expect(screen.getByText('Manager')).toBeInTheDocument();
  });

  it('grows a manager picker when the type is switched to enterprise', () => {
    renderModal();
    expect(screen.queryByText('Manager')).not.toBeInTheDocument();
    fireEvent.click(screen.getByDisplayValue('Enterprise'));
    expect(screen.getByText('Manager')).toBeInTheDocument();
    expect(screen.getByText('Ada Bell')).toBeInTheDocument();
  });
});

describe('stepping through the tabs', () => {
  it('refuses to advance while the plan has no name', async () => {
    renderModal();
    await clickPrimary();
    expect(showToast).toHaveBeenCalledWith('Plan name is required.', 'error');
    expect(showToast).toHaveBeenCalledWith('Please fill in all required fields.', 'error');
    expect(primary().textContent).toBe('Next');
  });

  it('moves forward once the plan is named, and renames the buttons', async () => {
    renderModal();
    nameThePlan();
    await clickPrimary();
    expect(primary().textContent).toBe('Save');
    expect(secondary().textContent).toBe('Previous');
  });

  it('steps back to the first tab', async () => {
    renderModal();
    nameThePlan();
    await clickPrimary();
    fireEvent.click(secondary());
    expect(primary().textContent).toBe('Next');
    expect(secondary().textContent).toBe('Cancel');
  });

  it('closes rather than stepping back off the front of the wizard', () => {
    renderModal();
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
  });

  it('lets the tab strip jump straight to the pricing tab', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Setting & Pricing' }));
    expect(primary().textContent).toBe('Save');
  });
});

describe('saving', () => {
  const reachTheLastTab = async () => {
    nameThePlan();
    await clickPrimary();
  };

  it('refuses a plan whose prices are still zero', async () => {
    renderModal();
    await reachTheLastTab();
    await clickPrimary();
    expect(showToast).toHaveBeenCalledWith(
      'Monthly price must be a positive number.',
      'error'
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('refuses a plan priced monthly but not yearly', async () => {
    renderModal();
    await reachTheLastTab();
    fireEvent.change(prices()[0], { target: { value: '200' } });
    await clickPrimary();
    expect(showToast).toHaveBeenCalledWith(
      'Yearly price must be a positive number.',
      'error'
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('sends the assembled plan and closes', async () => {
    renderModal();
    await reachTheLastTab();
    priceIt();
    await clickPrimary();

    expect(onSave).toHaveBeenCalledTimes(1);
    const [plan] = onSave.mock.calls[0];
    expect(plan).toMatchObject({
      name: 'Growth',
      type: 'Standard',
      colourCode: '#000000',
    });
    expect(plan.pricing.pricePerMonth).toEqual({ amount: '200', currency: 'USD' });
    expect(plan.pricing.pricePerYear).toEqual({ amount: '2000', currency: 'USD' });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('stays open when the save is refused', async () => {
    onSave.mockRejectedValue(new Error('server said no'));
    renderModal();
    await reachTheLastTab();
    priceIt();
    await clickPrimary();
    expect(onSave).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('holds the save button while the plan is being written', async () => {
    let release;
    onSave.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    renderModal();
    await reachTheLastTab();
    priceIt();
    await act(async () => {
      fireEvent.click(primary());
    });
    expect(primary()).toBeDisabled();
    await act(async () => {
      release();
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('carries the chosen features into the saved plan', async () => {
    renderModal();
    await reachTheLastTab();
    fireEvent.click(screen.getByText('Add Feature'));
    priceIt();
    await clickPrimary();
    const [plan] = onSave.mock.calls[0];
    expect(plan.features).toEqual([{ id: 'f1', name: 'Invoicing' }]);
  });

  it('says so when there are no features to choose from', async () => {
    renderModal({ features: [] });
    await reachTheLastTab();
    expect(screen.getByText('No features available.')).toBeInTheDocument();
  });
});
