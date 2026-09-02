import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// The board is rendered outside any DndContext here, so the sortable wrapper is
// reduced to a passthrough; the ordering strategy it is handed never runs.
vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }) => <>{children}</>,
  horizontalListSortingStrategy: 'horizontal',
}));

const columnProps = vi.hoisted(() => []);
vi.mock('../Components/JiraBoard/Column', () => ({
  default: (props) => {
    columnProps.push(props);
    return <div data-testid="column">{props.column.title}</div>;
  },
}));

const state = {
  authentication: { accessToken: 'at', refreshToken: 'rt', user: { id: 'u1' } },
};
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (fn) => fn(state),
}));

import Board from '../Components/JiraBoard/Board';

/**
 * The pipeline board's column layout.
 *
 * Everything here is presentation: it lays the stages out left to right, hands
 * each one down to Column untouched, and decorates the gaps between them with
 * hover-revealed insertion points. Two things make it worth pinning. The "+"
 * buttons exist only while the gap they live in is hovered AND the admin may
 * create a stage, so both conditions have to be satisfied at once; and the
 * left/right scroll arrows are driven by real element geometry, which jsdom
 * reports as zero — so the tests below install a geometry by hand and fire the
 * scroll event the listener is waiting for.
 */

const data = {
  tasks: { t1: { id: 't1' } },
  columns: {
    c1: { id: 'c1', title: 'Applied' },
    c2: { id: 'c2', title: 'Screening' },
  },
  columnOrder: ['c1', 'c2'],
};

const handlers = () => ({
  onAddTask: vi.fn(),
  onRemoveTask: vi.fn(),
  onEditTask: vi.fn(),
  onMoveTask: vi.fn(),
  onAssignStaff: vi.fn(),
  onViewCandidate: vi.fn(),
  onEditCandidate: vi.fn(),
  onAddColumn: vi.fn(),
  onDeleteColumn: vi.fn(),
  setSelectedTaskIds: vi.fn(),
  setShowAssignCandidateModal: vi.fn(),
});

let props;

const renderBoard = (over = {}) => {
  props = { ...props, ...over };
  return render(<Board {...props} />);
};

const gaps = () => document.body.querySelectorAll('.column-insertion-point');
const boardEl = () => document.body.querySelector('.board');

// jsdom reports every box as zero, so the scrollable geometry is installed
// directly on the node and the listener is nudged with a scroll event.
const withGeometry = ({ scrollLeft, clientWidth, scrollWidth }) => {
  const el = boardEl();
  Object.defineProperty(el, 'scrollLeft', { value: scrollLeft, configurable: true });
  Object.defineProperty(el, 'clientWidth', { value: clientWidth, configurable: true });
  Object.defineProperty(el, 'scrollWidth', { value: scrollWidth, configurable: true });
  el.scrollBy = vi.fn();
  act(() => { fireEvent.scroll(el); });
  return el;
};

// A role grant limited to exactly the listed permission keys.
const restrictTo = (permissions) => {
  state.authentication.user.role = {
    roleModuleAccesses: [{ module: 'PIPELINE', permissions }],
  };
};

beforeEach(() => {
  columnProps.length = 0;
  delete state.authentication.user.role;
  props = {
    data,
    pipelineId: 'p1',
    staffList: [{ staffId: 's1', name: 'Ada' }],
    stages: [{ stageId: 'c1', name: 'Applied' }],
    selectedTaskIds: [],
    ...handlers(),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('laying the columns out', () => {
  it('renders one column per entry in the order given', () => {
    renderBoard();
    expect(screen.getAllByTestId('column').map((c) => c.textContent)).toEqual([
      'Applied',
      'Screening',
    ]);
  });

  it('hands each column the shared board state and every handler', () => {
    renderBoard();
    const first = columnProps[0];
    expect(first.tasks).toBe(data.tasks);
    expect(first.pipelineId).toBe('p1');
    expect(first.columns).toEqual([
      { id: 'c1', title: 'Applied' },
      { id: 'c2', title: 'Screening' },
    ]);
    expect(first.onAddTask).toBe(props.onAddTask);
    expect(first.setShowAssignCandidateModal).toBe(props.setShowAssignCandidateModal);
  });

  it('opens a gap before the first column and after every column', () => {
    renderBoard();
    // Two columns: one leading gap plus one trailing gap each.
    expect(gaps()).toHaveLength(3);
  });

  it('draws nothing but the end card for a board with no stages yet', () => {
    renderBoard({ data: { tasks: {}, columns: {}, columnOrder: [] } });
    expect(screen.queryAllByTestId('column')).toHaveLength(0);
    expect(gaps()).toHaveLength(0);
    expect(screen.getByLabelText('Add pipeline stage')).toBeInTheDocument();
  });
});

describe('the insertion points', () => {
  it('reveals a plus only for the gap being hovered', () => {
    renderBoard();
    fireEvent.mouseEnter(gaps()[0]);
    expect(screen.getAllByLabelText('Add column')).toHaveLength(1);
  });

  it('hides the plus again when the pointer leaves', () => {
    renderBoard();
    fireEvent.mouseEnter(gaps()[0]);
    fireEvent.mouseLeave(gaps()[0]);
    expect(screen.queryByLabelText('Add column')).toBeNull();
  });

  it('inserts at position zero from the leading gap', () => {
    renderBoard();
    fireEvent.mouseEnter(gaps()[0]);
    fireEvent.click(screen.getByLabelText('Add column'));
    expect(props.onAddColumn).toHaveBeenCalledWith(0);
  });

  it('inserts after the column whose trailing gap was used', () => {
    renderBoard();
    // gaps()[2] is the gap that follows the second column.
    fireEvent.mouseEnter(gaps()[2]);
    fireEvent.click(screen.getByLabelText('Add column'));
    expect(props.onAddColumn).toHaveBeenCalledWith(2);
  });

  it('appends to the end from the always-visible card', () => {
    renderBoard();
    fireEvent.click(screen.getByLabelText('Add pipeline stage'));
    expect(props.onAddColumn).toHaveBeenCalledWith(2);
  });

  it('offers nothing to an admin who may not create a stage', () => {
    restrictTo(['view_pipeline']);
    renderBoard();
    fireEvent.mouseEnter(gaps()[0]);
    expect(screen.queryByLabelText('Add column')).toBeNull();
    expect(screen.queryByLabelText('Add pipeline stage')).toBeNull();
  });
});

describe('the horizontal scroll arrows', () => {
  it('shows neither arrow for a board that fits', () => {
    renderBoard();
    withGeometry({ scrollLeft: 0, clientWidth: 500, scrollWidth: 500 });
    expect(screen.queryByLabelText('Scroll left')).toBeNull();
    expect(screen.queryByLabelText('Scroll right')).toBeNull();
  });

  it('offers only the right arrow at the start of a wide board', () => {
    renderBoard();
    withGeometry({ scrollLeft: 0, clientWidth: 500, scrollWidth: 1500 });
    expect(screen.queryByLabelText('Scroll left')).toBeNull();
    expect(screen.getByLabelText('Scroll right')).toBeInTheDocument();
  });

  it('offers only the left arrow once scrolled to the end', () => {
    renderBoard();
    withGeometry({ scrollLeft: 1000, clientWidth: 500, scrollWidth: 1500 });
    expect(screen.getByLabelText('Scroll left')).toBeInTheDocument();
    expect(screen.queryByLabelText('Scroll right')).toBeNull();
  });

  it('offers both arrows in the middle of a wide board', () => {
    renderBoard();
    withGeometry({ scrollLeft: 400, clientWidth: 500, scrollWidth: 1500 });
    expect(screen.getByLabelText('Scroll left')).toBeInTheDocument();
    expect(screen.getByLabelText('Scroll right')).toBeInTheDocument();
  });

  it('scrolls by eight tenths of a wide viewport', () => {
    renderBoard();
    const el = withGeometry({ scrollLeft: 400, clientWidth: 1000, scrollWidth: 4000 });
    fireEvent.click(screen.getByLabelText('Scroll right'));
    expect(el.scrollBy).toHaveBeenCalledWith({ left: 800, behavior: 'smooth' });

    fireEvent.click(screen.getByLabelText('Scroll left'));
    expect(el.scrollBy).toHaveBeenCalledWith({ left: -800, behavior: 'smooth' });
  });

  it('never scrolls by less than its floor of 320', () => {
    renderBoard();
    const el = withGeometry({ scrollLeft: 100, clientWidth: 200, scrollWidth: 4000 });
    fireEvent.click(screen.getByLabelText('Scroll right'));
    expect(el.scrollBy).toHaveBeenCalledWith({ left: 320, behavior: 'smooth' });
  });

  it('recomputes the arrows when the window is resized', () => {
    renderBoard();
    const el = boardEl();
    Object.defineProperty(el, 'scrollLeft', { value: 0, configurable: true });
    Object.defineProperty(el, 'clientWidth', { value: 500, configurable: true });
    Object.defineProperty(el, 'scrollWidth', { value: 2000, configurable: true });
    act(() => { fireEvent(window, new Event('resize')); });
    expect(screen.getByLabelText('Scroll right')).toBeInTheDocument();
  });
});
