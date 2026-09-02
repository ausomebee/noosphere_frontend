import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";
import formBuilderReducer from "../ReduxStore/features/formBuilderSlice";

/**
 * The Custom Forms list: one fetch keyed on a reload counter, a permission-gated
 * dropdown per row, a duplicate action that re-fetches, and a delete
 * confirmation that prunes the row locally instead of re-fetching.
 *
 * The table is a probe -- it records its props and renders a button per dropdown
 * item per row -- so the date filter's predicate can be exercised directly while
 * the actions are still driven through the DOM. The delete modal is a probe too,
 * which is the only way to reach `handleDeleteForm`'s "nothing selected" guard:
 * the real modal is never mounted open without a row.
 *
 * The date column runs through the tenant's configured format, so the store is
 * preloaded with settings already marked loaded.
 */

const api = vi.hoisted(() => ({
  GetFormsByTenantId: vi.fn(),
  DuplicateFormByFormId: vi.fn(),
  DeleteFormsByFormId: vi.fn(),
}));
vi.mock("../api/customFormsApi", () => ({ default: api }));

const settingsApi = vi.hoisted(() => ({ GetGeneralSettingsByTenantId: vi.fn() }));
vi.mock("../api/generalSettingsApi", () => ({ default: settingsApi }));

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
  default: (received) => {
    table.props = received;
    const items = received.actions[0].items;
    return (
      <div data-testid="table" data-loading={String(received.loading)}>
        {received.data.map((row) => (
          <div key={row.id} data-testid={`row-${row.id}`}>
            <span>{row.name}</span>
            {items.map((item, i) => (
              <button key={i} onClick={() => item.onClick(row)}>
                {typeof item.label === "function" ? item.label(row) : item.label}
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

import Forms from "../Pages/CustomForms/Forms/Forms";

const makeStore = (permissions, user = {}) =>
  configureStore({
    reducer: {
      authentication: authReducer,
      generalSettings: generalSettingsReducer,
      formBuilder: formBuilderReducer,
    },
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
      generalSettings: {
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12-hour",
        currency: "USD",
        loaded: true,
      },
    },
  });

const renderPage = ({ permissions, user } = {}) => {
  const store = makeStore(permissions, user);
  const utils = render(
    <Provider store={store}>
      <Forms />
    </Provider>
  );
  return { ...utils, store };
};

const form = (over = {}) => ({
  id: "f-1",
  name: "Intake questionnaire",
  createdAt: "2026-02-14T08:30:00.000Z",
  isDraft: false,
  ...over,
});

const listed = () =>
  waitFor(() => expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false"));

const button = (name) => screen.getByRole("button", { name });

beforeEach(() => {
  vi.clearAllMocks();
  table.props = null;
  modal.props = null;
  api.GetFormsByTenantId.mockResolvedValue({ data: { data: [form()] } });
  api.DuplicateFormByFormId.mockResolvedValue({});
  api.DeleteFormsByFormId.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("access", () => {
  it("refuses a role that cannot view the form list", async () => {
    renderPage({ permissions: ["create_custom_form"] });
    expect(screen.queryByTestId("table")).not.toBeInTheDocument();
    // The guard sits below the effect, so the fetch still runs underneath it.
    await waitFor(() => expect(api.GetFormsByTenantId).toHaveBeenCalled());
  });

  it("hides the create button from a role that may only look", async () => {
    renderPage({ permissions: ["view_form_list"] });
    await listed();
    expect(screen.queryByRole("button", { name: "Create a new form" })).not.toBeInTheDocument();
  });

  it("offers only the row actions the role is granted", async () => {
    renderPage({ permissions: ["view_form_list", "edit_form"] });
    await listed();
    expect(button("Edit Form")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View Responses" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Duplicate" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("gives an org owner every action", async () => {
    renderPage();
    await listed();
    expect(button("View Responses")).toBeInTheDocument();
    expect(button("Edit Form")).toBeInTheDocument();
    expect(button("Duplicate")).toBeInTheDocument();
    expect(button("Delete")).toBeInTheDocument();
  });
});

describe("loading the list", () => {
  it("asks for the tenant's forms and maps each into a row", async () => {
    renderPage();
    await listed();
    expect(api.GetFormsByTenantId).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(table.props.data[0]).toMatchObject({
      id: "f-1",
      name: "Intake questionnaire",
      dateCreated: "02/14/2026",
      isDraft: false,
      hasActions: true,
    });
  });

  it("shows an empty table when the response carries no forms", async () => {
    api.GetFormsByTenantId.mockResolvedValue({});
    renderPage();
    await listed();
    expect(table.props.data).toEqual([]);
  });

  it("stays empty when the fetch fails", async () => {
    api.GetFormsByTenantId.mockRejectedValue(new Error("500"));
    renderPage();
    await listed();
    expect(table.props.data).toEqual([]);
    expect(toast.showToast).not.toHaveBeenCalled();
  });

  it("never fetches without a tenant", () => {
    renderPage({ user: { tenantId: undefined } });
    expect(api.GetFormsByTenantId).not.toHaveBeenCalled();
    expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "true");
  });

  it("labels the delete action the same for a draft as for a published form", async () => {
    api.GetFormsByTenantId.mockResolvedValue({
      data: { data: [form({ id: "f-1", isDraft: true }), form({ id: "f-2", isDraft: false })] },
    });
    renderPage();
    await listed();
    // The label is a function of the row, but both arms return "Delete".
    expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(2);
    expect(table.props.data.map((r) => r.isDraft)).toEqual([true, false]);
  });
});

describe("the date filter", () => {
  it("offers one option per distinct creation date, newest first", async () => {
    api.GetFormsByTenantId.mockResolvedValue({
      data: {
        data: [
          form({ id: "f-1", createdAt: "2026-02-14T08:30:00.000Z" }),
          form({ id: "f-2", createdAt: "2026-03-01T08:30:00.000Z" }),
          form({ id: "f-3", createdAt: "2026-02-14T20:00:00.000Z" }),
        ],
      },
    });
    renderPage();
    await listed();
    expect(table.props.filters[0].filterValues).toEqual([
      { value: "03/01/2026", label: "03/01/2026" },
      { value: "02/14/2026", label: "02/14/2026" },
    ]);
  });

  it("keeps every row when no date is chosen and only matches otherwise", async () => {
    renderPage();
    await listed();
    const { filterFunction } = table.props.filters[0];
    const row = table.props.data[0];
    expect(filterFunction(row, "")).toBe(true);
    expect(filterFunction(row, "02/14/2026")).toBe(true);
    expect(filterFunction(row, "01/01/2026")).toBe(false);
  });
});

describe("navigating", () => {
  it("clears the builder before starting a brand new form", async () => {
    const { store } = renderPage();
    await listed();
    act(() => {
      store.dispatch({ type: "formBuilder/setFormName", payload: "leftover" });
    });
    expect(store.getState().formBuilder.formName).toBe("leftover");
    fireEvent.click(button("Create a new form"));
    expect(navigate).toHaveBeenCalledWith("/custom-forms/forms/create");
    expect(store.getState().formBuilder.formName).toBe("Untitled Form");
  });

  it("opens a form's responses", async () => {
    renderPage();
    await listed();
    fireEvent.click(button("View Responses"));
    expect(navigate).toHaveBeenCalledWith("/custom-forms/forms/responses/f-1");
  });

  it("opens a form in the builder from the Edit action", async () => {
    renderPage();
    await listed();
    fireEvent.click(button("Edit Form"));
    expect(navigate).toHaveBeenCalledWith("/custom-forms/forms/create/f-1");
  });

  it("opens the builder rather than the responses when a row itself is clicked", async () => {
    renderPage();
    await listed();
    act(() => table.props.onActionClick({ id: "f-1" }));
    expect(navigate).toHaveBeenCalledWith("/custom-forms/forms/create/f-1");
  });
});

describe("duplicating a form", () => {
  it("copies the form and reloads the list so the copy appears", async () => {
    renderPage();
    await listed();
    fireEvent.click(button("Duplicate"));
    await waitFor(() =>
      expect(api.DuplicateFormByFormId).toHaveBeenCalledWith({
        formId: "f-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith("Form duplicated", "success");
    await waitFor(() => expect(api.GetFormsByTenantId).toHaveBeenCalledTimes(2));
  });

  it("reports the reason a copy was refused", async () => {
    api.DuplicateFormByFormId.mockRejectedValue(new Error("name already taken"));
    renderPage();
    await listed();
    fireEvent.click(button("Duplicate"));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("name already taken", "error")
    );
    expect(api.GetFormsByTenantId).toHaveBeenCalledTimes(1);
  });

  it("falls back to a generic message when the failure carries none", async () => {
    api.DuplicateFormByFormId.mockRejectedValue(new Error(""));
    renderPage();
    await listed();
    fireEvent.click(button("Duplicate"));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Duplicate failed", "error")
    );
  });
});

describe("deleting a form", () => {
  const openDelete = async () => {
    renderPage();
    await listed();
    fireEvent.click(button("Delete"));
    await screen.findByTestId("delete-modal");
  };

  it("stays closed with a generic message until a row is chosen", async () => {
    renderPage();
    await listed();
    expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
    expect(modal.props.message).toContain('"this form"');
  });

  it("names the form in the confirmation", async () => {
    await openDelete();
    expect(screen.getByTestId("delete-modal")).toHaveTextContent(
      'Are you sure you want to delete "Intake questionnaire"?'
    );
  });

  it("deletes the form and drops the row without re-fetching", async () => {
    await openDelete();
    await act(async () => modal.props.onConfirm());
    expect(api.DeleteFormsByFormId).toHaveBeenCalledWith({
      formId: "f-1",
      active: "delete",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("Form deleted", "success");
    expect(table.props.data).toEqual([]);
    expect(api.GetFormsByTenantId).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
  });

  it("keeps the row and the modal when the delete is refused", async () => {
    api.DeleteFormsByFormId.mockRejectedValue(new Error("in use"));
    await openDelete();
    await act(async () => modal.props.onConfirm());
    expect(toast.showToast).toHaveBeenCalledWith("in use", "error");
    expect(table.props.data).toHaveLength(1);
    expect(screen.getByTestId("delete-modal")).toBeInTheDocument();
  });

  it("falls back to a generic message when the failure carries none", async () => {
    api.DeleteFormsByFormId.mockRejectedValue(new Error(""));
    await openDelete();
    await act(async () => modal.props.onConfirm());
    expect(toast.showToast).toHaveBeenCalledWith("Operation failed", "error");
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
