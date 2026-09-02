import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';

import Task from '../Components/JiraBoard/Task';

/**
 * Cover for the pipeline board's task card, written ahead of moving its
 * `if (!task) return null` guard below the hooks.
 *
 * dnd-kit is used for real rather than mocked, so `useSortable` registers
 * against a genuine DndContext. That is the part most at risk when the guard
 * moves: a card that renders null must not leave a registration behind.
 */

const renderTask = (props = {}) =>
  render(
    <DndContext>
      <SortableContext items={['t1']}>
        <Task
          task={{ company: 'Acme Health', progress: 3 }}
          id="t1"
          columnId="c1"
          onViewCandidate={vi.fn()}
          toggleSelection={vi.fn()}
          {...props}
        />
      </SortableContext>
    </DndContext>
  );

const card = () => document.body.querySelector('.task');

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

describe('Task rendering', () => {
  it('renders the candidate name and progress', () => {
    renderTask();
    expect(screen.getByText('Acme Health')).toBeInTheDocument();
    expect(screen.getByText('3 task done')).toBeInTheDocument();
  });

  it('falls back to a placeholder name', () => {
    renderTask({ task: { progress: 0 } });
    expect(screen.getByText('Unnamed Candidate')).toBeInTheDocument();
  });

  it('renders nothing at all without a task', () => {
    renderTask({ task: null });
    expect(card()).toBeNull();
  });

  it('renders nothing for an undefined task', () => {
    renderTask({ task: undefined });
    expect(card()).toBeNull();
  });

  it('marks itself selected only when told to', () => {
    const { unmount } = renderTask({ selected: true });
    expect(card().className).toContain('selected');
    unmount();

    renderTask({ selected: false });
    expect(card().className).not.toContain('selected');
  });
});

describe('Task interaction', () => {
  it('opens the candidate on a plain click', () => {
    const onViewCandidate = vi.fn();
    renderTask({ onViewCandidate });
    fireEvent.click(card());
    expect(onViewCandidate).toHaveBeenCalledWith('c1', 't1');
  });

  it('toggles selection on ctrl-click instead of opening', () => {
    const onViewCandidate = vi.fn();
    const toggleSelection = vi.fn();
    renderTask({ onViewCandidate, toggleSelection });
    fireEvent.click(card(), { ctrlKey: true });
    expect(toggleSelection).toHaveBeenCalledTimes(1);
    expect(onViewCandidate).not.toHaveBeenCalled();
  });

  it('does the same for meta-click, for the Mac path', () => {
    const onViewCandidate = vi.fn();
    const toggleSelection = vi.fn();
    renderTask({ onViewCandidate, toggleSelection });
    fireEvent.click(card(), { metaKey: true });
    expect(toggleSelection).toHaveBeenCalledTimes(1);
    expect(onViewCandidate).not.toHaveBeenCalled();
  });
});

describe('Task hook stability', () => {
  it('survives a task going missing while it is mounted', () => {
    // The guard sits above the hooks, so a valid -> invalid transition changes
    // the hook count. React reports that as an error rather than a throw.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <DndContext>
        <SortableContext items={['t1']}>
          <Task task={{ company: 'Acme' }} id="t1" columnId="c1"
                onViewCandidate={vi.fn()} toggleSelection={vi.fn()} />
        </SortableContext>
      </DndContext>
    );
    expect(screen.getByText('Acme')).toBeInTheDocument();

    rerender(
      <DndContext>
        <SortableContext items={['t1']}>
          <Task task={null} id="t1" columnId="c1"
                onViewCandidate={vi.fn()} toggleSelection={vi.fn()} />
        </SortableContext>
      </DndContext>
    );
    expect(card()).toBeNull();

    const hookComplaint = spy.mock.calls.some((args) =>
      String(args[0]).includes('hooks')
    );
    expect(hookComplaint).toBe(false);
    spy.mockRestore();
  });
});
