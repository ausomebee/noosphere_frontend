import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import formDraftsReducer from "../ReduxStore/features/formDraftsSlice";

/**
 * The add/edit authorization modal. It loads payers, tenant service codes and
 * insurance types when it opens, keeps a repeatable list of authorized service
 * rows, warns about service codes the payer cannot be billed for, validates on
 * submit and emits a payload shaped for the backend.
 *
 * The modal is rendered for real -- ReusableModal, TextInput and SelectInput
 * included -- because most of the branches live in what those controls emit.
 * Every picker is react-select rather than a native <select>, so a field is
 * found by walking up from its label to the enclosing `.input-group` and then
 * driven with ArrowDown/Enter over the portalled option list. The service rows
 * repeat the same four labels, so anything row-specific is scoped to that
 * row's `.bg-gray-50` container first.
 *
 * The modal also mirrors its state into the persisted formDrafts slice through
 * useReduxStateDraft, which restores asynchronously on open; tests that care
 * about a restored draft wait for the field rather than asserting immediately.
 */

const billingApi = vi.hoisted(() => ({
  GetPayerByTenantId: vi.fn(),
  GetTenantServiceCodeByTenantId: vi.fn(),
  GetInsuranceTypeByTenantId: vi.fn(),
}));
vi.mock("../api/billingAndPaymentsApi", () => ({ default: billingApi }));

const toastMock = vi.hoisted(() => ({ showToast: vi.fn(), showApiError: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toastMock.showToast(...a),
  showApiError: (...a) => toastMock.showApiError(...a),
}));

import AddAuthorizationModal from "../Components/ReusableModal/ClientModal/ClientAuthorizationModal";

const makeStore = ({ accessToken = "at", tenantId = "tenant-1", drafts = {} } = {}) =>
  configureStore({
    reducer: { authentication: authReducer, formDrafts: formDraftsReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: accessToken,
        user: { id: "user-1", tenantId, accessToken, refreshToken: "rt" },
      },
      formDrafts: drafts,
    },
  });

const onSubmit = vi.fn();
const onClose = vi.fn();

let store;

const renderModal = ({ storeOptions, ...props } = {}) => {
  store = makeStore(storeOptions);
  return render(
    <Provider store={store}>
      <AddAuthorizationModal
        isOpen
        onClose={onClose}
        onSubmit={onSubmit}
        {...props}
      />
    </Provider>
  );
};

/** Labels carry no htmlFor, so a field is located through its wrapper. */
const groupsIn = (root, labelText) =>
  Array.from(root.querySelectorAll(".input-group")).filter(
    (g) => g.querySelector(".input-group-label")?.textContent.replace(/\*$/, "").trim() === labelText
  );

const group = (labelText) => groupsIn(document.body, labelText)[0];

const serviceRows = () => Array.from(document.body.querySelectorAll(".bg-gray-50"));

const typeInto = (labelText, value) =>
  fireEvent.change(group(labelText).querySelector("input"), { target: { value } });

/**
 * Opens a react-select menu, narrows it to one option by typing, and takes it.
 * Typing first matters: several fields share a long option list and Enter
 * always takes whichever option is focused.
 */
const choose = (fieldGroup, text) => {
  const input = fieldGroup.querySelector("input");
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: "Enter" });
};

const save = () => fireEvent.click(screen.getByRole("button", { name: "Save Authorization" }));

const payerRecord = (over = {}) => ({
  id: "payer-1",
  payerName: "Blue Shield",
  serviceCodes: [{ serviceCodeId: "sc-1" }],
  ...over,
});

const serviceCodeRecord = (over = {}) => ({
  id: "sc-1",
  code: "97153",
  description: "Adaptive behavior",
  isActive: true,
  isDeleted: false,
  ...over,
});

const waitForOptionsLoaded = () =>
  waitFor(() => expect(billingApi.GetInsuranceTypeByTenantId).toHaveBeenCalled());

beforeEach(() => {
  vi.clearAllMocks();
  billingApi.GetPayerByTenantId.mockResolvedValue({ data: [payerRecord()] });
  billingApi.GetTenantServiceCodeByTenantId.mockResolvedValue({
    data: [serviceCodeRecord(), serviceCodeRecord({ id: "sc-2", code: "97155", description: "Protocol modification" })],
  });
  billingApi.GetInsuranceTypeByTenantId.mockResolvedValue({
    data: [
      { id: "ins-1", name: "Commercial", isActive: true },
      { id: "ins-2", name: "Retired plan", isActive: false },
    ],
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("opening the modal", () => {
  it("titles itself for the mode it was given", async () => {
    const { unmount } = renderModal();
    expect(screen.getByText("Add Authorization")).toBeInTheDocument();
    await waitForOptionsLoaded();
    unmount();

    renderModal({ mode: "edit" });
    expect(screen.getByText("Edit Authorization")).toBeInTheDocument();
    await waitForOptionsLoaded();
  });

  it("starts with a single blank service row", async () => {
    renderModal();
    await waitForOptionsLoaded();
    expect(serviceRows()).toHaveLength(1);
    // A lone row cannot be removed, so no delete button is offered.
    expect(screen.queryByRole("button", { name: "Remove service" })).not.toBeInTheDocument();
  });

  it("fetches nothing while it is closed", async () => {
    store = makeStore();
    render(
      <Provider store={store}>
        <AddAuthorizationModal isOpen={false} onClose={onClose} onSubmit={onSubmit} />
      </Provider>
    );
    expect(screen.queryByText("Add Authorization")).not.toBeInTheDocument();
    await waitFor(() => expect(billingApi.GetPayerByTenantId).not.toHaveBeenCalled());
  });

  it("skips all three fetches when the session has no tenant", async () => {
    renderModal({ storeOptions: { tenantId: null } });
    expect(screen.getByText("Add Authorization")).toBeInTheDocument();
    await waitFor(() => expect(billingApi.GetPayerByTenantId).not.toHaveBeenCalled());
    expect(billingApi.GetTenantServiceCodeByTenantId).not.toHaveBeenCalled();
    expect(billingApi.GetInsuranceTypeByTenantId).not.toHaveBeenCalled();
  });

  it("skips all three fetches when the session has no access token", async () => {
    renderModal({ storeOptions: { accessToken: null } });
    await waitFor(() => expect(billingApi.GetPayerByTenantId).not.toHaveBeenCalled());
    expect(billingApi.GetInsuranceTypeByTenantId).not.toHaveBeenCalled();
  });
});

describe("the loaded dropdown options", () => {
  const optionLabels = (fieldGroup) => {
    fireEvent.keyDown(fieldGroup.querySelector("input"), { key: "ArrowDown" });
    return Array.from(document.body.querySelectorAll(".rs__option")).map((o) => o.textContent);
  };

  it("lists every payer the tenant has", async () => {
    billingApi.GetPayerByTenantId.mockResolvedValue({
      data: [payerRecord(), payerRecord({ id: "payer-2", payerName: "Aetna" })],
    });
    renderModal();
    await waitForOptionsLoaded();
    await waitFor(() => expect(optionLabels(group("Payer"))).toEqual(["Blue Shield", "Aetna"]));
  });

  it("keeps only the active insurance types", async () => {
    renderModal();
    await waitForOptionsLoaded();
    await waitFor(() => expect(optionLabels(group("Insurance Type"))).toEqual(["Commercial"]));
  });

  it("keeps only the active, undeleted service codes", async () => {
    billingApi.GetTenantServiceCodeByTenantId.mockResolvedValue({
      data: [
        serviceCodeRecord(),
        serviceCodeRecord({ id: "sc-2", code: "97155", isActive: false }),
        serviceCodeRecord({ id: "sc-3", code: "97156", isDeleted: true }),
      ],
    });
    renderModal();
    await waitForOptionsLoaded();
    await waitFor(() =>
      expect(optionLabels(group("Service Code"))).toEqual(["97153 - Adaptive behavior"])
    );
  });

  it("shows the setup hint for each list that comes back with no data envelope", async () => {
    billingApi.GetPayerByTenantId.mockResolvedValue({});
    billingApi.GetTenantServiceCodeByTenantId.mockResolvedValue({});
    billingApi.GetInsuranceTypeByTenantId.mockResolvedValue({});
    renderModal();
    await waitForOptionsLoaded();
    await waitFor(() => {
      fireEvent.keyDown(group("Payer").querySelector("input"), { key: "ArrowDown" });
      expect(screen.getByText(/No payers found/)).toBeInTheDocument();
    });
  });

  it("logs and shrugs off a rejection from any of the three fetches", async () => {
    billingApi.GetPayerByTenantId.mockRejectedValue(new Error("payers down"));
    billingApi.GetTenantServiceCodeByTenantId.mockRejectedValue(new Error("codes down"));
    billingApi.GetInsuranceTypeByTenantId.mockRejectedValue(new Error("types down"));
    renderModal();
    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith("Failed to load payers:", expect.any(Error))
    );
    expect(console.error).toHaveBeenCalledWith(
      "Failed to load service codes:",
      expect.any(Error)
    );
    expect(console.error).toHaveBeenCalledWith(
      "Failed to load insurance types:",
      expect.any(Error)
    );
    // The form is still usable, just with empty pickers.
    expect(screen.getByText("Add Authorization")).toBeInTheDocument();
  });
});

describe("seeding the form from an existing record", () => {
  it("copies a full record into the fields, reading modifiers under either key", async () => {
    renderModal({
      mode: "edit",
      initialData: {
        title: "2024 plan",
        authNumber: "AN-7",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        payer: "payer-1",
        insuranceType: "ins-1",
        service: [
          { serviceCodeId: "sc-1", modifier: "HO", units: 10, per: "WEEK" },
          // The API spells it `modifiers`; the form has to accept both.
          { serviceCodeId: "sc-2", modifiers: "HP", units: 20, per: "DAY" },
        ],
      },
    });
    await waitForOptionsLoaded();

    expect(group("Authorization Title").querySelector("input")).toHaveValue("2024 plan");
    expect(group("Authorization Number").querySelector("input")).toHaveValue("AN-7");
    expect(group("Start Date").querySelector("input")).toHaveValue("2024-01-01");
    expect(group("End Date").querySelector("input")).toHaveValue("2024-12-31");
    expect(serviceRows()).toHaveLength(2);
    expect(groupsIn(serviceRows()[0], "Units")[0].querySelector("input")).toHaveValue(10);
    expect(serviceRows()[0]).toHaveTextContent("HO - Master's-level provider");
    expect(serviceRows()[1]).toHaveTextContent("HP - Doctoral-level provider");
    await waitFor(() => expect(screen.getByText("Blue Shield")).toBeInTheDocument());
    expect(screen.getByText("Commercial")).toBeInTheDocument();
  });

  it("blanks every field a partial record leaves out", async () => {
    renderModal({
      mode: "edit",
      initialData: { service: [{ serviceCodeId: "sc-1" }] },
    });
    await waitForOptionsLoaded();
    expect(group("Authorization Title").querySelector("input")).toHaveValue("");
    expect(group("End Date").querySelector("input")).toHaveValue("");
    expect(groupsIn(serviceRows()[0], "Units")[0].querySelector("input")).toHaveValue(null);
    // Modifier overrides the "-- Select {label} --" default placeholder.
    expect(serviceRows()[0]).toHaveTextContent("Optional");
  });

  it("gives an empty record one blank service row instead of none", async () => {
    renderModal({ mode: "edit", initialData: { title: "Empty", service: [] } });
    await waitForOptionsLoaded();
    expect(serviceRows()).toHaveLength(1);
  });

  it("re-seeds when a different record is selected while it stays mounted", async () => {
    const { rerender } = renderModal({ mode: "edit", initialData: { title: "First" } });
    await waitForOptionsLoaded();
    expect(group("Authorization Title").querySelector("input")).toHaveValue("First");

    rerender(
      <Provider store={store}>
        <AddAuthorizationModal
          isOpen
          mode="edit"
          initialData={{ title: "Second" }}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      </Provider>
    );
    expect(group("Authorization Title").querySelector("input")).toHaveValue("Second");
  });

  it("ignores initialData in add mode so a half-typed form is not overwritten", async () => {
    const { rerender } = renderModal({ initialData: { title: "From record" } });
    await waitForOptionsLoaded();
    typeInto("Authorization Title", "Typed by hand");

    rerender(
      <Provider store={store}>
        <AddAuthorizationModal
          isOpen
          mode="add"
          initialData={{ title: "A different record" }}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      </Provider>
    );
    expect(group("Authorization Title").querySelector("input")).toHaveValue("Typed by hand");
  });
});

describe("the service row list", () => {
  it("appends a blank row and lets either row be removed", async () => {
    renderModal();
    await waitForOptionsLoaded();
    fireEvent.click(screen.getByRole("button", { name: /Add Another Service/ }));
    expect(serviceRows()).toHaveLength(2);

    typeInto("Authorization Title", "keep me");
    fireEvent.change(groupsIn(serviceRows()[0], "Units")[0].querySelector("input"), {
      target: { value: "7" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Remove service" })[0]);

    expect(serviceRows()).toHaveLength(1);
    // The surviving row is the second one, so the 7 typed above is gone.
    expect(groupsIn(serviceRows()[0], "Units")[0].querySelector("input")).toHaveValue(null);
  });

  it("refuses to remove the last remaining row", async () => {
    renderModal();
    await waitForOptionsLoaded();
    fireEvent.click(screen.getByRole("button", { name: /Add Another Service/ }));
    fireEvent.click(screen.getAllByRole("button", { name: "Remove service" })[0]);
    // Back to one row: the button is gone, so the guard is reached by adding
    // and removing twice in a row.
    fireEvent.click(screen.getByRole("button", { name: /Add Another Service/ }));
    fireEvent.click(screen.getAllByRole("button", { name: "Remove service" })[1]);
    expect(serviceRows()).toHaveLength(1);
    expect(toastMock.showToast).not.toHaveBeenCalled();
  });

  it("edits only the row that was touched", async () => {
    renderModal();
    await waitForOptionsLoaded();
    fireEvent.click(screen.getByRole("button", { name: /Add Another Service/ }));
    fireEvent.change(groupsIn(serviceRows()[1], "Units")[0].querySelector("input"), {
      target: { value: "42" },
    });
    expect(groupsIn(serviceRows()[0], "Units")[0].querySelector("input")).toHaveValue(null);
    expect(groupsIn(serviceRows()[1], "Units")[0].querySelector("input")).toHaveValue(42);
  });
});

describe("the unbillable-service warning", () => {
  it("says nothing while no service code is chosen", async () => {
    renderModal();
    await waitForOptionsLoaded();
    expect(document.body.querySelector(".service-code-warning")).not.toBeInTheDocument();
  });

  it("flags a code that is no longer in the tenant's list", async () => {
    renderModal({ mode: "edit", initialData: { service: [{ serviceCodeId: "retired-code" }] } });
    await waitForOptionsLoaded();
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "This service code is inactive or no longer available."
      )
    );
  });

  it("stays quiet about a live code while no payer is selected", async () => {
    renderModal({ mode: "edit", initialData: { service: [{ serviceCodeId: "sc-1" }] } });
    await waitForOptionsLoaded();
    await waitFor(() =>
      expect(document.body.querySelector(".service-code-warning")).not.toBeInTheDocument()
    );
  });

  it("warns once a payer with no rate for the code is selected", async () => {
    renderModal({
      mode: "edit",
      // sc-2 is a live code, but the payer fixture only covers sc-1.
      initialData: { payer: "payer-1", service: [{ serviceCodeId: "sc-2" }] },
    });
    await waitForOptionsLoaded();
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Blue Shield has no rate configured for 97155."
      )
    );
  });

  it("says nothing when the payer does cover the code", async () => {
    renderModal({
      mode: "edit",
      initialData: { payer: "payer-1", service: [{ serviceCodeId: "sc-1" }] },
    });
    await waitForOptionsLoaded();
    await waitFor(() => expect(screen.getByText("Blue Shield")).toBeInTheDocument());
    expect(document.body.querySelector(".service-code-warning")).not.toBeInTheDocument();
  });

  it("treats a payer with no service-code list as covering nothing", async () => {
    billingApi.GetPayerByTenantId.mockResolvedValue({
      data: [payerRecord({ serviceCodes: null })],
    });
    renderModal({
      mode: "edit",
      initialData: { payer: "payer-1", service: [{ serviceCodeId: "sc-1" }] },
    });
    await waitForOptionsLoaded();
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Blue Shield has no rate configured for 97153."
      )
    );
  });
});

describe("submitting", () => {
  const fillHeader = async () => {
    typeInto("Authorization Title", "2024 plan");
    typeInto("Authorization Number", "AN-7");
    typeInto("Start Date", "2024-01-01");
    // The payer list only exists once its fetch resolves, so the menu is
    // re-opened until an option shows up.
    await waitFor(() => {
      fireEvent.keyDown(group("Payer").querySelector("input"), { key: "ArrowDown" });
      expect(document.body.querySelector(".rs__option")).toBeInTheDocument();
    });
    choose(group("Payer"), "Blue Shield");
  };

  it("refuses a form with any required header field missing", async () => {
    renderModal();
    await waitForOptionsLoaded();
    typeInto("Authorization Title", "2024 plan");
    save();
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Please fill all required fields", "error")
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("refuses a service row with no service code", async () => {
    renderModal({
      mode: "edit",
      initialData: {
        title: "t",
        authNumber: "n",
        startDate: "2024-01-01",
        payer: "payer-1",
        service: [{ units: 5 }],
      },
    });
    await waitForOptionsLoaded();
    save();
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        "Please select a service code and enter valid units",
        "error"
      )
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("refuses a service row with no units at all", async () => {
    renderModal({
      mode: "edit",
      initialData: {
        title: "t",
        authNumber: "n",
        startDate: "2024-01-01",
        payer: "payer-1",
        service: [{ serviceCodeId: "sc-1" }],
      },
    });
    await waitForOptionsLoaded();
    save();
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        "Please select a service code and enter valid units",
        "error"
      )
    );
  });

  it("refuses a service row with zero units", async () => {
    renderModal({
      mode: "edit",
      initialData: {
        title: "t",
        authNumber: "n",
        startDate: "2024-01-01",
        payer: "payer-1",
        service: [{ serviceCodeId: "sc-1", units: "0" }],
      },
    });
    await waitForOptionsLoaded();
    // The units field carries min="1", so clicking Save is stopped by native
    // constraint validation before the form's own submit handler ever runs;
    // the event is dispatched directly to reach the numeric guard.
    fireEvent.submit(document.getElementById("modal-form"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        "Please select a service code and enter valid units",
        "error"
      )
    );
  });

  it("refuses the same service code twice", async () => {
    renderModal({
      mode: "edit",
      initialData: {
        title: "t",
        authNumber: "n",
        startDate: "2024-01-01",
        payer: "payer-1",
        service: [
          { serviceCodeId: "sc-1", units: 5 },
          { serviceCodeId: "sc-1", units: 6 },
        ],
      },
    });
    await waitForOptionsLoaded();
    save();
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        "Duplicate service codes are not allowed",
        "error"
      )
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("emits the backend payload, clears the draft and closes on success", async () => {
    onSubmit.mockResolvedValue(undefined);
    renderModal({
      mode: "edit",
      initialData: {
        title: "2024 plan",
        authNumber: "AN-7",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        payer: "payer-1",
        insuranceType: "ins-1",
        service: [{ serviceCodeId: "sc-1", modifier: "HO", units: "10", per: "WEEK" }],
      },
    });
    await waitForOptionsLoaded();
    save();

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        title: "2024 plan",
        authNumber: "AN-7",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        payer: "payer-1",
        insuranceType: "ins-1",
        service: [{ serviceCodeId: "sc-1", modifiers: "HO", units: 10, per: "WEEK" }],
      })
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("nulls a blank end date and insurance type and defaults the period", async () => {
    onSubmit.mockResolvedValue(undefined);
    renderModal({
      mode: "edit",
      initialData: {
        title: "2024 plan",
        authNumber: "AN-7",
        startDate: "2024-01-01",
        payer: "payer-1",
        service: [{ serviceCodeId: "sc-1", units: "10" }],
      },
    });
    await waitForOptionsLoaded();
    save();
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          endDate: null,
          insuranceType: null,
          service: [{ serviceCodeId: "sc-1", modifiers: "", units: 10, per: "SESSION" }],
        })
      )
    );
  });

  it("keeps the modal open and surfaces the error when the save fails", async () => {
    const failure = new Error("409");
    onSubmit.mockRejectedValue(failure);
    renderModal({
      mode: "edit",
      initialData: {
        title: "2024 plan",
        authNumber: "AN-7",
        startDate: "2024-01-01",
        payer: "payer-1",
        service: [{ serviceCodeId: "sc-1", units: "10" }],
      },
    });
    await waitForOptionsLoaded();
    save();
    await waitFor(() =>
      expect(toastMock.showApiError).toHaveBeenCalledWith(failure, "SAVE_AUTHORIZATION")
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("Edit Authorization")).toBeInTheDocument();
  });

  it("saves a form filled in entirely through the controls", async () => {
    onSubmit.mockResolvedValue(undefined);
    renderModal();
    await waitForOptionsLoaded();
    await fillHeader();
    choose(group("Service Code"), "97153");
    fireEvent.change(groupsIn(serviceRows()[0], "Units")[0].querySelector("input"), {
      target: { value: "10" },
    });
    choose(groupsIn(serviceRows()[0], "Per")[0], "Per Week");
    save();

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "2024 plan",
          authNumber: "AN-7",
          payer: "payer-1",
          service: [
            expect.objectContaining({ serviceCodeId: "sc-1", units: 10, per: "WEEK" }),
          ],
        })
      )
    );
  });

  it("clears the persisted draft only after the save lands", async () => {
    onSubmit.mockResolvedValue(undefined);
    renderModal({
      storeOptions: {
        drafts: {
          "add-authorization": {
            values: {
              title: "restored",
              authNumber: "AN-1",
              startDate: "2024-01-01",
              endDate: "",
              payer: "payer-1",
              insuranceType: "",
              service: [{ serviceCodeId: "sc-1", modifier: "", units: "3", per: "" }],
            },
            savedAt: Date.now(),
          },
        },
      },
    });
    await waitForOptionsLoaded();
    // The restore lands on a timeout, so the field is waited for.
    await waitFor(() =>
      expect(group("Authorization Title").querySelector("input")).toHaveValue("restored")
    );
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    await waitFor(() =>
      expect(store.getState().formDrafts["add-authorization"]).toBeUndefined()
    );
  });
});

describe("the footer buttons", () => {
  it("closes without submitting on cancel", async () => {
    renderModal();
    await waitForOptionsLoaded();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables the save button while the parent reports a save in flight", async () => {
    renderModal({ loading: true });
    await waitForOptionsLoaded();
    // A busy primary swaps its label for a spinner, so it has no accessible
    // name left to query by.
    const primary = document.body.querySelector("button[type='submit'].modal-btn");
    expect(primary).toBeDisabled();
    expect(primary.querySelector(".modal-btn-spinner")).toBeInTheDocument();
  });
});
