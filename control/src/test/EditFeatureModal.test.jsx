import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

import EditFeatureModal from '../Components/ReusableModal/EditFeatureModal';

/**
 * The rename-a-feature form.
 *
 * It keeps one plain `formData` object seeded from the props it was opened
 * with, so every field has a `||` fallback and the active flag has a `??` one
 * that lets an explicit `false` through. The status picker is a native select
 * whose values are the strings "true"/"false", converted back to a boolean on
 * the way into state.
 *
 * `primaryButtonDisabled` is not a prop ReusableModal understands here, so the
 * Save button stays live even with an empty name and the guard inside
 * `handleSave` is what actually refuses the save.
 */

const onClose = vi.fn();
const onSave = vi.fn();

const renderModal = (props = {}) =>
  render(
    <EditFeatureModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      featureId="f1"
      currentName="Invoicing"
      currentDescription="Bills the tenant"
      currentManagedBy="Ada"
      {...props}
    />
  );

const primary = () => document.body.querySelector('.primary-button');
const secondary = () => document.body.querySelector('.secondary-button');

// The save handler returns nothing, so ReusableModal holds the button for its
// fixed 600ms lock instead of awaiting a promise.
const clickPrimary = () => {
  fireEvent.click(primary());
  act(() => {
    vi.advanceTimersByTime(700);
  });
};

const field = (label) => {
  const group = [...document.body.querySelectorAll('.input-group')].find(
    (g) => g.querySelector('.input-label')?.textContent.replace('*', '') === label
  );
  return group?.querySelector('input, select, textarea');
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('opening the form', () => {
  it('renders nothing while closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Edit Feature')).not.toBeInTheDocument();
  });

  it('seeds every field from the feature it was given', () => {
    renderModal();
    expect(screen.getByText('Edit Feature')).toBeInTheDocument();
    expect(field('Feature Name')).toHaveValue('Invoicing');
    expect(field('Feature Description')).toHaveValue('Bills the tenant');
    expect(field('Managed By')).toHaveValue('Ada');
  });

  it('starts blank when the feature carries nothing to seed with', () => {
    renderModal({
      featureId: undefined,
      currentName: undefined,
      currentDescription: undefined,
      currentManagedBy: undefined,
    });
    expect(field('Feature Name')).toHaveValue('');
    expect(field('Feature Description')).toHaveValue('');
    expect(field('Managed By')).toHaveValue('');
  });

  it('treats an unstated active flag as active', () => {
    renderModal();
    expect(field('Set Active or Disabled')).toHaveValue('true');
  });

  it('honours an explicitly disabled feature', () => {
    // `??` rather than `||`, so a stored `false` survives instead of flipping
    // back to the default.
    renderModal({ currentActive: false });
    expect(field('Set Active or Disabled')).toHaveValue('false');
  });

  it('locks every field while a save is in flight', () => {
    renderModal({ isLoading: true });
    expect(field('Feature Name')).toBeDisabled();
    expect(field('Feature Description')).toBeDisabled();
    expect(field('Managed By')).toBeDisabled();
    expect(field('Set Active or Disabled')).toBeDisabled();
    expect(primary()).toBeDisabled();
  });
});

describe('saving', () => {
  it('sends the trimmed fields back', () => {
    renderModal();
    fireEvent.change(field('Feature Name'), { target: { value: '  Billing  ' } });
    fireEvent.change(field('Feature Description'), { target: { value: '  Money  ' } });
    fireEvent.change(field('Managed By'), { target: { value: '  Bee  ' } });
    clickPrimary();
    expect(onSave).toHaveBeenCalledWith({
      name: 'Billing',
      description: 'Money',
      managedBy: 'Bee',
      active: true,
    });
  });

  it('credits Admin when no manager is named', () => {
    renderModal({ currentManagedBy: '   ' });
    clickPrimary();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ managedBy: 'Admin' })
    );
  });

  it('refuses a name that is nothing but whitespace', () => {
    renderModal();
    fireEvent.change(field('Feature Name'), { target: { value: '   ' } });
    clickPrimary();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('empties the form after a save rather than closing it', () => {
    // Nothing in `handleSave` calls onClose -- the parent is expected to.
    renderModal();
    clickPrimary();
    expect(onSave).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(field('Feature Name')).toHaveValue('');
  });

  it('turns the picked status string back into a boolean', () => {
    renderModal();
    fireEvent.change(field('Set Active or Disabled'), { target: { value: 'false' } });
    clickPrimary();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
  });

  it('treats the empty placeholder as disabled', () => {
    // Only the literal string "true" maps to true, so the placeholder option
    // lands on false.
    renderModal({ currentActive: true });
    fireEvent.change(field('Set Active or Disabled'), { target: { value: '' } });
    clickPrimary();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
  });
});

describe('cancelling', () => {
  it('restores the original values and closes', () => {
    renderModal();
    fireEvent.change(field('Feature Name'), { target: { value: 'Something else' } });
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(field('Feature Name')).toHaveValue('Invoicing');
  });

  it('restores the blanks when there was nothing to restore to', () => {
    renderModal({ currentName: undefined, currentManagedBy: undefined, currentActive: false });
    fireEvent.change(field('Feature Name'), { target: { value: 'Typed' } });
    fireEvent.click(secondary());
    expect(field('Feature Name')).toHaveValue('');
    expect(field('Set Active or Disabled')).toHaveValue('false');
  });
});

describe('cancelling a feature that never had a description', () => {
  it('restores the description to a blank rather than to undefined', () => {
    renderModal({ currentDescription: undefined });
    fireEvent.change(field('Feature Description'), { target: { value: 'Typed' } });
    fireEvent.click(secondary());
    expect(field('Feature Description')).toHaveValue('');
  });
});
