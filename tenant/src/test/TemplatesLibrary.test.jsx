import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The Custom Forms template library: one fetch, three permission-gated icon
 * actions per row, and a delete confirmation.
 *
 * Both write actions keep the table in sync locally instead of re-fetching --
 * duplicating appends a row only when the endpoint hands back an id, deleting
 * prunes one -- so the assertions below read the table probe's `data` rather
 * than counting fetches. The delete modal is a probe too, which is the only way
 * to reach `handleDeleteTemplate`'s "nothing selected" guard: the real modal is
 * never mounted open without a row.
 *
 * Actions reach the table as a flat array of icon buttons here, not as a
 * dropdown, so the probe renders one button per action per row.
 */

const api = vi.hoisted(() => ({
  GetTemplatesByTenantId: vi.fn(),
  DuplicateFormByFormId: vi.fn(),
  DeleteFormsByFormId: vi.fn(),
}));
vi.mock("../api/customFormsApi", () => ({ default: api }));

const toast = vi.hoisted(() => ({ showToast: vi.fn(), showApiError: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: (...a) => toast.showApiError(...a),
}));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

const table = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/Table/CustomTable", () => ({
  default: (received) => {
    table.props = received;
    return (
      <div data-testid="table" data-loading={String(received.loading)}>
        {received.data.map((row) => (
          <div key={row.id} data-testid={`row-${row.id}`}>
            <span>{row.name}</span>
            {received.actions.map((action, i) => (
              <button key={i} onClick={() => action.onClick(row)}>
                {`${action.label} ${row.id}`}
              </button>
            ))}
          </div>
        ))}
      </div>
    );
  },
}));

const modal = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/ReusableModal/PipelineModal/DeleteConfirmationModal", () => ({
  default: (received) => {
    modal.props = received;
    return received.isOpen ? (
      <div data-testid="delete-modal" data-deleting={String(received.loading)}>
        {received.message}
      </div>
    ) : null;
  },
}));

import TemplatesLibrary from "../Pages/CustomForms/TemplatesLibrary/TemplatesLibrary";

const makeStore = (permissions, user = {}) =>
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
          tenantId: "tenant-1",
          accessToken: "at",
          refreshToken: "rt",
          role: permissions
            ? { roleModuleAccesses: [{ module: "CUSTOM_FORMS", permissions }] }
            : { roleModuleAccesses: [] },
          ...user,
        },
      },
    },
  });

const renderPage = ({ permissions, user } = {}) =>
  render(
    <Provider store={makeStore(permissions, user)}>
      <TemplatesLibrary />
    </Provider>
  );

const template = (over = {}) => ({ id: "t-1", name: "Intake packet", ...over });

const listed = () =>
  waitFor(() => expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false"));

const button = (name) => screen.getByRole("button", { name });

beforeEach(() => {
  vi.clearAllMocks();
  table.props = null;
  modal.props = null;
  api.GetTemplatesByTenantId.mockResolvedValue({ data: { data: [template()] } });
  api.DuplicateFormByFormId.mockResolvedValue({ data: { id: "t-2" } });
  api.DeleteFormsByFormId.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("access", () => {
  it("refuses a role granted neither template view permission", async () => {
    renderPage({ permissions: ["create_template"] });
    expect(screen.queryByTestId("table")).not.toBeInTheDocument();
    // The guard sits below the effect, so the fetch still runs underneath it.
    await waitFor(() => expect(api.GetTemplatesByTenantId).toHaveBeenCalled());
  });

  it("admits a role holding either view permission on its own", async () => {
    renderPage({ permissions: ["view_template"] });
    await listed();
    expect(screen.getByText("Template Library")).toBeInTheDocument();
  });

  it("leaves a read-only role with no new-template button and no row actions", async () => {
    renderPage({ permissions: ["view_template_list"] });
    await listed();
    expect(screen.queryByRole("button", { name: "New Template" })).not.toBeInTheDocument();
    expect(table.props.actions).toEqual([]);
  });

  it("gives an org owner the new-template button and all three row actions", async () => {
    renderPage();
    await listed();
    expect(button("New Template")).toBeInTheDocument();
    expect(table.props.actions.map((a) => a.label)).toEqual(["Edit", "Duplicate", "Delete"]);
  });

  it("offers only the row action the role is granted", async () => {
    renderPage({ permissions: ["view_template_list", "duplicate_template"] });
    await listed();
    expect(table.props.actions.map((a) => a.label)).toEqual(["Duplicate"]);
  });
});

describe("loading the templates", () => {
  it("asks for the tenant's templates and maps each into a row", async () => {
    renderPage();
    await listed();
    expect(api.GetTemplatesByTenantId).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(table.props.data[0]).toMatchObject({
      id: "t-1",
      name: "Intake packet",
      hasActions: true,
    });
    expect(toast.showToast).not.toHaveBeenCalled();
  });

  it("complains rather than rendering rows when the library is empty", async () => {
    api.GetTemplatesByTenantId.mockResolvedValue({ data: { data: [] } });
    renderPage();
    await listed();
    expect(toast.showToast).toHaveBeenCalledWith("No templates found", "error");
    expect(table.props.data).toEqual([]);
  });

  it("treats a response with no body the same as an empty library", async () => {
    api.GetTemplatesByTenantId.mockResolvedValue({});
    renderPage();
    await listed();
    expect(toast.showToast).toHaveBeenCalledWith("No templates found", "error");
  });

  it("reports a refused fetch", async () => {
    const boom = new Error("500");
    api.GetTemplatesByTenantId.mockRejectedValue(boom);
    renderPage();
    await listed();
    expect(toast.showApiError).toHaveBeenCalledWith(boom, "LOAD_TEMPLATES");
    expect(table.props.data).toEqual([]);
  });

  it("never fetches without a tenant", () => {
    renderPage({ user: { tenantId: undefined } });
    expect(api.GetTemplatesByTenantId).not.toHaveBeenCalled();
    expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "true");
  });
});

describe("navigating", () => {
  it("starts a new template in the form builder", async () => {
    renderPage();
    await listed();
    fireEvent.click(button("New Template"));
    expect(navigate).toHaveBeenCalledWith("/custom-forms/forms/create");
  });

  it("opens an existing template in the form builder", async () => {
    renderPage();
    await listed();
    fireEvent.click(button("Edit t-1"));
    expect(navigate).toHaveBeenCalledWith("/custom-forms/forms/create/t-1");
  });
});

describe("duplicating a template", () => {
  it("appends the copy the endpoint reports, named after the original", async () => {
    renderPage();
    await listed();
    fireEvent.click(button("Duplicate t-1"));
    await waitFor(() =>
      expect(api.DuplicateFormByFormId).toHaveBeenCalledWith({
        formId: "t-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(await screen.findByTestId("row-t-2")).toHaveTextContent("Intake packet (Copy)");
    expect(toast.showToast).toHaveBeenCalledWith("Template duplicated successfully", "success");
  });

  it("still reports success when the endpoint names no new id, without adding a row", async () => {
    api.DuplicateFormByFormId.mockResolvedValue({ data: {} });
    renderPage();
    await listed();
    fireEvent.click(button("Duplicate t-1"));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Template duplicated successfully", "success")
    );
    expect(table.props.data).toHaveLength(1);
  });

  it("reports the reason a copy was refused", async () => {
    api.DuplicateFormByFormId.mockRejectedValue(new Error("name already taken"));
    renderPage();
    await listed();
    fireEvent.click(button("Duplicate t-1"));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("name already taken", "error")
    );
    expect(table.props.data).toHaveLength(1);
  });

  it("falls back to a generic message when the failure carries none", async () => {
    api.DuplicateFormByFormId.mockRejectedValue(new Error(""));
    renderPage();
    await listed();
    fireEvent.click(button("Duplicate t-1"));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to duplicate template", "error")
    );
  });
});

describe("deleting a template", () => {
  const openDelete = async () => {
    renderPage();
    await listed();
    fireEvent.click(button("Delete t-1"));
    await screen.findByTestId("delete-modal");
  };

  it("stays closed with a generic message until a row is chosen", async () => {
    renderPage();
    await listed();
    expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
    expect(modal.props.message).toContain('"this template"');
  });

  it("names the template in the confirmation", async () => {
    await openDelete();
    expect(screen.getByTestId("delete-modal")).toHaveTextContent(
      'Are you sure you want to delete "Intake packet"?'
    );
  });

  it("deletes the template and drops its row", async () => {
    await openDelete();
    await act(async () => modal.props.onConfirm());
    expect(api.DeleteFormsByFormId).toHaveBeenCalledWith({
      formId: "t-1",
      active: "delete",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("Template deleted successfully", "success");
    expect(table.props.data).toEqual([]);
    expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
  });

  it("keeps the row and the confirmation when the delete is refused", async () => {
    api.DeleteFormsByFormId.mockRejectedValue(new Error("in use"));
    await openDelete();
    await act(async () => modal.props.onConfirm());
    expect(toast.showToast).toHaveBeenCalledWith("in use", "error");
    expect(table.props.data).toHaveLength(1);
    expect(screen.getByTestId("delete-modal")).toBeInTheDocument();
    expect(screen.getByTestId("delete-modal")).toHaveAttribute("data-deleting", "false");
  });

  it("falls back to a generic message when the failure carries none", async () => {
    api.DeleteFormsByFormId.mockRejectedValue(new Error(""));
    await openDelete();
    await act(async () => modal.props.onConfirm());
    expect(toast.showToast).toHaveBeenCalledWith("Failed to delete template", "error");
  });

  it("does nothing at all when confirmed with no row selected", async () => {
    renderPage();
    await listed();
    await act(async () => modal.props.onConfirm());
    expect(api.DeleteFormsByFormId).not.toHaveBeenCalled();
  });

  it("dismisses the confirmation without deleting", async () => {
    await openDelete();
    act(() => modal.props.onClose());
    expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
    expect(api.DeleteFormsByFormId).not.toHaveBeenCalled();
  });
});
