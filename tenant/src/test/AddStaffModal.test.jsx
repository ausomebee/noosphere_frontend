import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import AddStaffModal from "../Components/ReusableModal/OrganizationModal/AddStaffModal";
import authReducer from "../ReduxStore/features/authentication";
import staffFormDraftReducer from "../ReduxStore/features/AddStaffDraftSlice";
import formDraftsReducer from "../ReduxStore/features/formDraftsSlice";

/**
 * The organisation's new/edit staff modal: four tabs, each gated by a trigger()
 * over just that tab's fields, over a form whose option lists all arrive from
 * three separate endpoints (roles, income items, deductions) fetched when the
 * modal opens. Licenses, other pays and deductions are repeatable rows kept in
 * plain form values rather than a field array, and the documents tab uploads
 * through a fourth endpoint before anything reaches the payload.
 *
 * What makes it awkward to drive: the pickers are react-select built with
 * isSearchable off, so an option has to be clicked in the portalled menu rather
 * than typed; the country field rewrites the state list beneath it, so those
 * two have to be driven in order; and the submit payload is reshaped on the way
 * out — payroll is gathered into a nested object and empty optional fields are
 * deleted rather than sent blank, so assertions read the transformed object,
 * not the form.
 */

const api = vi.hoisted(() => ({
  income: vi.fn(),
  deductions: vi.fn(),
  roles: vi.fn(),
  upload: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("../api/payrollApi", () => ({
  default: {
    GetIncomeItemsByTenantId: api.income,
    GetDeductionsByTenantId: api.deductions,
  },
}));

vi.mock("../api/roleApi", () => ({
  default: { GetAllRolesByTenantId: api.roles },
}));

vi.mock("../api/ImageUpload", () => ({
  default: { UploadImage: api.upload },
}));

vi.mock("../Helper/ShowToast", () => ({
  showToast: api.toast,
  showApiError: vi.fn(),
}));

const makeStore = (user = {}) =>
  configureStore({
    reducer: {
      authentication: authReducer,
      staffFormDraft: staffFormDraftReducer,
      formDrafts: formDraftsReducer,
    },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "t",
        refreshToken: "rt",
        user: {
          id: "u1",
          tenantId: "tenant-1",
          accessToken: "access-1",
          refreshToken: "refresh-1",
          ...user,
        },
      },
    },
  });

const renderModal = ({ user, ...props } = {}) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const store = makeStore(user);
  const view = render(
    <Provider store={store}>
      <AddStaffModal
        isOpen
        onClose={onClose}
        onSubmit={onSubmit}
        mode="add"
        {...props}
      />
    </Provider>
  );
  return { ...view, onSubmit, onClose, store };
};

// Labels are plain siblings with a "*" span and no htmlFor, so walk up from the
// label text rather than querying by accessible name.
const groupFor = (labelText, index = 0) => {
  const matches = Array.from(
    document.body.querySelectorAll("label.input-group-label")
  ).filter((l) => l.textContent.replace("*", "").trim() === labelText);
  if (!matches[index]) throw new Error(`no field labelled "${labelText}"`);
  return matches[index].closest(".input-group");
};

const controlFor = (labelText, index = 0) =>
  groupFor(labelText, index).querySelector("input");

const typeIn = (labelText, value, index = 0) =>
  fireEvent.change(controlFor(labelText, index), { target: { value } });

// These selects are built with isSearchable off, so their text box filters
// nothing — open the menu (portalled to the body) and click the option.
const pickIn = (labelText, optionLabel, index = 0) => {
  const input = controlFor(labelText, index);
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
  const menus = document.body.querySelectorAll(".rs__menu");
  const option = Array.from(
    menus[menus.length - 1].querySelectorAll(".rs__option")
  ).find((o) => o.textContent === optionLabel);
  if (!option) throw new Error(`no option "${optionLabel}" under "${labelText}"`);
  fireEvent.click(option);
};

const tab = (name) => screen.getByRole("tab", { name });

const primary = () =>
  document.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.querySelector(".modal-btn-secondary");

const roles = [
  { id: "r1", name: "BCBA" },
  { id: "r2", name: "RBT" },
];

// The minimum the schema accepts across the first three tabs.
const fillBasicInfo = async () => {
  typeIn("Full Name", "Ada Lovelace");
  typeIn("Email", "ada@example.com");
  typeIn("Phone Number", "+1 555 123 4567");
  // NPI is optional in intent, but its regex rejects the empty string the draft
  // seeds it with, so a value has to be supplied for the form to validate.
  typeIn("NPI", "1234567890");
  await waitFor(() => expect(groupFor("Staff Role").textContent).toContain("Staff Role"));
  pickIn("Staff Role", "BCBA");
};

const fillPayroll = () => {
  pickIn("Compensation Type", "Hourly");
  typeIn("Pay Rate (per hour)", "45.5");
};

let errorSpy;

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  api.income.mockResolvedValue({ data: [{ id: "i1", name: "Bonus" }] });
  api.deductions.mockResolvedValue({ data: [{ id: "d1", name: "Pension" }] });
  api.roles.mockResolvedValue({ data: { data: roles } });
  api.upload.mockResolvedValue({
    success: true,
    data: [{ filename: "cert.pdf", url: "https://files/cert.pdf" }],
  });
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe("staff modal shell", () => {
  it("opens on the first tab of the create wizard", () => {
    renderModal();
    expect(screen.getByText("New Staff")).toBeInTheDocument();
    expect(primary().textContent).toBe("Next");
    expect(secondary().textContent).toBe("Cancel");
  });

  it("renames itself for editing", () => {
    renderModal({ mode: "edit", initialData: { fullName: "Ada" } });
    expect(screen.getByText("Edit Staff")).toBeInTheDocument();
  });

  it("closes on Cancel from the first tab", () => {
    const { onClose } = renderModal();
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
  });

  it("steps back a tab from anywhere else", () => {
    renderModal();
    fireEvent.click(tab("Payroll Settings"));
    expect(secondary().textContent).toBe("Previous");

    fireEvent.click(secondary());
    expect(tab("Licenses").getAttribute("aria-selected")).toBe("true");
  });

  it("offers Save on the documents tab", () => {
    renderModal();
    fireEvent.click(tab("Documents"));
    expect(primary().textContent).toBe("Save");
  });

  it("refuses to advance past an empty first tab", async () => {
    renderModal();
    fireEvent.click(primary());

    await waitFor(() =>
      expect(api.toast).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error" })
      )
    );
    expect(tab("Basic Information").getAttribute("aria-selected")).toBe("true");
    expect(api.toast.mock.calls[0][0].message).toContain("Full Name is required");
  });

  it("advances once the first tab is filled in", async () => {
    renderModal();
    await fillBasicInfo();
    fireEvent.click(primary());

    await waitFor(() =>
      expect(tab("Licenses").getAttribute("aria-selected")).toBe("true")
    );
  });
});

describe("option lists", () => {
  it("offers the tenant's active roles", async () => {
    api.roles.mockResolvedValue({
      data: { data: [...roles, { id: "r3", name: "Retired", isActive: false }] },
    });
    renderModal();

    await waitFor(() => expect(api.roles).toHaveBeenCalled());
    const input = controlFor("Staff Role");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
    expect(screen.getByText("BCBA")).toBeInTheDocument();
    expect(screen.queryByText("Retired")).not.toBeInTheDocument();
  });

  it("accepts a role list that is not wrapped in a data envelope", async () => {
    api.roles.mockResolvedValue({ data: roles });
    renderModal();

    await waitFor(() => expect(api.roles).toHaveBeenCalled());
    const input = controlFor("Staff Role");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
    expect(screen.getByText("RBT")).toBeInTheDocument();
  });

  it("points at role setup when the roles endpoint fails", async () => {
    api.roles.mockRejectedValue(new Error("no roles"));
    renderModal();

    await waitFor(() => expect(api.roles).toHaveBeenCalled());
    const input = controlFor("Staff Role");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
    expect(screen.getByText(/No roles found/)).toBeInTheDocument();
  });

  it("offers the tenant's income items as pay types", async () => {
    renderModal();
    await waitFor(() => expect(api.income).toHaveBeenCalled());
    fireEvent.click(tab("Payroll Settings"));
    fireEvent.click(screen.getByText("Add Other Pay"));

    const input = controlFor("Pay Type");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
    expect(screen.getByText("Bonus")).toBeInTheDocument();
  });

  it("names an income item that has none", async () => {
    api.income.mockResolvedValue({ data: [{ id: "i1" }] });
    renderModal();
    await waitFor(() => expect(api.income).toHaveBeenCalled());
    fireEvent.click(tab("Payroll Settings"));
    fireEvent.click(screen.getByText("Add Other Pay"));

    const input = controlFor("Pay Type");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
    expect(screen.getByText("Unknown Income")).toBeInTheDocument();
  });

  it("empties the pay type list when the endpoint fails", async () => {
    api.income.mockRejectedValue(new Error("payroll down"));
    renderModal();

    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith(
        "Error fetching income items:",
        expect.any(Error)
      )
    );
    fireEvent.click(tab("Payroll Settings"));
    fireEvent.click(screen.getByText("Add Other Pay"));
    const input = controlFor("Pay Type");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
    expect(screen.getByText(/No income items found/)).toBeInTheDocument();
  });

  it("empties the deduction list when the endpoint fails", async () => {
    api.deductions.mockRejectedValue(new Error("payroll down"));
    renderModal();

    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith(
        "Error fetching deductions:",
        expect.any(Error)
      )
    );
  });

  it("fetches nothing without a tenant", () => {
    renderModal({ user: { tenantId: undefined } });
    expect(api.income).not.toHaveBeenCalled();
    expect(api.deductions).not.toHaveBeenCalled();
  });
});

describe("country and state", () => {
  it("keeps the state field shut until a country is picked", () => {
    renderModal();
    expect(controlFor("State").disabled).toBe(true);
  });

  it("lists the chosen country's states", () => {
    renderModal();
    pickIn("Country", "United States");

    const input = controlFor("State");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
    expect(screen.getByText("California")).toBeInTheDocument();
  });

  it("drops the state when the country changes under it", () => {
    renderModal();
    pickIn("Country", "United States");
    pickIn("State", "California");
    expect(groupFor("State").textContent).toContain("California");

    pickIn("Country", "Canada");
    expect(groupFor("State").textContent).not.toContain("California");
  });
});

describe("licenses", () => {
  const openLicenses = () => {
    const view = renderModal();
    fireEvent.click(tab("Licenses"));
    return view;
  };

  it("starts with no rows", () => {
    openLicenses();
    expect(screen.queryByText("Remove License")).not.toBeInTheDocument();
  });

  it("adds and removes a row", () => {
    openLicenses();
    fireEvent.click(screen.getByText("Add License"));
    expect(controlFor("License Name")).toBeTruthy();

    fireEvent.click(screen.getByText("Remove License"));
    expect(screen.queryByText("Remove License")).not.toBeInTheDocument();
    expect(api.toast).toHaveBeenCalledWith({
      message: "License removed",
      type: "info",
    });
  });

  it("adds a second row alongside the first", () => {
    openLicenses();
    fireEvent.click(screen.getByText("Add License"));
    fireEvent.click(screen.getByText("Add License"));
    expect(screen.getAllByText("Remove License")).toHaveLength(2);
  });

  it("blocks the tab while a started row is incomplete", async () => {
    openLicenses();
    fireEvent.click(screen.getByText("Add License"));
    typeIn("License Name", "BCBA");
    fireEvent.click(primary());

    await waitFor(() =>
      expect(api.toast).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error" })
      )
    );
    expect(tab("Licenses").getAttribute("aria-selected")).toBe("true");
  });

  it("lets an untouched row through", async () => {
    openLicenses();
    fireEvent.click(screen.getByText("Add License"));
    fireEvent.click(primary());

    await waitFor(() =>
      expect(tab("Payroll Settings").getAttribute("aria-selected")).toBe("true")
    );
  });
});

describe("payroll settings", () => {
  const openPayroll = () => {
    const view = renderModal();
    fireEvent.click(tab("Payroll Settings"));
    return view;
  };

  it("asks for no rate until a compensation type is chosen", () => {
    openPayroll();
    expect(screen.queryByText(/Pay Rate/)).not.toBeInTheDocument();
  });

  it("labels the rate per hour for hourly staff", () => {
    openPayroll();
    pickIn("Compensation Type", "Hourly");
    expect(screen.getByText("Pay Rate (per hour)")).toBeInTheDocument();
  });

  it("labels the rate per day for daily staff", () => {
    openPayroll();
    pickIn("Compensation Type", "Daily");
    expect(screen.getByText("Pay Rate (per day)")).toBeInTheDocument();
  });

  it("asks salaried staff for a monthly minimum too", () => {
    openPayroll();
    pickIn("Compensation Type", "Salaried");
    expect(screen.getByText("Pay Rate (Salary)")).toBeInTheDocument();
    expect(
      screen.getByText("Minimum Number of Hours per Month")
    ).toBeInTheDocument();
  });

  it("adds and removes an other-pay row", () => {
    openPayroll();
    fireEvent.click(screen.getByText("Add Other Pay"));
    expect(controlFor("Pay Type")).toBeTruthy();

    fireEvent.click(screen.getByTitle("Remove this pay item"));
    expect(screen.queryByText("Pay Type")).not.toBeInTheDocument();
    expect(api.toast).toHaveBeenCalledWith({
      message: "Other pay removed",
      type: "info",
    });
  });

  it("adds and removes a deduction row", () => {
    openPayroll();
    fireEvent.click(screen.getByText("Add Deduction"));
    expect(controlFor("Deduction Type")).toBeTruthy();

    fireEvent.click(screen.getByTitle("Remove this deduction"));
    expect(screen.queryByText("Deduction Type")).not.toBeInTheDocument();
  });

  it("refuses a negative pay rate", async () => {
    openPayroll();
    pickIn("Compensation Type", "Hourly");
    typeIn("Pay Rate (per hour)", "-5");
    fireEvent.click(primary());

    await waitFor(() =>
      expect(api.toast).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error" })
      )
    );
    expect(
      api.toast.mock.calls.some((c) =>
        String(c[0].message).includes("Rate must be positive")
      )
    ).toBe(true);
  });
});

describe("documents", () => {
  const openDocuments = (props) => {
    const view = renderModal(props);
    fireEvent.click(tab("Documents"));
    return view;
  };

  const fileInput = () => document.querySelector(".upload-input");

  const attach = (files) =>
    fireEvent.change(fileInput(), { target: { files } });

  it("uploads a chosen file and reports success", async () => {
    openDocuments();
    attach([new File(["x"], "cert.pdf")]);

    await waitFor(() => expect(api.upload).toHaveBeenCalled());
    await waitFor(() =>
      expect(api.toast).toHaveBeenCalledWith({
        message: "1 file(s) uploaded successfully",
        type: "success",
      })
    );
  });

  it("ignores a change event with no files", () => {
    openDocuments();
    attach([]);
    expect(api.upload).not.toHaveBeenCalled();
  });

  it("marks an oversized file as failed and offers a retry", async () => {
    openDocuments();
    const big = new File(["x"], "huge.mp4");
    Object.defineProperty(big, "size", { value: 60 * 1024 * 1024 });
    attach([big]);

    await waitFor(() =>
      expect(screen.getByText("File size exceeds 50MB limit")).toBeInTheDocument()
    );
    // Nothing valid was selected, so no upload is attempted at all.
    expect(api.upload).not.toHaveBeenCalled();
    expect(document.querySelector(".retry-file")).toBeTruthy();
  });

  it("restarts a failed upload on retry", async () => {
    openDocuments();
    const big = new File(["x"], "huge.mp4");
    Object.defineProperty(big, "size", { value: 60 * 1024 * 1024 });
    attach([big]);
    await waitFor(() => expect(document.querySelector(".retry-file")).toBeTruthy());

    fireEvent.click(document.querySelector(".retry-file"));
    expect(api.toast).toHaveBeenCalledWith({
      message: "Retrying upload for huge.mp4",
      type: "info",
    });
    expect(document.querySelector(".retry-file")).toBeNull();
  });

  it("reports an upload the server rejected", async () => {
    api.upload.mockResolvedValue({ success: false, error: "disk full" });
    openDocuments();
    attach([new File(["x"], "cert.pdf")]);

    await waitFor(() =>
      expect(api.toast).toHaveBeenCalledWith({
        message: "Failed to upload file(s): disk full",
        type: "error",
      })
    );
  });

  it("refuses to upload without tokens", async () => {
    openDocuments({ user: { accessToken: undefined } });
    attach([new File(["x"], "cert.pdf")]);

    await waitFor(() =>
      expect(api.toast).toHaveBeenCalledWith({
        message: "Authentication tokens missing.",
        type: "error",
      })
    );
    expect(api.upload).not.toHaveBeenCalled();
  });

  it("removes an uploaded file from the list again", async () => {
    openDocuments();
    attach([new File(["x"], "cert.pdf")]);
    await waitFor(() => expect(api.upload).toHaveBeenCalled());

    fireEvent.click(document.querySelector(".remove-file"));
    await waitFor(() =>
      expect(document.querySelector(".file-item")).toBeNull()
    );
  });

  it("shows the documents already on file when editing", () => {
    openDocuments({
      mode: "edit",
      initialData: {
        fullName: "Ada",
        documents: [
          { id: "doc1", documentsUrl: { filename: "contract.pdf", url: "https://files/c.pdf" } },
        ],
      },
    });
    expect(screen.getByText(/contract\.pdf/)).toBeInTheDocument();
  });
});

describe("submitting", () => {
  const fillEverything = async () => {
    await fillBasicInfo();
    fireEvent.click(tab("Payroll Settings"));
    fillPayroll();
    fireEvent.click(tab("Documents"));
  };

  it("sends the payroll fields gathered into one object", async () => {
    const { onSubmit, onClose } = renderModal();
    await fillEverything();
    fireEvent.click(primary());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const sent = onSubmit.mock.calls[0][0];
    expect(sent).toMatchObject({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      staffRole: "r1",
      active: true,
      payroll: { paymentSchedule: "HOURLY", ratePerHour: 45.5 },
    });
    // Blank optional fields are deleted rather than sent as empty strings.
    expect(sent).not.toHaveProperty("address");
    expect(sent).not.toHaveProperty("DOB");
    expect(sent).not.toHaveProperty("documents");
    expect(sent).not.toHaveProperty("licenses");
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("keeps the monthly minimum only for salaried staff", async () => {
    const { onSubmit } = renderModal();
    await fillBasicInfo();
    fireEvent.click(tab("Payroll Settings"));
    pickIn("Compensation Type", "Salaried");
    typeIn("Pay Rate (Salary)", "5200");
    typeIn("Minimum Number of Hours per Month", "160");
    fireEvent.click(tab("Documents"));
    fireEvent.click(primary());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].payroll).toMatchObject({
      paymentSchedule: "SALARIED",
      ratePerHour: 5200,
      minimumHours: 160,
    });
  });

  it("sends the pay and deduction rows as id objects", async () => {
    const { onSubmit } = renderModal();
    await fillBasicInfo();
    fireEvent.click(tab("Payroll Settings"));
    fillPayroll();
    fireEvent.click(screen.getByText("Add Other Pay"));
    pickIn("Pay Type", "Bonus");
    fireEvent.click(screen.getByText("Add Deduction"));
    pickIn("Deduction Type", "Pension");
    fireEvent.click(tab("Documents"));
    fireEvent.click(primary());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].payroll).toMatchObject({
      otherPays: [{ id: "i1" }],
      deductions: [{ id: "d1" }],
    });
  });

  it("leaves out a pay row the user never filled in", async () => {
    const { onSubmit } = renderModal();
    await fillBasicInfo();
    fireEvent.click(tab("Payroll Settings"));
    fillPayroll();
    fireEvent.click(screen.getByText("Add Other Pay"));
    fireEvent.click(tab("Documents"));
    fireEvent.click(primary());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].payroll).not.toHaveProperty("otherPays");
  });

  it("sends a completed license row", async () => {
    const { onSubmit } = renderModal();
    await fillBasicInfo();
    fireEvent.click(tab("Licenses"));
    fireEvent.click(screen.getByText("Add License"));
    typeIn("License Name", "BCBA");
    typeIn("License Number", "12345");
    typeIn("Expiration Date", "2030-01-01");
    pickIn("State", "California", 1);
    fireEvent.click(tab("Payroll Settings"));
    fillPayroll();
    fireEvent.click(tab("Documents"));
    fireEvent.click(primary());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].licenses).toHaveLength(1);
    expect(onSubmit.mock.calls[0][0].licenses[0]).toMatchObject({
      licenseName: "BCBA",
      licenseNumber: "12345",
      state: "California",
    });
  });

  it("attaches the uploaded documents", async () => {
    const { onSubmit } = renderModal();
    await fillBasicInfo();
    fireEvent.click(tab("Payroll Settings"));
    fillPayroll();
    fireEvent.click(tab("Documents"));
    fireEvent.change(document.querySelector(".upload-input"), {
      target: { files: [new File(["x"], "cert.pdf")] },
    });
    await waitFor(() => expect(api.upload).toHaveBeenCalled());
    await waitFor(() => expect(primary().disabled).toBe(false));
    fireEvent.click(primary());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].documents).toEqual([
      { filename: "cert.pdf", url: "https://files/cert.pdf", error: null },
    ]);
  });

  it("blocks a save when the optional NPI is left blank", async () => {
    // The draft seeds practiceNPI as "", and its regex has no empty-string
    // escape, so a field nobody filled in fails the schema. Because practiceNPI
    // is in no tab's field map there is nowhere to jump to either, and the user
    // is left on the Documents tab with only a generic toast.
    const { onSubmit } = renderModal();
    typeIn("Full Name", "Ada Lovelace");
    typeIn("Email", "ada@example.com");
    typeIn("Phone Number", "+1 555 123 4567");
    await waitFor(() => expect(api.roles).toHaveBeenCalled());
    pickIn("Staff Role", "BCBA");
    fireEvent.click(tab("Payroll Settings"));
    fillPayroll();
    fireEvent.click(tab("Documents"));
    fireEvent.click(primary());

    await waitFor(() =>
      expect(api.toast).toHaveBeenCalledWith({
        message: "Please fix the highlighted errors before submitting",
        type: "error",
      })
    );
    expect(onSubmit).not.toHaveBeenCalled();
    expect(tab("Documents").getAttribute("aria-selected")).toBe("true");
  });

  it("jumps back to the tab holding the first error", async () => {
    const { onSubmit } = renderModal();
    fireEvent.click(tab("Documents"));
    fireEvent.click(primary());

    await waitFor(() =>
      expect(tab("Basic Information").getAttribute("aria-selected")).toBe("true")
    );
    expect(api.toast).toHaveBeenCalledWith({
      message: "Please fix the highlighted errors before submitting",
      type: "error",
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("jumps to the payroll tab when only the payroll is wrong", async () => {
    renderModal();
    await fillBasicInfo();
    fireEvent.click(tab("Documents"));
    fireEvent.click(primary());

    await waitFor(() =>
      expect(tab("Payroll Settings").getAttribute("aria-selected")).toBe("true")
    );
  });

  it("reports a save the server refused and stays open", async () => {
    const { onSubmit, onClose } = renderModal();
    onSubmit.mockRejectedValue(new Error("email already taken"));
    await fillEverything();
    fireEvent.click(primary());

    await waitFor(() =>
      expect(api.toast).toHaveBeenCalledWith({
        message: "email already taken",
        type: "error",
      })
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("editing an existing staff member", () => {
  const saved = {
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    phoneNumber: "+1 555 123 4567",
    staffRole: "r1",
    DOB: "1990-04-15T00:00:00.000Z",
    country: "US",
    state: "CA",
    active: false,
    licenses: [
      {
        licenseName: "BCBA",
        licenseNumber: "12345",
        expiryDate: "2030-01-01",
        state: "California",
      },
    ],
    payroll: {
      paymentSchedule: "HOURLY",
      ratePerHour: "45.5",
      otherPays: [{ type: "i1" }],
      deductions: [{ type: "d1" }],
    },
  };

  it("repopulates the basic fields", () => {
    renderModal({ mode: "edit", initialData: saved });
    expect(controlFor("Full Name").value).toBe("Ada Lovelace");
    expect(controlFor("Email").value).toBe("ada@example.com");
  });

  it("turns a stored date of birth back into a date input value", () => {
    renderModal({ mode: "edit", initialData: saved });
    expect(controlFor("Date of Birth").value).toBe("1990-04-15");
  });

  it("expands a legacy country code into its display name", () => {
    renderModal({ mode: "edit", initialData: saved });
    expect(groupFor("Country").textContent).toContain("United States");
    expect(groupFor("State").textContent).toContain("California");
  });

  it("restores the saved licenses", () => {
    renderModal({ mode: "edit", initialData: saved });
    fireEvent.click(tab("Licenses"));
    expect(controlFor("License Name").value).toBe("BCBA");
  });

  it("flattens the nested payroll back into its own fields", () => {
    renderModal({ mode: "edit", initialData: saved });
    fireEvent.click(tab("Payroll Settings"));
    expect(groupFor("Compensation Type").textContent).toContain("Hourly");
    expect(controlFor("Pay Rate (per hour)").value).toBe("45.5");
  });

  it("keeps the primary button labelled Next even where it submits", () => {
    // `hasChanges` is only ever set to false, so the edit-mode label never
    // flips to Save -- the button on the Documents tab still submits.
    renderModal({ mode: "edit", initialData: saved });
    fireEvent.click(tab("Documents"));
    expect(primary().textContent).toBe("Next");
  });

  it("still saves from that button", async () => {
    const { onSubmit } = renderModal({ mode: "edit", initialData: saved });
    fireEvent.click(tab("Documents"));
    fireEvent.click(primary());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      fullName: "Ada Lovelace",
      active: false,
    });
  });
});
