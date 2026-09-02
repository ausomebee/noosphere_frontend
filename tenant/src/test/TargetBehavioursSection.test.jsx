import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The Target Behaviours section of the clinical report builder: a stack of
 * behaviour cards, each with three single-selects that can fall through to a
 * "Please specify" box, a settings multi-select where "Other" is exclusive of
 * everything else, and a graph-reference file field.
 *
 * The real inputs are used rather than probes -- the section's own logic IS the
 * bookkeeping between them, and there would be nothing left to test otherwise.
 * That drags in the file field, which reads the auth slice and the document
 * viewer, so the tests supply a store and mock the viewer hook (the real one
 * throws outside its provider) and the upload endpoint.
 *
 * The section seeds its behaviours from `data` exactly once, so every fixture
 * is passed at render time rather than by re-rendering with new props.
 *
 * A field is marked touched when it is left, and only a touched field shows its
 * message. For the two dropdowns "left" means the list shutting rather than a
 * native blur, so a message is provoked by opening a list and clicking the
 * overlay away. The operational definition and the direction radios are the
 * exceptions: neither is handed a blur at all, so those two messages cannot be
 * reached however the card is driven.
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

import TargetBehavioursSection from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/TargetBehavioursSections/TargetBehavioursSection";

const behaviour = (over = {}) => ({
  id: 1,
  name: "Hitting",
  category: "aggression",
  categoryOther: "",
  operationalDefinition: "<p>Open-hand contact</p>",
  direction: "decrease",
  functionOfBehavior: "escape",
  functionOther: "",
  antecedentConsequence: "",
  baselineDescription: "",
  measurementMethod: "frequency",
  measurementMethodOther: "",
  graphReference: [],
  settingsContext: ["home"],
  settingsContextOther: "",
  priority: "high",
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
      <TargetBehavioursSection onChange={onChange} {...props} />
    </Provider>
  );

const cards = () => document.body.querySelectorAll(".behavior-card");

const field = (card, label) =>
  Array.from(card.querySelectorAll(".report-builder-field")).find((f) =>
    f.querySelector(".report-builder-label")?.textContent.startsWith(label)
  );

const chooseOption = (fieldEl, optionLabel) => {
  fireEvent.click(fieldEl.querySelector(".report-builder-select-button"));
  const option = Array.from(
    fieldEl.querySelectorAll(".report-builder-select-option")
  ).find((o) => o.textContent === optionLabel);
  fireEvent.click(option);
};

const selectedLabel = (fieldEl) =>
  fieldEl.querySelector(".report-builder-select-button span").textContent;

// The multi-select keeps its dropdown open, so the caller opens it once and
// toggles as many options as it likes.
const openMulti = (fieldEl) =>
  fireEvent.click(fieldEl.querySelector(".report-builder-select-button"));

const toggleMulti = (fieldEl, optionLabel) => {
  const option = Array.from(
    fieldEl.querySelectorAll(".report-builder-multi-select-option")
  ).find((o) => o.textContent.trim() === optionLabel);
  fireEvent.click(option.querySelector("input[type=checkbox]"));
};

// Both dropdowns count their list shutting as leaving the field, so this marks
// a select touched without answering it.
const leaveSelect = (fieldEl) => {
  fireEvent.click(fieldEl.querySelector(".report-builder-select-button"));
  fireEvent.click(fieldEl.querySelector(".report-builder-select-overlay"));
};

// Each message sits beside its control rather than inside it, so they are
// collected off the whole card.
const cardErrors = (card) =>
  Array.from(card.querySelectorAll(".report-builder-error")).map(
    (e) => e.textContent
  );

const editor = (scope, label) => {
  const container = Array.from(scope.querySelectorAll(".rich-editor-container")).find(
    (c) => c.querySelector(".label-text")?.textContent === label
  );
  return container.querySelector("[contenteditable]");
};

const typeInEditor = (element, html) => {
  element.innerHTML = html;
  fireEvent.input(element);
};

const lastBehaviours = () => onChange.mock.calls[onChange.mock.calls.length - 1][0];

beforeEach(() => {
  vi.clearAllMocks();
  upload.UploadImage.mockResolvedValue({
    success: true,
    data: [{ filename: "graph.png", url: "https://files/graph.png" }],
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the shape a fresh section starts in", () => {
  it("opens with one empty behaviour", () => {
    renderSection();
    expect(cards()).toHaveLength(1);
    expect(screen.getByText("Target Behavior 1")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Type something")).toHaveValue("");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders the behaviours it was given instead of a blank one", () => {
    renderSection({ data: [behaviour(), behaviour({ id: 2, name: "Eloping" })] });
    expect(cards()).toHaveLength(2);
    expect(screen.getByText("Target Behavior 2")).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText("Type something")[1]).toHaveValue("Eloping");
  });

  it("shows the stored selections on the closed controls", () => {
    renderSection({ data: [behaviour()] });
    const card = cards()[0];
    expect(selectedLabel(field(card, "Behavior Category"))).toBe("Aggression");
    expect(selectedLabel(field(card, "Function of behavior"))).toBe("Escape/Avoidance");
    expect(selectedLabel(field(card, "Measurement method"))).toBe("Frequency");
    expect(selectedLabel(field(card, "Settings/Context"))).toBe("Home");
    expect(selectedLabel(field(card, "Priority"))).toBe("High");
    const decrease = within(field(card, "Behavior Direction")).getByText("Decrease");
    expect(decrease.parentElement.querySelector("input")).toBeChecked();
  });

  it("shows the placeholder on a multi-select with nothing chosen", () => {
    renderSection({ data: [behaviour({ settingsContext: [] })] });
    expect(selectedLabel(field(cards()[0], "Settings/Context"))).toBe("Select an option");
  });

  it("shows every specify box a stored behaviour has earned", () => {
    renderSection({
      data: [
        behaviour({
          category: "other",
          categoryOther: "Rocking",
          functionOfBehavior: "other",
          functionOther: "Peer modelling",
          measurementMethod: "other",
          measurementMethodOther: "Tally",
          settingsContext: ["other"],
          settingsContextOther: "Respite care",
        }),
      ],
    });
    expect(screen.getByPlaceholderText("Enter other behavior category")).toHaveValue("Rocking");
    expect(screen.getByPlaceholderText("Enter other function")).toHaveValue("Peer modelling");
    expect(screen.getByPlaceholderText("Enter other measurement method")).toHaveValue("Tally");
    expect(screen.getByPlaceholderText("Enter other settings/context")).toHaveValue(
      "Respite care"
    );
  });
});

describe("adding and removing behaviours", () => {
  it("adds an empty behaviour below the existing ones", () => {
    renderSection({ data: [behaviour()] });
    fireEvent.click(screen.getByRole("button", { name: "Add a new target behaviour" }));
    expect(cards()).toHaveLength(2);
    expect(lastBehaviours()[1]).toMatchObject({
      name: "",
      category: "",
      settingsContext: [],
      graphReference: [],
    });
  });

  it("refuses to delete the only behaviour there is", () => {
    renderSection({ data: [behaviour()] });
    fireEvent.click(screen.getByRole("button", { name: /Delete Behavior/ }));
    expect(toast.showToast).toHaveBeenCalledWith("At least one target behavior is required.");
    expect(cards()).toHaveLength(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("deletes the behaviour that was asked for and renumbers the rest", () => {
    renderSection({ data: [behaviour(), behaviour({ id: 2, name: "Eloping" })] });
    fireEvent.click(screen.getAllByRole("button", { name: /Delete Behavior/ })[0]);
    expect(cards()).toHaveLength(1);
    expect(screen.getByText("Target Behavior 1")).toBeInTheDocument();
    expect(lastBehaviours()).toHaveLength(1);
    expect(lastBehaviours()[0].name).toBe("Eloping");
  });
});

describe("the Other bookkeeping on the single selects", () => {
  it.each([
    ["Behavior Category", "category", "categoryOther", "Enter other behavior category", "Elopement", "elopement"],
    ["Function of behavior", "functionOfBehavior", "functionOther", "Enter other function", "Attention", "attention"],
    ["Measurement method", "measurementMethod", "measurementMethodOther", "Enter other measurement method", "Duration", "duration"],
  ])(
    "reveals and then clears the specify box for %s",
    (label, valueField, otherField, placeholder, awayLabel, awayValue) => {
      renderSection({ data: [behaviour({ [valueField]: "", [otherField]: "" })] });
      chooseOption(field(cards()[0], label), "Other");
      expect(lastBehaviours()[0][valueField]).toBe("other");
      const box = screen.getByPlaceholderText(placeholder);
      fireEvent.change(box, { target: { value: "Something else" } });
      expect(lastBehaviours()[0][otherField]).toBe("Something else");
      chooseOption(field(cards()[0], label), awayLabel);
      expect(lastBehaviours()[0]).toMatchObject({
        [valueField]: awayValue,
        [otherField]: "",
      });
      expect(screen.queryByPlaceholderText(placeholder)).not.toBeInTheDocument();
    }
  );

  it("moves straight between two ordinary options", () => {
    // Neither the old nor the new value is "other", which is the one route
    // through the selection helper that the Other tests never take.
    renderSection({ data: [behaviour()] });
    chooseOption(field(cards()[0], "Behavior Category"), "Elopement");
    expect(lastBehaviours()[0]).toMatchObject({
      category: "elopement",
      categoryOther: "",
    });
    expect(
      screen.queryByPlaceholderText("Enter other behavior category")
    ).not.toBeInTheDocument();
  });

  it("leaves the other behaviours alone while clearing a specify box", () => {
    renderSection({
      data: [
        behaviour({ category: "other", categoryOther: "Rocking" }),
        behaviour({ id: 2, name: "Eloping" }),
      ],
    });
    chooseOption(field(cards()[0], "Behavior Category"), "Tantrums");
    expect(lastBehaviours()[0]).toMatchObject({
      category: "tantrums",
      categoryOther: "",
    });
    expect(lastBehaviours()[1]).toMatchObject({
      name: "Eloping",
      category: "aggression",
    });
  });

  it("keeps what was specified when Other is chosen again over Other", () => {
    renderSection({ data: [behaviour({ category: "other", categoryOther: "Rocking" })] });
    chooseOption(field(cards()[0], "Behavior Category"), "Other");
    expect(lastBehaviours()[0]).toMatchObject({
      category: "other",
      categoryOther: "Rocking",
    });
  });

  it("touches only the behaviour that changed", () => {
    renderSection({ data: [behaviour(), behaviour({ id: 2, name: "Eloping" })] });
    chooseOption(field(cards()[1], "Priority"), "Low");
    expect(lastBehaviours()[0].priority).toBe("high");
    expect(lastBehaviours()[1].priority).toBe("low");
  });
});

describe("the settings multi-select, where Other stands alone", () => {
  it("drops everything else the moment Other is chosen", () => {
    renderSection({ data: [behaviour({ settingsContext: ["home", "school"] })] });
    const settings = field(cards()[0], "Settings/Context");
    openMulti(settings);
    toggleMulti(settings, "Other");
    expect(lastBehaviours()[0].settingsContext).toEqual(["other"]);
    expect(screen.getByPlaceholderText("Enter other settings/context")).toBeInTheDocument();
  });

  it("drops Other the moment a real setting is added beside it", () => {
    renderSection({ data: [behaviour({ settingsContext: ["other"], settingsContextOther: "Respite" })] });
    const settings = field(cards()[0], "Settings/Context");
    openMulti(settings);
    toggleMulti(settings, "School");
    expect(lastBehaviours()[0].settingsContext).toEqual(["school"]);
    expect(
      screen.queryByPlaceholderText("Enter other settings/context")
    ).not.toBeInTheDocument();
  });

  it("empties the field when Other is unticked on its own", () => {
    renderSection({ data: [behaviour({ settingsContext: ["other"] })] });
    const settings = field(cards()[0], "Settings/Context");
    openMulti(settings);
    toggleMulti(settings, "Other");
    expect(lastBehaviours()[0].settingsContext).toEqual([]);
  });

  it("adds and removes ordinary settings without interference", () => {
    renderSection({ data: [behaviour({ settingsContext: ["home"] })] });
    const settings = field(cards()[0], "Settings/Context");
    openMulti(settings);
    toggleMulti(settings, "Clinic/Center");
    expect(lastBehaviours()[0].settingsContext).toEqual(["home", "clinic"]);
    toggleMulti(field(cards()[0], "Settings/Context"), "Home");
    expect(lastBehaviours()[0].settingsContext).toEqual(["clinic"]);
  });

  it("records what the settings specify box is filled in with", () => {
    renderSection({ data: [behaviour({ settingsContext: ["other"] })] });
    fireEvent.change(screen.getByPlaceholderText("Enter other settings/context"), {
      target: { value: "Respite care" },
    });
    expect(lastBehaviours()[0].settingsContextOther).toBe("Respite care");
  });

  it("closes the dropdown when the backdrop is clicked", () => {
    renderSection({ data: [behaviour()] });
    const settings = field(cards()[0], "Settings/Context");
    openMulti(settings);
    expect(settings.querySelector(".report-builder-multi-select-dropdown")).toBeInTheDocument();
    fireEvent.click(settings.querySelector(".report-builder-select-overlay"));
    expect(
      settings.querySelector(".report-builder-multi-select-dropdown")
    ).not.toBeInTheDocument();
  });
});

describe("the rest of a behaviour's fields", () => {
  it("records the name, the direction and the priority", () => {
    renderSection({ data: [behaviour({ name: "", direction: "", priority: "" })] });
    fireEvent.change(screen.getByPlaceholderText("Type something"), {
      target: { value: "Biting" },
    });
    expect(lastBehaviours()[0].name).toBe("Biting");
    const increase = within(field(cards()[0], "Behavior Direction")).getByText("Increase");
    fireEvent.click(increase.parentElement.querySelector("input"));
    expect(lastBehaviours()[0].direction).toBe("increase");
    chooseOption(field(cards()[0], "Priority"), "Medium");
    expect(lastBehaviours()[0].priority).toBe("medium");
  });

  it("records what is typed into the three rich text fields", () => {
    renderSection({ data: [behaviour({ operationalDefinition: "" })] });
    const card = cards()[0];
    typeInEditor(editor(card, "Operational definition"), "<p>Closed fist</p>");
    typeInEditor(editor(card, "Antecedent/Consequence patterns"), "<p>Demand</p>");
    typeInEditor(editor(card, "Baseline description"), "<p>4 per hour</p>");
    expect(lastBehaviours()[0]).toMatchObject({
      operationalDefinition: "<p>Closed fist</p>",
      antecedentConsequence: "<p>Demand</p>",
      baselineDescription: "<p>4 per hour</p>",
    });
  });
});

describe("the graph reference file field", () => {
  const pickFile = (card) => {
    const input = field(card, "Graph reference").querySelector("input[type=file]");
    fireEvent.change(input, {
      target: { files: [new File(["x"], "graph.png", { type: "image/png" })] },
    });
  };

  it("attaches an uploaded graph to the behaviour", async () => {
    renderSection({ data: [behaviour()] });
    pickFile(cards()[0]);
    await waitFor(() =>
      expect(lastBehaviours()[0].graphReference).toEqual([
        { filename: "graph.png", url: "https://files/graph.png" },
      ])
    );
    expect(await screen.findByText("graph.png")).toBeInTheDocument();
  });

  it("says so when the upload is refused, and attaches nothing", async () => {
    upload.UploadImage.mockResolvedValue({ success: false, error: "Too large" });
    renderSection({ data: [behaviour()] });
    pickFile(cards()[0]);
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("File upload failed", "error")
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("opens an attached graph in the viewer and can take it off again", () => {
    renderSection({
      data: [
        behaviour({
          graphReference: [{ filename: "graph.png", url: "https://files/graph.png" }],
        }),
      ],
    });
    fireEvent.click(screen.getByRole("button", { name: "graph.png" }));
    expect(viewer.openDocument).toHaveBeenCalledWith("https://files/graph.png", "graph.png");
    fireEvent.click(
      field(cards()[0], "Graph reference").querySelector(".report-builder-file-remove")
    );
    expect(lastBehaviours()[0].graphReference).toEqual([]);
  });
});

describe("a read-only section", () => {
  it("hides every button that would change the section", () => {
    renderSection({ data: [behaviour()], isReadOnly: true, onRemoveSection });
    expect(screen.queryByRole("button", { name: /Delete Behavior/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add a new target behaviour" })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Section" })).not.toBeInTheDocument();
    expect(
      field(cards()[0], "Graph reference").querySelector("input[type=file]")
    ).not.toBeInTheDocument();
  });

  it("still shows the stored content", () => {
    renderSection({ data: [behaviour()], isReadOnly: true });
    expect(screen.getByPlaceholderText("Type something")).toHaveValue("Hitting");
    expect(selectedLabel(field(cards()[0], "Priority"))).toBe("High");
  });
});

describe("removing the whole section", () => {
  it("offers the button only when the parent gave it something to call", () => {
    renderSection({ data: [behaviour()] });
    expect(screen.queryByRole("button", { name: "Remove Section" })).not.toBeInTheDocument();
  });

  it("hands the removal back to the parent", () => {
    renderSection({ data: [behaviour()], onRemoveSection });
    fireEvent.click(screen.getByRole("button", { name: "Remove Section" }));
    expect(onRemoveSection).toHaveBeenCalled();
  });
});

describe("the messages a behaviour puts up when a field is left empty", () => {
  // Each fixture is an otherwise complete behaviour with one field emptied, so
  // the single message on the card is unambiguously the one being tested.
  it.each([
    ["Behavior Category", { category: "" }, "Behavior category is required"],
    [
      "Function of behavior",
      { functionOfBehavior: "" },
      "Function of behavior is required",
    ],
    [
      "Measurement method",
      { measurementMethod: "" },
      "Measurement method is required",
    ],
    [
      "Settings/Context",
      { settingsContext: [] },
      "At least one setting/context is required",
    ],
    ["Priority", { priority: "" }, "Priority is required"],
  ])("complains about %s once its list has been opened and shut", async (
    label,
    over,
    message
  ) => {
    renderSection({ data: [behaviour(over)] });
    leaveSelect(field(cards()[0], label));
    await waitFor(() => expect(cardErrors(cards()[0])).toEqual([message]));
  });

  it("complains about a blank behaviour name once the field is left", async () => {
    renderSection({ data: [behaviour({ name: "" })] });
    fireEvent.blur(field(cards()[0], "Behavior Name").querySelector("input"));
    await waitFor(() =>
      expect(cardErrors(cards()[0])).toEqual(["Behavior name is required"])
    );
  });

  it.each([
    [
      "behavior category",
      { category: "other", categoryOther: "" },
      "Enter other behavior category",
      "Please specify the behavior category",
    ],
    [
      "function",
      { functionOfBehavior: "other", functionOther: "" },
      "Enter other function",
      "Please specify the function",
    ],
    [
      "measurement method",
      { measurementMethod: "other", measurementMethodOther: "" },
      "Enter other measurement method",
      "Please specify the measurement method",
    ],
    [
      "setting/context",
      { settingsContext: ["other"], settingsContextOther: "" },
      "Enter other settings/context",
      "Please specify the setting/context",
    ],
  ])("asks for the %s to be spelled out when Other is left blank", async (
    _name,
    over,
    placeholder,
    message
  ) => {
    renderSection({ data: [behaviour(over)] });
    fireEvent.blur(screen.getByPlaceholderText(placeholder));
    await waitFor(() => expect(cardErrors(cards()[0])).toEqual([message]));
  });

  it("stays quiet about the fields that were never left", async () => {
    renderSection({ data: [behaviour({ name: "", priority: "", category: "" })] });
    leaveSelect(field(cards()[0], "Priority"));
    await waitFor(() => expect(cardErrors(cards()[0])).toEqual(["Priority is required"]));
  });

  it("clears one behaviour's message while leaving another's alone", async () => {
    renderSection({ data: [behaviour({ priority: "" }), behaviour({ id: 2, name: "" })] });
    leaveSelect(field(cards()[0], "Priority"));
    await waitFor(() => expect(cardErrors(cards()[0])).toEqual(["Priority is required"]));

    const name = () => field(cards()[1], "Behavior Name").querySelector("input");
    fireEvent.blur(name());
    await waitFor(() =>
      expect(cardErrors(cards()[1])).toEqual(["Behavior name is required"])
    );

    // A touched field is re-checked on every keystroke, and the clear-up only
    // drops the keys belonging to the behaviour that just validated.
    fireEvent.change(name(), { target: { value: "Eloping" } });
    await waitFor(() => expect(cardErrors(cards()[1])).toEqual([]));
    expect(cardErrors(cards()[0])).toEqual(["Priority is required"]);
  });

  it("reports the definition and the direction once each is left", async () => {
    renderSection({
      data: [behaviour({ name: "", operationalDefinition: "", direction: "" })],
    });
    fireEvent.blur(field(cards()[0], "Behavior Name").querySelector("input"));
    await waitFor(() =>
      expect(cardErrors(cards()[0])).toEqual(["Behavior name is required"])
    );

    // The rich text editor and the radio group are both handed a blur now, so
    // each reports as it is left rather than staying silent.
    fireEvent.blur(
      field(cards()[0], "Behavior Direction").querySelector("input[type=radio]")
    );
    await waitFor(() =>
      expect(cardErrors(cards()[0])).toContain("Behavior direction is required")
    );

    fireEvent.blur(
      document.body.querySelectorAll(".editor-content")[0]
    );
    await waitFor(() =>
      expect(cardErrors(cards()[0])).toContain(
        "Operational definition is required"
      )
    );
  });
});

describe("a read-only behaviour's controls", () => {
  it("locks every select and text field", () => {
    renderSection({ data: [behaviour({ category: "other" })], isReadOnly: true });
    const buttons = document.body.querySelectorAll(".report-builder-select-button");
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((b) => expect(b).toBeDisabled());
    document.body
      .querySelectorAll(".report-builder-input")
      .forEach((i) => expect(i).toHaveAttribute("readonly"));
    document.body
      .querySelectorAll(".report-builder-radio-input")
      .forEach((r) => expect(r).toBeDisabled());
  });

  it("cannot be made to put a message up, because nothing can be left", () => {
    renderSection({ data: [behaviour({ priority: "" })], isReadOnly: true });
    const button = field(cards()[0], "Priority").querySelector(
      ".report-builder-select-button"
    );
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(cardErrors(cards()[0])).toEqual([]);
  });
});
