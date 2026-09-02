import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const showToast = vi.fn();
vi.mock('../Helper/ShowToast', () => ({ showToast: (...a) => showToast(...a) }));

import usePricingForm from '../Pages/BillingsAndPayment/usePricingForm';

/**
 * The plan editor's form state, shared by the create and edit pricing modals.
 *
 * Nearly all of its behaviour is in this hook rather than the modals: feature
 * rows keyed by a generated uniqueId, extra-pricing rows keyed by index,
 * per-tab validation, and the payload shaping done on save.
 */

const features = [
  { id: 'f1', name: 'Invoicing' },
  { id: 'f2', name: 'Reporting' },
];

const setup = (props = {}) =>
  renderHook(() => usePricingForm({ features, onSave: vi.fn(), ...props }));

// The hook does not expose setFormData, so the name and colour come in through
// initialData. Note the backend spelling: `colourCode` in, `colorCode` in state.
const valid = { name: 'Pro', colourCode: '#112233' };

// The form only validates the tab it is on, so a save has to end on the
// pricing tab with both tabs filled.
const makeSaveable = (result) => {
  act(() => {
    result.current.setPricePerMonth('10');
    result.current.setPricePerYear('100');
    result.current.setActiveTab('Setting & Pricing');
  });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('initial state', () => {
  it('starts on the General tab with the default plan type', () => {
    const { result } = setup();
    expect(result.current.activeTab).toBe('General');
    expect(result.current.formData.type).toBe('Standard');
  });

  it('honours a supplied plan type', () => {
    const { result } = setup({ initialPlanType: 'Enterprise' });
    expect(result.current.formData.type).toBe('Enterprise');
  });

  it('defaults its pricing fields', () => {
    const { result } = setup();
    expect(result.current.pricePerMonth).toBe('0');
    expect(result.current.pricePerYear).toBe('0');
    expect(result.current.clients).toBe('unlimited');
    expect(result.current.storage).toBe('unlimited');
    expect(result.current.currency).toBe('USD');
    expect(result.current.userOption).toBe('clients');
  });

  it('exposes both tabs', () => {
    const { result } = setup();
    expect(result.current.tabs.map((t) => t.name)).toEqual(['General', 'Setting & Pricing']);
  });

  it('copes with a features prop that is not an array', () => {
    const { result } = setup({ features: 'nope' });
    expect(result.current.availableFeatures).toEqual([]);
  });
});

describe('features', () => {
  it('adds a feature and gives the row its own id', () => {
    const { result } = setup();
    act(() => result.current.handleAddFeature('f1'));
    expect(result.current.formData.features).toHaveLength(1);
    expect(result.current.formData.features[0].name).toBe('Invoicing');
    expect(result.current.formData.features[0].uniqueId).toBeTruthy();
  });

  it('complains when there are no features to add', () => {
    const { result } = setup({ features: [] });
    act(() => result.current.handleAddFeature('f1'));
    expect(showToast).toHaveBeenCalledWith('No features available to add.', 'error');
  });

  it('complains when no feature id is given', () => {
    const { result } = setup();
    act(() => result.current.handleAddFeature(undefined));
    expect(showToast).toHaveBeenCalledWith('No features available to add.', 'error');
  });

  it('complains when the chosen feature is not in the list', () => {
    const { result } = setup();
    act(() => result.current.handleAddFeature('nope'));
    expect(showToast).toHaveBeenCalledWith('Selected feature not found.', 'error');
  });

  it('swaps one feature row for another, keeping its row id', () => {
    const { result } = setup();
    act(() => result.current.handleAddFeature('f1'));
    const { uniqueId } = result.current.formData.features[0];

    act(() => result.current.handleUpdateFeature(uniqueId, 'f2'));
    expect(result.current.formData.features[0].name).toBe('Reporting');
    expect(result.current.formData.features[0].uniqueId).toBe(uniqueId);
  });

  it('ignores an update with no feature id, and complains about an unknown one', () => {
    const { result } = setup();
    act(() => result.current.handleAddFeature('f1'));
    const { uniqueId } = result.current.formData.features[0];

    act(() => result.current.handleUpdateFeature(uniqueId, ''));
    expect(result.current.formData.features[0].name).toBe('Invoicing');

    act(() => result.current.handleUpdateFeature(uniqueId, 'nope'));
    expect(showToast).toHaveBeenCalledWith('Selected feature not found.', 'error');
  });

  it('deletes a feature row by its own id', () => {
    const { result } = setup();
    act(() => result.current.handleAddFeature('f1'));
    const { uniqueId } = result.current.formData.features[0];
    act(() => result.current.handleDeleteFeature(uniqueId));
    expect(result.current.formData.features).toEqual([]);
  });
});

describe('extra pricing', () => {
  it('adds a row for the chosen feature', () => {
    const { result } = setup();
    act(() => result.current.handleAddExtraPricing('f2'));
    expect(result.current.formData.extraPricing[0]).toEqual(
      expect.objectContaining({ id: 'f2', name: 'Reporting', cost: '0', storage: '0' })
    );
  });

  it('falls back to the first feature when the id is not recognised', () => {
    const { result } = setup();
    act(() => result.current.handleAddExtraPricing('nope'));
    expect(result.current.formData.extraPricing[0].id).toBe('f1');
  });

  it('complains when there are no features to price', () => {
    const { result } = setup({ features: [] });
    act(() => result.current.handleAddExtraPricing('f1'));
    expect(showToast).toHaveBeenCalledWith(
      'No valid features available for extra pricing.',
      'error'
    );
  });

  it('updates one field of a row', () => {
    const { result } = setup();
    act(() => result.current.handleAddExtraPricing('f1'));
    act(() => result.current.handleUpdateExtraPricing(0, 'cost', 25));
    expect(result.current.formData.extraPricing[0].cost).toBe('25');
  });

  it('renames the row when its feature is changed', () => {
    const { result } = setup();
    act(() => result.current.handleAddExtraPricing('f1'));
    act(() => result.current.handleUpdateExtraPricing(0, 'id', 'f2'));
    expect(result.current.formData.extraPricing[0].name).toBe('Reporting');
  });

  it('labels an unrecognised feature rather than leaving the name blank', () => {
    const { result } = setup();
    act(() => result.current.handleAddExtraPricing('f1'));
    act(() => result.current.handleUpdateExtraPricing(0, 'id', 'nope'));
    expect(result.current.formData.extraPricing[0].name).toBe('Unnamed Extra Feature');
  });

  it('deletes a row by index', () => {
    const { result } = setup();
    act(() => result.current.handleAddExtraPricing('f1'));
    act(() => result.current.handleAddExtraPricing('f2'));
    act(() => result.current.handleDeleteExtraPricing(0));
    expect(result.current.formData.extraPricing).toHaveLength(1);
    expect(result.current.formData.extraPricing[0].id).toBe('f2');
  });
});

describe('validation on save', () => {
  it('refuses a blank plan name', async () => {
    const onSave = vi.fn();
    const { result } = setup({ onSave });
    await expect(act(async () => { await result.current.handleSave(); })).rejects.toBeTruthy();
    expect(showToast).toHaveBeenCalledWith('Plan name is required.', 'error');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('refuses an invalid colour code', async () => {
    const onSave = vi.fn();
    const { result } = setup({ onSave, initialData: { name: 'Pro', colourCode: 'blue' } });
    await expect(act(async () => { await result.current.handleSave(); })).rejects.toBeTruthy();
    expect(showToast).toHaveBeenCalledWith('A valid hex color code is required.', 'error');
  });

  it.each([
    ['', 'Monthly price must be a positive number.'],
    ['0', 'Monthly price must be a positive number.'],
    ['abc', 'Monthly price must be a positive number.'],
  ])('refuses a monthly price of %s', async (price, message) => {
    const { result } = setup({ initialData: valid });
    act(() => {
      result.current.setPricePerMonth(price);
      result.current.setPricePerYear('100');
      result.current.setActiveTab('Setting & Pricing');
    });
    await expect(act(async () => { await result.current.handleSave(); })).rejects.toBeTruthy();
    expect(showToast).toHaveBeenCalledWith(message, 'error');
  });

  it('refuses a non-positive yearly price', async () => {
    const { result } = setup({ initialData: valid });
    act(() => {
      result.current.setPricePerMonth('10');
      result.current.setPricePerYear('0');
      result.current.setActiveTab('Setting & Pricing');
    });
    await expect(act(async () => { await result.current.handleSave(); })).rejects.toBeTruthy();
    expect(showToast).toHaveBeenCalledWith('Yearly price must be a positive number.', 'error');
  });

  it('refuses a blank client count or storage amount', async () => {
    const { result } = setup({ initialData: valid });
    makeSaveable(result);
    act(() => result.current.setClients(''));
    await expect(act(async () => { await result.current.handleSave(); })).rejects.toBeTruthy();
    expect(showToast).toHaveBeenCalledWith('Number of clients is required.', 'error');
  });
});

describe('the payload it builds', () => {
  it('shapes the plan for the backend', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = setup({ onSave, initialData: valid });
    makeSaveable(result);
    act(() => result.current.handleAddFeature('f1'));

    await act(async () => { await result.current.handleSave(); });

    const [payload] = onSave.mock.calls[0];
    expect(payload).toEqual(
      expect.objectContaining({
        name: 'Pro',
        type: 'Standard',
        colourCode: '#112233',
        features: [{ id: 'f1', name: 'Invoicing' }],
      })
    );
    expect(payload.pricing.pricePerMonth).toEqual({ amount: '10', currency: 'USD' });
    expect(payload.pricing.pricePerYear).toEqual({ amount: '100', currency: 'USD' });
  });

  it('turns extra pricing into prices, defaulting anything unparseable to zero', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = setup({ onSave, initialData: valid });
    makeSaveable(result);
    act(() => result.current.handleAddExtraPricing('f1'));
    act(() => {
      result.current.handleUpdateExtraPricing(0, 'cost', '5.5');
      result.current.handleUpdateExtraPricing(0, 'storage', 'nonsense');
    });

    await act(async () => { await result.current.handleSave(); });

    const [payload] = onSave.mock.calls[0];
    expect(payload.extraPricing[0].pricePerMonth.price).toBe(5.5);
    expect(payload.extraPricing[0].pricePerYear.price).toBe(0);
  });

  it('lets a failing save reach the caller so the modal can stay open', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('server said no'));
    const { result } = setup({ onSave, initialData: valid });
    makeSaveable(result);
    await expect(
      act(async () => { await result.current.handleSave(); })
    ).rejects.toThrow('server said no');
  });
});

describe('reset and currency symbols', () => {
  it('puts everything back to its starting state', () => {
    const { result } = setup({ initialData: valid });
    act(() => {
      result.current.setPricePerMonth('99');
      result.current.setActiveTab('Setting & Pricing');
    });
    act(() => result.current.resetForm());

    expect(result.current.formData.name).toBe('');
    expect(result.current.pricePerMonth).toBe('0');
    expect(result.current.activeTab).toBe('General');
  });

  it('exposes a symbol for each supported currency', () => {
    const { result } = setup();
    expect(result.current.currencySymbols).toEqual({ USD: '$', EUR: '€', GBP: '£' });
  });
});
