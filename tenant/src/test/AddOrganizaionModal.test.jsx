import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import formDraftsReducer from "../ReduxStore/features/formDraftsSlice";

/**
 * The organisation information modal: an edit-only form over the tenant's own
 * record, validated by yup.
 *
 * It is not a straight edit form — the record arrives under the API's field
 * names and has to be unpicked on every open (`streetAddress` becomes `street`,
 * `zipCode` becomes `zip`, `state` becomes `stateProvince`), and the country and
 * state are pushed through normalisers that accept an ISO code, a legacy
 * abbreviation or a full name. Name and email are rendered disabled, so the
 * only way to reach their validation arms is to open the modal on a record that
 * already breaks them.
 *
 * The country and state pickers are react-select with their menus portalled to
 * the body; picking a country deliberately blanks the state, and the state
 * picker stays disabled until a country is chosen. The inputs carry no
 * `htmlFor`, so they are addressed by the `name` react-hook-form registers.
 */

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

import AddOrganizationModal from "../Components/ReusableModal/OrganizationModal/AddOrganizaionModal";

const makeStore = () => configureStore({ reducer: { formDrafts: formDraftsReducer } });

// The record as the API hands it back, with everything the schema demands, so
// individual tests can knock out just the field they are interested in.
const COMPLETE_RECORD = {
  name: "Acme Therapy",
  email: "hello@acme.com",
  phone: "08012345678",
  website: "acme.com",
  practiceNPI: "1234567890",
  streetAddress: "1 Marina Road",
  city: "Lagos",
  state: "California",
  country: "United States",
  zipCode: "10001",
  active: true,
};

const renderModal = ({ initialValues, ...props } = {}) => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const view = render(
    <Provider store={makeStore()}>
      <AddOrganizationModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        initialValues={initialValues}
        {...props}
      />
    </Provider>
  );
  return { ...view, onSave, onClose };
};

const field = (name) => document.querySelector(`input[name="${name}"]`);
const saveButton = () => document.querySelector('button[type="submit"]');

// Country renders before state, so the two comboboxes come back in that order.
const comboboxes = () => screen.getAllByRole("combobox");

const pickOption = (combobox, label) => {
  fireEvent.keyDown(combobox, { key: "ArrowDown" });
  fireEvent.change(combobox, { target: { value: label } });
  const option = [...document.querySelectorAll(".rs__option")].find(
    (o) => o.textContent === label
  );
  fireEvent.click(option);
};

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the record it opens on", () => {
  it("unpicks the API's field names onto the form", () => {
    renderModal({ initialValues: COMPLETE_RECORD });
    expect(field("name")).toHaveValue("Acme Therapy");
    expect(field("email")).toHaveValue("hello@acme.com");
    expect(field("phone")).toHaveValue("08012345678");
    expect(field("website")).toHaveValue("acme.com");
    expect(field("practiceNPI")).toHaveValue("1234567890");
    expect(field("street")).toHaveValue("1 Marina Road");
    expect(field("city")).toHaveValue("Lagos");
    expect(field("zip")).toHaveValue("10001");
    expect(screen.getByText("United States")).toBeInTheDocument();
    expect(screen.getByText("California")).toBeInTheDocument();
  });

  it("opens empty when there is no record at all", () => {
    renderModal();
    expect(field("name")).toHaveValue("");
    expect(field("street")).toHaveValue("");
    expect(field("zip")).toHaveValue("");
    expect(screen.getAllByText("-- Select Country --")).not.toHaveLength(0);
  });

  it("blanks each field the record leaves out", () => {
    renderModal({ initialValues: { name: "Acme Therapy" } });
    expect(field("email")).toHaveValue("");
    expect(field("phone")).toHaveValue("");
    expect(field("website")).toHaveValue("");
    expect(field("practiceNPI")).toHaveValue("");
    expect(field("city")).toHaveValue("");
  });

  it("resolves a country stored as an ISO code back to its name", () => {
    renderModal({ initialValues: { ...COMPLETE_RECORD, country: "US", state: "CA" } });
    expect(screen.getByText("United States")).toBeInTheDocument();
    expect(screen.getByText("California")).toBeInTheDocument();
  });

  it("resolves the legacy UK abbreviation the ISO list does not carry", () => {
    renderModal({ initialValues: { ...COMPLETE_RECORD, country: "UK", state: "Kent" } });
    expect(screen.getByText("United Kingdom")).toBeInTheDocument();
    expect(screen.getByText("Kent")).toBeInTheDocument();
  });

  it("leaves the country empty when the stored value resolves to nothing", () => {
    // "Other" is the placeholder older records used where no country applied,
    // and it deliberately resolves to blank so it has to be re-picked.
    renderModal({ initialValues: { ...COMPLETE_RECORD, country: "Other" } });
    expect(screen.queryByText("United States")).not.toBeInTheDocument();
    expect(screen.getAllByText("-- Select Country --")).not.toHaveLength(0);
  });

  it("drops a state that does not belong to the stored country", () => {
    renderModal({ initialValues: { ...COMPLETE_RECORD, state: "Lagos" } });
    expect(screen.queryByText("Lagos")).not.toBeInTheDocument();
  });
});

describe("the state picker", () => {
  it("stays shut until a country has been chosen", () => {
    renderModal();
    expect(document.querySelectorAll(".rs__control--is-disabled")).toHaveLength(1);
  });

  it("opens once a country is chosen", () => {
    renderModal({ initialValues: COMPLETE_RECORD });
    expect(document.querySelectorAll(".rs__control--is-disabled")).toHaveLength(0);
  });

  it("empties itself when the country is changed underneath it", async () => {
    const { onSave } = renderModal({ initialValues: COMPLETE_RECORD });
    pickOption(comboboxes()[0], "Canada");
    expect(screen.queryByText("California")).not.toBeInTheDocument();
    fireEvent.click(saveButton());
    expect(await screen.findByText("State is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("offers the new country's own regions after the switch", async () => {
    const { onSave } = renderModal({ initialValues: COMPLETE_RECORD });
    pickOption(comboboxes()[0], "Canada");
    pickOption(comboboxes()[1], "Ontario");
    fireEvent.click(saveButton());
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      country: "Canada",
      stateProvince: "Ontario",
    });
  });
});

describe("validation", () => {
  it("names every compulsory field that is blank", async () => {
    const { onSave } = renderModal();
    fireEvent.click(saveButton());
    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Phone is required")).toBeInTheDocument();
    expect(screen.getByText("Practice NPI is required")).toBeInTheDocument();
    expect(screen.getByText("Street is required")).toBeInTheDocument();
    expect(screen.getByText("City is required")).toBeInTheDocument();
    expect(screen.getByText("Country is required")).toBeInTheDocument();
    expect(screen.getByText("ZIP is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    expect(toast.showToast).toHaveBeenCalledWith(
      expect.stringContaining("fields need attention"),
      "error"
    );
  });

  it("rejects a record whose stored email is not one", async () => {
    // The email box is disabled, so a broken address can only arrive with the
    // record rather than being typed in.
    renderModal({ initialValues: { ...COMPLETE_RECORD, email: "hello(at)acme" } });
    fireEvent.click(saveButton());
    expect(await screen.findByText("Invalid email")).toBeInTheDocument();
  });

  it("rejects a website that is not a domain or a URL", async () => {
    const { onSave } = renderModal({ initialValues: COMPLETE_RECORD });
    fireEvent.change(field("website"), { target: { value: "not a website" } });
    fireEvent.click(saveButton());
    expect(await screen.findByText("Invalid URL")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("accepts a full URL with a protocol and a path", async () => {
    const { onSave } = renderModal({ initialValues: COMPLETE_RECORD });
    fireEvent.change(field("website"), { target: { value: "https://acme.com/clinic" } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].website).toBe("https://acme.com/clinic");
  });

  it("accepts a website cleared back to nothing", async () => {
    const { onSave } = renderModal({ initialValues: COMPLETE_RECORD });
    fireEvent.change(field("website"), { target: { value: "" } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].website).toBe("");
  });
});

describe("saving", () => {
  it("sends the whole form and shuts itself", async () => {
    const { onSave, onClose } = renderModal({ initialValues: COMPLETE_RECORD });
    fireEvent.change(field("phone"), { target: { value: "08099999999" } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      name: "Acme Therapy",
      email: "hello@acme.com",
      phone: "08099999999",
      website: "acme.com",
      practiceNPI: "1234567890",
      street: "1 Marina Road",
      city: "Lagos",
      stateProvince: "California",
      country: "United States",
      zip: "10001",
      active: true,
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("carries a deactivated organisation's flag through untouched", async () => {
    const { onSave } = renderModal({ initialValues: { ...COMPLETE_RECORD, active: false } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].active).toBe(false);
  });

  it("defaults an organisation with no stored flag to active", async () => {
    const withoutFlag = { ...COMPLETE_RECORD };
    delete withoutFlag.active;
    const { onSave } = renderModal({ initialValues: withoutFlag });
    fireEvent.click(saveButton());
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].active).toBe(true);
  });

  it("stays open when the save rejects", async () => {
    const { onSave, onClose } = renderModal({ initialValues: COMPLETE_RECORD });
    onSave.mockRejectedValue(new Error("server said no"));
    fireEvent.click(saveButton());
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("closing", () => {
  it("closes on Cancel without saving", () => {
    const { onClose, onSave } = renderModal({ initialValues: COMPLETE_RECORD });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("renders nothing while it is shut", () => {
    render(
      <Provider store={makeStore()}>
        <AddOrganizationModal
          isOpen={false}
          onClose={vi.fn()}
          onSave={vi.fn()}
          initialValues={COMPLETE_RECORD}
        />
      </Provider>
    );
    expect(screen.queryByText("Organisation Information")).not.toBeInTheDocument();
  });
});
