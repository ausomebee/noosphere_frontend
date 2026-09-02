import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

/**
 * The Generalization & Maintenance section of the clinical report builder:
 * eight rich text blocks, a maintenance schedule picker, and three
 * multi-selects (approach, settings, people) that each hide an "Other" escape
 * hatch behind their own "other" option.
 *
 * The section holds its own copy of the form and re-emits the whole object
 * through `onChange` on every edit, so most assertions read the last object
 * handed to that spy. All three multi-selects share one "other" rule -- taking
 * "other" wipes the rest of the selection, and adding anything else drops
 * "other" again -- and each one is driven separately because they render three
 * identically-labelled "Please specify" fields.
 *
 * The rich text editors reach for execCommand, which jsdom does not implement,
 * so they are replaced by input probes that call the same onChange.
 */

vi.mock("../Components/Input/RichTextEditor/RichTextEditorInput", () => ({
  default: ({ label, value, onChange }) => (
    <input
      aria-label={label}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

import GeneralizationSection from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/GeneralizationSection/GeneralizationSection";

const onChange = vi.fn();
const onRemoveSection = vi.fn();

const renderSection = (props = {}) =>
  render(<GeneralizationSection onChange={onChange} {...props} />);

const lastEmitted = () => onChange.mock.calls[onChange.mock.calls.length - 1][0];

/** Report builder fields are label + control siblings, not label/for pairs. */
const field = (root, labelText) =>
  Array.from(root.querySelectorAll(".report-builder-field")).find(
    (f) => f.querySelector(".report-builder-label")?.textContent.replace(/\*$/, "").trim() === labelText
  );

/**
 * The three multi-selects each own a "Please specify" of the same name, so a
 * lookup is always scoped to the container the multi-select lives in.
 */
const container = (labelText) =>
  field(document.body, labelText).closest(".select-with-other-container");

const toggle = (labelText, optionLabel) => {
  const wrapper = field(document.body, labelText);
  const button = wrapper.querySelector(".report-builder-select-button");
  if (button.getAttribute("aria-expanded") === "false") fireEvent.click(button);
  const list = wrapper.querySelector(".report-builder-multi-select-dropdown");
  fireEvent.click(within(list).getByText(optionLabel).parentElement.querySelector("input"));
};

const pick = (labelText, optionLabel) => {
  const wrapper = field(document.body, labelText);
  fireEvent.click(wrapper.querySelector(".report-builder-select-button"));
  fireEvent.click(
    within(wrapper.querySelector(".report-builder-select-dropdown")).getByText(optionLabel)
  );
};

/**
 * Leaving a field is what marks it touched, and for these dropdowns that means
 * the list shutting rather than a native blur.
 */
const leaveSelect = (labelText) => {
  const wrapper = field(document.body, labelText);
  fireEvent.click(wrapper.querySelector(".report-builder-select-button"));
  fireEvent.click(wrapper.querySelector(".report-builder-select-overlay"));
};

const specifyInput = (labelText) =>
  field(container(labelText), "Please specify").querySelector("input");

const sectionErrors = () =>
  Array.from(document.body.querySelectorAll(".report-builder-error")).map(
    (e) => e.textContent
  );

const specify = (labelText, value) =>
  fireEvent.change(field(container(labelText), "Please specify").querySelector("input"), {
    target: { value },
  });

const filledData = {
  targetBehaviors: "<p>Requesting</p>",
  generalizationApproach: ["across-people"],
  generalizationApproachOther: "",
  generalizationDescription: "<p>Across the day</p>",
  settingsForGeneralization: ["home", "school"],
  settingsForGeneralizationOther: "",
  peopleInvolvedInGeneralization: ["rbt"],
  peopleInvolvedOther: "",
  materialsVariationPlan: "<p>Vary the cards</p>",
  maintenancePlan: "<p>Weekly probes</p>",
  maintenanceSchedule: "weekly",
  fadingPlan: "<p>Fade prompts</p>",
  criteriaForMaintenanceSuccess: "<p>80% across three sessions</p>",
  generalizationMaintenanceNotes: "<p>Notes</p>",
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the initial state", () => {
  it("starts every field blank with no Other inputs showing", () => {
    renderSection();
    expect(screen.getByLabelText("Target Behavior(s)")).toHaveValue("");
    expect(field(document.body, "Generalization approach")).toHaveTextContent("Select an option");
    expect(field(document.body, "Maintenance schedule")).toHaveTextContent("Select an option");
    expect(screen.queryByText("Please specify")).not.toBeInTheDocument();
  });

  it("seeds itself from a saved section", () => {
    renderSection({ data: filledData });
    expect(screen.getByLabelText("Target Behavior(s)")).toHaveValue("<p>Requesting</p>");
    expect(field(document.body, "Generalization approach")).toHaveTextContent("Across people");
    expect(field(document.body, "Settings for generalization")).toHaveTextContent("Home, School");
    expect(field(document.body, "People involved in generalization")).toHaveTextContent("RBT");
    expect(field(document.body, "Maintenance schedule")).toHaveTextContent("Weekly");
    expect(screen.getByLabelText("Fading plan")).toHaveValue("<p>Fade prompts</p>");
    expect(screen.getByLabelText("Criteria for maintenance success")).toHaveValue(
      "<p>80% across three sessions</p>"
    );
    expect(screen.getByLabelText("Generalization & maintenance notes")).toHaveValue("<p>Notes</p>");
  });
});

describe("editing the free-text blocks", () => {
  it("emits the whole section on every rich text edit", () => {
    renderSection();
    const blocks = {
      "Target Behavior(s)": "<p>Requesting</p>",
      "Generalization description": "<p>Description</p>",
      "Materials variation plan": "<p>Materials</p>",
      "Maintenance plan": "<p>Maintenance</p>",
      "Fading plan": "<p>Fading</p>",
      "Criteria for maintenance success": "<p>Criteria</p>",
      "Generalization & maintenance notes": "<p>Notes</p>",
    };
    for (const [label, value] of Object.entries(blocks)) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    expect(lastEmitted()).toMatchObject({
      targetBehaviors: "<p>Requesting</p>",
      generalizationDescription: "<p>Description</p>",
      materialsVariationPlan: "<p>Materials</p>",
      maintenancePlan: "<p>Maintenance</p>",
      fadingPlan: "<p>Fading</p>",
      criteriaForMaintenanceSuccess: "<p>Criteria</p>",
      generalizationMaintenanceNotes: "<p>Notes</p>",
    });
  });

  it("emits the chosen maintenance schedule", () => {
    renderSection();
    pick("Maintenance schedule", "At discharge");
    expect(lastEmitted().maintenanceSchedule).toBe("at-discharge");
  });

  it("closes the schedule dropdown again when its backdrop is clicked", () => {
    renderSection();
    const wrapper = field(document.body, "Maintenance schedule");
    fireEvent.click(wrapper.querySelector(".report-builder-select-button"));
    expect(wrapper.querySelector(".report-builder-select-dropdown")).toBeInTheDocument();
    fireEvent.click(wrapper.querySelector(".report-builder-select-overlay"));
    expect(wrapper.querySelector(".report-builder-select-dropdown")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("the generalization approach multi-select", () => {
  it("accumulates ordinary approaches and drops one on a second click", () => {
    renderSection();
    toggle("Generalization approach", "Across settings");
    expect(lastEmitted().generalizationApproach).toEqual(["across-settings"]);
    toggle("Generalization approach", "Across time");
    expect(lastEmitted().generalizationApproach).toEqual(["across-settings", "across-time"]);
    toggle("Generalization approach", "Across settings");
    expect(lastEmitted().generalizationApproach).toEqual(["across-time"]);
  });

  it("collapses to Other alone and reveals its specify field", () => {
    renderSection({ data: { generalizationApproach: ["across-settings", "across-time"] } });
    toggle("Generalization approach", "Other");
    expect(lastEmitted().generalizationApproach).toEqual(["other"]);
    specify("Generalization approach", "During swim class");
    expect(lastEmitted().generalizationApproachOther).toBe("During swim class");
  });

  it("drops Other again as soon as a real approach is added", () => {
    renderSection({ data: { generalizationApproach: ["other"] } });
    expect(field(container("Generalization approach"), "Please specify")).toBeDefined();
    toggle("Generalization approach", "Across materials");
    expect(lastEmitted().generalizationApproach).toEqual(["across-materials"]);
    expect(field(container("Generalization approach"), "Please specify")).toBeUndefined();
  });

  it("clears the selection when Other is unticked", () => {
    renderSection({ data: { generalizationApproach: ["other"] } });
    toggle("Generalization approach", "Other");
    expect(lastEmitted().generalizationApproach).toEqual([]);
  });
});

describe("the settings multi-select", () => {
  it("collapses to Other alone and keeps its own specify value", () => {
    renderSection({ data: { settingsForGeneralization: ["home"] } });
    toggle("Settings for generalization", "Other");
    expect(lastEmitted().settingsForGeneralization).toEqual(["other"]);
    specify("Settings for generalization", "Grandparent's house");
    expect(lastEmitted().settingsForGeneralizationOther).toBe("Grandparent's house");
    // The other two multi-selects are untouched by this one's Other rule.
    expect(lastEmitted().generalizationApproach).toEqual([]);
    expect(lastEmitted().peopleInvolvedInGeneralization).toEqual([]);
  });

  it("drops Other again as soon as a real setting is added", () => {
    renderSection({ data: { settingsForGeneralization: ["other"] } });
    toggle("Settings for generalization", "Telehealth");
    expect(lastEmitted().settingsForGeneralization).toEqual(["telehealth"]);
  });

  it("accumulates ordinary settings", () => {
    renderSection();
    toggle("Settings for generalization", "Clinic");
    toggle("Settings for generalization", "Community");
    expect(lastEmitted().settingsForGeneralization).toEqual(["clinic", "community"]);
  });
});

describe("the people involved multi-select", () => {
  it("collapses to Other alone and keeps its own specify value", () => {
    renderSection({ data: { peopleInvolvedInGeneralization: ["rbt", "peers"] } });
    toggle("People involved in generalization", "Other");
    expect(lastEmitted().peopleInvolvedInGeneralization).toEqual(["other"]);
    specify("People involved in generalization", "Swim coach");
    expect(lastEmitted().peopleInvolvedOther).toBe("Swim coach");
  });

  it("drops Other again as soon as a real person is added", () => {
    renderSection({ data: { peopleInvolvedInGeneralization: ["other"] } });
    toggle("People involved in generalization", "BCBA");
    expect(lastEmitted().peopleInvolvedInGeneralization).toEqual(["bcba"]);
  });

  it("accumulates ordinary people", () => {
    renderSection();
    toggle("People involved in generalization", "Caregiver/parent");
    toggle("People involved in generalization", "Teacher/school staff");
    expect(lastEmitted().peopleInvolvedInGeneralization).toEqual([
      "caregiver-parent",
      "teacher-school-staff",
    ]);
  });

  it("shows all three specify fields at once when every list is on Other", () => {
    renderSection({
      data: {
        generalizationApproach: ["other"],
        settingsForGeneralization: ["other"],
        peopleInvolvedInGeneralization: ["other"],
        generalizationApproachOther: "A",
        settingsForGeneralizationOther: "B",
        peopleInvolvedOther: "C",
      },
    });
    expect(
      field(container("Generalization approach"), "Please specify").querySelector("input")
    ).toHaveValue("A");
    expect(
      field(container("Settings for generalization"), "Please specify").querySelector("input")
    ).toHaveValue("B");
    expect(
      field(container("People involved in generalization"), "Please specify").querySelector("input")
    ).toHaveValue("C");
  });
});

describe("removing the whole section", () => {
  it("offers the remove button only when the parent supplied a handler", () => {
    const { unmount } = renderSection({ data: filledData });
    expect(screen.queryByRole("button", { name: "Remove Section" })).not.toBeInTheDocument();
    unmount();

    renderSection({ data: filledData, onRemoveSection });
    fireEvent.click(screen.getByRole("button", { name: "Remove Section" }));
    expect(onRemoveSection).toHaveBeenCalledTimes(1);
  });

  it("hides the remove button in read-only mode", () => {
    renderSection({ data: filledData, isReadOnly: true, onRemoveSection });
    expect(screen.queryByRole("button", { name: "Remove Section" })).not.toBeInTheDocument();
    // The values themselves are still on screen.
    expect(screen.getByLabelText("Maintenance plan")).toHaveValue("<p>Weekly probes</p>");
  });
});

describe("the messages the section puts up when a field is left empty", () => {
  it.each([
    [
      "Generalization approach",
      "At least one generalization approach is required",
    ],
    [
      "Settings for generalization",
      "At least one setting for generalization is required",
    ],
    ["People involved in generalization", "At least one person must be involved"],
    ["Maintenance schedule", "Maintenance schedule is required"],
  ])("complains about %s once its list has been opened and shut", async (
    label,
    message
  ) => {
    // A blank section is short in all four at once, so leaving one of them is
    // also the check that only the field that was left says anything.
    renderSection();
    leaveSelect(label);
    await waitFor(() => expect(sectionErrors()).toEqual([message]));
  });

  it.each([
    [
      "Generalization approach",
      { generalizationApproach: ["other"], generalizationApproachOther: "" },
      "Please specify the generalization approach",
    ],
    [
      "Settings for generalization",
      { settingsForGeneralization: ["other"], settingsForGeneralizationOther: "" },
      "Please specify the setting",
    ],
    [
      "People involved in generalization",
      { peopleInvolvedInGeneralization: ["other"], peopleInvolvedOther: "" },
      "Please specify the person involved",
    ],
  ])("asks for %s to be spelled out when Other is left blank", async (
    label,
    over,
    message
  ) => {
    renderSection({ data: { ...filledData, ...over } });
    fireEvent.blur(specifyInput(label));
    await waitFor(() => expect(sectionErrors()).toEqual([message]));
  });

  it("takes the message back down as soon as the field is filled in", async () => {
    renderSection({
      data: {
        ...filledData,
        generalizationApproach: ["other"],
        generalizationApproachOther: "",
      },
    });
    fireEvent.blur(specifyInput("Generalization approach"));
    await waitFor(() =>
      expect(sectionErrors()).toEqual(["Please specify the generalization approach"])
    );

    // A touched field is re-checked on every keystroke, and the rest of this
    // fixture is complete, so the whole form validates and the message goes.
    fireEvent.change(specifyInput("Generalization approach"), {
      target: { value: "Across activities" },
    });
    await waitFor(() => expect(sectionErrors()).toEqual([]));
    expect(lastEmitted().generalizationApproachOther).toBe("Across activities");
  });

  it("shows a second message once a second field has been left too", async () => {
    renderSection();
    leaveSelect("Maintenance schedule");
    await waitFor(() => expect(sectionErrors()).toEqual(["Maintenance schedule is required"]));

    leaveSelect("Settings for generalization");
    await waitFor(() =>
      expect(sectionErrors()).toEqual([
        "At least one setting for generalization is required",
        "Maintenance schedule is required",
      ])
    );
  });

  it("keeps a touched field's message up while another field is still short", async () => {
    renderSection({
      data: { ...filledData, peopleInvolvedInGeneralization: [], maintenanceSchedule: "" },
    });
    leaveSelect("People involved in generalization");
    await waitFor(() =>
      expect(sectionErrors()).toEqual(["At least one person must be involved"])
    );

    // Answering the people question re-checks the form, which still fails on
    // the maintenance schedule -- but that field was never left, so nothing new
    // appears and the answered field's message goes.
    toggle("People involved in generalization", "RBT");
    await waitFor(() => expect(sectionErrors()).toEqual([]));
    expect(lastEmitted().peopleInvolvedInGeneralization).toEqual(["rbt"]);
  });
});

describe("a read-only section's controls", () => {
  it("locks every picker and text field", () => {
    renderSection({
      data: { ...filledData, generalizationApproach: ["other"] },
      isReadOnly: true,
    });
    const buttons = document.body.querySelectorAll(".report-builder-select-button");
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((b) => expect(b).toBeDisabled());
    document.body
      .querySelectorAll(".report-builder-input")
      .forEach((i) => expect(i).toHaveAttribute("readonly"));
  });

  it("cannot be made to put a message up, because nothing can be left", () => {
    renderSection({ isReadOnly: true });
    const button = field(document.body, "Maintenance schedule").querySelector(
      ".report-builder-select-button"
    );
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(sectionErrors()).toEqual([]);
  });
});
