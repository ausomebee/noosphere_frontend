import { describe, it, expect, vi, beforeEach } from "vitest";

import reducer, {
  SECTIONS_CONFIG,
  saveDraft,
  publishReport,
  loadReport,
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
  selectMetadata,
  selectActiveSections,
  selectExpandedSections,
  selectSectionData,
  selectExistingSectionIds,
  selectMode,
  selectReportId,
  selectActionMenuOpen,
  selectActiveDragId,
  selectIsSaving,
} from "../ReduxStore/features/clinicalReportSlice";

/**
 * Branch coverage for the clinical report builder slice.
 *
 * The slice is persisted, so most of its conditionals exist to stop one
 * report's content leaking into the next. These drive both sides of each:
 * the same-document path that keeps state, and the different-document path
 * that wipes it.
 */

const initial = () => reducer(undefined, { type: "@@INIT" });

const tokens = { accessToken: "at", refreshToken: "rt" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("initializeReport", () => {
  it("wipes prior content when opening a new report", () => {
    let s = reducer(initial(), addSection("assessments"));
    s = reducer(s, initializeReport({ id: null, mode: "new" }));
    expect(s.activeSections).toEqual([]);
    expect(s.expandedSections).toEqual([]);
    expect(s.existingSectionIds).toEqual({});
  });

  it("wipes when the report id differs", () => {
    let s = reducer(initial(), initializeReport({ id: "r1", mode: "edit" }));
    s = reducer(s, addSection("assessments"));
    s = reducer(s, initializeReport({ id: "r2", mode: "edit" }));
    expect(s.activeSections).toEqual([]);
    expect(s.reportId).toBe("r2");
  });

  it("wipes when the same id belongs to a different client", () => {
    let s = reducer(
      initial(),
      initializeReport({ id: "r1", mode: "edit", metadata: { clientTenantId: "c1" } })
    );
    s = reducer(s, addSection("assessments"));
    s = reducer(
      s,
      initializeReport({ id: "r1", mode: "edit", metadata: { clientTenantId: "c2" } })
    );
    // Same report id, different client: the clinical content must not carry over.
    expect(s.activeSections).toEqual([]);
    expect(s.metadata.clientTenantId).toBe("c2");
  });

  it("keeps content when reopening the same document", () => {
    let s = reducer(
      initial(),
      initializeReport({ id: "r1", mode: "edit", metadata: { clientTenantId: "c1" } })
    );
    s = reducer(s, addSection("assessments"));
    s = reducer(
      s,
      initializeReport({ id: "r1", mode: "edit", metadata: { clientTenantId: "c1" } })
    );
    expect(s.activeSections).toEqual(["assessments"]);
  });

  it("defaults mode and activeTab", () => {
    const s = reducer(initial(), initializeReport({ id: "r1" }));
    expect(s.mode).toBe("new");
    expect(s.activeTab).toBe("drafts");
  });

  it("honours a supplied activeTab", () => {
    const s = reducer(initial(), initializeReport({ id: "r1", activeTab: "approved" }));
    expect(s.activeTab).toBe("approved");
  });

  it("fills metadata defaults when fields are missing", () => {
    const s = reducer(initial(), initializeReport({ id: "r1", metadata: {} }));
    expect(s.metadata.documentTitle).toBe("Behaviour Intervention Plan");
    expect(s.metadata.approver).toBe("");
    expect(s.metadata.approverId).toBeNull();
    expect(s.metadata.client).toEqual({ name: "", initials: "" });
    expect(s.metadata.hasChangesRequested).toBe(false);
    expect(s.metadata.dateCreated).toBeTruthy();
  });

  it("keeps supplied metadata values", () => {
    const s = reducer(
      initial(),
      initializeReport({
        id: "r1",
        metadata: {
          documentTitle: "Custom",
          dateCreated: "01/01/2026",
          approver: "Dr A",
          approverId: "a1",
          createdBy: "Dr B",
          creatorId: "c1",
          client: { name: "Jo", initials: "J" },
          clientTenantId: "ct1",
          tenantId: "t1",
          clientData: { x: 1 },
          hasChangesRequested: true,
          changeRequestMessage: "please revise",
        },
      })
    );
    expect(s.metadata.documentTitle).toBe("Custom");
    expect(s.metadata.dateCreated).toBe("01/01/2026");
    expect(s.metadata.hasChangesRequested).toBe(true);
    expect(s.metadata.changeRequestMessage).toBe("please revise");
  });

  it("marks a view-mode report as approved and others as draft", () => {
    expect(reducer(initial(), initializeReport({ id: "r1", mode: "view", metadata: {} })).metadata.status).toBe("APPROVED");
    expect(reducer(initial(), initializeReport({ id: "r1", mode: "edit", metadata: {} })).metadata.status).toBe("DRAFT");
  });

  it("reads metadata out of formData when not passed directly", () => {
    const s = reducer(
      initial(),
      initializeReport({ id: "r1", formData: { metadata: { documentTitle: "From form" } } })
    );
    expect(s.metadata.documentTitle).toBe("From form");
  });

  it("replaces section data rather than merging it", () => {
    let s = reducer(initial(), updateSectionData({ sectionId: "assessments", data: { note: "old" } }));
    s = reducer(
      s,
      initializeReport({
        id: "r9",
        mode: "edit",
        formData: { sectionData: { review: { note: "new" } } },
      })
    );
    // A section the incoming document lacks must not keep the old content.
    expect(s.sectionData.review).toEqual({ note: "new" });
    expect(s.sectionData.assessments).not.toEqual({ note: "old" });
  });

  it("takes activeSections from formData, defaulting expanded to the same list", () => {
    const s = reducer(
      initial(),
      initializeReport({ id: "r1", formData: { activeSections: ["review"] } })
    );
    expect(s.activeSections).toEqual(["review"]);
    expect(s.expandedSections).toEqual(["review"]);
  });

  it("honours a separate expandedSections list", () => {
    const s = reducer(
      initial(),
      initializeReport({
        id: "r1",
        formData: { activeSections: ["review", "discharge"], expandedSections: ["review"] },
      })
    );
    expect(s.expandedSections).toEqual(["review"]);
  });

  it("keeps supplied existing section ids", () => {
    const s = reducer(
      initial(),
      initializeReport({ id: "r1", existingSectionIds: { review: "sec-1" } })
    );
    expect(s.existingSectionIds).toEqual({ review: "sec-1" });
  });
});

describe("section add, remove, expand and reorder", () => {
  it("refuses a section that is not in the config", () => {
    const s = reducer(initial(), addSection("notASection"));
    expect(s.activeSections).toEqual([]);
  });

  it("refuses to add the same section twice", () => {
    let s = reducer(initial(), addSection("review"));
    s = reducer(s, addSection("review"));
    expect(s.activeSections).toEqual(["review"]);
  });

  it("adds every configured section", () => {
    let s = initial();
    for (const cfg of SECTIONS_CONFIG) s = reducer(s, addSection(cfg.id));
    expect(s.activeSections).toHaveLength(SECTIONS_CONFIG.length);
  });

  it("seeds a section's data from its default shape", () => {
    const s = reducer(initial(), addSection("assessments"));
    expect(s.sectionData.assessments).toBeDefined();
  });

  it("removes a section and its data and id mapping", () => {
    let s = reducer(initial(), addSection("review"));
    s = reducer(s, setExistingSectionIds({ review: "sec-1" }));
    s = reducer(s, removeSection("review"));
    expect(s.activeSections).toEqual([]);
    expect(s.expandedSections).toEqual([]);
    expect(s.existingSectionIds.review).toBeUndefined();
    expect(s.sectionData.review).toBeUndefined();
  });

  it("removes a section that has no stored id mapping", () => {
    let s = reducer(initial(), addSection("review"));
    s = reducer(s, removeSection("review"));
    expect(s.activeSections).toEqual([]);
  });

  it("toggles a section open and closed", () => {
    let s = reducer(initial(), addSection("review"));
    expect(s.expandedSections).toContain("review");
    s = reducer(s, toggleSectionExpand("review"));
    expect(s.expandedSections).not.toContain("review");
    s = reducer(s, toggleSectionExpand("review"));
    expect(s.expandedSections).toContain("review");
  });

  it("creates a section's data on first update, by base type", () => {
    const s = reducer(initial(), updateSectionData({ sectionId: "review_2", data: { note: "x" } }));
    expect(s.sectionData.review_2).toEqual(expect.objectContaining({ note: "x" }));
  });

  it("merges object data but replaces array data", () => {
    let s = reducer(initial(), updateSectionData({ sectionId: "review", data: { a: 1 } }));
    s = reducer(s, updateSectionData({ sectionId: "review", data: { b: 2 } }));
    expect(s.sectionData.review).toEqual(expect.objectContaining({ a: 1, b: 2 }));

    s = reducer(s, updateSectionData({ sectionId: "assessments", data: [{ x: 1 }] }));
    expect(Array.isArray(s.sectionData.assessments)).toBe(true);
    s = reducer(s, updateSectionData({ sectionId: "assessments", data: [{ y: 2 }] }));
    expect(s.sectionData.assessments).toEqual([{ y: 2 }]);
  });

  it("reorders sections and clears the drag id", () => {
    let s = initial();
    s = reducer(s, addSection("review"));
    s = reducer(s, addSection("discharge"));
    s = reducer(s, setActiveDragId("review"));
    s = reducer(s, reorderSections({ activeId: "review", overId: "discharge" }));
    expect(s.activeSections).toEqual(["discharge", "review"]);
    expect(s.activeDragId).toBeNull();
  });

  it("ignores a reorder whose ids are unknown or identical", () => {
    let s = reducer(initial(), addSection("review"));
    const before = [...s.activeSections];
    expect(reducer(s, reorderSections({ activeId: "nope", overId: "review" })).activeSections).toEqual(before);
    expect(reducer(s, reorderSections({ activeId: "review", overId: "nope" })).activeSections).toEqual(before);
    expect(reducer(s, reorderSections({ activeId: "review", overId: "review" })).activeSections).toEqual(before);
  });
});

describe("metadata, menus and reset", () => {
  it("merges metadata and stamps lastUpdated", () => {
    const s = reducer(initial(), updateMetadata({ documentTitle: "New title" }));
    expect(s.metadata.documentTitle).toBe("New title");
    expect(s.metadata.lastUpdated).toBeTruthy();
  });

  it("tracks the action menu and the drag id", () => {
    let s = reducer(initial(), setActionMenuOpen("r1"));
    expect(s.actionMenuOpen).toBe("r1");
    s = reducer(s, setActiveDragId("review"));
    expect(s.activeDragId).toBe("review");
  });

  it("clears the form without sharing the default section objects", () => {
    let s = reducer(initial(), updateSectionData({ sectionId: "review", data: { note: "x" } }));
    s = reducer(s, clearForm());
    expect(s.activeSections).toEqual([]);
    // Mutating the cleared state must not corrupt the defaults for next time.
    const again = reducer(s, clearForm());
    expect(again.sectionData).not.toBe(s.sectionData);
  });

  it("resets the save and publish flags", () => {
    let s = { ...initial(), isSaving: true, isPublishing: true, saveSuccess: true, publishSuccess: true, error: "x" };
    s = reducer(s, resetSaveStates());
    expect(s.isSaving).toBe(false);
    expect(s.isPublishing).toBe(false);
    expect(s.saveSuccess).toBe(false);
    expect(s.publishSuccess).toBe(false);
    expect(s.error).toBeNull();
  });
});

describe("selectors", () => {
  it("fall back sensibly when the slice is absent", () => {
    const empty = {};
    expect(selectMetadata(empty)).toBeDefined();
    expect(selectActiveSections(empty)).toEqual([]);
    expect(selectExpandedSections(empty)).toEqual([]);
    expect(selectSectionData(empty)).toBeDefined();
    expect(selectExistingSectionIds(empty)).toEqual({});
    expect(selectMode(empty)).toBe("new");
    expect(selectReportId(empty)).toBeUndefined();
    expect(selectActionMenuOpen(empty)).toBeUndefined();
    expect(selectActiveDragId(empty)).toBeUndefined();
    expect(selectIsSaving(empty)).toBe(false);
  });

  it("read through to a populated slice", () => {
    const s = { clinicalReport: { ...initial(), reportId: "r1", mode: "edit", isSaving: true } };
    expect(selectReportId(s)).toBe("r1");
    expect(selectMode(s)).toBe("edit");
    expect(selectIsSaving(s)).toBe(true);
  });
});

describe("saveDraft thunk", () => {
  const run = (arg, state) => {
    const dispatch = vi.fn();
    const getState = vi.fn(() => state);
    return saveDraft(arg)(dispatch, getState, undefined);
  };

  const baseState = (existingSectionIds = {}) => ({
    clinicalReport: { ...initial(), existingSectionIds },
  });

  const metadata = {
    tenantId: "t1",
    clientTenantId: "ct1",
    creatorId: "cr1",
    approverId: "ap1",
    documentTitle: "Plan",
  };

  it("maps sections, appends consent, and posts", async () => {
    const api = { CreateClinicalReport: vi.fn().mockResolvedValue({ data: { id: "r1" } }) };
    const result = await run(
      {
        reportData: {
          reportId: null,
          metadata,
          activeSections: ["assessments"],
          sectionData: { assessments: { note: "x" } },
        },
        api,
        tokens,
      },
      baseState()
    );
    expect(api.CreateClinicalReport).toHaveBeenCalled();
    const payload = api.CreateClinicalReport.mock.calls[0][0];
    const labels = payload.sections.map((s) => s.section);
    expect(labels).toContain("Assessments");
    // Consent is auto-appended last when the author has not added it.
    expect(labels[labels.length - 1]).toBe("Consent & Signatures");
    expect(result.type).toContain("fulfilled");
  });

  it("does not append consent twice when the author added it", async () => {
    const api = { CreateClinicalReport: vi.fn().mockResolvedValue({ data: { id: "r1" } }) };
    await run(
      {
        reportData: {
          reportId: null,
          metadata,
          activeSections: ["consentSignatures"],
          sectionData: { consentSignatures: { signed: true } },
        },
        api,
        tokens,
      },
      baseState()
    );
    const payload = api.CreateClinicalReport.mock.calls[0][0];
    const consent = payload.sections.filter((s) => s.section === "Consent & Signatures");
    expect(consent).toHaveLength(1);
  });

  it("wraps array data as items and primitives as a value", async () => {
    const api = { CreateClinicalReport: vi.fn().mockResolvedValue({ data: { id: "r1" } }) };
    await run(
      {
        reportData: {
          reportId: null,
          metadata,
          activeSections: ["assessments", "review"],
          sectionData: { assessments: [{ a: 1 }], review: "plain text" },
        },
        api,
        tokens,
      },
      baseState()
    );
    const payload = api.CreateClinicalReport.mock.calls[0][0];
    const assessments = payload.sections.find((s) => s.section === "Assessments");
    const review = payload.sections.find((s) => s.section === "Review");
    expect(assessments.content).toEqual({ items: [{ a: 1 }] });
    expect(review.content).toEqual({ value: "plain text" });
  });

  it("defaults a section with no data to an empty object", async () => {
    const api = { CreateClinicalReport: vi.fn().mockResolvedValue({ data: { id: "r1" } }) };
    await run(
      {
        reportData: { reportId: null, metadata, activeSections: ["review"], sectionData: {} },
        api,
        tokens,
      },
      baseState()
    );
    const payload = api.CreateClinicalReport.mock.calls[0][0];
    expect(payload.sections.find((s) => s.section === "Review").content).toEqual({});
  });

  it("updates rather than creates when a report id is present, carrying section ids", async () => {
    const api = {
      CreateClinicalReport: vi.fn(),
      UpdateClinicalReport: vi.fn().mockResolvedValue({ data: { id: "r1" } }),
    };
    await run(
      {
        reportData: {
          reportId: "r1",
          metadata,
          activeSections: ["review"],
          sectionData: { review: {} },
        },
        api,
        tokens,
      },
      baseState({ review: "sec-9" })
    );
    expect(api.CreateClinicalReport).not.toHaveBeenCalled();
    const payload = api.UpdateClinicalReport.mock.calls[0][0];
    expect(payload.id).toBe("r1");
    expect(payload.sections.find((s) => s.section === "Review").id).toBe("sec-9");
  });

  it("labels an unrecognised section by its raw id", async () => {
    const api = { CreateClinicalReport: vi.fn().mockResolvedValue({ data: { id: "r1" } }) };
    await run(
      {
        reportData: {
          reportId: null,
          metadata,
          activeSections: ["mystery"],
          sectionData: { mystery: {} },
        },
        api,
        tokens,
      },
      baseState()
    );
    const payload = api.CreateClinicalReport.mock.calls[0][0];
    expect(payload.sections.some((s) => s.section === "mystery")).toBe(true);
  });

  it("rejects with the backend message on failure", async () => {
    const api = {
      CreateClinicalReport: vi.fn().mockRejectedValue(new Error("server said no")),
    };
    const result = await run(
      {
        reportData: { reportId: null, metadata, activeSections: [], sectionData: {} },
        api,
        tokens,
      },
      baseState()
    );
    expect(result.type).toContain("rejected");
  });
});

describe("save and publish state transitions", () => {
  it("tracks a save through pending, fulfilled and rejected", () => {
    let s = reducer(initial(), { type: saveDraft.pending.type });
    expect(s.isSaving).toBe(true);
    expect(s.saveSuccess).toBe(false);

    s = reducer(s, { type: saveDraft.fulfilled.type, payload: { id: "r1" } });
    expect(s.isSaving).toBe(false);
    expect(s.saveSuccess).toBe(true);
    expect(s.reportId).toBe("r1");
    expect(s.metadata.status).toBe("DRAFT");

    s = reducer(s, { type: saveDraft.rejected.type, payload: "nope" });
    expect(s.isSaving).toBe(false);
    expect(s.error).toBe("nope");
  });

  it("keeps the existing report id when the save returns none", () => {
    let s = { ...initial(), reportId: "existing" };
    s = reducer(s, { type: saveDraft.fulfilled.type, payload: {} });
    expect(s.reportId).toBe("existing");
  });

  it("tracks a publish through pending, fulfilled and rejected", () => {
    let s = reducer(initial(), { type: publishReport.pending.type });
    expect(s.isPublishing).toBe(true);
    s = reducer(s, { type: publishReport.fulfilled.type, payload: {} });
    expect(s.isPublishing).toBe(false);
    s = reducer(s, { type: publishReport.rejected.type, payload: "bad" });
    expect(s.isPublishing).toBe(false);
    expect(s.error).toBe("bad");
  });
});

describe("loadReport thunk", () => {
  const run = (arg) => {
    const dispatch = vi.fn();
    const getState = vi.fn(() => ({ clinicalReport: initial() }));
    return loadReport(arg)(dispatch, getState, undefined);
  };

  it("maps known section labels back to their ids and sorts by order", async () => {
    const api = {
      GetSingleClinicalReportById: vi.fn().mockResolvedValue({
        data: {
          title: "Plan",
          sections: [
            { id: "s2", section: "Review", content: { note: "b" }, order: 1 },
            { id: "s1", section: "Assessments", content: { items: [{ a: 1 }] }, order: 0 },
          ],
        },
      }),
    };
    const result = await run({ reportId: "r1", api, tokens });
    expect(result.type).toContain("fulfilled");
    // The thunk returns the deduped section list, ordered.
    expect(result.payload.sections[0].sectionId).toBe("assessments");
  });

  it("unwraps a content.items array into the section content", async () => {
    const api = {
      GetSingleClinicalReportById: vi.fn().mockResolvedValue({
        data: { sections: [{ id: "s1", section: "Assessments", content: { items: [{ a: 1 }] }, order: 0 }] },
      }),
    };
    const result = await run({ reportId: "r1", api, tokens });
    expect(result.payload.sections[0].content).toEqual([{ a: 1 }]);
  });

  it("derives an id for a section label that is not configured", async () => {
    const api = {
      GetSingleClinicalReportById: vi.fn().mockResolvedValue({
        data: { sections: [{ id: "s1", section: "Some Other Thing", content: {}, order: 0 }] },
      }),
    };
    const result = await run({ reportId: "r1", api, tokens });
    expect(result.payload.sections[0].sectionId).toBe("someotherthing");
  });

  it("keeps only the first of duplicated section types", async () => {
    const api = {
      GetSingleClinicalReportById: vi.fn().mockResolvedValue({
        data: {
          sections: [
            { id: "s1", section: "Review", content: { n: 1 }, order: 0 },
            { id: "s2", section: "Review", content: { n: 2 }, order: 1 },
          ],
        },
      }),
    };
    const result = await run({ reportId: "r1", api, tokens });
    expect(result.payload.sections.filter((x) => x.sectionId === "review")).toHaveLength(1);
    expect(result.payload.existingSectionIds.review).toBe("s1");
  });

  it("falls back to the array index when a section carries no order", async () => {
    const api = {
      GetSingleClinicalReportById: vi.fn().mockResolvedValue({
        data: { sections: [{ id: "s1", section: "Review", content: {} }] },
      }),
    };
    const result = await run({ reportId: "r1", api, tokens });
    expect(result.type).toContain("fulfilled");
  });

  it("copes with a report that has no sections at all", async () => {
    const api = { GetSingleClinicalReportById: vi.fn().mockResolvedValue({ data: {} }) };
    const result = await run({ reportId: "r1", api, tokens });
    expect(result.payload.sections).toEqual([]);
  });

  it("reads a response that is not wrapped in data", async () => {
    const api = {
      GetSingleClinicalReportById: vi.fn().mockResolvedValue({ title: "Bare", sections: [] }),
    };
    const result = await run({ reportId: "r1", api, tokens });
    expect(result.payload.metadata.documentTitle).toBe("Bare");
  });

  it("fills metadata defaults for a sparse report", async () => {
    const api = { GetSingleClinicalReportById: vi.fn().mockResolvedValue({ data: { sections: [] } }) };
    const result = await run({ reportId: "r1", api, tokens });
    const m = result.payload.metadata;
    expect(m.documentTitle).toBe("");
    expect(m.approver).toBe("");
    expect(m.approverId).toBeNull();
    expect(m.status).toBe("DRAFT");
    expect(m.client.name).toBe("");
  });

  it("builds the client name from the nested client record", async () => {
    const api = {
      GetSingleClinicalReportById: vi.fn().mockResolvedValue({
        data: {
          sections: [],
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-02-01T00:00:00Z",
          status: "APPROVED",
          approver: { fullName: "Dr A" },
          creator: { fullName: "Dr B" },
          client: { client: { firstName: "Jo", lastName: "Bloggs" } },
        },
      }),
    };
    const result = await run({ reportId: "r1", api, tokens });
    const m = result.payload.metadata;
    expect(m.client.name).toBe("Jo Bloggs");
    expect(m.approver).toBe("Dr A");
    expect(m.createdBy).toBe("Dr B");
    expect(m.status).toBe("APPROVED");
    expect(m.dateCreated).toBeTruthy();
    expect(m.lastUpdated).toBeTruthy();
  });

  it("rejects when the fetch fails", async () => {
    const api = {
      GetSingleClinicalReportById: vi.fn().mockRejectedValue(new Error("gone")),
    };
    const result = await run({ reportId: "r1", api, tokens });
    expect(result.type).toContain("rejected");
  });
});
