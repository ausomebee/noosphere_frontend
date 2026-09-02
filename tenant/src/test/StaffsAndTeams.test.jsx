import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The organisation's Staff & Teams page: two permission-gated tabs over one
 * shared table, plus the add/edit modals for a staff member and for a team.
 *
 * Three fetches run against the same endpoints on mount -- the page pulls the
 * full tenant staff list both to fill the staff table and to build the team
 * lead and member dropdowns -- so call counts here are deliberately loose and
 * the assertions look at arguments instead. The active tab is remembered in
 * sessionStorage by `usePersistedTab`, which is cleared between tests so one
 * test's tab choice cannot leak into the next.
 *
 * Both modals are probes: this page's job is to shape their `initialData` and
 * to turn what they submit back into an API payload, and that payload assembly
 * (which optional collections are included, when `minimumHours` survives, which
 * of create or update is called) is the real subject of the submit tests.
 */

const apiMock = vi.hoisted(() => ({
  GetAllStaffByTenantId: vi.fn(),
  GetStaffWithTeamAccess: vi.fn(),
  GetAllTeamsByTenantId: vi.fn(),
  GetSingleTenantStaffById: vi.fn(),
  UpdateActiveTenantStaff: vi.fn(),
  CreateTenantStaff: vi.fn(),
  UpdateTenantStaff: vi.fn(),
  CreateTeam: vi.fn(),
  UpdateTeam: vi.fn(),
  DeleteTeam: vi.fn(),
  ToggleTeamActive: vi.fn(),
}));
vi.mock("../api/organisationStaffApis", () => ({ default: apiMock }));

const toastMock = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toastMock.showToast(...a),
  showApiError: vi.fn(),
}));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

const probes = vi.hoisted(() => {
  const props = {};
  const record = (name) => (received) => {
    props[name] = received;
    return received.isOpen ? <div data-testid={`${name}-modal`} /> : null;
  };
  return { props, record };
});
vi.mock("../Components/ReusableModal/OrganizationModal/AddStaffModal", () => ({
  default: probes.record("staff"),
}));
vi.mock("../Components/ReusableModal/OrganizationModal/AddTeamsModal", () => ({
  default: probes.record("teams"),
}));

import StaffsAndTeams from "../Pages/Organisation/StaffAndTeams/StaffsAndTeams";

const staffRecord = (over = {}) => ({
  id: "s-1",
  fullName: "Grace Hopper",
  role: { name: "Clinician" },
  createdAt: "2026-03-10T09:00:00",
  active: true,
  ...over,
});

const store = (permissions, tenantId = "tenant-1") =>
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
        loaded: true,
      },
    },
  });

const renderPage = ({ permissions, tenantId } = {}) =>
  render(
    <Provider store={store(permissions, tenantId)}>
      <StaffsAndTeams />
    </Provider>
  );

const dataRows = () =>
  Array.from(document.body.querySelectorAll("tbody tr")).filter(
    (tr) => !tr.querySelector("td[colspan]")
  );

const openRowMenu = () =>
  fireEvent.click(document.body.querySelector(".action-cell .action-button"));

const goToTeams = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Teams" }));
  await waitFor(() => expect(apiMock.GetAllTeamsByTenantId).toHaveBeenCalled());
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  apiMock.GetAllStaffByTenantId.mockResolvedValue({ data: { data: [staffRecord()] } });
  apiMock.GetStaffWithTeamAccess.mockResolvedValue({ data: { data: [] } });
  apiMock.GetAllTeamsByTenantId.mockResolvedValue({ data: { data: [] } });
  apiMock.GetSingleTenantStaffById.mockResolvedValue({ data: { data: {} } });
  apiMock.UpdateActiveTenantStaff.mockResolvedValue({});
  apiMock.CreateTenantStaff.mockResolvedValue({});
  apiMock.UpdateTenantStaff.mockResolvedValue({});
  apiMock.CreateTeam.mockResolvedValue({});
  apiMock.UpdateTeam.mockResolvedValue({});
  apiMock.DeleteTeam.mockResolvedValue({});
  apiMock.ToggleTeamActive.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("tab visibility", () => {
  it("renders nothing at all for a role that can see neither list", () => {
    const { container } = renderPage({ permissions: ["create_new_staff"] });
    expect(container).toBeEmptyDOMElement();
  });

  it("shows only the tab the role is granted, and opens on it", async () => {
    renderPage({ permissions: ["view_teams_list"] });
    expect(screen.queryByRole("button", { name: "Staff" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Teams" })).toBeInTheDocument();
    await waitFor(() => expect(apiMock.GetAllTeamsByTenantId).toHaveBeenCalled());
  });

  it("remembers the tab across a remount", async () => {
    const first = renderPage();
    await goToTeams();
    first.unmount();
    vi.clearAllMocks();
    renderPage();
    expect(screen.getByRole("button", { name: "Teams" })).toHaveClass(
      "appointment-sched-view-button-active"
    );
  });

  it("ignores a remembered tab the current role cannot see", async () => {
    sessionStorage.setItem("tab:tenant:staffsAndTeams", "teams");
    renderPage({ permissions: ["view_staff_list"] });
    expect(screen.getByRole("button", { name: "Staff" })).toHaveClass(
      "appointment-sched-view-button-active"
    );
    await waitFor(() => expect(apiMock.GetAllStaffByTenantId).toHaveBeenCalled());
  });
});

describe("the staff table", () => {
  it("maps each staff record into a row", async () => {
    renderPage();
    expect(await screen.findByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("Clinician")).toBeInTheDocument();
    expect(screen.getByText("03/10/2026")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("reads an inactive staff member as Inactive", async () => {
    apiMock.GetAllStaffByTenantId.mockResolvedValue({
      data: { data: [staffRecord({ active: false })] },
    });
    renderPage();
    expect(await screen.findByText("Inactive")).toBeInTheDocument();
  });

  it("shows an empty table without a toast when the staff fetch fails", async () => {
    apiMock.GetAllStaffByTenantId.mockRejectedValue(new Error("500"));
    renderPage();
    await waitFor(() => expect(apiMock.GetAllStaffByTenantId).toHaveBeenCalled());
    expect(dataRows()).toHaveLength(0);
    expect(toastMock.showToast).not.toHaveBeenCalled();
  });

  it("passes the tenant and tokens to the staff endpoint", async () => {
    renderPage();
    await waitFor(() =>
      expect(apiMock.GetAllStaffByTenantId).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
  });

  it("offers the role's own subset of row actions", async () => {
    renderPage({ permissions: ["view_staff_list", "view_staff_profile"] });
    await screen.findByText("Grace Hopper");
    openRowMenu();
    expect(screen.getByText("View Staff Information")).toBeInTheDocument();
    expect(screen.queryByText("Edit Staff Information")).not.toBeInTheDocument();
    expect(screen.queryByText("Deactivate Staff")).not.toBeInTheDocument();
  });

  it("navigates to the staff profile with the name in the query string", async () => {
    apiMock.GetAllStaffByTenantId.mockResolvedValue({
      data: { data: [staffRecord({ fullName: "Ada Lovelace & Co" })] },
    });
    renderPage();
    await screen.findByText("Ada Lovelace & Co");
    openRowMenu();
    fireEvent.click(screen.getByText("View Staff Information"));
    expect(navigate).toHaveBeenCalledWith(
      "/organization/staff-and-teams/single-staff/s-1?name=Ada%20Lovelace%20%26%20Co"
    );
  });
});

describe("editing a staff member", () => {
  const fullStaff = {
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
      roleId: "role-1",
    },
    license: [
      {
        id: "l-1",
        licenseName: "RBT",
        licenseNumber: "R-1",
        issueState: "VA",
        expiryDate: "2027-01-31T00:00:00.000Z",
        tenantStaffId: "s-1",
      },
    ],
    payroll: {
      id: "p-1",
      paymentSchedule: "HOURLY",
      ratePerHour: "40",
      minimumHours: "",
      incomeItems: [{ id: "i-1" }],
      deductions: [{ id: "d-1" }],
      tenantStaffId: "s-1",
    },
    document: [{ id: "doc-1", documentsUrl: { filename: "cv.pdf", url: "u" }, tenantStaffId: "s-1" }],
  };

  const openEdit = async (payload = fullStaff) => {
    apiMock.GetSingleTenantStaffById.mockResolvedValue({ data: { data: payload } });
    renderPage();
    await screen.findByText("Grace Hopper");
    openRowMenu();
    fireEvent.click(screen.getByText("Edit Staff Information"));
    await screen.findByTestId("staff-modal");
  };

  it("shapes the stored record into the modal's initial data", async () => {
    await openEdit();
    expect(probes.props.staff.mode).toBe("edit");
    expect(probes.props.staff.initialData).toMatchObject({
      id: "s-1",
      fullName: "Grace Hopper",
      practiceNPI: "123",
      staffRole: "role-1",
      // Date inputs want a bare calendar date, not a timestamp.
      DOB: "1980-12-09",
    });
    expect(probes.props.staff.initialData.licenses[0]).toMatchObject({
      licenseName: "RBT",
      state: "VA",
      expiryDate: "2027-01-31",
    });
    expect(probes.props.staff.initialData.documents[0].documentsUrl.filename).toBe("cv.pdf");
    expect(probes.props.staff.initialData.payroll.otherPays).toEqual([{ type: "i-1" }]);
  });

  it("blanks the date fields a record leaves unset", async () => {
    await openEdit({
      staff: { ...fullStaff.staff, dob: null },
      license: [{ id: "l-2", licenseName: "BCBA", expiryDate: null }],
      payroll: {},
      document: [],
    });
    expect(probes.props.staff.initialData.DOB).toBe("");
    expect(probes.props.staff.initialData.licenses[0].expiryDate).toBe("");
  });

  it("seeds one empty row when there are no pay or deduction items", async () => {
    await openEdit({ ...fullStaff, payroll: { id: "p-2", incomeItems: [], deductions: [] } });
    expect(probes.props.staff.initialData.payroll.otherPays).toEqual([{ type: "" }]);
    expect(probes.props.staff.initialData.payroll.deductions).toEqual([{ type: "" }]);
  });

  it("reports a failed load instead of opening the modal", async () => {
    apiMock.GetSingleTenantStaffById.mockRejectedValue(new Error("Staff not found"));
    renderPage();
    await screen.findByText("Grace Hopper");
    openRowMenu();
    fireEvent.click(screen.getByText("Edit Staff Information"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith({
        message: "Staff not found",
        type: "error",
      })
    );
    expect(screen.queryByTestId("staff-modal")).not.toBeInTheDocument();
  });
});

describe("activating and deactivating staff", () => {
  it("offers to deactivate an active staff member and flips the row", async () => {
    renderPage();
    await screen.findByText("Grace Hopper");
    openRowMenu();
    fireEvent.click(screen.getByText("Deactivate Staff"));
    await waitFor(() =>
      expect(apiMock.UpdateActiveTenantStaff).toHaveBeenCalledWith({
        id: "s-1",
        active: false,
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toastMock.showToast).toHaveBeenCalledWith({
      message: "Staff Grace Hopper deactivated successfully",
      type: "success",
    });
  });

  it("offers to activate an inactive staff member", async () => {
    apiMock.GetAllStaffByTenantId.mockResolvedValue({
      data: { data: [staffRecord({ active: false })] },
    });
    renderPage();
    await screen.findByText("Grace Hopper");
    openRowMenu();
    fireEvent.click(screen.getByText("Activate Staff"));
    await waitFor(() =>
      expect(apiMock.UpdateActiveTenantStaff).toHaveBeenCalledWith(
        expect.objectContaining({ active: true })
      )
    );
    expect(toastMock.showToast).toHaveBeenCalledWith({
      message: "Staff Grace Hopper activated successfully",
      type: "success",
    });
  });

  it("reports a refused status change", async () => {
    apiMock.UpdateActiveTenantStaff.mockRejectedValue(new Error("Locked"));
    renderPage();
    await screen.findByText("Grace Hopper");
    openRowMenu();
    fireEvent.click(screen.getByText("Deactivate Staff"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith({ message: "Locked", type: "error" })
    );
  });
});

describe("the teams table", () => {
  const teams = (rows) =>
    apiMock.GetAllTeamsByTenantId.mockResolvedValue({ data: { data: rows } });

  it("prefers the team's own member count over the loaded members", async () => {
    teams([
      {
        id: "t-1",
        name: "Morning crew",
        createdAt: "2026-01-05T00:00:00",
        _count: { teamMembers: 9 },
        teamMembers: [{ staff: { id: "s-1", fullName: "Grace Hopper" } }],
        teamLead: { fullName: "Ada Lovelace" },
        isActive: true,
      },
    ]);
    renderPage();
    await goToTeams();
    expect(await screen.findByText("Morning crew")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("01/05/2026")).toBeInTheDocument();
  });

  it("counts the loaded members when the team carries no count", async () => {
    teams([
      {
        id: "t-1",
        name: "Morning crew",
        teamMembers: [{ staff: { fullName: "A" } }, { staff: { fullName: "B" } }],
      },
    ]);
    renderPage();
    await goToTeams();
    expect(await screen.findByText("Morning crew")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("A, B")).toBeInTheDocument();
  });

  it("dashes the count, the lead and the member list of an empty team", async () => {
    teams([{ id: "t-1", name: "Empty crew" }]);
    renderPage();
    await goToTeams();
    expect(await screen.findByText("Empty crew")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it("resolves a team lead held only as an id against the tenant staff list", async () => {
    teams([{ id: "t-1", name: "Morning crew", teamLeadId: "s-1" }]);
    renderPage();
    await goToTeams();
    expect(await screen.findByText("Grace Hopper")).toBeInTheDocument();
  });

  it("leaves the table empty when the teams fetch fails", async () => {
    apiMock.GetAllTeamsByTenantId.mockRejectedValue(new Error("500"));
    renderPage();
    await goToTeams();
    expect(dataRows()).toHaveLength(0);
    expect(toastMock.showToast).not.toHaveBeenCalled();
  });
});

describe("the team lead and member dropdowns", () => {
  it("builds both option lists from the active tenant staff", async () => {
    apiMock.GetAllStaffByTenantId.mockResolvedValue({
      data: {
        data: [
          staffRecord(),
          staffRecord({ id: "s-2", fullName: "Retired Rita", active: false }),
          staffRecord({ id: "s-3", fullName: "Ada Lovelace" }),
        ],
      },
    });
    renderPage();
    await goToTeams();
    fireEvent.click(screen.getByRole("button", { name: /Create a new Team/ }));
    await screen.findByTestId("teams-modal");
    const expected = [
      { value: "s-1", label: "Grace Hopper" },
      { value: "s-3", label: "Ada Lovelace" },
    ];
    expect(probes.props.teams.teamLeadOptions).toEqual(expected);
    expect(probes.props.teams.memberOptions).toEqual(expected);
  });

  it("carries on with empty dropdowns when the staff lists cannot be loaded", async () => {
    apiMock.GetStaffWithTeamAccess.mockRejectedValue(new Error("500"));
    renderPage();
    await goToTeams();
    fireEvent.click(screen.getByRole("button", { name: /Create a new Team/ }));
    await screen.findByTestId("teams-modal");
    expect(probes.props.teams.teamLeadOptions).toEqual([]);
  });
});

describe("team row actions", () => {
  const oneTeam = (over = {}) => [
    {
      id: "t-1",
      name: "Morning crew",
      teamLeadId: "s-1",
      isActive: true,
      teamMembers: [{ staff: { id: "s-9", fullName: "Grace Hopper" } }],
      ...over,
    },
  ];

  const openTeamMenu = async (rows = oneTeam()) => {
    apiMock.GetAllTeamsByTenantId.mockResolvedValue({ data: { data: rows } });
    renderPage();
    await goToTeams();
    await screen.findByText("Morning crew");
    openRowMenu();
  };

  it("opens the edit modal with the team's members flattened to ids", async () => {
    await openTeamMenu();
    fireEvent.click(screen.getByText("Edit Team"));
    await screen.findByTestId("teams-modal");
    expect(probes.props.teams.mode).toBe("edit");
    expect(probes.props.teams.initialData).toEqual({
      id: "t-1",
      teamName: "Morning crew",
      teamMember: ["s-9"],
      teamLead: "s-1",
    });
  });

  it("falls back to a blank lead when the team has none", async () => {
    await openTeamMenu(oneTeam({ teamLeadId: null }));
    fireEvent.click(screen.getByText("Edit Team"));
    await screen.findByTestId("teams-modal");
    expect(probes.props.teams.initialData.teamLead).toBe("");
  });

  it("deactivates an active team and reloads the list", async () => {
    await openTeamMenu();
    fireEvent.click(screen.getByText("Deactivate Team"));
    await waitFor(() =>
      expect(apiMock.ToggleTeamActive).toHaveBeenCalledWith({
        id: "t-1",
        active: false,
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toastMock.showToast).toHaveBeenCalledWith({
      message: "Team Morning crew deactivated successfully",
      type: "success",
    });
    await waitFor(() => expect(apiMock.GetAllTeamsByTenantId).toHaveBeenCalledTimes(2));
  });

  it("offers to activate a team that is switched off", async () => {
    await openTeamMenu(oneTeam({ isActive: false }));
    fireEvent.click(screen.getByText("Activate Team"));
    await waitFor(() =>
      expect(apiMock.ToggleTeamActive).toHaveBeenCalledWith(
        expect.objectContaining({ active: true })
      )
    );
  });

  it("reports a refused status change", async () => {
    apiMock.ToggleTeamActive.mockRejectedValue(new Error("Team is in use"));
    await openTeamMenu();
    fireEvent.click(screen.getByText("Deactivate Team"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith({
        message: "Team is in use",
        type: "error",
      })
    );
  });

  it("deletes a team", async () => {
    await openTeamMenu();
    fireEvent.click(screen.getByText("Delete Team"));
    await waitFor(() =>
      expect(apiMock.DeleteTeam).toHaveBeenCalledWith({
        id: "t-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toastMock.showToast).toHaveBeenCalledWith({
      message: "Team Morning crew deleted successfully",
      type: "success",
    });
  });

  it("reports a refused delete", async () => {
    apiMock.DeleteTeam.mockRejectedValue(new Error("Team has members"));
    await openTeamMenu();
    fireEvent.click(screen.getByText("Delete Team"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith({
        message: "Team has members",
        type: "error",
      })
    );
  });

  it("hides the team actions a role was not granted", async () => {
    apiMock.GetAllTeamsByTenantId.mockResolvedValue({ data: { data: oneTeam() } });
    renderPage({ permissions: ["view_teams_list", "deactivate_a_team"] });
    await waitFor(() => expect(apiMock.GetAllTeamsByTenantId).toHaveBeenCalled());
    await screen.findByText("Morning crew");
    openRowMenu();
    expect(screen.getByText("Deactivate Team")).toBeInTheDocument();
    expect(screen.queryByText("Edit Team")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete Team")).not.toBeInTheDocument();
  });
});

describe("the create button", () => {
  it("names the record the active tab creates", async () => {
    renderPage();
    await screen.findByText("Grace Hopper");
    expect(screen.getByRole("button", { name: /Create a new Staff/ })).toBeInTheDocument();
    await goToTeams();
    expect(screen.getByRole("button", { name: /Create a new Team/ })).toBeInTheDocument();
  });

  it("is withheld from a role that may only look", async () => {
    renderPage({ permissions: ["view_staff_list"] });
    await waitFor(() => expect(apiMock.GetAllStaffByTenantId).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /Create a new/ })).not.toBeInTheDocument();
  });

  it("opens the staff modal in add mode with no record behind it", async () => {
    renderPage();
    await screen.findByText("Grace Hopper");
    fireEvent.click(screen.getByRole("button", { name: /Create a new Staff/ }));
    await screen.findByTestId("staff-modal");
    expect(probes.props.staff.mode).toBe("add");
    expect(probes.props.staff.initialData).toBeNull();
  });

  it("closes the staff modal again", async () => {
    renderPage();
    await screen.findByText("Grace Hopper");
    fireEvent.click(screen.getByRole("button", { name: /Create a new Staff/ }));
    await screen.findByTestId("staff-modal");
    probes.props.staff.onClose();
    await waitFor(() => expect(screen.queryByTestId("staff-modal")).not.toBeInTheDocument());
  });
});

describe("submitting a staff member", () => {
  const openAdd = async () => {
    renderPage();
    await screen.findByText("Grace Hopper");
    fireEvent.click(screen.getByRole("button", { name: /Create a new Staff/ }));
    await screen.findByTestId("staff-modal");
  };

  it("creates a staff member against the current tenant", async () => {
    await openAdd();
    await probes.props.staff.onSubmit({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      staffRole: "role-1",
      DOB: "1990-01-02",
      paymentSchedule: "HOURLY",
      ratePerHour: 40,
    });
    const payload = apiMock.CreateTenantStaff.mock.calls[0][0];
    expect(apiMock.UpdateTenantStaff).not.toHaveBeenCalled();
    expect(payload).toMatchObject({
      id: undefined,
      fullName: "Ada Lovelace",
      tenantId: "tenant-1",
      roleId: "role-1",
      // The form gives a plain date; the API wants a timestamp.
      dob: new Date("1990-01-02").toISOString(),
    });
    expect(payload.payroll).toEqual({ paymentSchedule: "HOURLY", ratePerHour: "40", id: undefined });
    expect(payload).not.toHaveProperty("documents");
    expect(payload).not.toHaveProperty("licenses");
    expect(toastMock.showToast).toHaveBeenCalledWith({
      message: "Staff created successfully",
      type: "success",
    });
  });

  it("defaults an omitted active flag to true and leaves optional text empty", async () => {
    await openAdd();
    await probes.props.staff.onSubmit({});
    const payload = apiMock.CreateTenantStaff.mock.calls[0][0];
    expect(payload.active).toBe(true);
    expect(payload.fullName).toBe("");
    expect(payload.dob).toBeUndefined();
    expect(payload.gender).toBeUndefined();
  });

  it("keeps a salaried minimum but drops it for any other schedule", async () => {
    await openAdd();
    await probes.props.staff.onSubmit({ paymentSchedule: "SALARIED", minimumHours: 30 });
    expect(apiMock.CreateTenantStaff.mock.calls[0][0].payroll.minimumHours).toBe("30");

    apiMock.CreateTenantStaff.mockClear();
    await probes.props.staff.onSubmit({ paymentSchedule: "HOURLY", minimumHours: 30 });
    expect(apiMock.CreateTenantStaff.mock.calls[0][0].payroll).not.toHaveProperty("minimumHours");
  });

  it("drops a salaried minimum that is not a number", async () => {
    await openAdd();
    await probes.props.staff.onSubmit({ paymentSchedule: "SALARIED", minimumHours: "many" });
    expect(apiMock.CreateTenantStaff.mock.calls[0][0].payroll).not.toHaveProperty("minimumHours");
  });

  it("strips blank pay and deduction rows and omits the empty collections", async () => {
    await openAdd();
    await probes.props.staff.onSubmit({
      otherPays: [{ type: "bonus" }, { type: "  " }],
      deductions: [{ type: "" }],
    });
    const { payroll } = apiMock.CreateTenantStaff.mock.calls[0][0];
    expect(payroll.otherPays).toEqual(["bonus"]);
    expect(payroll).not.toHaveProperty("deductions");
  });

  it("keeps only complete licenses and error-free documents", async () => {
    await openAdd();
    await probes.props.staff.onSubmit({
      licenses: [
        { licenseName: "RBT", licenseNumber: "R-1", expiryDate: "2027-01-31", state: "VA" },
        { licenseName: "Incomplete" },
      ],
      documents: [
        { id: "d1", filename: "cv.pdf", url: "u" },
        { id: "d2", filename: "bad.pdf", error: "upload failed" },
      ],
    });
    const payload = apiMock.CreateTenantStaff.mock.calls[0][0];
    expect(payload.licenses).toHaveLength(1);
    expect(payload.licenses[0]).toMatchObject({ issueState: "VA" });
    expect(payload.documents).toEqual([
      { id: "d1", documentsUrl: { filename: "cv.pdf", url: "u" }, tenantStaffId: undefined },
    ]);
  });

  it("updates instead of creating once a record has been loaded for editing", async () => {
    apiMock.GetSingleTenantStaffById.mockResolvedValue({
      data: {
        data: {
          staff: { id: "s-1", fullName: "Grace Hopper", tenantId: "tenant-9" },
          license: [],
          payroll: {},
          document: [],
        },
      },
    });
    renderPage();
    await screen.findByText("Grace Hopper");
    openRowMenu();
    fireEvent.click(screen.getByText("Edit Staff Information"));
    await screen.findByTestId("staff-modal");
    await probes.props.staff.onSubmit({ fullName: "Grace B. Hopper" });
    expect(apiMock.CreateTenantStaff).not.toHaveBeenCalled();
    expect(apiMock.UpdateTenantStaff.mock.calls[0][0]).toMatchObject({
      id: "s-1",
      fullName: "Grace B. Hopper",
    });
    expect(toastMock.showToast).toHaveBeenCalledWith({
      message: "Staff updated successfully",
      type: "success",
    });
  });

  it("re-throws a failed save so the modal can stay open", async () => {
    apiMock.CreateTenantStaff.mockRejectedValue(new Error("Email already in use"));
    await openAdd();
    await expect(probes.props.staff.onSubmit({ fullName: "Ada" })).rejects.toThrow(
      "Email already in use"
    );
    expect(toastMock.showToast).toHaveBeenCalledWith({
      message: "Email already in use",
      type: "error",
    });
    expect(screen.getByTestId("staff-modal")).toBeInTheDocument();
  });
});

describe("submitting a team", () => {
  const openAddTeam = async () => {
    renderPage();
    await goToTeams();
    fireEvent.click(screen.getByRole("button", { name: /Create a new Team/ }));
    await screen.findByTestId("teams-modal");
  };

  it("creates a team under the current tenant", async () => {
    await openAddTeam();
    await probes.props.teams.onSubmit({
      teamName: "Morning crew",
      teamLead: "s-1",
      teamMember: ["s-2", "s-3"],
    });
    expect(apiMock.CreateTeam).toHaveBeenCalledWith({
      name: "Morning crew",
      tenantId: "tenant-1",
      teamLeadId: "s-1",
      members: ["s-2", "s-3"],
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toastMock.showToast).toHaveBeenCalledWith({
      message: "Team created successfully",
      type: "success",
    });
    await waitFor(() => expect(apiMock.GetAllTeamsByTenantId).toHaveBeenCalledTimes(2));
  });

  it("updates the team the edit action selected", async () => {
    apiMock.GetAllTeamsByTenantId.mockResolvedValue({
      data: { data: [{ id: "t-1", name: "Morning crew", teamMembers: [] }] },
    });
    renderPage();
    await goToTeams();
    await screen.findByText("Morning crew");
    openRowMenu();
    fireEvent.click(screen.getByText("Edit Team"));
    await screen.findByTestId("teams-modal");
    await probes.props.teams.onSubmit({ id: "t-1", teamName: "Evening crew", teamMember: [] });
    expect(apiMock.CreateTeam).not.toHaveBeenCalled();
    expect(apiMock.UpdateTeam).toHaveBeenCalledWith({
      id: "t-1",
      name: "Evening crew",
      teamLeadId: undefined,
      members: [],
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toastMock.showToast).toHaveBeenCalledWith({
      message: "Team updated successfully",
      type: "success",
    });
  });

  it("re-throws a failed team save so the modal can stay open", async () => {
    apiMock.CreateTeam.mockRejectedValue(new Error("Name already taken"));
    await openAddTeam();
    await expect(probes.props.teams.onSubmit({ teamName: "Morning crew" })).rejects.toThrow(
      "Name already taken"
    );
    expect(toastMock.showToast).toHaveBeenCalledWith({
      message: "Name already taken",
      type: "error",
    });
    expect(screen.getByTestId("teams-modal")).toBeInTheDocument();
  });
});

describe("responses and failures with nothing useful in them", () => {
  it("makes none of its three fetches without a tenant", async () => {
    renderPage({ tenantId: null });
    fireEvent.click(screen.getByRole("button", { name: "Teams" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Teams" })).toHaveClass(
        "appointment-sched-view-button-active"
      )
    );
    expect(apiMock.GetAllStaffByTenantId).not.toHaveBeenCalled();
    expect(apiMock.GetStaffWithTeamAccess).not.toHaveBeenCalled();
    expect(apiMock.GetAllTeamsByTenantId).not.toHaveBeenCalled();
  });

  it("empties the staff table when the response carries no rows", async () => {
    apiMock.GetAllStaffByTenantId.mockResolvedValue({});
    renderPage();
    await waitFor(() => expect(apiMock.GetAllStaffByTenantId).toHaveBeenCalled());
    expect(dataRows()).toHaveLength(0);
  });

  it("empties the teams table when the response carries no rows", async () => {
    apiMock.GetAllTeamsByTenantId.mockResolvedValue({});
    renderPage();
    await goToTeams();
    expect(dataRows()).toHaveLength(0);
  });

  it("builds empty dropdowns when both staff lists come back without rows", async () => {
    apiMock.GetStaffWithTeamAccess.mockResolvedValue({});
    apiMock.GetAllStaffByTenantId.mockResolvedValue({});
    renderPage();
    await goToTeams();
    fireEvent.click(screen.getByRole("button", { name: /Create a new Team/ }));
    await screen.findByTestId("teams-modal");
    expect(probes.props.teams.memberOptions).toEqual([]);
    expect(probes.props.teams.teamLeadOptions).toEqual([]);
  });

  it("falls back to generic wording when a failed staff load says nothing", async () => {
    apiMock.GetSingleTenantStaffById.mockRejectedValue({});
    renderPage();
    await screen.findByText("Grace Hopper");
    openRowMenu();
    fireEvent.click(screen.getByText("Edit Staff Information"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith({
        message: "Failed to load staff details",
        type: "error",
      })
    );
  });

  it("falls back to generic wording when a refused status change says nothing", async () => {
    apiMock.UpdateActiveTenantStaff.mockRejectedValue({});
    renderPage();
    await screen.findByText("Grace Hopper");
    openRowMenu();
    fireEvent.click(screen.getByText("Deactivate Staff"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith({
        message: "Failed to update staff status",
        type: "error",
      })
    );
  });

  it("falls back to generic wording when a refused staff save says nothing", async () => {
    apiMock.CreateTenantStaff.mockRejectedValue({});
    renderPage();
    await screen.findByText("Grace Hopper");
    fireEvent.click(screen.getByRole("button", { name: /Create a new Staff/ }));
    await screen.findByTestId("staff-modal");
    await expect(probes.props.staff.onSubmit({})).rejects.toBeTruthy();
    expect(toastMock.showToast).toHaveBeenCalledWith({
      message: "Failed to save staff",
      type: "error",
    });
  });

  it("falls back to generic wording when a refused team change says nothing", async () => {
    apiMock.GetAllTeamsByTenantId.mockResolvedValue({
      data: { data: [{ id: "t-1", name: "Morning crew", isActive: true }] },
    });
    apiMock.ToggleTeamActive.mockRejectedValue({});
    apiMock.DeleteTeam.mockRejectedValue({});
    renderPage();
    await goToTeams();
    await screen.findByText("Morning crew");
    openRowMenu();
    fireEvent.click(screen.getByText("Deactivate Team"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith({
        message: "Failed to update team status",
        type: "error",
      })
    );
    openRowMenu();
    fireEvent.click(screen.getByText("Delete Team"));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith({
        message: "Failed to delete team",
        type: "error",
      })
    );
  });

  it("falls back to generic wording when a refused team save says nothing", async () => {
    apiMock.CreateTeam.mockRejectedValue({});
    renderPage();
    await goToTeams();
    fireEvent.click(screen.getByRole("button", { name: /Create a new Team/ }));
    await screen.findByTestId("teams-modal");
    await expect(probes.props.teams.onSubmit({ teamName: "Morning crew" })).rejects.toBeTruthy();
    expect(toastMock.showToast).toHaveBeenCalledWith({
      message: "Failed to save team",
      type: "error",
    });
  });
});

describe("rows the page has to leave alone", () => {
  it("only flips the staff member whose status was changed", async () => {
    apiMock.GetAllStaffByTenantId.mockResolvedValue({
      data: {
        data: [staffRecord(), staffRecord({ id: "s-2", fullName: "Ada Lovelace", active: true })],
      },
    });
    renderPage();
    await screen.findByText("Grace Hopper");
    openRowMenu();
    fireEvent.click(screen.getByText("Deactivate Staff"));
    await waitFor(() => expect(apiMock.UpdateActiveTenantStaff).toHaveBeenCalled());
    // Ada keeps her own status while Grace's row is rewritten.
    expect(screen.getAllByText("Active")).toHaveLength(1);
  });

  it("edits a team that carries no member list at all", async () => {
    apiMock.GetAllTeamsByTenantId.mockResolvedValue({
      data: { data: [{ id: "t-1", name: "Morning crew", teamLeadId: "s-1" }] },
    });
    renderPage();
    await goToTeams();
    await screen.findByText("Morning crew");
    openRowMenu();
    fireEvent.click(screen.getByText("Edit Team"));
    await screen.findByTestId("teams-modal");
    expect(probes.props.teams.initialData.teamMember).toEqual([]);
  });

  it("keeps a placeholder for a membership row with no staff attached", async () => {
    apiMock.GetAllTeamsByTenantId.mockResolvedValue({
      data: {
        data: [
          {
            id: "t-1",
            name: "Morning crew",
            teamMembers: [{ staff: { id: "s-9" } }, { id: "orphaned" }],
          },
        ],
      },
    });
    renderPage();
    await goToTeams();
    await screen.findByText("Morning crew");
    openRowMenu();
    fireEvent.click(screen.getByText("Edit Team"));
    await screen.findByTestId("teams-modal");
    // The orphaned row still takes a slot in the multi-select's value.
    expect(probes.props.teams.initialData.teamMember).toEqual(["s-9", undefined]);
  });

  it("passes named deductions through to the payroll payload", async () => {
    renderPage();
    await screen.findByText("Grace Hopper");
    fireEvent.click(screen.getByRole("button", { name: /Create a new Staff/ }));
    await screen.findByTestId("staff-modal");
    await probes.props.staff.onSubmit({ deductions: [{ type: "tax" }, { type: "  " }] });
    expect(apiMock.CreateTenantStaff.mock.calls[0][0].payroll.deductions).toEqual(["tax"]);
  });
});
