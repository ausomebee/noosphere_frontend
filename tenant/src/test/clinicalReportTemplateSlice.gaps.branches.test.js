import { describe, it, expect, vi, beforeEach } from "vitest";

import reducer, {
  saveTemplate,
  loadTemplate,
  addSection,
  updateSectionData,
  selectActiveSectionsWithData,
} from "../ReduxStore/features/clinicalReportTemplateSlice";

/**
 * The template slice's remaining arms: the content-shape branches the save
 * thunk uses, the load thunk's unwrapping of `{ items }` and `{ value }`
 * envelopes, and the fulfilled reducers' fallbacks for a sparse payload.
 */

const initial = () => reducer(undefined, { type: "@@INIT" });
const tokens = { accessToken: "at", refreshToken: "rt" };
const templateMetadata = { tenantId: "t1", title: "My template", isDraft: false };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("saveTemplate content shapes", () => {
  const run = (templateData, existingSectionIds, api) => {
    const dispatch = vi.fn();
    const getState = vi.fn(() => ({
      clinicalReportTemplate: { ...initial(), existingSectionIds },
    }));
    return saveTemplate({ templateData, api, tokens })(dispatch, getState, undefined);
  };

  const send = async (sectionData, activeSections) => {
    const api = { CreateClinicalReportTemplate: vi.fn().mockResolvedValue({}) };
    await run(
      { templateId: null, templateMetadata, activeSections, sectionData },
      {},
      api
    );
    return api.CreateClinicalReportTemplate.mock.calls[0][0].sections;
  };

  it("wraps an array as items", async () => {
    const sections = await send({ assessments: [{ a: 1 }] }, ["assessments"]);
    expect(sections[0].content).toEqual({ items: [{ a: 1 }] });
  });

  it("passes an object through untouched", async () => {
    const sections = await send({ review: { note: "x" } }, ["review"]);
    expect(sections[0].content).toEqual({ note: "x" });
  });

  it("wraps a primitive as a value", async () => {
    const sections = await send({ review: "just text" }, ["review"]);
    expect(sections[0].content).toEqual({ value: "just text" });
  });

  it("treats a missing entry as an empty object", async () => {
    const sections = await send({}, ["review"]);
    expect(sections[0].content).toEqual({});
  });

  it("copes with a state holding no section id map at all", async () => {
    const api = { CreateClinicalReportTemplate: vi.fn().mockResolvedValue({}) };
    const result = await run(
      {
        templateId: null,
        templateMetadata,
        activeSections: ["review"],
        sectionData: {},
      },
      undefined,
      api
    );
    expect(result.type).toContain("fulfilled");
  });

  it("rejects with the thrown message, then with its own wording", async () => {
    const withMessage = await run(
      { templateId: null, templateMetadata, activeSections: [], sectionData: {} },
      {},
      { CreateClinicalReportTemplate: vi.fn().mockRejectedValue(new Error("server said no")) }
    );
    expect(withMessage.payload).toBe("server said no");

    const withoutMessage = await run(
      { templateId: null, templateMetadata, activeSections: [], sectionData: {} },
      {},
      { CreateClinicalReportTemplate: vi.fn().mockRejectedValue({}) }
    );
    expect(withoutMessage.payload).toBe("Failed to save template");
  });
});

describe("loadTemplate content unwrapping", () => {
  const load = (sections) => {
    const api = {
      GetSingleClinicalReportTemplateById: vi
        .fn()
        .mockResolvedValue({ data: { id: "tpl1", title: "T", sections } }),
    };
    return loadTemplate({ templateId: "tpl1", api, tokens })(vi.fn(), vi.fn(), undefined);
  };

  it("unwraps an items envelope back into an array", async () => {
    const result = await load([
      { id: "s1", section: "Assessments", content: { items: [{ a: 1 }] }, order: 0 },
    ]);
    expect(result.payload.sections[0].content).toEqual([{ a: 1 }]);
  });

  it("unwraps a lone value envelope", async () => {
    const result = await load([
      { id: "s1", section: "Review", content: { value: "plain" }, order: 0 },
    ]);
    expect(result.payload.sections[0].content).toBe("plain");
  });

  it("leaves a value alongside other keys wrapped", async () => {
    const result = await load([
      { id: "s1", section: "Review", content: { value: "plain", note: "x" }, order: 0 },
    ]);
    expect(result.payload.sections[0].content).toEqual({ value: "plain", note: "x" });
  });

  it("leaves a plain object alone and defaults a missing one", async () => {
    const result = await load([
      { id: "s1", section: "Review", content: { note: "x" }, order: 0 },
      { id: "s2", section: "Assessments", order: 1 },
    ]);
    expect(result.payload.sections[0].content).toEqual({ note: "x" });
    expect(result.payload.sections[1].content).toEqual({});
  });

  it("ignores an items key that is not an array", async () => {
    const result = await load([
      { id: "s1", section: "Review", content: { items: "nope" }, order: 0 },
    ]);
    expect(result.payload.sections[0].content).toEqual({ items: "nope" });
  });

  it("derives an id for a label that is not configured", async () => {
    const result = await load([
      { id: "s1", section: "Some Custom Block", content: {}, order: 0 },
    ]);
    expect(result.payload.sections[0].sectionId).toBe("somecustomblock");
  });

  it("falls back to the array index when a section has no order", async () => {
    const result = await load([
      { id: "s1", section: "Review", content: {} },
      { id: "s2", section: "Assessments", content: {} },
    ]);
    expect(result.payload.sections.map((s) => s.order)).toEqual([0, 1]);
  });

  it("keeps an order of zero rather than treating it as missing", async () => {
    const result = await load([{ id: "s1", section: "Review", content: {}, order: 0 }]);
    expect(result.payload.sections[0].order).toBe(0);
  });

  it("reads a response that is not wrapped in data", async () => {
    const api = {
      GetSingleClinicalReportTemplateById: vi
        .fn()
        .mockResolvedValue({ id: "tpl1", title: "T", sections: [] }),
    };
    const result = await loadTemplate({ templateId: "tpl1", api, tokens })(
      vi.fn(),
      vi.fn(),
      undefined
    );
    expect(result.payload.id).toBe("tpl1");
  });
});

describe("template save and load fulfilled fallbacks", () => {
  it("reads the saved id through a data wrapper or straight off the payload", () => {
    let s = reducer(initial(), {
      type: saveTemplate.fulfilled.type,
      payload: { data: { id: "wrapped" } },
    });
    expect(s.templateId).toBe("wrapped");

    s = reducer(initial(), {
      type: saveTemplate.fulfilled.type,
      payload: { id: "bare" },
    });
    expect(s.templateId).toBe("bare");
  });

  it("keeps the current template id when the save returns none", () => {
    const before = { ...initial(), templateId: "existing" };
    const s = reducer(before, { type: saveTemplate.fulfilled.type, payload: null });
    expect(s.templateId).toBe("existing");
  });

  it("blanks the title and section map when the loaded payload has neither", () => {
    const before = { ...initial(), templateId: "existing" };
    const s = reducer(before, {
      type: loadTemplate.fulfilled.type,
      payload: { id: null, title: null, sections: [], existingSectionIds: null },
    });
    expect(s.templateMetadata.title).toBe("");
    expect(s.existingSectionIds).toEqual({});
    expect(s.templateId).toBe("existing");
  });

  it("keeps only the first of each base section type on load", () => {
    const s = reducer(initial(), {
      type: loadTemplate.fulfilled.type,
      payload: {
        id: "tpl1",
        title: "T",
        existingSectionIds: {},
        sections: [
          { sectionId: "review", content: { a: 1 } },
          { sectionId: "review_2", content: { a: 2 } },
        ],
      },
    });
    expect(s.activeSections).toEqual(["review"]);
  });
});

describe("template section data defaults", () => {
  it("refuses to add a second section of the same base type", () => {
    const s = reducer(reducer(initial(), addSection("review")), addSection("review"));
    expect(s.activeSections).toEqual(["review"]);
  });

  it("seeds an array-shaped section with an empty array", () => {
    const s = reducer(initial(), addSection("assessments"));
    expect(Array.isArray(s.sectionData.assessments)).toBe(true);
  });

  it("seeds an unknown section's data with an empty object on first write", () => {
    const s = reducer(
      initial(),
      updateSectionData({ sectionId: "mystery_2", data: { a: 1 } })
    );
    expect(s.sectionData.mystery_2).toEqual({ a: 1 });
  });

  it("does not reseed data that is already there", () => {
    let s = reducer(initial(), updateSectionData({ sectionId: "review", data: { a: 1 } }));
    s = reducer(s, updateSectionData({ sectionId: "review", data: { b: 2 } }));
    expect(s.sectionData.review).toEqual(expect.objectContaining({ a: 1, b: 2 }));
  });
});

describe("selectActiveSectionsWithData", () => {
  it("labels an unconfigured section by its own id and reports nulls", () => {
    const state = {
      clinicalReportTemplate: {
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

  it("reports a configured section's label, data, expansion and api id", () => {
    const state = {
      clinicalReportTemplate: {
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

describe("template section seeding, both shapes", () => {
  it("seeds an object-shaped section from its default and an array one as an array", () => {
    let s = reducer(initial(), addSection("clientInformation"));
    expect(typeof s.sectionData.clientInformation).toBe("object");
    expect(Array.isArray(s.sectionData.clientInformation)).toBe(false);
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
    expect(
      selectActiveSectionsWithData({
        clinicalReportTemplate: { ...initial(), activeSections: undefined },
      })
    ).toEqual([]);
  });
});
