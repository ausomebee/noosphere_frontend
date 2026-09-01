import { describe, it, expect, vi, beforeEach } from "vitest";

import reducer, {
  newestChangeRequest,
  publishReport,
  loadReport,
  addSection,
  removeSection,
  saveDraft,
  updateSectionData,
  selectSaveSuccess,
  selectIsPublishing,
  selectPublishSuccess,
  selectActiveSectionsWithData,
} from "../ReduxStore/features/clinicalReportSlice";

/**
 * The half of the clinical report slice that clinicalReportSlice.branches
 * doesn't reach: the publish thunk (a near-twin of saveDraft but with its own
 * payload), the change-request picker behind the "changes requested" banner,
 * and the metadata fallbacks the loader fills in for a sparse report.
 */

const initial = () => reducer(undefined, { type: "@@INIT" });
const tokens = { accessToken: "at", refreshToken: "rt" };

const metadata = {
  tenantId: "ten1",
  clientTenantId: "ct1",
  creatorId: "u1",
  approverId: "u2",
  documentTitle: "Report",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("newestChangeRequest", () => {
  it("returns null for anything that is not a populated array", () => {
    expect(newestChangeRequest(undefined)).toBeNull();
    expect(newestChangeRequest(null)).toBeNull();
    expect(newestChangeRequest("nope")).toBeNull();
    expect(newestChangeRequest([])).toBeNull();
  });

  it("falls back to the last entry when no request carries a timestamp", () => {
    const list = [{ description: "first" }, { description: "second" }];
    expect(newestChangeRequest(list).description).toBe("second");
  });

  it("ignores a null entry while looking for timestamps", () => {
    const list = [null, { description: "only", createdAt: "2026-01-01" }];
    expect(newestChangeRequest(list).description).toBe("only");
  });

  it("picks the most recent regardless of the array's own order", () => {
    const list = [
      { description: "old", createdAt: "2026-01-01T00:00:00Z" },
      { description: "new", createdAt: "2026-06-01T00:00:00Z" },
      { description: "middle", createdAt: "2026-03-01T00:00:00Z" },
    ];
    expect(newestChangeRequest(list).description).toBe("new");
  });

  it("keeps the earlier entry when a later one is not newer", () => {
    const list = [
      { description: "new", createdAt: "2026-06-01T00:00:00Z" },
      { description: "old", createdAt: "2026-01-01T00:00:00Z" },
    ];
    expect(newestChangeRequest(list).description).toBe("new");
  });
});

describe("publishReport thunk", () => {
  const run = (reportData, existingSectionIds = {}, api) => {
    const dispatch = vi.fn();
    const getState = vi.fn(() => ({
      clinicalReport: { ...initial(), existingSectionIds },
    }));
    return publishReport({ reportData, api, tokens })(dispatch, getState, undefined);
  };

  it("creates a submitted report with consent appended last", async () => {
    const api = {
      CreateClinicalReport: vi.fn().mockResolvedValue({ id: "r1" }),
      UpdateClinicalReport: vi.fn(),
    };
    const result = await run(
      {
        reportId: null,
        metadata,
        activeSections: ["assessments"],
        sectionData: { assessments: { note: "x" } },
      },
      {},
      api
    );
    expect(result.type).toContain("fulfilled");
    expect(api.UpdateClinicalReport).not.toHaveBeenCalled();
    const payload = api.CreateClinicalReport.mock.calls[0][0];
    expect(payload.status).toBe("SUBMITTED");
    expect(payload.sections[payload.sections.length - 1].section).toBe(
      "Consent & Signatures"
    );
  });

  it("updates rather than creates when the report already exists", async () => {
    const api = {
      CreateClinicalReport: vi.fn(),
      UpdateClinicalReport: vi.fn().mockResolvedValue({ id: "r1" }),
    };
    await run(
      { reportId: "r1", metadata, activeSections: [], sectionData: {} },
      {},
      api
    );
    expect(api.CreateClinicalReport).not.toHaveBeenCalled();
    expect(api.UpdateClinicalReport.mock.calls[0][0].id).toBe("r1");
  });

  it("wraps an array as items and a primitive as a value", async () => {
    const api = { CreateClinicalReport: vi.fn().mockResolvedValue({}) };
    await run(
      {
        reportId: null,
        metadata,
        activeSections: ["assessments", "review"],
        sectionData: { assessments: [{ a: 1 }], review: "just text" },
      },
      {},
      api
    );
    const { sections } = api.CreateClinicalReport.mock.calls[0][0];
    expect(sections[0].content).toEqual({ items: [{ a: 1 }] });
    expect(sections[1].content).toEqual({ value: "just text" });
  });

  it("treats a null section value as a plain value too", async () => {
    const api = { CreateClinicalReport: vi.fn().mockResolvedValue({}) };
    await run(
      {
        reportId: null,
        metadata,
        activeSections: ["review"],
        sectionData: { review: null },
      },
      {},
      api
    );
    // A null entry falls through to the `|| {}` default, so it publishes as an
    // empty object rather than as { value: null }.
    expect(api.CreateClinicalReport.mock.calls[0][0].sections[0].content).toEqual({});
  });

  it("carries a known section id and labels an unconfigured section raw", async () => {
    const api = { CreateClinicalReport: vi.fn().mockResolvedValue({}) };
    await run(
      {
        reportId: null,
        metadata,
        activeSections: ["review", "mystery"],
        sectionData: { review: {}, mystery: {} },
      },
      { review: "sec-1" },
      api
    );
    const { sections } = api.CreateClinicalReport.mock.calls[0][0];
    expect(sections[0].id).toBe("sec-1");
    expect(sections[1].id).toBeUndefined();
    expect(sections[1].section).toBe("mystery");
  });

  it("does not append a second consent section when one is already there", async () => {
    const api = { CreateClinicalReport: vi.fn().mockResolvedValue({}) };
    await run(
      {
        reportId: null,
        metadata,
        activeSections: ["consentSignatures"],
        sectionData: { consentSignatures: { signed: true } },
      },
      {},
      api
    );
    const { sections } = api.CreateClinicalReport.mock.calls[0][0];
    expect(sections.filter((s) => s.section === "Consent & Signatures")).toHaveLength(1);
  });

  it("appends an empty consent section when nothing was captured", async () => {
    const api = { CreateClinicalReport: vi.fn().mockResolvedValue({}) };
    await run(
      { reportId: null, metadata, activeSections: [], sectionData: {} },
      {},
      api
    );
    const { sections } = api.CreateClinicalReport.mock.calls[0][0];
    expect(sections[0]).toEqual(
      expect.objectContaining({ section: "Consent & Signatures", content: {}, order: 0 })
    );
  });

  it("copes with a state that has no section id map yet", async () => {
    const api = { CreateClinicalReport: vi.fn().mockResolvedValue({}) };
    const dispatch = vi.fn();
    const getState = vi.fn(() => ({
      clinicalReport: { ...initial(), existingSectionIds: undefined },
    }));
    const result = await publishReport({
      reportData: { reportId: null, metadata, activeSections: ["review"], sectionData: {} },
      api,
      tokens,
    })(dispatch, getState, undefined);
    expect(result.type).toContain("fulfilled");
  });

  it("rejects with the backend message, then with its own wording", async () => {
    const withMessage = await run(
      { reportId: null, metadata, activeSections: [], sectionData: {} },
      {},
      { CreateClinicalReport: vi.fn().mockRejectedValue(new Error("server said no")) }
    );
    expect(withMessage.payload).toBe("server said no");

    const withoutMessage = await run(
      { reportId: null, metadata, activeSections: [], sectionData: {} },
      {},
      { CreateClinicalReport: vi.fn().mockRejectedValue({}) }
    );
    expect(withoutMessage.payload).toBe("Publish failed");
  });
});

describe("loadReport change-request metadata", () => {
  const run = (data) => {
    const api = { GetSingleClinicalReportById: vi.fn().mockResolvedValue({ data }) };
    return loadReport({ reportId: "r1", api, tokens })(vi.fn(), vi.fn(), undefined);
  };

  it("flags changes requested when the list is non-empty and shows the newest note", async () => {
    const result = await run({
      id: "r1",
      status: "DRAFT",
      clinicalReportChangeRequests: [
        { description: "older", createdAt: "2026-01-01T00:00:00Z" },
        { description: "newest", createdAt: "2026-05-01T00:00:00Z" },
      ],
    });
    expect(result.payload.metadata.hasChangesRequested).toBe(true);
    expect(result.payload.metadata.changeRequestMessage).toBe("newest");
  });

  it("flags changes requested from the status alone, with a stand-in message", async () => {
    const result = await run({ id: "r1", status: "CHANGES_REQUESTED" });
    expect(result.payload.metadata.hasChangesRequested).toBe(true);
    expect(result.payload.metadata.changeRequestMessage).toBe(
      "Changes requested for this document."
    );
  });

  it("leaves the banner off for a report with an empty request list", async () => {
    const result = await run({
      id: "r1",
      status: "DRAFT",
      clinicalReportChangeRequests: [],
    });
    expect(result.payload.metadata.hasChangesRequested).toBe(false);
    expect(result.payload.metadata.changeRequestMessage).toBe("");
  });

  it("leaves the message empty when a request carries no description", async () => {
    const result = await run({
      id: "r1",
      status: "DRAFT",
      clinicalReportChangeRequests: [{ createdAt: "2026-01-01T00:00:00Z" }],
    });
    expect(result.payload.metadata.changeRequestMessage).toBe("");
  });

  it("formats the created and updated dates when the API sends them", async () => {
    const result = await run({
      id: "r1",
      createdAt: "2026-01-02T00:00:00Z",
      updatedAt: "2026-01-03T00:00:00Z",
      approver: { fullName: "Dr Approver" },
      creator: { fullName: "Dr Author" },
    });
    expect(result.payload.metadata.dateCreated).not.toBe("");
    expect(result.payload.metadata.lastUpdated).not.toBe("");
    expect(result.payload.metadata.approver).toBe("Dr Approver");
    expect(result.payload.metadata.createdBy).toBe("Dr Author");
  });

  it("falls back to '??' initials when there is no client record", async () => {
    const result = await run({ id: "r1" });
    expect(result.payload.metadata.client.initials).toBe("??");
    expect(result.payload.metadata.client.name).toBe("");
  });

  it("builds initials from a client with only one name", async () => {
    const result = await run({
      id: "r1",
      client: { client: { firstName: "Ada" } },
    });
    expect(result.payload.metadata.client.name).toBe("Ada");
    expect(result.payload.metadata.client.initials).toBe("A");
  });
});

describe("loadReport.fulfilled deduplication", () => {
  it("keeps only the first of each base section type", () => {
    const s = reducer(initial(), {
      type: loadReport.fulfilled.type,
      payload: {
        id: "r1",
        metadata: null,
        existingSectionIds: null,
        sections: [
          { sectionId: "review", content: { a: 1 } },
          { sectionId: "review_2", content: { a: 2 } },
          { sectionId: "assessments", content: { b: 1 } },
        ],
      },
    });
    expect(s.activeSections).toEqual(["review", "assessments"]);
    expect(s.sectionData.review).toEqual({ a: 1 });
    expect(s.existingSectionIds).toEqual({});
  });

  it("keeps the current metadata when the payload carries none", () => {
    const before = initial();
    const s = reducer(before, {
      type: loadReport.fulfilled.type,
      payload: { id: null, metadata: undefined, sections: [], existingSectionIds: {} },
    });
    expect(s.metadata).toEqual(before.metadata);
    expect(s.reportId).toBe(before.reportId);
  });
});

describe("section defaults", () => {
  it("seeds an array-shaped section with an empty array", () => {
    const s = reducer(initial(), addSection("assessments"));
    expect(Array.isArray(s.sectionData.assessments)).toBe(true);
  });

  it("leaves data already present alone when the section is re-added", () => {
    let s = reducer(initial(), addSection("review"));
    s = { ...s, sectionData: { ...s.sectionData, review: { keep: true } } };
    s = reducer(reducer(s, removeSection("nothing-here")), addSection("review"));
    expect(s.sectionData.review).toEqual({ keep: true });
  });
});

describe("publish selectors", () => {
  it("default to false when the slice is absent", () => {
    expect(selectIsPublishing({})).toBe(false);
    expect(selectPublishSuccess({})).toBe(false);
  });

  it("read the flags out of a populated slice", () => {
    const state = { clinicalReport: { ...initial(), isPublishing: true, publishSuccess: true } };
    expect(selectIsPublishing(state)).toBe(true);
    expect(selectPublishSuccess(state)).toBe(true);
  });

  it("labels an unconfigured section by its own id and reports nulls", () => {
    const state = {
      clinicalReport: {
        ...initial(),
        activeSections: ["mystery"],
        expandedSections: [],
        sectionData: {},
        existingSectionIds: {},
      },
    };
    expect(selectActiveSectionsWithData(state)).toEqual([
      { id: "mystery", label: "mystery", data: null, isExpanded: false, apiSectionId: null },
    ]);
  });

  it("labels a configured section and reports its data, expansion and api id", () => {
    const state = {
      clinicalReport: {
        ...initial(),
        activeSections: ["review"],
        expandedSections: ["review"],
        sectionData: { review: { a: 1 } },
        existingSectionIds: { review: "sec-1" },
      },
    };
    const [row] = selectActiveSectionsWithData(state);
    expect(row.isExpanded).toBe(true);
    expect(row.apiSectionId).toBe("sec-1");
    expect(row.data).toEqual({ a: 1 });
    expect(row.label).not.toBe("review");
  });
});

describe("saveDraft remaining arms", () => {
  it("copes with a state that has no section id map, and reports its own wording", async () => {
    const dispatch = vi.fn();
    const getState = vi.fn(() => ({
      clinicalReport: { ...initial(), existingSectionIds: undefined },
    }));

    const ok = await saveDraft({
      reportData: { reportId: null, metadata, activeSections: ["review"], sectionData: {} },
      api: { CreateClinicalReport: vi.fn().mockResolvedValue({ id: "r1" }) },
      tokens,
    })(dispatch, getState, undefined);
    expect(ok.type).toContain("fulfilled");

    const failed = await saveDraft({
      reportData: { reportId: null, metadata, activeSections: [], sectionData: {} },
      api: { CreateClinicalReport: vi.fn().mockRejectedValue({}) },
      tokens,
    })(dispatch, getState, undefined);
    expect(failed.payload).toBe("Save draft failed");
  });
});

describe("loadReport remaining arms", () => {
  const load = (data) => {
    const api = { GetSingleClinicalReportById: vi.fn().mockResolvedValue({ data }) };
    return loadReport({ reportId: "r1", api, tokens })(vi.fn(), vi.fn(), undefined);
  };

  it("defaults a section that arrives with no content", async () => {
    const result = await load({
      id: "r1",
      sections: [{ id: "s1", section: "Review", order: 0 }],
    });
    expect(result.payload.sections[0].content).toEqual({});
  });

  it("builds the client's name and initials from both names", async () => {
    const result = await load({
      id: "r1",
      client: { client: { firstName: "Ada", lastName: "Lovelace" } },
    });
    expect(result.payload.metadata.client.name).toBe("Ada Lovelace");
    expect(result.payload.metadata.client.initials).toBe("AL");
  });

  it("copes with a client record that carries no names at all", async () => {
    const result = await load({ id: "r1", client: { client: {} } });
    expect(result.payload.metadata.client.name).toBe("");
    expect(result.payload.metadata.client.initials).toBe("");
  });
});

describe("section data seeding", () => {
  it("keeps a section's data when it is re-added after a reset of another", () => {
    let s = reducer(initial(), addSection("review"));
    const seeded = s.sectionData.review;
    s = reducer(s, addSection("assessments"));
    expect(s.sectionData.review).toBe(seeded);
  });

  it("seeds an unconfigured section's data as an empty object on first write", () => {
    const s = reducer(
      initial(),
      updateSectionData({ sectionId: "mystery_2", data: { a: 1 } })
    );
    expect(s.sectionData.mystery_2).toEqual({ a: 1 });
  });

  it("seeds an array-shaped section as an array on first write", () => {
    const s = reducer(initial(), updateSectionData({ sectionId: "assessments", data: [{ a: 1 }] }));
    expect(Array.isArray(s.sectionData.assessments)).toBe(true);
  });
});

describe("save-success selector", () => {
  it("defaults to false and reads a set flag", () => {
    expect(selectSaveSuccess({})).toBe(false);
    expect(
      selectSaveSuccess({ clinicalReport: { ...initial(), saveSuccess: true } })
    ).toBe(true);
  });

  it("reports an empty list when nothing is active", () => {
    expect(
      selectActiveSectionsWithData({
        clinicalReport: { ...initial(), activeSections: null },
      })
    ).toEqual([]);
  });
});

describe("section seeding, both shapes", () => {
  it("seeds an object-shaped section from its default and an array one as an array", () => {
    let s = reducer(initial(), addSection("clientInformation"));
    expect(s.sectionData.clientInformation).toEqual(
      expect.objectContaining({ clientFullName: "" })
    );
    s = reducer(s, addSection("targetBehaviours"));
    expect(s.sectionData.targetBehaviours).toEqual([]);
  });

  it("leaves a section's existing data alone when it is added again", () => {
    let s = reducer(initial(), updateSectionData({ sectionId: "review", data: { keep: 1 } }));
    s = reducer(s, addSection("review"));
    expect(s.sectionData.review).toEqual(expect.objectContaining({ keep: 1 }));
  });

  it("seeds a suffixed array section as an array on first write", () => {
    const s = reducer(
      initial(),
      updateSectionData({ sectionId: "targetBehaviours_2", data: [{ a: 1 }] })
    );
    expect(Array.isArray(s.sectionData.targetBehaviours_2)).toBe(true);
  });

  it("reports an empty list when the active sections are missing entirely", () => {
    expect(selectActiveSectionsWithData({ clinicalReport: { ...initial(), activeSections: undefined } }))
      .toEqual([]);
  });
});
