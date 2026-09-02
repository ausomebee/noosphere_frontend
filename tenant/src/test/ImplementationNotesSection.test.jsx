import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/**
 * The Implementation Notes section of the clinical report builder: one flat
 * form of eight rich text fields, two multi-selects, one single select and a
 * radio pair, with two fields that appear only once their trigger is answered
 * -- a "Please specify" box for an "Other" provider, and a notes editor that
 * belongs to a "Yes" on fidelity monitoring.
 *
 * The real inputs are used rather than probes, since the only logic here is the
 * bookkeeping between them and the fallback applied to every field the section
 * is handed.
 *
 * The section seeds itself from `data` exactly once, so every fixture is passed
 * at render time. A field is marked touched when it is left, and only a touched
 * field shows its message; for the two dropdowns "left" means the list shutting
 * rather than a native blur, while the radio pair blurs natively. The validator
 * runs over the whole form at once, so a single blur fills `errors` for every
 * short field and only the blurred one is on screen.
 */

import ImplementationNotesSection from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/ImplementationNotesSection/ImplementationNotesSection";

const onChange = vi.fn();
const onRemoveSection = vi.fn();

const renderSection = (props = {}) =>
  render(<ImplementationNotesSection onChange={onChange} {...props} />);

const field = (label) =>
  Array.from(document.body.querySelectorAll(".report-builder-field")).find((f) =>
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

const openMulti = (fieldEl) =>
  fireEvent.click(fieldEl.querySelector(".report-builder-select-button"));

const toggleMulti = (fieldEl, optionLabel) => {
  const option = Array.from(
    fieldEl.querySelectorAll(".report-builder-multi-select-option")
  ).find((o) => o.textContent.trim() === optionLabel);
  fireEvent.click(option.querySelector("input[type=checkbox]"));
};

// A RadioInput label carries no htmlFor, so the input itself is clicked.
const chooseRadio = (fieldEl, optionLabel) => {
  const option = Array.from(
    fieldEl.querySelectorAll(".report-builder-radio-label")
  ).find((o) => o.textContent.trim() === optionLabel);
  fireEvent.click(option.querySelector("input[type=radio]"));
};

// Both dropdowns count their list shutting as leaving the field, so this marks
// a picker touched without answering it.
const leaveSelect = (fieldEl) => {
  fireEvent.click(fieldEl.querySelector(".report-builder-select-button"));
  fireEvent.click(fieldEl.querySelector(".report-builder-select-overlay"));
};

const sectionErrors = () =>
  Array.from(document.body.querySelectorAll(".report-builder-error")).map(
    (e) => e.textContent
  );

const editor = (label) => {
  const container = Array.from(
    document.body.querySelectorAll(".rich-editor-container")
  ).find((c) => c.querySelector(".label-text")?.textContent === label);
  return container?.querySelector("[contenteditable]");
};

const typeInEditor = (element, html) => {
  element.innerHTML = html;
  fireEvent.input(element);
};

const lastForm = () => onChange.mock.calls[onChange.mock.calls.length - 1][0];

// Every field filled, so each `||` fallback can be seen taking the supplied
// value rather than the empty default.
const fullData = {
  implementationOverview: "<p>Two sessions a week</p>",
  serviceSettings: ["home"],
  sessionStructure: "<p>Ninety minutes</p>",
  staffRolesResponsibilities: "<p>RBT runs the session</p>",
  caregiverInvolvement: "observation-only",
  caregiverTrainingDetails: "<p>Monthly coaching</p>",
  materialsRequired: "<p>Token board</p>",
  environmentalConsiderations: "<p>Quiet room</p>",
  coordinationWithProviders: ["speech-therapist"],
  coordinationWithProvidersOther: "",
  implementationConstraints: "<p>School holidays</p>",
  fidelityMonitoringInPlace: "no",
  fidelityMonitoringNotes: "<p>Checked fortnightly</p>",
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the shape a fresh section starts in", () => {
  it("empties every field it was given nothing for", () => {
    renderSection();
    expect(selectedLabel(field("Service Setting(s)"))).toBe("Select an option");
    expect(selectedLabel(field("Caregiver involvement"))).toBe("Select an option");
    expect(selectedLabel(field("Coordination with other providers"))).toBe(
      "Select an option"
    );
    expect(editor("Implementation overview")).toBeEmptyDOMElement();
    expect(editor("Materials required")).toBeEmptyDOMElement();
    expect(
      field("Fidelity monitoring in place").querySelectorAll("input:checked")
    ).toHaveLength(0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows every value it was given", () => {
    renderSection({ data: fullData });
    expect(selectedLabel(field("Service Setting(s)"))).toBe("Home");
    expect(selectedLabel(field("Caregiver involvement"))).toBe("Observation only");
    expect(selectedLabel(field("Coordination with other providers"))).toBe(
      "Speech therapist"
    );
    expect(editor("Implementation overview")).toHaveTextContent("Two sessions a week");
    expect(editor("Session Structure")).toHaveTextContent("Ninety minutes");
    expect(editor("Staff roles & responsibilities")).toHaveTextContent(
      "RBT runs the session"
    );
    expect(editor("Caregiver training details")).toHaveTextContent("Monthly coaching");
    expect(editor("Materials required")).toHaveTextContent("Token board");
    expect(editor("Environmental considerations")).toHaveTextContent("Quiet room");
    expect(editor("Implementation constraints or notes")).toHaveTextContent(
      "School holidays"
    );
  });

  it("shows the specify box for an Other it was given", () => {
    renderSection({
      data: {
        ...fullData,
        coordinationWithProviders: ["other"],
        coordinationWithProvidersOther: "Dietitian",
      },
    });
    expect(screen.getByPlaceholderText("Enter other provider")).toHaveValue("Dietitian");
  });

  it("keeps the specify box hidden while no Other is stored", () => {
    renderSection({ data: fullData });
    expect(
      screen.queryByPlaceholderText("Enter other provider")
    ).not.toBeInTheDocument();
  });
});

describe("the coordination multi-select where Other stands alone", () => {
  it("drops everything else when Other is chosen", () => {
    renderSection({ data: fullData });
    const coordination = field("Coordination with other providers");
    openMulti(coordination);
    toggleMulti(coordination, "School Staff");
    expect(lastForm().coordinationWithProviders).toHaveLength(2);
    toggleMulti(field("Coordination with other providers"), "Other");
    expect(lastForm().coordinationWithProviders).toEqual(["other"]);
    expect(screen.getByPlaceholderText("Enter other provider")).toBeInTheDocument();
    // And adding a real option beside "Other" drops "Other" again.
    toggleMulti(field("Coordination with other providers"), "Medical provider");
    expect(lastForm().coordinationWithProviders).toEqual(["medical-provider"]);
    expect(
      screen.queryByPlaceholderText("Enter other provider")
    ).not.toBeInTheDocument();
  });

  it("empties the field when Other is unticked on its own", () => {
    renderSection({ data: { ...fullData, coordinationWithProviders: ["other"] } });
    const coordination = field("Coordination with other providers");
    openMulti(coordination);
    toggleMulti(coordination, "Other");
    expect(lastForm().coordinationWithProviders).toEqual([]);
  });

  it("records what the specify box is filled in with", () => {
    renderSection({ data: { ...fullData, coordinationWithProviders: ["other"] } });
    fireEvent.change(screen.getByPlaceholderText("Enter other provider"), {
      target: { value: "Dietitian" },
    });
    expect(lastForm().coordinationWithProvidersOther).toBe("Dietitian");
  });
});

describe("the multi-select with no Other to worry about", () => {
  it("adds and removes service settings freely", () => {
    renderSection({ data: fullData });
    const settings = field("Service Setting(s)");
    openMulti(settings);
    toggleMulti(settings, "Telehealth");
    expect(lastForm().serviceSettings).toEqual(["home", "telehealth"]);
    toggleMulti(field("Service Setting(s)"), "Home");
    expect(lastForm().serviceSettings).toEqual(["telehealth"]);
  });

  it("leaves an Other-looking value alone in a field that has no Other", () => {
    renderSection({ data: fullData });
    const settings = field("Service Setting(s)");
    openMulti(settings);
    toggleMulti(settings, "Multiple settings");
    expect(lastForm().serviceSettings).toEqual(["home", "multiple-settings"]);
  });
});

describe("the fidelity monitoring answer", () => {
  it("keeps the notes hidden while monitoring is not in place", () => {
    renderSection({ data: fullData });
    expect(editor("Fidelity monitoring notes")).toBeUndefined();
  });

  it("reveals the notes on a Yes and records what is written there", () => {
    renderSection({ data: fullData });
    chooseRadio(field("Fidelity monitoring in place"), "Yes");
    expect(lastForm().fidelityMonitoringInPlace).toBe("yes");
    typeInEditor(editor("Fidelity monitoring notes"), "<p>Checked fortnightly</p>");
    expect(lastForm().fidelityMonitoringNotes).toBe("<p>Checked fortnightly</p>");
  });

  it("hides the notes again on a No, keeping what was written", () => {
    renderSection({
      data: {
        ...fullData,
        fidelityMonitoringInPlace: "yes",
        fidelityMonitoringNotes: "<p>Checked fortnightly</p>",
      },
    });
    expect(editor("Fidelity monitoring notes")).toHaveTextContent(
      "Checked fortnightly"
    );
    chooseRadio(field("Fidelity monitoring in place"), "No");
    expect(editor("Fidelity monitoring notes")).toBeUndefined();
    expect(lastForm().fidelityMonitoringNotes).toBe("<p>Checked fortnightly</p>");
  });

  it("keeps the notes hidden while nothing has been answered", () => {
    renderSection();
    expect(editor("Fidelity monitoring notes")).toBeUndefined();
  });
});

describe("the single select and the free text", () => {
  it("records the caregiver involvement", () => {
    renderSection();
    chooseOption(field("Caregiver involvement"), "Primary implementer");
    expect(lastForm().caregiverInvolvement).toBe("primary-implementer");
  });

  it("records what is typed into each rich text field", () => {
    renderSection();
    typeInEditor(editor("Implementation overview"), "<p>Two sessions a week</p>");
    typeInEditor(editor("Session Structure"), "<p>Ninety minutes</p>");
    typeInEditor(editor("Staff roles & responsibilities"), "<p>RBT runs it</p>");
    typeInEditor(editor("Caregiver training details"), "<p>Monthly coaching</p>");
    typeInEditor(editor("Materials required"), "<p>Token board</p>");
    typeInEditor(editor("Environmental considerations"), "<p>Quiet room</p>");
    typeInEditor(editor("Implementation constraints or notes"), "<p>Holidays</p>");
    expect(lastForm()).toMatchObject({
      implementationOverview: "<p>Two sessions a week</p>",
      sessionStructure: "<p>Ninety minutes</p>",
      staffRolesResponsibilities: "<p>RBT runs it</p>",
      caregiverTrainingDetails: "<p>Monthly coaching</p>",
      materialsRequired: "<p>Token board</p>",
      environmentalConsiderations: "<p>Quiet room</p>",
      implementationConstraints: "<p>Holidays</p>",
    });
  });

  it("closes a dropdown when the backdrop is clicked", () => {
    renderSection();
    const caregiver = field("Caregiver involvement");
    fireEvent.click(caregiver.querySelector(".report-builder-select-button"));
    expect(
      caregiver.querySelector(".report-builder-select-dropdown")
    ).toBeInTheDocument();
    fireEvent.click(caregiver.querySelector(".report-builder-select-overlay"));
    expect(
      caregiver.querySelector(".report-builder-select-dropdown")
    ).not.toBeInTheDocument();
  });

  it("keeps the other fields intact when one of them changes", () => {
    renderSection({ data: fullData });
    chooseOption(field("Caregiver involvement"), "Not involved");
    expect(lastForm()).toMatchObject({
      caregiverInvolvement: "not-involved",
      serviceSettings: ["home"],
      implementationOverview: "<p>Two sessions a week</p>",
    });
  });
});

describe("a read-only section", () => {
  it("hides the remove button", () => {
    renderSection({ data: fullData, isReadOnly: true, onRemoveSection });
    expect(
      screen.queryByRole("button", { name: "Remove Section" })
    ).not.toBeInTheDocument();
  });

  it("still shows the stored content", () => {
    renderSection({ data: fullData, isReadOnly: true });
    expect(selectedLabel(field("Caregiver involvement"))).toBe("Observation only");
    expect(editor("Implementation overview")).toHaveTextContent("Two sessions a week");
  });
});

describe("removing the whole section", () => {
  it("offers the button only when the parent gave it something to call", () => {
    renderSection({ data: fullData });
    expect(
      screen.queryByRole("button", { name: "Remove Section" })
    ).not.toBeInTheDocument();
  });

  it("hands the removal back to the parent", () => {
    renderSection({ data: fullData, onRemoveSection });
    fireEvent.click(screen.getByRole("button", { name: "Remove Section" }));
    expect(onRemoveSection).toHaveBeenCalled();
  });
});

describe("the messages the form puts up when a field is left empty", () => {
  it.each([
    ["Service Setting(s)", "At least one service setting is required"],
    ["Caregiver involvement", "Caregiver involvement is required"],
    ["Coordination with other providers", "Coordination with providers is required"],
  ])("complains about %s once its list has been opened and shut", async (
    label,
    message
  ) => {
    // A blank section is short in every required field at once, so leaving one
    // of them is also the check that only that one is on screen.
    renderSection();
    leaveSelect(field(label));
    await waitFor(() => expect(sectionErrors()).toEqual([message]));
  });

  it("complains about the fidelity monitoring radios once they are left", async () => {
    renderSection();
    fireEvent.blur(
      field("Fidelity monitoring in place").querySelector("input[type=radio]")
    );
    await waitFor(() => expect(sectionErrors()).toEqual(["Fidelity monitoring is required"]));
  });

  it("asks for the provider to be spelled out when Other is left blank", async () => {
    renderSection({
      data: {
        ...fullData,
        coordinationWithProviders: ["other"],
        coordinationWithProvidersOther: "",
      },
    });
    fireEvent.blur(field("Please specify").querySelector("input"));
    await waitFor(() => expect(sectionErrors()).toEqual(["Please specify the provider"]));
  });

  it("takes the message back down as soon as the field is filled in", async () => {
    renderSection({
      data: {
        ...fullData,
        coordinationWithProviders: ["other"],
        coordinationWithProvidersOther: "",
      },
    });
    const specify = () => field("Please specify").querySelector("input");
    fireEvent.blur(specify());
    await waitFor(() => expect(sectionErrors()).toEqual(["Please specify the provider"]));

    // A touched field is re-checked on every keystroke, and the rest of this
    // fixture is complete, so the whole form validates and the message goes.
    fireEvent.change(specify(), { target: { value: "Occupational therapist" } });
    await waitFor(() => expect(sectionErrors()).toEqual([]));
    expect(lastForm().coordinationWithProvidersOther).toBe("Occupational therapist");
  });

  it("shows a second message once a second field has been left too", async () => {
    renderSection();
    leaveSelect(field("Service Setting(s)"));
    await waitFor(() =>
      expect(sectionErrors()).toEqual(["At least one service setting is required"])
    );

    leaveSelect(field("Caregiver involvement"));
    await waitFor(() =>
      expect(sectionErrors()).toEqual([
        "At least one service setting is required",
        "Caregiver involvement is required",
      ])
    );
  });

  it("keeps a touched field's message up while another field is still short", async () => {
    renderSection({ data: { ...fullData, serviceSettings: [], caregiverInvolvement: "" } });
    leaveSelect(field("Service Setting(s)"));
    await waitFor(() =>
      expect(sectionErrors()).toEqual(["At least one service setting is required"])
    );

    // Answering the settings question re-checks the form, which still fails on
    // the caregiver involvement -- but that field was never left, so nothing
    // new appears and the answered field's message goes.
    const settings = field("Service Setting(s)");
    openMulti(settings);
    toggleMulti(settings, "Home");
    await waitFor(() => expect(sectionErrors()).toEqual([]));
    expect(lastForm().serviceSettings).toEqual(["home"]);
  });
});

describe("a read-only section's controls", () => {
  it("locks every picker, radio and text field", () => {
    renderSection({
      data: { ...fullData, coordinationWithProviders: ["other"] },
      isReadOnly: true,
    });
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
    renderSection({ isReadOnly: true });
    const button = field("Caregiver involvement").querySelector(
      ".report-builder-select-button"
    );
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(sectionErrors()).toEqual([]);
  });
});
