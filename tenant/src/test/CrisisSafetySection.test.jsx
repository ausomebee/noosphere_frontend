import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

/**
 * The Crisis & Safety Plan section of the clinical report builder: a stack of
 * crisis plan cards, each with three multi-selects where "Other" is exclusive
 * of everything else, four single selects, and a physical-intervention
 * description that is hidden only while the answer is a flat "No".
 *
 * The real inputs are used rather than probes: the section's own logic IS the
 * bookkeeping between them, so there would be nothing left to test otherwise.
 * Only the toast is a spy.
 *
 * The section seeds its plans from `data` exactly once, so every fixture is
 * passed at render time rather than by re-rendering with new props. A field is
 * marked touched when it is left, and only a touched field shows its message;
 * for the selects "left" means the list shutting, not a native blur, so a
 * message is provoked by opening a list and clicking the overlay away.
 */

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

import CrisisSafetySection from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/CrisisSafetySection/CrisisSafetySection";

const plan = (over = {}) => ({
  id: 1,
  crisisType: ["elopement-wandering"],
  crisisTypeOther: "",
  descriptionOfCrisisBehavior: "<p>Leaves the room</p>",
  earlyWarningSigns: "",
  knownTriggers: "",
  riskLevel: "high",
  riskLevelDescription: "Traffic nearby",
  crisisActivationCriteria: "",
  immediateResponseProcedures: "",
  deescalationTechniques: ["visual-supports"],
  deescalationTechniquesOther: "",
  physicalInterventionPermitted: "no",
  physicalInterventionDescription: "",
  staffAuthorizedToIntervene: ["bcba"],
  staffAuthorizedOther: "",
  environmentalSafetyActions: "",
  emergencyServicesInvolvement: "not-required",
  emergencyContactInstructions: "",
  postCrisisProcedure: "",
  incidentDocumentationRequired: "yes",
  reviewSchedule: "monthly",
  additionalNotes: "",
  ...over,
});

const onChange = vi.fn();
const onRemoveSection = vi.fn();

const renderSection = (props = {}) =>
  render(<CrisisSafetySection onChange={onChange} {...props} />);

const cards = () => document.body.querySelectorAll(".crisis-plan-card");

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

// Both dropdowns treat their list shutting as leaving the field, so this is
// what marks a select touched without answering it.
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

const lastPlans = () => onChange.mock.calls[onChange.mock.calls.length - 1][0];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the shape a fresh section starts in", () => {
  it("opens with one empty crisis plan", () => {
    renderSection();
    expect(cards()).toHaveLength(1);
    expect(screen.getByText("Crisis Plan 1")).toBeInTheDocument();
    expect(selectedLabel(field(cards()[0], "Crisis Type"))).toBe("Select an option");
    expect(selectedLabel(field(cards()[0], "Risk level"))).toBe("Select an option");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders the plans it was given instead of a blank one", () => {
    renderSection({ data: [plan(), plan({ id: 2, riskLevel: "low" })] });
    expect(cards()).toHaveLength(2);
    expect(screen.getByText("Crisis Plan 2")).toBeInTheDocument();
    expect(selectedLabel(field(cards()[1], "Risk level"))).toBe("Low");
  });

  it("shows the stored selections on the closed controls", () => {
    renderSection({ data: [plan()] });
    const card = cards()[0];
    expect(selectedLabel(field(card, "Crisis Type"))).toBe("Elopement/wandering");
    expect(selectedLabel(field(card, "De-escalation techniques"))).toBe("Visual supports");
    expect(selectedLabel(field(card, "Staff authorized to intervene"))).toBe("BCBA");
    expect(selectedLabel(field(card, "Physical intervention permitted"))).toBe("No");
    expect(selectedLabel(field(card, "Emergency services involvement"))).toBe("Not required");
    expect(selectedLabel(field(card, "Incident documentation required"))).toBe("Yes");
    expect(selectedLabel(field(card, "Review schedule"))).toBe("Monthly");
    expect(field(card, "Risk level description").querySelector("input")).toHaveValue(
      "Traffic nearby"
    );
    expect(editor(card, "Description of crisis behavior")).toHaveTextContent(
      "Leaves the room"
    );
  });

  it("shows every specify box a stored plan has earned", () => {
    renderSection({
      data: [
        plan({
          crisisType: ["other"],
          crisisTypeOther: "Refusing medication",
          deescalationTechniques: ["other"],
          deescalationTechniquesOther: "Weighted blanket",
          staffAuthorizedToIntervene: ["other"],
          staffAuthorizedOther: "On-call nurse",
        }),
      ],
    });
    expect(screen.getByPlaceholderText("Enter other crisis type")).toHaveValue(
      "Refusing medication"
    );
    expect(
      screen.getByPlaceholderText("Enter other de-escalation technique")
    ).toHaveValue("Weighted blanket");
    expect(screen.getByPlaceholderText("Enter other authorized staff")).toHaveValue(
      "On-call nurse"
    );
  });
});

describe("adding and removing crisis plans", () => {
  it("adds an empty plan below the existing ones", () => {
    renderSection({ data: [plan()] });
    fireEvent.click(screen.getByRole("button", { name: "Add a new Crisis Plan" }));
    expect(cards()).toHaveLength(2);
    expect(lastPlans()[1]).toMatchObject({
      crisisType: [],
      riskLevel: "",
      staffAuthorizedToIntervene: [],
    });
  });

  it("refuses to delete the only plan there is", () => {
    renderSection({ data: [plan()] });
    fireEvent.click(screen.getByRole("button", { name: /Delete Crisis Plan/ }));
    expect(toast.showToast).toHaveBeenCalledWith("At least one crisis plan is required.");
    expect(cards()).toHaveLength(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("deletes the plan that was asked for and renumbers the rest", () => {
    renderSection({ data: [plan(), plan({ id: 2, riskLevel: "low" })] });
    fireEvent.click(screen.getAllByRole("button", { name: /Delete Crisis Plan/ })[0]);
    expect(cards()).toHaveLength(1);
    expect(screen.getByText("Crisis Plan 1")).toBeInTheDocument();
    expect(lastPlans()).toHaveLength(1);
    expect(lastPlans()[0].riskLevel).toBe("low");
  });
});

describe("the multi-selects where Other stands alone", () => {
  it.each([
    ["Crisis Type", "crisisType", "Property destruction", "property-destruction", "Enter other crisis type"],
    ["De-escalation techniques", "deescalationTechniques", "Planned ignoring", "planned-ignoring", "Enter other de-escalation technique"],
    ["Staff authorized to intervene", "staffAuthorizedToIntervene", "RBT", "rbt", "Enter other authorized staff"],
  ])(
    "drops everything else when Other is chosen for %s",
    (label, key, optionLabel, optionValue, placeholder) => {
      renderSection({ data: [plan()] });
      const target = field(cards()[0], label);
      openMulti(target);
      toggleMulti(target, optionLabel);
      expect(lastPlans()[0][key]).toHaveLength(2);
      toggleMulti(field(cards()[0], label), "Other");
      expect(lastPlans()[0][key]).toEqual(["other"]);
      expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument();
      // And adding a real option beside "Other" drops "Other" again.
      toggleMulti(field(cards()[0], label), optionLabel);
      expect(lastPlans()[0][key]).toEqual([optionValue]);
      expect(screen.queryByPlaceholderText(placeholder)).not.toBeInTheDocument();
    }
  );

  it("empties the field when Other is unticked on its own", () => {
    renderSection({ data: [plan({ crisisType: ["other"] })] });
    const crisisType = field(cards()[0], "Crisis Type");
    openMulti(crisisType);
    toggleMulti(crisisType, "Other");
    expect(lastPlans()[0].crisisType).toEqual([]);
  });

  it("records what the specify boxes are filled in with", () => {
    renderSection({
      data: [
        plan({
          crisisType: ["other"],
          deescalationTechniques: ["other"],
          staffAuthorizedToIntervene: ["other"],
        }),
      ],
    });
    fireEvent.change(screen.getByPlaceholderText("Enter other crisis type"), {
      target: { value: "Refusing medication" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter other de-escalation technique"), {
      target: { value: "Weighted blanket" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter other authorized staff"), {
      target: { value: "On-call nurse" },
    });
    expect(lastPlans()[0]).toMatchObject({
      crisisTypeOther: "Refusing medication",
      deescalationTechniquesOther: "Weighted blanket",
      staffAuthorizedOther: "On-call nurse",
    });
  });

  it("touches only the plan that changed", () => {
    renderSection({ data: [plan(), plan({ id: 2 })] });
    const crisisType = field(cards()[1], "Crisis Type");
    openMulti(crisisType);
    toggleMulti(crisisType, "Property destruction");
    expect(lastPlans()[0].crisisType).toEqual(["elopement-wandering"]);
    expect(lastPlans()[1].crisisType).toEqual([
      "elopement-wandering",
      "property-destruction",
    ]);
  });
});

describe("the physical intervention description", () => {
  it("stays hidden while no physical intervention is permitted", () => {
    renderSection({ data: [plan()] });
    expect(
      within(cards()[0]).queryByText("Physical intervention description")
    ).not.toBeInTheDocument();
  });

  it("appears as soon as any intervention is permitted", () => {
    renderSection({ data: [plan()] });
    chooseOption(field(cards()[0], "Physical intervention permitted"), "Yes (non-restrictive only)");
    expect(lastPlans()[0].physicalInterventionPermitted).toBe("yes-non-restrictive");
    expect(
      within(cards()[0]).getByText("Physical intervention description")
    ).toBeInTheDocument();
  });

  it("shows on an unanswered plan, since only a flat No hides it", () => {
    renderSection({ data: [plan({ physicalInterventionPermitted: "" })] });
    expect(
      within(cards()[0]).getByText("Physical intervention description")
    ).toBeInTheDocument();
  });

  it("records what is written in it, then hides it again on a No", () => {
    renderSection({ data: [plan({ physicalInterventionPermitted: "yes-restrictive-approved" })] });
    typeInEditor(
      editor(cards()[0], "Physical intervention description"),
      "<p>Two-person escort</p>"
    );
    expect(lastPlans()[0].physicalInterventionDescription).toBe("<p>Two-person escort</p>");
    chooseOption(field(cards()[0], "Physical intervention permitted"), "No");
    expect(
      within(cards()[0]).queryByText("Physical intervention description")
    ).not.toBeInTheDocument();
    // The text itself is kept, so switching back does not lose the answer.
    expect(lastPlans()[0].physicalInterventionDescription).toBe("<p>Two-person escort</p>");
  });
});

describe("the rest of a plan's fields", () => {
  it("records every single select", () => {
    renderSection({ data: [plan()] });
    chooseOption(field(cards()[0], "Risk level"), "Severe");
    chooseOption(field(cards()[0], "Emergency services involvement"), "As clinically indicated");
    chooseOption(field(cards()[0], "Incident documentation required"), "No");
    chooseOption(field(cards()[0], "Review schedule"), "After each incident");
    expect(lastPlans()[0]).toMatchObject({
      riskLevel: "severe",
      emergencyServicesInvolvement: "clinically-indicated",
      incidentDocumentationRequired: "no",
      reviewSchedule: "after-each-incident",
    });
  });

  it("records the risk level description", () => {
    renderSection({ data: [plan({ riskLevelDescription: "" })] });
    fireEvent.change(
      field(cards()[0], "Risk level description").querySelector("input"),
      { target: { value: "Traffic nearby" } }
    );
    expect(lastPlans()[0].riskLevelDescription).toBe("Traffic nearby");
  });

  it("records what is typed into each rich text field", () => {
    renderSection({ data: [plan({ descriptionOfCrisisBehavior: "" })] });
    const card = cards()[0];
    typeInEditor(editor(card, "Description of crisis behavior"), "<p>Leaves the room</p>");
    typeInEditor(editor(card, "Early warning signs"), "<p>Pacing</p>");
    typeInEditor(editor(card, "Known triggers"), "<p>Loud noise</p>");
    typeInEditor(editor(card, "Crisis activation criteria"), "<p>Leaves the building</p>");
    typeInEditor(editor(card, "Immediate response procedures"), "<p>Follow at distance</p>");
    typeInEditor(editor(card, "Environmental Safety actions"), "<p>Lock the gate</p>");
    typeInEditor(editor(card, "Emergency contact instructions"), "<p>Call the parent</p>");
    typeInEditor(editor(card, "Post crisis procedure"), "<p>Debrief</p>");
    typeInEditor(editor(card, "Additional notes"), "<p>Review in June</p>");
    expect(lastPlans()[0]).toMatchObject({
      descriptionOfCrisisBehavior: "<p>Leaves the room</p>",
      earlyWarningSigns: "<p>Pacing</p>",
      knownTriggers: "<p>Loud noise</p>",
      crisisActivationCriteria: "<p>Leaves the building</p>",
      immediateResponseProcedures: "<p>Follow at distance</p>",
      environmentalSafetyActions: "<p>Lock the gate</p>",
      emergencyContactInstructions: "<p>Call the parent</p>",
      postCrisisProcedure: "<p>Debrief</p>",
      additionalNotes: "<p>Review in June</p>",
    });
  });

  it("closes a dropdown when the backdrop is clicked", () => {
    renderSection({ data: [plan()] });
    const risk = field(cards()[0], "Risk level");
    fireEvent.click(risk.querySelector(".report-builder-select-button"));
    expect(risk.querySelector(".report-builder-select-dropdown")).toBeInTheDocument();
    fireEvent.click(risk.querySelector(".report-builder-select-overlay"));
    expect(risk.querySelector(".report-builder-select-dropdown")).not.toBeInTheDocument();
  });
});

describe("a read-only section", () => {
  it("hides every button that would change the section", () => {
    renderSection({ data: [plan()], isReadOnly: true, onRemoveSection });
    expect(
      screen.queryByRole("button", { name: /Delete Crisis Plan/ })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add a new Crisis Plan" })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Section" })).not.toBeInTheDocument();
  });

  it("still shows the stored content", () => {
    renderSection({ data: [plan()], isReadOnly: true });
    expect(selectedLabel(field(cards()[0], "Risk level"))).toBe("High");
    expect(editor(cards()[0], "Description of crisis behavior")).toHaveTextContent(
      "Leaves the room"
    );
  });
});

describe("removing the whole section", () => {
  it("offers the button only when the parent gave it something to call", () => {
    renderSection({ data: [plan()] });
    expect(screen.queryByRole("button", { name: "Remove Section" })).not.toBeInTheDocument();
  });

  it("hands the removal back to the parent", () => {
    renderSection({ data: [plan()], onRemoveSection });
    fireEvent.click(screen.getByRole("button", { name: "Remove Section" }));
    expect(onRemoveSection).toHaveBeenCalled();
  });
});

describe("the messages a plan puts up when a field is left empty", () => {
  // Each fixture is an otherwise complete plan with one field emptied, so the
  // single message on the card is unambiguously the one being tested.
  it.each([
    ["Crisis Type", { crisisType: [] }, "At least one crisis type is required"],
    ["Risk level", { riskLevel: "" }, "Risk level is required"],
    [
      "De-escalation techniques",
      { deescalationTechniques: [] },
      "At least one de-escalation technique is required",
    ],
    [
      "Physical intervention permitted",
      { physicalInterventionPermitted: "" },
      "Physical intervention permission is required",
    ],
    [
      "Staff authorized to intervene",
      { staffAuthorizedToIntervene: [] },
      "At least one staff member must be authorized",
    ],
    [
      "Emergency services involvement",
      { emergencyServicesInvolvement: "" },
      "Emergency services involvement is required",
    ],
    [
      "Incident documentation required",
      { incidentDocumentationRequired: "" },
      "Incident documentation requirement is required",
    ],
    ["Review schedule", { reviewSchedule: "" }, "Review schedule is required"],
  ])("complains about %s once its list has been opened and shut", async (
    label,
    over,
    message
  ) => {
    renderSection({ data: [plan(over)] });
    leaveSelect(field(cards()[0], label));
    await waitFor(() => expect(cardErrors(cards()[0])).toEqual([message]));
  });

  it.each([
    [
      "crisis type",
      { crisisType: ["other"], crisisTypeOther: "" },
      "Enter other crisis type",
      "Please specify the crisis type",
    ],
    [
      "de-escalation technique",
      { deescalationTechniques: ["other"], deescalationTechniquesOther: "" },
      "Enter other de-escalation technique",
      "Please specify the de-escalation technique",
    ],
    [
      "authorized staff",
      { staffAuthorizedToIntervene: ["other"], staffAuthorizedOther: "" },
      "Enter other authorized staff",
      "Please specify the authorized staff",
    ],
  ])("asks for the %s to be spelled out when Other is left blank", async (
    _name,
    over,
    placeholder,
    message
  ) => {
    renderSection({ data: [plan(over)] });
    fireEvent.blur(screen.getByPlaceholderText(placeholder));
    await waitFor(() => expect(cardErrors(cards()[0])).toEqual([message]));
  });

  it("stays quiet about the fields that were never left", async () => {
    renderSection({
      data: [plan({ riskLevel: "", reviewSchedule: "", crisisType: [] })],
    });
    leaveSelect(field(cards()[0], "Risk level"));
    await waitFor(() => expect(cardErrors(cards()[0])).toEqual(["Risk level is required"]));
  });

  it("clears one plan's message while leaving another plan's alone", async () => {
    renderSection({
      data: [
        plan({ riskLevel: "" }),
        plan({ id: 2, crisisType: ["other"], crisisTypeOther: "" }),
      ],
    });
    leaveSelect(field(cards()[0], "Risk level"));
    await waitFor(() =>
      expect(cardErrors(cards()[0])).toEqual(["Risk level is required"])
    );

    const specify = () => screen.getByPlaceholderText("Enter other crisis type");
    fireEvent.blur(specify());
    await waitFor(() =>
      expect(cardErrors(cards()[1])).toEqual(["Please specify the crisis type"])
    );

    // A touched field is re-checked on every keystroke, and the clear-up only
    // removes the keys belonging to the plan that just validated.
    fireEvent.change(specify(), { target: { value: "Refusing medication" } });
    await waitFor(() => expect(cardErrors(cards()[1])).toEqual([]));
    expect(cardErrors(cards()[0])).toEqual(["Risk level is required"]);
  });
});

describe("a read-only plan's controls", () => {
  it("locks every select and text field", () => {
    renderSection({ data: [plan({ crisisType: ["other"] })], isReadOnly: true });
    const buttons = document.body.querySelectorAll(".report-builder-select-button");
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((b) => expect(b).toBeDisabled());
    document.body
      .querySelectorAll(".report-builder-input")
      .forEach((i) => expect(i).toHaveAttribute("readonly"));
  });

  it("cannot be made to put a message up, because nothing can be left", () => {
    renderSection({ data: [plan({ riskLevel: "" })], isReadOnly: true });
    const button = field(cards()[0], "Risk level").querySelector(
      ".report-builder-select-button"
    );
    fireEvent.click(button);
    // A disabled button never opens, so the list never shuts and the field is
    // never marked touched.
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(cardErrors(cards()[0])).toEqual([]);
  });
});
