import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../ReduxStore/features/authentication";
import formDraftsReducer from "../ReduxStore/features/formDraftsSlice";

/**
 * The staff member's "Edit Basic Information" modal: one yup-validated form over
 * a record that already exists, plus a role list fetched every time the modal
 * opens.
 *
 * Two details govern the tests. The role fetch unwraps three possible response
 * shapes (`data.data`, a bare `data`, or nothing) and hides roles explicitly
 * switched off, so each shape gets its own fixture. And the country/state pair
 * is normalised through `geoOptions`, which accepts ISO codes and legacy
 * abbreviations as well as display names — a stored "US"/"CA" has to open as
 * United States/California, and changing the country has to blank the state
 * because the old one belongs to the old country.
 *
 * The pickers are react-select portalled to the body, addressed here by their
 * position in the form: gender, staff role, country, state.
 *
 * Saving is driven by submitting the form rather than by clicking Save, because
 * jsdom refuses to submit a form that fails HTML constraint validation and the
 * email field is a `type="email"` — a deliberately malformed address would
 * never reach the yup schema through a click. The click path is covered
 * separately by the in-flight test.
 *
 * Note that `initialData` sits in the dependency list of the effect that resets
 * the form, so every render below passes one stable object rather than a fresh
 * literal, which would loop. Note too that `ReusableModal` ignores the
 * `primaryButtonDisabled` prop this modal passes — only `primaryButtonLoading`
 * actually disables Save.
 */

const roles = vi.hoisted(() => vi.fn());
vi.mock("../api/roleApi", () => ({ default: { GetAllRolesByTenantId: roles } }));

const toast = vi.hoisted(() => vi.fn());
vi.mock("../Helper/ShowToast", () => ({ showToast: toast, showApiError: vi.fn() }));

import EditBasicInfoModal from "../Components/ReusableModal/OrganizationModal/EditBasicInfoModal";

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

// A record already in the API's own shape: the country and state arrive as the
// codes older staff records were saved with, not as display names.
const STAFF_RECORD = Object.freeze({
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  phoneNumber: "+1 (555) 010-2030",
  DOB: "1990-04-15T00:00:00.000Z",
  gender: "female",
  practiceNPI: "1234567890",
  staffRole: "role-1",
  address: "12 Analytical Way",
  city: "Berkeley",
  state: "CA",
  zip: "94702",
  country: "US",
  active: false,
});

// `initialData` is an effect dependency, so it must never be a fresh literal.
const NO_RECORD = undefined;

const renderModal = ({ user, initialData = NO_RECORD, ...props } = {}) => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const view = render(
    <Provider store={makeStore(user)}>
      <EditBasicInfoModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        initialData={initialData}
        tenantStaffId="staff-1"
        {...props}
      />
    </Provider>
  );
  return { ...view, onSave, onClose };
};

const selects = () => Array.from(document.body.querySelectorAll(".select-input-wrapper"));
const GENDER = 0;
const STAFF_ROLE = 1;
const COUNTRY = 2;
const STATE = 3;

const openMenu = (index) => {
  const input = selects()[index].querySelector("input");
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
};

const lastMenu = () => {
  const menus = document.body.querySelectorAll(".rs__menu");
  return menus[menus.length - 1];
};

const menuLabels = () => {
  const menu = lastMenu();
  const options = menu.querySelectorAll(".rs__option");
  return options.length ? Array.from(options).map((o) => o.textContent) : [menu.textContent];
};

// The country list runs to a couple of hundred entries, so the search box is
// typed into first to narrow the menu before the option is clicked.
const choose = (index, label, search) => {
  const input = selects()[index].querySelector("input");
  openMenu(index);
  if (search) fireEvent.change(input, { target: { value: search } });
  const option = Array.from(lastMenu().querySelectorAll(".rs__option")).find(
    (o) => o.textContent === label
  );
  if (!option) throw new Error(`no option "${label}" in select ${index}`);
  fireEvent.click(option);
};

const valueOf = (index) =>
  selects()[index].querySelector(".rs__single-value")?.textContent ?? "";

const field = (placeholder) => screen.getByPlaceholderText(placeholder);
const dobInput = () => document.body.querySelector('input[type="date"]');
const activeSwitch = () => document.body.querySelector(".switch input");
const primary = () => document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.body.querySelector(".modal-btn-secondary");

const submit = async () =>
  act(async () => {
    fireEvent.submit(document.getElementById("modal-form"));
  });

const roleList = [
  { id: "role-1", name: "BCBA", isActive: true },
  { id: "role-2", name: "RBT" },
];

beforeEach(() => {
  vi.clearAllMocks();
  roles.mockResolvedValue({ data: { data: roleList } });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the modal shell", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(document.body.querySelector(".modal-content")).toBeNull();
    expect(roles).not.toHaveBeenCalled();
  });

  it("opens with blank fields when there is no record to edit", async () => {
    renderModal();
    await waitFor(() => expect(roles).toHaveBeenCalled());
    expect(field("Enter Full Name")).toHaveValue("");
    expect(field("Enter Email")).toHaveValue("");
    expect(field("Enter Phone Number")).toHaveValue("");
    expect(dobInput()).toHaveValue("");
    expect(valueOf(GENDER)).toBe("");
    expect(valueOf(COUNTRY)).toBe("");
    // A staff member with no record yet still defaults to active.
    expect(activeSwitch()).toBeChecked();
  });

  // Cancel resets the form, and the record it was opened on is what the reset
  // falls back to, so an abandoned edit reverts rather than blanking out.
  it("throws away an unsaved edit from Cancel", async () => {
    const { onClose } = renderModal({ initialData: STAFF_RECORD });
    await waitFor(() => expect(field("Enter Full Name")).toHaveValue("Ada Lovelace"));
    fireEvent.change(field("Enter Full Name"), { target: { value: "Typed then abandoned" } });
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(field("Enter Full Name")).toHaveValue("Ada Lovelace");
  });

  it("throws away an unsaved edit from Escape", async () => {
    const { onClose } = renderModal({ initialData: STAFF_RECORD });
    await waitFor(() => expect(field("Enter Full Name")).toHaveValue("Ada Lovelace"));
    fireEvent.change(field("Enter Full Name"), { target: { value: "Typed then abandoned" } });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(field("Enter Full Name")).toHaveValue("Ada Lovelace");
  });

  it("blanks the form from Cancel when it was opened on no record", async () => {
    const { onClose } = renderModal();
    await waitFor(() => expect(roles).toHaveBeenCalled());
    fireEvent.change(field("Enter Full Name"), { target: { value: "Typed then abandoned" } });
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(field("Enter Full Name")).toHaveValue("");
  });
});

describe("the staff role list", () => {
  it("passes the tenant and tokens to the roles endpoint", async () => {
    renderModal();
    await waitFor(() =>
      expect(roles).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        accessToken: "access-1",
        refreshToken: "refresh-1",
      })
    );
  });

  it("offers only the roles that are not switched off", async () => {
    roles.mockResolvedValue({
      data: {
        data: [
          ...roleList,
          { id: "role-3", name: "Retired role", isActive: false },
        ],
      },
    });
    renderModal();
    await waitFor(() => expect(roles).toHaveBeenCalled());
    openMenu(STAFF_ROLE);
    await waitFor(() => expect(menuLabels()).toEqual(["BCBA", "RBT"]));
  });

  it("reads a role list that is not wrapped in a data envelope", async () => {
    roles.mockResolvedValue({ data: [{ id: "role-9", name: "Flat role" }] });
    renderModal();
    await waitFor(() => expect(roles).toHaveBeenCalled());
    openMenu(STAFF_ROLE);
    await waitFor(() => expect(menuLabels()).toEqual(["Flat role"]));
  });

  it("points the way to the roles screen when the response is empty", async () => {
    roles.mockResolvedValue({});
    renderModal();
    await waitFor(() => expect(roles).toHaveBeenCalled());
    openMenu(STAFF_ROLE);
    expect(menuLabels()[0]).toContain("No roles found");
  });

  it("points the way to the roles screen when the fetch fails", async () => {
    roles.mockRejectedValue(new Error("500"));
    renderModal();
    await waitFor(() => expect(roles).toHaveBeenCalled());
    openMenu(STAFF_ROLE);
    expect(menuLabels()[0]).toContain("No roles found");
  });
});

describe("opening on an existing record", () => {
  it("unpicks the stored record into the form", async () => {
    renderModal({ initialData: STAFF_RECORD });
    await waitFor(() => expect(field("Enter Full Name")).toHaveValue("Ada Lovelace"));
    expect(field("Enter Email")).toHaveValue("ada@example.com");
    expect(field("Enter Phone Number")).toHaveValue("+1 (555) 010-2030");
    expect(field("Enter NPI")).toHaveValue("1234567890");
    expect(field("Enter Address")).toHaveValue("12 Analytical Way");
    expect(field("Enter City")).toHaveValue("Berkeley");
    expect(field("Enter ZIP")).toHaveValue("94702");
    expect(dobInput()).toHaveValue("1990-04-15");
    expect(valueOf(GENDER)).toBe("Female");
    expect(activeSwitch()).not.toBeChecked();
    await waitFor(() => expect(valueOf(STAFF_ROLE)).toBe("BCBA"));
  });

  // The record holds ISO codes; the pickers list display names.
  it("resolves a stored country and state code to their display names", async () => {
    renderModal({ initialData: STAFF_RECORD });
    await waitFor(() => expect(valueOf(COUNTRY)).toBe("United States"));
    expect(valueOf(STATE)).toBe("California");
  });

  it("blanks every field a record left unset", async () => {
    const sparse = Object.freeze({ fullName: "Only a name" });
    renderModal({ initialData: sparse });
    await waitFor(() => expect(field("Enter Full Name")).toHaveValue("Only a name"));
    expect(field("Enter Email")).toHaveValue("");
    expect(field("Enter Phone Number")).toHaveValue("");
    expect(field("Enter NPI")).toHaveValue("");
    expect(field("Enter Address")).toHaveValue("");
    expect(field("Enter City")).toHaveValue("");
    expect(field("Enter ZIP")).toHaveValue("");
    expect(dobInput()).toHaveValue("");
    expect(valueOf(GENDER)).toBe("");
    expect(valueOf(COUNTRY)).toBe("");
    expect(valueOf(STATE)).toBe("");
    // `active` is read with ??, so an absent flag still opens switched on.
    expect(activeSwitch()).toBeChecked();
  });

  it("blanks a state whose country is not one the picker knows", async () => {
    const unknownCountry = Object.freeze({ country: "Atlantis", state: "Poseidonis" });
    renderModal({ initialData: unknownCountry });
    await waitFor(() => expect(roles).toHaveBeenCalled());
    expect(valueOf(COUNTRY)).toBe("");
    expect(valueOf(STATE)).toBe("");
  });
});

describe("the country and state pair", () => {
  it("locks the state picker until a country is chosen", async () => {
    renderModal();
    await waitFor(() => expect(roles).toHaveBeenCalled());
    expect(selects()[STATE].querySelector(".rs__control--is-disabled")).not.toBeNull();
  });

  it("unlocks the state picker and offers that country's states", async () => {
    renderModal();
    await waitFor(() => expect(roles).toHaveBeenCalled());
    choose(COUNTRY, "United States", "United Stat");
    await waitFor(() => expect(valueOf(COUNTRY)).toBe("United States"));
    expect(selects()[STATE].querySelector(".rs__control--is-disabled")).toBeNull();
    choose(STATE, "California", "Calif");
    expect(valueOf(STATE)).toBe("California");
  });

  it("drops the state when the country changes underneath it", async () => {
    renderModal({ initialData: STAFF_RECORD });
    await waitFor(() => expect(valueOf(STATE)).toBe("California"));
    choose(COUNTRY, "Canada", "Canad");
    await waitFor(() => expect(valueOf(COUNTRY)).toBe("Canada"));
    expect(valueOf(STATE)).toBe("");
  });

  it("offers no state that belongs to a different country", async () => {
    renderModal({ initialData: STAFF_RECORD });
    await waitFor(() => expect(valueOf(COUNTRY)).toBe("United States"));
    openMenu(STATE);
    fireEvent.change(selects()[STATE].querySelector("input"), {
      target: { value: "Ontario" },
    });
    expect(menuLabels()[0]).toContain("This country has no states/provinces.");
  });
});

describe("validation", () => {
  it("refuses a record with every required field missing", async () => {
    const { onSave } = renderModal();
    await waitFor(() => expect(roles).toHaveBeenCalled());
    await submit();
    expect(await screen.findByText("Full Name is required")).toBeInTheDocument();
    expect(screen.getByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Gender is required")).toBeInTheDocument();
    expect(screen.getByText("Staff Role is required")).toBeInTheDocument();
    expect(screen.getByText("Address is required")).toBeInTheDocument();
    expect(screen.getByText("City is required")).toBeInTheDocument();
    expect(screen.getByText("State is required")).toBeInTheDocument();
    expect(screen.getByText("ZIP code is required")).toBeInTheDocument();
    expect(screen.getByText("Country is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  // The phone rule is a pattern match rather than a presence check, and yup
  // runs it against the empty string too, so a missing number is reported as a
  // malformed one rather than as "Phone Number is required".
  it("reports a missing phone number as a malformed one", async () => {
    renderModal();
    await waitFor(() => expect(roles).toHaveBeenCalled());
    await submit();
    expect(await screen.findByText("Invalid phone number")).toBeInTheDocument();
    expect(screen.queryByText("Phone Number is required")).toBeNull();
  });

  // NPI is declared optional, but the pattern is applied to the empty string as
  // well, so a staff member without an NPI cannot be saved at all.
  it("blocks the save over an NPI that was never filled in", async () => {
    const { onSave } = renderModal({
      initialData: Object.freeze({ ...STAFF_RECORD, practiceNPI: "" }),
    });
    await waitFor(() => expect(valueOf(STAFF_ROLE)).toBe("BCBA"));
    await submit();
    expect(
      await screen.findByText("NPI must be a 10-digit number")
    ).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("surfaces the schema's complaints as a toast", async () => {
    renderModal();
    await waitFor(() => expect(roles).toHaveBeenCalled());
    await submit();
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(toast.mock.calls[0][0]).toContain("fields need attention");
    expect(toast.mock.calls[0][1]).toBe("error");
  });

  it("refuses a malformed email", async () => {
    const { onSave } = renderModal({ initialData: STAFF_RECORD });
    await waitFor(() => expect(valueOf(STAFF_ROLE)).toBe("BCBA"));
    fireEvent.change(field("Enter Email"), { target: { value: "not-an-email" } });
    await submit();
    expect(await screen.findByText("Invalid email")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a phone number that is too short to be one", async () => {
    const { onSave } = renderModal({ initialData: STAFF_RECORD });
    await waitFor(() => expect(valueOf(STAFF_ROLE)).toBe("BCBA"));
    fireEvent.change(field("Enter Phone Number"), { target: { value: "12345" } });
    await submit();
    expect(await screen.findByText("Invalid phone number")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses an NPI that is not ten digits", async () => {
    const { onSave } = renderModal({ initialData: STAFF_RECORD });
    await waitFor(() => expect(valueOf(STAFF_ROLE)).toBe("BCBA"));
    fireEvent.change(field("Enter NPI"), { target: { value: "123" } });
    await submit();
    expect(await screen.findByText("NPI must be a 10-digit number")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a date of birth in the future", async () => {
    const { onSave } = renderModal({ initialData: STAFF_RECORD });
    await waitFor(() => expect(valueOf(STAFF_ROLE)).toBe("BCBA"));
    fireEvent.change(dobInput(), { target: { value: "2999-01-01" } });
    await submit();
    expect(
      await screen.findByText("Date of Birth cannot be in the future")
    ).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("saving", () => {
  const openOnRecord = async (over) => {
    const view = renderModal({ initialData: over ?? STAFF_RECORD });
    await waitFor(() => expect(valueOf(STAFF_ROLE)).toBe("BCBA"));
    return view;
  };

  it("sends the whole record back with the staff id and tokens", async () => {
    const { onSave, onClose } = await openOnRecord();
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      id: "staff-1",
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      gender: "female",
      staffRole: "role-1",
      country: "United States",
      state: "California",
      zip: "94702",
      active: false,
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("carries an edited name and a flipped active switch", async () => {
    const { onSave } = await openOnRecord();
    fireEvent.change(field("Enter Full Name"), { target: { value: "Ada L." } });
    fireEvent.click(activeSwitch());
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      fullName: "Ada L.",
      active: true,
    });
  });

  // The post-save reset takes no arguments, so it restores the record the modal
  // was opened on rather than blanking the fields; the modal closes either way.
  it("puts the form back on the stored record once the save lands", async () => {
    const { onClose } = await openOnRecord();
    fireEvent.change(field("Enter Full Name"), { target: { value: "Ada L." } });
    await submit();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(field("Enter Full Name")).toHaveValue("Ada Lovelace");
  });

  it("shows the server's own message when the save is refused", async () => {
    const { onSave, onClose } = await openOnRecord();
    onSave.mockRejectedValue({
      response: { data: { message: "That email is already taken" }, status: 409 },
    });
    await submit();
    expect(await screen.findByText("That email is already taken")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(field("Enter Full Name")).toHaveValue("Ada Lovelace");
  });

  it("falls back to the thrown error's message when the server sent none", async () => {
    const { onSave } = await openOnRecord();
    onSave.mockRejectedValue(new Error("Network Error"));
    await submit();
    expect(await screen.findByText("Network Error")).toBeInTheDocument();
  });

  it("falls back to a generic message when the failure carries nothing", async () => {
    const { onSave } = await openOnRecord();
    onSave.mockRejectedValue({});
    await submit();
    expect(
      await screen.findByText("Failed to save basic information")
    ).toBeInTheDocument();
  });

  it("clears a previous failure's message on the next attempt", async () => {
    const { onSave } = await openOnRecord();
    onSave.mockRejectedValueOnce(new Error("Network Error"));
    await submit();
    expect(await screen.findByText("Network Error")).toBeInTheDocument();
    await submit();
    await waitFor(() => expect(screen.queryByText("Network Error")).toBeNull());
  });

  it("locks the Save button while the request is in flight", async () => {
    let release;
    const { onSave } = await openOnRecord();
    onSave.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    await submit();
    await waitFor(() => expect(primary()).toBeDisabled());
    await act(async () => { release(); });
    await waitFor(() => expect(primary()).not.toBeDisabled());
  });
});
