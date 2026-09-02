import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const spies = vi.hoisted(() => ({
  showToast: vi.fn(),
  updatePipelineItemActivity: vi.fn((arg) => ({ type: 'pipeline/move', payload: arg })),
  unwrap: vi.fn(),
}));

vi.mock('../Helper/ShowToast', () => ({ showToast: spies.showToast }));
vi.mock('../ReduxStore/features/PipelineSlice', () => ({
  updatePipelineItemActivity: (...a) => spies.updatePipelineItemActivity(...a),
}));

import MoveCandidateModal from '../Components/ReusableModal/MoveCandidateModal';

/**
 * The bulk "move these candidates to another stage" modal.
 *
 * Unusually it takes `dispatch` as a prop rather than pulling it from context,
 * so the board can hand it the same store binding it already holds. The column
 * list is defensive -- it may arrive as something other than an array -- and
 * the destination picker always excludes the column the candidates are already
 * in, which is how a board with a single stage ends up with nothing to offer.
 *
 * The thunk's own `.unwrap()` result is inspected for `data.status === "ok"`,
 * so a shape the API changed underneath surfaces as a move failure rather than
 * a silent success.
 */

const onClose = vi.fn();
const onSave = vi.fn();
const dispatch = vi.fn();

const columns = [
  { id: 'c1', title: 'Discovery' },
  { id: 'c2', title: 'Negotiation' },
];

const renderModal = (props = {}) =>
  render(
    <MoveCandidateModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      columns={columns}
      currentColumnId="c1"
      taskIds={['t1', 't2']}
      accessToken="at"
      refreshToken="rt"
      dispatch={dispatch}
      {...props}
    />
  );

const primary = () => document.body.querySelector('.primary-button');
const secondary = () => document.body.querySelector('.secondary-button');
const selects = () => [...document.body.querySelectorAll('.modal-content-wrapper select')];
const moveTo = () => selects()[1];

const save = async () => {
  await act(async () => {
    fireEvent.click(primary());
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  spies.unwrap.mockResolvedValue({ data: { status: 'ok' } });
  dispatch.mockImplementation(() => ({ unwrap: spies.unwrap }));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('opening the modal', () => {
  it('renders nothing while closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText(/Candidate\(s\)/)).not.toBeInTheDocument();
  });

  it('counts the candidates it was handed in the title', () => {
    renderModal();
    expect(screen.getByText('Move 2 Candidate(s)')).toBeInTheDocument();
  });

  it('assumes a single candidate when given no ids', () => {
    renderModal({ taskIds: undefined });
    expect(screen.getByText('Move 1 Candidate(s)')).toBeInTheDocument();
  });

  it('shows the column the candidates are leaving, locked', () => {
    renderModal();
    expect(selects()[0]).toHaveValue('c1');
    expect(selects()[0]).toBeDisabled();
    expect(screen.getByText('Discovery')).toBeInTheDocument();
  });

  it('labels an unrecognised source column as unknown', () => {
    renderModal({ currentColumnId: 'gone' });
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('offers every column but the one they are in', () => {
    renderModal();
    const offered = [...moveTo().options].map((o) => o.value);
    expect(offered).toEqual(['', 'c2']);
  });

  it('hints at pipeline settings when there is nowhere to move to', () => {
    renderModal({ columns: [{ id: 'c1', title: 'Discovery' }] });
    expect(
      screen.getByText('No other stages found. Create one in Settings → Pipeline Stages.')
    ).toBeInTheDocument();
  });

  it('survives a column list that is not a list', () => {
    // The board passes whatever the store holds, which is `null` before the
    // first fetch resolves.
    renderModal({ columns: null });
    expect(screen.getByText('Move 2 Candidate(s)')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});

describe('moving', () => {
  it('does nothing until a destination is picked', async () => {
    renderModal();
    await save();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('sends the ids, the destination and the credentials', async () => {
    renderModal();
    fireEvent.change(moveTo(), { target: { value: 'c2' } });
    await save();
    expect(spies.updatePipelineItemActivity).toHaveBeenCalledWith({
      ids: ['t1', 't2'],
      pipelineStageId: 'c2',
      accessToken: 'at',
      refreshToken: 'rt',
    });
  });

  it('tells the board and reports how many moved', async () => {
    renderModal();
    fireEvent.change(moveTo(), { target: { value: 'c2' } });
    await save();
    expect(onSave).toHaveBeenCalledWith('c2');
    expect(spies.showToast).toHaveBeenCalledWith(
      'Moved 2 candidate(s) successfully!',
      'success'
    );
  });

  it('reports the server message when the move is refused', async () => {
    spies.unwrap.mockResolvedValue({ data: { status: 'error' }, message: 'Stage is full' });
    renderModal();
    fireEvent.change(moveTo(), { target: { value: 'c2' } });
    await save();
    expect(spies.showToast).toHaveBeenCalledWith('Stage is full', 'error');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('falls back to its own wording when the refusal says nothing', async () => {
    spies.unwrap.mockResolvedValue({ data: { status: 'error' } });
    renderModal();
    fireEvent.change(moveTo(), { target: { value: 'c2' } });
    await save();
    expect(spies.showToast).toHaveBeenCalledWith('Failed to move candidates', 'error');
  });

  it('reports a rejected thunk', async () => {
    spies.unwrap.mockRejectedValue(new Error('network down'));
    renderModal();
    fireEvent.change(moveTo(), { target: { value: 'c2' } });
    await save();
    expect(spies.showToast).toHaveBeenCalledWith('network down', 'error');
  });

  it('falls back to its own wording for an error carrying no message', async () => {
    spies.unwrap.mockRejectedValue({});
    renderModal();
    fireEvent.change(moveTo(), { target: { value: 'c2' } });
    await save();
    expect(spies.showToast).toHaveBeenCalledWith('Failed to move candidate(s).', 'error');
  });

  it('stays quiet about failures outside development', async () => {
    vi.stubEnv('DEV', false);
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    spies.unwrap.mockRejectedValue(new Error('network down'));
    renderModal();
    fireEvent.change(moveTo(), { target: { value: 'c2' } });
    await save();
    expect(logged).not.toHaveBeenCalled();
    expect(spies.showToast).toHaveBeenCalledWith('network down', 'error');
  });

  it('locks the save button while the move is in flight', async () => {
    let release;
    spies.unwrap.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    renderModal();
    fireEvent.change(moveTo(), { target: { value: 'c2' } });
    await act(async () => {
      fireEvent.click(primary());
    });
    expect(primary()).toBeDisabled();
    await act(async () => {
      release({ data: { status: 'ok' } });
    });
    expect(onSave).toHaveBeenCalled();
  });
});

describe('cancelling', () => {
  it('forgets the destination and closes', () => {
    renderModal();
    fireEvent.change(moveTo(), { target: { value: 'c2' } });
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(moveTo()).toHaveValue('');
  });

  it('forgets the destination when closed by Escape too', () => {
    renderModal();
    fireEvent.change(moveTo(), { target: { value: 'c2' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
    expect(moveTo()).toHaveValue('');
  });
});
