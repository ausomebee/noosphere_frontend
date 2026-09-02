import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import roleDraftReducer from "../ReduxStore/features/roleDraftSlice";

/**
 * The organisation's Roles & Permissions page. It is really two screens behind
 * one component: a list of roles with activate/deactivate actions, and the role
 * configuration form, which the page swaps in rather than routing to.
 *
 * The page owns two translations and the tests are mostly about those: the API
 * `roleModuleAccesses` array becomes the nested redux draft on edit, and the
 * draft becomes a `moduleAccesses` payload on save. Both run through the real
 * `permissionsConfig`, so the fixtures use real module and permission keys --
 * an invented key is silently dropped, which is its own test.
 *
 * `RoleConfiguration` is a probe: the page hands it a draft submit callback, and
 * the tests invoke that callback with the draft shape the real form would
 * produce. The confirmation modal in front of an edit is the real one.
 */

const roleApi = vi.hoisted(() => ({
  GetAllRolesByTenantId: vi.fn(),
  GetSingleRole: vi.fn(),
  CreateRole: vi.fn(),
  UpdateRole: vi.fn(),
  DeactivateRole: vi.fn(),
  ActivateRole: vi.fn(),
}));
vi.mock("../api/roleApi", () => ({ default: roleApi }));

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

const table = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/Table/CustomTable", () => ({
  default: (props) => {
    table.props = props;
    return (
      <div data-testid="table" data-loading={String(!!props.loading)}>
        {props.data.map((row) => (
          <div key={row.id} data-testid="row">
            <span data-cell="roleName">{row.roleName}</span>
            <span data-cell="toggleActive">{String(row.toggleActive)}</span>
          </div>
        ))}
      </div>
    );
  },
}));

const config = vi.hoisted(() => ({ props: null }));
vi.mock("../Pages/Organisation/RoleAndPermissions/RoleConfiguration", () => ({
  default: (props) => {
    config.props = props;
    return <div data-testid="role-config" data-mode={props.mode} />;
  },
}));

import RoleAndPermission from "../Pages/Organisation/RoleAndPermissions/RoleAndPermission";

const apiRole = (over = {}) => ({
  id: "r-1",
  name: "Clinician",
  isActive: true,
  dataAccessLevel: "TEAM",
  roleModuleAccesses: [
    { id: "ma-1", module: "DASHBOARD", permissions: ["view_session_information"] },
  ],
  ...over,
});

const store = ({ permissions } = {}) =>
  configureStore({
    reducer: { authentication: authReducer, roleDraft: roleDraftReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user: {
          id: "user-1",
          tenantId: "tenant-1",
          accessToken: "at",
          refreshToken: "rt",
          // An empty accesses array is the org-owner case: every permission.
          role: permissions
            ? { roleModuleAccesses: [{ module: "MY_ORGANIZATION", permissions }] }
            : { roleModuleAccesses: [] },
        },
      },
    },
  });

let currentStore;

const renderPage = (opts) => {
  currentStore = store(opts);
  return render(
    <Provider store={currentStore}>
      <RoleAndPermission />
    </Provider>
  );
};

const draftState = () => currentStore.getState().roleDraft;
const rows = () => screen.queryAllByTestId("row");
const items = () => table.props.actions[0].items;

const loaded = async () => {
  await waitFor(() =>
    expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false")
  );
};

// A draft in the shape RoleConfiguration hands back: only the keys the payload
// builder reads, with real module/permission keys so nothing is filtered out.
const draft = (over = {}) => ({
  roleName: "Supervisor",
  dataAccessLevel: "GLOBAL",
  selectedModules: ["DASHBOARD"],
  permissions: {
    DASHBOARD: {
      dashboard: { view_session_information: true, view_intake_pipeline_info: false },
    },
  },
  rawModuleAccesses: [],
  ...over,
});

const startEdit = async (row) => {
  items()[0].onClick(row);
  await screen.findByTestId("role-config");
};

beforeEach(() => {
  vi.clearAllMocks();
  table.props = null;
  config.props = null;
  roleApi.GetAllRolesByTenantId.mockResolvedValue({ data: { data: [apiRole()] } });
  roleApi.GetSingleRole.mockResolvedValue({ data: { data: apiRole() } });
  roleApi.CreateRole.mockResolvedValue({});
  roleApi.UpdateRole.mockResolvedValue({});
  roleApi.DeactivateRole.mockResolvedValue({});
  roleApi.ActivateRole.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("permission gating", () => {
  it("denies access to a role holding none of the four role permissions", () => {
    renderPage({ permissions: ["view_staff_list"] });
    expect(
      screen.getByText("You don't have permission to view this.")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("table")).not.toBeInTheDocument();
  });

  it("admits a role holding only one of them", async () => {
    renderPage({ permissions: ["view_roles_list"] });
    await loaded();
    expect(screen.getByTestId("table")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Create a new role/i })
    ).not.toBeInTheDocument();
  });

  it("wires the row click to edit only when the role may edit", async () => {
    renderPage({ permissions: ["view_roles_list"] });
    await loaded();
    expect(table.props.onActionClick).toBeUndefined();
  });
});

describe("loading the role list", () => {
  it("maps a fully populated role into a row", async () => {
    renderPage();
    await loaded();
    expect(rows()).toHaveLength(1);
    expect(table.props.data[0]).toMatchObject({
      id: "r-1",
      roleName: "Clinician",
      toggleActive: true,
      dataAccessLevel: "TEAM",
      selectedModules: ["DASHBOARD"],
    });
    expect(roleApi.GetAllRolesByTenantId).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      accessToken: "at",
      refreshToken: "rt",
    });
  });

  it("accepts a response that puts the roles directly under data", async () => {
    roleApi.GetAllRolesByTenantId.mockResolvedValue({ data: [apiRole({ id: "r-9" })] });
    renderPage();
    await loaded();
    expect(table.props.data[0].id).toBe("r-9");
  });

  it("shows an empty list when the response carries no roles at all", async () => {
    roleApi.GetAllRolesByTenantId.mockResolvedValue({});
    renderPage();
    await loaded();
    expect(rows()).toHaveLength(0);
  });

  it("fills in the defaults a sparse role leaves out", async () => {
    roleApi.GetAllRolesByTenantId.mockResolvedValue({
      data: { data: [{ id: "r-2", name: "Aide", isActive: false }] },
    });
    renderPage();
    await loaded();
    expect(table.props.data[0]).toMatchObject({
      toggleActive: false,
      dataAccessLevel: "",
      rawModuleAccesses: [],
      selectedModules: [],
    });
  });

  it("treats an unflagged role as active", async () => {
    roleApi.GetAllRolesByTenantId.mockResolvedValue({
      data: { data: [{ id: "r-3", name: "Aide" }] },
    });
    renderPage();
    await loaded();
    expect(table.props.data[0].toggleActive).toBe(true);
  });

  it("stays silent and empty when the fetch is refused", async () => {
    roleApi.GetAllRolesByTenantId.mockRejectedValue(new Error("500"));
    renderPage();
    await loaded();
    expect(rows()).toHaveLength(0);
    expect(toast.showToast).not.toHaveBeenCalled();
  });
});

describe("the row action menu", () => {
  it("offers both entries to a role holding both permissions", async () => {
    renderPage();
    await loaded();
    expect(items()).toHaveLength(2);
  });

  it("drops the entry whose permission the role lacks", async () => {
    renderPage({ permissions: ["view_roles_list", "edit_a_role"] });
    await loaded();
    expect(items()).toHaveLength(1);
    expect(items()[0].label).toBe("Edit Role");
  });

  it("leaves the menu empty when the role may only look", async () => {
    renderPage({ permissions: ["view_roles_list"] });
    await loaded();
    expect(items()).toEqual([]);
  });

  it("offers to deactivate an active role and to activate an inactive one", async () => {
    renderPage();
    await loaded();
    const toggle = items()[1];
    expect(toggle.label({ toggleActive: true })).toBe("Deactivate Role");
    expect(toggle.className({ toggleActive: true })).toBe("remove");
    expect(toggle.label({ toggleActive: false })).toBe("Activate Role");
    expect(toggle.className({ toggleActive: false })).toBe("");
  });
});

describe("flipping a role's active state", () => {
  const row = (active) => ({ id: "r-1", toggleActive: active });

  it("calls the deactivate endpoint for an active role and reloads", async () => {
    renderPage();
    await loaded();
    items()[1].onClick(row(true));
    await waitFor(() =>
      expect(roleApi.DeactivateRole).toHaveBeenCalledWith({
        roleId: "r-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith("Role deactivated", "success");
    await waitFor(() =>
      expect(roleApi.GetAllRolesByTenantId).toHaveBeenCalledTimes(2)
    );
  });

  it("calls the activate endpoint for an inactive role", async () => {
    renderPage();
    await loaded();
    items()[1].onClick(row(false));
    await waitFor(() => expect(roleApi.ActivateRole).toHaveBeenCalled());
    expect(toast.showToast).toHaveBeenCalledWith("Role activated", "success");
  });

  it("surfaces the rejection's own message", async () => {
    roleApi.DeactivateRole.mockRejectedValue(new Error("Role is in use"));
    renderPage();
    await loaded();
    items()[1].onClick(row(true));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Role is in use", "error")
    );
  });

  it("names the attempted direction when the rejection carries no message", async () => {
    roleApi.ActivateRole.mockRejectedValue({});
    renderPage();
    await loaded();
    items()[1].onClick(row(false));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to activate role", "error")
    );
  });
});

describe("the table's own active toggle", () => {
  it("deactivates through the same endpoints as the menu", async () => {
    renderPage();
    await loaded();
    table.props.onToggleActive({ id: "r-1", toggleActive: true });
    await waitFor(() => expect(roleApi.DeactivateRole).toHaveBeenCalled());
    expect(toast.showToast).toHaveBeenCalledWith("Role deactivated", "success");
  });

  it("activates an inactive role", async () => {
    renderPage();
    await loaded();
    table.props.onToggleActive({ id: "r-1", toggleActive: false });
    await waitFor(() => expect(roleApi.ActivateRole).toHaveBeenCalled());
    expect(toast.showToast).toHaveBeenCalledWith("Role activated", "success");
  });

  it("reports a refused toggle with its own generic message", async () => {
    roleApi.DeactivateRole.mockRejectedValue({});
    renderPage();
    await loaded();
    table.props.onToggleActive({ id: "r-1", toggleActive: true });
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to update role status", "error")
    );
  });
});

describe("opening the configuration form", () => {
  it("starts a blank draft when creating", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: /Create a new role/i }));
    expect(screen.getByTestId("role-config")).toHaveAttribute("data-mode", "add");
    expect(draftState().roleName).toBe("");
    expect(draftState().selectedModules).toEqual([]);
  });

  it("loads the fetched role into the draft when editing", async () => {
    renderPage();
    await loaded();
    await startEdit({ id: "r-1", roleName: "Clinician" });
    expect(roleApi.GetSingleRole).toHaveBeenCalledWith({
      roleId: "r-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(screen.getByTestId("role-config")).toHaveAttribute("data-mode", "edit");
    expect(draftState()).toMatchObject({
      roleName: "Clinician",
      dataAccessLevel: "TEAM",
      selectedModules: ["DASHBOARD"],
    });
    expect(draftState().permissions.DASHBOARD.dashboard).toMatchObject({
      view_session_information: true,
      view_intake_pipeline_info: false,
    });
  });

  it("accepts a single-role response with no inner data wrapper", async () => {
    roleApi.GetSingleRole.mockResolvedValue({ data: apiRole({ name: "Direct" }) });
    renderPage();
    await loaded();
    await startEdit({ id: "r-1", roleName: "Clinician" });
    expect(draftState().roleName).toBe("Direct");
  });

  it("falls back to the row's name when the fetched role has none", async () => {
    roleApi.GetSingleRole.mockResolvedValue({
      data: { data: { id: "r-1", dataAccessLevel: null } },
    });
    renderPage();
    await loaded();
    await startEdit({ id: "r-1", roleName: "From the row" });
    expect(draftState().roleName).toBe("From the row");
    expect(draftState().dataAccessLevel).toBe("");
    expect(draftState().selectedModules).toEqual([]);
  });

  it("settles on an empty name when neither the role nor the row has one", async () => {
    roleApi.GetSingleRole.mockResolvedValue({ data: { data: {} } });
    renderPage();
    await loaded();
    await startEdit({ id: "r-1" });
    expect(draftState().roleName).toBe("");
  });

  it("expands a legacy shared permission key onto its module-specific one", async () => {
    roleApi.GetSingleRole.mockResolvedValue({
      data: {
        data: apiRole({
          roleModuleAccesses: [
            // "view_document" predates the client/organisation split; a role
            // saved before it must still show the organisation grant ticked.
            { module: "MY_ORGANIZATION", permissions: ["view_document"] },
          ],
        }),
      },
    });
    renderPage();
    await loaded();
    await startEdit({ id: "r-1", roleName: "Clinician" });
    const orgPerms = draftState().permissions.MY_ORGANIZATION;
    const subcat = Object.keys(orgPerms).find((k) => "view_org_document" in orgPerms[k]);
    expect(orgPerms[subcat].view_org_document).toBe(true);
  });

  it("ignores a module the permission config does not know", async () => {
    roleApi.GetSingleRole.mockResolvedValue({
      data: {
        data: apiRole({
          roleModuleAccesses: [{ module: "TIME_TRAVEL", permissions: ["view_yesterday"] }],
        }),
      },
    });
    renderPage();
    await loaded();
    await startEdit({ id: "r-1", roleName: "Clinician" });
    expect(draftState().selectedModules).toEqual(["TIME_TRAVEL"]);
    expect(draftState().permissions).not.toHaveProperty("TIME_TRAVEL");
  });

  it("ignores a module access that lists no permissions", async () => {
    roleApi.GetSingleRole.mockResolvedValue({
      data: { data: apiRole({ roleModuleAccesses: [{ module: "DASHBOARD" }] }) },
    });
    renderPage();
    await loaded();
    await startEdit({ id: "r-1", roleName: "Clinician" });
    expect(
      Object.values(draftState().permissions.DASHBOARD.dashboard).every((v) => v === false)
    ).toBe(true);
  });

  it("falls back to the row's own data when the single-role fetch fails", async () => {
    roleApi.GetSingleRole.mockRejectedValue(new Error("404"));
    renderPage();
    await loaded();
    await startEdit({
      id: "r-1",
      roleName: "Stale copy",
      dataAccessLevel: "INDIVIDUAL",
      selectedModules: ["DASHBOARD"],
      rawModuleAccesses: [
        { module: "DASHBOARD", permissions: ["view_upcoming_appointments"] },
      ],
    });
    expect(draftState()).toMatchObject({
      roleName: "Stale copy",
      dataAccessLevel: "INDIVIDUAL",
      selectedModules: ["DASHBOARD"],
    });
    expect(draftState().permissions.DASHBOARD.dashboard.view_upcoming_appointments).toBe(
      true
    );
  });

  it("falls back to empty defaults when the failed row is bare too", async () => {
    roleApi.GetSingleRole.mockRejectedValue(new Error("404"));
    renderPage();
    await loaded();
    await startEdit({ id: "r-1" });
    expect(draftState()).toMatchObject({
      roleName: "",
      dataAccessLevel: "",
      selectedModules: [],
      rawModuleAccesses: [],
    });
  });

  it("returns to the list and clears the draft on cancel", async () => {
    renderPage();
    await loaded();
    await startEdit({ id: "r-1", roleName: "Clinician" });
    config.props.onCancel();
    await screen.findByTestId("table");
    expect(draftState().roleName).toBe("");
  });
});

describe("saving a new role", () => {
  const create = async (over) => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: /Create a new role/i }));
    config.props.onSubmit(draft(over));
  };

  it("posts only the ticked permissions and returns to the list", async () => {
    await create();
    await waitFor(() =>
      expect(roleApi.CreateRole).toHaveBeenCalledWith({
        name: "Supervisor",
        dataAccessLevel: "GLOBAL",
        createdByTenantId: "tenant-1",
        moduleAccesses: [
          { module: "DASHBOARD", permissions: ["view_session_information"] },
        ],
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith("Role created successfully", "success");
    await screen.findByTestId("table");
    expect(draftState().roleName).toBe("");
  });

  it("sends an empty permission list for a module with nothing ticked", async () => {
    await create({ permissions: {} });
    await waitFor(() =>
      expect(roleApi.CreateRole).toHaveBeenCalledWith(
        expect.objectContaining({
          moduleAccesses: [{ module: "DASHBOARD", permissions: [] }],
        })
      )
    );
  });

  it("never attaches a module access id while creating", async () => {
    await create({
      rawModuleAccesses: [{ id: "ma-1", module: "DASHBOARD", permissions: [] }],
    });
    await waitFor(() => expect(roleApi.CreateRole).toHaveBeenCalled());
    expect(roleApi.CreateRole.mock.calls[0][0].moduleAccesses[0]).not.toHaveProperty("id");
  });

  it("keeps the form open and reports a refused save", async () => {
    roleApi.CreateRole.mockRejectedValue(new Error("Name already taken"));
    await create();
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Name already taken", "error")
    );
    expect(screen.getByTestId("role-config")).toBeInTheDocument();
  });

  it("falls back to a generic message when the rejection carries none", async () => {
    roleApi.CreateRole.mockRejectedValue({});
    await create();
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to save role", "error")
    );
  });
});

describe("saving an edited role", () => {
  const beginEdit = async (over) => {
    renderPage();
    await loaded();
    await startEdit({ id: "r-1", roleName: "Clinician" });
    config.props.onSubmit(draft(over));
    return screen.findByRole("dialog");
  };

  const confirm = () => fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

  it("asks for confirmation before sending anything", async () => {
    await beginEdit();
    expect(
      screen.getByText("Are you sure you want to save changes to this role?")
    ).toBeInTheDocument();
    expect(roleApi.UpdateRole).not.toHaveBeenCalled();
  });

  it("sends the update once confirmed, keeping the existing module access id", async () => {
    await beginEdit({
      rawModuleAccesses: [{ id: "ma-1", module: "DASHBOARD", permissions: [] }],
    });
    confirm();
    await waitFor(() =>
      expect(roleApi.UpdateRole).toHaveBeenCalledWith({
        id: "r-1",
        name: "Supervisor",
        dataAccessLevel: "GLOBAL",
        moduleAccesses: [
          {
            id: "ma-1",
            module: "DASHBOARD",
            permissions: ["view_session_information"],
          },
        ],
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith("Role updated successfully", "success");
    await screen.findByTestId("table");
  });

  it("omits the id for a module the role did not have before", async () => {
    await beginEdit({
      rawModuleAccesses: [{ module: "DASHBOARD", permissions: [] }],
    });
    confirm();
    await waitFor(() => expect(roleApi.UpdateRole).toHaveBeenCalled());
    expect(roleApi.UpdateRole.mock.calls[0][0].moduleAccesses[0]).not.toHaveProperty("id");
  });

  it("omits the id when the draft remembers no previous accesses", async () => {
    await beginEdit({ rawModuleAccesses: null });
    confirm();
    await waitFor(() => expect(roleApi.UpdateRole).toHaveBeenCalled());
    expect(roleApi.UpdateRole.mock.calls[0][0].moduleAccesses[0]).not.toHaveProperty("id");
  });

  it("sends nothing when the confirmation is cancelled", async () => {
    await beginEdit();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(roleApi.UpdateRole).not.toHaveBeenCalled();
    expect(screen.getByTestId("role-config")).toBeInTheDocument();
  });

  it("confirms harmlessly when there is no draft behind the modal", async () => {
    renderPage();
    await loaded();
    await startEdit({ id: "r-1", roleName: "Clinician" });
    config.props.onSubmit(undefined);
    await screen.findByRole("dialog");
    confirm();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(roleApi.UpdateRole).not.toHaveBeenCalled();
  });

  it("reports a refused update and leaves the form up", async () => {
    roleApi.UpdateRole.mockRejectedValue(new Error("Conflict"));
    await beginEdit();
    confirm();
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Conflict", "error")
    );
    expect(screen.getByTestId("role-config")).toBeInTheDocument();
  });
});
