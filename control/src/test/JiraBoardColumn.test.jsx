import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';

import Column from '../Components/JiraBoard/Column';
import authReducer from '../ReduxStore/features/authentication';

/**
 * Cover for the prospect board's column, written ahead of moving its
 * `if (!column || !column.id) return null` guard below the hooks.
 *
 * dnd-kit, the router, and the permission hook are all real. The last one is
 * what makes the early return a fault rather than only a lint violation:
 * `usePermission` runs above the guard and calls hooks of its own, so a column
 * that disappears while mounted ends the render with fewer hooks than the
 * previous one and React throws.
 */

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const makeStore = (permissions = []) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: 't',
        refreshToken: 'r',
        user: {
          id: 'u1',
          role: { roleModuleAccesses: [{ module: 'TENANTS', permissions }] },
        },
      },
    },
  });

const column = { id: 'c1', title: 'Screening', taskIds: ['t1'], colorCode: '#123456' };
const tasks = { t1: { company: 'Acme Health', progress: 2 } };

const handlers = () => ({
  onAddTask: vi.fn(),
  onRemoveTask: vi.fn(),
  onEditTask: vi.fn(),
  onMoveTask: vi.fn(),
  onAssignStaff: vi.fn(),
  onViewCandidate: vi.fn(),
  onEditCandidate: vi.fn(),
  onDeleteColumn: vi.fn(),
});

const renderColumn = ({ permissions = [], ...props } = {}) => {
  const h = handlers();
  const view = render(
    <Provider store={makeStore(permissions)}>
      <MemoryRouter>
        <DndContext>
          <SortableContext items={['c1']}>
            <Column column={column} tasks={tasks} columns={{ c1: column }} {...h} {...props} />
          </SortableContext>
        </DndContext>
      </MemoryRouter>
    </Provider>
  );
  return { ...view, handlers: h };
};

const col = () => document.body.querySelector('.column');

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

describe('Column rendering', () => {
  it('renders the title and the candidate count', () => {
    renderColumn();
    expect(screen.getByText(/Screening/)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('falls back to a placeholder title', () => {
    renderColumn({ column: { id: 'c1', taskIds: [] } });
    expect(screen.getByText(/Unnamed Column/)).toBeInTheDocument();
  });

  it('renders nothing for a missing column or one with no id', () => {
    const { unmount } = renderColumn({ column: null });
    expect(col()).toBeNull();
    unmount();

    renderColumn({ column: { title: 'No id' } });
    expect(col()).toBeNull();
  });

  it('renders a card per task', () => {
    renderColumn();
    expect(screen.getByText('Acme Health')).toBeInTheDocument();
  });

  it('skips a task id with no matching task', () => {
    renderColumn({ column: { ...column, taskIds: ['t1', 'ghost'] } });
    expect(screen.getByText('Acme Health')).toBeInTheDocument();
    expect(document.body.querySelectorAll('.task')).toHaveLength(1);
  });

  it('ignores task ids that are not strings', () => {
    renderColumn({ column: { ...column, taskIds: ['t1', null, 7, undefined] } });
    expect(document.body.querySelectorAll('.task')).toHaveLength(1);
  });

  it('shows the empty state when there is nothing to list', () => {
    renderColumn({ column: { ...column, taskIds: [] } });
    expect(screen.getByText(/Add a candidate/)).toBeInTheDocument();
  });

  it('treats a non-array taskIds as empty', () => {
    renderColumn({ column: { ...column, taskIds: 'nope' } });
    expect(screen.getByText(/Add a candidate/)).toBeInTheDocument();
  });
});

describe('Column menu permissions', () => {
  // Fire the whole pointer sequence: Headless UI opens on a bare click in 2.2.1
  // but needs pointer events from 2.2.4, and this works for both.
  const openMenu = () => {
    const btn = screen.getByLabelText('Column menu');
    fireEvent.pointerDown(btn);
    fireEvent.pointerUp(btn);
    fireEvent.click(btn);
  };

  it('always offers to add a candidate', () => {
    renderColumn();
    openMenu();
    expect(screen.getByText(/Add new candidate/)).toBeInTheDocument();
  });

  it('hides manage and delete without the permissions', () => {
    renderColumn();
    openMenu();
    expect(screen.queryByText('Manage column')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete column')).not.toBeInTheDocument();
  });

  it('shows manage and delete when the role allows them', () => {
    renderColumn({ permissions: ['edit_pipeline_stage', 'delete_pipeline_stage'] });
    openMenu();
    expect(screen.getByText('Manage column')).toBeInTheDocument();
    expect(screen.getByText('Delete column')).toBeInTheDocument();
  });

  it('navigates to the column detail page from Manage column', () => {
    renderColumn({ permissions: ['edit_pipeline_stage'] });
    openMenu();
    fireEvent.click(screen.getByText('Manage column'));
    expect(navigate).toHaveBeenCalledWith('/tenants/column-single/c1');
  });

  it('reports the column id when deleting', () => {
    const { handlers: h } = renderColumn({ permissions: ['delete_pipeline_stage'] });
    openMenu();
    fireEvent.click(screen.getByText('Delete column'));
    expect(h.onDeleteColumn).toHaveBeenCalledWith('c1');
  });
});

describe('Column hook stability', () => {
  it('survives its column going away while mounted', () => {
    // `usePermission` runs above the `if (!column) return null` guard, so this
    // transition drops the render from many hooks to a few. React throws
    // "Rendered fewer hooks than expected" unless the guard sits below them.
    const store = makeStore();
    const h = handlers();
    const view = (c) => (
      <Provider store={store}>
        <MemoryRouter>
          <DndContext>
            <SortableContext items={['c1']}>
              <Column column={c} tasks={tasks} columns={{ c1: column }} {...h} />
            </SortableContext>
          </DndContext>
        </MemoryRouter>
      </Provider>
    );
    const { rerender } = render(view(column));
    expect(screen.getByText(/Screening/)).toBeInTheDocument();

    expect(() => rerender(view(undefined))).not.toThrow();
    expect(col()).toBeNull();
  });
});

describe('the column menu under the keyboard', () => {
  // Headless UI 2.2.1 opens a Menu on a bare click and marks the focused entry
  // "active"; each entry styles itself off that, which is the only way those
  // arms are reached.
  const openMenu = () => fireEvent.click(screen.getByLabelText('Column menu'));

  it('highlights each entry as focus moves down the menu', () => {
    renderColumn({ permissions: ['edit_pipeline_stage', 'delete_pipeline_stage'] });
    openMenu();

    const add = screen.getByText(/Add new candidate/);
    fireEvent.mouseEnter(add);
    expect(add.className).toContain('menu-item-active');

    const manage = screen.getByText('Manage column');
    fireEvent.mouseEnter(manage);
    expect(manage.className).toContain('menu-item-active');

    const remove = screen.getByText('Delete column');
    fireEvent.mouseEnter(remove);
    expect(remove.className).toContain('menu-item-delete-active');
  });

  it('leaves an unfocused entry unstyled', () => {
    renderColumn({ permissions: ['edit_pipeline_stage'] });
    openMenu();
    expect(screen.getByText('Manage column').className).not.toContain('menu-item-active');
  });
});

describe('a column full of candidates', () => {
  const many = (n) => {
    const ids = Array.from({ length: n }, (_, i) => `t${i}`);
    return {
      column: { ...column, taskIds: ids },
      tasks: Object.fromEntries(ids.map((id) => [id, { company: id, progress: 0 }])),
    };
  };

  it('scrolls the list once it reaches ten candidates', () => {
    const { column: c, tasks: t } = many(10);
    renderColumn({ column: c, tasks: t, columns: { c1: c } });
    expect(document.body.querySelector('.task-list').className).toContain('task-list-scroll');
  });

  it('leaves a shorter list unscrolled', () => {
    const { column: c, tasks: t } = many(3);
    renderColumn({ column: c, tasks: t, columns: { c1: c } });
    expect(document.body.querySelector('.task-list').className).not.toContain(
      'task-list-scroll'
    );
  });
});
