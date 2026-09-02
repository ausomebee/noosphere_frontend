import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import roleDraftReducer from "../ReduxStore/features/roleDraftSlice";
import { buildBlankPermissions } from "../Data/permissionsConfig";

/**
 * The role editor: a two-tab wizard over the shared `roleDraft` slice. The
 * Basic Settings tab keeps role name, module checkboxes and data access level
 * in local state and only commits them to redux when Next validates; the
 * Permissions tab renders one accordion per committed module out of the static
 * permissions config and writes each checkbox straight to redux.
 *
 * The two tabs therefore disagree on purpose: the module list shown on the
 * Permissions tab comes from the *draft*, not from the local checkboxes, so
 * tests that want a populated Permissions tab preload the slice instead of
 * clicking through Basic Settings. The active tab is remembered by
 * `usePersistedTab` in sessionStorage, which is cleared between tests.
 *
 * Whether Submit appears at all is a permission check whose key depends on the
 * `mode` prop, so the store carries a real `roleModuleAccesses` array -- an
 * empty one is the org-owner case and grants everything.
 */

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

import RoleConfiguration from "../Pages/Organisation/RoleAndPermissions/RoleConfiguration";

const makeStore = ({ draft, permissions } = {}) =>
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
          // An empty accesses array means org owner: every permission granted.
          role: permissions
            ? { roleModuleAccesses: [{ module: "MY_ORGANIZATION", permissions }] }
            : { roleModuleAccesses: [] },
        },
      },
      roleDraft: {
        roleName: "",
        selectedModules: [],
        dataAccessLevel: "",
        permissions: buildBlankPermissions(),
        rawModuleAccesses: [],
        ...draft,
      },
    },
  });

const renderConfig = ({ draft, permissions, ...props } = {}) => {
  const store = makeStore({ draft, permissions });
  const utils = render(
    <Provider store={store}>
      <RoleConfiguration onCancel={vi.fn()} onSubmit={vi.fn()} {...props} />
    </Provider>
  );
  return { ...utils, store };
};

const tab = (name) => screen.getByRole("button", { name });
const roleNameField = () => screen.getByPlaceholderText("Type something");
const moduleBox = (label) =>
  within(screen.getByText(label).closest("label")).getByRole("checkbox");

const pickAccessLevel = async (label) => {
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
  fireEvent.click(await screen.findByText(label));
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("tab switching", () => {
  it("opens on Basic Settings", () => {
    renderConfig();
    expect(tab("Basic Settings")).toHaveClass("role-config-tab-active");
    expect(tab("Permissions")).not.toHaveClass("role-config-tab-active");
    expect(roleNameField()).toBeInTheDocument();
  });

  it("moves to the Permissions tab when its tab is clicked directly", () => {
    renderConfig();
    fireEvent.click(tab("Permissions"));
    expect(screen.getByText("Set permissions for this role")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Type something")).not.toBeInTheDocument();
    expect(tab("Permissions")).toHaveClass("role-config-tab-active");
  });

  it("comes back to Basic Settings from the Previous button", () => {
    renderConfig();
    fireEvent.click(tab("Permissions"));
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(roleNameField()).toBeInTheDocument();
  });

  it("reopens on the tab it was left on", () => {
    const first = renderConfig();
    fireEvent.click(tab("Permissions"));
    first.unmount();
    renderConfig();
    expect(screen.getByText("Set permissions for this role")).toBeInTheDocument();
  });

  it("calls onCancel from both the back arrow and the Cancel button", () => {
    const onCancel = vi.fn();
    renderConfig({ onCancel });
    fireEvent.click(document.body.querySelector(".back-button"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});

describe("basic settings", () => {
  it("starts blank when the draft is empty", () => {
    renderConfig();
    expect(roleNameField()).toHaveValue("");
    expect(moduleBox("Dashboard")).not.toBeChecked();
    expect(screen.getByText("Select")).toBeInTheDocument();
  });

  it("seeds every field from an existing draft", () => {
    renderConfig({
      draft: {
        roleName: "Supervisor",
        selectedModules: ["DASHBOARD"],
        dataAccessLevel: "TEAM",
      },
    });
    expect(roleNameField()).toHaveValue("Supervisor");
    expect(moduleBox("Dashboard")).toBeChecked();
    expect(screen.getByText("Team-level data access")).toBeInTheDocument();
  });

  it("ticks and unticks a module checkbox", () => {
    renderConfig();
    fireEvent.click(moduleBox("Scheduler"));
    expect(moduleBox("Scheduler")).toBeChecked();
    fireEvent.click(moduleBox("Scheduler"));
    expect(moduleBox("Scheduler")).not.toBeChecked();
  });

  it("keeps other modules ticked when one more is added", () => {
    renderConfig();
    fireEvent.click(moduleBox("Scheduler"));
    fireEvent.click(moduleBox("Clients"));
    expect(moduleBox("Scheduler")).toBeChecked();
    expect(moduleBox("Clients")).toBeChecked();
  });
});

describe("advancing from basic settings", () => {
  const fillAndAdvance = async ({ name = "Supervisor", module = "Dashboard", level = "Global data access" } = {}) => {
    const rendered = renderConfig();
    if (name !== null) fireEvent.change(roleNameField(), { target: { value: name } });
    if (module) fireEvent.click(moduleBox(module));
    if (level) await pickAccessLevel(level);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    return rendered;
  };

  it("refuses a blank role name", async () => {
    await fillAndAdvance({ name: "" });
    expect(toast.showToast).toHaveBeenCalledWith("Role name is required", "error");
    expect(roleNameField()).toBeInTheDocument();
  });

  it("treats a name of only spaces as blank", async () => {
    await fillAndAdvance({ name: "   " });
    expect(toast.showToast).toHaveBeenCalledWith("Role name is required", "error");
  });

  it("refuses a role with no module ticked", async () => {
    await fillAndAdvance({ module: null });
    expect(toast.showToast).toHaveBeenCalledWith("Please select at least one module", "error");
  });

  it("refuses a role with no data access level", async () => {
    await fillAndAdvance({ level: null });
    expect(toast.showToast).toHaveBeenCalledWith("Please select a data access level", "error");
  });

  it("commits the trimmed basic settings and moves on", async () => {
    const { store } = await fillAndAdvance({ name: "  Supervisor  " });
    expect(store.getState().roleDraft).toMatchObject({
      roleName: "Supervisor",
      selectedModules: ["DASHBOARD"],
      dataAccessLevel: "GLOBAL",
    });
    expect(screen.getByText("Set permissions for this role")).toBeInTheDocument();
    expect(toast.showToast).not.toHaveBeenCalled();
  });
});

describe("the permissions tab", () => {
  const openPermissions = (over = {}) => {
    const rendered = renderConfig({
      draft: { selectedModules: ["DASHBOARD"], ...over.draft },
      ...over,
    });
    fireEvent.click(tab("Permissions"));
    return rendered;
  };

  const accordionHeader = (label) =>
    screen.getByText(label).closest(".role-accordion-header");

  it("renders one accordion per module in the committed draft", () => {
    openPermissions({ draft: { selectedModules: ["DASHBOARD", "SCHEDULER"] } });
    expect(screen.getByText("DASHBOARD")).toBeInTheDocument();
    expect(screen.getByText("SCHEDULER")).toBeInTheDocument();
  });

  it("renders nothing at all when no module has been committed", () => {
    openPermissions({ draft: { selectedModules: [] } });
    expect(document.body.querySelectorAll(".role-accordion")).toHaveLength(0);
  });

  it("survives a draft whose selectedModules is missing entirely", () => {
    openPermissions({ draft: { selectedModules: undefined } });
    expect(screen.getByText("Set permissions for this role")).toBeInTheDocument();
    expect(document.body.querySelectorAll(".role-accordion")).toHaveLength(0);
  });

  it("skips a module key the permissions config does not know", () => {
    openPermissions({ draft: { selectedModules: ["DASHBOARD", "NOT_A_MODULE"] } });
    expect(document.body.querySelectorAll(".role-accordion")).toHaveLength(1);
  });

  it("keeps an accordion collapsed until its header is clicked, then folds it back", () => {
    openPermissions();
    expect(document.body.querySelector(".role-accordion-body")).toBeNull();
    fireEvent.click(accordionHeader("DASHBOARD"));
    expect(document.body.querySelector(".role-accordion-body")).toBeInTheDocument();
    expect(screen.getByText("View intake pipeline info")).toBeInTheDocument();
    fireEvent.click(accordionHeader("DASHBOARD"));
    expect(document.body.querySelector(".role-accordion-body")).toBeNull();
  });

  it("shows a permission already granted in the draft as ticked", () => {
    openPermissions({
      draft: {
        selectedModules: ["DASHBOARD"],
        permissions: { DASHBOARD: { dashboard: { view_session_information: true } } },
      },
    });
    fireEvent.click(accordionHeader("DASHBOARD"));
    expect(moduleBox("View session information")).toBeChecked();
    expect(moduleBox("View intake pipeline info")).not.toBeChecked();
  });

  it("reads an unticked box off a draft that has no permissions map at all", () => {
    openPermissions({ draft: { selectedModules: ["DASHBOARD"], permissions: {} } });
    fireEvent.click(accordionHeader("DASHBOARD"));
    expect(moduleBox("View session information")).not.toBeChecked();
  });

  it("toggles a single permission into and out of the draft", () => {
    const { store } = openPermissions();
    fireEvent.click(accordionHeader("DASHBOARD"));
    fireEvent.click(moduleBox("View session information"));
    expect(store.getState().roleDraft.permissions.DASHBOARD.dashboard.view_session_information).toBe(
      true
    );
    fireEvent.click(moduleBox("View session information"));
    expect(store.getState().roleDraft.permissions.DASHBOARD.dashboard.view_session_information).toBe(
      false
    );
  });

  it("grants every permission in a subcategory at once", () => {
    const { store } = openPermissions();
    fireEvent.click(accordionHeader("DASHBOARD"));
    fireEvent.click(moduleBox("Grant all permissions"));
    const granted = store.getState().roleDraft.permissions.DASHBOARD.dashboard;
    expect(Object.values(granted).every(Boolean)).toBe(true);
    expect(moduleBox("Grant all permissions")).toBeChecked();
  });

  it("revokes the whole subcategory when everything was already granted", () => {
    const { store } = openPermissions({
      draft: {
        selectedModules: ["DASHBOARD"],
        permissions: {
          DASHBOARD: {
            dashboard: {
              view_intake_pipeline_info: true,
              view_session_information: true,
              view_authorization_information: true,
              view_productivity_information: true,
              view_upcoming_appointments: true,
            },
          },
        },
      },
    });
    fireEvent.click(accordionHeader("DASHBOARD"));
    expect(moduleBox("Grant all permissions")).toBeChecked();
    fireEvent.click(moduleBox("Grant all permissions"));
    const granted = store.getState().roleDraft.permissions.DASHBOARD.dashboard;
    expect(Object.values(granted).some(Boolean)).toBe(false);
  });
});

describe("saving", () => {
  const openPermissions = (props) => {
    const rendered = renderConfig({ draft: { selectedModules: ["DASHBOARD"] }, ...props });
    fireEvent.click(tab("Permissions"));
    return rendered;
  };

  it("hands the whole draft to onSubmit", () => {
    const onSubmit = vi.fn();
    const { store } = openPermissions({ onSubmit });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(onSubmit).toHaveBeenCalledWith(store.getState().roleDraft);
  });

  it("spins the Submit button while the save is in flight", () => {
    openPermissions({ submitting: true });
    expect(screen.getByRole("button", { name: "Loading" })).toBeDisabled();
  });

  it("hides Submit from a role that may not create one", () => {
    openPermissions({ permissions: ["view_roles_list"] });
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeInTheDocument();
  });

  it("checks the create permission in add mode", () => {
    openPermissions({ permissions: ["create_new_role"] });
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  it("checks the edit permission instead when editing an existing role", () => {
    openPermissions({ mode: "edit", permissions: ["edit_a_role"] });
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  it("hides Submit in edit mode from a role that may only create", () => {
    openPermissions({ mode: "edit", permissions: ["create_new_role"] });
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
  });
});
