import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

// The slice talks to the TenantApis module, which is mocked here rather than
// the axios layer underneath it. The real API layer rewraps every failure as a
// bare `new Error(message)`, which makes the `error.response?.data?.message`
// arm of each thunk unreachable; mocking one level higher is what lets both
// arms of that fallback be driven.
const { api } = vi.hoisted(() => ({
  api: {
    GetPipelineByModule: vi.fn(),
    GetPipelineStage: vi.fn(),
    GetSinglePipelineItem: vi.fn(),
    GetSinglePipelineStage: vi.fn(),
    GetPipelineItem: vi.fn(),
    CreatePipelineStage: vi.fn(),
    UpdateStageTasks: vi.fn(),
    UpdateStageDocuments: vi.fn(),
    CreateCandidate: vi.fn(),
    ReorderPipelineStage: vi.fn(),
    UpdatePipelineItemActivity: vi.fn(),
    UpdateStageTasksToDone: vi.fn(),
    UpdateStageDocumentsToDone: vi.fn(),
    DeletePipelineStage: vi.fn(),
    DeletePipelineItem: vi.fn(),
    UpdateCandidate: vi.fn(),
    ReassignCandidateToStaff: vi.fn(),
  },
}));
vi.mock('../api/TenantApis', () => ({ default: api }));

import reducer, {
  fetchPipelineByModule,
  fetchPipelineStages,
  fetchSinglePipelineItem,
  fetchSinglePipelineStages,
  fetchPipelineItems,
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
} from '../ReduxStore/features/PipelineSlice';

/**
 * The request side of the pipeline slice.
 *
 * `PipelineSlice.test.js` covers the reducers and the handful of thunk paths
 * that shape data on the way back; this file covers what each thunk sends, and
 * how each one reports a failure.
 *
 * Three of the seventeen thunks take an id that may be a single value or a
 * list and normalise it to a list both on the request and on the payload they
 * return, so the two shapes are pinned separately. And the failure wording is
 * not uniform: most thunks prefer the response body's message and fall back to
 * the error's own, while the three list thunks use the error message with a
 * hard-coded fallback of their own, so a failure carrying no message at all
 * reads differently depending on which thunk produced it.
 */

const makeStore = () => configureStore({ reducer: { pipeline: reducer } });
const tokens = { accessToken: 'at', refreshToken: 'rt' };

// The two failure shapes a thunk can see: one from a server that answered with
// a body, and one from a transport error that never reached the server.
const withBody = (message) => ({ response: { data: { message } } });
const bareError = (message) => new Error(message);

const run = (thunk, arg = {}) => makeStore().dispatch(thunk({ ...tokens, ...arg }));

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(api).forEach((fn) => fn.mockResolvedValue({ data: {} }));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('what each read thunk asks for', () => {
  it('always asks for the tenant module pipeline', async () => {
    api.GetPipelineByModule.mockResolvedValue({ data: { data: [{ id: 'p1' }] } });
    const result = await run(fetchPipelineByModule);

    expect(api.GetPipelineByModule).toHaveBeenCalledWith({
      modules: 'TENANT',
      ...tokens,
    });
    expect(result.payload).toEqual({ data: [{ id: 'p1' }] });
  });

  it('asks for the stages of one pipeline', async () => {
    api.GetPipelineStage.mockResolvedValue({ data: { data: [] } });
    const result = await run(fetchPipelineStages, { pipelineId: 'p1' });

    expect(api.GetPipelineStage).toHaveBeenCalledWith({ pipelineId: 'p1', ...tokens });
    expect(result.type).toContain('fulfilled');
  });

  it('asks for one stage by id', async () => {
    api.GetSinglePipelineStage.mockResolvedValue({ data: { data: { id: 's1' } } });
    const result = await run(fetchSinglePipelineStages, { pipelineStageId: 's1' });

    expect(api.GetSinglePipelineStage).toHaveBeenCalledWith({
      pipelineStageId: 's1',
      ...tokens,
    });
    expect(result.payload.data.id).toBe('s1');
  });

  it('asks for one pipeline item by id', async () => {
    api.GetSinglePipelineItem.mockResolvedValue({ data: { data: { id: 'i1' } } });
    const result = await run(fetchSinglePipelineItem, { itemId: 'i1' });

    expect(api.GetSinglePipelineItem).toHaveBeenCalledWith({ itemId: 'i1', ...tokens });
    expect(result.payload.data.id).toBe('i1');
  });

  it('asks for the items of one stage', async () => {
    api.GetPipelineItem.mockResolvedValue({ data: { data: [] } });
    await run(fetchPipelineItems, { stageId: 's1' });
    expect(api.GetPipelineItem).toHaveBeenCalledWith({ stageId: 's1', ...tokens });
  });
});

describe('mapping a pipeline item', () => {
  it('reports no assignee when the assigned admin has no name on record', async () => {
    // The admin object exists, so the ternary passes, but joining two blank
    // names leaves an empty string that has to come back as null.
    api.GetPipelineItem.mockResolvedValue({
      data: { data: [{ id: 'i1', admin: { firstName: '', lastName: '' } }] },
    });
    const result = await run(fetchPipelineItems, { stageId: 's1' });
    expect(result.payload.items[0].assignedTo).toBeNull();
  });

  it('uses whichever half of an admin name is on record', async () => {
    api.GetPipelineItem.mockResolvedValue({
      data: {
        data: [
          { id: 'i1', admin: { firstName: 'Alan' } },
          { id: 'i2', admin: { lastName: 'Turing' } },
        ],
      },
    });
    const result = await run(fetchPipelineItems, { stageId: 's1' });
    expect(result.payload.items[0].assignedTo).toBe('Alan');
    expect(result.payload.items[1].assignedTo).toBe('Turing');
  });

  it('reports an empty creator when the tenant has no admin at all', async () => {
    api.GetPipelineItem.mockResolvedValue({
      data: { data: [{ id: 'i1', tenant: { companyName: 'Acme' } }] },
    });
    const result = await run(fetchPipelineItems, { stageId: 's1' });
    expect(result.payload.items[0].createdBy).toBe('');
    expect(result.payload.items[0].companyName).toBe('Acme');
  });

  it('returns no items when the payload has no data key at all', async () => {
    api.GetPipelineItem.mockResolvedValue({ data: {} });
    const result = await run(fetchPipelineItems, { stageId: 's1' });
    expect(result.payload).toEqual({ stageId: 's1', items: [] });
  });
});

describe('creating and editing stages', () => {
  it('sends the task and document lists it was given when they are lists', async () => {
    api.CreatePipelineStage.mockResolvedValue({
      data: { status: 'ok', data: { id: 's1', name: 'Screening' } },
    });
    const requiredTasks = [{ id: 't1', name: 'Call', required: true }];
    const requiredDocuments = [{ id: 'd1', name: 'W-9', required: false }];

    const result = await run(createPipelineStage, {
      pipelineId: 'p1',
      name: 'Screening',
      description: 'First contact',
      colourCode: '#fff',
      requiredTasks,
      requiredDocuments,
    });

    expect(api.CreatePipelineStage).toHaveBeenCalledWith({
      pipelineId: 'p1',
      name: 'Screening',
      description: 'First contact',
      colourCode: '#fff',
      requiredTasks,
      requiredDocuments,
      ...tokens,
    });
    expect(result.payload.data.id).toBe('s1');
  });

  it('defaults both lists when the caller omits them entirely', async () => {
    api.CreatePipelineStage.mockResolvedValue({ data: { status: 'ok', data: { id: 's1' } } });
    await run(createPipelineStage, { pipelineId: 'p1', name: 'A' });

    const body = api.CreatePipelineStage.mock.calls[0][0];
    expect(body.requiredTasks).toEqual([]);
    expect(body.requiredDocuments).toEqual([]);
  });

  it('returns the stage id alongside the tasks it saved', async () => {
    const result = await run(updateStageTasks, {
      pipelineStageId: 's1',
      requiredTasks: [{ id: 't1', name: 'Call', required: true }],
    });
    expect(result.payload).toEqual({
      pipelineStageId: 's1',
      requiredTasks: [{ id: 't1', name: 'Call', required: true }],
    });
  });

  it('returns the stage id alongside the documents it saved', async () => {
    const result = await run(updateStageDocuments, {
      pipelineStageId: 's1',
      requiredDocuments: [{ id: 'd1', name: 'W-9', required: false }],
    });
    expect(result.payload).toEqual({
      pipelineStageId: 's1',
      requiredDocuments: [{ id: 'd1', name: 'W-9', required: false }],
    });
  });

  it('reorders a stage by id', async () => {
    api.ReorderPipelineStage.mockResolvedValue({ data: { data: { id: 's1', order: 3 } } });
    const result = await run(reorderPipelineStage, { id: 's1', order: 3 });

    expect(api.ReorderPipelineStage).toHaveBeenCalledWith({ id: 's1', order: 3, ...tokens });
    expect(result.payload.data.order).toBe(3);
  });

  it('deletes a stage by id', async () => {
    api.DeletePipelineStage.mockResolvedValue({ data: { data: { id: 's1' } } });
    const result = await run(deletePipelineStage, { id: 's1' });

    expect(api.DeletePipelineStage).toHaveBeenCalledWith({ id: 's1', ...tokens });
    expect(result.payload.data.id).toBe('s1');
  });
});

describe('creating and editing candidates', () => {
  it('forwards the whole candidate record, keeping the staff assignment', async () => {
    api.CreateCandidate.mockResolvedValue({ data: { data: { id: 'c1' } } });
    const result = await run(createCandidate, {
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phoneNumber: '555',
      stage: 'NEW',
      companyName: 'Acme',
      contactPerson: 'Ada',
      companySize: '10-50',
      organizationType: 'CLINIC',
      location: { city: 'Lagos' },
      leadSource: 'referral',
      pipelineStageId: 's1',
      assignToStaff: 'a1',
      createdBy: 'admin-1',
    });

    const body = api.CreateCandidate.mock.calls[0][0];
    expect(body.assignToStaff).toBe('a1');
    expect(body.pipelineStageId).toBe('s1');
    expect(body.location).toEqual({ city: 'Lagos' });
    expect(result.payload.data.id).toBe('c1');
  });

  it('forwards an edited candidate, including its subdomain', async () => {
    api.UpdateCandidate.mockResolvedValue({ data: { data: { id: 'c1' } } });
    await run(updateCandidate, {
      id: 'c1',
      companyName: 'Acme',
      subdomain: 'acme',
      assignToAdmin: 'a1',
      pipelineStageId: 's1',
    });

    const body = api.UpdateCandidate.mock.calls[0][0];
    expect(body.id).toBe('c1');
    expect(body.subdomain).toBe('acme');
    expect(body.assignToAdmin).toBe('a1');
  });
});

describe('the thunks that take either one id or many', () => {
  it('wraps a single id when moving an item to another stage', async () => {
    const result = await run(updatePipelineItemActivity, {
      ids: 'i1',
      pipelineStageId: 's2',
    });

    expect(api.UpdatePipelineItemActivity).toHaveBeenCalledWith({
      ids: ['i1'],
      pipelineStageId: 's2',
      ...tokens,
    });
    // The payload carries the ids back so the reducer can move them.
    expect(result.payload.ids).toEqual(['i1']);
    expect(result.payload.pipelineStageId).toBe('s2');
  });

  it('keeps a list of ids as it is when moving items', async () => {
    await run(updatePipelineItemActivity, { ids: ['i1', 'i2'], pipelineStageId: 's2' });
    expect(api.UpdatePipelineItemActivity.mock.calls[0][0].ids).toEqual(['i1', 'i2']);
  });

  it('wraps a single id when deleting an item', async () => {
    const result = await run(deletePipelineItem, { ids: 'i1' });
    expect(api.DeletePipelineItem).toHaveBeenCalledWith({ ids: ['i1'], ...tokens });
    expect(result.payload.ids).toEqual(['i1']);
  });

  it('keeps a list of ids as it is when deleting items', async () => {
    const result = await run(deletePipelineItem, { ids: ['i1', 'i2'] });
    expect(result.payload.ids).toEqual(['i1', 'i2']);
  });

  it('wraps a single id when reassigning a candidate', async () => {
    const result = await run(reassignCandidateToStaff, { ids: 'c1', assignToAdmin: 'a1' });
    expect(api.ReassignCandidateToStaff).toHaveBeenCalledWith({
      ids: ['c1'],
      assignToAdmin: 'a1',
      ...tokens,
    });
    expect(result.payload.ids).toEqual(['c1']);
  });

  it('keeps a list of ids as it is when reassigning candidates', async () => {
    const result = await run(reassignCandidateToStaff, { ids: ['c1', 'c2'], assignToAdmin: 'a1' });
    expect(result.payload.ids).toEqual(['c1', 'c2']);
  });
});

describe('marking an item task or document done', () => {
  it('sends the done tasks and returns what came back', async () => {
    api.UpdateStageTasksToDone.mockResolvedValue({ data: { data: { tasks: ['t1'] } } });
    const result = await run(updatePipelineItemTaskToDone, {
      pipelineItemId: 'i1',
      doneTasks: ['t1'],
    });

    expect(api.UpdateStageTasksToDone).toHaveBeenCalledWith({
      pipelineItemId: 'i1',
      doneTasks: ['t1'],
      ...tokens,
    });
    expect(result.payload.data.tasks).toEqual(['t1']);
  });

  it('sends the sent documents and returns what came back', async () => {
    api.UpdateStageDocumentsToDone.mockResolvedValue({
      data: { data: { documents: ['d1'] } },
    });
    const result = await run(updatePipelineItemDocumentToDone, {
      pipelineItemId: 'i1',
      documents: ['d1'],
    });

    expect(api.UpdateStageDocumentsToDone).toHaveBeenCalledWith({
      pipelineItemId: 'i1',
      documents: ['d1'],
      ...tokens,
    });
    expect(result.payload.data.documents).toEqual(['d1']);
  });

  it('logs the response body in development when marking a task fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.UpdateStageTasksToDone.mockRejectedValue(withBody('task already done'));

    const result = await run(updatePipelineItemTaskToDone, { pipelineItemId: 'i1' });
    expect(log).toHaveBeenCalledWith('THUNK ERROR:', { message: 'task already done' });
    expect(result.payload).toBe('task already done');
  });

  it('logs the bare message when there is no response body', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.UpdateStageTasksToDone.mockRejectedValue(bareError('offline'));

    await run(updatePipelineItemTaskToDone, { pipelineItemId: 'i1' });
    expect(log).toHaveBeenCalledWith('THUNK ERROR:', 'offline');
  });

  it('logs nothing at all in a production build', async () => {
    vi.stubEnv('DEV', false);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.UpdateStageTasksToDone.mockRejectedValue(bareError('offline'));

    const result = await run(updatePipelineItemTaskToDone, { pipelineItemId: 'i1' });
    expect(log).not.toHaveBeenCalled();
    expect(result.payload).toBe('offline');
  });
});

describe('how a failure is reported', () => {
  // Every thunk in this group prefers the message the server put in the body,
  // and falls back to whatever the thrown error itself carries.
  const bodyFirst = [
    ['fetchPipelineByModule', fetchPipelineByModule, 'GetPipelineByModule', {}],
    ['fetchPipelineStages', fetchPipelineStages, 'GetPipelineStage', { pipelineId: 'p1' }],
    ['fetchSinglePipelineStages', fetchSinglePipelineStages, 'GetSinglePipelineStage', { pipelineStageId: 's1' }],
    ['fetchSinglePipelineItem', fetchSinglePipelineItem, 'GetSinglePipelineItem', { itemId: 'i1' }],
    ['fetchPipelineItems', fetchPipelineItems, 'GetPipelineItem', { stageId: 's1' }],
    ['createPipelineStage', createPipelineStage, 'CreatePipelineStage', { pipelineId: 'p1' }],
    ['updateStageTasks', updateStageTasks, 'UpdateStageTasks', { pipelineStageId: 's1', requiredTasks: [] }],
    ['updateStageDocuments', updateStageDocuments, 'UpdateStageDocuments', { pipelineStageId: 's1', requiredDocuments: [] }],
    ['createCandidate', createCandidate, 'CreateCandidate', {}],
    ['reorderPipelineStage', reorderPipelineStage, 'ReorderPipelineStage', { id: 's1' }],
    ['deletePipelineStage', deletePipelineStage, 'DeletePipelineStage', { id: 's1' }],
    ['updateCandidate', updateCandidate, 'UpdateCandidate', { id: 'c1' }],
    ['updatePipelineItemDocumentToDone', updatePipelineItemDocumentToDone, 'UpdateStageDocumentsToDone', { pipelineItemId: 'i1' }],
  ];

  it.each(bodyFirst)('%s prefers the message in the response body', async (_name, thunk, fn, arg) => {
    api[fn].mockRejectedValue(withBody('the server said no'));
    const result = await run(thunk, arg);
    expect(result.type).toContain('rejected');
    expect(result.payload).toBe('the server said no');
  });

  it.each(bodyFirst)('%s falls back to the error message', async (_name, thunk, fn, arg) => {
    api[fn].mockRejectedValue(bareError('Network Error'));
    const result = await run(thunk, arg);
    expect(result.payload).toBe('Network Error');
  });

  // These three never look at the response body; they have wording of their own
  // for a failure that carries no message.
  const messageOnly = [
    ['updatePipelineItemActivity', updatePipelineItemActivity, 'UpdatePipelineItemActivity', { ids: 'i1' }, 'Failed to update pipeline item activity'],
    ['deletePipelineItem', deletePipelineItem, 'DeletePipelineItem', { ids: 'i1' }, 'Failed to delete pipeline item'],
    ['reassignCandidateToStaff', reassignCandidateToStaff, 'ReassignCandidateToStaff', { ids: 'c1' }, 'Failed to reassign candidate to staff'],
  ];

  it.each(messageOnly)('%s reports the error message it was given', async (_name, thunk, fn, arg) => {
    api[fn].mockRejectedValue(bareError('Network Error'));
    const result = await run(thunk, arg);
    expect(result.payload).toBe('Network Error');
  });

  it.each(messageOnly)('%s uses its own wording for a silent failure', async (_name, thunk, fn, arg, fallback) => {
    api[fn].mockRejectedValue({ code: 'ECONNRESET' });
    const result = await run(thunk, arg);
    expect(result.payload).toBe(fallback);
  });

  it('ignores the response body even when a list thunk fails with one', async () => {
    // Unlike its neighbours this thunk never reads `error.response`, so a
    // server message is lost and the axios error's own wording is reported.
    api.DeletePipelineItem.mockRejectedValue({
      message: 'Request failed with status code 409',
      response: { data: { message: 'item is locked' } },
    });
    const result = await run(deletePipelineItem, { ids: 'i1' });
    expect(result.payload).toBe('Request failed with status code 409');
  });
});
