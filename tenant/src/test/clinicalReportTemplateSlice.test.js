import { describe, it, expect } from "vitest";
import reducer, {
  SECTIONS_CONFIG,
  initializeTemplate,
  updateTemplateTitle,
  addSection,
  removeSection,
  toggleSectionExpand,
  updateSectionData,
  reorderSections,
  setActionMenuOpen,
  setActiveDragId,
  clearTemplate,
  resetSaveStates,
  setExistingSectionIds,
  saveTemplate,
  loadTemplate,
} from "../ReduxStore/features/clinicalReportTemplateSlice";

const getInitial = () => reducer(undefined, { type: "unknown" });

describe("clinicalReportTemplateSlice", () => {
  it("returns initial state", () => {
    const state = getInitial();
    expect(state.templateMetadata.title).toBe("");
    expect(state.activeSections).toEqual([]);
    expect(state.mode).toBe("newTemplate");
    expect(state.isLoading).toBe(false);
    expect(state.isSaving).toBe(false);
  });

  it("SECTIONS_CONFIG has 12 sections", () => {
    expect(SECTIONS_CONFIG).toHaveLength(12);
    expect(SECTIONS_CONFIG[0].id).toBe("clientInformation");
  });

  describe("initializeTemplate", () => {
    it("sets template metadata and sections", () => {
      const state = reducer(getInitial(), initializeTemplate({
        id: "t1",
        title: "Test",
        tenantId: "ten1",
        mode: "edit",
        sections: [{ sectionId: "assessments", data: [{ name: "test" }] }],
      }));
      expect(state.templateId).toBe("t1");
      expect(state.templateMetadata.title).toBe("Test");
      expect(state.mode).toBe("edit");
      expect(state.activeSections).toContain("assessments");
      expect(state.sectionData.assessments).toEqual([{ name: "test" }]);
    });
  });

  describe("updateTemplateTitle", () => {
    it("updates the title", () => {
      const state = reducer(getInitial(), updateTemplateTitle("New Title"));
      expect(state.templateMetadata.title).toBe("New Title");
    });
  });

  describe("addSection", () => {
    it("adds a valid section", () => {
      const state = reducer(getInitial(), addSection("assessments"));
      expect(state.activeSections).toContain("assessments");
      expect(state.expandedSections).toContain("assessments");
    });

    it("ignores invalid section", () => {
      const state = reducer(getInitial(), addSection("invalid"));
      expect(state.activeSections).toEqual([]);
    });

    it("ignores duplicate section", () => {
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
      expect(state.expandedSections).not.toContain("assessments");
    });

    it("removes from existingSectionIds", () => {
      let state = reducer(getInitial(), setExistingSectionIds({ assessments: "api-id-1" }));
      state = reducer(state, addSection("assessments"));
      state = reducer(state, removeSection("assessments"));
      expect(state.existingSectionIds.assessments).toBeUndefined();
    });
  });

  describe("toggleSectionExpand", () => {
    it("collapses an expanded section", () => {
      let state = reducer(getInitial(), addSection("assessments"));
      state = reducer(state, toggleSectionExpand("assessments"));
      expect(state.expandedSections).not.toContain("assessments");
    });

    it("expands a collapsed section", () => {
      let state = reducer(getInitial(), addSection("assessments"));
      state = reducer(state, toggleSectionExpand("assessments")); // collapse
      state = reducer(state, toggleSectionExpand("assessments")); // expand
      expect(state.expandedSections).toContain("assessments");
    });
  });

  describe("updateSectionData", () => {
    it("updates section data with object", () => {
      let state = reducer(getInitial(), addSection("clientInformation"));
      state = reducer(state, updateSectionData({
        sectionId: "clientInformation",
        data: { clientFullName: "John" },
      }));
      expect(state.sectionData.clientInformation.clientFullName).toBe("John");
    });

    it("updates section data with array", () => {
      let state = reducer(getInitial(), addSection("assessments"));
      state = reducer(state, updateSectionData({
        sectionId: "assessments",
        data: [{ name: "test" }],
      }));
      expect(state.sectionData.assessments).toEqual([{ name: "test" }]);
    });

    it("creates section data if missing", () => {
      const state = reducer(getInitial(), updateSectionData({
        sectionId: "review",
        data: { notes: "ok" },
      }));
      expect(state.sectionData.review.notes).toBe("ok");
    });
  });

  describe("reorderSections", () => {
    it("reorders sections", () => {
      let state = reducer(getInitial(), addSection("assessments"));
      state = reducer(state, addSection("review"));
      state = reducer(state, reorderSections({ activeId: "review", overId: "assessments" }));
      expect(state.activeSections[0]).toBe("review");
      expect(state.activeSections[1]).toBe("assessments");
    });

    it("ignores invalid reorder", () => {
      let state = reducer(getInitial(), addSection("assessments"));
      const before = [...state.activeSections];
      state = reducer(state, reorderSections({ activeId: "nonexistent", overId: "assessments" }));
      expect(state.activeSections).toEqual(before);
    });
  });

  describe("setActionMenuOpen", () => {
    it("sets the open menu", () => {
      const state = reducer(getInitial(), setActionMenuOpen("assessments"));
      expect(state.actionMenuOpen).toBe("assessments");
    });
  });

  describe("setActiveDragId", () => {
    it("sets the drag id", () => {
      const state = reducer(getInitial(), setActiveDragId("assessments"));
      expect(state.activeDragId).toBe("assessments");
    });
  });

  describe("clearTemplate", () => {
    it("resets to initial state", () => {
      let state = reducer(getInitial(), addSection("assessments"));
      state = reducer(state, updateTemplateTitle("Test"));
      state = reducer(state, clearTemplate());
      expect(state.templateMetadata.title).toBe("");
      expect(state.activeSections).toEqual([]);
    });
  });

  describe("resetSaveStates", () => {
    it("clears save states", () => {
      const state = reducer(getInitial(), resetSaveStates());
      expect(state.isSaving).toBe(false);
      expect(state.saveSuccess).toBe(false);
      expect(state.error).toBe(null);
    });
  });

  describe("setExistingSectionIds", () => {
    it("sets existing section IDs map", () => {
      const state = reducer(getInitial(), setExistingSectionIds({ assessments: "id1" }));
      expect(state.existingSectionIds.assessments).toBe("id1");
    });
  });

  // extraReducers
  describe("saveTemplate extra reducers", () => {
    it("sets isSaving on pending", () => {
      const state = reducer(getInitial(), { type: saveTemplate.pending.type });
      expect(state.isSaving).toBe(true);
      expect(state.saveSuccess).toBe(false);
    });

    it("sets saveSuccess on fulfilled", () => {
      const state = reducer(getInitial(), {
        type: saveTemplate.fulfilled.type,
        payload: { data: { id: "new-id" } },
      });
      expect(state.isSaving).toBe(false);
      expect(state.saveSuccess).toBe(true);
      expect(state.templateId).toBe("new-id");
    });

    it("sets error on rejected", () => {
      const state = reducer(getInitial(), {
        type: saveTemplate.rejected.type,
        payload: "Save failed",
      });
      expect(state.isSaving).toBe(false);
      expect(state.error).toBe("Save failed");
    });
  });

  describe("loadTemplate extra reducers", () => {
    it("sets isLoading on pending", () => {
      const state = reducer(getInitial(), { type: loadTemplate.pending.type });
      expect(state.isLoading).toBe(true);
    });

    it("populates state on fulfilled", () => {
      const state = reducer(getInitial(), {
        type: loadTemplate.fulfilled.type,
        payload: {
          id: "t1",
          title: "Loaded",
          existingSectionIds: { assessments: "api-1" },
          sections: [{ sectionId: "assessments", content: [{ name: "a" }] }],
        },
      });
      expect(state.isLoading).toBe(false);
      expect(state.templateMetadata.title).toBe("Loaded");
      expect(state.activeSections).toContain("assessments");
      expect(state.existingSectionIds.assessments).toBe("api-1");
    });

    it("sets error on rejected", () => {
      const state = reducer(getInitial(), {
        type: loadTemplate.rejected.type,
        payload: "Load failed",
      });
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe("Load failed");
    });
  });
});
