import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

import AddStaffModal from "../Components/ReusableModal/PayrollModal/AddStaffModal";

/**
 * The payroll "add staff to this run" picker: one multi-select fed by a fetch
 * of the staff on the given payment schedule, and a submit that hands the
 * chosen ids back to the caller.
 *
 * Everything the fetch needs arrives as props rather than from the auth store,
 * so the guard has three separate ways to skip the request and each is
 * reachable by leaving one prop off. The response shape is defensive on both
 * axes -- an axios envelope or a bare array, and a non-array of either -- so
 * each is driven through a different mocked return.
 *
 * The staff label falls through three sources: a stored `fullName`, the first
 * and last name joined, and finally "Unknown" for a record with neither. The
 * middle arm trims, so a record with only a surname still labels cleanly.
 */

const api = vi.hoisted(() => ({ GetStaffByPaymentSchedule: vi.fn() }));
vi.mock("../api/payrollApi", () => ({ default: api }));

const toast = vi.hoisted(() => ({ showToast: vi.fn(), showApiError: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: (...a) => toast.showApiError(...a),
}));

const validation = vi.hoisted(() => ({ showValidationErrors: vi.fn() }));
vi.mock("../Helper/formErrors", () => ({
  showValidationErrors: (...a) => validation.showValidationErrors(...a),
}));

const renderModal = (props = {}) => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const view = render(
    <AddStaffModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      compensationType="Bi-Weekly"
      tenantId="tenant-1"
      accessToken="at"
      refreshToken="rt"
      {...props}
    />
  );
  return { ...view, onSave, onClose };
};

const wrapper = () => document.body.querySelector(".select-input-wrapper");
const primary = () => document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.body.querySelector(".modal-btn-secondary");

const openMenu = () => {
  const input = wrapper().querySelector("input");
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
};

const menuText = () => {
  const menus = document.body.querySelectorAll(".rs__menu");
  const menu = menus[menus.length - 1];
  const options = menu.querySelectorAll(".rs__option");
  return options.length ? Array.from(options).map((o) => o.textContent) : [menu.textContent];
};

const choose = (label) => {
  openMenu();
  const menus = document.body.querySelectorAll(".rs__menu");
  const option = Array.from(
    menus[menus.length - 1].querySelectorAll(".rs__option")
  ).find((o) => o.textContent === label);
  if (!option) throw new Error(`no staff option "${label}"`);
  fireEvent.click(option);
};

const chips = () =>
  Array.from(document.body.querySelectorAll(".selected-label-item")).map((c) => c.textContent);

const submit = async () =>
  act(async () => {
    fireEvent.click(primary());
  });

const staff = (over = {}) => ({ id: "s-1", fullName: "Ada Lovelace", ...over });

beforeEach(() => {
  vi.clearAllMocks();
  api.GetStaffByPaymentSchedule.mockResolvedValue({ data: [staff()] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the modal shell", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(document.body.querySelector(".modal-content")).toBeNull();
    expect(api.GetStaffByPaymentSchedule).not.toHaveBeenCalled();
  });

  it("titles itself and labels its buttons", async () => {
    renderModal();
    await waitFor(() => expect(api.GetStaffByPaymentSchedule).toHaveBeenCalled());
    expect(document.body.querySelector(".modal-title-text")).toHaveTextContent(
      "Add Staff to Payroll"
    );
    expect(primary()).toHaveTextContent("Add Selected");
    expect(secondary()).toHaveTextContent("Cancel");
  });

  it("clears the picker and closes from Cancel", async () => {
    const { onClose } = renderModal();
    await waitFor(() => expect(api.GetStaffByPaymentSchedule).toHaveBeenCalled());
    choose("Ada Lovelace");
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(chips()).toEqual([]);
  });

  it("clears the picker and closes from Escape", async () => {
    const { onClose } = renderModal();
    await waitFor(() => expect(api.GetStaffByPaymentSchedule).toHaveBeenCalled());
    choose("Ada Lovelace");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    expect(chips()).toEqual([]);
  });

  it("shows a loader in place of the picker while the staff load", async () => {
    let release;
    api.GetStaffByPaymentSchedule.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    renderModal();
    expect(screen.getByRole("status")).toHaveTextContent("Loading...");
    expect(wrapper()).toBeNull();
    await act(async () => {
      release({ data: [staff()] });
    });
    await waitFor(() => expect(wrapper()).not.toBeNull());
  });
});

describe("loading the eligible staff", () => {
  it("asks for the staff on this payment schedule", async () => {
    renderModal();
    await waitFor(() =>
      expect(api.GetStaffByPaymentSchedule).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        paymentSchedule: "Bi-Weekly",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
  });

  it("fetches nothing without a compensation type", async () => {
    renderModal({ compensationType: undefined });
    await waitFor(() => expect(wrapper()).not.toBeNull());
    expect(api.GetStaffByPaymentSchedule).not.toHaveBeenCalled();
  });

  it("fetches nothing without a tenant", async () => {
    renderModal({ tenantId: undefined });
    await waitFor(() => expect(wrapper()).not.toBeNull());
    expect(api.GetStaffByPaymentSchedule).not.toHaveBeenCalled();
  });

  it("reads a bare array response with no envelope", async () => {
    api.GetStaffByPaymentSchedule.mockResolvedValue([staff({ fullName: "Grace Hopper" })]);
    renderModal();
    await waitFor(() => expect(api.GetStaffByPaymentSchedule).toHaveBeenCalled());
    openMenu();
    await waitFor(() => expect(menuText()).toEqual(["Grace Hopper"]));
  });

  it("leaves out the staff marked inactive", async () => {
    api.GetStaffByPaymentSchedule.mockResolvedValue({
      data: [
        staff(),
        staff({ id: "s-2", fullName: "Alan Turing", active: false }),
        staff({ id: "s-3", fullName: "Katherine Johnson", active: true }),
      ],
    });
    renderModal();
    await waitFor(() => expect(api.GetStaffByPaymentSchedule).toHaveBeenCalled());
    openMenu();
    await waitFor(() =>
      expect(menuText()).toEqual(["Ada Lovelace", "Katherine Johnson"])
    );
  });

  it("names a staff member from their first and last name", async () => {
    api.GetStaffByPaymentSchedule.mockResolvedValue({
      data: [{ id: "s-1", firstName: "Grace", lastName: "Hopper" }],
    });
    renderModal();
    await waitFor(() => expect(api.GetStaffByPaymentSchedule).toHaveBeenCalled());
    openMenu();
    await waitFor(() => expect(menuText()).toEqual(["Grace Hopper"]));
  });

  it("trims a staff member who has only a surname on file", async () => {
    api.GetStaffByPaymentSchedule.mockResolvedValue({
      data: [{ id: "s-1", lastName: "Hopper" }],
    });
    renderModal();
    await waitFor(() => expect(api.GetStaffByPaymentSchedule).toHaveBeenCalled());
    openMenu();
    await waitFor(() => expect(menuText()).toEqual(["Hopper"]));
  });

  it("labels a staff member with no name at all as unknown", async () => {
    api.GetStaffByPaymentSchedule.mockResolvedValue({ data: [{ id: "s-1" }] });
    renderModal();
    await waitFor(() => expect(api.GetStaffByPaymentSchedule).toHaveBeenCalled());
    openMenu();
    await waitFor(() => expect(menuText()).toEqual(["Unknown"]));
  });

  it("points the way to Staff & Teams when the list is empty", async () => {
    api.GetStaffByPaymentSchedule.mockResolvedValue({ data: [] });
    renderModal();
    await waitFor(() => expect(api.GetStaffByPaymentSchedule).toHaveBeenCalled());
    openMenu();
    expect(menuText()[0]).toContain("No staff found");
  });

  it("offers nothing when the response is not a list", async () => {
    api.GetStaffByPaymentSchedule.mockResolvedValue({ data: { staff: [] } });
    renderModal();
    await waitFor(() => expect(api.GetStaffByPaymentSchedule).toHaveBeenCalled());
    openMenu();
    expect(menuText()[0]).toContain("No staff found");
  });

  it("reports a failed load and offers nothing", async () => {
    const err = new Error("500");
    api.GetStaffByPaymentSchedule.mockRejectedValue(err);
    renderModal();
    await waitFor(() =>
      expect(toast.showApiError).toHaveBeenCalledWith(err, "LOAD_PAYROLL_STAFF")
    );
    openMenu();
    expect(menuText()[0]).toContain("No staff found");
  });
});

describe("choosing staff", () => {
  it("refuses a submit with nobody selected", async () => {
    const { onSave } = renderModal();
    await waitFor(() => expect(api.GetStaffByPaymentSchedule).toHaveBeenCalled());
    await submit();
    expect(
      await screen.findByText("At least one employee must be selected")
    ).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    expect(validation.showValidationErrors).toHaveBeenCalled();
  });

  it("hands the caller every chosen staff id and clears the picker", async () => {
    api.GetStaffByPaymentSchedule.mockResolvedValue({
      data: [staff(), staff({ id: "s-2", fullName: "Alan Turing" })],
    });
    const { onSave, onClose } = renderModal();
    await waitFor(() => expect(api.GetStaffByPaymentSchedule).toHaveBeenCalled());
    choose("Ada Lovelace");
    choose("Alan Turing");
    expect(chips()).toEqual(["Ada Lovelace", "Alan Turing"]);
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(["s-1", "s-2"]));
    // The modal leaves itself open; the caller decides when it goes.
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(chips()).toEqual([]));
  });

  it("reports a refused submit and keeps the selection", async () => {
    const { onSave } = renderModal();
    onSave.mockRejectedValue(new Error("Payroll already locked"));
    await waitFor(() => expect(api.GetStaffByPaymentSchedule).toHaveBeenCalled());
    choose("Ada Lovelace");
    await submit();
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to add staff", "error")
    );
    expect(chips()).toEqual(["Ada Lovelace"]);
  });

  it("disables the submit while the caller is working", async () => {
    let release;
    const { onSave } = renderModal();
    onSave.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    await waitFor(() => expect(api.GetStaffByPaymentSchedule).toHaveBeenCalled());
    choose("Ada Lovelace");
    fireEvent.click(primary());
    await waitFor(() => expect(primary()).toBeDisabled());
    await act(async () => {
      release();
    });
    await waitFor(() => expect(primary()).toBeEnabled());
  });

  // The single-select variant stores a plain id string where the schema wants
  // an array, so the submit can never validate. Recorded as it stands.
  it("cannot submit at all in single-select mode", async () => {
    const { onSave } = renderModal({ isMultiple: false });
    await waitFor(() => expect(api.GetStaffByPaymentSchedule).toHaveBeenCalled());
    choose("Ada Lovelace");
    expect(chips()).toEqual([]);
    expect(wrapper().querySelector(".rs__single-value")).toHaveTextContent("Ada Lovelace");
    await submit();
    await waitFor(() => expect(validation.showValidationErrors).toHaveBeenCalled());
    expect(onSave).not.toHaveBeenCalled();
  });
});
