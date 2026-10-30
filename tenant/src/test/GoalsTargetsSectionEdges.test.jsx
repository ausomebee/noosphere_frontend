import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/**
 * The arms of the Goals & Targets section that only appear once there is more
 * than one of something: a second goal beside the one being edited, or a second
 * target inside the same goal.
 *
 * Every write the section makes rebuilds the whole goal list, so each of the
 * four handlers carries a "leave this one alone" branch for the goals and the
 * targets it is not addressing. Those branches are invisible with a single goal
 * holding a single target, which is how the main suite is arranged; this file
 * is the second half, plus the remaining routes through the single-select
 * "Other" bookkeeping.
 *
 * The inputs are the real ones, for the same reason the main suite uses them:
 * the section's own logic is the wiring between them. Only the toast is a spy.
 * The section seeds its goals from `data` exactly once, so every fixture is
 * passed at render time.
 */

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

import GoalsTargetsSection from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/GoalsTargetsSection/GoalsTargetsSection";

const target = (id, over = {}) => ({
  id,
  targetStatement: "<p>Ask for a break</p>",
  targetType: "skill-acquisition",
  baselineLevelReference: "",
  masteryCriteria: "<p>80% over 3 days</p>",
  measurementMethod: "frequency",
  measurementMethodOther: "",
  reviewTimeframe: "weekly",
  targetStatus: "in-progress",
  discontinuationCriteria: "",
  ...over,
});

const goal = (id, over = {}) => ({
  id,
  targetBehaviors: "Hitting",
  goalStatement: "<p>Reduce hitting</p>",
  goalDomain: "communication",
  goalDomainOther: "",
  baselineLevel: "3 per hour",
  goalTimeframe: "short-term",
  measurementMethod: "frequency",
  measurementMethodOther: "",
  targets: [target(id * 10)],
  ...over,
});

const onChange = vi.fn();

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

// A select counts as left only when its list shuts, so opening it and clicking
// the overlay away is how a select gets marked touched without a choice.
const leaveSelect = (fieldEl) => {
  fireEvent.click(fieldEl.querySelector(".report-builder-select-button"));
  fireEvent.click(fieldEl.querySelector(".report-builder-select-overlay"));
};

const leaveInput = (fieldEl) => fireEvent.blur(fieldEl.querySelector("input"));

// The error block is a sibling of the control rather than a child of it, so it
// is collected off the whole card. A goal's own errors are the ones that are
// not sitting inside one of its target cards.
const goalErrors = (goalCard) =>
  Array.from(goalCard.querySelectorAll(".report-builder-error"))
    .filter((e) => !e.closest(".target-card"))
    .map((e) => e.textContent);

const targetErrors = (targetCard) =>
  Array.from(targetCard.querySelectorAll(".report-builder-error")).map(
    (e) => e.textContent
  );

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

const behaviorsInput = (goalCard) =>
  goalCard.querySelector(".target-behaviors-input-wrapper input");

const lastGoals = () => onChange.mock.calls[onChange.mock.calls.length - 1][0];

/** Two goals, the second holding two targets. */
const twoGoals = () => [
  goal(1),
  goal(3, {
    targetBehaviors: "Eloping",
    targets: [target(30), target(31, { targetStatus: "not-introduced" })],
  }),
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("editing one target among several", () => {
  it("leaves the first goal alone when the second goal's target changes", () => {
    renderSection({ data: twoGoals() });
    chooseOption(
      targetField(targetCards(goalCards()[1])[0], "Target Status"),
      "Mastered"
    );
    expect(lastGoals()[0].targets[0].targetStatus).toBe("in-progress");
    expect(lastGoals()[1].targets[0].targetStatus).toBe("mastered");
  });

  it("leaves the sibling target alone within the same goal", () => {
    renderSection({ data: twoGoals() });
    chooseOption(
      targetField(targetCards(goalCards()[1])[1], "Review timeframe"),
      "Quarterly"
    );
    expect(lastGoals()[1].targets[0].reviewTimeframe).toBe("weekly");
    expect(lastGoals()[1].targets[1].reviewTimeframe).toBe("quarterly");
  });

  it("leaves the sibling target alone when a rich text field is written in", () => {
    renderSection({ data: twoGoals() });
    typeInEditor(
      editor(targetCards(goalCards()[1])[1], "Mastery Criteria"),
      "<p>Three consecutive sessions</p>"
    );
    expect(lastGoals()[1].targets[0].masteryCriteria).toBe("<p>80% over 3 days</p>");
    expect(lastGoals()[1].targets[1].masteryCriteria).toBe(
      "<p>Three consecutive sessions</p>"
    );
  });

  it("clears only the edited target's specify field when it moves off Other", () => {
    renderSection({
      data: [
        goal(1),
        goal(3, {
          targets: [
            target(30, { measurementMethod: "other", measurementMethodOther: "Video" }),
            target(31, { measurementMethod: "other", measurementMethodOther: "Tally" }),
          ],
        }),
      ],
    });
    chooseOption(
      targetField(targetCards(goalCards()[1])[0], "Measurement method"),
      "Duration"
    );
    expect(lastGoals()[1].targets[0]).toMatchObject({
      measurementMethod: "duration",
      measurementMethodOther: "",
    });
    // The sibling keeps both its method and the text that belongs to it.
    expect(lastGoals()[1].targets[1]).toMatchObject({
      measurementMethod: "other",
      measurementMethodOther: "Tally",
    });
    expect(lastGoals()[0].targets[0].measurementMethod).toBe("frequency");
  });

  it("shows a specify box only beside the target that asked for one", () => {
    renderSection({
      data: [
        goal(1, {
          targets: [
            target(10, { measurementMethod: "other", measurementMethodOther: "Video" }),
            target(11),
          ],
        }),
      ],
    });
    const targets = targetCards(goalCards()[0]);
    expect(
      targetField(targets[0], "Please specify").querySelector("input")
    ).toHaveValue("Video");
    expect(targetField(targets[1], "Please specify")).toBeUndefined();
  });

  it("records what a target's specify box is filled in with", () => {
    renderSection({
      data: [
        goal(1, {
          targets: [target(10, { measurementMethod: "other" }), target(11)],
        }),
      ],
    });
    fireEvent.change(
      targetField(targetCards(goalCards()[0])[0], "Please specify").querySelector(
        "input"
      ),
      { target: { value: "Video review" } }
    );
    expect(lastGoals()[0].targets[0].measurementMethodOther).toBe("Video review");
    expect(lastGoals()[0].targets[1].measurementMethodOther).toBe("");
  });

  it("moves a target between two ordinary methods without touching the specify field", () => {
    renderSection({ data: [goal(1)] });
    chooseOption(
      targetField(targetCards(goalCards()[0])[0], "Measurement method"),
      "Task Analysis"
    );
    expect(lastGoals()[0].targets[0].measurementMethod).toBe("task-analysis");
    expect(
      screen.queryByPlaceholderText("Enter other measurement method")
    ).not.toBeInTheDocument();
  });
});

describe("adding and removing targets across several goals", () => {
  it("adds the new target to the goal that asked, and no other", () => {
    renderSection({ data: twoGoals() });
    fireEvent.click(screen.getAllByRole("button", { name: "Add a target" })[1]);
    expect(targetCards(goalCards()[0])).toHaveLength(1);
    expect(targetCards(goalCards()[1])).toHaveLength(3);
    expect(lastGoals()[0].targets).toHaveLength(1);
    expect(lastGoals()[1].targets[2]).toMatchObject({
      targetStatement: "",
      targetType: "",
      measurementMethod: "",
      targetStatus: "",
    });
  });

  it("refuses to delete a lone target even when another goal has spares", () => {
    renderSection({ data: twoGoals() });
    fireEvent.click(
      targetCards(goalCards()[0])[0].querySelector(".target-delete-btn")
    );
    expect(toast.showToast).toHaveBeenCalledWith(
      "At least one target is required per goal."
    );
    expect(targetCards(goalCards()[0])).toHaveLength(1);
    expect(lastGoals()[1].targets).toHaveLength(2);
  });

  it("deletes the second target of the second goal and renumbers what is left", () => {
    renderSection({ data: twoGoals() });
    fireEvent.click(
      targetCards(goalCards()[1])[1].querySelector(".target-delete-btn")
    );
    expect(targetCards(goalCards()[1])).toHaveLength(1);
    expect(lastGoals()[1].targets).toHaveLength(1);
    expect(lastGoals()[1].targets[0].targetStatus).toBe("in-progress");
    expect(lastGoals()[0].targets).toHaveLength(1);
  });
});

describe("the goal's single selects moving between ordinary options", () => {
  it("moves the domain between two ordinary options", () => {
    renderSection({ data: [goal(1)] });
    chooseOption(goalField(goalCards()[0], "Goal domain"), "Safety skills");
    expect(lastGoals()[0]).toMatchObject({
      goalDomain: "safety-skills",
      goalDomainOther: "",
    });
    expect(
      screen.queryByPlaceholderText("Enter other goal domain")
    ).not.toBeInTheDocument();
  });

  it("moves the measurement method between two ordinary options", () => {
    renderSection({ data: [goal(1)] });
    chooseOption(goalField(goalCards()[0], "Measurement method"), "Latency");
    expect(lastGoals()[0].measurementMethod).toBe("latency");
    expect(
      screen.queryByPlaceholderText("Enter other measurement method")
    ).not.toBeInTheDocument();
  });

  it("records the goal's own specify box for the measurement method", () => {
    renderSection({ data: [goal(1, { measurementMethod: "other" })] });
    fireEvent.change(
      screen.getByPlaceholderText("Enter other measurement method"),
      { target: { value: "Tally sheet" } }
    );
    expect(lastGoals()[0].measurementMethodOther).toBe("Tally sheet");
  });

  it("clears the domain's specify box on the second goal only", () => {
    renderSection({
      data: [
        goal(1, { goalDomain: "other", goalDomainOther: "Sleep" }),
        goal(3, { goalDomain: "other", goalDomainOther: "Feeding" }),
      ],
    });
    chooseOption(goalField(goalCards()[1], "Goal domain"), "Play and leisure");
    expect(lastGoals()[0]).toMatchObject({
      goalDomain: "other",
      goalDomainOther: "Sleep",
    });
    expect(lastGoals()[1]).toMatchObject({
      goalDomain: "play-leisure",
      goalDomainOther: "",
    });
  });
});

describe("validating a goal that carries several targets", () => {
  it("counts an incomplete target against the goal it belongs to", async () => {
    renderSection({
      data: [
        goal(1, {
          targetBehaviors: "",
          targets: [target(10), target(11, { targetStatement: "" })],
        }),
      ],
    });
    fireEvent.blur(behaviorsInput(goalCards()[0]));
    expect(
      await screen.findByText("Target Behavior(s) is required")
    ).toBeInTheDocument();
    // Filling the behaviours in is not enough: the second target is still
    // short, so the goal never validates and the message stays up.
    fireEvent.change(behaviorsInput(goalCards()[0]), {
      target: { value: "Hitting" },
    });
    await waitFor(() => expect(lastGoals()[0].targetBehaviors).toBe("Hitting"));
    expect(screen.getByText("Target Behavior(s) is required")).toBeInTheDocument();
  });

  it("clears the message once every target is complete too", async () => {
    renderSection({
      data: [goal(1, { targetBehaviors: "", targets: [target(10), target(11)] })],
    });
    fireEvent.blur(behaviorsInput(goalCards()[0]));
    await screen.findByText("Target Behavior(s) is required");
    fireEvent.change(behaviorsInput(goalCards()[0]), {
      target: { value: "Hitting" },
    });
    await waitFor(() =>
      expect(
        document.body.querySelector(".report-builder-error")
      ).not.toBeInTheDocument()
    );
  });
});

describe("the messages a goal's own fields put up when left empty", () => {
  // Each fixture is a complete goal with one field emptied, so the message that
  // appears is unambiguously the one belonging to the field that was left.
  it.each([
    ["Goal domain", { goalDomain: "" }, "Goal domain is required"],
    ["Goal timeframe", { goalTimeframe: "" }, "Goal timeframe is required"],
    [
      "Measurement method",
      { measurementMethod: "" },
      "Measurement method is required",
    ],
  ])("complains about %s once its list has been opened and shut", async (
    label,
    over,
    message
  ) => {
    renderSection({ data: [goal(1, over)] });
    leaveSelect(goalField(goalCards()[0], label));
    await waitFor(() => expect(goalErrors(goalCards()[0])).toEqual([message]));
  });

  it("asks for the domain to be spelled out when Other is left blank", async () => {
    renderSection({ data: [goal(1, { goalDomain: "other", goalDomainOther: "" })] });
    leaveInput(goalField(goalCards()[0], "Please specify"));
    await waitFor(() =>
      expect(goalErrors(goalCards()[0])).toEqual([
        "Please specify the goal domain",
      ])
    );
  });

  it("asks for the measurement method to be spelled out when Other is left blank", async () => {
    renderSection({
      data: [goal(1, { measurementMethod: "other", measurementMethodOther: "" })],
    });
    leaveInput(goalField(goalCards()[0], "Please specify"));
    await waitFor(() =>
      expect(goalErrors(goalCards()[0])).toEqual([
        "Please specify the measurement method",
      ])
    );
  });

  it("puts the message on the goal that was left, not its neighbour", async () => {
    renderSection({ data: [goal(1, { goalTimeframe: "" }), goal(3, { goalTimeframe: "" })] });
    leaveSelect(goalField(goalCards()[1], "Goal timeframe"));
    await waitFor(() =>
      expect(goalErrors(goalCards()[1])).toEqual(["Goal timeframe is required"])
    );
    expect(goalErrors(goalCards()[0])).toEqual([]);
  });
});

describe("the messages a target's fields put up when left empty", () => {
  const onlyTarget = (over) =>
    renderSection({ data: [goal(1, { targets: [target(10, over)] })] });

  const card = () => targetCards(goalCards()[0])[0];

  it.each([
    ["Target Type", { targetType: "" }, "Target type is required"],
    [
      "Measurement method",
      { measurementMethod: "" },
      "Measurement method is required",
    ],
    [
      "Review timeframe",
      { reviewTimeframe: "" },
      "Review timeframe is required",
    ],
    ["Target Status", { targetStatus: "" }, "Target status is required"],
  ])("complains about %s once its list has been opened and shut", async (
    label,
    over,
    message
  ) => {
    onlyTarget(over);
    leaveSelect(targetField(card(), label));
    await waitFor(() => expect(targetErrors(card())).toEqual([message]));
  });

  it("asks for the measurement method to be spelled out, then clears once it is", async () => {
    onlyTarget({ measurementMethod: "other", measurementMethodOther: "" });
    const specify = () => targetField(card(), "Please specify").querySelector("input");
    leaveInput(targetField(card(), "Please specify"));
    await waitFor(() =>
      expect(targetErrors(card())).toEqual([
        "Please specify the measurement method",
      ])
    );

    // A touched field is re-checked on every keystroke, so typing is enough to
    // take the message back down again.
    fireEvent.change(specify(), { target: { value: "Video review" } });
    await waitFor(() => expect(targetErrors(card())).toEqual([]));
    expect(lastGoals()[0].targets[0].measurementMethodOther).toBe("Video review");
  });

  it("keeps the message up while the target is still short elsewhere", async () => {
    onlyTarget({ measurementMethod: "other", measurementMethodOther: "", masteryCriteria: "" });
    leaveInput(targetField(card(), "Please specify"));
    await waitFor(() =>
      expect(targetErrors(card())).toEqual([
        "Please specify the measurement method",
      ])
    );

    // Mastery criteria is required too, so the target still fails validation —
    // but it has no blur of its own, so only the specify message is on screen.
    fireEvent.change(
      targetField(card(), "Please specify").querySelector("input"),
      { target: { value: "Video review" } }
    );
    await waitFor(() =>
      expect(lastGoals()[0].targets[0].measurementMethodOther).toBe("Video review")
    );
    expect(targetErrors(card())).toEqual([
      "Please specify the measurement method",
    ]);
  });

  it("leaves the old message up when a touched select is answered, until it is left again", async () => {
    onlyTarget({ targetType: "" });
    leaveSelect(targetField(card(), "Target Type"));
    await waitFor(() => expect(targetErrors(card())).toEqual(["Target type is required"]));

    // Choosing an option shuts the list, which counts as leaving the field —
    // and `handleBlur` re-checks the goals captured in the current render, so
    // it re-raises the message the change had just cleared.
    chooseOption(targetField(card(), "Target Type"), "Maintenance");
    await waitFor(() =>
      expect(lastGoals()[0].targets[0].targetType).toBe("maintenance")
    );
    expect(targetErrors(card())).toEqual(["Target type is required"]);

    // Leaving it a second time re-checks against the value that is now stored.
    leaveSelect(targetField(card(), "Target Type"));
    await waitFor(() => expect(targetErrors(card())).toEqual([]));
  });

  it("puts the message on the target that was left, not its sibling", async () => {
    renderSection({
      data: [
        goal(1, {
          targets: [target(10, { targetStatus: "" }), target(11, { targetStatus: "" })],
        }),
      ],
    });
    const cards = targetCards(goalCards()[0]);
    leaveSelect(targetField(cards[1], "Target Status"));
    await waitFor(() =>
      expect(targetErrors(cards[1])).toEqual(["Target status is required"])
    );
    expect(targetErrors(cards[0])).toEqual([]);
  });
});

describe("a read-only goals section", () => {
  it("locks every select and text field it renders", () => {
    renderSection({ data: twoGoals(), isReadOnly: true });
    const buttons = document.body.querySelectorAll(".report-builder-select-button");
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((b) => expect(b).toBeDisabled());
    document.body
      .querySelectorAll(".report-builder-input")
      .forEach((i) => expect(i).toHaveAttribute("readonly"));
  });

  it("cannot be made to put a message up, because nothing can be left", () => {
    renderSection({ data: [goal(1, { goalTimeframe: "" })], isReadOnly: true });
    const button = goalField(goalCards()[0], "Goal timeframe").querySelector(
      ".report-builder-select-button"
    );
    fireEvent.click(button);
    // A disabled button never opens, so the list never shuts and the field is
    // never marked touched.
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(goalErrors(goalCards()[0])).toEqual([]);
  });
});

describe("clearing messages without disturbing the neighbours", () => {
  it("keeps another goal's message when this goal comes back clean", async () => {
    renderSection({ data: [goal(1, { goalTimeframe: "" }), goal(3)] });
    leaveSelect(goalField(goalCards()[0], "Goal timeframe"));
    await waitFor(() =>
      expect(goalErrors(goalCards()[0])).toEqual(["Goal timeframe is required"])
    );

    // The second goal is complete, so leaving one of its fields clears its own
    // messages — and only its own.
    leaveSelect(goalField(goalCards()[1], "Goal domain"));
    await waitFor(() => expect(goalErrors(goalCards()[1])).toEqual([]));
    expect(goalErrors(goalCards()[0])).toEqual(["Goal timeframe is required"]);
  });

  it("keeps a sibling target's message when this target comes back clean", async () => {
    renderSection({
      data: [goal(1, { targets: [target(10, { targetStatus: "" }), target(11)] })],
    });
    const cards = () => targetCards(goalCards()[0]);
    leaveSelect(targetField(cards()[0], "Target Status"));
    await waitFor(() =>
      expect(targetErrors(cards()[0])).toEqual(["Target status is required"])
    );

    leaveSelect(targetField(cards()[1], "Target Status"));
    await waitFor(() => expect(targetErrors(cards()[1])).toEqual([]));
    expect(targetErrors(cards()[0])).toEqual(["Target status is required"]);
  });
});
