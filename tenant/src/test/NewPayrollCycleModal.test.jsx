import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/**
 * The payroll cycle add/edit modal: five fields behind a yup schema, and a
 * `mode` prop that swings the title, the default values and whether anything
 * can be typed at all.
 *
 * Most of the branches live in `transformInitialData`, which is only reached in
 * edit mode: the compensation type it shows is looked up under three different
 * keys in turn, the interval falls back to one only when it is genuinely absent
 * rather than zero, and `autoRun` is checked against `undefined` so a stored
 * `false` survives.
 *
 * `initialData` defaults to a fresh `{}` and sits in the reset effect's
 * dependency list, so every render here passes one stable object; omitting it
 * spins the component forever.
 *
 * The fields carry no `htmlFor`, so they are addressed by placeholder, and the
 * compensation picker is a react-select whose menu is portalled to the body —
 * it is driven by keyboard off the hidden combobox.
 */

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

import PayrollCycleModal from "../Components/ReusableModal/PayrollModal/NewPayrollCycleModal";

const NOTHING_STORED = {};

const renderModal = ({ initialData = NOTHING_STORED, ...props } = {}) => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const view = render(
    <PayrollCycleModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      initialData={initialData}
      {...props}
    />
  );
  return { ...view, onSave, onClose };
};

const nameField = () => screen.getByPlaceholderText("Enter Name");
const intervalField = () => screen.getByPlaceholderText("Enter Interval");
const dateField = () => screen.getByPlaceholderText("Select a Date");
const autoRunBox = () => screen.getByRole("checkbox");
// The label is replaced by a spinner mid-save, so the submit is found by type.
const saveButton = () => document.querySelector('button[type="submit"]');

// react-select keeps a hidden combobox; arrowing it open and pressing Enter
// picks the first option, which is enough to satisfy the schema.
const pickFirstCompensationType = () => {
  const combobox = screen.getByRole("combobox");
  fireEvent.keyDown(combobox, { key: "ArrowDown" });
  fireEvent.keyDown(combobox, { key: "Enter" });
};

const fillValidForm = () => {
  fireEvent.change(nameField(), { target: { value: "Fortnightly" } });
  pickFirstCompensationType();
  fireEvent.change(intervalField(), { target: { value: "14" } });
  fireEvent.change(dateField(), { target: { value: "2024-06-01" } });
};

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the two modes it opens in", () => {
  it("titles a fresh cycle as an addition and starts every field empty", () => {
    renderModal();
    expect(screen.getByText("Add Payroll Cycle")).toBeInTheDocument();
    expect(nameField()).toHaveValue("");
    expect(intervalField()).toHaveValue(1);
    expect(dateField()).toHaveValue("");
    expect(autoRunBox()).not.toBeChecked();
  });

  it("titles an existing cycle as an edit and fills it in", () => {
    renderModal({
      mode: "edit",
      initialData: {
        name: "Monthly",
        appliesTo: "SALARIED",
        intervals: 30,
        startDate: "2024-01-01",
        autoRun: true,
      },
    });
    expect(screen.getByText("Edit Payroll Cycle")).toBeInTheDocument();
    expect(nameField()).toHaveValue("Monthly");
    expect(intervalField()).toHaveValue(30);
    expect(dateField()).toHaveValue("2024-01-01");
    expect(autoRunBox()).toBeChecked();
    expect(screen.getByText("Salaried")).toBeInTheDocument();
  });

  it("locks every control in view mode", () => {
    renderModal({ mode: "view" });
    expect(nameField()).toBeDisabled();
    expect(intervalField()).toBeDisabled();
    expect(dateField()).toBeDisabled();
    expect(autoRunBox()).toBeDisabled();
  });

  it("renders nothing while it is shut", () => {
    render(
      <PayrollCycleModal
        isOpen={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialData={NOTHING_STORED}
      />
    );
    expect(screen.queryByText("Add Payroll Cycle")).not.toBeInTheDocument();
  });
});

describe("the stored record it unpicks in edit mode", () => {
  const openWith = (initialData) => {
    renderModal({ mode: "edit", initialData });
  };

  it("reads the compensation type off the legacy key when the modern one is absent", () => {
    openWith({ name: "Weekly", compensationType: "HOURLY", startDate: "2024-02-01" });
    expect(screen.getByText("Hourly")).toBeInTheDocument();
  });

  it("falls back again to the compensation type id", () => {
    openWith({ name: "Weekly", compensationTypeId: "DAILY", startDate: "2024-02-01" });
    expect(screen.getByText("Daily")).toBeInTheDocument();
  });

  it("leaves the compensation picker empty when none of the three keys is set", () => {
    openWith({ name: "Weekly" });
    expect(screen.getByText("Select Compensation Type")).toBeInTheDocument();
  });

  it("keeps an interval of zero rather than defaulting it to one", () => {
    // The guard is `!= null`, so a stored zero has to survive; a `||` here
    // would silently promote it to the default interval.
    openWith({ name: "Weekly", intervals: 0 });
    expect(intervalField()).toHaveValue(0);
  });

  it("defaults the interval to one when the record carries none", () => {
    openWith({ name: "Weekly" });
    expect(intervalField()).toHaveValue(1);
  });

  it("keeps auto run switched off when the record says so", () => {
    openWith({ name: "Weekly", autoRun: false });
    expect(autoRunBox()).not.toBeChecked();
  });

  it("blanks a name and start date the record is missing", () => {
    openWith({ intervals: 7 });
    expect(nameField()).toHaveValue("");
    expect(dateField()).toHaveValue("");
  });
});

describe("validation", () => {
  it("refuses a cycle with nothing filled in and toasts the count", async () => {
    const { onSave } = renderModal();
    fireEvent.click(saveButton());
    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Applies To is required")).toBeInTheDocument();
    expect(screen.getByText("Start Date is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    expect(toast.showToast).toHaveBeenCalledWith(
      expect.stringContaining("fields need attention"),
      "error"
    );
  });

  it("refuses an interval shorter than a day", async () => {
    const { onSave } = renderModal();
    fillValidForm();
    fireEvent.change(intervalField(), { target: { value: "0" } });
    fireEvent.click(saveButton());
    expect(await screen.findByText("Interval must be at least 1 day")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses an interval that is not a number at all", async () => {
    const { onSave } = renderModal();
    fillValidForm();
    // A number input rejects letters outright and reports an empty value, so
    // the schema sees a blank where a number should be.
    fireEvent.change(intervalField(), { target: { value: "" } });
    fireEvent.click(saveButton());
    expect(await screen.findByText("Interval must be a number")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("saving", () => {
  it("hands the caller the whole cycle and shuts itself", async () => {
    const { onSave, onClose } = renderModal();
    fillValidForm();
    fireEvent.click(autoRunBox());
    fireEvent.click(saveButton());
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      name: "Fortnightly",
      appliesTo: "HOURLY",
      intervals: 14,
      startDate: "2024-06-01",
      autoRun: true,
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(nameField()).toHaveValue("");
  });

  it("stays open and toasts when the save is rejected", async () => {
    const { onSave, onClose } = renderModal();
    onSave.mockRejectedValue(new Error("server said no"));
    fillValidForm();
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to save payroll cycle", "error")
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(nameField()).toHaveValue("Fortnightly");
  });

  it("holds the save button shut until the request settles", async () => {
    let release;
    const { onSave } = renderModal();
    onSave.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    fillValidForm();
    fireEvent.click(saveButton());
    await waitFor(() => expect(saveButton()).toBeDisabled());
    release();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
  });
});

describe("closing", () => {
  it("empties the form and tells the caller when cancelled", () => {
    const { onClose } = renderModal();
    fireEvent.change(nameField(), { target: { value: "Half typed" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(nameField()).toHaveValue("");
  });

  it("empties the form on Escape too", () => {
    const { onClose } = renderModal();
    fireEvent.change(nameField(), { target: { value: "Half typed" } });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(nameField()).toHaveValue("");
  });

  it("reloads the record when reopened, dropping whatever was typed", () => {
    const stored = { name: "Monthly", appliesTo: "SALARIED", intervals: 30, startDate: "2024-01-01" };
    const { rerender } = render(
      <PayrollCycleModal
        isOpen
        mode="edit"
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialData={stored}
      />
    );
    fireEvent.change(nameField(), { target: { value: "Scribbled over" } });
    rerender(
      <PayrollCycleModal
        isOpen={false}
        mode="edit"
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialData={stored}
      />
    );
    rerender(
      <PayrollCycleModal
        isOpen
        mode="edit"
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialData={stored}
      />
    );
    expect(nameField()).toHaveValue("Monthly");
  });
});
