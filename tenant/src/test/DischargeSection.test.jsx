import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/**
 * The clinical report builder's Discharge section: nine controlled fields over
 * one local `formData` object, with per-field yup validation that only runs
 * once a field has been blurred.
 *
 * The section owns no data of its own -- every keystroke is pushed straight up
 * through `onChange` with the whole updated object -- so the assertions read
 * the last call to that prop rather than the DOM. The two required fields are
 * the only ones with a visible error, and their error is gated on BOTH `touched`
 * and `errors`, which is why the tests blur before they expect a message and
 * why a change before the first blur is asserted to stay silent.
 *
 * Every child is replaced by a probe here: the real inputs are react-select and
 * a contenteditable rich text editor, neither of which adds anything to what
 * this section actually decides. Each probe is addressed by its label so the
 * eight otherwise identical rich text editors stay distinguishable.
 */

vi.mock("../Components/Input/RichTextEditor/RichTextEditorInput", () => ({
  default: ({ label, value, onChange, readOnly, placeholder }) => (
    <textarea
      aria-label={label}
      placeholder={placeholder}
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock("../Components/Input/ReportInput/ReportBuilderInputs", () => ({
  ReportSelect: ({ label, options, value, onChange, onBlur, readOnly, required }) => (
    <select
      aria-label={label}
      data-required={String(!!required)}
      data-readonly={String(!!readOnly)}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
    >
      <option value="">Select an option</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
  ReportTextInput: ({ label, type, value, onChange, onBlur, readOnly, required }) => (
    <input
      aria-label={label}
      type={type}
      data-required={String(!!required)}
      readOnly={readOnly}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
    />
  ),
  ReportFileUpload: ({ label, value, onChange, readOnly, acceptedFormats, multiple }) => (
    <div>
      <span data-testid="upload-formats">{acceptedFormats}</span>
      <span data-testid="upload-multiple">{String(!!multiple)}</span>
      <span data-testid="upload-count">{value.length}</span>
      <button
        type="button"
        aria-label={label}
        disabled={readOnly}
        onClick={() => onChange([...value, { name: `file-${value.length}.pdf` }])}
      >
        attach
      </button>
    </div>
  ),
}));

import DischargeSection from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/DischargeSection/DischargeSection";

const renderSection = (props = {}) => {
  const onChange = vi.fn();
  const onRemoveSection = vi.fn();
  const view = render(
    <DischargeSection onChange={onChange} onRemoveSection={onRemoveSection} {...props} />
  );
  return { ...view, onChange, onRemoveSection };
};

const reason = () => screen.getByLabelText("Discharge reason (if applicable)");
const date = () => screen.getByLabelText("Discharge date");
const editor = (label) => screen.getByLabelText(label);
const lastPayload = (onChange) => onChange.mock.calls[onChange.mock.calls.length - 1][0];
const errorTexts = () =>
  Array.from(document.body.querySelectorAll(".report-builder-error")).map((e) => e.textContent);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the initial form", () => {
  it("opens every field blank when given no data at all", () => {
    render(<DischargeSection onChange={vi.fn()} />);
    expect(reason()).toHaveValue("");
    expect(date()).toHaveValue("");
    expect(editor("Progress compared to baseline")).toHaveValue("");
    expect(editor("Discharge criteria")).toHaveValue("");
    expect(editor("Discharge summary")).toHaveValue("");
    expect(editor("Post-discharge recommendations")).toHaveValue("");
    expect(editor("Transition supports")).toHaveValue("");
    expect(editor("Review and discharge notes")).toHaveValue("");
    expect(screen.getByTestId("upload-count")).toHaveTextContent("0");
  });

  it("seeds every field from a stored section", () => {
    renderSection({
      data: {
        dischargeReason: "plateau",
        dischargeDate: "2024-06-01",
        progressCompared: "Steady gains",
        dischargeCriteria: "Three months at criterion",
        dischargeSummary: "Discharged to school services",
        postDischargeRecommendations: "Annual review",
        transitionSupports: "Warm handover",
        supportingDocuments: [{ name: "report.pdf" }],
        reviewNotes: "Signed off by BCBA",
      },
    });
    expect(reason()).toHaveValue("plateau");
    expect(date()).toHaveValue("2024-06-01");
    expect(editor("Progress compared to baseline")).toHaveValue("Steady gains");
    expect(editor("Discharge criteria")).toHaveValue("Three months at criterion");
    expect(editor("Discharge summary")).toHaveValue("Discharged to school services");
    expect(editor("Post-discharge recommendations")).toHaveValue("Annual review");
    expect(editor("Transition supports")).toHaveValue("Warm handover");
    expect(editor("Review and discharge notes")).toHaveValue("Signed off by BCBA");
    expect(screen.getByTestId("upload-count")).toHaveTextContent("1");
  });

  it("marks the two compulsory fields and configures the uploader", () => {
    renderSection();
    expect(reason()).toHaveAttribute("data-required", "true");
    expect(date()).toHaveAttribute("data-required", "true");
    expect(screen.getByTestId("upload-formats")).toHaveTextContent("PDF, DOCX, PNG, JPG");
    expect(screen.getByTestId("upload-multiple")).toHaveTextContent("true");
  });

  it("offers the eight discharge reasons", () => {
    renderSection();
    const labels = Array.from(reason().options).map((o) => o.textContent);
    expect(labels).toEqual([
      "Select an option",
      "Goals met",
      "Plateau reached",
      "Transition to another service",
      "Family request",
      "Insurance limitation",
      "Non-compliance/attendance issues",
      "Client no longer eligible",
      "Other",
    ]);
  });
});

describe("reporting changes upward", () => {
  it("sends the whole section on every edit, not just the changed field", () => {
    const { onChange } = renderSection({ data: { reviewNotes: "Existing note" } });
    fireEvent.change(reason(), { target: { value: "goals-met" } });
    expect(lastPayload(onChange)).toMatchObject({
      dischargeReason: "goals-met",
      reviewNotes: "Existing note",
      supportingDocuments: [],
    });
  });

  it("carries a date through", () => {
    const { onChange } = renderSection();
    fireEvent.change(date(), { target: { value: "2024-07-04" } });
    expect(lastPayload(onChange).dischargeDate).toBe("2024-07-04");
  });

  it("carries each rich text field through under its own key", () => {
    const { onChange } = renderSection();
    fireEvent.change(editor("Progress compared to baseline"), { target: { value: "A" } });
    expect(lastPayload(onChange).progressCompared).toBe("A");
    fireEvent.change(editor("Discharge criteria"), { target: { value: "B" } });
    expect(lastPayload(onChange).dischargeCriteria).toBe("B");
    fireEvent.change(editor("Discharge summary"), { target: { value: "C" } });
    expect(lastPayload(onChange).dischargeSummary).toBe("C");
    fireEvent.change(editor("Post-discharge recommendations"), { target: { value: "D" } });
    expect(lastPayload(onChange).postDischargeRecommendations).toBe("D");
    fireEvent.change(editor("Transition supports"), { target: { value: "E" } });
    expect(lastPayload(onChange).transitionSupports).toBe("E");
    fireEvent.change(editor("Review and discharge notes"), { target: { value: "F" } });
    expect(lastPayload(onChange).reviewNotes).toBe("F");
  });

  it("accumulates attached documents", () => {
    const { onChange } = renderSection();
    fireEvent.click(screen.getByRole("button", { name: "Supporting documents" }));
    expect(lastPayload(onChange).supportingDocuments).toEqual([{ name: "file-0.pdf" }]);
    fireEvent.click(screen.getByRole("button", { name: "Supporting documents" }));
    expect(lastPayload(onChange).supportingDocuments).toHaveLength(2);
  });
});

describe("validation", () => {
  it("stays silent about an empty reason until the field is left", () => {
    renderSection();
    fireEvent.change(reason(), { target: { value: "" } });
    expect(errorTexts()).toEqual([]);
  });

  it("complains once a blank reason is blurred", async () => {
    renderSection();
    fireEvent.blur(reason());
    expect(await screen.findByText("Discharge reason is required")).toBeInTheDocument();
  });

  it("complains once a blank date is blurred", async () => {
    renderSection();
    fireEvent.blur(date());
    await waitFor(() => expect(errorTexts()).toHaveLength(1));
    // The schema casts before it checks `required`, so an empty date trips the
    // type error rather than the friendly "Discharge date is required" text.
    expect(errorTexts()[0]).toContain("must be a `date` type");
  });

  it("clears the complaint as soon as a touched field is filled in", async () => {
    renderSection();
    fireEvent.blur(reason());
    await screen.findByText("Discharge reason is required");
    fireEvent.change(reason(), { target: { value: "insurance" } });
    await waitFor(() => expect(errorTexts()).toEqual([]));
  });

  it("re-complains when a touched field is emptied again", async () => {
    renderSection({ data: { dischargeReason: "other" } });
    fireEvent.blur(reason());
    await waitFor(() => expect(errorTexts()).toEqual([]));
    fireEvent.change(reason(), { target: { value: "" } });
    expect(await screen.findByText("Discharge reason is required")).toBeInTheDocument();
  });

  it("accepts a real date on blur without complaint", async () => {
    renderSection();
    fireEvent.change(date(), { target: { value: "2024-07-04" } });
    fireEvent.blur(date());
    await waitFor(() => expect(errorTexts()).toEqual([]));
  });

  it("validates the two required fields independently", async () => {
    renderSection();
    fireEvent.blur(reason());
    fireEvent.blur(date());
    await waitFor(() => expect(errorTexts()).toHaveLength(2));
    fireEvent.change(reason(), { target: { value: "goals-met" } });
    await waitFor(() => expect(errorTexts()).toHaveLength(1));
  });
});

describe("read-only mode", () => {
  it("hands the read-only flag down to every input", () => {
    renderSection({ isReadOnly: true });
    expect(reason()).toHaveAttribute("data-readonly", "true");
    expect(date()).toHaveAttribute("readonly");
    expect(editor("Discharge summary")).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "Supporting documents" })).toBeDisabled();
  });

  it("leaves the inputs writable by default", () => {
    renderSection();
    expect(reason()).toHaveAttribute("data-readonly", "false");
    expect(date()).not.toHaveAttribute("readonly");
  });
});

describe("removing the section", () => {
  it("offers the remove button to an editable section", () => {
    const { onRemoveSection } = renderSection();
    fireEvent.click(screen.getByRole("button", { name: "Remove Section" }));
    expect(onRemoveSection).toHaveBeenCalled();
  });

  it("hides the remove button while read-only", () => {
    renderSection({ isReadOnly: true });
    expect(screen.queryByRole("button", { name: "Remove Section" })).not.toBeInTheDocument();
  });

  it("hides the remove button when nothing is listening for it", () => {
    render(<DischargeSection onChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Remove Section" })).not.toBeInTheDocument();
  });
});
