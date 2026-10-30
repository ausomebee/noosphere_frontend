import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";

import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The organisation's General page: three permission-gated sections (the
 * organisation card, the licence list and the document list) over three fetches
 * that all run on mount, plus the save/delete handlers behind four modals.
 *
 * All four modals are probes -- the page's own job is to shape their
 * `initialValues` and to turn what they hand back into an API payload, so the
 * tests call the recorded `onSave`/`onConfirm` directly. `CustomTable` is left
 * real, because the licence list view and the document list are only reachable
 * through its row action menu, and the document viewer hook is mocked since it
 * throws outside its provider.
 *
 * The settings slice is seeded as already loaded so `useFormatSettings` does
 * not add a fourth fetch to every test.
 */

const api = vi.hoisted(() => ({
  GetOrganizationInformationByTenantId: vi.fn(),
  GetLicenseByTenantId: vi.fn(),
  GetSingleDocumentByTenantId: vi.fn(),
  UpdateOrganizationInformation: vi.fn(),
  CreateOrganizationLicense: vi.fn(),
  UpdateOrganizationLicense: vi.fn(),
  DeleteLicense: vi.fn(),
  CreateDocument: vi.fn(),
  DeleteDocument: vi.fn(),
}));
vi.mock("../api/organisationApis", () => ({ default: api }));

const toast = vi.hoisted(() => ({ showToast: vi.fn(), showApiError: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: (...a) => toast.showApiError(...a),
}));

const viewer = vi.hoisted(() => ({ openDocument: vi.fn(), downloadDocument: vi.fn() }));
vi.mock("../hooks/useDocumentViewer", () => ({ default: () => viewer }));

const probes = vi.hoisted(() => {
  const props = {};
  const record = (name) => (received) => {
    props[name] = received;
    return received.isOpen ? <div data-testid={`${name}-modal`} /> : null;
  };
  return { props, record };
});
vi.mock("../Components/ReusableModal/OrganizationModal/AddOrganizaionModal", () => ({
  default: probes.record("org"),
}));
vi.mock("../Components/ReusableModal/OrganizationModal/AddLicensesModal", () => ({
  default: probes.record("license"),
}));
vi.mock("../Components/ReusableModal/OrganizationModal/UploadOrganizationFileModal", () => ({
  default: probes.record("file"),
}));
vi.mock("../Components/ReusableModal/OrganizationModal/DeleteModal", () => ({
  default: probes.record("delete"),
}));

import General from "../Pages/Organisation/General/General";

const store = ({ permissions, tenantId = "tenant-1" } = {}) =>
  configureStore({
    reducer: { authentication: authReducer, generalSettings: generalSettingsReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user: {
          id: "u-1",
          tenantId,
          accessToken: "at",
          refreshToken: "rt",
          // An empty accesses array is the org-owner case: every permission.
          role: permissions
            ? { roleModuleAccesses: [{ module: "MY_ORGANIZATION", permissions }] }
            : { roleModuleAccesses: [] },
        },
      },
      generalSettings: {
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12-hour",
        currency: "USD",
        // Already loaded, so useFormatSettings adds no fetch of its own.
        loaded: true,
      },
    },
  });

const renderPage = (opts) =>
  render(
    <Provider store={store(opts)}>
      <MemoryRouter>
        <General />
      </MemoryRouter>
    </Provider>
  );

const org = (over = {}) => ({
  id: "org-1",
  companyName: "Noosphere Health Systems",
  email: "hello@noosphere.test",
  phoneNumber: "555-0100",
  website: "https://noosphere.test",
  practiceNPI: "1234567890",
  streetAddress: "1 Main Street",
  zipCode: "22201",
  location: { city: "Arlington", state: "VA", country: "United States" },
  active: true,
  ...over,
});

const licence = (over = {}) => ({
  id: "l-1",
  licenseName: "State Licence",
  licenseNumber: "SPL-1",
  issueState: "VA",
  expiryDate: "2027-01-31T00:00:00.000Z",
  ...over,
});

const doc = (over = {}) => ({
  id: "d-1",
  documentName: "Insurance.pdf",
  documentUrl: "https://files.test/insurance.pdf",
  uploadedBy: "Ada Lovelace",
  createdAt: "2026-02-14T00:00:00.000Z",
  ...over,
});

const withOrg = (data) =>
  api.GetOrganizationInformationByTenantId.mockResolvedValue({ data: { data } });
const withLicences = (rows) =>
  api.GetLicenseByTenantId.mockResolvedValue({ data: { data: rows } });
const withDocs = (rows) =>
  api.GetSingleDocumentByTenantId.mockResolvedValue({ data: { data: rows } });

const settled = () => waitFor(() => expect(probes.props.org).toBeTruthy());

const cards = () => Array.from(document.body.querySelectorAll(".org-license-grid > div"));

const showLicenceList = () =>
  fireEvent.click(document.body.querySelectorAll(".org-view-toggle svg")[1]);

const openRowMenu = (index = 0) =>
  fireEvent.click(document.body.querySelectorAll(".action-cell .action-button")[index]);

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(probes.props).forEach((k) => delete probes.props[k]);
  withOrg(org());
  withLicences([]);
  withDocs([]);
  api.UpdateOrganizationInformation.mockResolvedValue({ data: { data: org() } });
  api.CreateOrganizationLicense.mockResolvedValue({ data: { data: licence({ id: "l-new" }) } });
  api.UpdateOrganizationLicense.mockResolvedValue({ data: { data: licence() } });
  api.DeleteLicense.mockResolvedValue({});
  api.CreateDocument.mockResolvedValue({ data: { data: doc({ id: "d-new" }) } });
  api.DeleteDocument.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the three fetches on mount", () => {
  it("asks each endpoint for the current tenant", async () => {
    renderPage();
    const args = { tenantId: "tenant-1", accessToken: "at", refreshToken: "rt" };
    await waitFor(() =>
      expect(api.GetOrganizationInformationByTenantId).toHaveBeenCalledWith(args)
    );
    expect(api.GetLicenseByTenantId).toHaveBeenCalledWith(args);
    expect(api.GetSingleDocumentByTenantId).toHaveBeenCalledWith(args);
  });

  it("fetches nothing at all without a tenant", async () => {
    renderPage({ tenantId: null });
    await settled();
    expect(api.GetOrganizationInformationByTenantId).not.toHaveBeenCalled();
    expect(api.GetLicenseByTenantId).not.toHaveBeenCalled();
    expect(api.GetSingleDocumentByTenantId).not.toHaveBeenCalled();
  });

  it("shows a loader in each section until its fetch settles", () => {
    api.GetOrganizationInformationByTenantId.mockReturnValue(new Promise(() => {}));
    api.GetLicenseByTenantId.mockReturnValue(new Promise(() => {}));
    api.GetSingleDocumentByTenantId.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getAllByRole("status")).toHaveLength(3);
  });

  it("reports a failed organisation fetch with the endpoint's own message", async () => {
    api.GetOrganizationInformationByTenantId.mockRejectedValue(new Error("Not found"));
    renderPage();
    await waitFor(() => expect(toast.showToast).toHaveBeenCalledWith("Not found", "error"));
  });

  it("falls back to house copy when a failed organisation fetch says nothing", async () => {
    api.GetOrganizationInformationByTenantId.mockRejectedValue({});
    renderPage();
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        "Failed to fetch organization information",
        "error"
      )
    );
  });

  it("reports a failed licence fetch", async () => {
    const err = new Error("500");
    api.GetLicenseByTenantId.mockRejectedValue(err);
    renderPage();
    await waitFor(() => expect(toast.showApiError).toHaveBeenCalledWith(err, "LOAD_LICENSES"));
    expect(await screen.findByText("No licenses added yet")).toBeInTheDocument();
  });

  it("reports a failed document fetch and empties the list", async () => {
    const err = new Error("500");
    api.GetSingleDocumentByTenantId.mockRejectedValue(err);
    renderPage();
    await waitFor(() => expect(toast.showApiError).toHaveBeenCalledWith(err, "LOAD_FILES"));
    expect(await screen.findByText("No documents added")).toBeInTheDocument();
  });

  it("treats a missing licence list as no licences", async () => {
    api.GetLicenseByTenantId.mockResolvedValue({ data: { data: null } });
    renderPage();
    expect(await screen.findByText("No licenses added yet")).toBeInTheDocument();
  });

  it("treats a document list that is not an array as no documents", async () => {
    api.GetSingleDocumentByTenantId.mockResolvedValue({ data: { data: { nope: true } } });
    renderPage();
    expect(await screen.findByText("No documents added")).toBeInTheDocument();
  });
});

describe("the organisation card", () => {
  it("lays the stored organisation out across the grid", async () => {
    renderPage();
    expect(await screen.findByText("Noosphere Health Systems")).toBeInTheDocument();
    expect(screen.getByText("555-0100")).toBeInTheDocument();
    expect(screen.getByText("hello@noosphere.test")).toBeInTheDocument();
    expect(screen.getByText("Arlington")).toBeInTheDocument();
    expect(screen.getByText("VA")).toBeInTheDocument();
    expect(screen.getByText("United States / 22201")).toBeInTheDocument();
    expect(screen.getByText("1234567890")).toBeInTheDocument();
  });

  it("builds an avatar from the first letters of the first two words", async () => {
    renderPage();
    expect(await screen.findByText("NH")).toBeInTheDocument();
  });

  it("shows a placeholder avatar and dashes for an organisation with nothing filled in", async () => {
    withOrg({});
    renderPage();
    expect(await screen.findByText("NA")).toBeInTheDocument();
    expect(screen.getAllByText("--").length).toBeGreaterThanOrEqual(7);
    expect(screen.getByText("-- / --")).toBeInTheDocument();
  });

  it("links a website but not a dash", async () => {
    renderPage();
    const link = await screen.findByRole("link", { name: "https://noosphere.test" });
    expect(link).toHaveAttribute("href", "https://noosphere.test");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("leaves the website as plain text when there is none", async () => {
    withOrg(org({ website: "" }));
    renderPage();
    await screen.findByText("Noosphere Health Systems");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("editing the organisation", () => {
  const openOrgModal = async () => {
    renderPage();
    await screen.findByText("Noosphere Health Systems");
    fireEvent.click(document.body.querySelector(".org-info-card .cursor-pointer"));
    await screen.findByTestId("org-modal");
  };

  it("seeds the modal from the stored record", async () => {
    await openOrgModal();
    expect(probes.props.org.initialValues).toEqual({
      name: "Noosphere Health Systems",
      email: "hello@noosphere.test",
      phone: "555-0100",
      website: "https://noosphere.test",
      practiceNPI: "1234567890",
      street: "1 Main Street",
      city: "Arlington",
      stateProvince: "VA",
      country: "",
      zip: "22201",
      active: true,
    });
  });

  it("seeds a blank modal when nothing has been stored yet", async () => {
    withOrg(null);
    renderPage();
    await settled();
    expect(probes.props.org.initialValues).toEqual({
      name: "",
      email: "",
      phone: "",
      website: "",
      practiceNPI: "",
      street: "",
      city: "",
      stateProvince: "",
      country: "",
      zip: "",
      // Nothing stored means nothing has switched the organisation off.
      active: true,
    });
  });

  it("carries a stored inactive flag through rather than defaulting it", async () => {
    withOrg(org({ active: false }));
    renderPage();
    await settled();
    expect(probes.props.org.initialValues.active).toBe(false);
  });

  it("saves the edited organisation and closes the modal", async () => {
    api.UpdateOrganizationInformation.mockResolvedValue({
      data: { data: org({ companyName: "Noosphere Clinics" }) },
    });
    await openOrgModal();
    await act(async () => {
      await probes.props.org.onSave({
        name: "Noosphere Clinics",
        email: "hi@noosphere.test",
        phone: "555-0199",
        website: "https://noosphere.test",
        practiceNPI: "999",
        street: "2 Main Street",
        city: "Arlington",
        stateProvince: "VA",
        country: "United States",
        zip: "22201",
        active: false,
      });
    });
    expect(api.UpdateOrganizationInformation).toHaveBeenCalledWith({
      id: "org-1",
      name: "Noosphere Clinics",
      email: "hi@noosphere.test",
      phoneNumber: "555-0199",
      website: "https://noosphere.test",
      practiceNPI: "999",
      streetAddress: "2 Main Street",
      city: "Arlington",
      state: "VA",
      country: "United States",
      zipCode: "22201",
      active: false,
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith(
      "Organization information updated successfully",
      "success"
    );
    expect(screen.queryByTestId("org-modal")).not.toBeInTheDocument();
    expect(await screen.findByText("Noosphere Clinics")).toBeInTheDocument();
  });

  it("sends no id when there is no organisation record to update", async () => {
    withOrg(null);
    renderPage();
    await settled();
    await act(async () => {
      await probes.props.org.onSave({ name: "New org" });
    });
    expect(api.UpdateOrganizationInformation.mock.calls[0][0].id).toBeUndefined();
  });

  it("re-throws a refused save so the modal can stay open", async () => {
    api.UpdateOrganizationInformation.mockRejectedValue(new Error("Name already taken"));
    await openOrgModal();
    await expect(probes.props.org.onSave({ name: "Dup" })).rejects.toThrow("Name already taken");
    expect(toast.showToast).toHaveBeenCalledWith("Name already taken", "error");
    expect(screen.getByTestId("org-modal")).toBeInTheDocument();
  });

  it("falls back to house copy when a refused save says nothing", async () => {
    api.UpdateOrganizationInformation.mockRejectedValue({});
    await openOrgModal();
    await expect(probes.props.org.onSave({})).rejects.toBeTruthy();
    expect(toast.showToast).toHaveBeenCalledWith(
      "Failed to save organization information",
      "error"
    );
  });

  it("closes the modal without saving", async () => {
    await openOrgModal();
    act(() => probes.props.org.onClose());
    expect(screen.queryByTestId("org-modal")).not.toBeInTheDocument();
    expect(api.UpdateOrganizationInformation).not.toHaveBeenCalled();
  });
});

describe("the licence cards", () => {
  it("normalises each stored licence onto a card", async () => {
    withLicences([licence()]);
    renderPage();
    expect(await screen.findByText("State Licence")).toBeInTheDocument();
    expect(screen.getByText("SPL-1")).toBeInTheDocument();
    expect(screen.getByText("01/31/2027")).toBeInTheDocument();
    // "VA" is also the organisation's state, so scope the check to the card.
    expect(cards()[0]).toHaveTextContent("VA");
  });

  it("reads a licence's issuing state from the legacy field", async () => {
    withLicences([licence({ issueState: undefined, state: "NY" })]);
    renderPage();
    await screen.findByText("State Licence");
    expect(screen.getByText("NY")).toBeInTheDocument();
  });

  it("truncates a long licence name", async () => {
    withLicences([licence({ licenseName: "An extremely long licence name indeed" })]);
    renderPage();
    expect(await screen.findByText("An extreme...")).toBeInTheDocument();
  });

  it("falls back to N/A for a licence with no name, number, state or expiry", async () => {
    withLicences([{ id: "l-1" }]);
    renderPage();
    await waitFor(() => expect(cards()).toHaveLength(1));
    expect(screen.getAllByText("N/A").length).toBeGreaterThanOrEqual(4);
  });

  it("hides both card controls from a role that may only look", async () => {
    withLicences([licence()]);
    renderPage({ permissions: ["view_licenses"] });
    await screen.findByText("State Licence");
    expect(cards()[0].querySelectorAll(".cursor-pointer")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "New" })).not.toBeInTheDocument();
  });

  it("offers only the control the role was granted", async () => {
    withLicences([licence()]);
    renderPage({ permissions: ["view_licenses", "delete_license"] });
    await screen.findByText("State Licence");
    expect(cards()[0].querySelectorAll(".cursor-pointer")).toHaveLength(1);
  });

  it("opens the licence modal on the card being edited", async () => {
    withLicences([licence()]);
    renderPage();
    await screen.findByText("State Licence");
    fireEvent.click(cards()[0].querySelectorAll(".cursor-pointer")[0]);
    await screen.findByTestId("license-modal");
    expect(probes.props.license.initialValues).toMatchObject({
      id: "l-1",
      licenseName: "State Licence",
      expiryDate: "2027-01-31",
    });
  });

  it("opens an empty licence modal for a new licence", async () => {
    withLicences([licence()]);
    renderPage();
    await screen.findByText("State Licence");
    fireEvent.click(cards()[0].querySelectorAll(".cursor-pointer")[0]);
    await screen.findByTestId("license-modal");
    act(() => probes.props.license.onClose());
    fireEvent.click(screen.getByRole("button", { name: "New" }));
    await screen.findByTestId("license-modal");
    expect(probes.props.license.initialValues).toBeNull();
  });

  it("blanks an expiry the stored licence does not carry", async () => {
    withLicences([licence({ expiryDate: null })]);
    renderPage();
    await screen.findByText("State Licence");
    fireEvent.click(cards()[0].querySelectorAll(".cursor-pointer")[0]);
    await screen.findByTestId("license-modal");
    expect(probes.props.license.initialValues.expiryDate).toBe("");
  });
});

describe("the licence list view", () => {
  it("swaps the cards for a table and back", async () => {
    withLicences([licence()]);
    renderPage();
    await screen.findByText("State Licence");
    expect(cards()).toHaveLength(1);
    showLicenceList();
    expect(cards()).toHaveLength(0);
    expect(screen.getByText("License Number")).toBeInTheDocument();
    fireEvent.click(document.body.querySelectorAll(".org-view-toggle svg")[0]);
    expect(cards()).toHaveLength(1);
  });

  it("formats the expiry column with the tenant's date format", async () => {
    withLicences([licence()]);
    renderPage();
    await screen.findByText("State Licence");
    showLicenceList();
    expect(screen.getByText("01/31/2027")).toBeInTheDocument();
  });

  it("edits a licence from the row menu", async () => {
    withLicences([licence()]);
    renderPage();
    await screen.findByText("State Licence");
    showLicenceList();
    openRowMenu();
    fireEvent.click(screen.getByText("Edit"));
    await screen.findByTestId("license-modal");
    expect(probes.props.license.initialValues.id).toBe("l-1");
  });

  it("offers the row menu only the actions the role was granted", async () => {
    withLicences([licence()]);
    renderPage({ permissions: ["view_licenses", "edit_license"] });
    await screen.findByText("State Licence");
    showLicenceList();
    openRowMenu();
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("asks before deleting a licence from the row menu", async () => {
    withLicences([licence()]);
    renderPage();
    await screen.findByText("State Licence");
    showLicenceList();
    openRowMenu();
    fireEvent.click(screen.getByText("Delete"));
    await screen.findByTestId("delete-modal");
    expect(probes.props.delete.title).toBe("Delete License");
    await act(async () => {
      await probes.props.delete.onConfirm();
    });
    expect(api.DeleteLicense).toHaveBeenCalledWith({
      id: "l-1",
      accessToken: "at",
      refreshToken: "rt",
    });
  });
});

describe("saving a licence", () => {
  const openNew = async () => {
    renderPage();
    await settled();
    fireEvent.click(screen.getByRole("button", { name: "New" }));
    await screen.findByTestId("license-modal");
  };

  it("creates a licence under the current tenant and appends it", async () => {
    await openNew();
    await act(async () => {
      await probes.props.license.onSave({ licenseName: "New licence", licenseNumber: "N-1" });
    });
    expect(api.CreateOrganizationLicense).toHaveBeenCalledWith({
      licenseName: "New licence",
      licenseNumber: "N-1",
      tenantId: "tenant-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("License created successfully", "success");
    expect(await screen.findByText("State Licence")).toBeInTheDocument();
    expect(screen.queryByTestId("license-modal")).not.toBeInTheDocument();
  });

  it("takes the licence name and number from the outer body when the record omits them", async () => {
    api.CreateOrganizationLicense.mockResolvedValue({
      data: {
        data: { id: "l-new", expiryDate: null },
        licenseName: "Outer name",
        licenseNumber: "Outer-1",
      },
    });
    await openNew();
    await act(async () => {
      await probes.props.license.onSave({ licenseName: "New licence" });
    });
    expect(await screen.findByText("Outer name")).toBeInTheDocument();
    expect(screen.getByText("Outer-1")).toBeInTheDocument();
    // A created licence with no expiry reads as N/A rather than an epoch date.
    expect(screen.getAllByText("N/A").length).toBeGreaterThanOrEqual(1);
  });

  it("updates the licence the modal was opened on and leaves the others alone", async () => {
    withLicences([licence(), licence({ id: "l-2", licenseName: "Second licence" })]);
    api.UpdateOrganizationLicense.mockResolvedValue({
      data: { data: licence({ licenseName: "Renewed licence" }) },
    });
    renderPage();
    await screen.findByText("State Licence");
    fireEvent.click(cards()[0].querySelectorAll(".cursor-pointer")[0]);
    await screen.findByTestId("license-modal");
    await act(async () => {
      await probes.props.license.onSave({ id: "l-1", licenseName: "Renewed licence" });
    });
    expect(api.CreateOrganizationLicense).not.toHaveBeenCalled();
    expect(await screen.findByText("Renewed licence")).toBeInTheDocument();
    expect(screen.getByText("Second licence")).toBeInTheDocument();
    expect(toast.showToast).toHaveBeenCalledWith("License updated successfully", "success");
  });

  it("blanks an expiry the update response leaves out", async () => {
    withLicences([licence()]);
    api.UpdateOrganizationLicense.mockResolvedValue({
      data: { data: licence({ expiryDate: null }), licenseName: "Fallback", licenseNumber: "F-1" },
    });
    renderPage();
    await screen.findByText("State Licence");
    fireEvent.click(cards()[0].querySelectorAll(".cursor-pointer")[0]);
    await screen.findByTestId("license-modal");
    await act(async () => {
      await probes.props.license.onSave({ id: "l-1" });
    });
    await waitFor(() => expect(screen.queryByText("01/31/2027")).not.toBeInTheDocument());
  });

  it("re-throws a refused licence save so the modal can stay open", async () => {
    const err = new Error("Duplicate licence number");
    api.CreateOrganizationLicense.mockRejectedValue(err);
    await openNew();
    await expect(probes.props.license.onSave({ licenseName: "Dup" })).rejects.toThrow(err);
    expect(toast.showApiError).toHaveBeenCalledWith(err, "SAVE_LICENSE");
    expect(screen.getByTestId("license-modal")).toBeInTheDocument();
  });
});

describe("deleting a licence", () => {
  const confirmDelete = async () => {
    withLicences([licence()]);
    renderPage();
    await screen.findByText("State Licence");
    fireEvent.click(cards()[0].querySelectorAll(".cursor-pointer")[1]);
    await screen.findByTestId("delete-modal");
    await act(async () => {
      await probes.props.delete.onConfirm();
    });
  };

  it("removes the licence and closes the confirmation", async () => {
    await confirmDelete();
    expect(api.DeleteLicense).toHaveBeenCalledWith({
      id: "l-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("License deleted successfully", "success");
    expect(await screen.findByText("No licenses added yet")).toBeInTheDocument();
    expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
  });

  it("keeps the licence and the confirmation open when the delete is refused", async () => {
    const err = new Error("Licence in use");
    api.DeleteLicense.mockRejectedValue(err);
    await confirmDelete();
    expect(toast.showApiError).toHaveBeenCalledWith(err, "DELETE_LICENSE");
    expect(screen.getByText("State Licence")).toBeInTheDocument();
    expect(screen.getByTestId("delete-modal")).toBeInTheDocument();
  });

  it("closes the confirmation without deleting", async () => {
    withLicences([licence()]);
    renderPage();
    await screen.findByText("State Licence");
    fireEvent.click(cards()[0].querySelectorAll(".cursor-pointer")[1]);
    await screen.findByTestId("delete-modal");
    act(() => probes.props.delete.onClose());
    expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
    expect(api.DeleteLicense).not.toHaveBeenCalled();
  });
});

describe("the document list", () => {
  it("lists each stored document with its formatted date", async () => {
    withDocs([doc()]);
    renderPage();
    expect(await screen.findByText("Insurance.pdf")).toBeInTheDocument();
    expect(screen.getByText("02/14/2026")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("opens a document in the viewer", async () => {
    withDocs([doc()]);
    renderPage();
    await screen.findByText("Insurance.pdf");
    openRowMenu();
    fireEvent.click(screen.getByText("View"));
    expect(viewer.openDocument).toHaveBeenCalledWith(
      "https://files.test/insurance.pdf",
      "Insurance.pdf"
    );
  });

  it("names an unnamed document when opening it", async () => {
    withDocs([doc({ documentName: undefined })]);
    renderPage();
    await waitFor(() => expect(document.body.querySelector(".action-cell")).toBeTruthy());
    openRowMenu();
    fireEvent.click(screen.getByText("View"));
    expect(viewer.openDocument).toHaveBeenCalledWith(
      "https://files.test/insurance.pdf",
      "Document"
    );
  });

  it("downloads a document under its own name", async () => {
    withDocs([doc()]);
    renderPage();
    await screen.findByText("Insurance.pdf");
    openRowMenu();
    fireEvent.click(screen.getByText("Download"));
    expect(viewer.downloadDocument).toHaveBeenCalledWith(
      "https://files.test/insurance.pdf",
      "Insurance.pdf"
    );
  });

  it("names an unnamed document when downloading it", async () => {
    withDocs([doc({ documentName: undefined })]);
    renderPage();
    await waitFor(() => expect(document.body.querySelector(".action-cell")).toBeTruthy());
    openRowMenu();
    fireEvent.click(screen.getByText("Download"));
    expect(viewer.downloadDocument).toHaveBeenCalledWith(
      "https://files.test/insurance.pdf",
      "document"
    );
  });

  it("does nothing for a document row that has no file behind it", async () => {
    withDocs([doc({ documentUrl: null })]);
    renderPage();
    await screen.findByText("Insurance.pdf");
    openRowMenu();
    fireEvent.click(screen.getByText("View"));
    openRowMenu();
    fireEvent.click(screen.getByText("Download"));
    expect(viewer.openDocument).not.toHaveBeenCalled();
    expect(viewer.downloadDocument).not.toHaveBeenCalled();
  });

  it("offers the row menu only the actions the role was granted", async () => {
    withDocs([doc()]);
    renderPage({ permissions: ["view_files_documents_list", "download_document"] });
    await screen.findByText("Insurance.pdf");
    openRowMenu();
    expect(screen.getByText("Download")).toBeInTheDocument();
    expect(screen.queryByText("View")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });
});

describe("uploading and deleting a document", () => {
  it("uploads a file and appends it to the list", async () => {
    renderPage();
    await settled();
    fireEvent.click(screen.getByRole("button", { name: "New upload" }));
    await screen.findByTestId("file-modal");
    expect(probes.props.file.tenantId).toBe("tenant-1");
    expect(probes.props.file.initialValues).toBeNull();
    const formData = new FormData();
    await act(async () => {
      await probes.props.file.onSave(formData);
    });
    expect(api.CreateDocument).toHaveBeenCalledWith({
      formData,
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("File uploaded successfully", "success");
    expect(await screen.findByText("Insurance.pdf")).toBeInTheDocument();
    expect(screen.queryByTestId("file-modal")).not.toBeInTheDocument();
  });

  it("re-throws a refused upload so the modal can stay open", async () => {
    const err = new Error("File too large");
    api.CreateDocument.mockRejectedValue(err);
    renderPage();
    await settled();
    fireEvent.click(screen.getByRole("button", { name: "New upload" }));
    await screen.findByTestId("file-modal");
    await expect(probes.props.file.onSave(new FormData())).rejects.toThrow(err);
    expect(toast.showApiError).toHaveBeenCalledWith(err, "UPLOAD_FILE");
    expect(screen.getByTestId("file-modal")).toBeInTheDocument();
  });

  it("closes the upload modal without saving", async () => {
    renderPage();
    await settled();
    fireEvent.click(screen.getByRole("button", { name: "New upload" }));
    await screen.findByTestId("file-modal");
    act(() => probes.props.file.onClose());
    expect(screen.queryByTestId("file-modal")).not.toBeInTheDocument();
    expect(api.CreateDocument).not.toHaveBeenCalled();
  });

  it("removes a deleted document from the list", async () => {
    withDocs([doc()]);
    renderPage();
    await screen.findByText("Insurance.pdf");
    openRowMenu();
    fireEvent.click(screen.getByText("Delete"));
    await screen.findByTestId("delete-modal");
    expect(probes.props.delete.title).toBe("Delete File");
    expect(probes.props.delete.message).toBe("Are you sure you want to delete this file?");
    await act(async () => {
      await probes.props.delete.onConfirm();
    });
    expect(api.DeleteDocument).toHaveBeenCalledWith({
      id: "d-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("File deleted successfully", "success");
    expect(await screen.findByText("No documents added")).toBeInTheDocument();
  });

  it("keeps the document when the delete is refused", async () => {
    const err = new Error("Locked");
    api.DeleteDocument.mockRejectedValue(err);
    withDocs([doc()]);
    renderPage();
    await screen.findByText("Insurance.pdf");
    openRowMenu();
    fireEvent.click(screen.getByText("Delete"));
    await screen.findByTestId("delete-modal");
    await act(async () => {
      await probes.props.delete.onConfirm();
    });
    expect(toast.showApiError).toHaveBeenCalledWith(err, "DELETE_FILE");
    expect(screen.getByText("Insurance.pdf")).toBeInTheDocument();
  });
});

describe("section visibility", () => {
  it("shows nothing but the heading to a role with no organisation permissions", async () => {
    renderPage({ permissions: ["view_staff_list"] });
    await waitFor(() => expect(screen.getByText("General")).toBeInTheDocument());
    expect(screen.queryByText("Organisation Information")).not.toBeInTheDocument();
    expect(screen.queryByText("Licenses")).not.toBeInTheDocument();
    expect(screen.queryByText("Business files and documents")).not.toBeInTheDocument();
  });

  it("withholds the edit pencil from a role that may only read the organisation", async () => {
    renderPage({ permissions: ["view_organization_information"] });
    await screen.findByText("Noosphere Health Systems");
    expect(document.body.querySelector(".org-info-card .cursor-pointer")).toBeNull();
  });

  it("withholds the upload button from a role that may only read the documents", async () => {
    renderPage({ permissions: ["view_files_documents_list"] });
    await screen.findByText("No documents added");
    expect(screen.queryByRole("button", { name: "New upload" })).not.toBeInTheDocument();
  });
});
