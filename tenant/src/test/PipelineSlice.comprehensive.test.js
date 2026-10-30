import { describe, it, expect, vi } from "vitest";

vi.mock("uuid", () => ({ v4: () => "mock-uuid-1234" }));
vi.mock("../../api/TenantApis", () => ({ default: {} }));

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
} from "../ReduxStore/features/PipelineSlice";

const getInitial = () => reducer(undefined, { type: "unknown" });

describe("PipelineSlice", () => {
  it("returns initial state", () => {
    const state = getInitial();
    expect(state.draft.name).toBe("");
    expect(state.pipeline).toBe(null);
    expect(state.columns).toEqual({});
    expect(state.columnOrder).toEqual([]);
    expect(state.status).toBe("idle");
  });

  describe("updateDraft", () => {
    it("updates draft fields", () => {
      const state = reducer(getInitial(), updateDraft({ name: "Stage 1", colorCode: "#FF0000" }));
      expect(state.draft.name).toBe("Stage 1");
      expect(state.draft.colorCode).toBe("#FF0000");
    });

    it("preserves other draft fields", () => {
      const state = reducer(getInitial(), updateDraft({ name: "Test" }));
      expect(state.draft.description).toBe("");
      expect(state.draft.colorCode).toBe("#1E40AF");
    });
  });

  describe("addColumn", () => {
    it("adds a column with generated uuid", () => {
      const state = reducer(getInitial(), addColumn({
        pipelineData: { name: "To Do", description: "Tasks", colorCode: "#123" },
      }));
      expect(state.columns["mock-uuid-1234"]).toBeDefined();
      expect(state.columns["mock-uuid-1234"].title).toBe("To Do");
      expect(state.columnOrder).toContain("mock-uuid-1234");
    });

    it("adds column with provided stageId", () => {
      const state = reducer(getInitial(), addColumn({
        pipelineData: { name: "Done" },
        stageId: "custom-id",
      }));
      expect(state.columns["custom-id"]).toBeDefined();
      expect(state.columns["custom-id"].title).toBe("Done");
    });

    it("adds column at specific index", () => {
      let state = reducer(getInitial(), addColumn({
        pipelineData: { name: "A" },
        stageId: "a",
      }));
      state = reducer(state, addColumn({
        pipelineData: { name: "B" },
        stageId: "b",
        index: 0,
      }));
      expect(state.columnOrder[0]).toBe("b");
      expect(state.columnOrder[1]).toBe("a");
    });

    it("resets draft after adding", () => {
      const state = reducer(getInitial(), addColumn({
        pipelineData: { name: "Stage" },
        stageId: "s1",
      }));
      expect(state.draft.name).toBe("");
    });

    it("defaults title to New Stage when name is empty", () => {
      const state = reducer(getInitial(), addColumn({
        pipelineData: {},
        stageId: "s1",
      }));
      expect(state.columns["s1"].title).toBe("New Stage");
    });
  });

  describe("resetDraft", () => {
    it("resets draft to initial", () => {
      let state = reducer(getInitial(), updateDraft({ name: "Test" }));
      state = reducer(state, resetDraft());
      expect(state.draft.name).toBe("");
      expect(state.draft.colorCode).toBe("#1E40AF");
    });
  });

  describe("setColumns", () => {
    it("sets columns object", () => {
      const cols = { c1: { id: "c1", title: "Col1", taskIds: [] } };
      const state = reducer(getInitial(), setColumns(cols));
      expect(state.columns).toEqual(cols);
    });
  });

  describe("updateColumnTaskIds", () => {
    it("updates task IDs and count", () => {
      let state = reducer(getInitial(), addColumn({
        pipelineData: { name: "A" },
        stageId: "a",
      }));
      state = reducer(state, updateColumnTaskIds({ columnId: "a", taskIds: ["t1", "t2"] }));
      expect(state.columns["a"].taskIds).toEqual(["t1", "t2"]);
      expect(state.columns["a"].count).toBe(2);
    });

    it("filters null/non-string task IDs", () => {
      let state = reducer(getInitial(), addColumn({
        pipelineData: { name: "A" },
        stageId: "a",
      }));
      state = reducer(state, updateColumnTaskIds({ columnId: "a", taskIds: ["t1", null, 123, "t2"] }));
      expect(state.columns["a"].taskIds).toEqual(["t1", "t2"]);
    });

    it("ignores non-existent column", () => {
      const state = reducer(getInitial(), updateColumnTaskIds({ columnId: "nonexistent", taskIds: ["t1"] }));
      expect(state.columns.nonexistent).toBeUndefined();
    });
  });

  describe("addTaskToColumn", () => {
    it("adds a task to a column", () => {
      let state = reducer(getInitial(), addColumn({ pipelineData: { name: "A" }, stageId: "a" }));
      state = reducer(state, addTaskToColumn({ columnId: "a", taskId: "t1" }));
      expect(state.columns["a"].taskIds).toContain("t1");
      expect(state.columns["a"].count).toBe(1);
    });

    it("adds multiple tasks", () => {
      let state = reducer(getInitial(), addColumn({ pipelineData: { name: "A" }, stageId: "a" }));
      state = reducer(state, addTaskToColumn({ columnId: "a", taskId: "t1" }));
      state = reducer(state, addTaskToColumn({ columnId: "a", taskId: "t2" }));
      expect(state.columns["a"].taskIds).toEqual(["t1", "t2"]);
      expect(state.columns["a"].count).toBe(2);
    });
  });

  describe("removeTaskFromColumn", () => {
    it("removes a task from a column", () => {
      let state = reducer(getInitial(), addColumn({ pipelineData: { name: "A" }, stageId: "a" }));
      state = reducer(state, addTaskToColumn({ columnId: "a", taskId: "t1" }));
      state = reducer(state, addTaskToColumn({ columnId: "a", taskId: "t2" }));
      state = reducer(state, removeTaskFromColumn({ columnId: "a", taskId: "t1" }));
      expect(state.columns["a"].taskIds).not.toContain("t1");
      expect(state.columns["a"].taskIds).toContain("t2");
      expect(state.columns["a"].count).toBe(1);
    });
  });

  describe("updateColumnOrder", () => {
    it("sets column order array", () => {
      const state = reducer(getInitial(), updateColumnOrder(["c2", "c1"]));
      expect(state.columnOrder).toEqual(["c2", "c1"]);
    });
  });

  describe("deleteColumn", () => {
    it("removes a column and its order entry", () => {
      let state = reducer(getInitial(), addColumn({ pipelineData: { name: "A" }, stageId: "a" }));
      state = reducer(state, addColumn({ pipelineData: { name: "B" }, stageId: "b" }));
      state = reducer(state, deleteColumn("a"));
      expect(state.columns["a"]).toBeUndefined();
      expect(state.columnOrder).not.toContain("a");
      expect(state.columns["b"]).toBeDefined();
    });
  });
});
