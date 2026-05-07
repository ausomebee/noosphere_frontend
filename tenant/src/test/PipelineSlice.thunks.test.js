import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();
const mockPut = vi.fn();

vi.mock("../Helper/AxiosInterceptor", () => ({
  default: () => ({ get: mockGet, post: mockPost, patch: mockPatch, delete: mockDelete, put: mockPut }),
}));

vi.mock("uuid", () => ({ v4: () => "mock-uuid" }));

import reducer, {
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

const makeStore = () => configureStore({ reducer: { pipeline: reducer } });
const tokens = { accessToken: "at", refreshToken: "rt" };

describe("PipelineSlice thunks", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("fetchPipelineByTenantId", () => {
    it("fulfilled sets pipeline", async () => {
      mockGet.mockResolvedValue({ data: { data: [{ id: "p1", name: "Pipeline" }] } });
      const store = makeStore();
      await store.dispatch(fetchPipelineByTenantId({ tenantId: "t1", ...tokens }));
      expect(store.getState().pipeline.pipeline).toEqual({ id: "p1", name: "Pipeline" });
      expect(store.getState().pipeline.status).toBe("succeeded");
    });

    it("rejected sets error", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Not found" } } });
      const store = makeStore();
      await store.dispatch(fetchPipelineByTenantId({ tenantId: "bad", ...tokens }));
      expect(store.getState().pipeline.status).toBe("failed");
      expect(store.getState().pipeline.error).toBeTruthy();
    });
  });

  describe("fetchPipelineStages", () => {
    it("fulfilled populates columns and stages", async () => {
      const stages = [
        { id: "s1", name: "Stage 1", colourCode: "#000", order: 0, description: "desc" },
      ];
      mockGet.mockResolvedValue({ data: { data: stages } });
      const store = makeStore();
      await store.dispatch(fetchPipelineStages({ pipelineId: "p1", ...tokens }));
      expect(store.getState().pipeline.stages.length).toBe(1);
      expect(Object.keys(store.getState().pipeline.columns).length).toBe(1);
    });

    it("rejected sets error", async () => {
      mockGet.mockRejectedValue(new Error("fail"));
      const store = makeStore();
      await store.dispatch(fetchPipelineStages({ pipelineId: "p1", ...tokens }));
      expect(store.getState().pipeline.status).toBe("failed");
    });
  });

  describe("fetchSinglePipelineStages", () => {
    it("fulfilled updates status to succeeded", async () => {
      const stage = { id: "s1", name: "Updated", colourCode: "#fff", order: 0, description: "new", tasks: ["t1"], documents: ["d1"] };
      mockGet.mockResolvedValue({ data: { data: stage } });
      const store = makeStore();
      store.dispatch({ type: "pipeline/setColumns", payload: { s1: { id: "s1", title: "Old", taskIds: [], count: 0 } } });
      await store.dispatch(fetchSinglePipelineStages({ pipelineStageId: "s1", ...tokens }));
      expect(store.getState().pipeline.status).toBe("succeeded");
    });

    it("rejected sets error", async () => {
      mockGet.mockRejectedValue(new Error("fail"));
      const store = makeStore();
      await store.dispatch(fetchSinglePipelineStages({ pipelineStageId: "s1", ...tokens }));
      expect(store.getState().pipeline.status).toBe("failed");
    });
  });

  describe("fetchPipelineItems", () => {
    it("fulfilled populates items in columns", async () => {
      const items = [
        { id: "i1", pipelineStageId: "s1", client: { firstName: "John", lastName: "Doe" } },
      ];
      mockGet.mockResolvedValue({ data: { data: items } });
      const store = makeStore();
      store.dispatch({ type: "pipeline/setColumns", payload: { s1: { id: "s1", title: "Stage", taskIds: [], count: 0 } } });
      await store.dispatch(fetchPipelineItems({ stageId: "s1", ...tokens }));
      const col = store.getState().pipeline.columns.s1;
      expect(col.taskIds).toContain("i1");
      expect(col.count).toBe(1);
    });

    it("rejected sets error", async () => {
      mockGet.mockRejectedValue(new Error("fail"));
      const store = makeStore();
      await store.dispatch(fetchPipelineItems({ stageId: "s1", ...tokens }));
      expect(store.getState().pipeline.status).toBe("failed");
    });
  });

  describe("fetchSinglePipelineItem", () => {
    it("fulfilled sets pipelineItem", async () => {
      const item = { id: "i1", client: { firstName: "Jane" } };
      mockGet.mockResolvedValue({ data: { data: item } });
      const store = makeStore();
      await store.dispatch(fetchSinglePipelineItem({ itemId: "i1", ...tokens }));
      expect(store.getState().pipeline.pipelineItem).toEqual(item);
    });

    it("rejected sets error", async () => {
      mockGet.mockRejectedValue(new Error("fail"));
      const store = makeStore();
      await store.dispatch(fetchSinglePipelineItem({ itemId: "i1", ...tokens }));
      expect(store.getState().pipeline.error).toBeTruthy();
    });
  });

  describe("createPipelineStage", () => {
    it("fulfilled sets status to succeeded", async () => {
      const newStage = { id: "s2", name: "New Stage", colourCode: "#123", order: 1, description: "desc" };
      mockPost.mockResolvedValue({ data: { status: "ok", data: newStage } });
      const store = makeStore();
      await store.dispatch(createPipelineStage({ pipelineId: "p1", name: "New Stage", description: "desc", colourCode: "#123", ...tokens }));
      expect(store.getState().pipeline.status).toBe("succeeded");
    });

    it("rejected sets error", async () => {
      mockPost.mockRejectedValue(new Error("fail"));
      const store = makeStore();
      await store.dispatch(createPipelineStage({ pipelineId: "p1", name: "X", ...tokens }));
      expect(store.getState().pipeline.status).toBe("failed");
    });
  });

  describe("createCandidate", () => {
    it("fulfilled adds item to column", async () => {
      const newItem = { id: "i2", pipelineStageId: "s1", client: { firstName: "Bob" } };
      mockPost.mockResolvedValue({ data: { data: newItem } });
      const store = makeStore();
      store.dispatch({ type: "pipeline/setColumns", payload: { s1: { id: "s1", title: "Stage", taskIds: [], count: 0 } } });
      await store.dispatch(createCandidate({ firstName: "Bob", pipelineStageId: "s1", ...tokens }));
      expect(store.getState().pipeline.columns.s1.taskIds).toContain("i2");
    });

    it("rejected sets error", async () => {
      mockPost.mockRejectedValue(new Error("fail"));
      const store = makeStore();
      await store.dispatch(createCandidate({ firstName: "X", ...tokens }));
      expect(store.getState().pipeline.status).toBe("failed");
    });
  });

  describe("reorderPipelineStage", () => {
    it("fulfilled sets status to succeeded", async () => {
      mockPatch.mockResolvedValue({ data: { data: {} } });
      const store = makeStore();
      await store.dispatch(reorderPipelineStage({ id: "s1", order: 2, ...tokens }));
      expect(store.getState().pipeline.status).toBe("succeeded");
    });

    it("rejected sets error", async () => {
      mockPatch.mockRejectedValue(new Error("fail"));
      const store = makeStore();
      await store.dispatch(reorderPipelineStage({ id: "s1", order: 2, ...tokens }));
      expect(store.getState().pipeline.status).toBe("failed");
    });
  });

  describe("updatePipelineItemActivity", () => {
    it("fulfilled moves items between columns", async () => {
      mockPatch.mockResolvedValue({ data: {} });
      const store = makeStore();
      store.dispatch({ type: "pipeline/setColumns", payload: {
        s1: { id: "s1", title: "From", taskIds: ["i1"], count: 1 },
        s2: { id: "s2", title: "To", taskIds: [], count: 0 },
      }});
      await store.dispatch(updatePipelineItemActivity({ ids: ["i1"], pipelineStageId: "s2", sourceColumnId: "s1", ...tokens }));
      // After move, s1 should not have i1, s2 should have i1
      const state = store.getState().pipeline;
      expect(state.columns.s1.taskIds).not.toContain("i1");
      expect(state.columns.s2.taskIds).toContain("i1");
    });

    it("rejected sets error", async () => {
      mockPatch.mockRejectedValue(new Error("fail"));
      const store = makeStore();
      await store.dispatch(updatePipelineItemActivity({ ids: ["i1"], pipelineStageId: "s2", ...tokens }));
      expect(store.getState().pipeline.status).toBe("failed");
    });
  });

  describe("deletePipelineStage", () => {
    it("fulfilled sets status to succeeded", async () => {
      mockDelete.mockResolvedValue({ data: { data: {} } });
      const store = makeStore();
      store.dispatch({ type: "pipeline/setColumns", payload: { s1: { id: "s1", title: "Del", taskIds: [], count: 0 } } });
      store.dispatch({ type: "pipeline/updateColumnOrder", payload: ["s1"] });
      await store.dispatch(deletePipelineStage({ id: "s1", ...tokens }));
      expect(store.getState().pipeline.status).toBe("succeeded");
    });

    it("rejected sets error", async () => {
      mockDelete.mockRejectedValue(new Error("fail"));
      const store = makeStore();
      await store.dispatch(deletePipelineStage({ id: "s1", ...tokens }));
      expect(store.getState().pipeline.status).toBe("failed");
    });
  });

  describe("deletePipelineItem", () => {
    it("fulfilled removes items from columns", async () => {
      mockDelete.mockResolvedValue({ data: {} });
      const store = makeStore();
      store.dispatch({ type: "pipeline/setColumns", payload: { s1: { id: "s1", title: "Stage", taskIds: ["i1", "i2"], count: 2 } } });
      await store.dispatch(deletePipelineItem({ ids: ["i1"], ...tokens }));
      expect(store.getState().pipeline.columns.s1.taskIds).not.toContain("i1");
    });

    it("rejected sets error", async () => {
      mockDelete.mockRejectedValue(new Error("fail"));
      const store = makeStore();
      await store.dispatch(deletePipelineItem({ ids: ["i1"], ...tokens }));
      expect(store.getState().pipeline.status).toBe("failed");
    });
  });

  describe("updateCandidate", () => {
    it("fulfilled updates pipelineItem", async () => {
      mockPut.mockResolvedValue({ data: { data: { id: "i1", client: { firstName: "Updated" } } } });
      const store = makeStore();
      await store.dispatch(updateCandidate({ id: "i1", firstName: "Updated", ...tokens }));
      expect(store.getState().pipeline.status).toBe("succeeded");
    });

    it("rejected sets error", async () => {
      mockPut.mockRejectedValue(new Error("fail"));
      const store = makeStore();
      await store.dispatch(updateCandidate({ id: "i1", ...tokens }));
      expect(store.getState().pipeline.status).toBe("failed");
    });
  });
});
