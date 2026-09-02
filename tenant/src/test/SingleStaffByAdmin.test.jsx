import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";
import { formatDate } from "../Helper/Formatters";

/**
 * One staff member's page: three fetches on mount (the record, the licences and
 * the documents), four permission-gated tabs, and the save/delete handlers that
 * the Profile tab and its modals call back into.
 *
 * Every tab and every modal is a probe. The page keeps no rendering of its own
 * beyond the breadcrumb and the tab bar -- what it really owns is the reshaping
 * of each API record into the props the Profile tab reads, and the payloads the
 * save handlers assemble. So the tests drive the recorded callbacks directly and
 * assert on what reached the API, which is also the only way to reach handlers
 * the real Profile tab would bury behind a card menu.
 *
 * The active tab is persisted in sessionStorage, cleared between tests so one
 * test's tab cannot decide the next test's starting view.
 */

const api = vi.hoisted(() => ({
  GetSingleTenantStaffById: vi.fn(),
  GetAllStaffLicenseById: vi.fn(),
  GetAllStaffDocumentById: vi.fn(),
  ResetStaffLogin: vi.fn(),
  UpdateTenantStaffLicense: vi.fn(),
  CreateLicenseForStaff: vi.fn(),
  CreateDocumentForStaff: vi.fn(),
  DeleteLicenseByTenantStaff: vi.fn(),
  DeleteDocumentByTenantStaff: vi.fn(),
  UpdateTenantStaffBasicInfo: vi.fn(),
}));
vi.mock("../api/organisationStaffApis", () => ({ default: api }));

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

const probes = vi.hoisted(() => {
  const props = {};
  const record = (name) => (received) => {
    props[name] = received;
    return <div data-testid={`${name}-tab`} />;
  };
  const modal = (name) => (received) => {
    props[name] = received;
    return received.isOpen ? <div data-testid={`${name}-modal`} /> : null;
  };
  return { props, record, modal };
});

vi.mock("../Pages/Organisation/StaffAndTeams/StaffSingleTabs/StaffProfile", () => ({
  default: probes.record("profile"),
}));
vi.mock("../Pages/Organisation/StaffAndTeams/StaffSingleTabs/Appointment", () => ({
  default: probes.record("appointment"),
}));
vi.mock("../Pages/Organisation/StaffAndTeams/StaffSingleTabs/Client", () => ({
  default: probes.record("client"),
}));
vi.mock("../Pages/Organisation/StaffAndTeams/StaffSingleTabs/Payroll", () => ({
  default: probes.record("payroll"),
}));
vi.mock("../Components/ReusableModal/OrganizationModal/AddLicensesModal", () => ({
  default: probes.modal("license"),
}));
vi.mock(
  "../Components/ReusableModal/OrganizationModal/UploadTenantStaffDocumentModal",
  () => ({ default: probes.modal("file") })
);
vi.mock("../Components/ReusableModal/OrganizationModal/EditBasicInfoModal", () => ({
  default: probes.modal("basicInfo"),
}));
vi.mock("../Components/ReusableModal/OrganizationModal/DeleteModal", () => ({
  default: probes.modal("delete"),
}));

import SingleStaffByAdmin from "../Pages/Organisation/StaffAndTeams/SingleStaffByAdmin";

const staffRecord = (over = {}) => ({
  staff: {
    id: "s-1",
    fullName: "Grace Hopper",
    email: "grace@example.com",
    phoneNumber: "555-0100",
    dob: "1980-12-09T00:00:00.000Z",
    gender: "Female",
    npi: "123",
    address: "1 Navy Way",
    city: "Arlington",
    state: "VA",
    zip: "22201",
    country: "United States",
    active: true,
    createdAt: "2026-01-05T00:00:00.000Z",
    roleId: "role-1",
    roles: { name: "Clinician" },
    ...over,
  },
});

const store = ({ permissions, fullName = "Admin Ada" } = {}) =>
  configureStore({
    reducer: { authentication: authReducer, generalSettings: generalSettingsReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user: {
          id: "user-1",
          tenantId: "tenant-1",
          fullName,
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
        loaded: true,
      },
    },
  });

const renderPage = ({ query = "?name=Grace%20Hopper", ...opts } = {}) =>
  render(
    <Provider store={store(opts)}>
      <MemoryRouter initialEntries={[`/staff/s-1${query}`]}>
        <Routes>
          <Route path="/staff/:tenantStaffId" element={<SingleStaffByAdmin />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

const profile = () => probes.props.profile;

const loaded = async () => {
  await screen.findByTestId("profile-tab");
  await waitFor(() => expect(profile().staff).not.toBeNull());
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  api.GetSingleTenantStaffById.mockResolvedValue({ data: { data: staffRecord() } });
  api.GetAllStaffLicenseById.mockResolvedValue({
    data: {
      data: [
        {
          id: "l-1",
          licenseName: "RBT",
          licenseNumber: "R-1",
          issueState: "VA",
          expiryDate: "2027-01-31T00:00:00.000Z",
          tenantStaffId: "s-1",
        },
      ],
    },
  });
  api.GetAllStaffDocumentById.mockResolvedValue({
    data: {
      data: [
        {
          id: "d-1",
          documentName: "CV.pdf",
          date: "2026-02-02T00:00:00.000Z",
          uploadedBy: "Grace Hopper",
          documentsUrl: { filename: "cv.pdf", url: "u" },
          tenantStaffId: "s-1",
        },
      ],
    },
  });
  api.ResetStaffLogin.mockResolvedValue({});
  api.UpdateTenantStaffLicense.mockResolvedValue({});
  api.CreateLicenseForStaff.mockResolvedValue({ data: { data: { id: "l-new" } } });
  api.CreateDocumentForStaff.mockResolvedValue({
    data: { data: { id: "d-new", documentsUrl: { filename: "saved.pdf" } } },
  });
  api.DeleteLicenseByTenantStaff.mockResolvedValue({});
  api.DeleteDocumentByTenantStaff.mockResolvedValue({});
  api.UpdateTenantStaffBasicInfo.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the page frame", () => {
  it("names the staff member from the query string", async () => {
    renderPage();
    await loaded();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
  });

  it("falls back to a generic breadcrumb when no name was passed", async () => {
    renderPage({ query: "" });
    await loaded();
    expect(screen.getByText("Staff Details")).toBeInTheDocument();
  });

  it("goes back to the staff list", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    // MemoryRouter has no matching route for the list, so the page unmounts.
    await waitFor(() => expect(screen.queryByTestId("profile-tab")).not.toBeInTheDocument());
  });
});

describe("loading the staff record", () => {
  it("reshapes the stored record into the profile's props", async () => {
    renderPage();
    await loaded();
    expect(api.GetSingleTenantStaffById).toHaveBeenCalledWith({
      id: "s-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(profile().staff).toMatchObject({
      id: "s-1",
      name: "Grace Hopper",
      // Date inputs want a bare calendar date, not a timestamp.
      DOB: "1980-12-09",
      dateJoined: "01/05/2026",
      practiceNPI: "123",
      staffRole: "role-1",
      staffRoleName: "Clinician",
    });
  });

  it("blanks the dates the record leaves unset", async () => {
    api.GetSingleTenantStaffById.mockResolvedValue({
      data: { data: staffRecord({ dob: null, createdAt: null }) },
    });
    renderPage();
    await loaded();
    expect(profile().staff.DOB).toBe("");
    expect(profile().staff.dateJoined).toBe("");
  });

  it.each([
    ["the singular role object", { roles: undefined, role: { name: "Supervisor" } }, "Supervisor"],
    ["a plain role name", { roles: undefined, role: undefined, roleName: "Aide" }, "Aide"],
    ["nothing at all", { roles: undefined, role: undefined }, ""],
  ])("reads the role name from %s", async (_case, over, expected) => {
    api.GetSingleTenantStaffById.mockResolvedValue({
      data: { data: staffRecord(over) },
    });
    renderPage();
    await loaded();
    expect(profile().staff.staffRoleName).toBe(expected);
  });

  it("leaves the profile empty when the record cannot be read", async () => {
    api.GetSingleTenantStaffById.mockResolvedValue({ data: {} });
    renderPage();
    await screen.findByTestId("profile-tab");
    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        "Failed to fetch staff data:",
        expect.any(String)
      )
    );
    expect(profile().staff).toBeNull();
  });

  it("leaves the profile empty when the record fetch is refused", async () => {
    api.GetSingleTenantStaffById.mockRejectedValue(new Error("404"));
    renderPage();
    await screen.findByTestId("profile-tab");
    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith("Failed to fetch staff data:", "404")
    );
    expect(profile().staff).toBeNull();
  });
});

describe("loading licences and documents", () => {
  it("maps each licence into the card shape the profile renders", async () => {
    renderPage();
    await loaded();
    expect(profile().licenses[0]).toMatchObject({
      id: "l-1",
      licenseType: "RBT",
      expirationDate: "01/31/2027",
      state: "VA",
      tenantStaffId: "s-1",
    });
  });

  it("borrows the route's staff id for a licence that carries none", async () => {
    api.GetAllStaffLicenseById.mockResolvedValue({
      data: { data: [{ id: "l-2", licenseName: "BCBA" }] },
    });
    renderPage();
    await loaded();
    expect(profile().licenses[0].tenantStaffId).toBe("s-1");
  });

  it("shows no licences when the response carries none", async () => {
    api.GetAllStaffLicenseById.mockResolvedValue({ data: {} });
    renderPage();
    await loaded();
    expect(profile().licenses).toEqual([]);
  });

  it("shows no licences when the licence fetch is refused", async () => {
    api.GetAllStaffLicenseById.mockRejectedValue(new Error("boom"));
    renderPage();
    await loaded();
    expect(profile().licenses).toEqual([]);
    expect(console.error).toHaveBeenCalledWith("Failed to fetch licenses:", "boom");
  });

  it("maps each document into the row shape the profile renders", async () => {
    renderPage();
    await loaded();
    expect(profile().files[0]).toMatchObject({
      id: "d-1",
      documentName: "CV.pdf",
      date: "02/02/2026",
      uploadBy: "Grace Hopper",
    });
  });

  it("names a document by its stored file, then gives up", async () => {
    api.GetAllStaffDocumentById.mockResolvedValue({
      data: {
        data: [
          { id: "d-2", documentsUrl: { filename: "scan.png" } },
          { id: "d-3" },
        ],
      },
    });
    renderPage();
    await loaded();
    expect(profile().files[0].documentName).toBe("scan.png");
    expect(profile().files[1].documentName).toBe("Unknown File");
  });

  it("dates an undated document today and credits an unknown uploader", async () => {
    api.GetAllStaffDocumentById.mockResolvedValue({
      data: { data: [{ id: "d-4", documentName: "note.txt" }] },
    });
    renderPage();
    await loaded();
    expect(profile().files[0].date).toBe(formatDate(new Date(), "MM/DD/YYYY"));
    expect(profile().files[0].uploadBy).toBe("Unknown User");
  });

  it("shows no documents when the response carries none", async () => {
    api.GetAllStaffDocumentById.mockResolvedValue({ data: {} });
    renderPage();
    await loaded();
    expect(profile().files).toEqual([]);
  });

  it("shows no documents when the document fetch is refused", async () => {
    api.GetAllStaffDocumentById.mockRejectedValue(new Error("nope"));
    renderPage();
    await loaded();
    expect(profile().files).toEqual([]);
    expect(console.error).toHaveBeenCalledWith("Failed to fetch documents:", "nope");
  });
});

describe("the tab bar", () => {
  it("shows every tab to a role with full access and opens on the profile", async () => {
    renderPage();
    await loaded();
    expect(
      screen.getAllByRole("button").map((b) => b.textContent)
    ).toEqual(
      expect.arrayContaining([
        "Profile",
        "Appointment & Schedule",
        "Clients",
        "Payroll Settings",
      ])
    );
  });

  it("switches to each tab in turn", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Appointment & Schedule" }));
    expect(screen.getByTestId("appointment-tab")).toBeInTheDocument();
    expect(probes.props.appointment).toMatchObject({
      staffId: "s-1",
      tenantId: "tenant-1",
      accessToken: "at",
    });
    fireEvent.click(screen.getByRole("button", { name: "Clients" }));
    expect(screen.getByTestId("client-tab")).toBeInTheDocument();
    expect(probes.props.client).toMatchObject({ staffId: "s-1", tenantId: "tenant-1" });
    fireEvent.click(screen.getByRole("button", { name: "Payroll Settings" }));
    expect(screen.getByTestId("payroll-tab")).toBeInTheDocument();
  });

  it("marks the active tab and leaves the others inactive", async () => {
    renderPage();
    await loaded();
    expect(screen.getByRole("button", { name: "Profile" })).toHaveClass(
      "appointment-sched-view-button-active"
    );
    expect(screen.getByRole("button", { name: "Clients" })).toHaveClass(
      "appointment-sched-view-button-inactive"
    );
  });

  it("hides the tabs a role is not granted", async () => {
    renderPage({ permissions: ["view_staff_clients_list"] });
    await screen.findByTestId("client-tab");
    expect(screen.queryByRole("button", { name: "Profile" })).not.toBeInTheDocument();
  });

  it("ignores a remembered tab the current role cannot see", async () => {
    sessionStorage.setItem("tab:tenant:singleStaff", "payrollSettings");
    renderPage({ permissions: ["view_staff_profile_information"] });
    await screen.findByTestId("profile-tab");
  });

  it("renders no tab at all for a role granted none of them", () => {
    renderPage({ permissions: ["view_staff_list"] });
    expect(screen.queryByTestId("profile-tab")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Profile" })).not.toBeInTheDocument();
  });
});

describe("saving a licence", () => {
  const save = async (payload, { holdReload = false } = {}) => {
    renderPage();
    await loaded();
    // The optimistic append is only observable while the reload it kicks off is
    // still in flight -- once that lands it replaces the whole list.
    if (holdReload) api.GetAllStaffLicenseById.mockReturnValue(new Promise(() => {}));
    await act(async () => {
      await profile().saveLicense(payload);
    });
  };

  it("updates a licence that already has an id and reloads the list", async () => {
    await save({
      id: "l-1",
      licenseName: "RBT",
      licenseNumber: "R-2",
      issueState: "VA",
      expiryDate: "2028-01-01",
    });
    expect(api.UpdateTenantStaffLicense).toHaveBeenCalledWith({
      id: "l-1",
      tenantId: "tenant-1",
      licenseName: "RBT",
      licenseNumber: "R-2",
      issueState: "VA",
      expiryDate: "2028-01-01",
      tenantStaffId: "s-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(api.CreateLicenseForStaff).not.toHaveBeenCalled();
    expect(api.GetAllStaffLicenseById).toHaveBeenCalledTimes(2);
  });

  it("creates a licence with no id and appends the returned one", async () => {
    await save(
      {
        licenseName: "BCBA",
        licenseNumber: "B-1",
        issueState: "NY",
        expiryDate: "2029-06-30",
        expirationDate: "2029-06-30T00:00:00.000Z",
        state: "NY",
      },
      { holdReload: true }
    );
    expect(api.CreateLicenseForStaff).toHaveBeenCalledWith(
      expect.objectContaining({ tenantStaffId: "s-1", licenseName: "BCBA" })
    );
    const appended = profile().licenses.find((l) => l.id === "l-new");
    expect(appended).toMatchObject({ expirationDate: "06/30/2029", state: "NY" });
  });

  it("invents an id when the create response carries none", async () => {
    api.CreateLicenseForStaff.mockResolvedValue({});
    await save({ licenseName: "BCBA" }, { holdReload: true });
    const appended = profile().licenses.find((l) => l.licenseName === "BCBA");
    expect(typeof appended.id).toBe("number");
  });

  it("reports the server's own reason for a refused save", async () => {
    api.UpdateTenantStaffLicense.mockRejectedValue({
      message: "400",
      response: { data: { message: "Licence number already used" } },
    });
    await save({ id: "l-1" });
    expect(toast.showToast).toHaveBeenCalledWith({
      message: "Licence number already used",
      type: "error",
    });
  });

  it("falls back to a generic reason when the server gives none", async () => {
    api.CreateLicenseForStaff.mockRejectedValue(new Error("network"));
    await save({ licenseName: "BCBA" });
    expect(toast.showToast).toHaveBeenCalledWith({
      message: "Failed to save license",
      type: "error",
    });
  });
});

describe("saving a document", () => {
  const save = async (payload, { holdReload = false } = {}) => {
    renderPage();
    await loaded();
    // The optimistic append is only observable while the reload it kicks off is
    // still in flight -- once that lands it replaces the whole list.
    if (holdReload) api.GetAllStaffDocumentById.mockReturnValue(new Promise(() => {}));
    await act(async () => {
      await profile().saveFile(payload);
    });
  };

  it("renames an existing document locally without calling the API", async () => {
    await save({ id: "d-1", documentName: "Resume.pdf", uploadBy: "Someone Else" });
    expect(api.CreateDocumentForStaff).not.toHaveBeenCalled();
    expect(profile().files[0]).toMatchObject({
      documentName: "Resume.pdf",
      uploadBy: "Someone Else",
    });
  });

  it("leaves the other documents untouched while renaming one", async () => {
    api.GetAllStaffDocumentById.mockResolvedValue({
      data: {
        data: [
          { id: "d-1", documentName: "One.pdf" },
          { id: "d-2", documentName: "Two.pdf" },
        ],
      },
    });
    await save({ id: "d-1", documentName: "Renamed.pdf" });
    expect(profile().files.map((f) => f.documentName)).toEqual([
      "Renamed.pdf",
      "Two.pdf",
    ]);
  });

  it("uploads a new document and appends what came back", async () => {
    await save(
      {
        documentName: "Contract.pdf",
        documentsUrl: { filename: "contract.pdf" },
        tenantStaffId: "s-1",
      },
      { holdReload: true }
    );
    expect(api.CreateDocumentForStaff).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      documentName: "Contract.pdf",
      uploadedBy: "Admin Ada",
      documentsUrl: { filename: "contract.pdf" },
      tenantStaffId: "s-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    const appended = profile().files.find((f) => f.id === "d-new");
    expect(appended).toMatchObject({
      uploadBy: "Admin Ada",
      date: formatDate(new Date(), "MM/DD/YYYY"),
      documentsUrl: { filename: "saved.pdf" },
    });
  });

  it("replaces the row in place when a stored document is re-uploaded", async () => {
    api.CreateDocumentForStaff.mockResolvedValue({});
    await save(
      {
        id: "d-1",
        documentName: "CV v2.pdf",
        documentsUrl: { filename: "cv2.pdf" },
        tenantStaffId: "s-1",
      },
      { holdReload: true }
    );
    // No id came back, so the payload's own id keeps the row identified.
    expect(profile().files.filter((f) => f.id === "d-1")).toHaveLength(1);
    expect(profile().files[0]).toMatchObject({
      documentName: "CV v2.pdf",
      documentsUrl: { filename: "cv2.pdf" },
    });
  });

  it("reports the server's own reason for a refused upload", async () => {
    api.CreateDocumentForStaff.mockRejectedValue({
      message: "413",
      response: { data: { message: "File too large" } },
    });
    await save({ documentName: "Big.pdf", documentsUrl: {} });
    expect(toast.showToast).toHaveBeenCalledWith({
      message: "File too large",
      type: "error",
    });
  });

  it("falls back to a generic reason when the upload fails without one", async () => {
    api.CreateDocumentForStaff.mockRejectedValue(new Error("network"));
    await save({ documentName: "Big.pdf", documentsUrl: {} });
    expect(toast.showToast).toHaveBeenCalledWith({
      message: "Failed to save document",
      type: "error",
    });
  });
});

describe("deleting a licence or document", () => {
  const run = async (fn) => {
    renderPage();
    await loaded();
    await act(async () => {
      await fn();
    });
  };

  it("soft-deletes a licence, reloads and closes the confirmation", async () => {
    await run(async () => {
      probes.props.profile.openDelete({ title: "Delete licence", onConfirm: () => {} });
      await probes.props.profile.deleteLicense("l-1");
    });
    expect(api.DeleteLicenseByTenantStaff).toHaveBeenCalledWith({
      id: "l-1",
      isDeleted: true,
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(api.GetAllStaffLicenseById).toHaveBeenCalledTimes(2);
    expect(probes.props.delete.isOpen).toBe(false);
  });

  it("keeps the confirmation open and reports a refused licence delete", async () => {
    api.DeleteLicenseByTenantStaff.mockRejectedValue({
      message: "409",
      response: { data: { message: "Licence is referenced" } },
    });
    await run(async () => {
      probes.props.profile.openDelete({ title: "Delete licence", onConfirm: () => {} });
      await probes.props.profile.deleteLicense("l-1");
    });
    expect(toast.showToast).toHaveBeenCalledWith({
      message: "Licence is referenced",
      type: "error",
    });
    expect(probes.props.delete.isOpen).toBe(true);
  });

  it("soft-deletes a document and reloads", async () => {
    await run(() => probes.props.profile.deleteFile("d-1"));
    expect(api.DeleteDocumentByTenantStaff).toHaveBeenCalledWith({
      id: "d-1",
      isDeleted: true,
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(api.GetAllStaffDocumentById).toHaveBeenCalledTimes(2);
  });

  it("falls back to a generic reason for a refused document delete", async () => {
    api.DeleteDocumentByTenantStaff.mockRejectedValue(new Error("network"));
    await run(() => probes.props.profile.deleteFile("d-1"));
    expect(toast.showToast).toHaveBeenCalledWith({
      message: "Failed to delete document",
      type: "error",
    });
  });

  it("opens the confirmation with whatever the profile passed", async () => {
    renderPage();
    await loaded();
    const onConfirm = vi.fn();
    act(() => {
      profile().openDelete({
        title: "Delete file",
        message: "This cannot be undone",
        icon: null,
        onConfirm,
        confirmLabel: "Delete",
      });
    });
    expect(screen.getByTestId("delete-modal")).toBeInTheDocument();
    expect(probes.props.delete).toMatchObject({
      title: "Delete file",
      message: "This cannot be undone",
      confirmLabel: "Delete",
    });
    act(() => probes.props.delete.onClose());
    expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
  });
});

describe("editing the basic information", () => {
  const payload = {
    fullName: "Grace B Hopper",
    email: "grace@example.com",
    staffRole: "role-2",
    DOB: "1980-12-09",
    gender: "Female",
    practiceNPI: "999",
    address: "1 Navy Way",
    city: "Arlington",
    state: "VA",
    zip: "22201",
    country: "United States",
    phoneNumber: "555-0100",
    active: true,
  };

  const openModal = async () => {
    renderPage();
    await loaded();
    act(() => profile().openBasicInfoModal());
    expect(screen.getByTestId("basicInfo-modal")).toBeInTheDocument();
    expect(probes.props.basicInfo.initialData).toMatchObject({ id: "s-1" });
  };

  it("sends the modal's payload and reloads all three fetches", async () => {
    await openModal();
    await act(async () => {
      await probes.props.basicInfo.onSave(payload);
    });
    expect(api.UpdateTenantStaffBasicInfo).toHaveBeenCalledWith({
      id: "s-1",
      fullName: "Grace B Hopper",
      email: "grace@example.com",
      roleId: "role-2",
      tenantId: "tenant-1",
      dob: "1980-12-09",
      gender: "Female",
      npi: "999",
      address: "1 Navy Way",
      city: "Arlington",
      state: "VA",
      zip: "22201",
      country: "United States",
      phoneNumber: "555-0100",
      active: true,
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(api.GetSingleTenantStaffById).toHaveBeenCalledTimes(2);
    expect(api.GetAllStaffLicenseById).toHaveBeenCalledTimes(2);
    expect(api.GetAllStaffDocumentById).toHaveBeenCalledTimes(2);
  });

  it("re-throws the server's reason so the modal can keep itself open", async () => {
    api.UpdateTenantStaffBasicInfo.mockRejectedValue({
      message: "422",
      response: { data: { message: "Email already in use" } },
    });
    await openModal();
    await act(async () => {
      await expect(probes.props.basicInfo.onSave(payload)).rejects.toThrow(
        "Email already in use"
      );
    });
    expect(toast.showToast).toHaveBeenCalledWith({
      message: "Email already in use",
      type: "error",
    });
    expect(screen.getByTestId("basicInfo-modal")).toBeInTheDocument();
  });

  it("re-throws a generic reason when the server gives none", async () => {
    api.UpdateTenantStaffBasicInfo.mockRejectedValue(new Error("network"));
    await openModal();
    await act(async () => {
      await expect(probes.props.basicInfo.onSave(payload)).rejects.toThrow(
        "Failed to update basic information"
      );
    });
    expect(toast.showToast).toHaveBeenCalledWith({
      message: "Failed to update basic information",
      type: "error",
    });
  });

  it("closes on cancel", async () => {
    await openModal();
    act(() => probes.props.basicInfo.onClose());
    expect(screen.queryByTestId("basicInfo-modal")).not.toBeInTheDocument();
  });
});

describe("resetting a staff login", () => {
  it("confirms the reset went through", async () => {
    renderPage();
    await loaded();
    await act(async () => {
      await profile().onResetStaffLogin();
    });
    expect(api.ResetStaffLogin).toHaveBeenCalledWith({
      id: "s-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith({
      message: "Staff login reset successfully",
      type: "success",
    });
  });

  it("surfaces the rejection's own message", async () => {
    api.ResetStaffLogin.mockRejectedValue(new Error("No login to reset"));
    renderPage();
    await loaded();
    await act(async () => {
      await profile().onResetStaffLogin();
    });
    expect(toast.showToast).toHaveBeenCalledWith({
      message: "No login to reset",
      type: "error",
    });
  });

  it("falls back to a generic message when the rejection carries none", async () => {
    api.ResetStaffLogin.mockRejectedValue({});
    renderPage();
    await loaded();
    await act(async () => {
      await profile().onResetStaffLogin();
    });
    expect(toast.showToast).toHaveBeenCalledWith({
      message: "Failed to reset staff login",
      type: "error",
    });
  });
});

describe("the licence and document modals", () => {
  it("opens the licence modal on the record the profile chose, then clears it", async () => {
    renderPage();
    await loaded();
    act(() => {
      profile().setLicenseToEdit({ id: "l-1", licenseName: "RBT" });
      profile().setShowLicenseModal(true);
    });
    expect(screen.getByTestId("license-modal")).toBeInTheDocument();
    expect(probes.props.license.initialValues).toMatchObject({ id: "l-1" });
    act(() => probes.props.license.onClose());
    expect(screen.queryByTestId("license-modal")).not.toBeInTheDocument();
    expect(probes.props.license.initialValues).toBeNull();
  });

  it("opens the document modal with the route's staff id, then clears it", async () => {
    renderPage();
    await loaded();
    act(() => {
      profile().setFileToEdit({ id: "d-1" });
      profile().setShowFileModal(true);
    });
    expect(probes.props.file).toMatchObject({
      tenantStaffId: "s-1",
      initialValues: { id: "d-1" },
    });
    act(() => probes.props.file.onClose());
    expect(screen.queryByTestId("file-modal")).not.toBeInTheDocument();
    expect(probes.props.file.initialValues).toBeNull();
  });

  it("switches the licence display between card and list", async () => {
    renderPage();
    await loaded();
    expect(profile().licenseView).toBe("card");
    act(() => profile().setLicenseView("list"));
    expect(profile().licenseView).toBe("list");
  });
});
