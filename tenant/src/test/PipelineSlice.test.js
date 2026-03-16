import { describe, it, expect } from 'vitest';
import reducer, {
  updateDraft,
  addColumn,
  resetDraft,
  setColumns,
  updateColumnTaskIds,
  addTaskToColumn,
  removeTaskFromColumn,
  updateColumnOrder,
  deleteColumn,
} from '../ReduxStore/features/PipelineSlice';

const initialState = {
  draft: { name: '', description: '', colorCode: '#1E40AF' },
  pipeline: null,
  columns: {},
  columnOrder: [],
  stages: [],
  status: 'idle',
  error: null,
  pipelineItem: null,
};

describe('PipelineSlice - reducers', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('updateDraft merges draft fields', () => {
    const state = reducer(initialState, updateDraft({ name: 'Stage 1' }));
    expect(state.draft.name).toBe('Stage 1');
    expect(state.draft.colorCode).toBe('#1E40AF'); // unchanged
  });

  it('resetDraft restores draft to initial', () => {
    let state = reducer(initialState, updateDraft({ name: 'Modified' }));
    state = reducer(state, resetDraft());
    expect(state.draft).toEqual(initialState.draft);
  });

  it('addColumn creates a new column and resets draft', () => {
    const state = reducer(initialState, addColumn({
      pipelineData: { name: 'New Stage', description: 'Desc', colorCode: '#FF0000' },
      stageId: 'col-1',
    }));
    expect(state.columns['col-1']).toBeDefined();
    expect(state.columns['col-1'].title).toBe('New Stage');
    expect(state.columns['col-1'].colorCode).toBe('#FF0000');
    expect(state.columnOrder).toContain('col-1');
    expect(state.draft).toEqual(initialState.draft);
  });

  it('addColumn at specific index', () => {
    let state = reducer(initialState, addColumn({
      pipelineData: { name: 'First' },
      stageId: 'col-1',
    }));
    state = reducer(state, addColumn({
      pipelineData: { name: 'Inserted' },
      stageId: 'col-2',
      index: 0,
    }));
    expect(state.columnOrder[0]).toBe('col-2');
    expect(state.columnOrder[1]).toBe('col-1');
  });

  it('setColumns replaces all columns', () => {
    const newColumns = {
      'a': { id: 'a', title: 'Col A', taskIds: [], count: 0 },
    };
    const state = reducer(initialState, setColumns(newColumns));
    expect(state.columns).toEqual(newColumns);
  });

  it('addTaskToColumn adds task id', () => {
    let state = reducer(initialState, addColumn({
      pipelineData: { name: 'Stage' },
      stageId: 'col-1',
    }));
    state = reducer(state, addTaskToColumn({ columnId: 'col-1', taskId: 'task-1' }));
    expect(state.columns['col-1'].taskIds).toContain('task-1');
    expect(state.columns['col-1'].count).toBe(1);
  });

  it('removeTaskFromColumn removes task id', () => {
    let state = reducer(initialState, addColumn({
      pipelineData: { name: 'Stage' },
      stageId: 'col-1',
    }));
    state = reducer(state, addTaskToColumn({ columnId: 'col-1', taskId: 'task-1' }));
    state = reducer(state, addTaskToColumn({ columnId: 'col-1', taskId: 'task-2' }));
    state = reducer(state, removeTaskFromColumn({ columnId: 'col-1', taskId: 'task-1' }));
    expect(state.columns['col-1'].taskIds).toEqual(['task-2']);
    expect(state.columns['col-1'].count).toBe(1);
  });

  it('updateColumnTaskIds replaces and filters task ids', () => {
    let state = reducer(initialState, addColumn({
      pipelineData: { name: 'Stage' },
      stageId: 'col-1',
    }));
    state = reducer(state, updateColumnTaskIds({
      columnId: 'col-1',
      taskIds: ['t1', 't2', null, undefined, 't3'],
    }));
    expect(state.columns['col-1'].taskIds).toEqual(['t1', 't2', 't3']);
    expect(state.columns['col-1'].count).toBe(3);
  });

  it('updateColumnOrder replaces order', () => {
    const state = reducer(initialState, updateColumnOrder(['c', 'a', 'b']));
    expect(state.columnOrder).toEqual(['c', 'a', 'b']);
  });

  it('deleteColumn removes column, order entry, and stage', () => {
    let state = reducer(initialState, addColumn({
      pipelineData: { name: 'Stage' },
      stageId: 'col-1',
    }));
    state = { ...state, stages: [{ stageId: 'col-1', name: 'Stage' }] };
    state = reducer(state, deleteColumn('col-1'));
    expect(state.columns['col-1']).toBeUndefined();
    expect(state.columnOrder).not.toContain('col-1');
  });

  it('ignores operations on non-existent columns', () => {
    const state = reducer(initialState, addTaskToColumn({ columnId: 'nope', taskId: 't1' }));
    expect(state).toEqual(initialState);
  });

  it('ignores removeTask on non-existent column', () => {
    const state = reducer(initialState, removeTaskFromColumn({ columnId: 'nope', taskId: 't1' }));
    expect(state).toEqual(initialState);
  });
});
