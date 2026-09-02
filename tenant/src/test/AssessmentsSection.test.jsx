import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The Assessments section of the clinical report builder: a stack of assessment
 * cards, each led by a category that decides what the card shows next -- a
 * dependent list of assessment types for most categories, a free-text box for
 * "Other", and nothing at all until a category is chosen. Changing the category
 * wipes whichever answer the previous one produced.
 *
 * The real inputs are used rather than probes, because that dependency is the
 * whole of the section's logic. The file field reads the auth slice and the
 * document viewer, so the tests supply a store and mock the viewer hook (the
 * real one throws outside its provider) and the upload endpoint.
 *
 * The section seeds its assessments from `data` exactly once, so every fixture
 * is passed at render time. A field is marked touched when it is left, and only
 * a touched field shows its message; for the two selects "left" means the list
 * shutting rather than a native blur, which means taking an option also counts
 * as leaving the field.
 */

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

const viewer = vi.hoisted(() => ({ openDocument: vi.fn(), downloadDocument: vi.fn() }));
vi.mock("../hooks/useDocumentViewer", () => ({ default: () => viewer }));

const upload = vi.hoisted(() => ({ UploadImage: vi.fn() }));
vi.mock("../api/ImageUpload", () => ({ default: upload }));

import AssessmentsSection from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/AssessmentsSections/AssessmentsSection";

const assessment = (over = {}) => ({
  id: 1,
  category: "core-aba",
  type: "vb-mapp",
  customType: "",
  methodsUsed: "Direct observation",
  methodNotes: "<p>Two sittings</p>",
  date: "2024-01-15",
  administeredBy: "Jane Doe",
  summaryFindings: "<p>Level 2</p>",
  strengths: "<p>Imitation</p>",
  deficits: "<p>Manding</p>",
  supportingDocuments: [],
  clinicalInterpretation: "<p>Continue targets</p>",
  ...over,
});

const onChange = vi.fn();
const onRemoveSection = vi.fn();

const store = () =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user: { id: "user-1", accessToken: "at", refreshToken: "rt" },
      },
    },
  });

const renderSection = (props = {}) =>
  render(
    <Provider store={store()}>
      <AssessmentsSection onChange={onChange} {...props} />
    </Provider>
  );

const cards = () => document.body.querySelectorAll(".assessment-card");

const field = (card, label) =>
  Array.from(card.querySelectorAll(".report-builder-field")).find((f) =>
    f.querySelector(".report-builder-label")?.textContent.startsWith(label)
  );

// A select counts its list shutting as leaving the field, so this marks one
// touched without answering it.
const leaveSelect = (fieldEl) => {
  fireEvent.click(fieldEl.querySelector(".report-builder-select-button"));
  fireEvent.click(fieldEl.querySelector(".report-builder-select-overlay"));
};

// Each message sits beside its control rather than inside it, so they are
// collected off the whole card.
const cardErrors = (card) =>
  Array.from(card.querySelectorAll(".report-builder-error")).map((e) => e.textContent);

const selectedLabel = (fieldEl) =>
  fieldEl.querySelector(".report-builder-select-button span").textContent;

const chooseOption = (fieldEl, optionLabel) => {
  fireEvent.click(fieldEl.querySelector(".report-builder-select-button"));
  const option = Array.from(
    fieldEl.querySelectorAll(".report-builder-select-option")
  ).find((o) => o.textContent === optionLabel);
  fireEvent.click(option);
};

const editor = (scope, label) => {
  const container = Array.from(
    scope.querySelectorAll(".rich-editor-container")
  ).find((c) => c.querySelector(".label-text")?.textContent === label);
  return container.querySelector("[contenteditable]");
};

const typeInEditor = (element, html) => {
  element.innerHTML = html;
  fireEvent.input(element);
};

const lastAssessments = () => onChange.mock.calls[onChange.mock.calls.length - 1][0];

beforeEach(() => {
  vi.clearAllMocks();
  upload.UploadImage.mockResolvedValue({
    success: true,
    data: [{ filename: "report.pdf", url: "https://files/report.pdf" }],
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the shape a fresh section starts in", () => {
  it("opens with one empty assessment", () => {
    renderSection();
    expect(cards()).toHaveLength(1);
    expect(screen.getByText("Assessment 1")).toBeInTheDocument();
    expect(selectedLabel(field(cards()[0], "Assessment Category"))).toBe(
      "Select an option"
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders the assessments it was given instead of a blank one", () => {
    renderSection({
      data: [assessment(), assessment({ id: 2, category: "risk-safety", type: "elopement" })],
    });
    expect(cards()).toHaveLength(2);
    expect(screen.getByText("Assessment 2")).toBeInTheDocument();
    expect(selectedLabel(field(cards()[1], "Assessment Category"))).toBe(
      "Risk & Safety"
    );
    expect(selectedLabel(field(cards()[1], "Assessment Type"))).toBe(
      "Elopement Risk Assessment"
    );
  });

  it("shows every value a stored assessment carries", () => {
    renderSection({ data: [assessment()] });
    const card = cards()[0];
    expect(selectedLabel(field(card, "Assessment Type"))).toBe("VB-MAPP");
    expect(field(card, "Assessment Methods used").querySelector("input")).toHaveValue(
      "Direct observation"
    );
    expect(field(card, "Assessment Date").querySelector("input")).toHaveValue(
      "2024-01-15"
    );
    expect(field(card, "Administered by").querySelector("input")).toHaveValue(
      "Jane Doe"
    );
    expect(editor(card, "Assessment method notes")).toHaveTextContent("Two sittings");
    expect(editor(card, "Summary of findings")).toHaveTextContent("Level 2");
    expect(editor(card, "Strengths identified")).toHaveTextContent("Imitation");
    expect(editor(card, "Deficits identified")).toHaveTextContent("Manding");
    expect(
      editor(card, "Clinical Interpretation & Implications")
    ).toHaveTextContent("Continue targets");
  });
});

describe("what the category decides", () => {
  it("offers no second question until a category is chosen", () => {
    renderSection();
    expect(field(cards()[0], "Assessment Type")).toBeUndefined();
  });

  it.each([
    ["Core ABA/Skill-Based Assessments", "core-aba", "VB-MAPP", "vb-mapp"],
    [
      "Adaptive & Daily Living Skills",
      "adaptive-daily",
      "ABAS (Adaptive Behaviour Assessment System)",
      "abas",
    ],
    ["Behaviour & Emotional Functioning", "behaviour-emotional", "Child Behavior Checklist (CBCL)", "cbcl"],
    ["Language & Communication", "language-communication", "Communication Matrix", "comm-matrix"],
    ["Sensory & Motor", "sensory-motor", "Sensory Profile", "sensory-profile"],
    ["Cognitive/Developmental (Referenced)", "cognitive-developmental", "IQ Assessment (referenced)", "iq"],
    ["Caregiver/Stakeholder Input", "caregiver-stakeholder", "Teacher Interview", "teacher-interview"],
    ["Risk & Safety", "risk-safety", "Aggression Risk Review", "aggression"],
  ])(
    "offers the types that belong to %s",
    (categoryLabel, categoryValue, typeLabel, typeValue) => {
      renderSection();
      chooseOption(field(cards()[0], "Assessment Category"), categoryLabel);
      expect(lastAssessments()[0].category).toBe(categoryValue);
      chooseOption(field(cards()[0], "Assessment Type"), typeLabel);
      expect(lastAssessments()[0].type).toBe(typeValue);
    }
  );

  it("asks for the name instead when the category is Other", () => {
    renderSection();
    chooseOption(field(cards()[0], "Assessment Category"), "Other");
    const typeField = field(cards()[0], "Assessment Type");
    expect(typeField.querySelector("input")).toHaveAttribute(
      "placeholder",
      "Type the assessment name..."
    );
    fireEvent.change(typeField.querySelector("input"), {
      target: { value: "In-house checklist" },
    });
    expect(lastAssessments()[0].customType).toBe("In-house checklist");
  });

  it("throws away the previous answer when the category changes", () => {
    renderSection({ data: [assessment()] });
    chooseOption(field(cards()[0], "Assessment Category"), "Other");
    expect(lastAssessments()[0]).toMatchObject({
      category: "other",
      type: "",
      customType: "",
    });
    fireEvent.change(field(cards()[0], "Assessment Type").querySelector("input"), {
      target: { value: "In-house checklist" },
    });
    chooseOption(field(cards()[0], "Assessment Category"), "Sensory & Motor");
    expect(lastAssessments()[0]).toMatchObject({
      category: "sensory-motor",
      type: "",
      customType: "",
    });
  });

  it("wipes only the card whose category changed", () => {
    renderSection({ data: [assessment(), assessment({ id: 2 })] });
    chooseOption(field(cards()[1], "Assessment Category"), "Risk & Safety");
    expect(lastAssessments()[0]).toMatchObject({
      category: "core-aba",
      type: "vb-mapp",
    });
    expect(lastAssessments()[1]).toMatchObject({ category: "risk-safety", type: "" });
  });
});

describe("adding and removing assessments", () => {
  it("adds an empty assessment below the existing ones", () => {
    renderSection({ data: [assessment()] });
    fireEvent.click(screen.getByRole("button", { name: "Add a new assessment" }));
    expect(cards()).toHaveLength(2);
    expect(lastAssessments()[1]).toMatchObject({
      category: "",
      type: "",
      customType: "",
      supportingDocuments: [],
    });
  });

  it("refuses to delete the only assessment there is", () => {
    renderSection({ data: [assessment()] });
    fireEvent.click(screen.getByRole("button", { name: /Delete assessment/ }));
    expect(toast.showToast).toHaveBeenCalledWith("At least one assessment is required.");
    expect(cards()).toHaveLength(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("deletes the assessment that was asked for and renumbers the rest", () => {
    renderSection({
      data: [assessment(), assessment({ id: 2, administeredBy: "Sam Ray" })],
    });
    fireEvent.click(screen.getAllByRole("button", { name: /Delete assessment/ })[0]);
    expect(cards()).toHaveLength(1);
    expect(screen.getByText("Assessment 1")).toBeInTheDocument();
    expect(lastAssessments()).toHaveLength(1);
    expect(lastAssessments()[0].administeredBy).toBe("Sam Ray");
  });
});

describe("the rest of a card's fields", () => {
  it("records the plain text fields", () => {
    renderSection({ data: [assessment({ methodsUsed: "", date: "", administeredBy: "" })] });
    const card = cards()[0];
    fireEvent.change(field(card, "Assessment Methods used").querySelector("input"), {
      target: { value: "Direct observation" },
    });
    fireEvent.change(field(cards()[0], "Assessment Date").querySelector("input"), {
      target: { value: "2024-01-15" },
    });
    fireEvent.change(field(cards()[0], "Administered by").querySelector("input"), {
      target: { value: "Jane Doe" },
    });
    expect(lastAssessments()[0]).toMatchObject({
      methodsUsed: "Direct observation",
      date: "2024-01-15",
      administeredBy: "Jane Doe",
    });
  });

  it("records what is typed into each rich text field", () => {
    renderSection({ data: [assessment()] });
    const card = cards()[0];
    typeInEditor(editor(card, "Assessment method notes"), "<p>Two sittings</p>");
    typeInEditor(editor(card, "Summary of findings"), "<p>Level 2</p>");
    typeInEditor(editor(card, "Strengths identified"), "<p>Imitation</p>");
    typeInEditor(editor(card, "Deficits identified"), "<p>Manding</p>");
    typeInEditor(
      editor(card, "Clinical Interpretation & Implications"),
      "<p>Continue targets</p>"
    );
    expect(lastAssessments()[0]).toMatchObject({
      methodNotes: "<p>Two sittings</p>",
      summaryFindings: "<p>Level 2</p>",
      strengths: "<p>Imitation</p>",
      deficits: "<p>Manding</p>",
      clinicalInterpretation: "<p>Continue targets</p>",
    });
  });

  it("closes a dropdown when the backdrop is clicked", () => {
    renderSection({ data: [assessment()] });
    const category = field(cards()[0], "Assessment Category");
    fireEvent.click(category.querySelector(".report-builder-select-button"));
    expect(
      category.querySelector(".report-builder-select-dropdown")
    ).toBeInTheDocument();
    fireEvent.click(category.querySelector(".report-builder-select-overlay"));
    expect(
      category.querySelector(".report-builder-select-dropdown")
    ).not.toBeInTheDocument();
  });

  it("touches only the card that changed", () => {
    renderSection({ data: [assessment(), assessment({ id: 2 })] });
    fireEvent.change(
      field(cards()[1], "Administered by").querySelector("input"),
      { target: { value: "Sam Ray" } }
    );
    expect(lastAssessments()[0].administeredBy).toBe("Jane Doe");
    expect(lastAssessments()[1].administeredBy).toBe("Sam Ray");
  });
});

describe("the supporting documents", () => {
  const pickFile = () =>
    fireEvent.change(
      field(cards()[0], "Supporting documents").querySelector("input[type=file]"),
      { target: { files: [new File(["x"], "report.pdf", { type: "application/pdf" })] } }
    );

  it("attaches an uploaded file to the assessment", async () => {
    renderSection({ data: [assessment()] });
    pickFile();
    await waitFor(() =>
      expect(lastAssessments()[0].supportingDocuments).toEqual([
        { filename: "report.pdf", url: "https://files/report.pdf" },
      ])
    );
  });

  it("keeps the documents already attached when another arrives", async () => {
    renderSection({
      data: [
        assessment({
          supportingDocuments: [{ filename: "old.pdf", url: "https://files/old.pdf" }],
        }),
      ],
    });
    pickFile();
    await waitFor(() =>
      expect(lastAssessments()[0].supportingDocuments).toHaveLength(2)
    );
  });

  it("says so when the upload is refused, and attaches nothing", async () => {
    upload.UploadImage.mockRejectedValue(new Error("network"));
    renderSection({ data: [assessment()] });
    pickFile();
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("File upload failed", "error")
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("opens an attached file in the viewer and can take it off again", () => {
    renderSection({
      data: [
        assessment({
          supportingDocuments: [
            { filename: "report.pdf", url: "https://files/report.pdf" },
          ],
        }),
      ],
    });
    fireEvent.click(screen.getByRole("button", { name: "report.pdf" }));
    expect(viewer.openDocument).toHaveBeenCalledWith(
      "https://files/report.pdf",
      "report.pdf"
    );
    fireEvent.click(
      field(cards()[0], "Supporting documents").querySelector(
        ".report-builder-file-remove"
      )
    );
    expect(lastAssessments()[0].supportingDocuments).toEqual([]);
  });
});

describe("a read-only section", () => {
  it("hides every button that would change the section", () => {
    renderSection({ data: [assessment()], isReadOnly: true, onRemoveSection });
    expect(
      screen.queryByRole("button", { name: /Delete assessment/ })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add a new assessment" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove Section" })
    ).not.toBeInTheDocument();
  });

  it("hides the file picker but keeps the documents readable", () => {
    renderSection({
      data: [
        assessment({
          supportingDocuments: [
            { filename: "report.pdf", url: "https://files/report.pdf" },
          ],
        }),
      ],
      isReadOnly: true,
    });
    const documents = field(cards()[0], "Supporting documents");
    expect(documents.querySelector("input[type=file]")).not.toBeInTheDocument();
    expect(documents.querySelector(".report-builder-file-remove")).not.toBeInTheDocument();
    expect(
      within(documents).getByRole("button", { name: "report.pdf" })
    ).toBeInTheDocument();
  });

  it("still shows the stored content", () => {
    renderSection({ data: [assessment()], isReadOnly: true });
    expect(selectedLabel(field(cards()[0], "Assessment Category"))).toBe(
      "Core ABA/Skill-Based Assessments"
    );
    expect(editor(cards()[0], "Summary of findings")).toHaveTextContent("Level 2");
  });
});

describe("removing the whole section", () => {
  it("offers the button only when the parent gave it something to call", () => {
    renderSection({ data: [assessment()] });
    expect(
      screen.queryByRole("button", { name: "Remove Section" })
    ).not.toBeInTheDocument();
  });

  it("hands the removal back to the parent", () => {
    renderSection({ data: [assessment()], onRemoveSection });
    fireEvent.click(screen.getByRole("button", { name: "Remove Section" }));
    expect(onRemoveSection).toHaveBeenCalled();
  });
});

describe("the messages an assessment puts up when a field is left empty", () => {
  it("complains about a missing category once its list has been opened and shut", async () => {
    renderSection({ data: [assessment({ category: "", type: "" })] });
    leaveSelect(field(cards()[0], "Assessment Category"));
    // The type is required too, but with no category chosen there is no type
    // control on the card and nothing was touched, so it says nothing.
    await waitFor(() =>
      expect(cardErrors(cards()[0])).toEqual(["Assessment Category is required"])
    );
  });

  it("complains about a missing type once its list has been opened and shut", async () => {
    renderSection({ data: [assessment({ type: "" })] });
    leaveSelect(field(cards()[0], "Assessment Type"));
    await waitFor(() => expect(cardErrors(cards()[0])).toEqual(["Assessment Type is required"]));
  });

  it("asks for the type to be spelled out when the category is Other", async () => {
    renderSection({ data: [assessment({ category: "other", type: "", customType: "" })] });
    fireEvent.blur(field(cards()[0], "Assessment Type").querySelector("input"));
    await waitFor(() =>
      expect(cardErrors(cards()[0])).toEqual(["Please specify the assessment type"])
    );
  });

  it("takes the message back down as soon as the type is spelled out", async () => {
    renderSection({ data: [assessment({ category: "other", type: "", customType: "" })] });
    const custom = () => field(cards()[0], "Assessment Type").querySelector("input");
    fireEvent.blur(custom());
    await waitFor(() =>
      expect(cardErrors(cards()[0])).toEqual(["Please specify the assessment type"])
    );

    // A touched field is re-checked on every keystroke.
    fireEvent.change(custom(), { target: { value: "In-house screener" } });
    await waitFor(() => expect(cardErrors(cards()[0])).toEqual([]));
    expect(lastAssessments()[0].customType).toBe("In-house screener");
  });

  it("clears one card's message while leaving another card's alone", async () => {
    renderSection({
      data: [
        assessment({ category: "", type: "" }),
        assessment({ id: 2, category: "other", type: "", customType: "" }),
      ],
    });
    leaveSelect(field(cards()[0], "Assessment Category"));
    await waitFor(() =>
      expect(cardErrors(cards()[0])).toEqual(["Assessment Category is required"])
    );

    const custom = () => field(cards()[1], "Assessment Type").querySelector("input");
    fireEvent.blur(custom());
    await waitFor(() =>
      expect(cardErrors(cards()[1])).toEqual(["Please specify the assessment type"])
    );

    // The clear-up only drops the keys belonging to the card that validated.
    fireEvent.change(custom(), { target: { value: "In-house screener" } });
    await waitFor(() => expect(cardErrors(cards()[1])).toEqual([]));
    expect(cardErrors(cards()[0])).toEqual(["Assessment Category is required"]);
  });
});

describe("a read-only assessment's controls", () => {
  it("locks every select and text field", () => {
    renderSection({ data: [assessment({ category: "other" })], isReadOnly: true });
    const buttons = document.body.querySelectorAll(".report-builder-select-button");
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((b) => expect(b).toBeDisabled());
    document.body
      .querySelectorAll(".report-builder-input")
      .forEach((i) => expect(i).toHaveAttribute("readonly"));
  });

  it("cannot be made to put a message up, because nothing can be left", () => {
    renderSection({ data: [assessment({ category: "" })], isReadOnly: true });
    const button = field(cards()[0], "Assessment Category").querySelector(
      ".report-builder-select-button"
    );
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(cardErrors(cards()[0])).toEqual([]);
  });
});
