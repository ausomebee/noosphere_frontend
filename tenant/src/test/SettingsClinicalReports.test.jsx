import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The Settings > Clinical Reports page: the tenant's report templates in a
 * table, with a permission-gated icon per row action and a hand-rolled delete
 * confirmation (plain divs and inline styles, not ReusableModal).
 *
 * `CustomTable` is a probe. Every row action here is an icon button with no
 * accessible name, so the tests reach them through the recorded `actions` array
 * instead of the DOM -- which is also where the permission gating lives. The
 * delete dialog is left real, since it is part of this file.
 *
 * Note this page is a different ClinicalReports from the client panel tab of the
 * same name, which has its own test file.
 */

const api = vi.hoisted(() => ({
  GetClinicalReportTemplateByTenantId: vi.fn(),
  DeleteClinicalReportTemplate: vi.fn(),
  DuplicateClinicalReportTemplate: vi.fn(),
}));
vi.mock("../api/TemplateAndReportApi", () => ({ default: api }));

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

const table = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/Table/CustomTable", () => ({
  default: (props) => {
    table.props = props;
    return (
      <div data-testid="table" data-loading={String(!!props.loading)}>
        {props.data.map((row) => (
          <div key={row.id} data-testid="row">
            {row.name}
          </div>
        ))}
      </div>
    );
  },
}));

const modal = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/ReusableModal/SettingsModal/CreateNewTemplateModal", () => ({
  default: (props) => {
    modal.props = props;
    return props.isOpen ? <div data-testid="new-template-modal" /> : null;
  },
}));

import ClinicalReports from "../Pages/Settings/SettingsSubs/ClinicalReports";

const template = (over = {}) => ({
  id: "t-1",
  title: "Initial Assessment",
  isDraft: false,
  sections: [{ id: "s-1" }],
  tenantId: "tenant-1",
  ...over,
});

const store = ({ permissions, tenantId = "tenant-1" } = {}) =>
  configureStore({
    reducer: { authentication: authReducer },
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
            ? { roleModuleAccesses: [{ module: "SETTINGS", permissions }] }
            : { roleModuleAccesses: [] },
        },
      },
    },
  });

const renderPage = (opts) =>
  render(
    <Provider store={store(opts)}>
      <ClinicalReports />
    </Provider>
  );

const rows = () => screen.queryAllByTestId("row");
const action = (label) => table.props.actions.find((a) => a.label === label);
const loaded = () =>
  waitFor(() =>
    expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false")
  );

beforeEach(() => {
  vi.clearAllMocks();
  table.props = null;
  modal.props = null;
  api.GetClinicalReportTemplateByTenantId.mockResolvedValue({ data: [template()] });
  api.DeleteClinicalReportTemplate.mockResolvedValue({});
  api.DuplicateClinicalReportTemplate.mockResolvedValue({
    data: { id: "t-2", title: "Initial Assessment (copy)" },
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the templates", () => {
  it("asks for this tenant's templates and lists them", async () => {
    renderPage();
    await loaded();
    expect(api.GetClinicalReportTemplateByTenantId).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(table.props.data[0]).toMatchObject({
      id: "t-1",
      name: "Initial Assessment",
      isDraft: false,
      hasActions: true,
    });
  });

  it("fetches nothing at all until a tenant is known", async () => {
    renderPage({ tenantId: null });
    await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
    expect(api.GetClinicalReportTemplateByTenantId).not.toHaveBeenCalled();
    // The early return skips the `finally`, so the table stays in its loading state.
    expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "true");
  });

  it("falls back through the id, name and draft flag a record leaves out", async () => {
    api.GetClinicalReportTemplateByTenantId.mockResolvedValue({
      data: [{ _id: "mongo-1" }],
    });
    renderPage();
    await loaded();
    expect(table.props.data[0]).toMatchObject({
      id: "mongo-1",
      name: "Untitled Template",
      isDraft: true,
      sections: [],
    });
  });

  it("reads a record's name when it has no title", async () => {
    api.GetClinicalReportTemplateByTenantId.mockResolvedValue({
      data: [{ id: "t-3", name: "Discharge Summary" }],
    });
    renderPage();
    await loaded();
    expect(table.props.data[0].name).toBe("Discharge Summary");
  });

  it("shows nothing when the response is not a list", async () => {
    api.GetClinicalReportTemplateByTenantId.mockResolvedValue({
      data: { message: "no templates" },
    });
    renderPage();
    await loaded();
    expect(rows()).toHaveLength(0);
  });

  it("shows nothing when the response carries no data", async () => {
    api.GetClinicalReportTemplateByTenantId.mockResolvedValue(undefined);
    renderPage();
    await loaded();
    expect(rows()).toHaveLength(0);
  });

  it("shows nothing when the fetch is refused", async () => {
    api.GetClinicalReportTemplateByTenantId.mockRejectedValue(new Error("500"));
    renderPage();
    await loaded();
    expect(rows()).toHaveLength(0);
    expect(console.error).toHaveBeenCalledWith(
      "Error fetching templates:",
      expect.any(Error)
    );
  });
});

describe("creating a template", () => {
  it("opens the naming modal", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: /Create New Template/i }));
    expect(screen.getByTestId("new-template-modal")).toBeInTheDocument();
  });

  it("carries the trimmed name into the builder", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: /Create New Template/i }));
    act(() => modal.props.onStartCreating({ initialTitle: "  Intake Form  " }));
    expect(navigate).toHaveBeenCalledWith("/clinical-report/template-builder", {
      state: {
        mode: "newTemplate",
        initialTitle: "Intake Form",
        tenantId: "tenant-1",
      },
    });
    expect(screen.queryByTestId("new-template-modal")).not.toBeInTheDocument();
  });

  it.each([
    ["a blank name", { initialTitle: "   " }],
    ["no name at all", {}],
  ])("refuses %s", async (_case, payload) => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: /Create New Template/i }));
    act(() => modal.props.onStartCreating(payload));
    expect(toast.showToast).toHaveBeenCalledWith(
      "Please enter a template name",
      "warning"
    );
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByTestId("new-template-modal")).toBeInTheDocument();
  });

  it("closes the naming modal on cancel", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: /Create New Template/i }));
    act(() => modal.props.onClose());
    expect(screen.queryByTestId("new-template-modal")).not.toBeInTheDocument();
  });

  it("hides the create button from a role that may not create", async () => {
    renderPage({ permissions: ["view_clinical_report_templates"] });
    await loaded();
    expect(
      screen.queryByRole("button", { name: /Create New Template/i })
    ).not.toBeInTheDocument();
  });
});

describe("the row actions", () => {
  it("offers all four to a role holding every permission", async () => {
    renderPage();
    await loaded();
    expect(table.props.actions.map((a) => a.label)).toEqual([
      "View",
      "Edit",
      "Duplicate",
      "Delete",
    ]);
  });

  it("keeps only the actions a limited role is granted", async () => {
    renderPage({
      permissions: ["view_clinical_report_templates", "delete_clinical_report_template"],
    });
    await loaded();
    expect(table.props.actions.map((a) => a.label)).toEqual(["View", "Delete"]);
  });

  it("leaves no actions at all for a role granted none of them", async () => {
    renderPage({ permissions: ["view_general_settings"] });
    await loaded();
    expect(table.props.actions).toEqual([]);
  });

  it("opens a template read-only", async () => {
    renderPage();
    await loaded();
    action("View").onClick(table.props.data[0]);
    expect(navigate).toHaveBeenCalledWith("/clinical-report/template-builder", {
      state: {
        id: "t-1",
        mode: "viewTemplate",
        initialTitle: "Initial Assessment",
        sections: [{ id: "s-1" }],
        tenantId: "tenant-1",
      },
    });
  });

  it("opens a template for editing", async () => {
    renderPage();
    await loaded();
    action("Edit").onClick(table.props.data[0]);
    expect(navigate).toHaveBeenCalledWith("/clinical-report/template-builder", {
      state: expect.objectContaining({ id: "t-1", mode: "editTemplate" }),
    });
  });
});

describe("duplicating a template", () => {
  const duplicate = async (row) => {
    renderPage();
    await loaded();
    await act(async () => {
      await action("Duplicate").onClick(row || table.props.data[0]);
    });
  };

  it("adds the copy the server returned to the table", async () => {
    await duplicate();
    expect(api.DuplicateClinicalReportTemplate).toHaveBeenCalledWith({
      Id: "t-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(table.props.data[1]).toMatchObject({
      id: "t-2",
      name: "Initial Assessment (copy)",
      isDraft: true,
      sections: [{ id: "s-1" }],
    });
    expect(toast.showToast).toHaveBeenCalledWith(
      "Template duplicated successfully",
      "success"
    );
  });

  it("reads a response that is not wrapped in a data envelope", async () => {
    api.DuplicateClinicalReportTemplate.mockResolvedValue({
      id: "t-9",
      title: "Bare copy",
    });
    await duplicate();
    expect(table.props.data[1]).toMatchObject({ id: "t-9", name: "Bare copy" });
  });

  it("invents an id and a name when the response says nothing", async () => {
    api.DuplicateClinicalReportTemplate.mockResolvedValue({});
    await duplicate();
    const copy = table.props.data[1];
    expect(copy.name).toBe("Initial Assessment (Copy)");
    expect(copy.id).toMatch(/^\d+$/);
  });

  it("copies an empty section list for a template that has none", async () => {
    api.DuplicateClinicalReportTemplate.mockResolvedValue({});
    await duplicate({ id: "t-1", name: "Sparse", tenantId: "tenant-1" });
    expect(table.props.data[1].sections).toEqual([]);
  });

  it("reports a refused duplicate and adds no row", async () => {
    api.DuplicateClinicalReportTemplate.mockRejectedValue(new Error("409"));
    await duplicate();
    expect(toast.showToast).toHaveBeenCalledWith(
      "Could not duplicate template",
      "error"
    );
    expect(rows()).toHaveLength(1);
  });
});

describe("deleting a template", () => {
  const openDelete = async () => {
    renderPage();
    await loaded();
    act(() => action("Delete").onClick(table.props.data[0]));
    expect(screen.getByText("Confirm Deletion")).toBeInTheDocument();
  };

  it("names the template in the confirmation", async () => {
    await openDelete();
    expect(screen.getByText('"Initial Assessment"')).toBeInTheDocument();
  });

  it("drops the row once the deletion goes through", async () => {
    await openDelete();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(api.DeleteClinicalReportTemplate).toHaveBeenCalledWith({
        Id: "t-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith(
      "Template deleted successfully",
      "success"
    );
    await waitFor(() => expect(rows()).toHaveLength(0));
    expect(screen.queryByText("Confirm Deletion")).not.toBeInTheDocument();
  });

  it("keeps the row and closes the confirmation when the delete is refused", async () => {
    api.DeleteClinicalReportTemplate.mockRejectedValue(new Error("500"));
    await openDelete();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        "Failed to delete template",
        "error"
      )
    );
    expect(rows()).toHaveLength(1);
    expect(screen.queryByText("Confirm Deletion")).not.toBeInTheDocument();
  });

  it("deletes nothing when the confirmation is cancelled", async () => {
    await openDelete();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Confirm Deletion")).not.toBeInTheDocument();
    expect(api.DeleteClinicalReportTemplate).not.toHaveBeenCalled();
    expect(rows()).toHaveLength(1);
  });

  it("paints its buttons on hover and back off again", async () => {
    await openDelete();
    const cancel = screen.getByRole("button", { name: "Cancel" });
    fireEvent.mouseOver(cancel);
    expect(cancel.style.backgroundColor).toBe("rgb(243, 244, 246)");
    fireEvent.mouseOut(cancel);
    expect(cancel.style.backgroundColor).toBe("transparent");

    const confirm = screen.getByRole("button", { name: "Delete" });
    fireEvent.mouseOver(confirm);
    expect(confirm.style.backgroundColor).toBe("rgb(185, 28, 28)");
    fireEvent.mouseOut(confirm);
    expect(confirm.style.backgroundColor).toBe("rgb(220, 38, 38)");
  });
});
