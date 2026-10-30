import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

/**
 * The Goals & Targets section of the clinical report builder: a list of goal
 * cards, each holding its own list of target cards, each with a "specify"
 * field that appears only while its select says "Other".
 *
 * The inputs are the real ones. Mocking them away would leave almost nothing
 * to test, because the section's own logic IS the wiring between them: the
 * "other" bookkeeping, the one-goal and one-target floors, and the Yup
 * validation that runs on blur. Only the toast is a spy.
 *
 * Two things are worth knowing before reading the assertions. The section
 * seeds its goals from `data` exactly once, so later prop changes are ignored
 * and every fixture is passed at render time. And of every field on the card,
 * only Target Behavior(s) is a plain input -- ReportSelect, ReportTextInput and
 * RichTextEditor all drop the `onBlur` they are handed -- so it is the only
 * field whose blur can mark anything touched, which makes it the only route to
 * a visible error message.
 */

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

import GoalsTargetsSection from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/GoalsTargetsSection/GoalsTargetsSection";

// A goal that satisfies every rule in the schema, targets included, so the
// success arm of the validator can be reached from a blur.
const validGoal = (over = {}) => ({
  id: 1,
  targetBehaviors: "Hitting",
  goalStatement: "<p>Reduce hitting</p>",
  goalDomain: "communication",
  goalDomainOther: "",
  baselineLevel: "3 per hour",
  goalTimeframe: "short-term",
  measurementMethod: "frequency",
  measurementMethodOther: "",
  targets: [
    {
      id: 2,
      targetStatement: "<p>Ask for a break</p>",
      targetType: "skill-acquisition",
      baselineLevelReference: "",
      masteryCriteria: "<p>80% over 3 days</p>",
      measurementMethod: "frequency",
      measurementMethodOther: "",
      reviewTimeframe: "weekly",
      targetStatus: "in-progress",
      discontinuationCriteria: "",
    },
  ],
  ...over,
});

const emptyTarget = (id) => ({
  id,
  targetStatement: "",
  targetType: "",
  baselineLevelReference: "",
  masteryCriteria: "",
  measurementMethod: "",
  measurementMethodOther: "",
  reviewTimeframe: "",
  targetStatus: "",
  discontinuationCriteria: "",
});

const onChange = vi.fn();
const onRemoveSection = vi.fn();

const renderSection = (props = {}) =>
  render(<GoalsTargetsSection onChange={onChange} {...props} />);

const goalCards = () => document.body.querySelectorAll(".goal-card");
const targetCards = (goalCard) => goalCard.querySelectorAll(".target-card");

// Goal-level fields and target-level fields share labels, so a goal field is
// the one that is not inside a target card.
const goalField = (goalCard, label) =>
  Array.from(goalCard.querySelectorAll(".report-builder-field")).find(
    (f) =>
      !f.closest(".target-card") &&
      f.querySelector(".report-builder-label")?.textContent.startsWith(label)
  );

const targetField = (targetCard, label) =>
  Array.from(targetCard.querySelectorAll(".report-builder-field")).find((f) =>
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

const behaviorsInput = (goalCard) =>
  goalCard.querySelector(".target-behaviors-input-wrapper input");

// The rich text editors are contenteditable divs, so an edit is an innerHTML
// write followed by the input event the component listens for.
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

const lastGoals = () => onChange.mock.calls[onChange.mock.calls.length - 1][0];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the shape a fresh section starts in", () => {
  it("opens with one empty goal holding one empty target", () => {
    renderSection();
    expect(goalCards()).toHaveLength(1);
    expect(screen.getByText("Goal 1")).toBeInTheDocument();
    expect(targetCards(goalCards()[0])).toHaveLength(1);
    expect(screen.getByText("Target 1")).toBeInTheDocument();
    expect(behaviorsInput(goalCards()[0])).toHaveValue("");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders the goals it was given instead of a blank one", () => {
    renderSection({
      data: [validGoal(), validGoal({ id: 3, targetBehaviors: "Eloping", targets: [emptyTarget(4)] })],
    });
    expect(goalCards()).toHaveLength(2);
    expect(screen.getByText("Goal 2")).toBeInTheDocument();
    expect(behaviorsInput(goalCards()[1])).toHaveValue("Eloping");
  });

  it("shows the stored selections on the closed selects", () => {
    renderSection({ data: [validGoal()] });
    const card = goalCards()[0];
    expect(selectedLabel(goalField(card, "Goal domain"))).toBe("Communication");
    expect(selectedLabel(goalField(card, "Goal timeframe"))).toBe(
      "Short term (0-3 months)"
    );
    expect(selectedLabel(goalField(card, "Measurement method"))).toBe("Frequency");
    const target = targetCards(card)[0];
    expect(selectedLabel(targetField(target, "Target Type"))).toBe("Skill acquisition");
    expect(selectedLabel(targetField(target, "Target Status"))).toBe("In Progress");
  });

  it("leaves the specify fields hidden until Other is chosen", () => {
    renderSection({ data: [validGoal()] });
    expect(screen.queryByPlaceholderText("Enter other goal domain")).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Enter other measurement method")
    ).not.toBeInTheDocument();
  });

  it("shows the specify fields for goals and targets already set to Other", () => {
    renderSection({
      data: [
        validGoal({
          goalDomain: "other",
          goalDomainOther: "Sleep hygiene",
          measurementMethod: "other",
          measurementMethodOther: "Tally sheet",
          targets: [
            {
              ...validGoal().targets[0],
              measurementMethod: "other",
              measurementMethodOther: "Video review",
            },
          ],
        }),
      ],
    });
    expect(screen.getByPlaceholderText("Enter other goal domain")).toHaveValue(
      "Sleep hygiene"
    );
    const others = screen.getAllByPlaceholderText("Enter other measurement method");
    expect(others).toHaveLength(2);
    expect(others[0]).toHaveValue("Tally sheet");
    expect(others[1]).toHaveValue("Video review");
  });
});

describe("adding and removing goals", () => {
  it("adds an empty goal below the existing ones", () => {
    renderSection({ data: [validGoal()] });
    fireEvent.click(screen.getByRole("button", { name: "Add a new goal" }));
    expect(goalCards()).toHaveLength(2);
    expect(behaviorsInput(goalCards()[1])).toHaveValue("");
    expect(targetCards(goalCards()[1])).toHaveLength(1);
    expect(lastGoals()).toHaveLength(2);
  });

  it("refuses to delete the only goal there is", () => {
    renderSection({ data: [validGoal()] });
    fireEvent.click(screen.getByRole("button", { name: /Delete Goal/ }));
    expect(toast.showToast).toHaveBeenCalledWith("At least one goal is required.");
    expect(goalCards()).toHaveLength(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("deletes the goal that was asked for and renumbers the rest", () => {
    renderSection({
      data: [
        validGoal(),
        validGoal({ id: 3, targetBehaviors: "Eloping", targets: [emptyTarget(4)] }),
      ],
    });
    fireEvent.click(screen.getAllByRole("button", { name: /Delete Goal/ })[0]);
    expect(goalCards()).toHaveLength(1);
    expect(screen.getByText("Goal 1")).toBeInTheDocument();
    expect(behaviorsInput(goalCards()[0])).toHaveValue("Eloping");
    expect(lastGoals()).toHaveLength(1);
  });
});

describe("adding and removing targets", () => {
  it("adds an empty target to the goal it was asked for", () => {
    renderSection({
      data: [
        validGoal(),
        validGoal({ id: 3, targetBehaviors: "Eloping", targets: [emptyTarget(4)] }),
      ],
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Add a target" })[1]);
    expect(targetCards(goalCards()[0])).toHaveLength(1);
    expect(targetCards(goalCards()[1])).toHaveLength(2);
    expect(lastGoals()[1].targets).toHaveLength(2);
  });

  it("refuses to delete a goal's only target", () => {
    renderSection({ data: [validGoal()] });
    fireEvent.click(screen.getByRole("button", { name: /Delete Target/ }));
    expect(toast.showToast).toHaveBeenCalledWith(
      "At least one target is required per goal."
    );
    expect(targetCards(goalCards()[0])).toHaveLength(1);
  });

  it("deletes the target that was asked for and renumbers the rest", () => {
    renderSection({
      data: [validGoal({ targets: [emptyTarget(2), emptyTarget(5)] })],
    });
    const card = goalCards()[0];
    fireEvent.click(
      within(targetCards(card)[0]).getByRole("button", { name: /Delete Target/ })
    );
    expect(targetCards(goalCards()[0])).toHaveLength(1);
    expect(screen.getByText("Target 1")).toBeInTheDocument();
    expect(screen.queryByText("Target 2")).not.toBeInTheDocument();
    expect(lastGoals()[0].targets.map((t) => t.id)).toEqual([5]);
  });

  it("leaves a second goal's targets alone when one is deleted from the first", () => {
    renderSection({
      data: [
        validGoal({ targets: [emptyTarget(2), emptyTarget(5)] }),
        validGoal({ id: 3, targets: [emptyTarget(4)] }),
      ],
    });
    fireEvent.click(
      within(targetCards(goalCards()[0])[1]).getByRole("button", { name: /Delete Target/ })
    );
    expect(lastGoals()[0].targets).toHaveLength(1);
    expect(lastGoals()[1].targets).toHaveLength(1);
  });
});

describe("the Other bookkeeping on a goal", () => {
  it("reveals the specify field when the domain is set to Other", () => {
    renderSection({ data: [validGoal()] });
    chooseOption(goalField(goalCards()[0], "Goal domain"), "Other");
    expect(screen.getByPlaceholderText("Enter other goal domain")).toBeInTheDocument();
    expect(lastGoals()[0].goalDomain).toBe("other");
  });

  it("clears what was specified when the domain moves off Other", () => {
    renderSection({ data: [validGoal({ goalDomain: "other", goalDomainOther: "Sleep" })] });
    chooseOption(goalField(goalCards()[0], "Goal domain"), "Motor skills");
    expect(screen.queryByPlaceholderText("Enter other goal domain")).not.toBeInTheDocument();
    expect(lastGoals()[0]).toMatchObject({
      goalDomain: "motor-skills",
      goalDomainOther: "",
    });
  });

  it("keeps the specify field when Other is chosen again over Other", () => {
    renderSection({ data: [validGoal({ goalDomain: "other", goalDomainOther: "Sleep" })] });
    chooseOption(goalField(goalCards()[0], "Goal domain"), "Other");
    expect(screen.getByPlaceholderText("Enter other goal domain")).toHaveValue("Sleep");
    expect(lastGoals()[0].goalDomainOther).toBe("Sleep");
  });

  it("records what the specify field is filled in with", () => {
    renderSection({ data: [validGoal({ goalDomain: "other" })] });
    fireEvent.change(screen.getByPlaceholderText("Enter other goal domain"), {
      target: { value: "Sleep hygiene" },
    });
    expect(lastGoals()[0].goalDomainOther).toBe("Sleep hygiene");
  });

  it("does the same bookkeeping for the goal's measurement method", () => {
    renderSection({
      data: [validGoal({ measurementMethod: "other", measurementMethodOther: "Tally" })],
    });
    const card = goalCards()[0];
    chooseOption(goalField(card, "Measurement method"), "Duration");
    expect(lastGoals()[0]).toMatchObject({
      measurementMethod: "duration",
      measurementMethodOther: "",
    });
    chooseOption(goalField(goalCards()[0], "Measurement method"), "Other");
    expect(lastGoals()[0].measurementMethod).toBe("other");
    expect(screen.getByPlaceholderText("Enter other measurement method")).toHaveValue("");
  });

  it("touches only the goal that changed", () => {
    renderSection({
      data: [validGoal(), validGoal({ id: 3, targetBehaviors: "Eloping", targets: [emptyTarget(4)] })],
    });
    chooseOption(goalField(goalCards()[1], "Goal timeframe"), "Ongoing");
    expect(lastGoals()[0].goalTimeframe).toBe("short-term");
    expect(lastGoals()[1].goalTimeframe).toBe("ongoing");
  });
});

describe("the Other bookkeeping on a target", () => {
  it("reveals the specify field when the measurement method is set to Other", () => {
    renderSection({ data: [validGoal()] });
    const target = targetCards(goalCards()[0])[0];
    chooseOption(targetField(target, "Measurement method"), "Other");
    expect(
      screen.getByPlaceholderText("Enter other measurement method")
    ).toBeInTheDocument();
    expect(lastGoals()[0].targets[0].measurementMethod).toBe("other");
  });

  it("clears what was specified when the method moves off Other", () => {
    renderSection({
      data: [
        validGoal({
          targets: [
            {
              ...validGoal().targets[0],
              measurementMethod: "other",
              measurementMethodOther: "Video review",
            },
          ],
        }),
      ],
    });
    chooseOption(
      targetField(targetCards(goalCards()[0])[0], "Measurement method"),
      "Latency"
    );
    expect(lastGoals()[0].targets[0]).toMatchObject({
      measurementMethod: "latency",
      measurementMethodOther: "",
    });
    expect(
      screen.queryByPlaceholderText("Enter other measurement method")
    ).not.toBeInTheDocument();
  });

  it("leaves the other goals untouched while clearing a target's specify field", () => {
    renderSection({
      data: [
        validGoal({
          targets: [
            { ...validGoal().targets[0], measurementMethod: "other", measurementMethodOther: "Video" },
          ],
        }),
        validGoal({ id: 3, targetBehaviors: "Eloping", targets: [emptyTarget(4)] }),
      ],
    });
    chooseOption(
      targetField(targetCards(goalCards()[0])[0], "Measurement method"),
      "Rate"
    );
    expect(lastGoals()[1].targets[0].measurementMethod).toBe("");
  });

  it("records the rest of a target's fields as they are set", () => {
    renderSection({ data: [validGoal({ targets: [emptyTarget(2)] })] });
    const target = targetCards(goalCards()[0])[0];
    chooseOption(targetField(target, "Target Type"), "Maintenance");
    chooseOption(targetField(targetCards(goalCards()[0])[0], "Review timeframe"), "Monthly");
    chooseOption(targetField(targetCards(goalCards()[0])[0], "Target Status"), "Mastered");
    expect(lastGoals()[0].targets[0]).toMatchObject({
      targetType: "maintenance",
      reviewTimeframe: "monthly",
      targetStatus: "mastered",
    });
  });

  it("records what is typed into a target's rich text fields", () => {
    renderSection({ data: [validGoal({ targets: [emptyTarget(2)] })] });
    const target = targetCards(goalCards()[0])[0];
    typeInEditor(editor(target, "Target Statement"), "<p>Ask for help</p>");
    typeInEditor(editor(target, "Mastery Criteria"), "<p>90%</p>");
    typeInEditor(editor(target, "Baseline level reference"), "<p>None yet</p>");
    typeInEditor(
      editor(target, "Discontinuation / Modification Criteria"),
      "<p>After 4 weeks</p>"
    );
    expect(lastGoals()[0].targets[0]).toMatchObject({
      targetStatement: "<p>Ask for help</p>",
      masteryCriteria: "<p>90%</p>",
      baselineLevelReference: "<p>None yet</p>",
      discontinuationCriteria: "<p>After 4 weeks</p>",
    });
  });
});

describe("the goal's own plain fields", () => {
  it("records the behaviours, the statement and the baseline", () => {
    renderSection({ data: [validGoal({ targetBehaviors: "", baselineLevel: "" })] });
    const card = goalCards()[0];
    fireEvent.change(behaviorsInput(card), { target: { value: "Hitting, biting" } });
    expect(lastGoals()[0].targetBehaviors).toBe("Hitting, biting");
    typeInEditor(editor(card, "Goal Statement"), "<p>Reduce to zero</p>");
    expect(lastGoals()[0].goalStatement).toBe("<p>Reduce to zero</p>");
    // Both this and the behaviours box use the same placeholder, so the
    // baseline input is reached through its own labelled field.
    fireEvent.change(goalField(card, "Baseline level").querySelector("input"), {
      target: { value: "5 per day" },
    });
    expect(lastGoals()[0].baselineLevel).toBe("5 per day");
  });
});

describe("validation on the one field that can be blurred", () => {
  it("complains about an empty Target Behavior(s) once it has been left", async () => {
    renderSection();
    fireEvent.blur(behaviorsInput(goalCards()[0]));
    expect(
      await screen.findByText("Target Behavior(s) is required")
    ).toBeInTheDocument();
  });

  it("keeps quiet about the fields that were never blurred", async () => {
    renderSection();
    fireEvent.blur(behaviorsInput(goalCards()[0]));
    await screen.findByText("Target Behavior(s) is required");
    // The whole goal is validated, but only a touched field shows its error.
    expect(screen.queryByText("Goal domain is required")).not.toBeInTheDocument();
    expect(screen.queryByText("Goal statement is required")).not.toBeInTheDocument();
  });

  // The three rich text editors report the same way every other control does:
  // leaving one marks it touched and lets its message through.
  it("reports the goal statement once the editor is left", async () => {
    renderSection();
    fireEvent.blur(editor(goalCards()[0], "Goal Statement"));
    expect(
      await screen.findByText("Goal statement is required")
    ).toBeInTheDocument();
  });

  it("reports a target's statement and mastery criteria once each is left", async () => {
    renderSection();
    const target = goalCards()[0].querySelector(".target-card");

    fireEvent.blur(editor(target, "Target Statement"));
    expect(
      await screen.findByText("Target statement is required")
    ).toBeInTheDocument();

    fireEvent.blur(editor(target, "Mastery Criteria"));
    expect(
      await screen.findByText("Mastery criteria is required")
    ).toBeInTheDocument();
  });

  it("says nothing when the editor it left was already filled", async () => {
    renderSection({ data: [validGoal()] });
    fireEvent.blur(editor(goalCards()[0], "Goal Statement"));
    await waitFor(() =>
      expect(screen.queryByText("Goal statement is required")).not.toBeInTheDocument()
    );
  });

  it("leaves the complaint up after the field is filled, while the goal is still short elsewhere", async () => {
    renderSection();
    const input = behaviorsInput(goalCards()[0]);
    fireEvent.blur(input);
    await screen.findByText("Target Behavior(s) is required");
    fireEvent.change(input, { target: { value: "Hitting" } });
    // Documented rather than desired: a failed re-validation merges the new
    // errors over the old ones and never drops the keys that now pass, so the
    // message for a corrected field survives until the whole goal validates.
    await waitFor(() => expect(lastGoals()[0].targetBehaviors).toBe("Hitting"));
    expect(screen.getByText("Target Behavior(s) is required")).toBeInTheDocument();
  });

  it("clears every message on a goal that validates completely", async () => {
    renderSection({ data: [validGoal({ targetBehaviors: "" })] });
    const input = behaviorsInput(goalCards()[0]);
    fireEvent.blur(input);
    await screen.findByText("Target Behavior(s) is required");
    fireEvent.change(input, { target: { value: "Hitting" } });
    await waitFor(() =>
      expect(document.body.querySelector(".report-builder-error")).not.toBeInTheDocument()
    );
  });

  it("complains only about the goal that was blurred", async () => {
    renderSection({
      data: [
        validGoal({ id: 1, targetBehaviors: "", targets: [emptyTarget(2)] }),
        validGoal({ id: 3, targetBehaviors: "", targets: [emptyTarget(4)] }),
      ],
    });
    fireEvent.blur(behaviorsInput(goalCards()[1]));
    await waitFor(() =>
      expect(document.body.querySelectorAll(".report-builder-error")).toHaveLength(1)
    );
    expect(
      within(goalCards()[1]).getByText("Target Behavior(s) is required")
    ).toBeInTheDocument();
  });
});

describe("a read-only section", () => {
  it("hides every button that would change the section", () => {
    renderSection({ data: [validGoal()], isReadOnly: true, onRemoveSection });
    expect(screen.queryByRole("button", { name: /Delete Goal/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete Target/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add a target" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add a new goal" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Section" })).not.toBeInTheDocument();
  });

  it("still shows the stored content", () => {
    renderSection({ data: [validGoal()], isReadOnly: true });
    expect(behaviorsInput(goalCards()[0])).toHaveValue("Hitting");
    expect(behaviorsInput(goalCards()[0])).toHaveAttribute("readonly");
  });
});

describe("removing the whole section", () => {
  it("offers the button only when the parent gave it something to call", () => {
    renderSection({ data: [validGoal()] });
    expect(screen.queryByRole("button", { name: "Remove Section" })).not.toBeInTheDocument();
  });

  it("hands the removal back to the parent", () => {
    renderSection({ data: [validGoal()], onRemoveSection });
    fireEvent.click(screen.getByRole("button", { name: "Remove Section" }));
    expect(onRemoveSection).toHaveBeenCalled();
  });
});
