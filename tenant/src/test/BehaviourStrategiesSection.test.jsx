import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

/**
 * The Behaviour Strategies section of the clinical report builder: a stack of
 * strategy cards, each with three multi-selects where "Other" is exclusive of
 * everything else and reveals a "Custom ..." box, one single select, one plain
 * text input and three rich text fields.
 *
 * The real inputs are used rather than probes, because the bookkeeping between
 * them is the whole of the section's logic. Only the toast is a spy.
 *
 * A field is marked touched when it is left, and only a touched field shows its
 * message. For both the single and the multi selects "left" means the list
 * shutting rather than a native blur: the button keeps focus for as long as the
 * list is open, so a native blur would fire on the way to picking an option.
 *
 * The section seeds its strategies from `data` exactly once, so every fixture
 * is passed at render time rather than by re-rendering with new props.
 */

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

import BehaviourStrategiesSection from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/BehaviourStrategiesSection/BehaviourStrategiesSection";

// A strategy that satisfies every rule in the yup schema, so a test can knock
// out exactly one field and watch that one message appear.
const strategy = (over = {}) => ({
  id: 1,
  targetBehaviors: "Hitting, kicking",
  strategyName: "Escape extinction",
  strategyType: ["antecedent"],
  customStrategyType: "",
  functionAddressed: "escape",
  replacementBehavior: "",
  strategyDescription: "",
  whenToUse: "",
  responsibleStaff: ["rbt"],
  fidelityRequirements: ["neutral-affect"],
  customFidelityRequirement: "",
  dataCollected: ["frequency"],
  customDataCollected: "",
  ...over,
});

const onChange = vi.fn();
const onRemoveSection = vi.fn();

const renderSection = (props = {}) =>
  render(<BehaviourStrategiesSection onChange={onChange} {...props} />);

const cards = () => document.body.querySelectorAll(".strategy-card");

const field = (card, label) =>
  Array.from(card.querySelectorAll(".report-builder-field")).find((f) =>
    f.querySelector(".report-builder-label")?.textContent.startsWith(label)
  );

const selectedLabel = (fieldEl) =>
  fieldEl.querySelector(".report-builder-select-button span").textContent;

const chooseOption = (fieldEl, optionLabel) => {
  fireEvent.click(fieldEl.querySelector(".report-builder-select-button"));
  const option = Array.from(
    fieldEl.querySelectorAll(".report-builder-select-option")
  ).find((o) => o.textContent === optionLabel);
  fireEvent.click(option);
};

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

// The single select counts its list shutting as leaving the field, so this is
// what marks it touched without answering it.
const leaveSelect = (fieldEl) => {
  fireEvent.click(fieldEl.querySelector(".report-builder-select-button"));
  fireEvent.click(fieldEl.querySelector(".report-builder-select-overlay"));
};

// Each message sits beside its control rather than inside it, so they are
// collected off the whole card.
const cardErrors = (card) =>
  Array.from(card.querySelectorAll(".report-builder-error")).map((e) => e.textContent);

const targetBehaviorsInput = (card) =>
  field(card, "Target Behavior(s)").querySelector("input");

const textInput = (card, label) =>
  field(card, label).querySelector("input");

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

const lastStrategies = () => onChange.mock.calls[onChange.mock.calls.length - 1][0];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the shape a fresh section starts in", () => {
  it("opens with one empty strategy", () => {
    renderSection();
    expect(cards()).toHaveLength(1);
    expect(screen.getByText("Behaviour Strategy 1")).toBeInTheDocument();
    expect(targetBehaviorsInput(cards()[0])).toHaveValue("");
    expect(selectedLabel(field(cards()[0], "Strategy Type"))).toBe("Select an option");
    expect(selectedLabel(field(cards()[0], "Behavior function addressed"))).toBe(
      "Select an option"
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders the strategies it was given instead of a blank one", () => {
    renderSection({ data: [strategy(), strategy({ id: 2, strategyName: "Chaining" })] });
    expect(cards()).toHaveLength(2);
    expect(screen.getByText("Behaviour Strategy 2")).toBeInTheDocument();
    expect(textInput(cards()[1], "Strategy name")).toHaveValue("Chaining");
  });

  it("shows the stored selections on the closed controls", () => {
    renderSection({ data: [strategy()] });
    const card = cards()[0];
    expect(targetBehaviorsInput(card)).toHaveValue("Hitting, kicking");
    expect(selectedLabel(field(card, "Strategy Type"))).toBe("Antecedent modification");
    expect(selectedLabel(field(card, "Behavior function addressed"))).toBe(
      "Escape/avoidance"
    );
    expect(selectedLabel(field(card, "Responsible staff"))).toBe("RBT");
    expect(selectedLabel(field(card, "Fidelity requirements"))).toBe(
      "Maintain neutral affect"
    );
    expect(selectedLabel(field(card, "Data collected"))).toBe("Frequency");
  });

  it("keeps the custom boxes hidden until an Other is stored", () => {
    renderSection({ data: [strategy()] });
    const card = cards()[0];
    expect(field(card, "Custom Strategy Type")).toBeUndefined();
    expect(field(card, "Custom Fidelity Requirement")).toBeUndefined();
    expect(field(card, "Custom Data Collection Method")).toBeUndefined();
  });

  it("shows every custom box a stored strategy has earned", () => {
    renderSection({
      data: [
        strategy({
          strategyType: ["other"],
          customStrategyType: "Token economy",
          fidelityRequirements: ["other"],
          customFidelityRequirement: "Two staff present",
          dataCollected: ["other"],
          customDataCollected: "Photo log",
        }),
      ],
    });
    const card = cards()[0];
    expect(textInput(card, "Custom Strategy Type")).toHaveValue("Token economy");
    expect(textInput(card, "Custom Fidelity Requirement")).toHaveValue(
      "Two staff present"
    );
    expect(textInput(card, "Custom Data Collection Method")).toHaveValue("Photo log");
  });
});

describe("adding and removing strategies", () => {
  it("adds an empty strategy below the existing ones", () => {
    renderSection({ data: [strategy()] });
    fireEvent.click(
      screen.getByRole("button", { name: "Add a new behaviour strategy" })
    );
    expect(cards()).toHaveLength(2);
    expect(lastStrategies()[1]).toMatchObject({
      strategyName: "",
      strategyType: [],
      responsibleStaff: [],
      fidelityRequirements: [],
      dataCollected: [],
    });
  });

  it("refuses to delete the only strategy there is", () => {
    renderSection({ data: [strategy()] });
    fireEvent.click(screen.getByRole("button", { name: /Delete Behavior Strategy/ }));
    expect(toast.showToast).toHaveBeenCalledWith(
      "At least one behaviour strategy is required."
    );
    expect(cards()).toHaveLength(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("deletes the strategy that was asked for and renumbers the rest", () => {
    renderSection({ data: [strategy(), strategy({ id: 2, strategyName: "Chaining" })] });
    fireEvent.click(
      screen.getAllByRole("button", { name: /Delete Behavior Strategy/ })[0]
    );
    expect(cards()).toHaveLength(1);
    expect(screen.getByText("Behaviour Strategy 1")).toBeInTheDocument();
    expect(lastStrategies()).toHaveLength(1);
    expect(lastStrategies()[0].strategyName).toBe("Chaining");
  });
});

describe("the multi-selects where Other stands alone", () => {
  it.each([
    ["Strategy Type", "strategyType", "Extinction", "extinction", "Custom Strategy Type"],
    [
      "Fidelity requirements",
      "fidelityRequirements",
      "Collect data during implementation",
      "collect-data",
      "Custom Fidelity Requirement",
    ],
    ["Data collected", "dataCollected", "Duration", "duration", "Custom Data Collection Method"],
  ])(
    "drops everything else when Other is chosen for %s",
    (label, key, optionLabel, optionValue, customLabel) => {
      renderSection({ data: [strategy()] });
      const target = field(cards()[0], label);
      openMulti(target);
      toggleMulti(target, optionLabel);
      expect(lastStrategies()[0][key]).toHaveLength(2);
      toggleMulti(field(cards()[0], label), "Other");
      expect(lastStrategies()[0][key]).toEqual(["other"]);
      expect(field(cards()[0], customLabel)).toBeDefined();
      // And adding a real option beside "Other" drops "Other" again.
      toggleMulti(field(cards()[0], label), optionLabel);
      expect(lastStrategies()[0][key]).toEqual([optionValue]);
      expect(field(cards()[0], customLabel)).toBeUndefined();
    }
  );

  it("empties the field when Other is unticked on its own", () => {
    renderSection({ data: [strategy({ strategyType: ["other"] })] });
    const strategyType = field(cards()[0], "Strategy Type");
    openMulti(strategyType);
    toggleMulti(strategyType, "Other");
    expect(lastStrategies()[0].strategyType).toEqual([]);
  });

  it("records what the custom boxes are filled in with", () => {
    renderSection({
      data: [
        strategy({
          strategyType: ["other"],
          fidelityRequirements: ["other"],
          dataCollected: ["other"],
        }),
      ],
    });
    const card = cards()[0];
    fireEvent.change(textInput(card, "Custom Strategy Type"), {
      target: { value: "Token economy" },
    });
    fireEvent.change(textInput(cards()[0], "Custom Fidelity Requirement"), {
      target: { value: "Two staff present" },
    });
    fireEvent.change(textInput(cards()[0], "Custom Data Collection Method"), {
      target: { value: "Photo log" },
    });
    expect(lastStrategies()[0]).toMatchObject({
      customStrategyType: "Token economy",
      customFidelityRequirement: "Two staff present",
      customDataCollected: "Photo log",
    });
  });

  it("touches only the strategy that changed", () => {
    renderSection({ data: [strategy(), strategy({ id: 2 })] });
    const strategyType = field(cards()[1], "Strategy Type");
    openMulti(strategyType);
    toggleMulti(strategyType, "Extinction");
    expect(lastStrategies()[0].strategyType).toEqual(["antecedent"]);
    expect(lastStrategies()[1].strategyType).toEqual(["antecedent", "extinction"]);
  });
});

describe("the multi-select with no Other to worry about", () => {
  it("adds and removes responsible staff freely", () => {
    renderSection({ data: [strategy()] });
    const staff = field(cards()[0], "Responsible staff");
    openMulti(staff);
    toggleMulti(staff, "BCBA");
    expect(lastStrategies()[0].responsibleStaff).toEqual(["rbt", "bcba"]);
    toggleMulti(field(cards()[0], "Responsible staff"), "RBT");
    expect(lastStrategies()[0].responsibleStaff).toEqual(["bcba"]);
  });
});

describe("the rest of a strategy's fields", () => {
  it("records the strategy name and the behaviour function", () => {
    renderSection({ data: [strategy({ strategyName: "", functionAddressed: "" })] });
    fireEvent.change(textInput(cards()[0], "Strategy name"), {
      target: { value: "Escape extinction" },
    });
    expect(lastStrategies()[0].strategyName).toBe("Escape extinction");
    chooseOption(
      field(cards()[0], "Behavior function addressed"),
      "Automatic/sensory"
    );
    expect(lastStrategies()[0].functionAddressed).toBe("sensory");
  });

  it("records what is typed into each rich text field", () => {
    renderSection({ data: [strategy()] });
    const card = cards()[0];
    typeInEditor(
      editor(card, "Replacement / Alternative Behavior"),
      "<p>Asks for a break</p>"
    );
    typeInEditor(editor(card, "Strategy description"), "<p>Withhold escape</p>");
    typeInEditor(editor(card, "When to use"), "<p>During demands</p>");
    expect(lastStrategies()[0]).toMatchObject({
      replacementBehavior: "<p>Asks for a break</p>",
      strategyDescription: "<p>Withhold escape</p>",
      whenToUse: "<p>During demands</p>",
    });
  });

  it("closes a dropdown when the backdrop is clicked", () => {
    renderSection({ data: [strategy()] });
    const fn = field(cards()[0], "Behavior function addressed");
    fireEvent.click(fn.querySelector(".report-builder-select-button"));
    expect(fn.querySelector(".report-builder-select-dropdown")).toBeInTheDocument();
    fireEvent.click(fn.querySelector(".report-builder-select-overlay"));
    expect(fn.querySelector(".report-builder-select-dropdown")).not.toBeInTheDocument();
  });
});

describe("the one field whose blur survives", () => {
  it("complains once target behaviours is left blank", async () => {
    renderSection({ data: [strategy({ targetBehaviors: "" })] });
    fireEvent.blur(targetBehaviorsInput(cards()[0]));
    expect(
      await within(cards()[0]).findByText("Target Behavior(s) is required")
    ).toBeInTheDocument();
  });

  it("clears the complaint as soon as something is typed", async () => {
    renderSection({ data: [strategy({ targetBehaviors: "" })] });
    fireEvent.blur(targetBehaviorsInput(cards()[0]));
    await within(cards()[0]).findByText("Target Behavior(s) is required");
    fireEvent.change(targetBehaviorsInput(cards()[0]), {
      target: { value: "Hitting" },
    });
    await waitFor(() =>
      expect(
        within(cards()[0]).queryByText("Target Behavior(s) is required")
      ).not.toBeInTheDocument()
    );
    expect(lastStrategies()[0].targetBehaviors).toBe("Hitting");
  });

  it("says nothing on a blur that finds the field already filled", async () => {
    renderSection({ data: [strategy()] });
    fireEvent.blur(targetBehaviorsInput(cards()[0]));
    await waitFor(() =>
      expect(
        within(cards()[0]).queryByText("Target Behavior(s) is required")
      ).not.toBeInTheDocument()
    );
  });

  it("keeps quiet about the fields whose blur never arrives", async () => {
    // The whole strategy is empty, so yup collects a message for every rule --
    // but only the one touched field has anywhere to render it.
    renderSection({
      data: [
        strategy({
          targetBehaviors: "",
          strategyName: "",
          strategyType: [],
          functionAddressed: "",
          responsibleStaff: [],
          fidelityRequirements: [],
          dataCollected: [],
        }),
      ],
    });
    fireEvent.blur(targetBehaviorsInput(cards()[0]));
    await within(cards()[0]).findByText("Target Behavior(s) is required");
    expect(screen.queryByText("Strategy name is required")).not.toBeInTheDocument();
    expect(
      screen.queryByText("At least one strategy type is required")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Behavior function addressed is required")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("At least one responsible staff is required")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("At least one fidelity requirement is required")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("At least one data collection method is required")
    ).not.toBeInTheDocument();
  });

  it("re-checks only the strategy that was blurred", async () => {
    renderSection({
      data: [strategy({ targetBehaviors: "" }), strategy({ id: 2, targetBehaviors: "" })],
    });
    fireEvent.blur(targetBehaviorsInput(cards()[1]));
    expect(
      await within(cards()[1]).findByText("Target Behavior(s) is required")
    ).toBeInTheDocument();
    expect(
      within(cards()[0]).queryByText("Target Behavior(s) is required")
    ).not.toBeInTheDocument();
  });

  it("does not re-check an untouched field when it changes", () => {
    renderSection({ data: [strategy({ targetBehaviors: "" })] });
    fireEvent.change(targetBehaviorsInput(cards()[0]), { target: { value: "H" } });
    expect(lastStrategies()[0].targetBehaviors).toBe("H");
    expect(
      within(cards()[0]).queryByText("Target Behavior(s) is required")
    ).not.toBeInTheDocument();
  });
});

describe("a read-only section", () => {
  it("hides every button that would change the section", () => {
    renderSection({ data: [strategy()], isReadOnly: true, onRemoveSection });
    expect(
      screen.queryByRole("button", { name: /Delete Behavior Strategy/ })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add a new behaviour strategy" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove Section" })
    ).not.toBeInTheDocument();
  });

  it("locks every input in the section", () => {
    renderSection({ data: [strategy()], isReadOnly: true });
    expect(targetBehaviorsInput(cards()[0])).toHaveAttribute("readonly");
    expect(textInput(cards()[0], "Strategy name")).toHaveAttribute("readonly");
  });

  it("still shows the stored content", () => {
    renderSection({ data: [strategy()], isReadOnly: true });
    expect(selectedLabel(field(cards()[0], "Strategy Type"))).toBe(
      "Antecedent modification"
    );
    expect(targetBehaviorsInput(cards()[0])).toHaveValue("Hitting, kicking");
  });
});

describe("removing the whole section", () => {
  it("offers the button only when the parent gave it something to call", () => {
    renderSection({ data: [strategy()] });
    expect(
      screen.queryByRole("button", { name: "Remove Section" })
    ).not.toBeInTheDocument();
  });

  it("hands the removal back to the parent", () => {
    renderSection({ data: [strategy()], onRemoveSection });
    fireEvent.click(screen.getByRole("button", { name: "Remove Section" }));
    expect(onRemoveSection).toHaveBeenCalled();
  });
});

describe("the messages a strategy puts up when a field is left empty", () => {
  it("complains about a blank strategy name once the field is left", async () => {
    renderSection({ data: [strategy({ strategyName: "" })] });
    fireEvent.blur(textInput(cards()[0], "Strategy name"));
    await waitFor(() => expect(cardErrors(cards()[0])).toEqual(["Strategy name is required"]));
  });

  it("complains about the function addressed once its list has been opened and shut", async () => {
    renderSection({ data: [strategy({ functionAddressed: "" })] });
    leaveSelect(field(cards()[0], "Behavior function addressed"));
    await waitFor(() =>
      expect(cardErrors(cards()[0])).toEqual(["Behavior function addressed is required"])
    );
  });

  it.each([
    [
      "strategy type",
      { strategyType: ["other"], customStrategyType: "" },
      "Custom Strategy Type",
      "Please specify the strategy type",
    ],
    [
      "fidelity requirement",
      { fidelityRequirements: ["other"], customFidelityRequirement: "" },
      "Custom Fidelity Requirement",
      "Please specify the fidelity requirement",
    ],
    [
      "data collection method",
      { dataCollected: ["other"], customDataCollected: "" },
      "Custom Data Collection Method",
      "Please specify the data collection method",
    ],
  ])("asks for the %s to be spelled out when Other is left blank", async (
    _name,
    over,
    label,
    message
  ) => {
    renderSection({ data: [strategy(over)] });
    fireEvent.blur(textInput(cards()[0], label));
    await waitFor(() => expect(cardErrors(cards()[0])).toEqual([message]));
  });

  it("stays quiet about the fields that were never left", async () => {
    renderSection({
      data: [strategy({ strategyName: "", functionAddressed: "", targetBehaviors: "" })],
    });
    fireEvent.blur(textInput(cards()[0], "Strategy name"));
    await waitFor(() => expect(cardErrors(cards()[0])).toEqual(["Strategy name is required"]));
  });

  it("shows only the name until a multi-select is actually left", async () => {
    renderSection({
      data: [
        strategy({
          strategyName: "",
          strategyType: [],
          responsibleStaff: [],
          fidelityRequirements: [],
          dataCollected: [],
        }),
      ],
    });
    // Leaving the name validates the whole strategy, so all five failures are
    // already in `errors` -- but a message still needs its own field to have
    // been touched before it has anywhere to show.
    fireEvent.blur(textInput(cards()[0], "Strategy name"));
    await waitFor(() => expect(cardErrors(cards()[0])).toEqual(["Strategy name is required"]));
  });

  // One case per multi-select: opening the list and shutting it again is what
  // marks the field touched, and each message is keyed to its own field.
  it.each([
    ["Strategy Type", "At least one strategy type is required"],
    ["Responsible staff", "At least one responsible staff is required"],
    ["Fidelity requirements", "At least one fidelity requirement is required"],
    ["Data collected", "At least one data collection method is required"],
  ])("reports %s once its list has been opened and shut", async (label, message) => {
    renderSection({
      data: [
        strategy({
          strategyType: [],
          responsibleStaff: [],
          fidelityRequirements: [],
          dataCollected: [],
        }),
      ],
    });
    leaveSelect(field(cards()[0], label));
    await waitFor(() => expect(cardErrors(cards()[0])).toEqual([message]));
  });

  it("says nothing when the multi-select it left was already answered", async () => {
    renderSection({ data: [strategy()] });
    leaveSelect(field(cards()[0], "Strategy Type"));
    await waitFor(() => expect(cardErrors(cards()[0])).toEqual([]));
  });

  it("clears a multi-select's message once an option is picked", async () => {
    const fieldEl = () => field(cards()[0], "Responsible staff");
    renderSection({ data: [strategy({ responsibleStaff: [] })] });

    leaveSelect(fieldEl());
    await waitFor(() =>
      expect(cardErrors(cards()[0])).toEqual([
        "At least one responsible staff is required",
      ])
    );

    openMulti(fieldEl());
    toggleMulti(fieldEl(), "RBT");
    await waitFor(() => expect(cardErrors(cards()[0])).toEqual([]));
  });

  it("clears one strategy's message while leaving another's alone", async () => {
    renderSection({ data: [strategy({ functionAddressed: "" }), strategy({ id: 2, strategyName: "" })] });
    leaveSelect(field(cards()[0], "Behavior function addressed"));
    await waitFor(() =>
      expect(cardErrors(cards()[0])).toEqual(["Behavior function addressed is required"])
    );

    const name = () => textInput(cards()[1], "Strategy name");
    fireEvent.blur(name());
    await waitFor(() => expect(cardErrors(cards()[1])).toEqual(["Strategy name is required"]));

    // A touched field is re-checked on every keystroke, and the clear-up only
    // drops the keys belonging to the strategy that just validated.
    fireEvent.change(name(), { target: { value: "Differential reinforcement" } });
    await waitFor(() => expect(cardErrors(cards()[1])).toEqual([]));
    expect(cardErrors(cards()[0])).toEqual(["Behavior function addressed is required"]);
  });
});

describe("a read-only strategy's controls", () => {
  it("locks every select and text field", () => {
    renderSection({ data: [strategy({ strategyType: ["other"] })], isReadOnly: true });
    const buttons = document.body.querySelectorAll(".report-builder-select-button");
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((b) => expect(b).toBeDisabled());
    document.body
      .querySelectorAll(".report-builder-input")
      .forEach((i) => expect(i).toHaveAttribute("readonly"));
  });

  it("cannot be made to put a message up, because nothing can be left", () => {
    renderSection({ data: [strategy({ functionAddressed: "" })], isReadOnly: true });
    const button = field(cards()[0], "Behavior function addressed").querySelector(
      ".report-builder-select-button"
    );
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(cardErrors(cards()[0])).toEqual([]);
  });
});
