import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import formBuilderReducer from "../ReduxStore/features/formBuilderSlice";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The custom-form builder: a drag-and-drop canvas whose state lives entirely in
 * the `formBuilder` redux slice, plus the per-field editors, the save handler
 * (draft / template / publish) and the "import from template library" modal.
 *
 * dnd-kit cannot be dragged in jsdom, so `DndContext` is a probe that captures
 * `onDragStart` / `onDragEnd` and the tests hand those handlers synthetic
 * active/over pairs; `useSortable` and `useDroppable` are stubbed because they
 * read a context the probe no longer provides. The slice itself is real, so
 * everything the handlers dispatch is genuinely exercised through the store.
 *
 * Two things about the seeded state matter. The builder wipes a fresh form on
 * mount unless `dirty` is set, so every fixture that pre-loads elements marks
 * itself dirty; and a permission-free role only greys the builder out with
 * inline styles, which jsdom happily reports but never enforces, so those tests
 * assert the style rather than trying to click through it.
 */

const api = vi.hoisted(() => ({
  GetFormsByFormId: vi.fn(),
  GetFormsByTenantId: vi.fn(),
  GetTemplatesByTenantId: vi.fn(),
  CreateCustomForm: vi.fn(),
  UpdateCustomForm: vi.fn(),
}));
vi.mock("../api/customFormsApi", () => ({ default: api }));

const toast = vi.hoisted(() => ({ showToast: vi.fn(), showApiError: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: (...a) => toast.showApiError(...a),
}));

const router = vi.hoisted(() => ({ params: {}, navigate: vi.fn() }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useParams: () => router.params,
  useNavigate: () => router.navigate,
}));

const dnd = vi.hoisted(() => ({ props: null }));
vi.mock("@dnd-kit/core", async (importOriginal) => ({
  ...(await importOriginal()),
  DndContext: (props) => {
    dnd.props = props;
    return <div data-testid="dnd-context">{props.children}</div>;
  },
  DragOverlay: ({ children }) => <div className="overlay-host">{children}</div>,
  useDroppable: () => ({ setNodeRef: () => {} }),
}));

vi.mock("@dnd-kit/sortable", async (importOriginal) => ({
  ...(await importOriginal()),
  SortableContext: ({ children }) => children,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

import NewFormBuilder from "../Pages/CustomForms/Forms/SubFormBuilder/NewFormBuilder";

const makeStore = ({ permissions, formBuilder } = {}) =>
  configureStore({
    reducer: { formBuilder: formBuilderReducer, authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user: {
          id: "u-1",
          tenantId: "tenant-1",
          accessToken: "at",
          refreshToken: "rt",
          // An empty accesses array is the org-owner case: every permission.
          role: permissions
            ? { roleModuleAccesses: [{ module: "CUSTOM_FORMS", permissions }] }
            : { roleModuleAccesses: [] },
        },
      },
      formBuilder: {
        formName: "Untitled Form",
        elements: [],
        status: "draft",
        dirty: false,
        ...formBuilder,
      },
    },
  });

const renderBuilder = ({ formId, permissions, formBuilder } = {}) => {
  router.params = formId ? { formId } : {};
  const store = makeStore({ permissions, formBuilder });
  const view = render(
    <Provider store={store}>
      <NewFormBuilder />
    </Provider>
  );
  return { ...view, store };
};

// A seeded element only survives mount when the slice is already dirty --
// otherwise the builder treats the buffer as a stale blank form and resets it.
const withElements = (elements, over = {}) => ({
  formBuilder: { formName: "Intake", elements, dirty: true, ...over },
});

const el = (over = {}) => ({
  id: "field-1",
  type: "shortText",
  label: "Your name",
  required: false,
  options: [],
  ...over,
});

const fields = () => Array.from(document.body.querySelectorAll(".preview-field"));
const fieldAt = (i = 0) => fields()[i];
const formNameInput = () => screen.getByPlaceholderText("Enter form name");
const clickSave = (name) => fireEvent.click(screen.getByRole("button", { name }));

beforeEach(() => {
  vi.clearAllMocks();
  router.params = {};
  api.GetFormsByFormId.mockResolvedValue({ data: { data: { name: "Intake", fields: [] } } });
  api.GetFormsByTenantId.mockResolvedValue({ data: { data: [] } });
  api.GetTemplatesByTenantId.mockResolvedValue({ data: { data: [] } });
  api.CreateCustomForm.mockResolvedValue({ id: "new-1" });
  api.UpdateCustomForm.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("opening a blank builder", () => {
  it("clears a buffer that holds no unsaved work", () => {
    const { store } = renderBuilder({
      formBuilder: { formName: "Leftovers", elements: [el()], dirty: false },
    });
    expect(store.getState().formBuilder.elements).toEqual([]);
    expect(screen.getByText("Drag and drop form elements here")).toBeInTheDocument();
  });

  it("keeps a buffer that still has unsaved work", () => {
    renderBuilder(withElements([el()]));
    expect(formNameInput()).toHaveValue("Intake");
    expect(fields()).toHaveLength(1);
  });

  it("skips elements that carry no usable id", () => {
    renderBuilder(withElements([el({ id: null }), el({ id: 5, label: "Kept" })]));
    expect(fields()).toHaveLength(1);
    expect(fieldAt().querySelector(".question-input")).toHaveValue("Kept");
  });
});

describe("permission gating", () => {
  it("leaves the builder interactive for a role that may edit", () => {
    renderBuilder({ permissions: ["edit_form"] });
    const root = document.body.querySelector("[aria-disabled]");
    expect(root).toHaveAttribute("aria-disabled", "false");
    expect(root.style.pointerEvents).toBe("");
  });

  it("greys the builder out for a role that may only look", () => {
    renderBuilder({ permissions: ["view_form"] });
    const root = document.body.querySelector("[aria-disabled]");
    expect(root).toHaveAttribute("aria-disabled", "true");
    expect(root.style.pointerEvents).toBe("none");
  });
});

describe("loading an existing form", () => {
  const loaded = (data) =>
    api.GetFormsByFormId.mockResolvedValue({ data: { data } });

  it("shows a spinner until the fetch settles", () => {
    api.GetFormsByFormId.mockReturnValue(new Promise(() => {}));
    renderBuilder({ formId: "f-1" });
    expect(document.body.querySelector(".loading-spinner")).toBeInTheDocument();
  });

  it("maps every stored field, filling in what the record omits", async () => {
    loaded({
      name: "Intake",
      isDraft: true,
      fields: [
        { id: 11, fieldType: "shortText" },
        {
          id: 12,
          fieldType: "fileUpload",
          label: "Upload",
          isRequired: true,
          options: ["a"],
          fileUpload: [{ maxFiles: 3, maxSize: "5MB", allowedTypes: ["PDF"] }],
        },
        { id: 13, fieldType: "starRating", label: "Rate", starRating: [7] },
        { id: 14, fieldType: "signature", label: "Sign", signature: [{ allowUpload: true }] },
      ],
    });
    const { store } = renderBuilder({ formId: "f-1" });
    await waitFor(() => expect(store.getState().formBuilder.elements).toHaveLength(4));
    const [text, file, star, sign] = store.getState().formBuilder.elements;
    expect(text).toMatchObject({ id: "11", label: "", required: false, options: [] });
    expect(file.fileSettings).toEqual({ maxFiles: 3, maxSize: "5MB", allowedTypes: ["PDF"] });
    expect(star.maxStars).toBe(7);
    expect(sign.allowSignatureUpload).toBe(true);
    expect(store.getState().formBuilder.status).toBe("draft");
    expect(toast.showToast).toHaveBeenCalledWith("Form loaded successfully", "success");
  });

  it("defaults the file settings a stored record leaves blank", async () => {
    loaded({
      name: "Intake",
      fields: [{ id: 1, fieldType: "fileUpload", fileUpload: [{}] }],
    });
    const { store } = renderBuilder({ formId: "f-1" });
    await waitFor(() => expect(store.getState().formBuilder.elements).toHaveLength(1));
    expect(store.getState().formBuilder.elements[0].fileSettings).toEqual({
      maxFiles: 1,
      maxSize: "10MB",
      allowedTypes: [],
    });
  });

  it("reads a signature with no upload flag as not allowing uploads", async () => {
    loaded({ name: "Intake", fields: [{ id: 1, fieldType: "signature", signature: [{}] }] });
    const { store } = renderBuilder({ formId: "f-1" });
    await waitFor(() => expect(store.getState().formBuilder.elements).toHaveLength(1));
    expect(store.getState().formBuilder.elements[0].allowSignatureUpload).toBe(false);
  });

  it("ignores the extras when their arrays are empty or the wrong shape", async () => {
    loaded({
      name: "Intake",
      fields: [
        { id: 1, fieldType: "fileUpload", fileUpload: [] },
        { id: 2, fieldType: "starRating", starRating: null },
        { id: 3, fieldType: "signature", signature: "yes" },
      ],
    });
    const { store } = renderBuilder({ formId: "f-1" });
    await waitFor(() => expect(store.getState().formBuilder.elements).toHaveLength(3));
    const [file, star, sign] = store.getState().formBuilder.elements;
    expect(star.maxStars).toBeUndefined();
    // The loader read nothing, so what lands in the slice is what the field
    // editor seeds for itself on mount: every file type allowed, no uploads.
    await waitFor(() =>
      expect(store.getState().formBuilder.elements[0].fileSettings).toEqual({
        maxFiles: 1,
        maxSize: "10MB",
        allowedTypes: ["PDF", "Image", "DOCX", "Spreadsheet", "Video"],
      })
    );
    expect(file.id).toBe("1");
    expect(sign.allowSignatureUpload).toBe(false);
  });

  it("copes with a record that has no fields at all", async () => {
    loaded({ name: "Empty form" });
    renderBuilder({ formId: "f-1" });
    await waitFor(() => expect(formNameInput()).toHaveValue("Empty form"));
    expect(screen.getByText("Drag and drop form elements here")).toBeInTheDocument();
  });

  it("reads a template flag as the template status", async () => {
    loaded({ name: "T", isDraft: false, isTemplate: true, fields: [] });
    const { store } = renderBuilder({ formId: "f-1" });
    await waitFor(() => expect(store.getState().formBuilder.status).toBe("template"));
  });

  it("reads a form that is neither draft nor template as published", async () => {
    loaded({ name: "P", isDraft: false, isTemplate: false, fields: [] });
    const { store } = renderBuilder({ formId: "f-1" });
    await waitFor(() => expect(store.getState().formBuilder.status).toBe("published"));
  });

  it("reports a failed load instead of an empty builder", async () => {
    const err = new Error("404");
    api.GetFormsByFormId.mockRejectedValue(err);
    renderBuilder({ formId: "f-1" });
    await waitFor(() => expect(toast.showApiError).toHaveBeenCalledWith(err, "LOAD_FORM"));
  });
});

describe("dragging elements onto the canvas", () => {
  const drag = (active, over) =>
    act(() => {
      dnd.props.onDragEnd({ active, over });
    });

  it("adds the sidebar element that was dropped", () => {
    const { store } = renderBuilder();
    drag({ id: "shortText" }, { id: "droppable-preview" });
    const [added] = store.getState().formBuilder.elements;
    expect(added).toMatchObject({ type: "shortText", label: "", required: false, options: [] });
    expect(added.maxStars).toBeUndefined();
  });

  it("seeds two options for a choice element", () => {
    const { store } = renderBuilder();
    drag({ id: "radio" }, { id: "droppable-preview" });
    expect(store.getState().formBuilder.elements[0].options).toEqual(["Option 1", "Option 2"]);
  });

  it("seeds five stars for a rating element", () => {
    const { store } = renderBuilder();
    drag({ id: "starRating" }, { id: "droppable-preview" });
    expect(store.getState().formBuilder.elements[0].maxStars).toBe(5);
  });

  it("does nothing when the element is dropped outside any target", () => {
    const { store } = renderBuilder();
    drag({ id: "shortText" }, null);
    expect(store.getState().formBuilder.elements).toEqual([]);
  });

  it("reorders two placed fields", () => {
    const { store } = renderBuilder(
      withElements([el({ id: "a", label: "First" }), el({ id: "b", label: "Second" })])
    );
    drag({ id: "a" }, { id: "b" });
    expect(store.getState().formBuilder.elements.map((e) => e.id)).toEqual(["b", "a"]);
  });

  it("leaves the order alone when a field is dropped on itself", () => {
    const { store } = renderBuilder(withElements([el({ id: "a" }), el({ id: "b" })]));
    drag({ id: "a" }, { id: "a" });
    expect(store.getState().formBuilder.elements.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("leaves the order alone when the drop target is not a field", () => {
    const { store } = renderBuilder(withElements([el({ id: "a" }), el({ id: "b" })]));
    drag({ id: "a" }, { id: "droppable-preview" });
    expect(store.getState().formBuilder.elements.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("names the sidebar element being dragged in the overlay", () => {
    renderBuilder();
    act(() => dnd.props.onDragStart({ active: { id: "dropdown" } }));
    expect(document.body.querySelector(".drag-overlay")).toHaveTextContent("Dropdown Question");
  });

  it("falls back to a generic overlay label for an unlabelled field", () => {
    renderBuilder(withElements([el({ id: "a", label: "" })]));
    act(() => dnd.props.onDragStart({ active: { id: "a" } }));
    expect(document.body.querySelector(".drag-overlay")).toHaveTextContent("Field");
  });

  it("empties the overlay once the drag ends", () => {
    renderBuilder();
    act(() => dnd.props.onDragStart({ active: { id: "dropdown" } }));
    act(() => dnd.props.onDragEnd({ active: { id: "dropdown" }, over: null }));
    expect(document.body.querySelector(".drag-overlay")).toBeNull();
  });
});

describe("editing a placed field", () => {
  it("renders a section header as a header input with no required toggle", () => {
    renderBuilder(withElements([el({ type: "sectionHeader", label: "Section A" })]));
    expect(fieldAt().querySelector(".question-input.header")).toHaveValue("Section A");
    expect(fieldAt().querySelector(".required-outside")).toBeNull();
  });

  it("renders body text as a textarea", () => {
    renderBuilder(withElements([el({ type: "bodyText", label: "Some prose" })]));
    expect(fieldAt().querySelector("textarea")).toHaveValue("Some prose");
  });

  it("writes the typed question back to the slice", () => {
    const { store } = renderBuilder(withElements([el({ label: "" })]));
    fireEvent.change(fieldAt().querySelector(".question-input"), {
      target: { value: "What is your name?" },
    });
    expect(store.getState().formBuilder.elements[0].label).toBe("What is your name?");
  });

  it("edits body text through the textarea", () => {
    const { store } = renderBuilder(withElements([el({ type: "bodyText", label: "" })]));
    fireEvent.change(fieldAt().querySelector("textarea"), { target: { value: "Read this" } });
    expect(store.getState().formBuilder.elements[0].label).toBe("Read this");
  });

  it("toggles the required flag", () => {
    const { store } = renderBuilder(withElements([el()]));
    fireEvent.click(fieldAt().querySelector(".required-outside input"));
    expect(store.getState().formBuilder.elements[0].required).toBe(true);
  });

  it("deletes the field", () => {
    const { store } = renderBuilder(withElements([el({ id: "a" }), el({ id: "b" })]));
    fireEvent.click(fieldAt().querySelector(".delete-btn"));
    expect(store.getState().formBuilder.elements.map((e) => e.id)).toEqual(["b"]);
  });
});

describe("choice options", () => {
  const choice = (type, options) =>
    renderBuilder(withElements([el({ type, options, label: "Pick one" })]));

  it("draws a radio marker for a radio question", () => {
    choice("radio", ["A", "B"]);
    expect(fieldAt().querySelectorAll("input[type='radio']")).toHaveLength(2);
  });

  it("draws a dropdown marker for a dropdown question", () => {
    choice("dropdown", ["A", "B"]);
    expect(fieldAt().querySelectorAll(".dropdown-arrow")).toHaveLength(2);
  });

  it("draws checkboxes for a checkbox question", () => {
    choice("checkbox", ["A", "B"]);
    // One per option; the "required" toggle sits outside the options list.
    expect(fieldAt().querySelectorAll(".option-row input[type='checkbox']")).toHaveLength(2);
  });

  it("fills in two options for a choice field that has none", async () => {
    const { store } = choice("checkbox", []);
    await waitFor(() =>
      expect(store.getState().formBuilder.elements[0].options).toEqual([
        "Option 1",
        "Option 2",
      ])
    );
  });

  it("edits an option in place", () => {
    const { store } = choice("checkbox", ["A", "B"]);
    fireEvent.change(fieldAt().querySelectorAll(".option-input")[1], {
      target: { value: "Bravo" },
    });
    expect(store.getState().formBuilder.elements[0].options).toEqual(["A", "Bravo"]);
  });

  it("numbers a new option after the highest existing Option N", () => {
    const { store } = choice("checkbox", ["Option 1", "Option 4"]);
    fireEvent.click(fieldAt().querySelector(".add-option-btn"));
    expect(store.getState().formBuilder.elements[0].options).toEqual([
      "Option 1",
      "Option 4",
      "Option 5",
    ]);
  });

  it("numbers a new option by position when none are named Option N", () => {
    const { store } = choice("checkbox", ["Yes", "No"]);
    fireEvent.click(fieldAt().querySelector(".add-option-btn"));
    expect(store.getState().formBuilder.elements[0].options).toEqual(["Yes", "No", "Option 3"]);
  });

  it("withholds the remove control while only two options remain", () => {
    choice("checkbox", ["A", "B"]);
    expect(fieldAt().querySelectorAll(".remove-option")).toHaveLength(0);
  });

  it("removes an option once there are more than two", () => {
    const { store } = choice("checkbox", ["A", "B", "C"]);
    fireEvent.click(fieldAt().querySelectorAll(".remove-option")[0]);
    expect(store.getState().formBuilder.elements[0].options).toEqual(["B", "C"]);
  });
});

describe("file upload settings", () => {
  const upload = (over = {}) =>
    renderBuilder(withElements([el({ type: "fileUpload", label: "Docs", ...over })]));

  it("publishes the default settings to the slice on mount", async () => {
    const { store } = upload();
    await waitFor(() =>
      expect(store.getState().formBuilder.elements[0].fileSettings).toEqual({
        maxFiles: 1,
        maxSize: "10MB",
        allowedTypes: ["PDF", "Image", "DOCX", "Spreadsheet", "Video"],
      })
    );
  });

  it("keeps settings the field already carries", async () => {
    const { store } = upload({
      fileSettings: { maxFiles: 4, maxSize: "2MB", allowedTypes: ["PDF"] },
    });
    await waitFor(() =>
      expect(store.getState().formBuilder.elements[0].fileSettings.maxFiles).toBe(4)
    );
    expect(fieldAt().querySelectorAll(".small-input")[0]).toHaveValue(4);
  });

  it("raises a maximum below one back up to one", async () => {
    const { store } = upload();
    fireEvent.change(fieldAt().querySelectorAll(".small-input")[0], {
      target: { value: "0" },
    });
    await waitFor(() =>
      expect(store.getState().formBuilder.elements[0].fileSettings.maxFiles).toBe(1)
    );
  });

  it("accepts a larger maximum and a new size limit", async () => {
    const { store } = upload();
    const inputs = fieldAt().querySelectorAll(".small-input");
    fireEvent.change(inputs[0], { target: { value: "6" } });
    fireEvent.change(inputs[1], { target: { value: "25MB" } });
    await waitFor(() =>
      expect(store.getState().formBuilder.elements[0].fileSettings).toMatchObject({
        maxFiles: 6,
        maxSize: "25MB",
      })
    );
  });

  it("removes and restores an allowed file type", async () => {
    const { store } = upload();
    const pdf = fieldAt().querySelectorAll(".file-type-label input")[0];
    fireEvent.click(pdf);
    await waitFor(() =>
      expect(store.getState().formBuilder.elements[0].fileSettings.allowedTypes).not.toContain(
        "PDF"
      )
    );
    fireEvent.click(fieldAt().querySelectorAll(".file-type-label input")[0]);
    await waitFor(() =>
      expect(store.getState().formBuilder.elements[0].fileSettings.allowedTypes).toContain("PDF")
    );
  });
});

describe("signature and star settings", () => {
  it("starts a signature field with uploads switched off", async () => {
    const { store } = renderBuilder(withElements([el({ type: "signature", label: "Sign" })]));
    await waitFor(() =>
      expect(store.getState().formBuilder.elements[0].allowSignatureUpload).toBe(false)
    );
  });

  it("honours a signature field that already allows uploads", async () => {
    const { store } = renderBuilder(
      withElements([el({ type: "signature", label: "Sign", allowSignatureUpload: true })])
    );
    await waitFor(() =>
      expect(store.getState().formBuilder.elements[0].allowSignatureUpload).toBe(true)
    );
    expect(fieldAt().querySelector(".signature-upload input")).toBeChecked();
  });

  it("switches signature uploads on", async () => {
    const { store } = renderBuilder(withElements([el({ type: "signature", label: "Sign" })]));
    fireEvent.click(fieldAt().querySelector(".signature-upload input"));
    await waitFor(() =>
      expect(store.getState().formBuilder.elements[0].allowSignatureUpload).toBe(true)
    );
  });

  it("shows an empty star box when no count has been chosen", () => {
    renderBuilder(withElements([el({ type: "starRating", label: "Rate" })]));
    expect(fieldAt().querySelector(".star-setting input")).toHaveValue(null);
  });

  it("stores a typed star count as a number", () => {
    const { store } = renderBuilder(withElements([el({ type: "starRating", label: "Rate" })]));
    fireEvent.change(fieldAt().querySelector(".star-setting input"), {
      target: { value: "8" },
    });
    expect(store.getState().formBuilder.elements[0].maxStars).toBe(8);
  });

  it("lets the star box be cleared rather than snapping back to a number", () => {
    const { store } = renderBuilder(
      withElements([el({ type: "starRating", label: "Rate", maxStars: 5 })])
    );
    fireEvent.change(fieldAt().querySelector(".star-setting input"), { target: { value: "" } });
    expect(store.getState().formBuilder.elements[0].maxStars).toBeUndefined();
  });
});

describe("validation before a save", () => {
  const publishAndExpectNoSave = async () => {
    clickSave("Publish");
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        "Please fix validation errors before saving.",
        "error"
      )
    );
    expect(api.CreateCustomForm).not.toHaveBeenCalled();
  };

  it("refuses an unnamed form that also has no fields", async () => {
    renderBuilder();
    fireEvent.change(formNameInput(), { target: { value: "  " } });
    await publishAndExpectNoSave();
    expect(
      screen.getByText("Form name is required. Add at least one field.")
    ).toBeInTheDocument();
  });

  it("refuses a named form with no fields", async () => {
    renderBuilder();
    await publishAndExpectNoSave();
    expect(screen.getByText("Add at least one field.")).toBeInTheDocument();
  });

  it("refuses an unnamed form that does have fields", async () => {
    renderBuilder(withElements([el()]));
    fireEvent.change(formNameInput(), { target: { value: "" } });
    await publishAndExpectNoSave();
    expect(screen.getByText("Form name is required.")).toBeInTheDocument();
  });

  it("requires a question on anything but a header or body text", async () => {
    renderBuilder(withElements([el({ label: "" })]));
    await publishAndExpectNoSave();
    expect(screen.getByText("Question is required.")).toBeInTheDocument();
  });

  it("lets a header and body text through without a question", async () => {
    renderBuilder(
      withElements([
        el({ id: "a", type: "sectionHeader", label: "" }),
        el({ id: "b", type: "bodyText", label: "" }),
      ])
    );
    clickSave("Publish");
    await waitFor(() => expect(api.CreateCustomForm).toHaveBeenCalled());
  });

  it("rejects a blank option", async () => {
    renderBuilder(withElements([el({ type: "radio", options: ["A", "  "] })]));
    await publishAndExpectNoSave();
    expect(screen.getByText("Option cannot be empty.")).toBeInTheDocument();
  });

  it("rejects a file field allowing fewer than one file or no size", async () => {
    renderBuilder(
      withElements([
        el({
          type: "fileUpload",
          // allowedTypes has to be present: the editor reads it straight back
          // out to tick its checkboxes.
          fileSettings: { maxFiles: 0, maxSize: " ", allowedTypes: [] },
        }),
      ])
    );
    await publishAndExpectNoSave();
    expect(screen.getByText("Max files must be ≥ 1.")).toBeInTheDocument();
    expect(screen.getByText("Max size is required.")).toBeInTheDocument();
  });

  it("accepts a file field whose settings are within range", async () => {
    renderBuilder(
      withElements([
        el({ type: "fileUpload", fileSettings: { maxFiles: 2, maxSize: "5MB", allowedTypes: [] } }),
      ])
    );
    clickSave("Publish");
    await waitFor(() => expect(api.CreateCustomForm).toHaveBeenCalled());
  });

  it("rejects a star count outside one to ten", async () => {
    renderBuilder(withElements([el({ type: "starRating", maxStars: 11 })]));
    await publishAndExpectNoSave();
    expect(screen.getByText("Stars must be 1–10.")).toBeInTheDocument();
  });

  it("rejects a star field with no count at all", async () => {
    renderBuilder(withElements([el({ type: "starRating" })]));
    await publishAndExpectNoSave();
    expect(screen.getByText("Stars must be 1–10.")).toBeInTheDocument();
  });
});

describe("the save payload", () => {
  const publish = async (elements, over) => {
    const view = renderBuilder(withElements(elements, over));
    clickSave("Publish");
    await waitFor(() => expect(api.CreateCustomForm).toHaveBeenCalled());
    return { ...view, payload: api.CreateCustomForm.mock.calls[0][0] };
  };

  it("numbers the fields and copies the question into the placeholder", async () => {
    const { payload } = await publish([
      el({ id: "field-1", type: "shortText", label: "Name" }),
      el({ id: "field-2", type: "paragraph", label: "Notes", required: true }),
    ]);
    expect(payload).toMatchObject({ tenantId: "tenant-1", name: "Intake" });
    expect(payload.formFields[0]).toMatchObject({
      fieldType: "shortText",
      label: "Name",
      placeholder: "Name",
      isRequired: false,
      order: 1,
    });
    expect(payload.formFields[1]).toMatchObject({ placeholder: "Notes", order: 2 });
  });

  it("leaves the placeholder empty for a field type that has no text box", async () => {
    const { payload } = await publish([el({ type: "sectionHeader", label: "Section A" })]);
    expect(payload.formFields[0].placeholder).toBe("");
  });

  // Validation rejects any blank option before a save can start, so the
  // `filter(Boolean)` in the payload builder never actually has anything to
  // drop; all it can be observed doing is passing a full list through.
  it("carries a choice field's options through", async () => {
    const { payload } = await publish([
      el({ type: "dropdown", label: "Pick", options: ["A", "B"] }),
    ]);
    expect(payload.formFields[0].options).toEqual(["A", "B"]);
  });

  it("carries the file settings across", async () => {
    const { payload } = await publish([
      el({
        type: "fileUpload",
        label: "Docs",
        fileSettings: { maxFiles: 2, maxSize: "5MB", allowedTypes: ["PDF"] },
      }),
    ]);
    expect(payload.formFields[0].fileUpload).toEqual([
      { maxFiles: 2, maxSize: "5MB", allowedTypes: ["PDF"] },
    ]);
  });

  it("substitutes five stars for a rating that cannot be read as a number", async () => {
    const { payload } = await publish([
      el({ id: "a", type: "starRating", label: "Rate", maxStars: 4 }),
      el({ id: "b", type: "starRating", label: "Rate again", maxStars: "many" }),
    ]);
    expect(payload.formFields[0].starRating).toEqual([4]);
    expect(payload.formFields[1].starRating).toEqual([5]);
  });

  it("sends the signature upload flag, defaulting it to false", async () => {
    const { payload } = await publish([
      el({ id: "a", type: "signature", label: "Sign", allowSignatureUpload: true }),
    ]);
    expect(payload.formFields[0].signature).toEqual([{ allowUpload: true }]);
  });

  it("omits a client-generated field id so the backend can assign one", async () => {
    renderBuilder(withElements([el({ id: "field-1729", label: "Name" })]));
    clickSave("Publish");
    await waitFor(() => expect(api.CreateCustomForm).toHaveBeenCalled());
    expect(api.CreateCustomForm.mock.calls[0][0].formFields[0]).not.toHaveProperty("id");
  });
});

describe("saving", () => {
  const guid = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

  it("saves a draft under the draft flags", async () => {
    renderBuilder(withElements([el()]));
    clickSave("Save to Drafts");
    await waitFor(() => expect(api.CreateCustomForm).toHaveBeenCalled());
    expect(api.CreateCustomForm.mock.calls[0][0]).toMatchObject({
      isDraft: true,
      isTemplate: false,
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("Form saved as draft successfully!", "success");
    // The uniqueness lookup is a publish-only step.
    expect(api.GetFormsByTenantId).not.toHaveBeenCalled();
  });

  it("saves a template under the template flags", async () => {
    renderBuilder(withElements([el()]));
    clickSave("Save as Template");
    await waitFor(() => expect(api.CreateCustomForm).toHaveBeenCalled());
    expect(api.CreateCustomForm.mock.calls[0][0]).toMatchObject({
      isDraft: false,
      isTemplate: true,
    });
    expect(toast.showToast).toHaveBeenCalledWith(
      "Form saved as template successfully!",
      "success"
    );
  });

  it("clears the unsaved-work flag once a save lands", async () => {
    const { store } = renderBuilder(withElements([el()]));
    clickSave("Save to Drafts");
    await waitFor(() => expect(store.getState().formBuilder.dirty).toBe(false));
  });

  it("switches the route to the new form's edit URL after a create", async () => {
    renderBuilder(withElements([el()]));
    clickSave("Publish");
    await waitFor(() =>
      expect(router.navigate).toHaveBeenCalledWith("/custom-forms/forms/create/new-1", {
        replace: true,
      })
    );
  });

  it("finds the new id wherever the create response puts it", async () => {
    api.CreateCustomForm.mockResolvedValue({ data: { id: "nested-1" } });
    renderBuilder(withElements([el()]));
    clickSave("Publish");
    await waitFor(() =>
      expect(router.navigate).toHaveBeenCalledWith("/custom-forms/forms/create/nested-1", {
        replace: true,
      })
    );
  });

  it("accepts a create response that names the id formId", async () => {
    api.CreateCustomForm.mockResolvedValue({ formId: "alt-1" });
    renderBuilder(withElements([el()]));
    clickSave("Publish");
    await waitFor(() =>
      expect(router.navigate).toHaveBeenCalledWith("/custom-forms/forms/create/alt-1", {
        replace: true,
      })
    );
  });

  it("stays put when the create response carries no id", async () => {
    api.CreateCustomForm.mockResolvedValue({});
    renderBuilder(withElements([el()]));
    clickSave("Publish");
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Form published successfully!", "success")
    );
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it("updates rather than creates once the form has an id, and keeps real GUIDs", async () => {
    api.GetFormsByFormId.mockResolvedValue({
      data: { data: { name: "Intake", isDraft: true, fields: [{ id: guid, fieldType: "shortText", label: "Name" }] } },
    });
    const { store } = renderBuilder({ formId: "f-1" });
    await waitFor(() => expect(store.getState().formBuilder.elements).toHaveLength(1));
    clickSave("Publish");
    await waitFor(() => expect(api.UpdateCustomForm).toHaveBeenCalled());
    expect(api.CreateCustomForm).not.toHaveBeenCalled();
    const payload = api.UpdateCustomForm.mock.calls[0][0];
    expect(payload).toMatchObject({ id: "f-1", accessToken: "at" });
    expect(payload.formFields[0].id).toBe(guid);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it("refuses to publish a name another form already uses", async () => {
    api.GetFormsByTenantId.mockResolvedValue({
      data: { data: [{ id: "other", name: "  intake " }] },
    });
    renderBuilder(withElements([el()]));
    clickSave("Publish");
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        "A form with this name already exists. Please choose a unique name.",
        "error"
      )
    );
    expect(api.CreateCustomForm).not.toHaveBeenCalled();
  });

  it("does not count the form being edited as its own duplicate", async () => {
    api.GetFormsByFormId.mockResolvedValue({
      data: { data: { name: "Intake", fields: [{ id: 1, fieldType: "shortText", label: "Name" }] } },
    });
    api.GetFormsByTenantId.mockResolvedValue({ data: { data: [{ id: "f-1", name: "Intake" }] } });
    const { store } = renderBuilder({ formId: "f-1" });
    await waitFor(() => expect(store.getState().formBuilder.elements).toHaveLength(1));
    clickSave("Publish");
    await waitFor(() => expect(api.UpdateCustomForm).toHaveBeenCalled());
  });

  it("reads the existing-forms list straight off the response body", async () => {
    api.GetFormsByTenantId.mockResolvedValue({ data: [{ id: "other", name: "Intake" }] });
    renderBuilder(withElements([el()]));
    clickSave("Publish");
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        "A form with this name already exists. Please choose a unique name.",
        "error"
      )
    );
  });

  it("reads an existing-forms list returned as a bare array", async () => {
    api.GetFormsByTenantId.mockResolvedValue([{ id: "other", name: "Intake" }]);
    renderBuilder(withElements([el()]));
    clickSave("Publish");
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        "A form with this name already exists. Please choose a unique name.",
        "error"
      )
    );
  });

  it("publishes anyway when the existing-forms list is not a list", async () => {
    api.GetFormsByTenantId.mockResolvedValue({ data: { data: { unexpected: true } } });
    renderBuilder(withElements([el()]));
    clickSave("Publish");
    await waitFor(() => expect(api.CreateCustomForm).toHaveBeenCalled());
  });

  it("ignores a form in the list that has no name", async () => {
    api.GetFormsByTenantId.mockResolvedValue({ data: { data: [{ id: "other" }] } });
    renderBuilder(withElements([el()]));
    clickSave("Publish");
    await waitFor(() => expect(api.CreateCustomForm).toHaveBeenCalled());
  });

  it("publishes anyway when the uniqueness lookup itself fails", async () => {
    api.GetFormsByTenantId.mockRejectedValue(new Error("500"));
    renderBuilder(withElements([el()]));
    clickSave("Publish");
    await waitFor(() => expect(api.CreateCustomForm).toHaveBeenCalled());
  });

  it("reports the message a failed save came back with", async () => {
    api.CreateCustomForm.mockRejectedValue(new Error("Name too long"));
    renderBuilder(withElements([el()]));
    clickSave("Publish");
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Name too long", "error")
    );
  });

  it("falls back to generic copy when a failed save says nothing", async () => {
    api.CreateCustomForm.mockRejectedValue({});
    renderBuilder(withElements([el()]));
    clickSave("Publish");
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        "Failed to save form. Please try again.",
        "error"
      )
    );
  });
});

describe("the template library modal", () => {
  const openModal = async (templates) => {
    if (templates !== undefined) {
      api.GetTemplatesByTenantId.mockResolvedValue({ data: { data: templates } });
    }
    const view = renderBuilder();
    fireEvent.click(screen.getByRole("button", { name: "Import from Template Library" }));
    await waitFor(() => expect(api.GetTemplatesByTenantId).toHaveBeenCalled());
    return view;
  };

  it("passes the tenant and tokens to the template endpoint", async () => {
    await openModal([]);
    expect(api.GetTemplatesByTenantId).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      accessToken: "at",
      refreshToken: "rt",
    });
  });

  it("says so when the library is empty", async () => {
    await openModal([]);
    expect(await screen.findByText("No templates found")).toBeInTheDocument();
  });

  it("treats a response with no list as an empty library", async () => {
    api.GetTemplatesByTenantId.mockResolvedValue({ data: { data: null } });
    await openModal();
    expect(await screen.findByText("No templates found")).toBeInTheDocument();
  });

  it("leaves the list empty and stays quiet when the fetch fails", async () => {
    api.GetTemplatesByTenantId.mockRejectedValue(new Error("500"));
    await openModal();
    expect(await screen.findByText("No templates found")).toBeInTheDocument();
    expect(toast.showToast).not.toHaveBeenCalled();
  });

  it("lists the templates it found", async () => {
    await openModal([{ id: "t-1", name: "Intake template" }]);
    expect(await screen.findByText("Intake template")).toBeInTheDocument();
  });

  it("filters the list as the search box is typed into", async () => {
    await openModal([
      { id: "t-1", name: "Intake template" },
      { id: "t-2", name: "Discharge" },
    ]);
    await screen.findByText("Intake template");
    fireEvent.change(screen.getByPlaceholderText("Search templates..."), {
      target: { value: "disch" },
    });
    expect(screen.queryByText("Intake template")).not.toBeInTheDocument();
    expect(screen.getByText("Discharge")).toBeInTheDocument();
  });

  it("pages a long library and keeps a filtered short one on one page", async () => {
    const many = Array.from({ length: 7 }, (_, i) => ({ id: `t-${i}`, name: `Template ${i}` }));
    await openModal(many);
    await screen.findByText("Template 0");
    expect(screen.queryByText("Template 5")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(screen.getByText("Template 5")).toBeInTheDocument();
    // Narrowing the search resets to page one and hides the pager entirely.
    fireEvent.change(screen.getByPlaceholderText("Search templates..."), {
      target: { value: "Template 1" },
    });
    expect(screen.getByText("Template 1")).toBeInTheDocument();
    expect(document.body.querySelector(".pagination")).toBeNull();
  });

  it("closes from the close button", async () => {
    await openModal([]);
    fireEvent.click(screen.getByText("close"));
    expect(document.body.querySelector(".custom-form-modal-overlay")).toBeNull();
  });

  it("closes when the backdrop is clicked but not the panel itself", async () => {
    await openModal([]);
    fireEvent.click(document.body.querySelector(".custom-form-modal-content"));
    expect(document.body.querySelector(".custom-form-modal-overlay")).toBeInTheDocument();
    fireEvent.click(document.body.querySelector(".custom-form-modal-overlay"));
    expect(document.body.querySelector(".custom-form-modal-overlay")).toBeNull();
  });

  it("imports the chosen template as a fresh draft", async () => {
    api.GetFormsByFormId.mockResolvedValue({
      data: {
        data: {
          name: "Intake template",
          fields: [
            { id: 1, fieldType: "shortText", label: "Name" },
            {
              id: 2,
              fieldType: "fileUpload",
              fileUpload: [{ maxFiles: 2, maxSize: "1MB", allowedTypes: ["PDF"] }],
            },
            { id: 3, fieldType: "starRating", starRating: [3] },
            { id: 4, fieldType: "signature", signature: [{ allowUpload: true }] },
          ],
        },
      },
    });
    const { store } = await openModal([{ id: "t-1", name: "Intake template" }]);
    fireEvent.click(await screen.findByRole("button", { name: "Use Template" }));
    await waitFor(() => expect(store.getState().formBuilder.elements).toHaveLength(4));
    expect(api.GetFormsByFormId).toHaveBeenCalledWith({
      formId: "t-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(store.getState().formBuilder.status).toBe("draft");
    expect(store.getState().formBuilder.formName).toBe("Intake template");
    expect(toast.showToast).toHaveBeenCalledWith('Template "Intake template" imported!', "success");
    expect(document.body.querySelector(".custom-form-modal-overlay")).toBeNull();
  });

  it("imports a template that defines no fields", async () => {
    api.GetFormsByFormId.mockResolvedValue({ data: { data: { name: "Bare" } } });
    await openModal([{ id: "t-1", name: "Bare" }]);
    fireEvent.click(await screen.findByRole("button", { name: "Use Template" }));
    await waitFor(() => expect(formNameInput()).toHaveValue("Bare"));
  });

  it("reports a template that cannot be fetched", async () => {
    api.GetFormsByFormId.mockRejectedValue(new Error("410"));
    await openModal([{ id: "t-1", name: "Gone" }]);
    fireEvent.click(await screen.findByRole("button", { name: "Use Template" }));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to import template", "error")
    );
  });
});

describe("a choice field the store holds without an options key", () => {
  it("draws the two placeholder options while the field seeds itself", () => {
    // The field editor seeds "Option 1"/"Option 2" in an effect, but the very
    // first render has to draw something before that lands.
    renderBuilder(
      withElements([el({ type: "checkbox", options: undefined, label: "Pick" })])
    );
    expect(
      Array.from(fieldAt().querySelectorAll(".option-input")).map((i) => i.value)
    ).toEqual(["Option 1", "Option 2"]);
  });
});

describe("the uniqueness lookup answering with nothing", () => {
  it("treats an empty response as no clashing form", async () => {
    api.GetFormsByTenantId.mockResolvedValue(undefined);
    renderBuilder(withElements([el()]));
    clickSave("Publish");
    await waitFor(() => expect(api.CreateCustomForm).toHaveBeenCalled());
    expect(toast.showToast).not.toHaveBeenCalledWith(
      expect.stringContaining("already"),
      "error"
    );
  });
});

describe("importing a template whose extras carry no settings", () => {
  it("falls back to the house defaults for the file and signature fields", async () => {
    api.GetTemplatesByTenantId.mockResolvedValue({
      data: { data: [{ id: "t-1", name: "Bare template" }] },
    });
    // `fileUpload: [{}]` rather than a missing key: the loader skips the block
    // entirely when the array is absent, so the per-setting defaults inside it
    // only run for a record that has the array but nothing in it.
    api.GetFormsByFormId.mockResolvedValue({
      data: {
        data: {
          name: "Bare template",
          fields: [
            { id: 1, fieldType: "fileUpload", label: "Upload", fileUpload: [{}] },
            { id: 2, fieldType: "signature", label: "Sign", signature: [{}] },
          ],
        },
      },
    });

    const { store } = renderBuilder();
    fireEvent.click(
      screen.getByRole("button", { name: "Import from Template Library" })
    );
    fireEvent.click(await screen.findByRole("button", { name: "Use Template" }));

    await waitFor(() =>
      expect(store.getState().formBuilder.elements).toHaveLength(2)
    );
    const [file, sign] = store.getState().formBuilder.elements;
    expect(file.fileSettings).toEqual({
      maxFiles: 1,
      maxSize: "10MB",
      allowedTypes: [],
    });
    expect(sign.allowSignatureUpload).toBe(false);
  });
});
