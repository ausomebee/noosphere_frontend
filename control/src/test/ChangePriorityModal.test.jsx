import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

const showValidationErrors = vi.fn();
vi.mock('../Helper/formErrors', () => ({
  showValidationErrors: (...a) => showValidationErrors(...a),
}));

import ChangePriorityModal from '../Components/ReusableModal/IssueViewModals/ChangePriorityModal';

/**
 * The re-prioritise-an-issue form.
 *
 * Which priorities it offers depends on the tenant, which may arrive either as
 * an object or as a single-element array (the issue table hands over its
 * multi-select), so both shapes are read for the same `isEnterprise` flag.
 *
 * The current priority is a read-only select seeded on open, and only if the
 * stored value actually appears in the offered list -- an issue carrying a
 * priority from the other list opens blank. The new-priority list has the
 * current one filtered out, which is why the schema's "must be different" rule
 * can't be reached from the UI.
 */

const onClose = vi.fn();
const onSave = vi.fn();

const renderModal = (props = {}) =>
  render(
    <ChangePriorityModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      issueId="i1"
      adminId="a1"
      accessToken="at"
      refreshToken="rt"
      {...props}
    />
  );

const primary = () => document.body.querySelector('.primary-button');
const secondary = () => document.body.querySelector('.secondary-button');

const selects = () => [...document.body.querySelectorAll('.modal-form select')];
const currentPriority = () => selects()[0];
const newPriority = () => selects()[1];

// `handleSubmit` returns a promise, so ReusableModal awaits it rather than
// applying its fixed 600ms lock.
const save = async () => {
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

describe('opening the form', () => {
  it('renders nothing while closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Change Priority')).not.toBeInTheDocument();
  });

  it('seeds the read-only current priority', () => {
    renderModal({ initialPriority: 'P2' });
    expect(screen.getByText('Change Priority')).toBeInTheDocument();
    expect(currentPriority()).toHaveValue('P2');
    expect(currentPriority()).toBeDisabled();
  });

  it('opens blank for an issue with no priority yet', () => {
    renderModal();
    expect(currentPriority()).toHaveValue('');
    expect(newPriority()).toHaveValue('');
  });

  it('opens blank when the stored priority is not on offer', () => {
    // An enterprise priority on an issue whose tenant is no longer enterprise
    // has nothing to select, so the field is cleared rather than left stale.
    renderModal({ initialPriority: 'EP1' });
    expect(currentPriority()).toHaveValue('');
  });
});

describe('the priorities it offers', () => {
  it('offers only the base list to an ordinary tenant', () => {
    renderModal({ selectedTenant: { isEnterprise: false } });
    expect(screen.getAllByText('P1 - Critical').length).toBeGreaterThan(0);
    expect(screen.queryByText('EP1 - Enterprise Critical')).not.toBeInTheDocument();
  });

  it('adds the enterprise list for an enterprise tenant', () => {
    renderModal({ selectedTenant: { isEnterprise: true } });
    expect(screen.getAllByText('EP1 - Enterprise Critical').length).toBeGreaterThan(0);
  });

  it('reads the flag off the first tenant when handed an array', () => {
    renderModal({ selectedTenant: [{ isEnterprise: true }] });
    expect(screen.getAllByText('EP2 - Enterprise High').length).toBeGreaterThan(0);
  });

  it('treats an empty tenant array as ordinary', () => {
    renderModal({ selectedTenant: [] });
    expect(screen.queryByText('EP1 - Enterprise Critical')).not.toBeInTheDocument();
  });

  it('treats no tenant at all as ordinary', () => {
    renderModal();
    expect(screen.queryByText('EP1 - Enterprise Critical')).not.toBeInTheDocument();
  });

  it('drops the current priority from the list of new ones', () => {
    renderModal({ initialPriority: 'P1' });
    const offered = [...newPriority().options].map((o) => o.value);
    expect(offered).not.toContain('P1');
    expect(offered).toContain('P2');
  });
});

describe('saving', () => {
  it('refuses to save until a new priority is picked', async () => {
    renderModal({ initialPriority: 'P2' });
    await save();
    expect(showValidationErrors).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('sends the chosen priority and closes', async () => {
    renderModal({ initialPriority: 'P2' });
    fireEvent.change(newPriority(), { target: { value: 'P1' } });
    await save();
    expect(onSave).toHaveBeenCalledWith('P1');
    expect(onClose).toHaveBeenCalled();
  });

  it('stays open when the parent refuses the change', async () => {
    onSave.mockRejectedValue(new Error('server said no'));
    renderModal({ initialPriority: 'P2' });
    fireEvent.change(newPriority(), { target: { value: 'P3' } });
    await save();
    expect(onSave).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('holds the save button while the change is in flight', async () => {
    let release;
    onSave.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    renderModal({ initialPriority: 'P2' });
    fireEvent.change(newPriority(), { target: { value: 'P4' } });
    await act(async () => {
      fireEvent.click(primary());
    });
    expect(primary()).toBeDisabled();
    await act(async () => {
      release();
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

describe('cancelling', () => {
  it('clears the pending choice and closes', async () => {
    renderModal({ initialPriority: 'P2' });
    fireEvent.change(newPriority(), { target: { value: 'P1' } });
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    await waitFor(() => expect(newPriority()).toHaveValue(''));
  });

  it('closes on Escape even with no priority to reset to', () => {
    renderModal();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('an issue that had no priority to begin with', () => {
  it('resets the current-priority field to blank after saving', async () => {
    renderModal();
    fireEvent.change(newPriority(), { target: { value: 'P1' } });
    await save();
    expect(onSave).toHaveBeenCalledWith('P1');
    expect(currentPriority()).toHaveValue('');
  });

  it('resets the current-priority field to blank on Cancel', async () => {
    renderModal();
    fireEvent.change(newPriority(), { target: { value: 'P1' } });
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    await waitFor(() => expect(currentPriority()).toHaveValue(''));
  });
});
