import { describe, it, expect } from "vitest";
import reducer, { setDraftField, resetDraft } from "../ReduxStore/features/AddTargetDraftSlice";

describe("AddTargetDraftSlice", () => {
  const getInitial = () => reducer(undefined, { type: "unknown" });

  it("returns the initial state", () => {
    const state = getInitial();
    expect(state.name).toBe("");
    expect(state.programId).toBe("");
    expect(state.promptingStrategy).toEqual([]);
    expect(state.taskSteps).toEqual([]);
    expect(state.baselineDataRequired).toBe(false);
    expect(state.masteryCriteria).toEqual({});
    expect(state.attachment).toBe(null);
  });

  describe("setDraftField", () => {
    it("updates a single field", () => {
      const state = reducer(getInitial(), setDraftField({ name: "Target A" }));
      expect(state.name).toBe("Target A");
    });

    it("updates multiple fields", () => {
      const state = reducer(getInitial(), setDraftField({
        programId: "p1",
        description: "desc",
        sd: "stimulus",
        baselineDataRequired: true,
      }));
      expect(state.programId).toBe("p1");
      expect(state.description).toBe("desc");
      expect(state.sd).toBe("stimulus");
      expect(state.baselineDataRequired).toBe(true);
    });

    it("updates array fields", () => {
      const steps = [{ step: "Step 1" }, { step: "Step 2" }];
      const state = reducer(getInitial(), setDraftField({ taskSteps: steps }));
      expect(state.taskSteps).toEqual(steps);
    });

    it("updates object fields", () => {
      const criteria = { consecutive: 3, percentage: 80 };
      const state = reducer(getInitial(), setDraftField({ masteryCriteria: criteria }));
      expect(state.masteryCriteria).toEqual(criteria);
    });

    it("preserves other fields", () => {
      const state = reducer(getInitial(), setDraftField({ name: "Test" }));
      expect(state.programId).toBe("");
      expect(state.baselineDataRequired).toBe(false);
    });
  });

  describe("resetDraft", () => {
    it("resets to initial state", () => {
      let state = reducer(getInitial(), setDraftField({ name: "Test", programId: "p1" }));
      state = reducer(state, resetDraft());
      expect(state.name).toBe("");
      expect(state.programId).toBe("");
    });
  });
});
