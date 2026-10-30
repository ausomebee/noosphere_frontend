import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

const showValidationErrors = vi.fn();
vi.mock('../Helper/formErrors', () => ({
  showValidationErrors: (...a) => showValidationErrors(...a),
}));

import ReassignModal from '../Components/ReusableModal/IssueViewModals/ReassignModal';

/**
 * The hand-this-issue-to-someone-else form.
 *
 * The issue only knows its assignee by name, so the modal has to look the id up
 * in the staff list; a name nobody matches is kept verbatim rather than
 * dropped, which leaves the read-only field showing something the picker cannot
 * actually select.
 *
 * Unlike the priority modal, the new-assignee list is not filtered, so picking
 * the person the issue is already with is possible -- and is what the schema's
 * "must be different" rule exists to refuse.
 */

const onClose = vi.fn();
const onSave = vi.fn();

// Declared once, outside render, because the seeding effect lists staffList in
// its dependencies and a fresh array each render would re-run it forever.
const staffList = [
  { staffId: 's1', name: 'Ada Bell' },
  { staffId: 's2', name: 'Bo Chen' },
  { staffId: 's3', name: 'Retired Staff', active: false },
];
const noStaff = [];

const renderModal = (props = {}) =>
  render(
    <ReassignModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      staffList={staffList}
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
const currentAssignee = () => selects()[0];
const newAssignee = () => selects()[1];

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
    expect(screen.queryByText('Reassign to Staff')).not.toBeInTheDocument();
  });

  it('looks the current assignee up by name and locks the field', () => {
    renderModal({ initialAssignee: 'Ada Bell' });
    expect(currentAssignee()).toHaveValue('s1');
    expect(currentAssignee()).toBeDisabled();
  });

  it('leaves the current assignee blank and unlocked for an unassigned issue', () => {
    renderModal();
    expect(currentAssignee()).toHaveValue('');
    expect(currentAssignee()).not.toBeDisabled();
  });

  it('keeps a name it cannot match, even though nothing selects it', () => {
    // The unmatched name is written to the select as its value, but no option
    // carries it, so the native element ends up with nothing selected at all --
    // hence selectedIndex rather than toHaveValue, which reports `undefined`
    // for a select with an empty selection.
    renderModal({ initialAssignee: 'Someone Who Left' });
    expect(currentAssignee().selectedIndex).toBe(-1);
    expect(currentAssignee()).toBeDisabled();
  });

  it('offers the active staff only', () => {
    renderModal();
    expect(screen.getAllByText('Ada Bell').length).toBeGreaterThan(0);
    expect(screen.queryByText('Retired Staff')).not.toBeInTheDocument();
  });

  it('hints at where to create staff when there are none', () => {
    // Passed as a module-level constant rather than omitted: the prop's own
    // `staffList = []` default builds a fresh array on every render, and the
    // seeding effect depends on that identity while calling reset(), so leaving
    // the prop off spins the component in an endless render loop.
    renderModal({ staffList: noStaff });
    expect(
      screen.getByText('No staff found. Create one in Settings → Staff.')
    ).toBeInTheDocument();
    expect(currentAssignee().options[0].textContent).toBe(
      '-- Select Current Assignee --'
    );
  });
});

describe('reassigning', () => {
  it('refuses to save until somebody is picked', async () => {
    renderModal({ initialAssignee: 'Ada Bell' });
    await save();
    expect(showValidationErrors).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('refuses to reassign the issue to the person who already has it', async () => {
    renderModal({ initialAssignee: 'Ada Bell' });
    fireEvent.change(newAssignee(), { target: { value: 's1' } });
    await save();
    expect(showValidationErrors).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getByText('New assignee must be different from the current assignee')
    ).toBeInTheDocument();
  });

  it('sends the new assignee and closes', async () => {
    renderModal({ initialAssignee: 'Ada Bell' });
    fireEvent.change(newAssignee(), { target: { value: 's2' } });
    await save();
    expect(onSave).toHaveBeenCalledWith('s2');
    expect(onClose).toHaveBeenCalled();
  });

  it('stays open when the parent refuses the change', async () => {
    onSave.mockRejectedValue(new Error('server said no'));
    renderModal({ initialAssignee: 'Ada Bell' });
    fireEvent.change(newAssignee(), { target: { value: 's2' } });
    await save();
    expect(onSave).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('holds the save button while the change is in flight', async () => {
    let release;
    onSave.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    renderModal();
    fireEvent.change(newAssignee(), { target: { value: 's2' } });
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
    renderModal({ initialAssignee: 'Ada Bell' });
    fireEvent.change(newAssignee(), { target: { value: 's2' } });
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    await waitFor(() => expect(newAssignee()).toHaveValue(''));
  });

  it('closes on Escape', () => {
    renderModal();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
