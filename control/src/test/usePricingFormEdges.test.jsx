import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const showToast = vi.fn();
vi.mock('../Helper/ShowToast', () => ({ showToast: (...a) => showToast(...a) }));

// react-color's ChromePicker needs layout jsdom does not have, and the picker
// only matters here as something that hands a hex string back.
vi.mock('../Components/ColorPicker', () => ({
  default: (props) => (
    <div data-testid="color-picker">
      <span data-testid="color-picker-value">{props.color}</span>
      <button data-testid="color-picker-pick" onClick={() => props.onChange('#abcdef')}>
        pick
      </button>
      {/* The real picker always yields a hex, but the panel guards its swatch
          against an empty colour anyway; this is the only way to that arm. */}
      <button data-testid="color-picker-clear" onClick={() => props.onChange('')}>
        clear
      </button>
      <button data-testid="color-picker-close" onClick={props.onClose}>
        close
      </button>
    </div>
  ),
}));

import usePricingForm from '../Pages/BillingsAndPayment/usePricingForm';

/**
 * A companion to usePricingForm.test.jsx, which drives the hook's return value
 * directly. This file covers what that leaves alone: the two tab panels the
 * hook builds as JSX, the effect that re-syncs state when `initialData` is
 * replaced, and the validation arms that only a seeded form can reach.
 *
 * The panels are rendered through a harness that also exposes the hook object,
 * because several controls (the extras switch, the colour picker) have no
 * setter on the returned API and can only be reached through the DOM.
 */

const features = [
  { id: 'f1', name: 'Invoicing' },
  { id: 'f2', name: 'Reporting' },
];

let hook;

const Harness = (props) => {
  hook = usePricingForm({ onSave: vi.fn(), ...props });
  const tab = hook.tabs.find((t) => t.name === hook.activeTab);
  return <div>{tab.content}</div>;
};

const setup = (props = {}) => render(<Harness features={features} {...props} />);

const showPricingTab = () => act(() => hook.setActiveTab('Setting & Pricing'));

// Selects are told apart by an option only that select carries; the panel has
// no labels tied to its controls.
const selectsWithOption = (label) =>
  Array.from(document.body.querySelectorAll('select')).filter((s) =>
    Array.from(s.options).some((o) => o.textContent === label)
  );

const priceInputs = () =>
  Array.from(document.body.querySelectorAll('.pricing-plan-custom-input'));
const featureSelects = () =>
  Array.from(document.body.querySelectorAll('.pricing-plan-feature-select-custom'));
const extrasSwitch = () =>
  document.body.querySelector('.input-switch-group input[type="checkbox"]');

beforeEach(() => {
  vi.clearAllMocks();
  hook = undefined;
});

describe('state seeded from initialData', () => {
  it('takes every pricing figure from the plan it was given', () => {
    setup({
      initialData: {
        name: 'Pro',
        type: 'Enterprise',
        accountManager: 'a1',
        colourCode: '#112233',
        pricing: {
          pricePerMonth: { amount: '25', currency: 'EUR' },
          pricePerYear: { amount: '250', currency: 'EUR' },
          clients: '10',
          storage: '50GB',
          userOption: 'staffs',
        },
      },
    });
    expect(hook.pricePerMonth).toBe('25');
    expect(hook.pricePerYear).toBe('250');
    expect(hook.currency).toBe('EUR');
    expect(hook.clients).toBe('10');
    expect(hook.storage).toBe('50GB');
    expect(hook.userOption).toBe('staffs');
    expect(hook.formData.colorCode).toBe('#112233');
    expect(hook.formData.accountManager).toBe('a1');
  });

  it('gives placeholder ids to rows the plan left unidentified', () => {
    setup({
      initialData: {
        features: [{ name: 'Ghost' }],
        extraPricing: [{}],
      },
    });
    expect(hook.formData.features[0]).toEqual(
      expect.objectContaining({ id: 'temp-0', name: 'Ghost' })
    );
    expect(hook.formData.extraPricing[0]).toEqual(
      expect.objectContaining({
        id: 'extra-0',
        cost: '0',
        storage: '0',
        extra: 'USD',
        name: 'Unnamed Extra Feature',
      })
    );
    // A plan that arrives with extras switched on shows the extras block.
    expect(hook.enableExtraPricing).toBe(true);
  });

  it('normalises features that arrive without an id or a name', () => {
    setup({ features: [{ name: 'Nameless id' }, { id: 'f9' }] });
    expect(hook.availableFeatures).toEqual([
      { id: 'feature-0', name: 'Nameless id' },
      { id: 'f9', name: 'Unnamed Feature' },
    ]);
  });

  it('leaves out features already spoken for by a row', () => {
    setup({ initialData: { features: [{ id: 'f1' }], extraPricing: [{ id: 'f2' }] } });
    expect(hook.availableFeatures).toEqual([]);
  });
});

describe('re-syncing when the plan is replaced', () => {
  it('keeps the user edits when the same plan arrives as a fresh object', () => {
    const { rerender } = setup({ initialData: { name: 'Pro' } });
    act(() => hook.setPricePerMonth('99'));

    rerender(<Harness features={features} initialData={{ name: 'Pro' }} />);
    expect(hook.pricePerMonth).toBe('99');
  });

  it('adopts a genuinely different plan', () => {
    const { rerender } = setup({ initialData: { name: 'Pro' } });
    act(() => hook.setPricePerMonth('99'));

    rerender(
      <Harness
        features={features}
        initialData={{
          name: 'Enterprise',
          pricing: {
            pricePerMonth: { amount: '40', currency: 'GBP' },
            clients: '20',
            storage: '10GB',
            userOption: 'staffs',
          },
          extraPricing: [{ id: 'f2', cost: '5' }],
        }}
      />
    );
    expect(hook.pricePerMonth).toBe('40');
    expect(hook.currency).toBe('GBP');
    expect(hook.clients).toBe('20');
    expect(hook.storage).toBe('10GB');
    expect(hook.userOption).toBe('staffs');
    expect(hook.formData.name).toBe('Enterprise');
    expect(hook.enableExtraPricing).toBe(true);
  });

  it('gives placeholder ids to the extras of a replacement plan', () => {
    const { rerender } = setup({ initialData: { name: 'Pro' } });
    rerender(<Harness features={features} initialData={{ extraPricing: [{}] }} />);
    expect(hook.formData.extraPricing[0]).toEqual(
      expect.objectContaining({ id: 'extra-0', cost: '0', storage: '0' })
    );
  });

  it('leaves the form object alone when the replacement works out identical', () => {
    const { rerender } = setup({ initialData: { name: 'Pro' } });
    // A different JSON shape that still produces the same form: the effect runs
    // but keeps the state object it already had.
    rerender(<Harness features={features} initialData={{ name: 'Pro', pricing: {} }} />);
    expect(hook.formData.name).toBe('Pro');
    expect(hook.formData.features).toEqual([]);
    expect(hook.pricePerMonth).toBe('0');
  });

  it('matches an incoming feature to the catalogue by name', () => {
    const { rerender } = setup({ initialData: { name: 'Pro' } });
    rerender(
      <Harness features={features} initialData={{ features: [{ name: 'Reporting' }] }} />
    );
    expect(hook.formData.features[0]).toEqual(
      expect.objectContaining({ id: 'f2', name: 'Reporting' })
    );
  });

  it('keeps an unmatched feature under its placeholder id', () => {
    const { rerender } = setup({ initialData: { name: 'Pro' } });
    rerender(<Harness features={features} initialData={{ features: [{}] }} />);
    expect(hook.formData.features[0]).toEqual(
      expect.objectContaining({ id: 'temp-0', name: 'Unnamed Feature' })
    );
  });
});

describe('the General panel', () => {
  it('edits the plan name', () => {
    setup();
    fireEvent.change(document.body.querySelector('#planName'), {
      target: { value: 'Growth' },
    });
    expect(hook.formData.name).toBe('Growth');
  });

  it('shows the manager picker only for an enterprise plan', () => {
    setup({ admins: [{ id: 'a1', name: 'Ada' }, { id: 'a2' }] });
    expect(document.body.querySelector('#accountManager')).toBeNull();

    // The radio label carries no htmlFor, so the input itself is the target.
    const [enterprise] = document.body.querySelectorAll('input[type="radio"]');
    fireEvent.click(enterprise);
    expect(hook.formData.type).toBe('Enterprise');

    const manager = document.body.querySelector('#accountManager');
    // An admin with no name falls back to showing its id.
    expect(Array.from(manager.options).map((o) => o.textContent)).toEqual([
      '-- Select Manager --',
      'Ada',
      'a2',
    ]);

    fireEvent.change(manager, { target: { value: 'a1' } });
    expect(hook.formData.accountManager).toBe('a1');
  });

  it('goes back to a standard plan', () => {
    setup({ initialData: { type: 'Enterprise' } });
    const radios = document.body.querySelectorAll('input[type="radio"]');
    fireEvent.click(radios[1]);
    expect(hook.formData.type).toBe('Standard');
    expect(document.body.querySelector('#accountManager')).toBeNull();
  });

  it('opens the colour picker from the swatch, keyboard included', () => {
    setup();
    const swatch = document.body.querySelector('.color-preview');

    fireEvent.keyDown(swatch, { key: 'a' });
    expect(screen.queryByTestId('color-picker')).not.toBeInTheDocument();

    fireEvent.keyDown(swatch, { key: 'Enter' });
    expect(screen.getByTestId('color-picker')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('color-picker-close'));

    fireEvent.keyDown(swatch, { key: ' ' });
    expect(screen.getByTestId('color-picker')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('color-picker-close'));

    fireEvent.click(swatch);
    expect(screen.getByTestId('color-picker')).toBeInTheDocument();
  });

  it('opens the colour picker from the Change button and keeps the chosen hex', () => {
    setup();
    fireEvent.click(screen.getByText('Change'));
    expect(screen.getByTestId('color-picker-value').textContent).toBe('#000000');

    fireEvent.click(screen.getByTestId('color-picker-pick'));
    expect(hook.formData.colorCode).toBe('#abcdef');
    fireEvent.click(screen.getByTestId('color-picker-close'));
    expect(screen.queryByTestId('color-picker')).not.toBeInTheDocument();
  });
});

describe('the Settings & Pricing panel', () => {
  it('says so when there is no feature catalogue at all', () => {
    setup({ features: [] });
    showPricingTab();
    expect(screen.getByText('No features available.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Feature' })).toBeDisabled();
    expect(screen.queryByText('All features have been added.')).not.toBeInTheDocument();
  });

  it('adds a feature row from the button and deletes it again', () => {
    setup();
    showPricingTab();
    fireEvent.click(screen.getByRole('button', { name: 'Add Feature' }));
    expect(featureSelects()).toHaveLength(1);
    expect(hook.formData.features[0].name).toBe('Invoicing');

    fireEvent.click(document.body.querySelector('.pricing-plan-delete-btn'));
    expect(featureSelects()).toHaveLength(0);
  });

  it('offers each row its own selection plus whatever is still free', () => {
    setup();
    showPricingTab();
    fireEvent.click(screen.getByRole('button', { name: 'Add Feature' }));
    const [row] = featureSelects();
    // Invoicing is taken by this row, so its own value stays plus the free one.
    expect(Array.from(row.options).map((o) => o.textContent)).toEqual([
      'Select Feature',
      'Invoicing',
      'Reporting',
    ]);

    fireEvent.change(row, { target: { value: 'f2' } });
    expect(hook.formData.features[0].name).toBe('Reporting');
  });

  it('says so once every feature has been added', () => {
    setup();
    showPricingTab();
    fireEvent.click(screen.getByRole('button', { name: 'Add Feature' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Feature' }));
    expect(screen.getByText('All features have been added.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Feature' })).toBeDisabled();
  });

  it('leaves a row with nothing to offer when its feature is unknown', () => {
    // f1 is taken by the first row, so nothing is free; the second row's
    // placeholder id matches no feature, leaving its list empty.
    setup({
      features: [{ id: 'f1', name: 'Invoicing' }],
      initialData: { features: [{ id: 'f1' }, { name: 'Ghost' }] },
    });
    showPricingTab();
    const [, ghostRow] = featureSelects();
    expect(Array.from(ghostRow.options).map((o) => o.textContent)).toEqual([
      'Select Feature',
      'No features available',
    ]);
    expect(ghostRow.options[1].disabled).toBe(true);
  });

  it('leaves the other rows alone when one is changed', () => {
    // A third feature so the first row still has somewhere to move to once two
    // rows have been added.
    setup({ features: [...features, { id: 'f3', name: 'Payroll' }] });
    showPricingTab();
    fireEvent.click(screen.getByRole('button', { name: 'Add Feature' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Feature' }));
    fireEvent.change(featureSelects()[0], { target: { value: 'f3' } });

    expect(hook.formData.features[0].name).toBe('Payroll');
    expect(hook.formData.features[1].name).toBe('Reporting');
  });

  it('ignores a row cleared back to the placeholder', () => {
    setup();
    showPricingTab();
    fireEvent.click(screen.getByRole('button', { name: 'Add Feature' }));
    fireEvent.change(featureSelects()[0], { target: { value: '' } });
    expect(hook.formData.features[0].name).toBe('Invoicing');
  });

  it('writes both prices into the form as well as the local state', () => {
    setup();
    showPricingTab();
    const [monthly, yearly] = priceInputs();
    fireEvent.change(monthly, { target: { value: '12' } });
    fireEvent.change(yearly, { target: { value: '120' } });
    expect(hook.pricePerMonth).toBe('12');
    expect(hook.formData.pricing.pricePerMonth.amount).toBe('12');
    expect(hook.pricePerYear).toBe('120');
    expect(hook.formData.pricing.pricePerYear.amount).toBe('120');
  });

  it('applies a currency change from either price row to both', () => {
    setup();
    showPricingTab();
    const [monthlyCurrency, yearlyCurrency] = selectsWithOption('GBP');

    fireEvent.change(monthlyCurrency, { target: { value: 'EUR' } });
    expect(hook.currency).toBe('EUR');
    expect(hook.formData.pricing.pricePerYear.currency).toBe('EUR');
    expect(document.body.textContent).toContain('€');

    fireEvent.change(yearlyCurrency, { target: { value: 'GBP' } });
    expect(hook.currency).toBe('GBP');
    expect(hook.formData.pricing.pricePerMonth.currency).toBe('GBP');
  });

  it('sets the client count, the user kind and the storage size', () => {
    setup();
    showPricingTab();
    fireEvent.change(selectsWithOption('500')[0], { target: { value: '50' } });
    fireEvent.change(selectsWithOption('Staffs')[0], { target: { value: 'staffs' } });
    fireEvent.change(selectsWithOption('100GB')[0], { target: { value: '25GB' } });

    expect(hook.clients).toBe('50');
    expect(hook.formData.pricing.clients).toBe('50');
    expect(hook.userOption).toBe('staffs');
    expect(hook.formData.pricing.userOption).toBe('staffs');
    expect(hook.storage).toBe('25GB');
    expect(hook.formData.pricing.storage).toBe('25GB');
  });
});

describe('the extras block', () => {
  it('stays collapsed until the switch is flipped', () => {
    setup();
    showPricingTab();
    expect(screen.queryByRole('button', { name: '+ Add Extra' })).not.toBeInTheDocument();

    fireEvent.click(extrasSwitch());
    expect(hook.enableExtraPricing).toBe(true);
    expect(screen.getByRole('button', { name: '+ Add Extra' })).toBeInTheDocument();
  });

  it('refuses to add an extra when there is no catalogue', () => {
    setup({ features: [] });
    showPricingTab();
    fireEvent.click(extrasSwitch());
    expect(screen.getByText('No features available for extra pricing.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add Extra' })).toBeDisabled();
  });

  it('adds a row, repriced in the currency chosen for the plan', () => {
    setup();
    showPricingTab();
    fireEvent.change(selectsWithOption('GBP')[0], { target: { value: 'GBP' } });
    fireEvent.click(extrasSwitch());
    fireEvent.click(screen.getByRole('button', { name: '+ Add Extra' }));

    expect(hook.formData.extraPricing[0]).toEqual(
      expect.objectContaining({ id: 'f1', name: 'Invoicing', extra: 'GBP' })
    );
  });

  it('edits a row and removes it again', () => {
    setup();
    showPricingTab();
    fireEvent.click(extrasSwitch());
    fireEvent.click(screen.getByRole('button', { name: '+ Add Extra' }));

    const extraSelect = document.body.querySelector('.pricing-plan-feature-select');
    fireEvent.change(extraSelect, { target: { value: 'f2' } });
    expect(hook.formData.extraPricing[0].name).toBe('Reporting');

    // The two remaining price inputs belong to the extra row.
    const [, , cost, yearly] = priceInputs();
    fireEvent.change(cost, { target: { value: '5' } });
    fireEvent.change(yearly, { target: { value: '50' } });
    expect(hook.formData.extraPricing[0].cost).toBe('5');
    expect(hook.formData.extraPricing[0].storage).toBe('50');

    const rowCurrency = selectsWithOption('EUR').at(-1);
    fireEvent.change(rowCurrency, { target: { value: 'EUR' } });
    expect(hook.formData.extraPricing[0].extra).toBe('EUR');

    const deletes = document.body.querySelectorAll('.pricing-plan-delete-btn');
    fireEvent.click(deletes[deletes.length - 1]);
    expect(hook.formData.extraPricing).toEqual([]);
  });

  it('clears an extra row back to the placeholder', () => {
    setup();
    showPricingTab();
    fireEvent.click(extrasSwitch());
    fireEvent.click(screen.getByRole('button', { name: '+ Add Extra' }));

    const extraSelect = document.body.querySelector('.pricing-plan-feature-select');
    fireEvent.change(extraSelect, { target: { value: '' } });
    expect(extraSelect.value).toBe('');
    expect(hook.formData.extraPricing[0].name).toBe('Unnamed Extra Feature');
  });

  it('says so when a stored extra has no catalogue to choose from', () => {
    // The plan arrives with an extra already priced, but the feature list is
    // empty, so the row's picker has nothing to offer.
    setup({ features: [], initialData: { extraPricing: [{ id: 'gone' }] } });
    showPricingTab();
    const extraSelect = document.body.querySelector('.pricing-plan-feature-select');
    expect(Array.from(extraSelect.options).map((o) => o.textContent)).toEqual([
      'Select Extra',
      'No features available',
    ]);
    expect(extraSelect.options[1].disabled).toBe(true);
  });

  it('seeds a row for an edited plan that had no extras yet', () => {
    setup({ isEditMode: true, initialData: { extraPricing: [] } });
    showPricingTab();
    expect(hook.formData.extraPricing).toEqual([]);

    fireEvent.click(extrasSwitch());
    expect(hook.formData.extraPricing).toHaveLength(1);
    expect(hook.formData.extraPricing[0].id).toBe('f1');
  });

  it('seeds nothing when the plan is not being edited', () => {
    setup({ initialData: { extraPricing: [] } });
    showPricingTab();
    fireEvent.click(extrasSwitch());
    expect(hook.formData.extraPricing).toEqual([]);
  });
});

describe('validation arms a seeded form reaches', () => {
  const seedPrices = () => {
    act(() => {
      hook.setPricePerMonth('10');
      hook.setPricePerYear('100');
    });
  };

  it('passes any tab it does not know how to check', () => {
    setup();
    expect(hook.validateForm('Nonexistent')).toBe(true);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('demands a storage amount', () => {
    setup();
    seedPrices();
    act(() => hook.setStorage(''));
    expect(hook.validateForm('Setting & Pricing')).toBe(false);
    expect(showToast).toHaveBeenCalledWith('Storage amount is required.', 'error');
  });

  it('refuses a feature row that was never resolved to a real feature', () => {
    setup({ initialData: { features: [{ name: 'Ghost' }] } });
    seedPrices();
    expect(hook.validateForm('Setting & Pricing')).toBe(false);
    expect(showToast).toHaveBeenCalledWith('All features must be selected.', 'error');
  });

  it('refuses an extra row with no price', () => {
    setup();
    showPricingTab();
    fireEvent.click(extrasSwitch());
    fireEvent.click(screen.getByRole('button', { name: '+ Add Extra' }));
    act(() => hook.handleUpdateExtraPricing(0, 'cost', ''));
    seedPrices();
    expect(hook.validateForm('Setting & Pricing')).toBe(false);
    expect(showToast).toHaveBeenCalledWith(
      'All extra features must have valid values.',
      'error'
    );
  });

  it('ignores a broken extra row while extras are switched off', () => {
    setup({ initialData: { extraPricing: [{}] } });
    seedPrices();
    act(() => hook.handleDeleteExtraPricing(0));
    expect(hook.validateForm('Setting & Pricing')).toBe(true);
  });

  it('adds a second toast telling the user to fix things before saving', async () => {
    setup();
    await expect(
      act(async () => {
        await hook.handleSave();
      })
    ).rejects.toThrow('Validation failed');
    expect(showToast).toHaveBeenLastCalledWith(
      'Please correct the errors before saving.',
      'error'
    );
  });
});

describe('the payload the panels produce', () => {
  it('carries the manager, the colour and each extra row currency', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    setup({
      onSave,
      initialData: {
        name: 'Pro',
        type: 'Enterprise',
        accountManager: 'a1',
        colourCode: '#112233',
      },
    });
    showPricingTab();
    fireEvent.change(selectsWithOption('GBP')[0], { target: { value: 'GBP' } });
    fireEvent.click(extrasSwitch());
    fireEvent.click(screen.getByRole('button', { name: '+ Add Extra' }));
    const [monthly, yearly, cost, extraYear] = priceInputs();
    fireEvent.change(monthly, { target: { value: '10' } });
    fireEvent.change(yearly, { target: { value: '100' } });
    fireEvent.change(cost, { target: { value: '3.5' } });
    fireEvent.change(extraYear, { target: { value: '35' } });

    await act(async () => {
      await hook.handleSave();
    });

    const [payload] = onSave.mock.calls[0];
    expect(payload).toEqual(
      expect.objectContaining({
        name: 'Pro',
        type: 'Enterprise',
        accountManager: 'a1',
        colourCode: '#112233',
      })
    );
    expect(payload.pricing.pricePerMonth).toEqual({ amount: '10', currency: 'GBP' });
    expect(payload.extraPricing[0]).toEqual({
      id: 'f1',
      pricePerMonth: { price: 3.5, currency: 'GBP' },
      pricePerYear: { price: 35, currency: 'GBP' },
    });
  });

  it('sends a zero price for an extra row nobody edited', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    setup({ onSave, initialData: { name: 'Pro', colourCode: '#112233' } });
    showPricingTab();
    fireEvent.click(extrasSwitch());
    fireEvent.click(screen.getByRole('button', { name: '+ Add Extra' }));
    const [monthly, yearly] = priceInputs();
    fireEvent.change(monthly, { target: { value: '10' } });
    fireEvent.change(yearly, { target: { value: '100' } });

    await act(async () => {
      await hook.handleSave();
    });

    const [payload] = onSave.mock.calls[0];
    expect(payload.extraPricing[0].pricePerMonth.price).toBe(0);
    expect(payload.extraPricing[0].pricePerYear.price).toBe(0);
  });

  it('goes back to the plan type it was opened with when reset', () => {
    setup({ initialPlanType: 'Enterprise', initialData: { name: 'Pro' } });
    act(() => hook.resetForm());
    expect(hook.formData.type).toBe('Enterprise');
    expect(hook.formData.name).toBe('');
    expect(hook.enableExtraPricing).toBe(false);
  });
});

describe('a colour the picker hands back empty', () => {
  it('falls back to black in both the swatch and the picker', () => {
    setup({ initialData: { colourCode: '#112233' } });
    fireEvent.click(screen.getByText('Change'));
    expect(screen.getByTestId('color-picker-value').textContent).toBe('#112233');

    fireEvent.click(screen.getByTestId('color-picker-clear'));

    expect(hook.formData.colorCode).toBe('');
    expect(screen.getByTestId('color-picker-value').textContent).toBe('#000000');
    expect(document.body.querySelector('.color-preview')).toHaveStyle({
      backgroundColor: '#000000',
    });
  });
});
