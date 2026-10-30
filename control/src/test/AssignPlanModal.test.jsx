import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import AssignPlanModal from '../Components/ReusableModal/AssignPlanModal';

/**
 * The dialog that attaches one feature to one or more subscription plans.
 *
 * The plan list is not fetched -- it is the static `planOptions` table -- so the
 * only state is which boxes are ticked, seeded from the feature's existing
 * plans. Cancelling puts that seed back rather than emptying the selection.
 *
 * Two things are easy to get wrong here. Saving nothing is not an error: with an
 * empty selection the modal simply closes without reporting, which is the arm
 * that has to be asserted by absence. And the `primaryButtonDisabled` it passes
 * is ignored by control's `ReusableModal` -- only `primaryButtonLoading` really
 * locks the button -- so the loading test asserts on that instead.
 *
 * Each CheckboxInput's label has no htmlFor, so boxes are found by their value.
 */

const onClose = vi.fn();
const onSave = vi.fn();

const primary = () => document.body.querySelector('.primary-button');
const secondary = () => document.body.querySelector('.secondary-button');
const boxFor = (plan) =>
  document.body.querySelector(`input[type="checkbox"][value="${plan}"]`);

const renderModal = (props = {}) =>
  render(
    <AssignPlanModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      featureId="f1"
      currentGroupTitle="Billing"
      currentPlans={[]}
      {...props}
    />
  );

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the plan list', () => {
  it('offers every plan the product sells', () => {
    renderModal();
    for (const label of ['Basic Plan', 'Standard Plan', 'Pro Plan', 'Enterprise Plan']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(
      screen.getByText('Select the plan(s) you want to assign this feature to')
    ).toBeInTheDocument();
  });

  it('preticks the plans the feature is already on', () => {
    renderModal({ currentPlans: ['Standard', 'Enterprise'] });
    expect(boxFor('Standard').checked).toBe(true);
    expect(boxFor('Enterprise').checked).toBe(true);
    expect(boxFor('Basic').checked).toBe(false);
  });

  // currentPlans is optional; the effect skips seeding when it is absent, and
  // nothing downstream may assume an array is there.
  it('starts with nothing ticked when the feature has no plans yet', () => {
    renderModal({ currentPlans: undefined });
    expect(boxFor('Basic').checked).toBe(false);
    expect(boxFor('Pro').checked).toBe(false);
  });

  it('unticks a plan that was already on', () => {
    renderModal({ currentPlans: ['Pro'] });
    fireEvent.click(boxFor('Pro'));
    expect(boxFor('Pro').checked).toBe(false);
  });
});

describe('saving the assignment', () => {
  it('reports the feature, its group and every ticked plan', () => {
    renderModal();
    fireEvent.click(boxFor('Basic'));
    fireEvent.click(boxFor('Pro'));
    fireEvent.click(primary());

    expect(onSave).toHaveBeenCalledWith({
      featureId: 'f1',
      groupTitle: 'Billing',
      plans: ['Basic', 'Pro'],
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('reports what is left after a pretick is removed', () => {
    renderModal({ currentPlans: ['Basic', 'Pro'] });
    fireEvent.click(boxFor('Basic'));
    fireEvent.click(primary());
    expect(onSave).toHaveBeenCalledWith({
      featureId: 'f1',
      groupTitle: 'Billing',
      plans: ['Pro'],
    });
  });

  it('just closes when every plan has been cleared', () => {
    renderModal({ currentPlans: ['Pro'] });
    fireEvent.click(boxFor('Pro'));
    fireEvent.click(primary());
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('just closes when nothing was ever ticked', () => {
    renderModal();
    fireEvent.click(primary());
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

describe('dismissing the dialog', () => {
  it('puts the feature\'s existing plans back', () => {
    renderModal({ currentPlans: ['Pro'] });
    fireEvent.click(boxFor('Basic'));
    fireEvent.click(secondary());

    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
    expect(boxFor('Basic').checked).toBe(false);
    expect(boxFor('Pro').checked).toBe(true);
  });

  it('clears the selection when the feature had no plans to restore', () => {
    renderModal({ currentPlans: undefined });
    fireEvent.click(boxFor('Basic'));
    fireEvent.click(secondary());
    expect(boxFor('Basic').checked).toBe(false);
  });

  it('closes on Escape', () => {
    renderModal();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('while a save is in flight', () => {
  it('locks the plan list and the save button', () => {
    renderModal({ isLoading: true });
    expect(boxFor('Basic')).toBeDisabled();
    expect(boxFor('Enterprise')).toBeDisabled();
    expect(primary()).toBeDisabled();
  });
});
