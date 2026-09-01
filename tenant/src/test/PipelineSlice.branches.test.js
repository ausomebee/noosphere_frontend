import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();
const mockPut = vi.fn();

vi.mock("../Helper/AxiosInterceptor", () => ({
  default: () => ({
    get: mockGet,
    post: mockPost,
    patch: mockPatch,
    delete: mockDelete,
    put: mockPut,
  }),
}));

vi.mock("uuid", () => ({ v4: () => "mock-uuid" }));

import reducer, {
  deleteColumn,
  addColumn,
  updateColumnTaskIds,
  addTaskToColumn,
  removeTaskFromColumn,
  fetchPipelineByTenantId,
  fetchPipelineStages,
  fetchSinglePipelineStages,
  fetchPipelineItems,
  fetchSinglePipelineItem,
  createPipelineStage,
  createCandidate,
  reorderPipelineStage,
  updatePipelineItemActivity,
  deletePipelineStage,
  deletePipelineItem,
  updateCandidate,
} from "../ReduxStore/features/PipelineSlice";

/**
 * Branch coverage for the pipeline board slice.
 *
 * The three existing pipeline suites drive the happy paths. This one takes the
 * other arm of each guard: rejections that arrive without a rejectWithValue
 * payload, API failures with and without a body message, missing columns, and
 * the single/array shape juggling the bulk endpoints do.
 */

const initial = () => reducer(undefined, { type: "@@INIT" });
const makeStore = () => configureStore({ reducer: { pipeline: reducer } });
const tokens = { accessToken: "at", refreshToken: "rt" };

// A rejection with no payload, as produced when a thunk throws outside its own
// try/catch -- the reducer then has to fall back to action.error.message.
const bareRejection = (thunk) => ({
  type: thunk.rejected.type,
  payload: undefined,
  error: { message: "network down" },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("column reducers", () => {
  const withColumn = () =>
    reducer(
      initial(),
      addColumn({ pipelineData: { name: "Intake" }, index: 0, stageId: "c1" })
    );

  it("ignores a delete for a column that is not there", () => {
    const before = withColumn();
    expect(reducer(before, deleteColumn("nope"))).toEqual(before);
  });

  it("deletes a column, its order entry and its stage", () => {
    const s = reducer(withColumn(), deleteColumn("c1"));
    expect(s.columns.c1).toBeUndefined();
    expect(s.columnOrder).not.toContain("c1");
  });

  it("ignores task edits aimed at a missing column", () => {
    const before = initial();
    expect(reducer(before, updateColumnTaskIds({ columnId: "x", taskIds: ["t"] }))).toEqual(
      before
    );
    expect(reducer(before, addTaskToColumn({ columnId: "x", taskId: "t" }))).toEqual(before);
    expect(reducer(before, removeTaskFromColumn({ columnId: "x", taskId: "t" }))).toEqual(
      before
    );
  });

  it("ignores an add with no task id", () => {
    const before = withColumn();
    expect(reducer(before, addTaskToColumn({ columnId: "c1", taskId: null }))).toEqual(before);
  });

  it("filters out non-string task ids", () => {
    const s = reducer(
      withColumn(),
      updateColumnTaskIds({ columnId: "c1", taskIds: ["t1", null, 7, undefined] })
    );
    expect(s.columns.c1.taskIds).toEqual(["t1"]);
    expect(s.columns.c1.count).toBe(1);
  });

  it("appends a column when the index is out of range", () => {
    let s = reducer(
      initial(),
      addColumn({ pipelineData: { name: "A" }, index: 0, stageId: "c1" })
    );
    s = reducer(s, addColumn({ pipelineData: { name: "B" }, index: 99, stageId: "c2" }));
    expect(s.columnOrder).toEqual(["c1", "c2"]);
  });

  it("mints its own id when no stage id is supplied", () => {
    const s = reducer(initial(), addColumn({ pipelineData: { name: "A" } }));
    expect(s.columnOrder).toEqual(["mock-uuid"]);
    expect(s.columns["mock-uuid"].title).toBe("A");
  });

  it("names an unnamed column", () => {
    const s = reducer(initial(), addColumn({ pipelineData: {}, stageId: "c1" }));
    expect(s.columns.c1.title).toBe("New Stage");
  });
});

describe("rejections that carry no payload", () => {
  const thunks = [
    fetchPipelineByTenantId,
    fetchPipelineStages,
    fetchSinglePipelineStages,
    fetchPipelineItems,
    fetchSinglePipelineItem,
    createPipelineStage,
    createCandidate,
    reorderPipelineStage,
    updatePipelineItemActivity,
    deletePipelineStage,
    deletePipelineItem,
    updateCandidate,
  ];

  it.each(thunks.map((t) => [t.typePrefix, t]))(
    "%s falls back to the thrown error's message",
    (_name, thunk) => {
      const s = reducer(initial(), bareRejection(thunk));
      expect(s.status).toBe("failed");
      expect(s.error).toBe("network down");
    }
  );
});

describe("fulfilled arms with sparse payloads", () => {
  it("stores no pipeline when the tenant has none", () => {
    const s = reducer(initial(), {
      type: fetchPipelineByTenantId.fulfilled.type,
      payload: { data: [] },
    });
    expect(s.pipeline).toBeNull();
  });

  it("treats a stage list of undefined as empty", () => {
    const s = reducer(initial(), {
      type: fetchPipelineStages.fulfilled.type,
      payload: {},
    });
    expect(s.columnOrder).toEqual([]);
    expect(s.stages).toEqual([]);
  });

  it("defaults a stage with no order to zero", () => {
    const s = reducer(initial(), {
      type: fetchPipelineStages.fulfilled.type,
      payload: { data: [{ id: "s1", name: "One" }] },
    });
    expect(s.columns.s1.order).toBe(0);
  });

  it("leaves the draft alone when a single stage comes back empty", () => {
    const before = initial();
    const s = reducer(before, {
      type: fetchSinglePipelineStages.fulfilled.type,
      payload: { data: null },
    });
    expect(s.draft).toEqual(before.draft);
  });

  it("fills the draft's blanks for a sparse stage", () => {
    const s = reducer(initial(), {
      type: fetchSinglePipelineStages.fulfilled.type,
      payload: { data: { id: "s1" } },
    });
    expect(s.draft).toEqual({
      id: "s1",
      name: "",
      description: "",
      colorCode: "#1E40AF",
    });
  });

  it("creates a placeholder column for items that arrive before their stage", () => {
    const s = reducer(initial(), {
      type: fetchPipelineItems.fulfilled.type,
      payload: { stageId: "abcdefghijkl", items: [{ id: "i1" }, {}, null, { id: 7 }] },
    });
    expect(s.columns.abcdefghijkl.title).toBe("Stage abcdefgh");
    expect(s.columns.abcdefghijkl.taskIds).toEqual(["i1"]);
    expect(s.columns.abcdefghijkl.count).toBe(1);
  });

  it("defaults the item list to empty", () => {
    const s = reducer(initial(), {
      type: fetchPipelineItems.fulfilled.type,
      payload: { stageId: "s1" },
    });
    expect(s.columns.s1.taskIds).toEqual([]);
  });

  it("ignores a created stage that came back empty", () => {
    const before = initial();
    const s = reducer(before, {
      type: createPipelineStage.fulfilled.type,
      payload: { data: null },
    });
    expect(s.columnOrder).toEqual([]);
  });

  it("places a created stage without an order at the end", () => {
    let s = reducer(
      initial(),
      addColumn({ pipelineData: { name: "A", order: 0 }, stageId: "c1" })
    );
    s = reducer(s, {
      type: createPipelineStage.fulfilled.type,
      payload: { data: { id: "c2", name: "B" } },
    });
    expect(s.columnOrder).toEqual(["c1", "c2"]);
    expect(s.columns.c2.order).toBe(1);
  });

  it("ignores a created candidate with no stage", () => {
    const before = initial();
    expect(
      reducer(before, { type: createCandidate.fulfilled.type, payload: { data: null } })
    ).toEqual({ ...before, status: "succeeded" });
    expect(
      reducer(before, { type: createCandidate.fulfilled.type, payload: { data: { id: "x" } } })
    ).toEqual({ ...before, status: "succeeded" });
  });

  it("ignores a created candidate whose stage column is not loaded", () => {
    const s = reducer(initial(), {
      type: createCandidate.fulfilled.type,
      payload: { data: { id: "x", pipelineStageId: "missing" } },
    });
    expect(s.columns.missing).toBeUndefined();
  });

  it("adds a created candidate to its column", () => {
    let s = reducer(initial(), addColumn({ pipelineData: { name: "A" }, stageId: "c1" }));
    s = reducer(s, {
      type: createCandidate.fulfilled.type,
      payload: { data: { id: "x", pipelineStageId: "c1" } },
    });
    expect(s.columns.c1.taskIds).toEqual(["x"]);
  });

  it("ignores a reorder for a column it does not hold", () => {
    const before = initial();
    const s = reducer(before, {
      type: reorderPipelineStage.fulfilled.type,
      payload: { data: { id: "missing", order: 3 } },
    });
    expect(s.columnOrder).toEqual([]);
  });

  it("applies a reorder for a known column", () => {
    let s = reducer(initial(), addColumn({ pipelineData: { name: "A" }, stageId: "c1" }));
    s = reducer(s, {
      type: reorderPipelineStage.fulfilled.type,
      payload: { data: { id: "c1", order: 5 } },
    });
    expect(s.columns.c1.order).toBe(5);
  });

  it("ignores a delete for a stage it does not hold", () => {
    const before = initial();
    const s = reducer(before, {
      type: deletePipelineStage.fulfilled.type,
      payload: { id: "missing" },
    });
    expect(s.columnOrder).toEqual([]);
  });

  it("moves an item between columns and skips one already in place", () => {
    let s = reducer(initial(), addColumn({ pipelineData: { name: "A" }, stageId: "c1" }));
    s = reducer(s, addColumn({ pipelineData: { name: "B" }, stageId: "c2" }));
    s = reducer(s, addTaskToColumn({ columnId: "c1", taskId: "t1" }));
    s = reducer(s, addTaskToColumn({ columnId: "c2", taskId: "t2" }));

    s = reducer(s, {
      type: updatePipelineItemActivity.fulfilled.type,
      payload: { ids: ["t1", "t2"], pipelineStageId: "c2" },
    });
    expect(s.columns.c1.taskIds).toEqual([]);
    expect(s.columns.c2.taskIds).toEqual(["t2", "t1"]);
    expect(s.columns.c2.count).toBe(2);
  });

  it("tolerates a move to a stage that has no column", () => {
    let s = reducer(initial(), addColumn({ pipelineData: { name: "A" }, stageId: "c1" }));
    s = reducer(s, addTaskToColumn({ columnId: "c1", taskId: "t1" }));
    s = reducer(s, {
      type: updatePipelineItemActivity.fulfilled.type,
      payload: { ids: ["t1"], pipelineStageId: "missing" },
    });
    expect(s.columns.c1.taskIds).toEqual([]);
  });
});

describe("thunk error wording", () => {
  it("prefers the API's message over the transport error", async () => {
    mockGet.mockRejectedValue({
      response: { data: { message: "no such tenant" } },
      message: "Request failed",
    });
    const store = makeStore();
    const result = await store.dispatch(fetchPipelineByTenantId({ tenantId: "t1", ...tokens }));
    expect(result.payload).toBe("no such tenant");
  });

  it("falls back to the API layer's own wording when the body carries none", async () => {
    // TenantApis rethrows a plain Error, so by the time the thunk catches it
    // there is no `response` left -- only the message the API layer chose.
    mockGet.mockRejectedValue(new Error("Network Error"));
    const store = makeStore();
    const result = await store.dispatch(fetchPipelineStages({ pipelineId: "p1", ...tokens }));
    expect(result.payload).toBe("Get Pipeline Stage failed");
  });
});

describe("fetchPipelineItems mapping", () => {
  it("returns no items when the response is not a list", async () => {
    mockGet.mockResolvedValue({ data: { data: "nope" } });
    const store = makeStore();
    const result = await store.dispatch(fetchPipelineItems({ stageId: "s1", ...tokens }));
    expect(result.payload).toEqual({ stageId: "s1", items: [] });
  });

  it("fills every blank on a bare item record", async () => {
    mockGet.mockResolvedValue({ data: { data: [{ id: "i1" }] } });
    const store = makeStore();
    const result = await store.dispatch(fetchPipelineItems({ stageId: "s1", ...tokens }));
    const [item] = result.payload.items;
    expect(item).toEqual(
      expect.objectContaining({
        id: "i1",
        clientId: "",
        firstName: "",
        lastName: "",
        fullName: "Unknown Candidate",
        createdBy: "Unknown Admin",
        tenantClientId: "Unknown Id",
        clientPortalAccess: false,
        pipelineStageId: "s1",
        status: "pending",
        assignToClinicians: null,
      })
    );
  });

  it("reads the creator and tenant link from a fully-populated record", async () => {
    mockGet.mockResolvedValue({
      data: {
        data: [
          {
            id: "i1",
            assignToClinician: ["u1"],
            clientPortalAccess: true,
            pipelineStageId: "s2",
            status: "active",
            createdAt: "2026-01-01",
            client: {
              id: "cl1",
              firstName: "Ada",
              lastName: "Lovelace",
              tenantLinks: [{ id: "tl1", tenantStaff: { fullName: "Dr Admin" } }],
            },
          },
        ],
      },
    });
    const store = makeStore();
    const result = await store.dispatch(fetchPipelineItems({ stageId: "s1", ...tokens }));
    const [item] = result.payload.items;
    expect(item.fullName).toBe("Ada Lovelace");
    expect(item.createdBy).toBe("Dr Admin");
    expect(item.tenantClientId).toBe("tl1");
    expect(item.pipelineStageId).toBe("s2");
  });

  it("falls back to the defaults when tenantLinks is empty", async () => {
    mockGet.mockResolvedValue({
      data: { data: [{ id: "i1", client: { firstName: "Ada", tenantLinks: [] } }] },
    });
    const store = makeStore();
    const result = await store.dispatch(fetchPipelineItems({ stageId: "s1", ...tokens }));
    expect(result.payload.items[0].createdBy).toBe("Unknown Admin");
    expect(result.payload.items[0].tenantClientId).toBe("Unknown Id");
  });
});

describe("createPipelineStage status check", () => {
  it("rejects with the API's own message when the status is not ok", async () => {
    mockPost.mockResolvedValue({ data: { status: "error", message: "duplicate name" } });
    const store = makeStore();
    const result = await store.dispatch(
      createPipelineStage({ pipelineId: "p1", name: "A", ...tokens })
    );
    expect(result.payload).toBe("duplicate name");
  });

  it("falls back to its own wording when the API sends none", async () => {
    mockPost.mockResolvedValue({ data: { status: "error" } });
    const store = makeStore();
    const result = await store.dispatch(
      createPipelineStage({ pipelineId: "p1", name: "A", ...tokens })
    );
    expect(result.payload).toBe("Failed to create pipeline stage");
  });
});

describe("bulk endpoints accept a single id or a list", () => {
  it("wraps a single id for the activity update, and passes a list through", async () => {
    mockPatch.mockResolvedValue({ data: { ok: true } });
    const store = makeStore();

    await store.dispatch(
      updatePipelineItemActivity({ ids: "t1", pipelineStageId: "c1", ...tokens })
    );
    expect(mockPatch.mock.calls[0][1].ids).toEqual(["t1"]);

    const result = await store.dispatch(
      updatePipelineItemActivity({ ids: ["t1", "t2"], pipelineStageId: "c1", ...tokens })
    );
    expect(result.payload.ids).toEqual(["t1", "t2"]);
  });

  it("surfaces the API layer's wording when the activity update fails", async () => {
    mockPatch.mockRejectedValue({});
    const store = makeStore();
    const result = await store.dispatch(
      updatePipelineItemActivity({ ids: "t1", pipelineStageId: "c1", ...tokens })
    );
    expect(result.payload).toBe("Update Pipeline Item Activity failed");
  });

  it("wraps a single id for the item delete, and passes a list through", async () => {
    mockDelete.mockResolvedValue({ data: { ok: true } });
    const store = makeStore();

    const single = await store.dispatch(deletePipelineItem({ ids: "t1", ...tokens }));
    expect(single.payload.ids).toEqual(["t1"]);

    const many = await store.dispatch(deletePipelineItem({ ids: ["t1", "t2"], ...tokens }));
    expect(many.payload.ids).toEqual(["t1", "t2"]);
  });

  it("reports its own wording when the item delete fails", async () => {
    mockDelete.mockRejectedValue({});
    const store = makeStore();
    const result = await store.dispatch(deletePipelineItem({ ids: ["t1"], ...tokens }));
    expect(result.payload).toBe("Delete Pipeline Item failed");
  });
});

describe("deletePipelineStage guards", () => {
  const seed = (store, { withTask } = {}) => {
    store.dispatch(addColumn({ pipelineData: { name: "A" }, stageId: "c1" }));
    store.dispatch(addColumn({ pipelineData: { name: "B" }, stageId: "c2" }));
    if (withTask) store.dispatch(addTaskToColumn({ columnId: withTask, taskId: "t1" }));
  };

  it("refuses to delete the first column while it still holds candidates", async () => {
    const store = makeStore();
    seed(store, { withTask: "c1" });
    const result = await store.dispatch(deletePipelineStage({ id: "c1", ...tokens }));
    expect(result.payload).toContain("Cannot delete first column");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("moves a later column's candidates to the first column before deleting", async () => {
    mockPatch.mockResolvedValue({ data: { ok: true } });
    mockDelete.mockResolvedValue({ data: { id: "c2" } });
    const store = makeStore();
    seed(store, { withTask: "c2" });

    const result = await store.dispatch(deletePipelineStage({ id: "c2", ...tokens }));
    expect(mockPatch.mock.calls[0][1]).toEqual(
      expect.objectContaining({ ids: ["t1"], pipelineStageId: "c1" })
    );
    expect(result.type).toContain("fulfilled");
  });

  it("deletes an empty column outright", async () => {
    mockDelete.mockResolvedValue({ data: { id: "c2" } });
    const store = makeStore();
    seed(store);
    const result = await store.dispatch(deletePipelineStage({ id: "c2", ...tokens }));
    expect(mockPatch).not.toHaveBeenCalled();
    expect(result.type).toContain("fulfilled");
  });

  it("deletes an empty first column outright", async () => {
    mockDelete.mockResolvedValue({ data: { id: "c1" } });
    const store = makeStore();
    seed(store);
    const result = await store.dispatch(deletePipelineStage({ id: "c1", ...tokens }));
    expect(result.type).toContain("fulfilled");
  });

  it("copes with a delete for a stage the board never loaded", async () => {
    mockDelete.mockResolvedValue({ data: { id: "gone" } });
    const store = makeStore();
    const result = await store.dispatch(deletePipelineStage({ id: "gone", ...tokens }));
    expect(result.type).toContain("fulfilled");
  });
});

describe("candidate write thunks", () => {
  it("maps phone and zip onto the API's field names when creating", async () => {
    mockPost.mockResolvedValue({ data: { data: { id: "x" } } });
    const store = makeStore();
    await store.dispatch(
      createCandidate({ firstName: "Ada", phone: "555", zip: "90210", ...tokens })
    );
    const body = mockPost.mock.calls[0][1];
    expect(body.phoneNumber).toBe("555");
    expect(body.zipCode).toBe("90210");
  });

  it("reports the API's message when creating fails", async () => {
    mockPost.mockRejectedValue({ response: { data: { message: "duplicate email" } } });
    const store = makeStore();
    const result = await store.dispatch(createCandidate({ firstName: "Ada", ...tokens }));
    expect(result.payload).toBe("duplicate email");
  });

  it("maps phone and zip the same way when updating", async () => {
    // UpdateCandidate is the one candidate write that goes over PUT.
    mockPut.mockResolvedValue({ data: { data: { id: "x" } } });
    const store = makeStore();
    await store.dispatch(
      updateCandidate({ id: "x", phone: "555", zip: "90210", ...tokens })
    );
    const body = mockPut.mock.calls[0][1];
    expect(body.phoneNumber).toBe("555");
    expect(body.zipCode).toBe("90210");
  });

  it("surfaces the API layer's wording when updating fails", async () => {
    mockPut.mockRejectedValue(new Error("Network Error"));
    const store = makeStore();
    const result = await store.dispatch(updateCandidate({ id: "x", ...tokens }));
    expect(result.payload).toBe("Update Candidate failed");
  });

  it("reports the API's message when reordering fails", async () => {
    mockPatch.mockRejectedValue({ response: { data: { message: "bad order" } } });
    const store = makeStore();
    const result = await store.dispatch(reorderPipelineStage({ id: "c1", order: 1, ...tokens }));
    expect(result.payload).toBe("bad order");
  });

  it("reports the API's message when a single stage fetch fails", async () => {
    mockGet.mockRejectedValue({ response: { data: { message: "no stage" } } });
    const store = makeStore();
    const result = await store.dispatch(
      fetchSinglePipelineStages({ pipelineStageId: "s1", ...tokens })
    );
    expect(result.payload).toBe("no stage");
  });

  it("reports the API's message when a single item fetch fails", async () => {
    mockGet.mockRejectedValue({ response: { data: { message: "no item" } } });
    const store = makeStore();
    const result = await store.dispatch(fetchSinglePipelineItem({ itemId: "i1", ...tokens }));
    expect(result.payload).toBe("no item");
  });

  it("reports the API's message when an item list fetch fails", async () => {
    mockGet.mockRejectedValue({ response: { data: { message: "no items" } } });
    const store = makeStore();
    const result = await store.dispatch(fetchPipelineItems({ stageId: "s1", ...tokens }));
    expect(result.payload).toBe("no items");
  });

  it("reports the API's message when stage creation fails outright", async () => {
    mockPost.mockRejectedValue({ response: { data: { message: "no pipeline" } } });
    const store = makeStore();
    const result = await store.dispatch(
      createPipelineStage({ pipelineId: "p1", name: "A", ...tokens })
    );
    expect(result.payload).toBe("no pipeline");
  });

  it("reports the API's message when stage deletion fails", async () => {
    mockDelete.mockRejectedValue({ response: { data: { message: "in use" } } });
    const store = makeStore();
    const result = await store.dispatch(deletePipelineStage({ id: "c1", ...tokens }));
    expect(result.payload).toBe("in use");
  });
});
