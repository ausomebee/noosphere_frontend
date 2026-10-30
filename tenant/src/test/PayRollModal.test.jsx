import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/**
 * The payroll card on a staff member's Organisation profile, in both its modes:
 * "view" is the same markup with the inputs read-only and an extra Payroll
 * Details block, "edit" adds the Save button and the two validation guards.
 *
 * `payrollSettings` is required rather than defaulted and it sits in the effect
 * that seeds the form, so every fixture here is a module-level constant — a
 * fresh literal per render would re-seed the form on every pass.
 *
 * "Minimum Hours" is hidden for HOURLY and DAILY staff and, when hidden, is
 * sent as null instead of whatever the form is holding; that same flag also
 * decides whether the minimum-hours guard runs at all.
 *
 * The inputs carry labels with no `htmlFor`, so they are read positionally off
 * `.custom-time-input-two` — rate per hour first, minimum hours second.
 */

import PayrollModal from "../Components/ReusableModal/OrganizationModal/PayRollModal";

const FULL_SETTINGS = {
  id: "p1",
  paymentSchedule: "SALARIED",
  ratePerHour: "40",
  minimumHours: "160",
  // One item per arm of formatRate, including a type it does not know and an
  // item with no rate object at all.
  incomeItems: [
    { id: "i1", name: "Transport", type: "Flat Rate", rate: { rate: 250 } },
    { id: "i2", name: "Pension", type: "Percentage based", rate: { unit: 8 } },
    { id: "i3", name: "Overtime", type: "Time based", rate: { unit: 20, duration: "minute" } },
    { id: "i4", name: "Mystery", type: "Something else" },
  ],
  deductions: [
    { id: "d1", name: "Tax", type: "Flat Rate", rate: {} },
    { id: "d2", name: "Levy", type: "Percentage based", rate: {} },
    { id: "d3", name: "Union", type: "Time based", rate: {} },
  ],
};
const EMPTY_SETTINGS = {
  id: "p2",
  paymentSchedule: "",
  ratePerHour: "",
  minimumHours: "",
  incomeItems: [],
  deductions: [],
};
// A staff member whose payroll record predates the item lists entirely.
const BARE_SETTINGS = { id: "p3" };
const HOURLY_SETTINGS = {
  id: "p4",
  paymentSchedule: "HOURLY",
  ratePerHour: "25",
  minimumHours: "abc",
  incomeItems: [],
  deductions: [],
};
const DAILY_SETTINGS = { id: "p5", paymentSchedule: "DAILY", ratePerHour: "30" };
const CYCLE = { payrollDate: "05/01/2026", payPeriod: "May", totalPayrollValue: "$5,000" };
const BLANK_CYCLE = {};

const onClose = vi.fn();
const onSave = vi.fn();

const renderModal = (props = {}) =>
  render(
    <PayrollModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      modalMode="edit"
      selectedPayroll={null}
      payrollSettings={FULL_SETTINGS}
      tenantStaffId="staff-1"
      {...props}
    />
  );

const inputs = () => document.body.querySelectorAll(".custom-time-input-two");
const rateInput = () => inputs()[0];
const minHoursInput = () => inputs()[1];
const save = () => screen.getByRole("button", { name: "Save" });

beforeEach(() => {
  vi.clearAllMocks();
  onSave.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the two modes", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText("Edit Payroll Settings")).not.toBeInTheDocument();
  });

  it("offers Save while editing", () => {
    renderModal();
    expect(screen.getByText("Edit Payroll Settings")).toBeInTheDocument();
    expect(save()).toBeInTheDocument();
    expect(rateInput()).not.toHaveAttribute("readonly");
  });

  it("drops Save and locks the inputs while viewing", () => {
    renderModal({ modalMode: "view" });
    expect(screen.getByText("View Payroll Settings")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(rateInput()).toHaveAttribute("readonly");
  });

  it("ignores typing in view mode", () => {
    renderModal({ modalMode: "view" });
    fireEvent.change(rateInput(), { target: { value: "99" } });
    expect(rateInput()).toHaveValue("40");
  });

  it("closes from the Close button", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("seeding the form from the stored settings", () => {
  it("shows the stored rate and minimum hours", () => {
    renderModal();
    expect(rateInput()).toHaveValue("40");
    expect(minHoursInput()).toHaveValue("160");
  });

  it("falls back to zero for a record with blank figures", () => {
    renderModal({ payrollSettings: EMPTY_SETTINGS });
    expect(rateInput()).toHaveValue("0");
    expect(minHoursInput()).toHaveValue("0");
  });

  it("hides minimum hours for an hourly staff member", () => {
    renderModal({ payrollSettings: HOURLY_SETTINGS });
    expect(screen.queryByText("Minimum Hours")).not.toBeInTheDocument();
    expect(inputs()).toHaveLength(1);
  });

  it("hides minimum hours for a daily staff member", () => {
    renderModal({ payrollSettings: DAILY_SETTINGS });
    expect(screen.queryByText("Minimum Hours")).not.toBeInTheDocument();
  });
});

describe("the income item and deduction lists", () => {
  it("prints one row per item, formatted by rate type", () => {
    renderModal();
    expect(screen.getByDisplayValue("$250")).toBeInTheDocument();
    expect(screen.getByDisplayValue("8%")).toBeInTheDocument();
    expect(screen.getByDisplayValue("$20 per minute")).toBeInTheDocument();
    // A type the formatter does not know, and an item with no rate object.
    expect(screen.getByDisplayValue("N/A")).toBeInTheDocument();
  });

  it("zeroes the figures a rate object leaves out and defaults the duration to an hour", () => {
    renderModal();
    expect(screen.getByDisplayValue("$0")).toBeInTheDocument();
    expect(screen.getByDisplayValue("0%")).toBeInTheDocument();
    expect(screen.getByDisplayValue("$0 per hour")).toBeInTheDocument();
  });

  it("shows an empty state for each list when both are empty", () => {
    renderModal({ payrollSettings: EMPTY_SETTINGS });
    expect(screen.getByText("No income items assigned")).toBeInTheDocument();
    expect(screen.getByText("No deductions assigned")).toBeInTheDocument();
  });

  it("shows the same empty states when the lists are missing entirely", () => {
    renderModal({ payrollSettings: BARE_SETTINGS });
    expect(screen.getByText("No income items assigned")).toBeInTheDocument();
    expect(screen.getByText("No deductions assigned")).toBeInTheDocument();
  });
});

describe("the payroll details block", () => {
  it("appears only when a cycle was clicked in view mode", () => {
    renderModal({ modalMode: "view", selectedPayroll: CYCLE });
    expect(screen.getByText("Payroll Details")).toBeInTheDocument();
    expect(screen.getByText("05/01/2026")).toBeInTheDocument();
    expect(screen.getByText("$5,000")).toBeInTheDocument();
  });

  it("falls back to N/A for every figure the cycle is missing", () => {
    renderModal({ modalMode: "view", selectedPayroll: BLANK_CYCLE });
    expect(screen.getAllByText("N/A")).toHaveLength(3);
  });

  it("stays hidden in view mode with no cycle selected", () => {
    renderModal({ modalMode: "view" });
    expect(screen.queryByText("Payroll Details")).not.toBeInTheDocument();
  });

  it("stays hidden in edit mode even when a cycle is passed", () => {
    renderModal({ selectedPayroll: CYCLE });
    expect(screen.queryByText("Payroll Details")).not.toBeInTheDocument();
  });
});

describe("saving", () => {
  it("sends the edited figures and the item ids", async () => {
    renderModal();
    fireEvent.change(rateInput(), { target: { value: "45" } });
    fireEvent.change(minHoursInput(), { target: { value: "150" } });
    fireEvent.click(save());
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        id: "p1",
        payroll: {
          id: "p1",
          paymentSchedule: "SALARIED",
          ratePerHour: "45",
          minimumHours: "150",
          incomeItems: [{ id: "i1" }, { id: "i2" }, { id: "i3" }, { id: "i4" }],
          deductions: [{ id: "d1" }, { id: "d2" }, { id: "d3" }],
          tenantStaffId: "staff-1",
        },
      })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("sends empty item lists for a record that has none", async () => {
    renderModal({ payrollSettings: BARE_SETTINGS });
    fireEvent.change(rateInput(), { target: { value: "10" } });
    fireEvent.click(save());
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          payroll: expect.objectContaining({ incomeItems: [], deductions: [] }),
        })
      )
    );
  });

  it("nulls the minimum hours for a staff member paid hourly", async () => {
    renderModal({ payrollSettings: HOURLY_SETTINGS });
    fireEvent.click(save());
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          payroll: expect.objectContaining({ minimumHours: null, ratePerHour: "25" }),
        })
      )
    );
  });

  it("refuses a blank rate per hour", async () => {
    renderModal();
    fireEvent.change(rateInput(), { target: { value: "" } });
    fireEvent.click(save());
    expect(await screen.findByText("Rate per hour must be a valid number")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a rate per hour that is not a number", async () => {
    renderModal();
    fireEvent.change(rateInput(), { target: { value: "abc" } });
    fireEvent.click(save());
    expect(await screen.findByText("Rate per hour must be a valid number")).toBeInTheDocument();
  });

  it("refuses minimum hours that are not a number", async () => {
    renderModal();
    fireEvent.change(minHoursInput(), { target: { value: "abc" } });
    fireEvent.click(save());
    expect(await screen.findByText("Minimum hours must be a valid number")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("accepts blank minimum hours, since the guard only checks a filled field", async () => {
    renderModal();
    fireEvent.change(minHoursInput(), { target: { value: "" } });
    fireEvent.click(save());
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ payroll: expect.objectContaining({ minimumHours: "" }) })
      )
    );
  });

  it("shows the error the save threw and stays open", async () => {
    onSave.mockRejectedValue(new Error("Server said no"));
    renderModal();
    fireEvent.click(save());
    expect(await screen.findByText("Server said no")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when the failure carries none", async () => {
    onSave.mockRejectedValue({});
    renderModal();
    fireEvent.click(save());
    expect(await screen.findByText("Failed to save payroll settings")).toBeInTheDocument();
  });

  it("clears a previous error when the modal is closed", async () => {
    onSave.mockRejectedValue(new Error("Server said no"));
    renderModal();
    fireEvent.click(save());
    await screen.findByText("Server said no");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByText("Server said no")).not.toBeInTheDocument();
  });
});
