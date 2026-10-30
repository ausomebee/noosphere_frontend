import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

/**
 * The Client Information section of the clinical report builder. Three fields
 * are auto-populated from the client profile and shown read-only; the rest --
 * a background editor, a repeatable list of diagnosis cards, intake date,
 * referral source, service location and a free-text block -- are edited here.
 *
 * The interesting logic is the merge effect: the section keeps its own copy of
 * the form, and every time the `data` prop changes it re-merges, preferring
 * incoming values but falling back to what is already typed. It also
 * fingerprints the incoming data so an identical object is skipped, and
 * re-emits upward only when one of the three auto-populated fields actually
 * changed. Those paths are driven by re-rendering with new `data` rather than
 * through the DOM.
 *
 * The rich text editors are contentEditable and reach for execCommand, which
 * jsdom does not implement, so they are replaced by input probes that call the
 * same onChange. Everything else is rendered for real.
 */

const toastMock = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toastMock.showToast(...a),
  showApiError: vi.fn(),
}));

vi.mock("../Components/Input/RichTextEditor/RichTextEditorInput", () => ({
  default: ({ label, value, onChange }) => (
    <input
      aria-label={label}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

import ClientInformationSection from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/ClientInformationSection/ClientInformationSection";

const onChange = vi.fn();
const onRemoveSection = vi.fn();

const renderSection = ({ data = {}, ...props } = {}) =>
  render(<ClientInformationSection data={data} onChange={onChange} {...props} />);

const rerenderWith = (rerender, { data, ...props }) =>
  rerender(<ClientInformationSection data={data} onChange={onChange} {...props} />);

const lastEmitted = () => onChange.mock.calls[onChange.mock.calls.length - 1][0];

const diagnosisCards = () => Array.from(document.body.querySelectorAll(".diagnosis-card"));

/** Report builder fields are label + control siblings, not label/for pairs. */
const field = (root, labelText) =>
  Array.from(root.querySelectorAll(".report-builder-field")).find(
    (f) => f.querySelector(".report-builder-label")?.textContent.replace(/\*$/, "").trim() === labelText
  );

const textIn = (root, labelText, value) =>
  fireEvent.change(field(root, labelText).querySelector("input"), { target: { value } });

const autoValue = (labelText) =>
  field(document.body, labelText).querySelector(".report-builder-auto-populated").textContent;

/** Opens a single-select and takes the option with the given label. */
const pick = (root, labelText, optionLabel) => {
  const wrapper = field(root, labelText);
  fireEvent.click(wrapper.querySelector(".report-builder-select-button"));
  fireEvent.click(
    within(wrapper.querySelector(".report-builder-select-dropdown")).getByText(optionLabel)
  );
};

const sectionErrors = () =>
  Array.from(document.body.querySelectorAll(".report-builder-error")).map(
    (e) => e.textContent
  );

const leaveField = (root, labelText) =>
  fireEvent.blur(field(root, labelText).querySelector("input"));

const savedDiagnosis = (over = {}) => ({
  id: 1,
  diagnosisName: "Autism spectrum disorder",
  diagnosisCode: "F84.0",
  diagnosisDescription: "<p>Level 2</p>",
  diagnosisDate: "2023-09-01",
  diagnosedBy: "Dr Chen",
  primaryDiagnosis: "yes",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the auto-populated header", () => {
  it("prompts for each profile field the report has not been given", () => {
    renderSection();
    expect(autoValue("Client Full Name")).toBe("(Auto populated from client profile)");
    expect(autoValue("Date of Birth")).toBe("(Auto populated from client profile)");
    expect(autoValue("Gender")).toBe("(Auto populated from client profile)");
    // Nothing to push upward, so the parent is left alone.
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows the profile values and pushes them straight up", () => {
    renderSection({
      data: { clientFullName: "Ada Lovelace", dateOfBirth: "2015-04-02", gender: "Female" },
    });
    expect(autoValue("Client Full Name")).toBe("Ada Lovelace");
    expect(autoValue("Date of Birth")).toBe("2015-04-02");
    expect(autoValue("Gender")).toBe("Female");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(lastEmitted()).toMatchObject({
      clientFullName: "Ada Lovelace",
      dateOfBirth: "2015-04-02",
      gender: "Female",
    });
  });

  it("pushes upward again only when a profile field actually changes", () => {
    const { rerender } = renderSection({ data: { clientFullName: "Ada Lovelace" } });
    expect(onChange).toHaveBeenCalledTimes(1);

    // Same object contents: the fingerprint matches and the effect bails out.
    rerenderWith(rerender, { data: { clientFullName: "Ada Lovelace" } });
    expect(onChange).toHaveBeenCalledTimes(1);

    // Different data, but the three auto fields are unchanged.
    rerenderWith(rerender, { data: { clientFullName: "Ada Lovelace", intakeDate: "2024-01-02" } });
    expect(onChange).toHaveBeenCalledTimes(1);

    rerenderWith(rerender, { data: { clientFullName: "Ada Byron", intakeDate: "2024-01-02" } });
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(lastEmitted().clientFullName).toBe("Ada Byron");
  });
});

describe("merging incoming data with what is already typed", () => {
  it("keeps typed values that the new data does not mention", () => {
    const { rerender } = renderSection();
    fireEvent.change(screen.getByLabelText("Client Background"), {
      target: { value: "<p>Typed background</p>" },
    });
    textIn(document.body, "Intake Date", "2024-03-03");

    // A profile arriving late must not wipe the fields already filled in.
    rerenderWith(rerender, { data: { clientFullName: "Ada Lovelace" } });
    expect(screen.getByLabelText("Client Background")).toHaveValue("<p>Typed background</p>");
    expect(field(document.body, "Intake Date").querySelector("input")).toHaveValue("2024-03-03");
    expect(lastEmitted().intakeDate).toBe("2024-03-03");
  });

  it("lets incoming data overwrite the matching fields", () => {
    const { rerender } = renderSection();
    textIn(document.body, "Intake Date", "2024-03-03");
    rerenderWith(rerender, {
      data: {
        clientFullName: "Ada Lovelace",
        clientBackground: "<p>From the server</p>",
        intakeDate: "2024-04-04",
        referralSource: "school",
        serviceLocation: "clinic",
        otherClientInformation: "<p>Notes</p>",
      },
    });
    expect(screen.getByLabelText("Client Background")).toHaveValue("<p>From the server</p>");
    expect(field(document.body, "Intake Date").querySelector("input")).toHaveValue("2024-04-04");
    expect(field(document.body, "Referral Source")).toHaveTextContent("School/School District");
    expect(field(document.body, "Service Location")).toHaveTextContent("Clinic/Center");
    expect(screen.getByLabelText("Other client information")).toHaveValue("<p>Notes</p>");
  });

  // Reports written while Service Location was a multi-select stored an array.
  it("takes the first location from a report saved with an array", () => {
    // Nothing auto-populated changed, so the section does not re-emit; the
    // rendered choice is what proves the array was collapsed.
    renderSection({ data: { serviceLocation: ["clinic", "school"] } });
    expect(field(document.body, "Service Location")).toHaveTextContent("Clinic/Center");
  });

  it("falls back to nothing chosen when that array is empty", () => {
    renderSection({ data: { serviceLocation: [] } });
    expect(field(document.body, "Service Location")).toHaveTextContent("Select an option");
  });

  it("accepts an explicitly emptied background rather than falling back", () => {
    const { rerender } = renderSection();
    fireEvent.change(screen.getByLabelText("Client Background"), {
      target: { value: "<p>Typed</p>" },
    });
    rerenderWith(rerender, {
      data: { clientFullName: "Ada", clientBackground: "", otherClientInformation: "" },
    });
    expect(screen.getByLabelText("Client Background")).toHaveValue("");
    expect(screen.getByLabelText("Other client information")).toHaveValue("");
  });

  it("keeps the existing cards when the new data carries an empty diagnosis list", () => {
    const { rerender } = renderSection({ data: { diagnoses: [savedDiagnosis()] } });
    expect(field(diagnosisCards()[0], "Diagnosis Name").querySelector("input")).toHaveValue(
      "Autism spectrum disorder"
    );
    rerenderWith(rerender, { data: { clientFullName: "Ada", diagnoses: [] } });
    expect(diagnosisCards()).toHaveLength(1);
    expect(field(diagnosisCards()[0], "Diagnosis Name").querySelector("input")).toHaveValue(
      "Autism spectrum disorder"
    );
  });
});

describe("the diagnosis cards", () => {
  it("starts with one blank numbered card", () => {
    renderSection();
    expect(diagnosisCards()).toHaveLength(1);
    expect(screen.getByText("Diagnosis 1")).toBeInTheDocument();
    expect(field(diagnosisCards()[0], "Diagnosis Name").querySelector("input")).toHaveValue("");
  });

  it("renders every saved diagnosis in order", () => {
    renderSection({
      data: { diagnoses: [savedDiagnosis(), savedDiagnosis({ id: 2, diagnosisName: "ADHD" })] },
    });
    expect(diagnosisCards()).toHaveLength(2);
    expect(screen.getByText("Diagnosis 2")).toBeInTheDocument();
    expect(field(diagnosisCards()[1], "Diagnosis Name").querySelector("input")).toHaveValue("ADHD");
  });

  it("appends a blank card and emits the longer list", () => {
    renderSection({ data: { diagnoses: [savedDiagnosis()] } });
    fireEvent.click(screen.getByRole("button", { name: "Add a new diagnosis" }));
    expect(diagnosisCards()).toHaveLength(2);
    expect(lastEmitted().diagnoses).toHaveLength(2);
    expect(lastEmitted().diagnoses[1]).toMatchObject({ diagnosisName: "", primaryDiagnosis: "" });
  });

  it("edits only the card that was touched", () => {
    renderSection({
      data: { diagnoses: [savedDiagnosis(), savedDiagnosis({ id: 2, diagnosisName: "ADHD" })] },
    });
    textIn(diagnosisCards()[1], "Diagnosis Name", "ADHD, combined type");
    textIn(diagnosisCards()[1], "Diagnosis Code", "F90.2");
    textIn(diagnosisCards()[1], "Diagnosis Date", "2024-02-02");
    textIn(diagnosisCards()[1], "Diagnosed by", "Dr Patel");
    fireEvent.change(within(diagnosisCards()[1]).getByLabelText("Diagnosis Description"), {
      target: { value: "<p>Updated</p>" },
    });
    fireEvent.click(
      within(field(diagnosisCards()[1], "Primary diagnosis")).getAllByRole("radio")[0]
    );

    const [first, second] = lastEmitted().diagnoses;
    expect(first.diagnosisName).toBe("Autism spectrum disorder");
    expect(second).toMatchObject({
      diagnosisName: "ADHD, combined type",
      diagnosisCode: "F90.2",
      diagnosisDate: "2024-02-02",
      diagnosedBy: "Dr Patel",
      diagnosisDescription: "<p>Updated</p>",
      primaryDiagnosis: "no",
    });
  });

  it("removes the card that was asked for", () => {
    renderSection({
      data: { diagnoses: [savedDiagnosis(), savedDiagnosis({ id: 2, diagnosisName: "ADHD" })] },
    });
    fireEvent.click(
      within(diagnosisCards()[0]).getByRole("button", { name: "Delete diagnosis" })
    );
    expect(diagnosisCards()).toHaveLength(1);
    expect(lastEmitted().diagnoses).toEqual([savedDiagnosis({ id: 2, diagnosisName: "ADHD" })]);
  });

  it("refuses to remove the only card", () => {
    renderSection({ data: { diagnoses: [savedDiagnosis()] } });
    fireEvent.click(screen.getByRole("button", { name: "Delete diagnosis" }));
    expect(toastMock.showToast).toHaveBeenCalledWith("You must have at least one diagnosis");
    expect(diagnosisCards()).toHaveLength(1);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("the section's own fields", () => {
  it("emits the whole section on every edit", () => {
    renderSection();
    textIn(document.body, "Intake Date", "2024-01-10");
    expect(lastEmitted().intakeDate).toBe("2024-01-10");

    pick(document.body, "Referral Source", "Pediatrician");
    expect(lastEmitted().referralSource).toBe("pediatrician");

    fireEvent.change(screen.getByLabelText("Other client information"), {
      target: { value: "<p>Sibling in the same clinic</p>" },
    });
    expect(lastEmitted()).toMatchObject({
      intakeDate: "2024-01-10",
      referralSource: "pediatrician",
      otherClientInformation: "<p>Sibling in the same clinic</p>",
    });
  });

  // The field is seeded "", validated as `Yup.string()` and loaded from the
  // server as a scalar, so it stores one location rather than a list.
  it("stores the service location as a single value", () => {
    renderSection();
    pick(document.body, "Service Location", "Telehealth");
    expect(lastEmitted().serviceLocation).toBe("telehealth");

    pick(document.body, "Service Location", "School");
    expect(lastEmitted().serviceLocation).toBe("school");
  });
});

describe("read-only mode", () => {
  it("hides the add, delete and remove-section buttons", () => {
    renderSection({ data: { diagnoses: [savedDiagnosis()] }, isReadOnly: true, onRemoveSection });
    expect(screen.queryByRole("button", { name: "Delete diagnosis" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add a new diagnosis" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Section" })).not.toBeInTheDocument();
  });

  it("marks the diagnosis inputs read-only and refuses an edit anyway", () => {
    renderSection({ data: { diagnoses: [savedDiagnosis()] }, isReadOnly: true });
    const name = field(diagnosisCards()[0], "Diagnosis Name").querySelector("input");
    expect(name).toHaveAttribute("readonly");
    // jsdom dispatches a change on a readonly input regardless, so the guard
    // inside the change handler is what is being checked here.
    textIn(diagnosisCards()[0], "Diagnosis Name", "Something else");
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("removing the whole section", () => {
  it("offers the remove button only when the parent supplied a handler", () => {
    const { unmount } = renderSection();
    expect(screen.queryByRole("button", { name: "Remove Section" })).not.toBeInTheDocument();
    unmount();

    renderSection({ onRemoveSection });
    fireEvent.click(screen.getByRole("button", { name: "Remove Section" }));
    expect(onRemoveSection).toHaveBeenCalledTimes(1);
  });
});

describe("a profile that arrives one field at a time", () => {
  it("pushes upward when the date of birth is the only thing known", () => {
    // The push is gated on any one of the three auto fields being filled, so a
    // profile carrying nothing but a birth date still has to reach the parent.
    renderSection({ data: { dateOfBirth: "2015-04-02" } });
    expect(autoValue("Client Full Name")).toBe("(Auto populated from client profile)");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(lastEmitted()).toMatchObject({ clientFullName: "", dateOfBirth: "2015-04-02" });
  });

  it("pushes upward when the gender is the only thing known", () => {
    renderSection({ data: { gender: "Female" } });
    expect(autoValue("Gender")).toBe("Female");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(lastEmitted()).toMatchObject({
      clientFullName: "",
      dateOfBirth: "",
      gender: "Female",
    });
  });
});

describe("the messages a diagnosis card puts up when a field is left empty", () => {
  const blankCard = (over) => ({
    data: { diagnoses: [savedDiagnosis({ ...over })] },
  });

  it.each([
    ["Diagnosis Name", { diagnosisName: "" }, "Diagnosis name is required"],
    ["Diagnosis Code", { diagnosisCode: "" }, "Diagnosis code is required"],
    ["Diagnosed by", { diagnosedBy: "" }, "Diagnosed by is required"],
  ])("complains about %s once the field is left", async (label, over, message) => {
    renderSection(blankCard(over));
    leaveField(diagnosisCards()[0], label);
    await waitFor(() => expect(sectionErrors()).toEqual([message]));
  });

  it("falls back to yup's own wording for an empty diagnosis date", async () => {
    renderSection(blankCard({ diagnosisDate: "" }));
    leaveField(diagnosisCards()[0], "Diagnosis Date");
    // The field is a Yup.date, and an empty string casts to an Invalid Date
    // before the required rule is ever reached, so the friendly message the
    // schema carries never gets used.
    await waitFor(() => expect(sectionErrors()).toHaveLength(1));
    expect(sectionErrors()[0]).toContain("must be a `date` type");
  });

  it("takes the message back down as soon as the field is filled in", async () => {
    renderSection(blankCard({ diagnosisName: "" }));
    leaveField(diagnosisCards()[0], "Diagnosis Name");
    await waitFor(() => expect(sectionErrors()).toEqual(["Diagnosis name is required"]));

    textIn(diagnosisCards()[0], "Diagnosis Name", "Autism spectrum disorder");
    await waitFor(() => expect(sectionErrors()).toEqual([]));
  });

  it("puts the message on the card that was left, not its neighbour", async () => {
    renderSection({
      data: {
        diagnoses: [
          savedDiagnosis({ diagnosisName: "" }),
          savedDiagnosis({ id: 2, diagnosisName: "" }),
        ],
      },
    });
    leaveField(diagnosisCards()[1], "Diagnosis Name");
    await waitFor(() =>
      expect(
        diagnosisCards()[1].querySelectorAll(".report-builder-error")
      ).toHaveLength(1)
    );
    expect(diagnosisCards()[0].querySelectorAll(".report-builder-error")).toHaveLength(0);
  });

  it("says nothing about the primary diagnosis radios, which are never left", async () => {
    renderSection(blankCard({ diagnosisName: "", primaryDiagnosis: "" }));
    leaveField(diagnosisCards()[0], "Diagnosis Name");
    await waitFor(() => expect(sectionErrors()).toEqual(["Diagnosis name is required"]));
    // The radio group is handed no blur, so its own message has no route onto
    // the card however the field is driven.
    fireEvent.blur(
      diagnosisCards()[0].querySelector(".report-builder-radio-input")
    );
    expect(sectionErrors()).toEqual(["Diagnosis name is required"]);
  });
});

describe("the messages the section's own fields put up", () => {
  it("complains about a missing intake date once the field is left, then clears", async () => {
    renderSection();
    leaveField(document.body, "Intake Date");
    // Same Yup.date wording as the diagnosis date: an empty string never
    // reaches the required rule.
    await waitFor(() => expect(sectionErrors()).toHaveLength(1));
    expect(sectionErrors()[0]).toContain("must be a `date` type");

    textIn(document.body, "Intake Date", "2024-01-15");
    await waitFor(() => expect(sectionErrors()).toEqual([]));
    expect(lastEmitted().intakeDate).toBe("2024-01-15");
  });

  it("says nothing about the referral source or the service location", async () => {
    renderSection();
    leaveField(document.body, "Intake Date");
    await waitFor(() => expect(sectionErrors()).toHaveLength(1));
    // Neither picker is handed a blur, so neither is ever marked touched and
    // their messages cannot render.
    const referral = field(document.body, "Referral Source");
    fireEvent.click(referral.querySelector(".report-builder-select-button"));
    fireEvent.click(referral.querySelector(".report-builder-select-overlay"));
    expect(sectionErrors()).toHaveLength(1);
  });
});

describe("read-only mode and validation", () => {
  it("locks every editable control", () => {
    renderSection({ data: { diagnoses: [savedDiagnosis()] }, isReadOnly: true });
    document.body
      .querySelectorAll(".report-builder-input")
      .forEach((i) => expect(i).toHaveAttribute("readonly"));
    document.body
      .querySelectorAll(".report-builder-select-button")
      .forEach((b) => expect(b).toBeDisabled());
    document.body
      .querySelectorAll(".report-builder-radio-input")
      .forEach((r) => expect(r).toBeDisabled());
  });

  it("refuses to mark a diagnosis field touched when the report is read-only", async () => {
    renderSection({
      data: { diagnoses: [savedDiagnosis({ diagnosisName: "" })] },
      isReadOnly: true,
    });
    // A readonly input still emits blur, so the guard at the top of the blur
    // handler is what keeps the message off a report nobody can edit.
    leaveField(diagnosisCards()[0], "Diagnosis Name");
    await waitFor(() => expect(sectionErrors()).toEqual([]));
  });
});
