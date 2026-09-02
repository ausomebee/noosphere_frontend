import { describe, it, expect, vi, beforeEach } from "vitest";

import reducer, {
  saveTemplate,
  loadTemplate,
  initializeTemplate,
  updateTemplateTitle,
  addSection,
  removeSection,
  toggleSectionExpand,
  updateSectionData,
  reorderSections,
  duplicateSection,
  setActionMenuOpen,
  setActiveDragId,
  clearTemplate,
  resetSaveStates,
  setExistingSectionIds,
  selectTemplateMetadata,
  selectActiveSections,
  selectExpandedSections,
  selectSectionData,
  selectExistingSectionIds,
  selectTemplateMode,
  selectTemplateId,
  selectActionMenuOpen,
  selectActiveDragId,
  selectIsSaving,
  selectSaveSuccess,
  selectError,
  selectActiveSectionsWithData,
} from "../ReduxStore/features/clinicalReportTemplateSlice";

/**
 * Branch coverage for the clinical report *template* builder slice.
 *
 * Like the report slice this is persisted, so the new-template path has to
 * wipe what the previous template left behind. The save path additionally
 * deduplicates by label before sending.
 */

const initial = () => reducer(undefined, { type: "@@INIT" });
const tokens = { accessToken: "at", refreshToken: "rt" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("initializeTemplate", () => {
  it("wipes the previous template when starting a new one", () => {
    let s = reducer(initial(), addSection("assessments"));
    s = reducer(s, setActionMenuOpen("x"));
    s = reducer(s, setActiveDragId("assessments"));
    s = reducer(s, initializeTemplate({ id: null, mode: "newTemplate", tenantId: "t1" }));
    expect(s.activeSections).toEqual([]);
    expect(s.expandedSections).toEqual([]);
    expect(s.actionMenuOpen).toBeNull();
    expect(s.activeDragId).toBeNull();
    expect(s.saveSuccess).toBe(false);
    expect(s.error).toBeNull();
  });

  it("keeps existing content when editing an existing template", () => {
    let s = reducer(initial(), addSection("assessments"));
    s = reducer(s, initializeTemplate({ id: "t9", mode: "editTemplate", tenantId: "t1" }));
    expect(s.activeSections).toEqual(["assessments"]);
    expect(s.templateId).toBe("t9");
    expect(s.mode).toBe("editTemplate");
  });

  it("defaults the mode to newTemplate", () => {
    const s = reducer(initial(), initializeTemplate({ id: null, tenantId: "t1" }));
    expect(s.mode).toBe("newTemplate");
  });

  it("records the tenant and any supplied section ids", () => {
    const s = reducer(
      initial(),
      initializeTemplate({ id: "t1", tenantId: "ten1", existingSectionIds: { review: "s1" } })
    );
    expect(s.templateMetadata.tenantId).toBe("ten1");
    expect(s.existingSectionIds).toEqual({ review: "s1" });
  });

  it("sets the title only when one is supplied", () => {
    let s = reducer(initial(), initializeTemplate({ id: "t1", title: "My template" }));
    expect(s.templateMetadata.title).toBe("My template");
    const before = s.templateMetadata.title;
    s = reducer(s, initializeTemplate({ id: "t1", mode: "editTemplate" }));
    expect(s.templateMetadata.title).toBe(before);
  });

  it("loads sections and their data when given an array", () => {
    const s = reducer(
      initial(),
      initializeTemplate({
        id: "t1",
        mode: "editTemplate",
        sections: [
          { sectionId: "review", data: { note: "x" } },
          { sectionId: "discharge" },
        ],
      })
    );
    expect(s.activeSections).toEqual(["review", "discharge"]);
    expect(s.expandedSections).toEqual(["review", "discharge"]);
    expect(s.sectionData.review).toEqual({ note: "x" });
  });

  it("ignores a sections value that is not an array", () => {
    const s = reducer(
      initial(),
      initializeTemplate({ id: "t1", mode: "editTemplate", sections: "nope" })
    );
    expect(s.activeSections).toEqual([]);
  });
});

describe("template section editing", () => {
  it("updates the title", () => {
    const s = reducer(initial(), updateTemplateTitle("Renamed"));
    expect(s.templateMetadata.title).toBe("Renamed");
  });

  it("adds, refuses duplicates, and removes sections", () => {
    let s = reducer(initial(), addSection("review"));
    expect(s.activeSections).toEqual(["review"]);
    s = reducer(s, addSection("review"));
    expect(s.activeSections).toEqual(["review"]);
    s = reducer(s, removeSection("review"));
    expect(s.activeSections).toEqual([]);
  });

  it("refuses a section that is not configured", () => {
    const s = reducer(initial(), addSection("notASection"));
    expect(s.activeSections).toEqual([]);
  });

  it("drops the id mapping when a loaded section is removed", () => {
    let s = reducer(initial(), addSection("review"));
    s = reducer(s, setExistingSectionIds({ review: "s1" }));
    s = reducer(s, removeSection("review"));
    expect(s.existingSectionIds.review).toBeUndefined();
  });

  it("toggles a section open and closed", () => {
    let s = reducer(initial(), addSection("review"));
    s = reducer(s, toggleSectionExpand("review"));
    expect(s.expandedSections).not.toContain("review");
    s = reducer(s, toggleSectionExpand("review"));
    expect(s.expandedSections).toContain("review");
  });

  it("merges object data and replaces array data", () => {
    let s = reducer(initial(), updateSectionData({ sectionId: "review", data: { a: 1 } }));
    s = reducer(s, updateSectionData({ sectionId: "review", data: { b: 2 } }));
    expect(s.sectionData.review).toEqual(expect.objectContaining({ a: 1, b: 2 }));
    s = reducer(s, updateSectionData({ sectionId: "assessments", data: [{ x: 1 }] }));
    expect(Array.isArray(s.sectionData.assessments)).toBe(true);
  });

  it("reorders sections, ignoring unknown or identical ids", () => {
    let s = reducer(initial(), addSection("review"));
    s = reducer(s, addSection("discharge"));
    s = reducer(s, reorderSections({ activeId: "review", overId: "discharge" }));
    expect(s.activeSections).toEqual(["discharge", "review"]);

    const before = [...s.activeSections];
    expect(reducer(s, reorderSections({ activeId: "nope", overId: "review" })).activeSections).toEqual(before);
    expect(reducer(s, reorderSections({ activeId: "review", overId: "review" })).activeSections).toEqual(before);
  });

  it("leaves duplicateSection deliberately inert", () => {
    const s = reducer(initial(), addSection("review"));
    expect(reducer(s, duplicateSection("review")).activeSections).toEqual(["review"]);
  });

  it("tracks the action menu and drag id", () => {
    let s = reducer(initial(), setActionMenuOpen("t1"));
    expect(s.actionMenuOpen).toBe("t1");
    s = reducer(s, setActiveDragId("review"));
    expect(s.activeDragId).toBe("review");
  });

  it("clears the template and resets the save flags", () => {
    let s = reducer(initial(), addSection("review"));
    s = reducer(s, clearTemplate());
    expect(s.activeSections).toEqual([]);

    s = reducer({ ...s, isSaving: true, saveSuccess: true, error: "x" }, resetSaveStates());
    expect(s.isSaving).toBe(false);
    expect(s.saveSuccess).toBe(false);
    expect(s.error).toBeNull();
  });
});

describe("template selectors", () => {
  it("fall back when the slice is absent", () => {
    const empty = {};
    expect(selectTemplateMetadata(empty)).toBeDefined();
    expect(selectActiveSections(empty)).toEqual([]);
    expect(selectExpandedSections(empty)).toEqual([]);
    expect(selectSectionData(empty)).toBeDefined();
    expect(selectExistingSectionIds(empty)).toEqual({});
    expect(selectTemplateMode(empty)).toBeDefined();
    expect(selectTemplateId(empty)).toBeUndefined();
    expect(selectActionMenuOpen(empty)).toBeNull();
    expect(selectActiveDragId(empty)).toBeNull();
    expect(selectIsSaving(empty)).toBe(false);
    expect(selectSaveSuccess(empty)).toBe(false);
    expect(selectError(empty)).toBeNull();
    expect(selectActiveSectionsWithData(empty)).toEqual([]);
  });

  it("read through to a populated slice", () => {
    let slice = reducer(initial(), addSection("review"));
    slice = reducer(slice, updateSectionData({ sectionId: "review", data: { a: 1 } }));
    const state = { clinicalReportTemplate: { ...slice, templateId: "t1", isSaving: true } };
    expect(selectTemplateId(state)).toBe("t1");
    expect(selectIsSaving(state)).toBe(true);
    expect(selectActiveSections(state)).toEqual(["review"]);
    const withData = selectActiveSectionsWithData(state);
    expect(withData.length).toBe(1);
  });
});

describe("saveTemplate thunk", () => {
  const run = (arg, existingSectionIds = {}) => {
    const dispatch = vi.fn();
    const getState = vi.fn(() => ({
      clinicalReportTemplate: { ...initial(), existingSectionIds },
    }));
    return saveTemplate(arg)(dispatch, getState, undefined);
  };

  const templateMetadata = { tenantId: "t1", title: "My template", isDraft: false };

  it("creates a template when there is no id, appending consent last", async () => {
    const api = {
      CreateClinicalReportTemplate: vi.fn().mockResolvedValue({ id: "tpl1" }),
      UpdateClinicalReportTemplate: vi.fn(),
    };
    const result = await run({
      templateData: {
        templateId: null,
        templateMetadata,
        activeSections: ["assessments"],
        sectionData: { assessments: { note: "x" } },
      },
      api,
      tokens,
    });
    expect(api.UpdateClinicalReportTemplate).not.toHaveBeenCalled();
    const payload = api.CreateClinicalReportTemplate.mock.calls[0][0];
    const labels = payload.sections.map((s) => s.section);
    expect(labels[labels.length - 1]).toBe("Consent & Signatures");
    expect(result.type).toContain("fulfilled");
  });

  it("updates when a template id is present and carries the draft flag", async () => {
    const api = {
      CreateClinicalReportTemplate: vi.fn(),
      UpdateClinicalReportTemplate: vi.fn().mockResolvedValue({ id: "tpl1" }),
    };
    await run({
      templateData: {
        templateId: "tpl1",
        templateMetadata: { ...templateMetadata, isDraft: true },
        activeSections: ["review"],
        sectionData: { review: {} },
      },
      api,
      tokens,
    });
    expect(api.CreateClinicalReportTemplate).not.toHaveBeenCalled();
    const payload = api.UpdateClinicalReportTemplate.mock.calls[0][0];
    expect(payload.id).toBe("tpl1");
    expect(payload.isDraft).toBe(true);
  });

  it("deduplicates sections that resolve to the same label", async () => {
    const api = { CreateClinicalReportTemplate: vi.fn().mockResolvedValue({}) };
    await run({
      templateData: {
        templateId: null,
        templateMetadata,
        activeSections: ["review", "review_2"],
        sectionData: { review: { a: 1 }, review_2: { b: 2 } },
      },
      api,
      tokens,
    });
    const payload = api.CreateClinicalReportTemplate.mock.calls[0][0];
    expect(payload.sections.filter((s) => s.section === "Review")).toHaveLength(1);
  });

  it("does not append consent when the author already added it", async () => {
    const api = { CreateClinicalReportTemplate: vi.fn().mockResolvedValue({}) };
    await run({
      templateData: {
        templateId: null,
        templateMetadata,
        activeSections: ["consentSignatures"],
        sectionData: { consentSignatures: { signed: true } },
      },
      api,
      tokens,
    });
    const payload = api.CreateClinicalReportTemplate.mock.calls[0][0];
    expect(payload.sections.filter((s) => s.section === "Consent & Signatures")).toHaveLength(1);
  });

  it("carries an existing section id when one is known", async () => {
    const api = { CreateClinicalReportTemplate: vi.fn().mockResolvedValue({}) };
    await run(
      {
        templateData: {
          templateId: null,
          templateMetadata,
          activeSections: ["review"],
          sectionData: { review: {} },
        },
        api,
        tokens,
      },
      { review: "sec-3" }
    );
    const payload = api.CreateClinicalReportTemplate.mock.calls[0][0];
    expect(payload.sections.find((s) => s.section === "Review").id).toBe("sec-3");
  });

  it("labels an unconfigured section by its raw id", async () => {
    const api = { CreateClinicalReportTemplate: vi.fn().mockResolvedValue({}) };
    await run({
      templateData: {
        templateId: null,
        templateMetadata,
        activeSections: ["mystery"],
        sectionData: { mystery: {} },
      },
      api,
      tokens,
    });
    const payload = api.CreateClinicalReportTemplate.mock.calls[0][0];
    expect(payload.sections.some((s) => s.section === "mystery")).toBe(true);
  });

  it("rejects when the save fails", async () => {
    const api = {
      CreateClinicalReportTemplate: vi.fn().mockRejectedValue(new Error("nope")),
    };
    const result = await run({
      templateData: {
        templateId: null,
        templateMetadata,
        activeSections: [],
        sectionData: {},
      },
      api,
      tokens,
    });
    expect(result.type).toContain("rejected");
  });
});

describe("template save and load state transitions", () => {
  it("tracks a save through its three states", () => {
    let s = reducer(initial(), { type: saveTemplate.pending.type });
    expect(s.isSaving).toBe(true);
    s = reducer(s, { type: saveTemplate.fulfilled.type, payload: { id: "tpl1" } });
    expect(s.isSaving).toBe(false);
    expect(s.saveSuccess).toBe(true);
    s = reducer(s, { type: saveTemplate.rejected.type, payload: "bad" });
    expect(s.isSaving).toBe(false);
    expect(s.error).toBe("bad");
  });

  it("tracks a load through its three states", () => {
    let s = reducer(initial(), { type: loadTemplate.pending.type });
    expect(s.isLoading).toBe(true);
    s = reducer(s, {
      type: loadTemplate.fulfilled.type,
      payload: { id: "tpl1", title: "T", sections: [], existingSectionIds: {} },
    });
    expect(s.isLoading).toBe(false);
    s = reducer(s, { type: loadTemplate.rejected.type, payload: "gone" });
    expect(s.isLoading).toBe(false);
    expect(s.error).toBe("gone");
  });
});

describe("loadTemplate thunk", () => {
  const run = (arg) => {
    const dispatch = vi.fn();
    const getState = vi.fn(() => ({ clinicalReportTemplate: initial() }));
    return loadTemplate(arg)(dispatch, getState, undefined);
  };

  it("maps labels back to ids and dedupes by base type", async () => {
    const api = {
      GetSingleClinicalReportTemplateById: vi.fn().mockResolvedValue({
        data: {
          id: "tpl1",
          title: "T",
          sections: [
            { id: "s1", section: "Review", content: { a: 1 }, order: 0 },
            { id: "s2", section: "Review", content: { a: 2 }, order: 1 },
          ],
        },
      }),
    };
    const result = await run({ templateId: "tpl1", api, tokens });
    expect(result.type).toContain("fulfilled");
    expect(result.payload.sections.filter((s) => s.sectionId === "review")).toHaveLength(1);
    expect(result.payload.existingSectionIds.review).toBe("s1");
  });

  it("copes with a template that has no sections", async () => {
    const api = {
      GetSingleClinicalReportTemplateById: vi.fn().mockResolvedValue({ data: { id: "tpl1" } }),
    };
    const result = await run({ templateId: "tpl1", api, tokens });
    expect(result.payload.sections).toEqual([]);
  });

  it("rejects when the fetch fails", async () => {
    const api = {
      GetSingleClinicalReportTemplateById: vi.fn().mockRejectedValue(new Error("gone")),
    };
    const result = await run({ templateId: "tpl1", api, tokens });
    expect(result.type).toContain("rejected");
  });
});
