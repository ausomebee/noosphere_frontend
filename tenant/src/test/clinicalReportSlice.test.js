import { describe, it, expect } from "vitest";
import reducer, {
  SECTIONS_CONFIG,
  initializeReport,
  addSection,
  removeSection,
  toggleSectionExpand,
  updateSectionData,
  reorderSections,
  updateMetadata,
  setActionMenuOpen,
  setActiveDragId,
  setExistingSectionIds,
  clearForm,
  resetSaveStates,
  saveDraft,
  loadReport,
  publishReport,
} from "../ReduxStore/features/clinicalReportSlice";

const getInitial = () => reducer(undefined, { type: "unknown" });

describe("clinicalReportSlice", () => {
  it("returns initial state", () => {
    const state = getInitial();
    expect(state.metadata.documentTitle).toBe("");
    expect(state.metadata.status).toBe("DRAFT");
    expect(state.activeSections).toEqual([]);
    expect(state.mode).toBe("new");
    expect(state.isLoading).toBe(false);
    expect(state.isSaving).toBe(false);
    expect(state.isPublishing).toBe(false);
  });

  it("SECTIONS_CONFIG is defined", () => {
    expect(SECTIONS_CONFIG.length).toBe(12);
  });

  describe("initializeReport", () => {
    it("sets report metadata and mode", () => {
      const state = reducer(getInitial(), initializeReport({
        id: "r1",
        metadata: { documentTitle: "Report", approver: "Jane" },
        mode: "edit",
      }));
      expect(state.reportId).toBe("r1");
      expect(state.metadata.documentTitle).toBe("Report");
      expect(state.metadata.approver).toBe("Jane");
      expect(state.mode).toBe("edit");
    });
  });

  describe("updateMetadata", () => {
    it("merges metadata fields", () => {
      const state = reducer(getInitial(), updateMetadata({
        approver: "Jane",
        status: "APPROVED",
      }));
      expect(state.metadata.approver).toBe("Jane");
      expect(state.metadata.status).toBe("APPROVED");
    });
  });

  describe("addSection", () => {
    it("adds a valid section", () => {
      const state = reducer(getInitial(), addSection("assessments"));
      expect(state.activeSections).toContain("assessments");
    });

    it("ignores invalid section", () => {
      const state = reducer(getInitial(), addSection("bogus"));
      expect(state.activeSections).toEqual([]);
    });

    it("ignores duplicate", () => {
      let state = reducer(getInitial(), addSection("assessments"));
      state = reducer(state, addSection("assessments"));
      expect(state.activeSections.filter(s => s === "assessments")).toHaveLength(1);
    });
  });

  describe("removeSection", () => {
    it("removes a section", () => {
      let state = reducer(getInitial(), addSection("assessments"));
      state = reducer(state, removeSection("assessments"));
      expect(state.activeSections).not.toContain("assessments");
    });
  });

  describe("toggleSectionExpand", () => {
    it("toggles expand/collapse", () => {
      let state = reducer(getInitial(), addSection("assessments"));
      state = reducer(state, toggleSectionExpand("assessments"));
      expect(state.expandedSections).not.toContain("assessments");
      state = reducer(state, toggleSectionExpand("assessments"));
      expect(state.expandedSections).toContain("assessments");
    });
  });

  describe("updateSectionData", () => {
    it("updates with object data", () => {
      let state = reducer(getInitial(), addSection("clientInformation"));
      state = reducer(state, updateSectionData({
        sectionId: "clientInformation",
        data: { clientFullName: "Alice" },
      }));
      expect(state.sectionData.clientInformation.clientFullName).toBe("Alice");
    });

    it("updates with array data", () => {
      let state = reducer(getInitial(), addSection("assessments"));
      state = reducer(state, updateSectionData({
        sectionId: "assessments",
        data: [{ name: "test" }],
      }));
      expect(state.sectionData.assessments).toEqual([{ name: "test" }]);
    });
  });

  describe("reorderSections", () => {
    it("swaps section order", () => {
      let state = reducer(getInitial(), addSection("assessments"));
      state = reducer(state, addSection("review"));
      state = reducer(state, reorderSections({ activeId: "review", overId: "assessments" }));
      expect(state.activeSections[0]).toBe("review");
    });

    it("ignores invalid reorder", () => {
      let state = reducer(getInitial(), addSection("assessments"));
      const before = [...state.activeSections];
      state = reducer(state, reorderSections({ activeId: "bad", overId: "assessments" }));
      expect(state.activeSections).toEqual(before);
    });
  });

  describe("setActionMenuOpen / setActiveDragId", () => {
    it("sets action menu", () => {
      expect(reducer(getInitial(), setActionMenuOpen("x")).actionMenuOpen).toBe("x");
    });
    it("sets drag id", () => {
      expect(reducer(getInitial(), setActiveDragId("y")).activeDragId).toBe("y");
    });
  });

  describe("setExistingSectionIds", () => {
    it("sets existing section IDs", () => {
      const state = reducer(getInitial(), setExistingSectionIds({ a: "1" }));
      expect(state.existingSectionIds).toEqual({ a: "1" });
    });
  });

  describe("clearForm", () => {
    it("resets to initial", () => {
      let state = reducer(getInitial(), addSection("assessments"));
      state = reducer(state, clearForm());
      expect(state.activeSections).toEqual([]);
      expect(state.metadata.documentTitle).toBe("");
    });
  });

  describe("resetSaveStates", () => {
    it("clears save/publish states", () => {
      const state = reducer(getInitial(), resetSaveStates());
      expect(state.isSaving).toBe(false);
      expect(state.saveSuccess).toBe(false);
      expect(state.isPublishing).toBe(false);
      expect(state.publishSuccess).toBe(false);
    });
  });

  // extraReducers
  describe("saveDraft extra reducers", () => {
    it("handles pending", () => {
      const state = reducer(getInitial(), { type: saveDraft.pending.type });
      expect(state.isSaving).toBe(true);
    });

    it("handles fulfilled", () => {
      const state = reducer(getInitial(), {
        type: saveDraft.fulfilled.type,
        payload: { data: { id: "new-id" } },
      });
      expect(state.isSaving).toBe(false);
      expect(state.saveSuccess).toBe(true);
    });

    it("handles rejected", () => {
      const state = reducer(getInitial(), {
        type: saveDraft.rejected.type,
        payload: "Failed",
      });
      expect(state.isSaving).toBe(false);
      expect(state.error).toBe("Failed");
    });
  });

  describe("loadReport extra reducers", () => {
    it("handles pending", () => {
      const state = reducer(getInitial(), { type: loadReport.pending.type });
      expect(state.isLoading).toBe(true);
    });

    it("handles fulfilled", () => {
      const state = reducer(getInitial(), {
        type: loadReport.fulfilled.type,
        payload: {
          id: "r1",
          metadata: { documentTitle: "Loaded", status: "DRAFT" },
          sections: [{ sectionId: "assessments", content: [] }],
          existingSectionIds: {},
        },
      });
      expect(state.isLoading).toBe(false);
      expect(state.metadata.documentTitle).toBe("Loaded");
    });

    it("handles rejected", () => {
      const state = reducer(getInitial(), {
        type: loadReport.rejected.type,
        payload: "Not found",
      });
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe("Not found");
    });
  });

  describe("publishReport extra reducers", () => {
    it("handles pending", () => {
      const state = reducer(getInitial(), { type: publishReport.pending.type });
      expect(state.isPublishing).toBe(true);
    });

    it("handles fulfilled", () => {
      const state = reducer(getInitial(), {
        type: publishReport.fulfilled.type,
        payload: {},
      });
      expect(state.isPublishing).toBe(false);
      expect(state.publishSuccess).toBe(true);
    });

    it("handles rejected", () => {
      const state = reducer(getInitial(), {
        type: publishReport.rejected.type,
        payload: "Publish failed",
      });
      expect(state.isPublishing).toBe(false);
      expect(state.error).toBe("Publish failed");
    });
  });
});
