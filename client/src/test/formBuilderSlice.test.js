import { describe, it, expect } from "vitest";

import reducer, {
  setFormName,
  setFormId,
  setTenantId,
  setStatus,
  setIsPublished,
  setIsTemplate,
  setLoading,
  setError,
  addElement,
  updateElement,
  deleteElement,
  reorderElements,
  toggleRequired,
  addOption,
  removeOption,
  updateOption,
  loadForm,
  publishForm,
  saveDraft,
  updateFormMetadata,
  resetForm,
  selectIsLoading,
  selectError,
} from "../ReduxStore/features/formBuilderSlice";

/**
 * The shared-form structure as the client renders it.
 *
 * The slice carries every field twice -- `type`/`fieldType` and
 * `required`/`isRequired` -- because the API and the renderer disagree on
 * naming. Most of the branches here are keeping those pairs in step, plus
 * `loadForm`'s three shapes: already-transformed elements, a raw API payload
 * with a `fields` array, and a partial metadata-only update.
 */

const initial = () => reducer(undefined, { type: "@@INIT" });

const withElement = (over = {}) =>
  reducer(initial(), addElement({ id: "e1", type: "text", label: "Name", ...over }));

describe("form metadata setters", () => {
  it("sets each field it owns", () => {
    let s = reducer(initial(), setFormName("Intake"));
    expect(s.formName).toBe("Intake");
    s = reducer(s, setFormId("f1"));
    expect(s.formId).toBe("f1");
    s = reducer(s, setTenantId("t1"));
    expect(s.tenantId).toBe("t1");
    s = reducer(s, setStatus("published"));
    expect(s.status).toBe("published");
    s = reducer(s, setIsPublished(true));
    expect(s.isPublished).toBe(true);
    s = reducer(s, setIsTemplate(true));
    expect(s.isTemplate).toBe(true);
    s = reducer(s, setLoading(true));
    expect(s.isLoading).toBe(true);
    s = reducer(s, setError("bad"));
    expect(s.error).toBe("bad");
  });

  it("merges arbitrary metadata and stamps the update time", () => {
    const s = reducer(initial(), updateFormMetadata({ formName: "Renamed", tenantId: "t9" }));
    expect(s.formName).toBe("Renamed");
    expect(s.tenantId).toBe("t9");
    expect(s.updatedAt).toBeTruthy();
  });

  it("marks the form published and stamps the time", () => {
    const s = reducer(initial(), publishForm());
    expect(s.status).toBe("published");
    expect(s.isPublished).toBe(true);
    expect(s.updatedAt).toBeTruthy();
  });

  it("stamps the time on a draft save without changing the status", () => {
    const s = reducer(initial(), saveDraft());
    expect(s.status).toBe("draft");
    expect(s.updatedAt).toBeTruthy();
  });

  it("resets everything", () => {
    let s = reducer(initial(), setFormName("Intake"));
    s = reducer(s, addElement({ id: "e1", type: "text" }));
    expect(reducer(s, resetForm())).toEqual(initial());
  });
});

describe("adding elements", () => {
  it("fills in every default for a bare element", () => {
    const s = withElement();
    expect(s.elements[0]).toEqual(
      expect.objectContaining({
        id: "e1",
        type: "text",
        fieldType: "text",
        label: "Name",
        placeholder: "",
        required: false,
        isRequired: false,
        options: null,
        order: 1,
        maxFiles: 1,
        maxFileSize: 10,
        maxStars: 5,
        allowSignatureUpload: true,
      })
    );
  });

  it("takes the type from fieldType when that is what the caller sent", () => {
    const s = reducer(initial(), addElement({ id: "e1", fieldType: "starRating" }));
    expect(s.elements[0].type).toBe("starRating");
    expect(s.elements[0].fieldType).toBe("starRating");
  });

  it("accepts required under either name", () => {
    const a = reducer(initial(), addElement({ id: "e1", type: "text", required: true }));
    expect(a.elements[0]).toEqual(expect.objectContaining({ required: true, isRequired: true }));

    const b = reducer(initial(), addElement({ id: "e2", type: "text", isRequired: true }));
    expect(b.elements[0]).toEqual(expect.objectContaining({ required: true, isRequired: true }));
  });

  it("mints an id when none is supplied", () => {
    const s = reducer(initial(), addElement({ type: "text" }));
    expect(typeof s.elements[0].id).toBe("string");
    expect(s.elements[0].id.length).toBeGreaterThan(0);
  });

  it("takes the form id from state when the element carries none", () => {
    let s = reducer(initial(), setFormId("f1"));
    s = reducer(s, addElement({ id: "e1", type: "text" }));
    expect(s.elements[0].formId).toBe("f1");
  });

  it("numbers each element in turn, and honours an explicit order", () => {
    let s = withElement();
    s = reducer(s, addElement({ id: "e2", type: "text" }));
    expect(s.elements.map((e) => e.order)).toEqual([1, 2]);

    s = reducer(s, addElement({ id: "e3", type: "text", order: 9 }));
    expect(s.elements[2].order).toBe(9);
  });

  it("honours explicit upload, rating and signature settings", () => {
    const s = reducer(
      initial(),
      addElement({
        id: "e1",
        type: "fileUpload",
        maxFiles: 3,
        maxFileSize: 25,
        allowedFileTypes: ["PDF"],
        maxStars: 10,
        allowSignatureUpload: false,
      })
    );
    expect(s.elements[0]).toEqual(
      expect.objectContaining({
        maxFiles: 3,
        maxFileSize: 25,
        allowedFileTypes: ["PDF"],
        maxStars: 10,
        allowSignatureUpload: false,
      })
    );
  });
});

describe("editing elements", () => {
  it("keeps required and isRequired in step from either side", () => {
    let s = reducer(withElement(), updateElement({ id: "e1", updates: { required: true } }));
    expect(s.elements[0]).toEqual(expect.objectContaining({ required: true, isRequired: true }));

    s = reducer(s, updateElement({ id: "e1", updates: { isRequired: false } }));
    expect(s.elements[0]).toEqual(expect.objectContaining({ required: false, isRequired: false }));
  });

  it("keeps type and fieldType in step", () => {
    const s = reducer(withElement(), updateElement({ id: "e1", updates: { type: "textarea" } }));
    expect(s.elements[0]).toEqual(expect.objectContaining({ type: "textarea", fieldType: "textarea" }));
  });

  it("applies any other update as given", () => {
    const s = reducer(withElement(), updateElement({ id: "e1", updates: { label: "Full name" } }));
    expect(s.elements[0].label).toBe("Full name");
  });

  it("matches an element whose id is numeric", () => {
    const s = reducer(
      reducer(initial(), addElement({ id: 7, type: "text" })),
      updateElement({ id: 7, updates: { label: "Seven" } })
    );
    expect(s.elements[0].label).toBe("Seven");
  });

  it("ignores an edit aimed at an element that is not there", () => {
    const before = withElement();
    expect(reducer(before, updateElement({ id: "nope", updates: { label: "x" } }))).toEqual(before);
    expect(reducer(before, toggleRequired("nope"))).toEqual(before);
  });

  it("toggles required on both names at once", () => {
    const s = reducer(withElement(), toggleRequired("e1"));
    expect(s.elements[0]).toEqual(expect.objectContaining({ required: true, isRequired: true }));
  });

  it("deletes an element and renumbers what is left", () => {
    let s = withElement();
    s = reducer(s, addElement({ id: "e2", type: "text" }));
    s = reducer(s, addElement({ id: "e3", type: "text" }));
    s = reducer(s, deleteElement("e2"));
    expect(s.elements.map((e) => e.id)).toEqual(["e1", "e3"]);
    expect(s.elements.map((e) => e.order)).toEqual([1, 2]);
  });

  it("reorders elements and renumbers them", () => {
    let s = withElement();
    s = reducer(s, addElement({ id: "e2", type: "text" }));
    const flipped = [...s.elements].reverse();
    s = reducer(s, reorderElements(flipped));
    expect(s.elements.map((e) => e.id)).toEqual(["e2", "e1"]);
    expect(s.elements.map((e) => e.order)).toEqual([1, 2]);
  });
});

describe("element options", () => {
  it("creates the option list on the first add", () => {
    const s = reducer(withElement(), addOption({ id: "e1", option: "One" }));
    expect(s.elements[0].options).toEqual(["One"]);
  });

  it("appends to a list that is already there", () => {
    let s = reducer(withElement({ options: ["One"] }), addOption({ id: "e1", option: "Two" }));
    expect(s.elements[0].options).toEqual(["One", "Two"]);
  });

  it("replaces a non-array options value rather than pushing onto it", () => {
    const s = reducer(withElement({ options: "not-a-list" }), addOption({ id: "e1", option: "One" }));
    expect(s.elements[0].options).toEqual(["One"]);
  });

  it("removes and updates by index", () => {
    let s = withElement({ options: ["One", "Two", "Three"] });
    s = reducer(s, updateOption({ id: "e1", index: 1, value: "Second" }));
    expect(s.elements[0].options).toEqual(["One", "Second", "Three"]);
    s = reducer(s, removeOption({ id: "e1", index: 0 }));
    expect(s.elements[0].options).toEqual(["Second", "Three"]);
  });

  it("ignores an index past the end of the list", () => {
    const before = withElement({ options: ["One"] });
    expect(reducer(before, removeOption({ id: "e1", index: 5 }))).toEqual(before);
    expect(reducer(before, updateOption({ id: "e1", index: 5, value: "x" }))).toEqual(before);
  });

  it("ignores option edits on an element with no list", () => {
    const before = withElement();
    expect(reducer(before, removeOption({ id: "e1", index: 0 }))).toEqual(before);
    expect(reducer(before, updateOption({ id: "e1", index: 0, value: "x" }))).toEqual(before);
  });

  it("ignores option edits aimed at an element that is not there", () => {
    const before = withElement({ options: ["One"] });
    expect(reducer(before, addOption({ id: "nope", option: "x" }))).toEqual(before);
    expect(reducer(before, removeOption({ id: "nope", index: 0 }))).toEqual(before);
    expect(reducer(before, updateOption({ id: "nope", index: 0, value: "x" }))).toEqual(before);
  });
});

describe("loadForm with already-transformed elements", () => {
  const load = (over = {}) =>
    reducer(
      initial(),
      loadForm({
        formName: "Intake",
        elements: [{ id: 1, type: "text", label: "Name", required: true, order: "2" }],
        formId: "f1",
        tenantId: "t1",
        ...over,
      })
    );

  it("normalises ids, the type pair, the required pair and the order", () => {
    const s = load();
    expect(s.elements[0]).toEqual(
      expect.objectContaining({
        id: "1",
        type: "text",
        fieldType: "text",
        required: true,
        isRequired: true,
        order: 2,
      })
    );
  });

  it("falls back to a placeholder name and an unknown type", () => {
    const s = load({ formName: undefined, elements: [{ id: 1 }] });
    expect(s.formName).toBe("Untitled Form");
    expect(s.elements[0].type).toBe("unknown");
    expect(s.elements[0].fieldType).toBe("unknown");
  });

  it("derives the status from isPublished when none is given", () => {
    expect(load({ isPublished: true }).status).toBe("published");
    expect(load({ isPublished: false }).status).toBe("draft");
    expect(load({ status: "archived", isPublished: true }).status).toBe("archived");
  });

  it("defaults an unparseable order to zero", () => {
    const s = load({ elements: [{ id: 1, type: "text", order: "abc" }] });
    expect(s.elements[0].order).toBe(0);
  });

  it("clears the loading and error flags", () => {
    let s = reducer(initial(), setLoading(true));
    s = reducer(s, setError("old"));
    s = reducer(s, loadForm({ elements: [], formName: "Intake" }));
    expect(s.isLoading).toBe(false);
    expect(s.error).toBeNull();
  });
});

describe("loadForm with a raw API payload", () => {
  const load = (fields, formOver = {}) =>
    reducer(
      initial(),
      loadForm({
        formData: {
          id: "f1",
          name: "Intake",
          tenantId: "t1",
          isDraft: true,
          fields,
          ...formOver,
        },
      })
    );

  it("transforms a plain field", () => {
    const s = load([{ id: 1, fieldType: "text", label: "Name", isRequired: true, order: 3 }]);
    expect(s.elements[0]).toEqual(
      expect.objectContaining({ id: "1", type: "text", required: true, isRequired: true, order: 3 })
    );
    expect(s.formName).toBe("Intake");
    expect(s.status).toBe("draft");
    expect(s.isPublished).toBe(false);
  });

  it("marks a non-draft form published", () => {
    const s = load([], { isDraft: false });
    expect(s.status).toBe("published");
    expect(s.isPublished).toBe(true);
  });

  it("reads a file upload's settings", () => {
    const s = load([
      {
        id: 1,
        fieldType: "fileUpload",
        fileUpload: [{ maxFiles: "3", maxSize: "25MB", allowedTypes: ["PDF"] }],
      },
    ]);
    expect(s.elements[0]).toEqual(
      expect.objectContaining({ maxFiles: 3, maxFileSize: 25, allowedFileTypes: ["PDF"] })
    );
  });

  it("falls back to defaults for a file upload with no config", () => {
    const s = load([{ id: 1, fieldType: "fileUpload" }]);
    expect(s.elements[0]).toEqual(
      expect.objectContaining({ maxFiles: 1, maxFileSize: 10, allowedFileTypes: ["Image", "PDF"] })
    );
  });

  it.each([
    ["512KB", 0.5],
    ["2GB", 2048],
    ["7", 7],
    [15, 15],
    ["nonsense", 10],
  ])("reads a max file size of %s as %s MB", (maxSize, expected) => {
    const s = load([{ id: 1, fieldType: "fileUpload", fileUpload: [{ maxSize }] }]);
    expect(s.elements[0].maxFileSize).toBe(expected);
  });

  it("reads a star rating, defaulting to five", () => {
    expect(load([{ id: 1, fieldType: "starRating", starRating: ["8"] }]).elements[0].maxStars).toBe(8);
    expect(load([{ id: 1, fieldType: "starRating" }]).elements[0].maxStars).toBe(5);
  });

  it("reads a signature's upload flag, defaulting to off", () => {
    expect(
      load([{ id: 1, fieldType: "signature", signature: [{ allowUpload: true }] }]).elements[0]
        .allowSignatureUpload
    ).toBe(true);
    expect(load([{ id: 1, fieldType: "signature" }]).elements[0].allowSignatureUpload).toBe(false);
  });

  it("falls back to a placeholder form name", () => {
    const s = load([], { name: undefined });
    expect(s.formName).toBe("Untitled Form");
  });

  it("defaults a field's blanks", () => {
    const s = load([{ id: 1, fieldType: "text" }]);
    expect(s.elements[0]).toEqual(
      expect.objectContaining({ label: "", placeholder: "", options: [], order: 0, required: false })
    );
  });
});

describe("loadForm as a partial update", () => {
  it("changes only what it is given and leaves the rest alone", () => {
    let s = reducer(initial(), loadForm({ elements: [{ id: 1, type: "text" }], formName: "Intake" }));
    s = reducer(s, loadForm({ formName: "Renamed" }));
    expect(s.formName).toBe("Renamed");
    expect(s.elements).toHaveLength(1);
  });

  it("keeps the current values when the payload omits them", () => {
    let s = reducer(initial(), loadForm({ elements: [], formName: "Intake", formId: "f1" }));
    s = reducer(s, loadForm({}));
    expect(s.formName).toBe("Intake");
    expect(s.formId).toBe("f1");
  });

  it("honours an explicit false for the boolean flags", () => {
    let s = reducer(initial(), setIsPublished(true));
    s = reducer(s, setIsTemplate(true));
    s = reducer(s, loadForm({ isPublished: false, isTemplate: false }));
    expect(s.isPublished).toBe(false);
    expect(s.isTemplate).toBe(false);
  });

  it("ignores a formData payload whose fields are not an array", () => {
    const s = reducer(initial(), loadForm({ formData: { name: "Intake", fields: "nope" } }));
    expect(s.elements).toEqual([]);
  });
});

describe("selectors", () => {
  it("read the loading and error flags", () => {
    const state = { formBuilder: { ...initial(), isLoading: true, error: "bad" } };
    expect(selectIsLoading(state)).toBe(true);
    expect(selectError(state)).toBe("bad");
  });
});

describe("an upload field configured with no size at all", () => {
  it("treats a maximum size of zero as no maximum", () => {
    // The size parser passes a numeric 0 straight through, so the only guard
    // left against a zero-byte limit is the fallback on the assignment itself.
    const s = reducer(
      initial(),
      loadForm({
        formData: {
          name: "Intake",
          fields: [{ id: 1, fieldType: "fileUpload", fileUpload: [{ maxSize: 0 }] }],
        },
      })
    );
    expect(s.elements[0].maxFileSize).toBe(10);
  });
});
