import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import AddSessionTypeModal from "../Components/ReusableModal/OrganizationModal/AddSessionTypeModal";
import authReducer from "../ReduxStore/features/authentication";
import formDraftsReducer from "../ReduxStore/features/formDraftsSlice";

/**
 * The organisation's add/edit session type modal: one form over a yup schema,
 * a repeatable service-code/modifier row pair backed by a field array, and two
 * option lists fetched when the modal opens (tenant service codes and staff
 * roles).
 *
 * Every picker here is react-select with the options portalled to the body, so
 * they are driven by opening the menu off the hidden text box and clicking the
 * option, and they are addressed by position: the modal renders the category
 * picker first, then two selects per service row, then staff roles and
 * locations last. That ordering is what `serviceRow`, `staffRoleSelect` and
 * `locationSelect` below encode.
 *
 * Note also that `initialData` must be a stable object: it is a dependency of
 * the effect that resets the form, so a fresh literal on every render loops
 * forever. The helper below always passes one.
 *
 * The two things worth knowing before reading the assertions: the schema makes
 * every service row's code compulsory, so the payload builder's "drop the empty
 * rows" filter can never actually fire — an empty row blocks the save instead;
 * and edit mode is fed a record in the API's own shape, which the modal has to
 * unpick (minutes back out of a total duration, modifiers out of a nested
 * object, service codes that the fetched list may not contain).
 */

const api = vi.hoisted(() => ({ serviceCodes: vi.fn(), roles: vi.fn() }));
vi.mock("../api/billingAndPaymentsApi", () => ({
  default: { GetTenantServiceCodeByTenantId: api.serviceCodes },
}));
vi.mock("../api/roleApi", () => ({
  default: { GetAllRolesByTenantId: api.roles },
}));

const toast = vi.hoisted(() => ({ showToast: vi.fn(), showApiError: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: (...a) => toast.showApiError(...a),
}));

const makeStore = (user = {}) =>
  configureStore({
    reducer: { authentication: authReducer, formDrafts: formDraftsReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "t",
        user: {
          id: "u-1",
          tenantId: "tenant-1",
          accessToken: "access-1",
          refreshToken: "refresh-1",
          ...user,
        },
      },
    },
  });

// The modal lists `initialData` in the dependencies of the effect that resets
// the form, and its own default for that prop is a fresh `{}` on every render,
// so omitting it spins the component in an endless reset/re-render loop that
// never yields. Every render here therefore passes one stable object.
const NOTHING_STORED = {};

const renderModal = ({ user, initialData = NOTHING_STORED, ...props } = {}) => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const view = render(
    <Provider store={makeStore(user)}>
      <AddSessionTypeModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        initialData={initialData}
        {...props}
      />
    </Provider>
  );
  return { ...view, onSave, onClose };
};

const codeRecord = (over = {}) => ({
  id: "sc-1",
  code: "97153",
  description: "Adaptive behavior treatment",
  isActive: true,
  isDeleted: false,
  ...over,
});

// Every picker in the modal, in render order.
const selects = () => Array.from(document.body.querySelectorAll(".select-input-wrapper"));
const CATEGORY = 0;
const serviceRow = (index) => ({ code: 1 + index * 2, modifier: 2 + index * 2 });
const staffRoleSelect = () => selects().length - 2;
const locationSelect = () => selects().length - 1;

const openMenu = (index) => {
  const input = selects()[index].querySelector("input");
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
};

const menuLabels = () => {
  const menus = document.body.querySelectorAll(".rs__menu");
  const menu = menus[menus.length - 1];
  const options = menu.querySelectorAll(".rs__option");
  return options.length
    ? Array.from(options).map((o) => o.textContent)
    : [menu.textContent];
};

const choose = (index, label) => {
  openMenu(index);
  const menus = document.body.querySelectorAll(".rs__menu");
  const option = Array.from(
    menus[menus.length - 1].querySelectorAll(".rs__option")
  ).find((o) => o.textContent === label);
  if (!option) throw new Error(`no option "${label}" in select ${index}`);
  fireEvent.click(option);
};

const valueOf = (index) =>
  selects()[index].querySelector(".rs__single-value")?.textContent ?? "";

const chipsOf = (index) =>
  Array.from(selects()[index].querySelectorAll(".selected-label-item")).map(
    (c) => c.textContent
  );

const nameInput = () => screen.getByPlaceholderText("Enter session name");
const durationInputs = () => screen.getAllByPlaceholderText("0");
const primary = () => document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.body.querySelector(".modal-btn-secondary");
const serviceRows = () => document.body.querySelectorAll(".modal-row-delete-btn");

const submit = async () =>
  act(async () => {
    fireEvent.click(primary());
  });

const fillMinimum = async () => {
  await waitFor(() => expect(api.serviceCodes).toHaveBeenCalled());
  fireEvent.change(nameInput(), { target: { value: "Direct therapy" } });
  choose(CATEGORY, "Direct Service");
  choose(serviceRow(0).code, "97153 - Adaptive behavior treatment");
};

beforeEach(() => {
  vi.clearAllMocks();
  api.serviceCodes.mockResolvedValue({ data: [codeRecord()] });
  api.roles.mockResolvedValue({
    data: { data: [{ id: "r-1", name: "BCBA" }, { id: "r-2", name: "RBT" }] },
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the modal shell", () => {
  it("titles itself for a new session type", async () => {
    renderModal();
    await waitFor(() => expect(api.serviceCodes).toHaveBeenCalled());
    expect(document.body.querySelector(".modal-title-text")).toHaveTextContent(
      "Add Session Type"
    );
    expect(primary()).toHaveTextContent("Save Session Type");
  });

  it("titles itself for an edit", async () => {
    renderModal({ mode: "edit", initialData: { name: "Direct therapy" } });
    await waitFor(() => expect(api.serviceCodes).toHaveBeenCalled());
    expect(document.body.querySelector(".modal-title-text")).toHaveTextContent(
      "Edit Session Type"
    );
  });

  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(document.body.querySelector(".modal-content")).toBeNull();
    expect(api.serviceCodes).not.toHaveBeenCalled();
  });

  it("opens on the blank defaults", async () => {
    renderModal();
    await waitFor(() => expect(api.serviceCodes).toHaveBeenCalled());
    expect(nameInput()).toHaveValue("");
    expect(valueOf(CATEGORY)).toBe("");
    expect(durationInputs()[0]).toHaveValue(0);
    expect(durationInputs()[1]).toHaveValue(0);
    expect(document.body.querySelector(".form-checkbox")).not.toBeChecked();
    // A new session type is switched on unless the form says otherwise.
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("clears the form and closes from Cancel", async () => {
    const { onClose } = renderModal();
    await waitFor(() => expect(api.serviceCodes).toHaveBeenCalled());
    fireEvent.change(nameInput(), { target: { value: "Typed then abandoned" } });
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(nameInput()).toHaveValue("");
  });

  it("clears the form and closes from Escape", async () => {
    const { onClose } = renderModal();
    await waitFor(() => expect(api.serviceCodes).toHaveBeenCalled());
    fireEvent.change(nameInput(), { target: { value: "Typed then abandoned" } });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    expect(nameInput()).toHaveValue("");
  });
});

describe("the option lists", () => {
  it("offers only the live service codes the tenant has", async () => {
    api.serviceCodes.mockResolvedValue({
      data: [
        codeRecord(),
        codeRecord({ id: "sc-2", code: "97155", isActive: false }),
        codeRecord({ id: "sc-3", code: "97156", isDeleted: true }),
        codeRecord({ id: "sc-4", code: "97158", description: null }),
      ],
    });
    renderModal();
    await waitFor(() => expect(api.serviceCodes).toHaveBeenCalled());
    openMenu(serviceRow(0).code);
    await waitFor(() =>
      expect(menuLabels()).toEqual([
        "97153 - Adaptive behavior treatment",
        "97158 - No description",
      ])
    );
  });

  it("points the way to the service code screen when there are none", async () => {
    api.serviceCodes.mockResolvedValue({ data: [] });
    renderModal();
    await waitFor(() => expect(api.serviceCodes).toHaveBeenCalled());
    openMenu(serviceRow(0).code);
    expect(menuLabels()[0]).toContain("No service codes found");
  });

  it("copes with a service code response that carries no list", async () => {
    api.serviceCodes.mockResolvedValue({});
    renderModal();
    await waitFor(() => expect(api.serviceCodes).toHaveBeenCalled());
    openMenu(serviceRow(0).code);
    expect(menuLabels()[0]).toContain("No service codes found");
  });

  it("leaves the service codes empty when the fetch fails", async () => {
    api.serviceCodes.mockRejectedValue(new Error("500"));
    renderModal();
    await waitFor(() => expect(api.serviceCodes).toHaveBeenCalled());
    openMenu(serviceRow(0).code);
    expect(menuLabels()[0]).toContain("No service codes found");
  });

  it("offers only the roles that are not switched off", async () => {
    api.roles.mockResolvedValue({
      data: {
        data: [
          { id: "r-1", name: "BCBA" },
          { id: "r-2", name: "RBT", isActive: false },
          { id: "r-3", name: "Supervisor", isActive: true },
        ],
      },
    });
    renderModal();
    await waitFor(() => expect(api.roles).toHaveBeenCalled());
    openMenu(staffRoleSelect());
    await waitFor(() => expect(menuLabels()).toEqual(["BCBA", "Supervisor"]));
  });

  it("reads a role list that is not wrapped in a data envelope", async () => {
    api.roles.mockResolvedValue({ data: [{ id: "r-9", name: "Flat role" }] });
    renderModal();
    await waitFor(() => expect(api.roles).toHaveBeenCalled());
    openMenu(staffRoleSelect());
    await waitFor(() => expect(menuLabels()).toEqual(["Flat role"]));
  });

  it("points the way to the roles screen when there are none", async () => {
    api.roles.mockResolvedValue({ data: { data: [] } });
    renderModal();
    await waitFor(() => expect(api.roles).toHaveBeenCalled());
    openMenu(staffRoleSelect());
    expect(menuLabels()[0]).toContain("No roles found");
  });

  it("leaves the roles empty when the fetch fails", async () => {
    api.roles.mockRejectedValue(new Error("500"));
    renderModal();
    await waitFor(() => expect(api.roles).toHaveBeenCalled());
    openMenu(staffRoleSelect());
    expect(menuLabels()[0]).toContain("No roles found");
  });

  it("fetches nothing without a signed-in tenant", async () => {
    renderModal({ user: { tenantId: null } });
    await waitFor(() => expect(nameInput()).toBeInTheDocument());
    expect(api.serviceCodes).not.toHaveBeenCalled();
    expect(api.roles).not.toHaveBeenCalled();
  });

  it("fetches nothing without an access token", async () => {
    renderModal({ user: { accessToken: null } });
    await waitFor(() => expect(nameInput()).toBeInTheDocument());
    expect(api.serviceCodes).not.toHaveBeenCalled();
    expect(api.roles).not.toHaveBeenCalled();
  });

  it("passes the tenant and tokens to both endpoints", async () => {
    renderModal();
    const args = { tenantId: "tenant-1", accessToken: "access-1", refreshToken: "refresh-1" };
    await waitFor(() => expect(api.serviceCodes).toHaveBeenCalledWith(args));
    expect(api.roles).toHaveBeenCalledWith(args);
  });
});

describe("the repeatable service rows", () => {
  it("opens with a single row and no way to remove it", async () => {
    renderModal();
    await waitFor(() => expect(api.serviceCodes).toHaveBeenCalled());
    // Category, then the row's code and modifier, then staff roles and locations.
    expect(selects()).toHaveLength(5);
    expect(serviceRows()).toHaveLength(0);
  });

  it("adds a row, which brings a remove control to every row", async () => {
    renderModal();
    await waitFor(() => expect(api.serviceCodes).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Add Another Service Code" }));
    expect(selects()).toHaveLength(7);
    expect(serviceRows()).toHaveLength(2);
  });

  it("removes the row that was asked for", async () => {
    renderModal();
    await waitFor(() => expect(api.serviceCodes).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Add Another Service Code" }));
    choose(serviceRow(0).code, "97153 - Adaptive behavior treatment");
    fireEvent.click(serviceRows()[0]);
    expect(selects()).toHaveLength(5);
    expect(valueOf(serviceRow(0).code)).toBe("");
  });

  it("labels only the first row", async () => {
    renderModal();
    await waitFor(() => expect(api.serviceCodes).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Add Another Service Code" }));
    expect(screen.getAllByText("Service Code (CPT/HCPCS)")).toHaveLength(1);
    expect(screen.getAllByText("Modifier")).toHaveLength(1);
  });
});

describe("validation", () => {
  it("refuses a session type with no name and no category", async () => {
    const { onSave } = renderModal();
    await waitFor(() => expect(api.serviceCodes).toHaveBeenCalled());
    await submit();
    expect(await screen.findByText("Session name is required")).toBeInTheDocument();
    expect(screen.getByText("Category is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a session type with no service code", async () => {
    const { onSave } = renderModal();
    await waitFor(() => expect(api.serviceCodes).toHaveBeenCalled());
    fireEvent.change(nameInput(), { target: { value: "Direct therapy" } });
    choose(CATEGORY, "Direct Service");
    await submit();
    expect(await screen.findByText("Service code is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  // The schema checks every row, so a second row left blank blocks the save
  // rather than being quietly dropped from the payload.
  it("refuses a save when an added row was left blank", async () => {
    const { onSave } = renderModal();
    await fillMinimum();
    fireEvent.click(screen.getByRole("button", { name: "Add Another Service Code" }));
    await submit();
    expect(await screen.findByText("Service code is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses more than fifty-nine minutes", async () => {
    const { onSave } = renderModal();
    await fillMinimum();
    fireEvent.change(durationInputs()[1], { target: { value: "75" } });
    await submit();
    expect(await screen.findByText("Must be less than 60")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a negative duration", async () => {
    const { onSave } = renderModal();
    await fillMinimum();
    fireEvent.change(durationInputs()[0], { target: { value: "-1" } });
    await submit();
    expect(await screen.findByText("Must be 0 or greater")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a duration that is not a number at all", async () => {
    const { onSave } = renderModal();
    await fillMinimum();
    fireEvent.change(durationInputs()[0], { target: { value: "" } });
    await submit();
    expect(await screen.findByText("Must be a number")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("surfaces the schema's complaints as a toast", async () => {
    renderModal();
    await waitFor(() => expect(api.serviceCodes).toHaveBeenCalled());
    await submit();
    await waitFor(() => expect(toast.showToast).toHaveBeenCalled());
    expect(toast.showToast.mock.calls[0][0]).toContain("fields need attention");
    expect(toast.showToast.mock.calls[0][1]).toBe("error");
  });
});

describe("the payload", () => {
  it("assembles the minimum a session type needs", async () => {
    const { onSave, onClose } = renderModal();
    await fillMinimum();
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toEqual({
      name: "Direct therapy",
      category: "Direct Service",
      service: [{ serviceCodeId: "sc-1", modifiers: { modifier: "" } }],
      staffRolesAllowed: [],
      locationsAllowed: [],
      defaultDuration: 0,
      isBillable: false,
      isActive: true,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("turns the hours and minutes into a single duration", async () => {
    const { onSave } = renderModal();
    await fillMinimum();
    fireEvent.change(durationInputs()[0], { target: { value: "1" } });
    fireEvent.change(durationInputs()[1], { target: { value: "45" } });
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].defaultDuration).toBe(105);
  });

  it("carries the modifier picked for a service row", async () => {
    const { onSave } = renderModal();
    await fillMinimum();
    choose(serviceRow(0).modifier, "HN - Associate's-level provider");
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].service).toEqual([
      { serviceCodeId: "sc-1", modifiers: { modifier: "HN" } },
    ]);
  });

  it("sends every chosen staff role and location", async () => {
    const { onSave } = renderModal();
    await fillMinimum();
    await waitFor(() => expect(api.roles).toHaveBeenCalled());
    choose(staffRoleSelect(), "BCBA");
    choose(staffRoleSelect(), "RBT");
    choose(locationSelect(), "Telehealth");
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].staffRolesAllowed).toEqual(["r-1", "r-2"]);
    expect(onSave.mock.calls[0][0].locationsAllowed).toEqual(["Telehealth"]);
  });

  it("sends the billable flag and the inactive status", async () => {
    const { onSave } = renderModal();
    await fillMinimum();
    fireEvent.click(document.body.querySelector(".form-checkbox"));
    fireEvent.click(document.body.querySelector(".switch input"));
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ isBillable: true, isActive: false });
  });

  it("clears the form once the save lands", async () => {
    renderModal();
    await fillMinimum();
    await submit();
    await waitFor(() => expect(nameInput()).toHaveValue(""));
  });

  it("reports a refused save and leaves the modal open", async () => {
    const { onSave, onClose } = renderModal();
    const err = new Error("Name already taken");
    onSave.mockRejectedValue(err);
    await fillMinimum();
    await submit();
    await waitFor(() =>
      expect(toast.showApiError).toHaveBeenCalledWith(err, "SAVE_SESSION_TYPE")
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(nameInput()).toHaveValue("Direct therapy");
  });
});

describe("editing an existing session type", () => {
  const stored = (over = {}) => ({
    id: "st-1",
    name: "Direct therapy",
    category: "Direct Service",
    isBillable: true,
    isActive: false,
    defaultDuration: 90,
    locationsAllowed: ["Home", "Telehealth"],
    staffRolesAllowed: ["r-1", null, "r-2"],
    sessionTypeServices: [
      {
        serviceCodeId: "sc-9",
        serviceCode: { id: "sc-9", code: "97155", description: "Protocol modification" },
        modifiers: { modifier1: "UB" },
      },
    ],
    ...over,
  });

  const openEdit = async (data) => {
    const view = renderModal({ mode: "edit", initialData: data });
    await waitFor(() => expect(api.serviceCodes).toHaveBeenCalled());
    return view;
  };

  it("unpicks a stored record back into the form", async () => {
    await openEdit(stored());
    expect(nameInput()).toHaveValue("Direct therapy");
    expect(valueOf(CATEGORY)).toBe("Direct Service");
    expect(durationInputs()[0]).toHaveValue(1);
    expect(durationInputs()[1]).toHaveValue(30);
    expect(document.body.querySelector(".form-checkbox")).toBeChecked();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(chipsOf(locationSelect())).toEqual(["Home", "Telehealth"]);
    // The null in staffRolesAllowed is dropped rather than rendered as a chip.
    await waitFor(() => expect(chipsOf(staffRoleSelect())).toEqual(["BCBA", "RBT"]));
  });

  it("shows a service code the fetched list does not contain", async () => {
    await openEdit(stored());
    expect(valueOf(serviceRow(0).code)).toBe("97155 - Protocol modification");
  });

  it("names a merged-in service code that has no description", async () => {
    await openEdit(
      stored({
        sessionTypeServices: [
          { serviceCodeId: "sc-9", serviceCode: { id: "sc-9", code: "97155" }, modifiers: {} },
        ],
      })
    );
    expect(valueOf(serviceRow(0).code)).toBe("97155 - No description");
  });

  it("does not duplicate a service code the fetched list already has", async () => {
    await openEdit(
      stored({
        sessionTypeServices: [
          {
            serviceCodeId: "sc-1",
            serviceCode: { id: "sc-1", code: "97153", description: "Adaptive behavior treatment" },
            modifiers: {},
          },
        ],
      })
    );
    openMenu(serviceRow(0).code);
    expect(menuLabels()).toEqual(["97153 - Adaptive behavior treatment"]);
  });

  it("shows a modifier that is not in the standard list", async () => {
    await openEdit(stored());
    expect(valueOf(serviceRow(0).modifier)).toBe("UB");
  });

  it("reads a modifier stored under the plain key", async () => {
    await openEdit(
      stored({
        sessionTypeServices: [
          { serviceCodeId: "sc-1", serviceCode: { id: "sc-1", code: "97153" }, modifiers: { modifier: "HN" } },
        ],
      })
    );
    expect(valueOf(serviceRow(0).modifier)).toBe("HN - Associate's-level provider");
  });

  it("reads the older service array shape", async () => {
    await openEdit(
      stored({
        sessionTypeServices: undefined,
        service: [
          {
            serviceCodeId: "sc-9",
            serviceCode: { id: "sc-9", code: "97155", description: "Protocol modification" },
            modifiers: { modifier: "HO" },
          },
        ],
      })
    );
    expect(valueOf(serviceRow(0).code)).toBe("97155 - Protocol modification");
    expect(valueOf(serviceRow(0).modifier)).toBe("HO - Master's-level provider");
  });

  it("offers one blank row for a record with no services at all", async () => {
    await openEdit(stored({ sessionTypeServices: undefined, service: undefined }));
    expect(selects()).toHaveLength(5);
    expect(valueOf(serviceRow(0).code)).toBe("");
    expect(valueOf(serviceRow(0).modifier)).toBe("");
  });

  it("blanks a service row whose stored code id is missing", async () => {
    await openEdit(stored({ sessionTypeServices: [{ modifiers: {} }] }));
    expect(valueOf(serviceRow(0).code)).toBe("");
  });

  it("falls back to blank fields for a record with nothing in it", async () => {
    await openEdit({});
    expect(nameInput()).toHaveValue("");
    expect(valueOf(CATEGORY)).toBe("");
    expect(durationInputs()[0]).toHaveValue(0);
    expect(durationInputs()[1]).toHaveValue(0);
    expect(document.body.querySelector(".form-checkbox")).not.toBeChecked();
    // An `isActive` the record never set reads as on.
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(chipsOf(locationSelect())).toEqual([]);
    expect(chipsOf(staffRoleSelect())).toEqual([]);
  });

  it("ignores stored locations and roles that are not lists", async () => {
    await openEdit(stored({ locationsAllowed: "Home", staffRolesAllowed: "r-1" }));
    expect(chipsOf(locationSelect())).toEqual([]);
    expect(chipsOf(staffRoleSelect())).toEqual([]);
  });

  it("saves the edited record in the API's own shape", async () => {
    const { onSave } = await openEdit(stored());
    await waitFor(() => expect(chipsOf(staffRoleSelect())).toEqual(["BCBA", "RBT"]));
    fireEvent.change(nameInput(), { target: { value: "Renamed therapy" } });
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toEqual({
      name: "Renamed therapy",
      category: "Direct Service",
      service: [{ serviceCodeId: "sc-9", modifiers: { modifier: "UB" } }],
      staffRolesAllowed: ["r-1", "r-2"],
      locationsAllowed: ["Home", "Telehealth"],
      defaultDuration: 90,
      isBillable: true,
      isActive: false,
    });
  });
});
