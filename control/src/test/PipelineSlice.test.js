import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('../Helper/AxiosInterceptor', () => ({
  default: () => ({
    get: mockGet,
    post: mockPost,
    patch: mockPatch,
    put: mockPut,
    delete: mockDelete,
  }),
}));

let uuidCounter = 0;
vi.mock('uuid', () => ({ v4: () => `uuid-${++uuidCounter}` }));

import reducer, {
  updateDraft,
  addTaskToDraft,
  removeTaskFromDraft,
  toggleTaskRequiredInDraft,
  addDocumentToDraft,
  removeDocumentFromDraft,
  toggleDocumentRequiredInDraft,
  addColumn,
  resetDraft,
  setColumns,
  updateColumnTaskIds,
  addTaskToColumn,
  removeTaskFromColumn,
  updateColumnOrder,
  deleteColumn,
  fetchPipelineByModule,
  fetchPipelineStages,
  fetchSinglePipelineStages,
  fetchPipelineItems,
  fetchSinglePipelineItem,
  createPipelineStage,
  createCandidate,
  updateStageTasks,
  updateStageDocuments,
  reorderPipelineStage,
  updatePipelineItemActivity,
  updatePipelineItemTaskToDone,
  updatePipelineItemDocumentToDone,
  deletePipelineStage,
  deletePipelineItem,
  updateCandidate,
  reassignCandidateToStaff,
  selectColumns,
  selectDraft,
  selectStages,
  selectStatus,
  selectPipelineItem,
} from '../ReduxStore/features/PipelineSlice';

/**
 * The prospect pipeline slice: draft editing for a stage's required tasks and
 * documents, the board's column bookkeeping, and the async thunks behind both.
 */

const initial = () => reducer(undefined, { type: '@@INIT' });
const makeStore = () => configureStore({ reducer: { pipeline: reducer } });
const tokens = { accessToken: 'at', refreshToken: 'rt' };

// A rejection with no rejectWithValue payload, as produced when a thunk throws
// outside its own try/catch; the reducer then falls back to action.error.
const bare = (thunk) => ({
  type: thunk.rejected.type,
  payload: undefined,
  error: { message: 'network down' },
});

beforeEach(() => {
  vi.clearAllMocks();
  uuidCounter = 0;
});

describe('stage draft', () => {
  it('merges partial updates into the draft', () => {
    const s = reducer(initial(), updateDraft({ name: 'Screening' }));
    expect(s.draft.name).toBe('Screening');
    expect(s.draft.colorCode).toBe('#1E40AF');
  });

  it('adds, toggles and removes a required task', () => {
    let s = reducer(initial(), addTaskToDraft({ name: 'Call', required: true }));
    const [task] = s.draft.requiredTasks;
    expect(task).toEqual({ id: 'uuid-1', name: 'Call', required: true });

    s = reducer(s, toggleTaskRequiredInDraft(task.id));
    expect(s.draft.requiredTasks[0].required).toBe(false);

    s = reducer(s, removeTaskFromDraft(task.id));
    expect(s.draft.requiredTasks).toEqual([]);
  });

  it('ignores a toggle for a task that is not there', () => {
    const before = reducer(initial(), addTaskToDraft({ name: 'Call', required: true }));
    expect(reducer(before, toggleTaskRequiredInDraft('nope'))).toEqual(before);
  });

  it('adds, toggles and removes a required document', () => {
    let s = reducer(initial(), addDocumentToDraft({ name: 'W-9', required: false }));
    const [doc] = s.draft.requiredDocuments;
    expect(doc).toEqual({ id: 'uuid-1', name: 'W-9', required: false });

    s = reducer(s, toggleDocumentRequiredInDraft(doc.id));
    expect(s.draft.requiredDocuments[0].required).toBe(true);

    s = reducer(s, removeDocumentFromDraft(doc.id));
    expect(s.draft.requiredDocuments).toEqual([]);
  });

  it('ignores a toggle for a document that is not there', () => {
    const before = reducer(initial(), addDocumentToDraft({ name: 'W-9', required: true }));
    expect(reducer(before, toggleDocumentRequiredInDraft('nope'))).toEqual(before);
  });

  it('resets the draft back to its defaults', () => {
    let s = reducer(initial(), updateDraft({ name: 'Screening' }));
    s = reducer(s, addTaskToDraft({ name: 'Call', required: true }));
    s = reducer(s, resetDraft());
    expect(s.draft).toEqual(initial().draft);
  });
});

describe('column bookkeeping', () => {
  const withColumn = (extra = {}) =>
    reducer(
      initial(),
      addColumn({ pipelineData: { name: 'Intake', ...extra }, index: 0, stageId: 'c1' })
    );

  it('adds a column at the given index', () => {
    let s = withColumn();
    expect(s.columnOrder).toEqual(['c1']);
    expect(s.columns.c1).toEqual(
      expect.objectContaining({ id: 'c1', title: 'Intake', taskIds: [], count: 0, order: 0 })
    );
  });

  it('mints an id when the caller supplies none', () => {
    const s = reducer(initial(), addColumn({ pipelineData: { name: 'A' } }));
    expect(s.columnOrder).toEqual(['uuid-1']);
  });

  it('names an unnamed column and defaults its task and document lists', () => {
    const s = reducer(initial(), addColumn({ pipelineData: {}, stageId: 'c1' }));
    expect(s.columns.c1.title).toBe('New Stage');
    expect(s.columns.c1.requiredTasks).toEqual([]);
    expect(s.columns.c1.requiredDocuments).toEqual([]);
  });

  it('carries required tasks and documents onto the column', () => {
    const s = withColumn({
      requiredTasks: [{ id: 't', name: 'Call', required: true }],
      requiredDocuments: [{ id: 'd', name: 'W-9', required: false }],
    });
    expect(s.columns.c1.requiredTasks).toHaveLength(1);
    expect(s.columns.c1.requiredDocuments).toHaveLength(1);
  });

  it('appends when the index is out of range', () => {
    let s = withColumn();
    s = reducer(s, addColumn({ pipelineData: { name: 'B' }, index: 99, stageId: 'c2' }));
    expect(s.columnOrder).toEqual(['c1', 'c2']);
  });

  it('clears the draft once a column is added', () => {
    let s = reducer(initial(), updateDraft({ name: 'Screening' }));
    s = reducer(s, addColumn({ pipelineData: { name: 'Screening' }, stageId: 'c1' }));
    expect(s.draft).toEqual(initial().draft);
  });

  it('replaces the whole column map', () => {
    const s = reducer(initial(), setColumns({ x: { id: 'x', taskIds: [] } }));
    expect(Object.keys(s.columns)).toEqual(['x']);
  });

  it('replaces the column order', () => {
    const s = reducer(initial(), updateColumnOrder(['b', 'a']));
    expect(s.columnOrder).toEqual(['b', 'a']);
  });

  it('sets a column task list, dropping anything that is not a string', () => {
    const s = reducer(
      withColumn(),
      updateColumnTaskIds({ columnId: 'c1', taskIds: ['t1', null, 7, undefined, 't2'] })
    );
    expect(s.columns.c1.taskIds).toEqual(['t1', 't2']);
    expect(s.columns.c1.count).toBe(2);
  });

  it('adds and removes a single task, keeping the count in step', () => {
    let s = reducer(withColumn(), addTaskToColumn({ columnId: 'c1', taskId: 't1' }));
    expect(s.columns.c1.count).toBe(1);
    s = reducer(s, removeTaskFromColumn({ columnId: 'c1', taskId: 't1' }));
    expect(s.columns.c1.taskIds).toEqual([]);
    expect(s.columns.c1.count).toBe(0);
  });

  it('ignores task edits aimed at a column that is not there', () => {
    const before = initial();
    expect(reducer(before, updateColumnTaskIds({ columnId: 'x', taskIds: ['t'] }))).toEqual(before);
    expect(reducer(before, addTaskToColumn({ columnId: 'x', taskId: 't' }))).toEqual(before);
    expect(reducer(before, removeTaskFromColumn({ columnId: 'x', taskId: 't' }))).toEqual(before);
  });

  it('ignores an add with no task id', () => {
    const before = withColumn();
    expect(reducer(before, addTaskToColumn({ columnId: 'c1', taskId: null }))).toEqual(before);
  });

  it('deletes a column, its order entry and its stage', () => {
    let s = withColumn();
    s = { ...s, stages: [{ stageId: 'c1', name: 'Intake' }] };
    s = reducer(s, deleteColumn('c1'));
    expect(s.columns.c1).toBeUndefined();
    expect(s.columnOrder).toEqual([]);
    expect(s.stages).toEqual([]);
  });

  it('ignores a delete for a column that is not there', () => {
    const before = withColumn();
    expect(reducer(before, deleteColumn('nope'))).toEqual(before);
  });
});

describe('rejections without a payload', () => {
  const thunks = [
    fetchPipelineByModule, fetchPipelineStages, fetchSinglePipelineStages,
    fetchPipelineItems, fetchSinglePipelineItem, createPipelineStage,
    createCandidate, updateStageTasks, updateStageDocuments, reorderPipelineStage,
    updatePipelineItemActivity, updatePipelineItemTaskToDone,
    updatePipelineItemDocumentToDone, deletePipelineStage, deletePipelineItem,
    updateCandidate, reassignCandidateToStaff,
  ];

  it.each(thunks.map((t) => [t.typePrefix, t]))(
    '%s falls back to the thrown error message',
    (_name, thunk) => {
      const s = reducer(initial(), bare(thunk));
      expect(s.status).toBe('failed');
      expect(s.error).toBe('network down');
    }
  );

  it.each(thunks.map((t) => [t.typePrefix, t]))('%s marks the slice loading', (_name, thunk) => {
    const s = reducer(initial(), { type: thunk.pending.type });
    expect(s.status).toBe('loading');
    expect(s.error).toBeNull();
  });
});

describe('fulfilled reducers', () => {
  it('stores the first pipeline, or null when there is none', () => {
    let s = reducer(initial(), {
      type: fetchPipelineByModule.fulfilled.type,
      payload: { data: [{ id: 'p1' }] },
    });
    expect(s.pipeline).toEqual({ id: 'p1' });

    s = reducer(initial(), { type: fetchPipelineByModule.fulfilled.type, payload: { data: [] } });
    expect(s.pipeline).toBeNull();
  });

  it('rebuilds the board from a stage list, ordered by each stage order', () => {
    const s = reducer(initial(), {
      type: fetchPipelineStages.fulfilled.type,
      payload: {
        data: [
          { id: 's2', name: 'Second', order: 2, colourCode: '#222' },
          { id: 's1', name: 'First', order: 1, colourCode: '#111' },
        ],
      },
    });
    expect(s.columnOrder).toEqual(['s1', 's2']);
    expect(s.stages).toEqual([
      { stageId: 's2', name: 'Second' },
      { stageId: 's1', name: 'First' },
    ]);
  });

  it('defaults an order-less stage to zero and its lists to empty', () => {
    const s = reducer(initial(), {
      type: fetchPipelineStages.fulfilled.type,
      payload: { data: [{ id: 's1', name: 'One' }] },
    });
    expect(s.columns.s1.order).toBe(0);
    expect(s.columns.s1.requiredTasks).toEqual([]);
  });

  it('treats a missing stage list as empty', () => {
    const s = reducer(initial(), { type: fetchPipelineStages.fulfilled.type, payload: {} });
    expect(s.columnOrder).toEqual([]);
    expect(s.stages).toEqual([]);
  });

  it('fills the draft from a single stage, defaulting every blank', () => {
    const s = reducer(initial(), {
      type: fetchSinglePipelineStages.fulfilled.type,
      payload: { data: { id: 's1' } },
    });
    expect(s.draft).toEqual({
      id: 's1',
      name: '',
      description: '',
      colorCode: '#1E40AF',
      requiredTasks: [],
      requiredDocuments: [],
    });
  });

  it('keeps non-array task and document lists out of the draft', () => {
    const s = reducer(initial(), {
      type: fetchSinglePipelineStages.fulfilled.type,
      payload: { data: { id: 's1', requiredTasks: 'nope', requiredDocuments: 'nope' } },
    });
    expect(s.draft.requiredTasks).toEqual([]);
    expect(s.draft.requiredDocuments).toEqual([]);
  });

  it('leaves the draft alone when the stage comes back empty', () => {
    const before = initial();
    const s = reducer(before, {
      type: fetchSinglePipelineStages.fulfilled.type,
      payload: { data: null },
    });
    expect(s.draft).toEqual(before.draft);
  });

  it('creates a placeholder column for items that arrive before their stage', () => {
    const s = reducer(initial(), {
      type: fetchPipelineItems.fulfilled.type,
      payload: { stageId: 'abcdefghijkl', items: [{ id: 'i1' }, {}, null, { id: 9 }] },
    });
    expect(s.columns.abcdefghijkl.title).toBe('Stage abcdefgh');
    expect(s.columns.abcdefghijkl.taskIds).toEqual(['i1']);
    expect(s.columns.abcdefghijkl.count).toBe(1);
  });

  it('defaults the item list to empty', () => {
    const s = reducer(initial(), {
      type: fetchPipelineItems.fulfilled.type,
      payload: { stageId: 's1' },
    });
    expect(s.columns.s1.taskIds).toEqual([]);
  });

  it('adds a created stage and re-sorts the board', () => {
    let s = reducer(initial(), addColumn({ pipelineData: { name: 'A', order: 5 }, stageId: 'c1' }));
    s = reducer(s, {
      type: createPipelineStage.fulfilled.type,
      payload: { data: { id: 'c2', name: 'B', order: 1 } },
    });
    expect(s.columnOrder).toEqual(['c2', 'c1']);
    expect(s.draft).toEqual(initial().draft);
  });

  it('places a created stage without an order at the end', () => {
    let s = reducer(initial(), addColumn({ pipelineData: { name: 'A', order: 0 }, stageId: 'c1' }));
    s = reducer(s, { type: createPipelineStage.fulfilled.type, payload: { data: { id: 'c2', name: 'B' } } });
    expect(s.columns.c2.order).toBe(1);
  });

  it('ignores a created stage that came back empty', () => {
    const s = reducer(initial(), { type: createPipelineStage.fulfilled.type, payload: { data: null } });
    expect(s.columnOrder).toEqual([]);
  });

  it('writes updated stage tasks onto both the column and the draft', () => {
    let s = reducer(initial(), addColumn({ pipelineData: { name: 'A' }, stageId: 'c1' }));
    const requiredTasks = [{ id: 't1', name: 'Call', required: true }];
    s = reducer(s, {
      type: updateStageTasks.fulfilled.type,
      payload: { pipelineStageId: 'c1', requiredTasks },
    });
    expect(s.columns.c1.requiredTasks).toEqual(requiredTasks);
    expect(s.draft.requiredTasks).toEqual(requiredTasks);
  });

  it('ignores updated tasks for a column it does not hold', () => {
    const before = initial();
    const s = reducer(before, {
      type: updateStageTasks.fulfilled.type,
      payload: { pipelineStageId: 'missing', requiredTasks: [] },
    });
    expect(s.draft.requiredTasks).toEqual(before.draft.requiredTasks);
  });

  it('writes updated stage documents onto both the column and the draft', () => {
    let s = reducer(initial(), addColumn({ pipelineData: { name: 'A' }, stageId: 'c1' }));
    const requiredDocuments = [{ id: 'd1', name: 'W-9', required: false }];
    s = reducer(s, {
      type: updateStageDocuments.fulfilled.type,
      payload: { pipelineStageId: 'c1', requiredDocuments },
    });
    expect(s.columns.c1.requiredDocuments).toEqual(requiredDocuments);
    expect(s.draft.requiredDocuments).toEqual(requiredDocuments);
  });

  it('ignores updated documents for a column it does not hold', () => {
    const before = initial();
    const s = reducer(before, {
      type: updateStageDocuments.fulfilled.type,
      payload: { pipelineStageId: 'missing', requiredDocuments: [] },
    });
    expect(s.draft.requiredDocuments).toEqual(before.draft.requiredDocuments);
  });

  it('adds a created candidate to its column, and ignores one whose column is absent', () => {
    let s = reducer(initial(), addColumn({ pipelineData: { name: 'A' }, stageId: 'c1' }));
    s = reducer(s, {
      type: createCandidate.fulfilled.type,
      payload: { data: { id: 'x', pipelineStageId: 'c1' } },
    });
    expect(s.columns.c1.taskIds).toEqual(['x']);

    const after = reducer(s, {
      type: createCandidate.fulfilled.type,
      payload: { data: { id: 'y', pipelineStageId: 'missing' } },
    });
    expect(after.columns.missing).toBeUndefined();
  });

  it('applies a reorder and ignores one for an unknown column', () => {
    let s = reducer(initial(), addColumn({ pipelineData: { name: 'A' }, stageId: 'c1' }));
    s = reducer(s, { type: reorderPipelineStage.fulfilled.type, payload: { data: { id: 'c1', order: 7 } } });
    expect(s.columns.c1.order).toBe(7);

    const after = reducer(s, {
      type: reorderPipelineStage.fulfilled.type,
      payload: { data: { id: 'missing', order: 1 } },
    });
    expect(after.columns.missing).toBeUndefined();
  });

  it('moves items between columns and leaves one already in place alone', () => {
    let s = reducer(initial(), addColumn({ pipelineData: { name: 'A' }, stageId: 'c1' }));
    s = reducer(s, addColumn({ pipelineData: { name: 'B' }, stageId: 'c2' }));
    s = reducer(s, addTaskToColumn({ columnId: 'c1', taskId: 't1' }));
    s = reducer(s, addTaskToColumn({ columnId: 'c2', taskId: 't2' }));

    s = reducer(s, {
      type: updatePipelineItemActivity.fulfilled.type,
      payload: { ids: ['t1', 't2'], pipelineStageId: 'c2' },
    });
    expect(s.columns.c1.taskIds).toEqual([]);
    expect(s.columns.c2.taskIds).toEqual(['t2', 't1']);
  });

  it('tolerates a move to a stage with no column', () => {
    let s = reducer(initial(), addColumn({ pipelineData: { name: 'A' }, stageId: 'c1' }));
    s = reducer(s, addTaskToColumn({ columnId: 'c1', taskId: 't1' }));
    s = reducer(s, {
      type: updatePipelineItemActivity.fulfilled.type,
      payload: { ids: ['t1'], pipelineStageId: 'missing' },
    });
    expect(s.columns.c1.taskIds).toEqual([]);
  });

  it('removes a deleted stage from the board', () => {
    let s = reducer(initial(), addColumn({ pipelineData: { name: 'A' }, stageId: 'c1' }));
    s = { ...s, stages: [{ stageId: 'c1', name: 'A' }] };
    s = reducer(s, { type: deletePipelineStage.fulfilled.type, payload: { data: { id: 'c1' } } });
    expect(s.columns.c1).toBeUndefined();
    expect(s.columnOrder).toEqual([]);
    expect(s.stages).toEqual([]);
  });

  it('strips deleted items out of every column', () => {
    let s = reducer(initial(), addColumn({ pipelineData: { name: 'A' }, stageId: 'c1' }));
    s = reducer(s, addColumn({ pipelineData: { name: 'B' }, stageId: 'c2' }));
    s = reducer(s, addTaskToColumn({ columnId: 'c1', taskId: 't1' }));
    s = reducer(s, addTaskToColumn({ columnId: 'c2', taskId: 't2' }));
    s = reducer(s, { type: deletePipelineItem.fulfilled.type, payload: { ids: ['t1', 't2'] } });
    expect(s.columns.c1.taskIds).toEqual([]);
    expect(s.columns.c2.taskIds).toEqual([]);
  });

  it('stores a single fetched item', () => {
    const s = reducer(initial(), {
      type: fetchSinglePipelineItem.fulfilled.type,
      payload: { data: { id: 'i1' } },
    });
    expect(s.pipelineItem).toEqual({ id: 'i1' });
  });

  it('records done tasks and documents onto the open item', () => {
    let s = reducer(initial(), {
      type: fetchSinglePipelineItem.fulfilled.type,
      payload: { data: { id: 'i1' } },
    });
    s = reducer(s, {
      type: updatePipelineItemTaskToDone.fulfilled.type,
      payload: { data: { tasks: ['t1'] } },
    });
    expect(s.pipelineItem.doneTasks).toEqual(['t1']);

    s = reducer(s, {
      type: updatePipelineItemDocumentToDone.fulfilled.type,
      payload: { data: { documents: ['d1'] } },
    });
    expect(s.pipelineItem.sentDocuments).toEqual(['d1']);
  });

  it('ignores done tasks and documents when no item is open', () => {
    let s = reducer(initial(), {
      type: updatePipelineItemTaskToDone.fulfilled.type,
      payload: { data: { tasks: ['t1'] } },
    });
    expect(s.pipelineItem).toBeNull();
    s = reducer(s, {
      type: updatePipelineItemDocumentToDone.fulfilled.type,
      payload: { data: { documents: ['d1'] } },
    });
    expect(s.pipelineItem).toBeNull();
  });

  it('marks a candidate update and a reassignment as succeeded', () => {
    expect(reducer(initial(), { type: updateCandidate.fulfilled.type }).status).toBe('succeeded');
    expect(reducer(initial(), { type: reassignCandidateToStaff.fulfilled.type }).status).toBe('succeeded');
  });
});

describe('thunks', () => {
  it('maps pipeline items out of their tenant records', async () => {
    mockGet.mockResolvedValue({
      data: {
        data: [
          {
            id: 'i1',
            createdAt: '2026-01-01',
            completionPercentage: 40,
            status: 'active',
            assignToAdmin: 'a1',
            pipelineStageId: 's9',
            tenant: {
              companyName: 'Acme',
              contactPerson: 'Ada',
              email: 'a@b.co',
              phoneNumber: '555',
              companySize: '10-50',
              organizationType: 'CLINIC',
              location: { city: 'Lagos' },
              leadSource: 'referral',
              admin: { firstName: 'Grace', lastName: 'Hopper' },
            },
            admin: { firstName: 'Alan', lastName: 'Turing' },
          },
        ],
      },
    });
    const store = makeStore();
    const result = await store.dispatch(fetchPipelineItems({ stageId: 's1', ...tokens }));
    const [item] = result.payload.items;
    expect(item.companyName).toBe('Acme');
    expect(item.createdBy).toBe('Grace Hopper');
    expect(item.assignedTo).toBe('Alan Turing');
    expect(item.pipelineStageId).toBe('s9');
  });

  it('fills every blank on a bare item record', async () => {
    mockGet.mockResolvedValue({ data: { data: [{ id: 'i1' }] } });
    const store = makeStore();
    const result = await store.dispatch(fetchPipelineItems({ stageId: 's1', ...tokens }));
    const [item] = result.payload.items;
    expect(item).toEqual(
      expect.objectContaining({
        companyName: '',
        contactPerson: '',
        createdBy: '',
        assignedTo: null,
        assignToAdmin: null,
        pipelineStageId: 's1',
        status: 'pending',
        completionPercentage: 0,
        location: {},
      })
    );
  });

  it('returns no items when the response is not a list', async () => {
    mockGet.mockResolvedValue({ data: { data: 'nope' } });
    const store = makeStore();
    const result = await store.dispatch(fetchPipelineItems({ stageId: 's1', ...tokens }));
    expect(result.payload.items).toEqual([]);
  });

  it('rejects stage creation when the API does not report ok', async () => {
    mockPost.mockResolvedValue({ data: { status: 'error', message: 'duplicate name' } });
    const store = makeStore();
    const result = await store.dispatch(createPipelineStage({ pipelineId: 'p1', name: 'A', ...tokens }));
    expect(result.payload).toBe('duplicate name');
  });

  it('falls back to its own wording when the API reports no message', async () => {
    mockPost.mockResolvedValue({ data: { status: 'error' } });
    const store = makeStore();
    const result = await store.dispatch(createPipelineStage({ pipelineId: 'p1', name: 'A', ...tokens }));
    expect(result.payload).toBe('Failed to create pipeline stage');
  });

  it('defaults non-array task and document lists when creating a stage', async () => {
    mockPost.mockResolvedValue({ data: { status: 'ok', data: { id: 's1', name: 'A' } } });
    const store = makeStore();
    await store.dispatch(
      createPipelineStage({ pipelineId: 'p1', name: 'A', requiredTasks: 'nope', requiredDocuments: null, ...tokens })
    );
    const body = mockPost.mock.calls[0][1];
    expect(body.requiredTasks).toEqual([]);
    expect(body.requiredDocuments).toEqual([]);
  });

  it('mints ids for stage tasks and documents that arrive without one', async () => {
    mockPatch.mockResolvedValue({ data: {} });
    const store = makeStore();

    await store.dispatch(
      updateStageTasks({ pipelineStageId: 's1', requiredTasks: [{ name: 'Call', required: true }], ...tokens })
    );
    expect(mockPatch.mock.calls[0][1].requiredTasks[0].id).toBe('uuid-1');

    await store.dispatch(
      updateStageDocuments({ pipelineStageId: 's1', requiredDocuments: [{ name: 'W-9', required: false }], ...tokens })
    );
    expect(mockPatch.mock.calls[1][1].requiredDocuments[0].id).toBe('uuid-2');
  });

  it('keeps ids that were already assigned', async () => {
    mockPatch.mockResolvedValue({ data: {} });
    const store = makeStore();
    await store.dispatch(
      updateStageTasks({ pipelineStageId: 's1', requiredTasks: [{ id: 'given', name: 'Call', required: true }], ...tokens })
    );
    expect(mockPatch.mock.calls[0][1].requiredTasks[0].id).toBe('given');
  });

  it('surfaces the API layer wording when a fetch fails', async () => {
    mockGet.mockRejectedValue(new Error('Network Error'));
    const store = makeStore();
    const result = await store.dispatch(fetchPipelineStages({ pipelineId: 'p1', ...tokens }));
    expect(result.type).toContain('rejected');
    expect(typeof result.payload).toBe('string');
  });

  it('reports the body message a failing endpoint returns', async () => {
    mockGet.mockRejectedValue({ response: { data: { message: 'no such pipeline' } } });
    const store = makeStore();
    const result = await store.dispatch(fetchPipelineByModule({ ...tokens }));
    expect(result.payload).toBe('no such pipeline');
  });
});

describe('selectors', () => {
  it('read each slice of state', () => {
    const state = {
      pipeline: {
        ...initial(),
        columns: { c1: { id: 'c1' } },
        stages: [{ stageId: 'c1', name: 'A' }],
        status: 'succeeded',
        pipelineItem: { id: 'i1' },
      },
    };
    expect(selectColumns(state)).toEqual({ c1: { id: 'c1' } });
    expect(selectDraft(state)).toEqual(initial().draft);
    expect(selectStages(state)).toEqual([{ stageId: 'c1', name: 'A' }]);
    expect(selectStatus(state)).toBe('succeeded');
    expect(selectPipelineItem(state)).toEqual({ id: 'i1' });
  });
});

describe('stage payloads that are already well formed', () => {
  it('keeps the task and document lists a stage really does carry', () => {
    const s = reducer(initial(), {
      type: fetchSinglePipelineStages.fulfilled.type,
      payload: {
        data: {
          id: 's1',
          requiredTasks: [{ id: 't1', name: 'Call' }],
          requiredDocuments: [{ id: 'd1', name: 'W-9' }],
        },
      },
    });
    expect(s.draft.requiredTasks).toEqual([{ id: 't1', name: 'Call' }]);
    expect(s.draft.requiredDocuments).toEqual([{ id: 'd1', name: 'W-9' }]);
  });

  it('refills a column that already exists instead of rebuilding it', () => {
    // The placeholder branch only runs the first time; a second batch of items
    // for the same stage has to leave the column's own title in place.
    const before = reducer(
      initial(),
      setColumns({ s1: { id: 's1', title: 'Screening', taskIds: ['old'], count: 1 } })
    );
    const s = reducer(before, {
      type: fetchPipelineItems.fulfilled.type,
      payload: { stageId: 's1', items: [{ id: 'i1' }, { id: 'i2' }] },
    });
    expect(s.columns.s1.title).toBe('Screening');
    expect(s.columns.s1.taskIds).toEqual(['i1', 'i2']);
    expect(s.columns.s1.count).toBe(2);
  });
});
