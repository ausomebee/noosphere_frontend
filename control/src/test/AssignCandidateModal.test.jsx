import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

import AssignCandidateModal from '../Components/ReusableModal/AssignCandidateModal';

/**
 * The bulk reassign-to-staff modal for the pipeline board.
 *
 * It is handed a set of task ids and the board's task map, and works out
 * whether those tasks already share one owner. That answer drives everything:
 * the read-only "Currently Assigned" line, the value the picker starts on, and
 * whether saving with nobody chosen is allowed at all. Unassigning is fine for
 * a single candidate but silently refused for several, so the guard in the save
 * handler is the only thing standing between the user and an empty request --
 * this ReusableModal ignores `primaryButtonDisabled` entirely.
 *
 * A task's staff arrives either as a bare id or as a `{ staffId, name }`
 * object depending on which board fetch produced it, and both shapes have to
 * collapse to the same id.
 */

const onClose = vi.fn();
const onSave = vi.fn();

const staffList = [
  { staffId: 's1', name: 'Ada Bell' },
  { staffId: 's2', name: 'Grace Kern' },
  { staffId: 's3', name: 'Retired Staff', active: false },
];

const tasks = {
  a: { staff: 's1' },
  b: { staff: { staffId: 's1', name: 'Ada Bell' } },
  c: { staff: 's2' },
  d: { staff: null },
};

const renderModal = (props = {}) =>
  render(
    <AssignCandidateModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      taskIds={['a']}
      tasks={tasks}
      staffList={staffList}
      {...props}
    />
  );

const selectFor = (label) =>
  screen.getByText(label).closest('.input-group').querySelector('select');
const assignTo = () => selectFor('Assign to');
const currentlyAssigned = () => selectFor('Currently Assigned');
const primary = () => document.body.querySelector('.primary-button');
const secondary = () => document.body.querySelector('.secondary-button');

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
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('when it renders at all', () => {
  it('renders nothing while closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText(/Candidate\(s\) to Staff/)).not.toBeInTheDocument();
  });

  it('counts the candidates in its title', () => {
    renderModal({ taskIds: ['a', 'c'] });
    expect(screen.getByText('Reassign 2 Candidate(s) to Staff')).toBeInTheDocument();
  });

  it.each([
    ['an empty selection', []],
    ['no selection at all', undefined],
  ])('claims a single candidate for %s', (_case, taskIds) => {
    renderModal({ taskIds });
    expect(screen.getByText('Reassign 1 Candidate(s) to Staff')).toBeInTheDocument();
  });
});

describe('working out who owns the tasks', () => {
  it('starts on the owner shared by every selected task', () => {
    renderModal({ taskIds: ['a'] });
    expect(assignTo().value).toBe('s1');
    // Once as the current assignment, once as a pickable option.
    expect(screen.getAllByText('Ada Bell')).toHaveLength(2);
  });

  it('reads an owner delivered as an object just like a bare id', () => {
    renderModal({ taskIds: ['a', 'b'] });
    expect(assignTo().value).toBe('s1');
  });

  it('starts on nobody when the selected tasks disagree', () => {
    renderModal({ taskIds: ['a', 'c'] });
    expect(assignTo().value).toBe('');
  });

  it('ignores tasks that have no owner when looking for a shared one', () => {
    renderModal({ taskIds: ['a', 'd'] });
    expect(assignTo().value).toBe('s1');
  });

  it('starts on nobody when none of the selected tasks has an owner', () => {
    renderModal({ taskIds: ['d'] });
    expect(assignTo().value).toBe('');
  });

  it('copes with a selection the task map has never heard of', () => {
    renderModal({ taskIds: ['nope'] });
    expect(assignTo().value).toBe('');
  });

  it('copes with being handed no task map', () => {
    renderModal({ tasks: undefined });
    expect(assignTo().value).toBe('');
  });

  it('names an owner the staff list cannot account for', () => {
    renderModal({
      taskIds: ['a'],
      staffList: [{ staffId: 's9', name: 'Someone Else' }],
    });
    expect(screen.getByText('Unknown Staff')).toBeInTheDocument();
  });

  it('calls a shared owner unassigned when there is no staff list to name them', () => {
    // With no list to look the id up in, the label falls through to the
    // selection-size branch even though an owner was found.
    renderModal({ taskIds: ['a'], staffList: [] });
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('calls a shared owner Multiple Staff when several candidates are selected', () => {
    renderModal({ taskIds: ['a', 'b'], staffList: [] });
    expect(screen.getByText('Multiple Staff')).toBeInTheDocument();
  });
});

describe('the read-only current-assignment line', () => {
  it('shows the shared owner as its only option', () => {
    renderModal({ taskIds: ['a'] });
    expect(currentlyAssigned()).toBeDisabled();
    expect(currentlyAssigned().value).toBe('s1');
  });

  it('shows nothing but a placeholder when there is no shared owner', () => {
    // Its one option is built with an empty value, and SelectInput drops those,
    // so "Multiple Staff" is computed and then never rendered here -- it only
    // reaches the screen because the placeholder happens to be dropped too.
    renderModal({ taskIds: ['d'] });
    expect(currentlyAssigned().querySelectorAll('option')).toHaveLength(1);
    expect(currentlyAssigned().value).toBe('');
  });
});

describe('the staff picker', () => {
  it('offers every staff member who is still active', () => {
    renderModal();
    expect(screen.getByText('Grace Kern')).toBeInTheDocument();
    expect(screen.queryByText('Retired Staff')).not.toBeInTheDocument();
  });

  it.each([
    ['an empty staff list', []],
    ['no staff list at all', undefined],
    ['a staff list that is not a list', { s1: 'Ada' }],
  ])('hints at where to create staff given %s', (_case, list) => {
    renderModal({ staffList: list });
    expect(
      screen.getByText('No staff found. Create one in Settings → Staff.')
    ).toBeInTheDocument();
  });

  it('remembers whoever was picked', () => {
    renderModal({ taskIds: ['d'] });
    fireEvent.change(assignTo(), { target: { value: 's2' } });
    expect(assignTo().value).toBe('s2');
  });
});

describe('saving', () => {
  it('sends the picked staff id', async () => {
    renderModal({ taskIds: ['d'] });
    fireEvent.change(assignTo(), { target: { value: 's2' } });
    await save();
    expect(onSave).toHaveBeenCalledWith('s2');
  });

  it('sends the shared owner back unchanged when nothing was touched', async () => {
    renderModal({ taskIds: ['a'] });
    await save();
    expect(onSave).toHaveBeenCalledWith('s1');
  });

  it('unassigns a single candidate', async () => {
    renderModal({ taskIds: ['d'] });
    await save();
    expect(onSave).toHaveBeenCalledWith('');
  });

  it('refuses to unassign several candidates at once', async () => {
    renderModal({ taskIds: ['a', 'c'] });
    await save();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('clears the picker but stays open after a save', async () => {
    renderModal({ taskIds: ['d'] });
    fireEvent.change(assignTo(), { target: { value: 's2' } });
    await save();
    expect(assignTo().value).toBe('');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('holds the primary button while the save is in flight', async () => {
    let release;
    onSave.mockImplementation(() => new Promise((resolve) => (release = resolve)));
    renderModal({ taskIds: ['a'] });
    await act(async () => {
      fireEvent.click(primary());
    });
    expect(primary()).toBeDisabled();

    await act(async () => {
      release();
    });
    expect(primary()).toBeEnabled();
  });

  it('logs a refused save in development and keeps the picked staff', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    onSave.mockRejectedValue(new Error('server said no'));
    renderModal({ taskIds: ['d'] });
    fireEvent.change(assignTo(), { target: { value: 's2' } });
    await save();

    expect(error).toHaveBeenCalledWith('Failed to assign staff:', expect.any(Error));
    expect(assignTo().value).toBe('s2');
  });

  it('stays quiet about a refused save in production', async () => {
    vi.stubEnv('DEV', false);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    onSave.mockRejectedValue(new Error('server said no'));
    renderModal({ taskIds: ['d'] });
    await save();

    expect(error).not.toHaveBeenCalled();
  });
});

describe('cancelling', () => {
  it('closes and forgets the picked staff', () => {
    renderModal({ taskIds: ['d'] });
    fireEvent.change(assignTo(), { target: { value: 's2' } });
    fireEvent.click(secondary());

    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
    expect(assignTo().value).toBe('');
  });

  it('restores the shared owner when it is reopened', () => {
    const { rerender } = renderModal({ taskIds: ['a'] });
    fireEvent.change(assignTo(), { target: { value: 's2' } });

    const props = {
      onClose,
      onSave,
      taskIds: ['a'],
      tasks,
      staffList,
    };
    rerender(<AssignCandidateModal isOpen={false} {...props} />);
    rerender(<AssignCandidateModal isOpen {...props} />);
    expect(assignTo().value).toBe('s1');
  });
});
