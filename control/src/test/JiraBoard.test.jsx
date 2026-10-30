import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

/**
 * The prospect pipeline board: it loads the pipeline, its stages and every
 * stage's candidates, then owns all of the mutations the columns and cards
 * delegate upwards -- drag, move, assign, edit, delete, and stage creation.
 *
 * PipelineSlice is replaced with tagged action creators, so a dispatched thunk
 * arrives at the mocked dispatch as `{ type, payload }`. That makes it possible
 * both to assert which thunk ran and to fail exactly one of them: `responses`
 * maps a thunk name to the value (or promise) its `.unwrap()` should produce.
 * Redux state is a plain object the tests write directly, because the mocked
 * dispatch never reaches a reducer -- the board's own optimistic `localTasks`
 * is the state that actually moves during a test.
 *
 * `DndContext` is a probe that captures `onDragStart`/`onDragEnd`: jsdom has no
 * pointer geometry, so drags are performed by handing the board the same event
 * shape dnd-kit would. `Board` is likewise a probe that records the callbacks
 * it is given, since every mutation on this page arrives through one of them.
 */

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  dispatch: vi.fn(),
  unwrap: vi.fn(),
  state: {},
  responses: {},
  board: null,
  dnd: null,
  api: {
    getAllAdmins: vi.fn(),
    GetPipelineStage: vi.fn(),
    GetCustomTasks: vi.fn(),
    ReorderPipelineStage: vi.fn(),
    UpdatePipelineItemActivity: vi.fn(),
  },
  showToast: vi.fn(),
  showApiError: vi.fn(),
  moveTarget: 's2',
  // The stage modal's payload varies: the page trims and defaults every field.
  stagePayload: null,
}));

// Every slice export the board uses becomes an action creator tagged with its
// own name, so the mocked dispatch can tell the calls apart.
vi.mock('../ReduxStore/features/PipelineSlice', () => {
  const module = {};
  for (const name of [
    'addColumn',
    'updateColumnTaskIds',
    'addTaskToColumn',
    'removeTaskFromColumn',
    'updateColumnOrder',
    'deleteColumn',
    'fetchPipelineByModule',
    'fetchPipelineItems',
    'createPipelineStage',
    'updatePipelineItemActivity',
    'deletePipelineStage',
    'deletePipelineItem',
    'updateCandidate',
    'reassignCandidateToStaff',
    'setColumns',
    'fetchSinglePipelineItem',
  ]) {
    module[name] = (payload) => ({ type: name, payload });
  }
  return module;
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock('react-redux', () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) => selector(mocks.state),
}));

vi.mock('../api/TenantApis', () => ({ default: mocks.api }));
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => mocks.showToast(...a),
  showApiError: (...a) => mocks.showApiError(...a),
}));

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual('@dnd-kit/core');
  return {
    ...actual,
    DndContext: (props) => {
      mocks.dnd = props;
      return <div data-testid="dnd-context">{props.children}</div>;
    },
    DragOverlay: (props) => <div data-testid="drag-overlay">{props.children}</div>,
  };
});

vi.mock('../Components/JiraBoard/Board', () => ({
  default: (props) => {
    mocks.board = props;
    return (
      <div data-testid="board">
        <span data-testid="board-columns">{props.data.columnOrder.join('|')}</span>
        <span data-testid="board-tasks">
          {Object.keys(props.data.tasks)
            .map((id) => `${id}:${props.data.tasks[id].company}:${props.data.tasks[id].progress}`)
            .join('|')}
        </span>
        <span data-testid="board-staff">{props.staffList.map((s) => s.name).join('|')}</span>
        <span data-testid="board-stages">{props.stages.map((s) => s.name).join('|')}</span>
      </div>
    );
  },
}));

vi.mock('../Components/JiraBoard/Task', () => ({
  default: (props) => <div data-testid="overlay-task">{props.task.company}</div>,
}));

vi.mock('../Components/JiraBoard/Column', () => ({
  default: (props) => <div data-testid="overlay-column">{props.column.title}</div>,
}));

vi.mock('../Components/JiraBoard/EmptyState', () => ({
  default: (props) => (
    <button
      data-testid="empty-state"
      onClick={() => Promise.resolve(props.onAddFirstStage({ name: 'First' })).catch(() => {})}
    >
      add first stage
    </button>
  ),
}));

vi.mock('../Components/ErrorFallback', () => ({
  default: (props) => (
    <div data-testid="error-fallback">
      <span>{props.message}</span>
      <button data-testid="error-retry" onClick={props.onRetry}>
        retry
      </button>
    </div>
  ),
}));

vi.mock('../Components/ReusableModal/NewPipelineColumnModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="new-column-modal">
        <button
          data-testid="new-column-save"
          onClick={() =>
            Promise.resolve(props.onSave(mocks.stagePayload)).catch(() => {})
          }
        >
          save
        </button>
        <button data-testid="new-column-close" onClick={props.onClose}>
          close
        </button>
      </div>
    ) : null,
}));

vi.mock('../Components/ReusableModal/AddProspectModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="add-prospect-modal">
        <button
          data-testid="add-prospect-save"
          onClick={() =>
            props.onSave({ id: 'new-1', company: 'Zeta Care', pipelineStageId: 's1' })
          }
        >
          save
        </button>
      </div>
    ) : null,
}));

vi.mock('../Components/ReusableModal/MoveCandidateModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="move-modal">
        <span data-testid="move-modal-current">{props.currentColumnId}</span>
        <span data-testid="move-modal-tasks">{props.taskIds.join('|')}</span>
        <button data-testid="move-modal-save" onClick={() => props.onSave(mocks.moveTarget)}>
          save
        </button>
        <button data-testid="move-modal-close" onClick={props.onClose}>
          close
        </button>
      </div>
    ) : null,
}));

vi.mock('../Components/ReusableModal/AssignCandidateModal', () => ({
  default: (props) =>
    props.isOpen ? (
      <div data-testid="assign-modal">
        <span data-testid="assign-modal-tasks">{props.taskIds.join('|')}</span>
        <button data-testid="assign-modal-save" onClick={() => props.onSave('adm-1')}>
          save
        </button>
      </div>
    ) : null,
}));

vi.mock('../Components/ReusableModal/DeleteConfirmationModal', () => ({
  default: (props) => {
    if (!props.isOpen) return null;
    const kind =
      typeof props.title !== 'string'
        ? 'error'
        : props.title.includes('column')
        ? 'column'
        : 'candidate';
    return (
      <div data-testid={`delete-${kind}-modal`}>
        <span data-testid={`delete-${kind}-title`}>
          {typeof props.title === 'string' ? props.title : 'blocked'}
        </span>
        {props.onConfirm && (
          <button data-testid={`delete-${kind}-confirm`} onClick={props.onConfirm}>
            confirm
          </button>
        )}
        <button data-testid={`delete-${kind}-close`} onClick={props.onClose}>
          close
        </button>
      </div>
    );
  },
}));

import JiraBoard from '../Components/JiraBoard/JiraBoard';

// Two real stages plus one the API returned without an id, which the board
// must drop rather than key a column on `undefined`.
const stagePayload = [
  {
    id: 's1',
    name: 'Prospecting',
    colourCode: '#111111',
    requiredTasks: [{ name: 'Intro call' }],
    requiredDocuments: [{ name: 'Signed MSA' }],
  },
  { id: 's2' },
  { name: 'Ghost stage' },
];

const columnsFixture = () => ({
  s1: {
    id: 's1',
    title: 'Prospecting',
    taskIds: ['t1', 't2'],
    requiredTasks: [{ name: 'Intro call' }],
    requiredDocuments: [{ name: 'Signed MSA' }],
    colorCode: '#111111',
  },
  s2: {
    id: 's2',
    title: 'Unnamed Stage',
    taskIds: ['t3'],
    requiredTasks: [],
    requiredDocuments: [],
    colorCode: '#000000',
  },
  s3: { id: 's3', title: 'Closed', taskIds: [] },
});

const buildState = (over = {}) => ({
  authentication: {
    isAuthenticated: true,
    loading: false,
    error: null,
    accessToken: over.accessToken === undefined ? 'token' : over.accessToken,
    refreshToken: over.refreshToken === undefined ? 'refresh' : over.refreshToken,
    user: { id: 'u1', role: null },
  },
  pipeline: {
    pipeline: 'pipeline' in over ? over.pipeline : { id: 'p1', name: 'Onboarding', description: 'Intake' },
    columns: over.columns ?? columnsFixture(),
    columnOrder: over.columnOrder ?? ['s1', 's2'],
    status: over.status ?? 'succeeded',
    error: over.error ?? null,
    pipelineItem: over.pipelineItem ?? null,
  },
});

const renderBoard = async (over = {}) => {
  mocks.state = buildState(over);
  const view = render(<JiraBoard />);
  await act(async () => {});
  return view;
};

const dispatched = (type) =>
  mocks.dispatch.mock.calls.map(([a]) => a).filter((a) => a && a.type === type);

// dnd-kit hands the board an `active`/`over` pair; nothing else on the event is
// read, so the tests build only that much.
const dragEnd = (activeId, overId, type) =>
  act(async () => {
    await mocks.dnd.onDragEnd({
      active: { id: activeId, data: { current: type ? { type } : {} } },
      over: overId === null ? null : { id: overId },
    });
  });

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.board = null;
  mocks.dnd = null;
  mocks.responses = {};
  mocks.moveTarget = 's2';
  mocks.stagePayload = { name: ' Screening ', description: ' desc ', colorCode: '#abcdef' };
  mocks.dispatch.mockImplementation((action) => ({ unwrap: () => mocks.unwrap(action) }));
  mocks.unwrap.mockImplementation((action) => {
    const configured = mocks.responses[action.type];
    if (typeof configured === 'function') return configured(action);
    if (configured !== undefined) return Promise.resolve(configured);
    switch (action.type) {
      case 'fetchPipelineByModule':
        return Promise.resolve({ data: [{ id: 'p1' }] });
      case 'fetchPipelineItems':
        return Promise.resolve({ items: [] });
      case 'fetchSinglePipelineItem':
        return Promise.resolve({ data: {} });
      default:
        return Promise.resolve({ status: 'ok' });
    }
  });
  mocks.api.getAllAdmins.mockResolvedValue({
    data: { data: [{ id: 'adm-1', firstName: 'Ada', lastName: 'Lovelace', active: true }] },
  });
  mocks.api.GetPipelineStage.mockResolvedValue({ data: { data: stagePayload } });
  mocks.api.GetCustomTasks.mockResolvedValue({ data: [] });
  mocks.api.ReorderPipelineStage.mockResolvedValue({});
  mocks.api.UpdatePipelineItemActivity.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('page state', () => {
  it('shows a loader while the pipeline is loading', async () => {
    await renderBoard({ status: 'loading' });
    expect(document.body.querySelector('.section-loader')).toBeInTheDocument();
    expect(screen.queryByTestId('board')).toBeNull();
  });

  it('shows the error fallback when the pipeline load failed', async () => {
    await renderBoard({ status: 'failed', error: 'nope' });
    expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
    expect(
      screen.getByText('Something went wrong loading the pipeline. Please try again.')
    ).toBeInTheDocument();
  });

  it('refetches from the error fallback', async () => {
    await renderBoard({ status: 'failed' });
    mocks.api.getAllAdmins.mockClear();
    await act(async () => {
      fireEvent.click(screen.getByTestId('error-retry'));
    });
    expect(mocks.api.getAllAdmins).toHaveBeenCalled();
  });

  it('shows the pipeline name and description', async () => {
    await renderBoard();
    expect(screen.getByText('Onboarding')).toBeInTheDocument();
    expect(screen.getByText('Intake')).toBeInTheDocument();
  });

  it('falls back to generic board copy with no pipeline', async () => {
    await renderBoard({ pipeline: null });
    expect(screen.getByText('Client Onboarding')).toBeInTheDocument();
    expect(screen.getByText('Manage your client intake process seamlessly')).toBeInTheDocument();
  });

  it('offers the empty state instead of the board when there are no columns', async () => {
    await renderBoard({ columns: {}, columnOrder: [] });
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('board')).toBeNull();
    expect(screen.queryByText('Add new candidate')).toBeNull();
  });
});

describe('the initial load', () => {
  it('builds one column per stage that has an id', async () => {
    await renderBoard();
    const setCalls = dispatched('setColumns');
    const built = setCalls.at(-1).payload;
    expect(Object.keys(built)).toEqual(['s1', 's2']);
    expect(dispatched('updateColumnOrder').at(-1).payload).toEqual(['s1', 's2']);
  });

  it('fills in a stage name and colour the API left out', async () => {
    await renderBoard();
    const built = dispatched('setColumns').at(-1).payload;
    expect(built.s2.title).toBe('Unnamed Stage');
    expect(built.s2.colorCode).toBe('#000000');
    expect(built.s1.colorCode).toBe('#111111');
  });

  it('does nothing at all without both auth tokens', async () => {
    await renderBoard({ accessToken: null });
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it('warns when the module has no pipeline', async () => {
    mocks.responses.fetchPipelineByModule = { data: [] };
    await renderBoard();
    expect(mocks.showToast).toHaveBeenCalledWith('No pipeline found.', 'warning');
    expect(mocks.api.getAllAdmins).not.toHaveBeenCalled();
  });

  it('stops after the stage request when there are no stages', async () => {
    mocks.api.GetPipelineStage.mockResolvedValue({ data: { data: [] } });
    await renderBoard();
    expect(dispatched('fetchPipelineItems')).toHaveLength(0);
  });

  it('names an admin who has neither first nor last name', async () => {
    mocks.api.getAllAdmins.mockResolvedValue({ data: { data: [{ id: 'adm-2' }] } });
    await renderBoard();
    expect(screen.getByTestId('board-staff')).toHaveTextContent('Unknown Admin');
  });

  it('survives an admin request that fails', async () => {
    mocks.api.getAllAdmins.mockRejectedValue(new Error('x'));
    await renderBoard();
    expect(screen.getByTestId('board-staff')).toHaveTextContent('');
  });

  it('counts done tasks, sent documents and completed custom tasks as progress', async () => {
    mocks.responses.fetchPipelineItems = (action) =>
      Promise.resolve({
        items:
          action.payload.stageId === 's1' ? [{ id: 'item-1', companyName: 'Acme Health' }] : [],
      });
    mocks.responses.fetchSinglePipelineItem = () =>
      Promise.resolve({
        data: { doneTasks: { a: true, b: false }, sentDocuments: { c: true } },
      });
    mocks.api.GetCustomTasks.mockResolvedValue({
      data: [{ id: 'ct1', isCompleted: true }, { id: 'ct2', isCompleted: false }],
    });
    await renderBoard();
    // s1 has one required task and one required document, plus two custom
    // tasks; three of those four are done.
    expect(screen.getByTestId('board-tasks')).toHaveTextContent('item-1:Acme Health:3/4');
  });

  it('still adds a card when the item detail request fails', async () => {
    mocks.responses.fetchPipelineItems = (action) =>
      Promise.resolve({
        items:
          action.payload.stageId === 's1' ? [{ id: 'item-1', companyName: 'Acme Health' }] : [],
      });
    mocks.responses.fetchSinglePipelineItem = () => Promise.reject(new Error('x'));
    await renderBoard();
    expect(screen.getByTestId('board-tasks')).toHaveTextContent('item-1:Acme Health:0/2');
  });

  it('tolerates a custom-task request that fails', async () => {
    mocks.responses.fetchPipelineItems = (action) =>
      Promise.resolve({
        items:
          action.payload.stageId === 's1' ? [{ id: 'item-1', companyName: 'Acme Health' }] : [],
      });
    mocks.api.GetCustomTasks.mockRejectedValue(new Error('x'));
    await renderBoard();
    expect(screen.getByTestId('board-tasks')).toHaveTextContent('item-1:Acme Health:0/2');
  });

  it('names a candidate after a slice of its id when the record has no company', async () => {
    mocks.responses.fetchPipelineItems = () =>
      Promise.resolve({ items: [{ id: 'abcdefghijkl' }] });
    await renderBoard();
    expect(screen.getByTestId('board-tasks')).toHaveTextContent('abcdefghijkl:Candidate abcdefgh');
  });

  it('skips an item whose id is not a string', async () => {
    mocks.responses.fetchPipelineItems = () =>
      Promise.resolve({ items: [{ id: 42 }, { companyName: 'No id' }] });
    await renderBoard();
    expect(screen.getByTestId('board-tasks')).toHaveTextContent('');
  });

  it('leaves a column empty when its item request fails', async () => {
    mocks.responses.fetchPipelineItems = () => Promise.reject(new Error('x'));
    await renderBoard();
    expect(screen.getByTestId('board-tasks')).toHaveTextContent('');
  });

  it('ignores an item response that carries no list', async () => {
    mocks.responses.fetchPipelineItems = () => Promise.resolve({});
    await renderBoard();
    expect(screen.getByTestId('board-tasks')).toHaveTextContent('');
  });
});

describe('selection, timeouts and column hygiene', () => {
  it('adds and then removes a card from the selection', async () => {
    await renderBoard();
    act(() => {
      mocks.board.toggleTaskSelection('t1');
    });
    expect(mocks.board.selectedTaskIds).toEqual(['t1']);
    act(() => {
      mocks.board.toggleTaskSelection('t1');
    });
    expect(mocks.board.selectedTaskIds).toEqual([]);
  });

  it('gives up on an operation that never finishes', async () => {
    vi.useFakeTimers();
    try {
      mocks.responses.fetchPipelineByModule = () => new Promise(() => {});
      mocks.state = buildState();
      render(<JiraBoard />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });
      expect(mocks.showToast).toHaveBeenCalledWith(
        'Operation timed out. Please try again.',
        'error'
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('strips a card id that is not a string from its column', async () => {
    await renderBoard({
      columns: {
        s1: { id: 's1', title: 'Prospecting', taskIds: ['t1', null] },
        s2: { id: 's2', title: 'Negotiation' },
      },
    });
    expect(dispatched('updateColumnTaskIds').at(-1).payload).toEqual({
      columnId: 's1',
      taskIds: ['t1'],
    });
  });

  // The item arrives only after the first load, because that load ends by
  // replacing localTasks wholesale and would otherwise discard the card.
  const withLateItem = async (pipelineItem) => {
    const { rerender } = await renderBoard();
    mocks.state = buildState({ pipelineItem });
    await act(async () => {
      rerender(<JiraBoard />);
    });
  };

  it('recomputes the progress of a card whose item lands in Redux', async () => {
    await withLateItem({ id: 't9', pipelineStageId: 's3' });
    expect(screen.getByTestId('board-tasks')).toHaveTextContent('t9:');
    expect(screen.getByTestId('board-tasks')).toHaveTextContent('0/0');
  });

  it('ignores an item whose stage is not on the board', async () => {
    await withLateItem({ id: 't9', pipelineStageId: 'gone' });
    expect(screen.getByTestId('board-tasks')).toHaveTextContent('');
  });
});

describe('dragging a column', () => {
  it('reorders the columns and persists the new position', async () => {
    await renderBoard();
    await dragEnd('s1', 's2', 'Column');
    expect(dispatched('updateColumnOrder').at(-1).payload).toEqual(['s2', 's1']);
    expect(mocks.api.ReorderPipelineStage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 's1', order: 2 })
    );
  });

  it('does nothing when a column is dropped on itself', async () => {
    await renderBoard();
    const before = dispatched('updateColumnOrder').length;
    await dragEnd('s1', 's1', 'Column');
    expect(dispatched('updateColumnOrder')).toHaveLength(before);
    expect(mocks.api.ReorderPipelineStage).not.toHaveBeenCalled();
  });

  it('warns when the new order cannot be saved', async () => {
    mocks.api.ReorderPipelineStage.mockRejectedValue(new Error('x'));
    await renderBoard();
    await dragEnd('s1', 's2', 'Column');
    expect(mocks.showToast).toHaveBeenCalledWith('Failed to update column order.', 'error');
  });

  it('ignores a drag that ends outside any droppable', async () => {
    await renderBoard();
    const before = mocks.dispatch.mock.calls.length;
    await dragEnd('s1', null, 'Column');
    expect(mocks.dispatch.mock.calls).toHaveLength(before);
  });

  it('previews the dragged column in the overlay', async () => {
    await renderBoard();
    await act(async () => {
      mocks.dnd.onDragStart({ active: { id: 's1', data: { current: { type: 'Column' } } } });
    });
    expect(screen.getByTestId('overlay-column')).toHaveTextContent('Prospecting');
  });
});

describe('dragging a card', () => {
  // Both cards of s1 and the single card of s2 need to exist locally, since
  // the board refuses to move a card it has no record of.
  const withCards = async () => {
    mocks.responses.fetchPipelineItems = (action) =>
      Promise.resolve({
        items:
          action.payload.stageId === 's1'
            ? [{ id: 't1', companyName: 'Acme' }, { id: 't2', companyName: 'Beta' }]
            : [{ id: 't3', companyName: 'Gamma' }],
      });
    return renderBoard();
  };

  it('reorders within a column and persists the stage', async () => {
    await withCards();
    await dragEnd('t1', 't2');
    expect(dispatched('updateColumnTaskIds').at(-1).payload).toEqual({
      columnId: 's1',
      taskIds: ['t2', 't1'],
    });
    expect(mocks.api.UpdatePipelineItemActivity).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ['t1'], pipelineStageId: 's1' })
    );
  });

  it('does nothing when a card is dropped on itself', async () => {
    await withCards();
    await dragEnd('t1', 't1');
    expect(mocks.api.UpdatePipelineItemActivity).not.toHaveBeenCalled();
  });

  it('warns when the new order cannot be saved', async () => {
    mocks.api.UpdatePipelineItemActivity.mockRejectedValue(new Error('x'));
    await withCards();
    await dragEnd('t1', 't2');
    expect(mocks.showToast).toHaveBeenCalledWith('Failed to update task order.', 'error');
  });

  it('moves a card onto another column and resets its progress', async () => {
    await withCards();
    await dragEnd('t1', 's2');
    const updates = dispatched('updateColumnTaskIds').slice(-2).map((a) => a.payload);
    expect(updates).toEqual([
      { columnId: 's1', taskIds: ['t2'] },
      { columnId: 's2', taskIds: ['t3', 't1'] },
    ]);
    expect(screen.getByTestId('board-tasks')).toHaveTextContent('t1:Acme:0/0');
  });

  it('drops a card next to the card it was released over', async () => {
    await withCards();
    await dragEnd('t1', 't3');
    expect(dispatched('updateColumnTaskIds').at(-1).payload).toEqual({
      columnId: 's2',
      taskIds: ['t1', 't3'],
    });
  });

  it('warns when the move cannot be saved', async () => {
    mocks.api.UpdatePipelineItemActivity.mockRejectedValue(new Error('x'));
    await withCards();
    await dragEnd('t1', 's2');
    expect(mocks.showToast).toHaveBeenCalledWith('Failed to move task.', 'error');
  });

  it('ignores a card that belongs to no column', async () => {
    await withCards();
    const before = mocks.api.UpdatePipelineItemActivity.mock.calls.length;
    await dragEnd('unknown', 't2');
    expect(mocks.api.UpdatePipelineItemActivity.mock.calls).toHaveLength(before);
  });

  it('ignores a card the board has no local record of', async () => {
    await renderBoard();
    await dragEnd('t1', 't2');
    expect(mocks.api.UpdatePipelineItemActivity).not.toHaveBeenCalled();
  });

  it('previews the dragged card in the overlay', async () => {
    await withCards();
    await act(async () => {
      mocks.dnd.onDragStart({ active: { id: 't1', data: { current: {} } } });
    });
    expect(screen.getByTestId('overlay-task')).toHaveTextContent('Acme');
  });
});

describe('adding a candidate', () => {
  it('adds the card and refetches the board', async () => {
    await renderBoard();
    fireEvent.click(screen.getByText('Add new candidate'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('add-prospect-save'));
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Candidate added successfully!', 'success');
    expect(dispatched('addTaskToColumn').at(-1).payload).toEqual({
      columnId: 's1',
      taskId: 'new-1',
    });
  });

  it('refuses a prospect aimed at a column that does not exist', async () => {
    await renderBoard();
    await act(async () => {
      mocks.board.onAddTask('nope', { id: 'new-1' });
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Invalid column selected.', 'error');
  });

  it('refuses a prospect with no usable id', async () => {
    await renderBoard();
    await act(async () => {
      mocks.board.onAddTask('s1', { id: 42 });
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Invalid prospect ID.', 'error');
  });

  // The optimistic card the handler writes is never observable: adding one
  // immediately calls fetchPipelineData, which clears localTasks and puts the
  // page behind its loader, so only the dispatch and the toast can be asserted.
  it('closes the prospect modal after adding', async () => {
    await renderBoard();
    fireEvent.click(screen.getByText('Add new candidate'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('add-prospect-save'));
    });
    expect(screen.queryByTestId('add-prospect-modal')).toBeNull();
  });
});

describe('deleting candidates', () => {
  it('confirms, deletes and drops the card', async () => {
    await renderBoard();
    await act(async () => {
      mocks.board.onRemoveTask('t1');
    });
    expect(screen.getByTestId('delete-candidate-title')).toHaveTextContent('delete 1 candidate(s)');
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-candidate-confirm'));
    });
    expect(dispatched('removeTaskFromColumn').at(-1).payload).toEqual({
      columnId: 's1',
      taskId: 't1',
    });
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Deleted 1 candidate(s) successfully!',
      'success'
    );
  });

  it('opens the blocked-action modal when the delete is not acknowledged', async () => {
    mocks.responses.deletePipelineItem = { status: 'error' };
    await renderBoard();
    await act(async () => {
      mocks.board.onRemoveTask('t1');
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-candidate-confirm'));
    });
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'DELETE_CANDIDATE');
    expect(screen.getByTestId('delete-error-modal')).toBeInTheDocument();
  });

  it('surfaces a rejected delete', async () => {
    mocks.responses.deletePipelineItem = () => Promise.reject(new Error('boom'));
    await renderBoard();
    await act(async () => {
      mocks.board.onRemoveTask('t1');
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-candidate-confirm'));
    });
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'DELETE_CANDIDATE');
  });

  it('closes the blocked-action modal again', async () => {
    mocks.responses.deletePipelineItem = () => Promise.reject(new Error('boom'));
    await renderBoard();
    await act(async () => {
      mocks.board.onRemoveTask('t1');
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-candidate-confirm'));
    });
    fireEvent.click(screen.getByTestId('delete-error-close'));
    expect(screen.queryByTestId('delete-error-modal')).toBeNull();
  });

  it('clears the selection when the confirmation is dismissed', async () => {
    await renderBoard();
    await act(async () => {
      mocks.board.onRemoveTask('t1');
    });
    fireEvent.click(screen.getByTestId('delete-candidate-close'));
    expect(screen.queryByTestId('delete-candidate-modal')).toBeNull();
  });
});

describe('deleting a column', () => {
  const openColumnDelete = async (columnId, over = {}) => {
    await renderBoard(over);
    await act(async () => {
      mocks.board.onDeleteColumn(columnId);
    });
  };

  it('refuses to delete the first column while it still holds candidates', async () => {
    await openColumnDelete('s1');
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-column-confirm'));
    });
    expect(screen.getByTestId('delete-error-modal')).toBeInTheDocument();
    expect(dispatched('deletePipelineStage')).toHaveLength(0);
  });

  it('moves the candidates to the first column before deleting a later one', async () => {
    await openColumnDelete('s2');
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-column-confirm'));
    });
    expect(dispatched('updatePipelineItemActivity').at(-1).payload).toEqual(
      expect.objectContaining({ ids: ['t3'], pipelineStageId: 's1' })
    );
    expect(dispatched('updateColumnTaskIds').at(-1).payload).toEqual({
      columnId: 's1',
      taskIds: ['t1', 't2', 't3'],
    });
    expect(dispatched('deleteColumn').at(-1).payload).toBe('s2');
    expect(mocks.showToast).toHaveBeenCalledWith('Column deleted successfully!', 'success');
  });

  it('deletes an empty column outright', async () => {
    const columns = columnsFixture();
    columns.s2.taskIds = [];
    await openColumnDelete('s2', { columns });
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-column-confirm'));
    });
    expect(dispatched('updatePipelineItemActivity')).toHaveLength(0);
    expect(dispatched('deleteColumn').at(-1).payload).toBe('s2');
  });

  it('deletes an empty first column outright', async () => {
    const columns = columnsFixture();
    columns.s1.taskIds = [];
    await openColumnDelete('s1', { columns });
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-column-confirm'));
    });
    expect(dispatched('deleteColumn').at(-1).payload).toBe('s1');
  });

  it('keeps the confirmation open and reports a rejected delete', async () => {
    mocks.responses.deletePipelineStage = () => Promise.reject(new Error('x'));
    const columns = columnsFixture();
    columns.s2.taskIds = [];
    await openColumnDelete('s2', { columns });
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-column-confirm'));
    });
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'DELETE_COLUMN');
    expect(screen.getByTestId('delete-column-modal')).toBeInTheDocument();
  });

  it('closes the confirmation again', async () => {
    await openColumnDelete('s2');
    fireEvent.click(screen.getByTestId('delete-column-close'));
    expect(screen.queryByTestId('delete-column-modal')).toBeNull();
  });
});

describe('editing a candidate name', () => {
  it('renames the card and saves it', async () => {
    mocks.responses.fetchPipelineItems = () =>
      Promise.resolve({ items: [{ id: 't1', companyName: 'Acme' }] });
    await renderBoard();
    await act(async () => {
      await mocks.board.onEditTask('t1', 'Acme Renamed');
    });
    expect(screen.getByTestId('board-tasks')).toHaveTextContent('t1:Acme Renamed');
    expect(mocks.showToast).toHaveBeenCalledWith('Candidate updated successfully!', 'success');
  });

  it('opens the blocked-action modal when the rename is not acknowledged', async () => {
    mocks.responses.updateCandidate = { status: 'error' };
    await renderBoard();
    await act(async () => {
      await mocks.board.onEditTask('t1', 'Acme Renamed');
    });
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'UPDATE_CANDIDATE');
    expect(screen.getByTestId('delete-error-modal')).toBeInTheDocument();
  });
});

describe('moving candidates through the modal', () => {
  const withCards = async () => {
    mocks.responses.fetchPipelineItems = (action) =>
      Promise.resolve({
        items: action.payload.stageId === 's1' ? [{ id: 't1', companyName: 'Acme' }] : [],
      });
    return renderBoard();
  };

  it('carries the card and its column into the modal', async () => {
    await withCards();
    await act(async () => {
      mocks.board.onMoveTask('t1', 's1');
    });
    expect(screen.getByTestId('move-modal-current')).toHaveTextContent('s1');
    expect(screen.getByTestId('move-modal-tasks')).toHaveTextContent('t1');
  });

  it('moves the card and reports how many moved', async () => {
    mocks.responses.fetchSinglePipelineItem = () =>
      Promise.resolve({ data: { doneTasks: { a: true }, sentDocuments: {} } });
    await withCards();
    await act(async () => {
      mocks.board.onMoveTask('t1', 's1');
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('move-modal-save'));
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Moved 1 candidate(s) successfully!', 'success');
    expect(dispatched('updatePipelineItemActivity').at(-1).payload).toEqual(
      expect.objectContaining({ ids: ['t1'], pipelineStageId: 's2' })
    );
  });

  it('recomputes the progress against the target column', async () => {
    mocks.responses.fetchSinglePipelineItem = () =>
      Promise.resolve({ data: { doneTasks: { a: true }, sentDocuments: { b: true } } });
    await withCards();
    await act(async () => {
      mocks.board.onMoveTask('t1', 's1');
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('move-modal-save'));
    });
    // s2 declares no requirements, so the moved card shows two of zero.
    expect(screen.getByTestId('board-tasks')).toHaveTextContent('t1:Acme:2/0');
  });

  it('treats a failed detail fetch as no progress', async () => {
    mocks.responses.fetchSinglePipelineItem = () => Promise.reject(new Error('x'));
    await withCards();
    await act(async () => {
      mocks.board.onMoveTask('t1', 's1');
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('move-modal-save'));
    });
    expect(screen.getByTestId('board-tasks')).toHaveTextContent('t1:Acme:0/0');
  });

  it('does nothing when the target is the column the card is already in', async () => {
    mocks.moveTarget = 's1';
    await withCards();
    await act(async () => {
      mocks.board.onMoveTask('t1', 's1');
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('move-modal-save'));
    });
    expect(dispatched('updatePipelineItemActivity')).toHaveLength(0);
  });

  it('does nothing for a card that belongs to no column', async () => {
    await withCards();
    await act(async () => {
      mocks.board.onMoveTask('ghost', 's1');
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('move-modal-save'));
    });
    expect(dispatched('updatePipelineItemActivity')).toHaveLength(0);
  });

  it('opens the blocked-action modal when the move is not acknowledged', async () => {
    mocks.responses.updatePipelineItemActivity = { status: 'error' };
    await withCards();
    await act(async () => {
      mocks.board.onMoveTask('t1', 's1');
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('move-modal-save'));
    });
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'MOVE_CANDIDATE');
    expect(screen.getByTestId('delete-error-modal')).toBeInTheDocument();
  });

  it('closes the move modal without moving anything', async () => {
    await withCards();
    await act(async () => {
      mocks.board.onMoveTask('t1', 's1');
    });
    fireEvent.click(screen.getByTestId('move-modal-close'));
    expect(screen.queryByTestId('move-modal')).toBeNull();
    expect(dispatched('updatePipelineItemActivity')).toHaveLength(0);
  });
});

describe('assigning staff', () => {
  it('assigns the selected candidates', async () => {
    await renderBoard();
    await act(async () => {
      mocks.board.onAssignStaff('t1');
    });
    expect(screen.getByTestId('assign-modal-tasks')).toHaveTextContent('t1');
    await act(async () => {
      fireEvent.click(screen.getByTestId('assign-modal-save'));
    });
    expect(dispatched('reassignCandidateToStaff').at(-1).payload).toEqual(
      expect.objectContaining({ ids: ['t1'], assignToAdmin: 'adm-1' })
    );
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Assigned 1 candidate(s) successfully!',
      'success'
    );
  });

  it('reports the failure message when the assignment is not acknowledged', async () => {
    mocks.responses.reassignCandidateToStaff = { status: 'error' };
    await renderBoard();
    await act(async () => {
      mocks.board.onAssignStaff('t1');
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('assign-modal-save'));
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Failed to assign staff.', 'error');
    expect(screen.getByTestId('delete-error-modal')).toBeInTheDocument();
  });

  it('falls back to a generic message when the rejection carries none', async () => {
    mocks.responses.reassignCandidateToStaff = () => Promise.reject({});
    await renderBoard();
    await act(async () => {
      mocks.board.onAssignStaff('t1');
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('assign-modal-save'));
    });
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Failed to assign staff to candidate(s).',
      'error'
    );
  });
});

describe('navigating to a candidate', () => {
  it('opens the candidate panel', async () => {
    await renderBoard();
    act(() => {
      mocks.board.onViewCandidate('s1', 't1');
    });
    expect(mocks.navigate).toHaveBeenCalledWith('/tenants/candidate-single/s1/t1');
  });

  it('opens the candidate panel in edit mode', async () => {
    await renderBoard();
    act(() => {
      mocks.board.onEditCandidate('s1', 't1');
    });
    expect(mocks.navigate).toHaveBeenCalledWith('/tenants/candidate-single/s1/t1/edit');
  });
});

describe('adding a stage', () => {
  it('creates the stage against the pipeline and reloads', async () => {
    await renderBoard();
    await act(async () => {
      mocks.board.onAddColumn(1);
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('new-column-save'));
    });
    expect(dispatched('createPipelineStage').at(-1).payload).toEqual(
      expect.objectContaining({
        pipelineId: 'p1',
        name: 'Screening',
        description: 'desc',
        colourCode: '#abcdef',
        requiredTasks: [],
        requiredDocuments: [],
      })
    );
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Pipeline stage created successfully!',
      'success'
    );
    expect(screen.queryByTestId('new-column-modal')).toBeNull();
  });

  it('reports a stage creation that is not acknowledged', async () => {
    mocks.responses.createPipelineStage = { status: 'error' };
    await renderBoard();
    await act(async () => {
      mocks.board.onAddColumn(0);
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('new-column-save'));
    });
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'CREATE_PIPELINE_STAGE');
    expect(screen.getByTestId('new-column-modal')).toBeInTheDocument();
  });

  it('adds the stage locally when there is no pipeline to attach it to', async () => {
    await renderBoard({ pipeline: null, columns: {}, columnOrder: [] });
    await act(async () => {
      fireEvent.click(screen.getByTestId('empty-state'));
    });
    expect(dispatched('addColumn').at(-1).payload).toEqual({
      pipelineData: { name: 'First' },
      index: null,
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Pipeline stage added locally!', 'success');
  });

  it('closes the stage modal again', async () => {
    await renderBoard();
    await act(async () => {
      mocks.board.onAddColumn(1);
    });
    fireEvent.click(screen.getByTestId('new-column-close'));
    expect(screen.queryByTestId('new-column-modal')).toBeNull();
  });
});

describe('inertness while a modal is open', () => {
  const container = () => document.body.querySelector('.jira-board-container');

  it('leaves the board interactive with no modal open', async () => {
    await renderBoard();
    expect(container().hasAttribute('inert')).toBe(false);
    expect(mocks.dnd.sensors.length).toBeGreaterThan(0);
  });

  it('makes the board inert and disarms the sensors while a modal is open', async () => {
    await renderBoard();
    fireEvent.click(screen.getByText('Add new candidate'));
    expect(container().hasAttribute('inert')).toBe(true);
    expect(mocks.dnd.sensors).toEqual([]);
  });
});

describe('logging in a production build', () => {
  // Every diagnostic on the board sits behind `import.meta.env.DEV`, which
  // Vitest leaves true. Stubbing it false is the only way to walk the arm the
  // deployed bundle takes, and the user-visible outcome must not shift.
  beforeEach(() => {
    vi.stubEnv('DEV', false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const silentAbout = (prefix) =>
    expect(console.error).not.toHaveBeenCalledWith(prefix, expect.anything());

  it('swallows a failed initial load', async () => {
    mocks.responses.fetchPipelineByModule = () => Promise.reject(new Error('x'));
    await renderBoard();
    expect(screen.getByTestId('board')).toBeInTheDocument();
    silentAbout('Fetch error:');
  });

  it('reports a failed pipeline without logging it', async () => {
    await renderBoard({ status: 'failed', error: 'nope' });
    expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
    silentAbout('Pipeline error:');
  });

  it('warns about an unsaved column order without logging it', async () => {
    mocks.api.ReorderPipelineStage.mockRejectedValue(new Error('x'));
    await renderBoard();
    await dragEnd('s1', 's2', 'Column');
    expect(mocks.showToast).toHaveBeenCalledWith('Failed to update column order.', 'error');
    silentAbout('Failed to reorder column:');
  });

  it('warns about an unsaved card order without logging it', async () => {
    mocks.responses.fetchPipelineItems = (action) =>
      Promise.resolve({
        items:
          action.payload.stageId === 's1'
            ? [{ id: 't1', companyName: 'Acme' }, { id: 't2', companyName: 'Beta' }]
            : [],
      });
    mocks.api.UpdatePipelineItemActivity.mockRejectedValue(new Error('x'));
    await renderBoard();
    await dragEnd('t1', 't2');
    expect(mocks.showToast).toHaveBeenCalledWith('Failed to update task order.', 'error');
    silentAbout('Failed to update task order:');
  });

  it('warns about an unsaved card move without logging it', async () => {
    mocks.responses.fetchPipelineItems = (action) =>
      Promise.resolve({
        items: action.payload.stageId === 's1' ? [{ id: 't1', companyName: 'Acme' }] : [],
      });
    mocks.api.UpdatePipelineItemActivity.mockRejectedValue(new Error('x'));
    await renderBoard();
    await dragEnd('t1', 's2');
    expect(mocks.showToast).toHaveBeenCalledWith('Failed to move task.', 'error');
    silentAbout('Failed to move task:');
  });

  it('refuses an unknown column without logging it', async () => {
    await renderBoard();
    await act(async () => {
      mocks.board.onAddTask('nope', { id: 'new-1' });
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Invalid column selected.', 'error');
    silentAbout('Invalid columnId:');
  });

  it('refuses an unusable prospect id without logging it', async () => {
    await renderBoard();
    await act(async () => {
      mocks.board.onAddTask('s1', { id: 42 });
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Invalid prospect ID.', 'error');
    silentAbout('Invalid prospectData.id:');
  });

  it('surfaces a failed candidate delete without logging it', async () => {
    mocks.responses.deletePipelineItem = () => Promise.reject(new Error('boom'));
    await renderBoard();
    await act(async () => {
      mocks.board.onRemoveTask('t1');
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-candidate-confirm'));
    });
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'DELETE_CANDIDATE');
    silentAbout('Candidate deletion failed:');
  });

  it('surfaces a failed column delete without logging it', async () => {
    mocks.responses.deletePipelineStage = () => Promise.reject(new Error('x'));
    const columns = columnsFixture();
    columns.s2.taskIds = [];
    await renderBoard({ columns });
    await act(async () => {
      mocks.board.onDeleteColumn('s2');
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-column-confirm'));
    });
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'DELETE_COLUMN');
    silentAbout('Column deletion failed:');
  });

  it('surfaces a failed rename without logging it', async () => {
    mocks.responses.updateCandidate = { status: 'error' };
    await renderBoard();
    await act(async () => {
      await mocks.board.onEditTask('t1', 'Acme Renamed');
    });
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'UPDATE_CANDIDATE');
    silentAbout('Candidate update failed:');
  });

  it('moves a card past a failed detail fetch without logging it', async () => {
    mocks.responses.fetchPipelineItems = (action) =>
      Promise.resolve({
        items: action.payload.stageId === 's1' ? [{ id: 't1', companyName: 'Acme' }] : [],
      });
    await renderBoard();
    mocks.responses.fetchSinglePipelineItem = () => Promise.reject(new Error('x'));
    await act(async () => {
      mocks.board.onMoveTask('t1', 's1');
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('move-modal-save'));
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Moved 1 candidate(s) successfully!', 'success');
    expect(console.error).not.toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch pipeline item'),
      expect.anything()
    );
  });

  it('surfaces a failed move without logging it', async () => {
    mocks.responses.updatePipelineItemActivity = { status: 'error' };
    await renderBoard();
    await act(async () => {
      mocks.board.onMoveTask('t1', 's1');
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('move-modal-save'));
    });
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'MOVE_CANDIDATE');
    silentAbout('Task move failed:');
  });

  it('surfaces a failed assignment without logging it', async () => {
    mocks.responses.reassignCandidateToStaff = { status: 'error' };
    await renderBoard();
    await act(async () => {
      mocks.board.onAssignStaff('t1');
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('assign-modal-save'));
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Failed to assign staff.', 'error');
    silentAbout('Staff assignment failed:');
  });

  it('surfaces a failed stage creation without logging it', async () => {
    mocks.responses.createPipelineStage = { status: 'error' };
    await renderBoard();
    await act(async () => {
      mocks.board.onAddColumn(0);
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('new-column-save'));
    });
    expect(mocks.showApiError).toHaveBeenCalledWith(expect.any(Error), 'CREATE_PIPELINE_STAGE');
    silentAbout('Failed to create pipeline stage:');
  });
});

describe('half-shaped staff and stage envelopes', () => {
  it('copes with envelopes whose inner list is missing', async () => {
    // `{ data: {} }` resolves the outer field and drops only the inner one,
    // which is the arm an entirely empty response cannot reach.
    mocks.api.getAllAdmins.mockResolvedValue({ data: {} });
    mocks.api.GetPipelineStage.mockResolvedValue({ data: {} });
    await renderBoard();
    expect(mocks.board.staffList).toEqual([]);
    expect(mocks.board.stages).toEqual([]);
    expect(dispatched('fetchPipelineItems')).toHaveLength(0);
  });

  it('invents an id for an admin the API returned without one', async () => {
    mocks.api.getAllAdmins.mockResolvedValue({ data: { data: [{ firstName: 'Grace' }] } });
    await renderBoard();
    expect(screen.getByTestId('board-staff')).toHaveTextContent('Grace');
    expect(mocks.board.staffList[0].staffId).toMatch(/^admin-/);
  });
});

describe('candidate records that carry every field', () => {
  it('keeps each detail the item supplies', async () => {
    mocks.responses.fetchPipelineItems = (action) =>
      Promise.resolve({
        items:
          action.payload.stageId === 's1'
            ? [
                {
                  id: 'item-1',
                  companyName: 'Acme Health',
                  assignToAdmin: 'adm-1',
                  contactPerson: 'Alan T',
                  email: 'alan@acme.test',
                  phoneNumber: '0800',
                  companySize: '50',
                  organizationType: 'Clinic',
                  location: 'Lagos',
                  leadSource: 'Referral',
                },
              ]
            : [],
      });
    await renderBoard();
    expect(mocks.board.data.tasks['item-1']).toEqual(
      expect.objectContaining({
        staff: 'adm-1',
        contactPerson: 'Alan T',
        email: 'alan@acme.test',
        phone: '0800',
        companySize: '50',
        organizationType: 'Clinic',
        location: 'Lagos',
        leadSource: 'Referral',
      })
    );
  });
});

describe('a pipeline item that lands in Redux with its own progress', () => {
  // The item can only arrive after the first load, which ends by replacing
  // localTasks wholesale and would otherwise discard the card.
  const withLateItem = async (pipelineItem) => {
    const { rerender } = await renderBoard();
    mocks.state = buildState({ pipelineItem });
    await act(async () => {
      rerender(<JiraBoard />);
    });
  };

  it('counts the done tasks and sent documents the item already carries', async () => {
    await withLateItem({
      id: 't9',
      pipelineStageId: 's1',
      doneTasks: { 'Intro call': true, other: false },
      sentDocuments: { 'Signed MSA': true },
    });
    // s1 declares one required task and one required document.
    expect(screen.getByTestId('board-tasks')).toHaveTextContent('t9:');
    expect(screen.getByTestId('board-tasks')).toHaveTextContent('2/2');
  });

  it('starts a stage-bearing item at zero when it carries no progress', async () => {
    await withLateItem({ id: 't9', pipelineStageId: 's1' });
    expect(screen.getByTestId('board-tasks')).toHaveTextContent('0/2');
  });

  it('ignores an item that has no id', async () => {
    await withLateItem({ pipelineStageId: 's1', doneTasks: { a: true } });
    expect(Object.keys(mocks.board.data.tasks)).toEqual([]);
  });
});

describe('drags that lead nowhere', () => {
  const withCards = async () => {
    mocks.responses.fetchPipelineItems = (action) =>
      Promise.resolve({
        items:
          action.payload.stageId === 's1'
            ? [{ id: 't1', companyName: 'Acme' }, { id: 't2', companyName: 'Beta' }]
            : [{ id: 't3', companyName: 'Gamma' }],
      });
    return renderBoard();
  };

  it('ignores a card dropped on something that is neither a column nor a card', async () => {
    await withCards();
    await dragEnd('t1', 'nowhere');
    expect(mocks.api.UpdatePipelineItemActivity).not.toHaveBeenCalled();
  });

  it('ignores a card dropped onto the column it already lives in', async () => {
    await withCards();
    await dragEnd('t1', 's1');
    expect(mocks.api.UpdatePipelineItemActivity).not.toHaveBeenCalled();
  });

  it('treats a drag whose payload names no type as a card drag', async () => {
    await withCards();
    await act(async () => {
      mocks.dnd.onDragStart({ active: { id: 't1', data: {} } });
    });
    expect(screen.getByTestId('overlay-task')).toHaveTextContent('Acme');
  });
});

describe('prospects with and without their optional fields', () => {
  // The optimistic card is never observable: adding one immediately calls
  // fetchPipelineData, which clears localTasks, so only the dispatch and the
  // toast can be asserted for either shape.
  it('records a prospect whether or not it carries the optional fields', async () => {
    await renderBoard();
    await act(async () => {
      mocks.board.onAddTask('s1', {
        id: 'new-5',
        company: 'Zeta Care',
        assignToAdmin: 'adm-1',
        contactPerson: 'Alan T',
        email: 'alan@acme.test',
        phoneNumber: '0800',
        companySize: '50',
        organizationType: 'Clinic',
        location: 'Lagos',
        leadSource: 'Referral',
      });
    });
    await act(async () => {
      mocks.board.onAddTask('s1', { id: 'new-6' });
    });
    expect(dispatched('addTaskToColumn').map((a) => a.payload)).toEqual([
      { columnId: 's1', taskId: 'new-5' },
      { columnId: 's1', taskId: 'new-6' },
    ]);
    expect(mocks.showToast).toHaveBeenCalledWith('Candidate added successfully!', 'success');
  });

  it('accepts a prospect aimed at a column that declares no requirements', async () => {
    await renderBoard();
    await act(async () => {
      mocks.board.onAddTask('s3', { id: 'new-7', company: 'Delta' });
    });
    expect(dispatched('addTaskToColumn').at(-1).payload).toEqual({
      columnId: 's3',
      taskId: 'new-7',
    });
  });
});

describe('deleting a candidate the board cannot place', () => {
  it('deletes it without touching any column', async () => {
    await renderBoard();
    await act(async () => {
      mocks.board.onRemoveTask('ghost');
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-candidate-confirm'));
    });
    expect(dispatched('removeTaskFromColumn')).toHaveLength(0);
    expect(mocks.showToast).toHaveBeenCalledWith(
      'Deleted 1 candidate(s) successfully!',
      'success'
    );
  });
});

describe('deleting a column that never held a card list', () => {
  it('deletes it outright rather than moving anything', async () => {
    const columns = columnsFixture();
    delete columns.s2.taskIds;
    await renderBoard({ columns });
    await act(async () => {
      mocks.board.onDeleteColumn('s2');
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-column-confirm'));
    });
    expect(dispatched('updatePipelineItemActivity')).toHaveLength(0);
    expect(dispatched('deleteColumn').at(-1).payload).toBe('s2');
  });
});

describe('moving a candidate into a bare column', () => {
  it('recomputes the progress against a column that declares no requirements', async () => {
    mocks.responses.fetchPipelineItems = (action) =>
      Promise.resolve({
        items: action.payload.stageId === 's1' ? [{ id: 't1', companyName: 'Acme' }] : [],
      });
    mocks.responses.fetchSinglePipelineItem = () =>
      Promise.resolve({ data: { doneTasks: { a: true } } });
    // s3 carries neither a requiredTasks nor a requiredDocuments key at all.
    mocks.moveTarget = 's3';
    await renderBoard();
    await act(async () => {
      mocks.board.onMoveTask('t1', 's1');
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('move-modal-save'));
    });
    expect(screen.getByTestId('board-tasks')).toHaveTextContent('t1:Acme:1/0');
    expect(dispatched('updatePipelineItemActivity').at(-1).payload).toEqual(
      expect.objectContaining({ ids: ['t1'], pipelineStageId: 's3' })
    );
  });
});

describe('stage payloads at their extremes', () => {
  it('defaults every field of a stage payload that carries none', async () => {
    mocks.stagePayload = {};
    await renderBoard();
    await act(async () => {
      mocks.board.onAddColumn(1);
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('new-column-save'));
    });
    expect(dispatched('createPipelineStage').at(-1).payload).toEqual(
      expect.objectContaining({
        name: '',
        description: '',
        colourCode: '#000000',
        requiredTasks: [],
        requiredDocuments: [],
      })
    );
  });

  it('keeps the requirement lists a stage payload supplies and trims its text away', async () => {
    mocks.stagePayload = {
      name: '   ',
      description: '   ',
      colorCode: '',
      requiredTasks: [{ name: 'Intro call' }],
      requiredDocuments: [{ name: 'Signed MSA' }],
    };
    await renderBoard();
    await act(async () => {
      mocks.board.onAddColumn(1);
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('new-column-save'));
    });
    expect(dispatched('createPipelineStage').at(-1).payload).toEqual(
      expect.objectContaining({
        name: '',
        description: '',
        colourCode: '#000000',
        requiredTasks: [{ name: 'Intro call' }],
        requiredDocuments: [{ name: 'Signed MSA' }],
      })
    );
  });
});

describe('an optimistic add that throws', () => {
  // The only thing inside the try that can fail is the dispatch itself, so the
  // mock is made to throw for exactly that action.
  const breakAddTaskToColumn = () => {
    mocks.dispatch.mockImplementation((action) => {
      if (action.type === 'addTaskToColumn') throw new Error('store rejected it');
      return { unwrap: () => mocks.unwrap(action) };
    });
  };

  it('reports the failure and logs it in development', async () => {
    await renderBoard();
    breakAddTaskToColumn();
    await act(async () => {
      mocks.board.onAddTask('s1', { id: 'new-9' });
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Failed to add candidate.', 'error');
    expect(console.error).toHaveBeenCalledWith('Failed to add candidate:', expect.any(Error));
  });

  it('keeps that failure out of the production console', async () => {
    vi.stubEnv('DEV', false);
    await renderBoard();
    breakAddTaskToColumn();
    await act(async () => {
      mocks.board.onAddTask('s1', { id: 'new-9' });
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Failed to add candidate.', 'error');
    expect(console.error).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});
