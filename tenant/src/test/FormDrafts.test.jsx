import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The Drafts tab of the custom form builder: one fetch on mount, three
 * permission-gated row actions (edit, duplicate, delete) and a delete
 * confirmation whose message is interpolated from the pending row.
 *
 * Both the table and the confirmation modal are probes. The table renders one
 * button per action per row so the actions can be driven through the DOM, and
 * the modal records its props, which is the only way to reach `handleDeleteDraft`'s
 * "nothing selected" guard -- the real modal is never mounted while
 * `rowToDelete` is null, so the guard is unreachable through the UI.
 *
 * The component reports its row count upwards on mount *and* again from a
 * second effect keyed on the array length, so `onCountChange` fires more than
 * once per change; the assertions below look at the last call rather than the
 * call count.
 */

const api = vi.hoisted(() => ({
  GetDraftsByTenantId: vi.fn(),
  DuplicateFormByFormId: vi.fn(),
  DeleteFormsByFormId: vi.fn(),
}));
vi.mock("../api/customFormsApi", () => ({ default: api }));

const settingsApi = vi.hoisted(() => ({ GetGeneralSettingsByTenantId: vi.fn() }));
vi.mock("../api/generalSettingsApi", () => ({ default: settingsApi }));

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
            <span data-testid={`name-${row.id}`}>{row.name}</span>
            <span data-testid={`date-${row.id}`}>{row.dateCreated}</span>
            {received.actions.map((action) => (
              <button key={action.label} onClick={() => action.onClick(row)}>
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

import FormDrafts from "../Pages/CustomForms/Forms/SubFormBuilder/FormDrafts";

const makeStore = (permissions) =>
  configureStore({
    reducer: {
      authentication: authReducer,
      generalSettings: generalSettingsReducer,
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
        },
      },
      // Marked loaded so the date column formats against a known pattern
      // instead of racing the settings fetch.
      generalSettings: {
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12-hour",
        currency: "USD",
        loaded: true,
      },
    },
  });

const renderTab = ({ permissions, onEditDraft } = {}) => {
  const onCountChange = vi.fn();
  const view = render(
    <Provider store={makeStore(permissions)}>
      <FormDrafts onCountChange={onCountChange} onEditDraft={onEditDraft} />
    </Provider>
  );
  return { ...view, onCountChange };
};

const draft = (over = {}) => ({
  id: "d-1",
  name: "Intake draft",
  createdAt: "2024-03-05T10:00:00.000Z",
  ...over,
});

const lastCount = (spy) => spy.mock.calls[spy.mock.calls.length - 1][0];
const click = (label) => fireEvent.click(screen.getByRole("button", { name: label }));

beforeEach(() => {
  vi.clearAllMocks();
  table.props = null;
  modal.props = null;
  api.GetDraftsByTenantId.mockResolvedValue({ data: { data: [draft()] } });
  api.DuplicateFormByFormId.mockResolvedValue({ data: { id: "d-2" } });
  api.DeleteFormsByFormId.mockResolvedValue({});
  settingsApi.GetGeneralSettingsByTenantId.mockResolvedValue({ data: {} });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the drafts", () => {
  it("asks for the tenant's drafts and formats each row", async () => {
    const { onCountChange } = renderTab();
    await waitFor(() =>
      expect(api.GetDraftsByTenantId).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    await waitFor(() => expect(screen.getByTestId("row-d-1")).toBeInTheDocument());
    expect(screen.getByTestId("name-d-1")).toHaveTextContent("Intake draft");
    expect(screen.getByTestId("date-d-1")).toHaveTextContent("03/05/2024");
    expect(table.props.data[0].hasActions).toBe(true);
    expect(lastCount(onCountChange)).toBe(1);
  });

  it("shows the table as loading until the fetch settles", async () => {
    let release;
    api.GetDraftsByTenantId.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    renderTab();
    expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "true");
    await act(async () => {
      release({ data: { data: [] } });
    });
    await waitFor(() =>
      expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false")
    );
  });

  it("reports an empty list when the payload carries no drafts array", async () => {
    api.GetDraftsByTenantId.mockResolvedValue({ data: {} });
    const { onCountChange } = renderTab();
    await waitFor(() => expect(lastCount(onCountChange)).toBe(0));
    expect(table.props.data).toEqual([]);
  });

  it("reports zero and surfaces the error when the fetch fails", async () => {
    const err = new Error("500");
    api.GetDraftsByTenantId.mockRejectedValue(err);
    const { onCountChange } = renderTab();
    await waitFor(() =>
      expect(toast.showApiError).toHaveBeenCalledWith(err, "LOAD_DRAFTS")
    );
    expect(lastCount(onCountChange)).toBe(0);
    expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false");
  });
});

describe("the row actions a role is allowed", () => {
  it("offers all three to a role with unrestricted access", async () => {
    renderTab();
    await waitFor(() => expect(table.props).not.toBeNull());
    expect(table.props.actions.map((a) => a.label)).toEqual([
      "Edit",
      "Duplicate",
      "Delete",
    ]);
  });

  it("offers only edit to a role granted edit alone", async () => {
    renderTab({ permissions: ["edit_form"] });
    await waitFor(() => expect(table.props).not.toBeNull());
    expect(table.props.actions.map((a) => a.label)).toEqual(["Edit"]);
  });

  it("offers only duplicate to a role granted duplicate alone", async () => {
    renderTab({ permissions: ["duplicate_form"] });
    await waitFor(() => expect(table.props).not.toBeNull());
    expect(table.props.actions.map((a) => a.label)).toEqual(["Duplicate"]);
  });

  it("offers only delete to a role granted delete alone", async () => {
    renderTab({ permissions: ["delete_form"] });
    await waitFor(() => expect(table.props).not.toBeNull());
    expect(table.props.actions.map((a) => a.label)).toEqual(["Delete"]);
    expect(table.props.actions[0].className).toBe("remove");
  });

  it("offers none to a role granted something unrelated", async () => {
    renderTab({ permissions: ["view_form"] });
    await waitFor(() => expect(table.props).not.toBeNull());
    expect(table.props.actions).toEqual([]);
  });
});

describe("editing a draft", () => {
  it("routes to the builder and tells the parent to switch tabs", async () => {
    const onEditDraft = vi.fn();
    renderTab({ onEditDraft });
    await waitFor(() => expect(screen.getByTestId("row-d-1")).toBeInTheDocument());
    click("Edit d-1");
    expect(navigate).toHaveBeenCalledWith("/custom-forms/forms/create/d-1");
    expect(onEditDraft).toHaveBeenCalled();
  });

  // The tab is also mounted where the parent has no tab to switch, so the
  // callback is optional and the navigation still has to happen.
  it("routes without a tab-switch callback", async () => {
    renderTab();
    await waitFor(() => expect(screen.getByTestId("row-d-1")).toBeInTheDocument());
    click("Edit d-1");
    expect(navigate).toHaveBeenCalledWith("/custom-forms/forms/create/d-1");
  });
});

describe("duplicating a draft", () => {
  it("appends the copy and bumps the count", async () => {
    const { onCountChange } = renderTab();
    await waitFor(() => expect(screen.getByTestId("row-d-1")).toBeInTheDocument());
    await act(async () => {
      click("Duplicate d-1");
    });
    await waitFor(() => expect(screen.getByTestId("row-d-2")).toBeInTheDocument());
    expect(api.DuplicateFormByFormId).toHaveBeenCalledWith({
      formId: "d-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(screen.getByTestId("name-d-2")).toHaveTextContent("Intake draft (Copy)");
    expect(toast.showToast).toHaveBeenCalledWith("Draft duplicated successfully", "success");
    expect(lastCount(onCountChange)).toBe(2);
  });

  // The endpoint reports success without echoing an id in some deployments;
  // the toast still fires but there is nothing to add to the table.
  it("still reports success when the response carries no new id", async () => {
    api.DuplicateFormByFormId.mockResolvedValue({ data: {} });
    renderTab();
    await waitFor(() => expect(screen.getByTestId("row-d-1")).toBeInTheDocument());
    await act(async () => {
      click("Duplicate d-1");
    });
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Draft duplicated successfully", "success")
    );
    expect(table.props.data).toHaveLength(1);
  });

  it("still reports success when the response is empty altogether", async () => {
    api.DuplicateFormByFormId.mockResolvedValue(undefined);
    renderTab();
    await waitFor(() => expect(screen.getByTestId("row-d-1")).toBeInTheDocument());
    await act(async () => {
      click("Duplicate d-1");
    });
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Draft duplicated successfully", "success")
    );
    expect(table.props.data).toHaveLength(1);
  });

  it("shows the server's own complaint when the duplicate fails", async () => {
    api.DuplicateFormByFormId.mockRejectedValue(new Error("Name already taken"));
    renderTab();
    await waitFor(() => expect(screen.getByTestId("row-d-1")).toBeInTheDocument());
    await act(async () => {
      click("Duplicate d-1");
    });
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Name already taken", "error")
    );
  });

  it("falls back to a generic complaint when the failure has no message", async () => {
    api.DuplicateFormByFormId.mockRejectedValue({});
    renderTab();
    await waitFor(() => expect(screen.getByTestId("row-d-1")).toBeInTheDocument());
    await act(async () => {
      click("Duplicate d-1");
    });
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to duplicate draft", "error")
    );
  });
});

describe("deleting a draft", () => {
  const openConfirm = async () => {
    await waitFor(() => expect(screen.getByTestId("row-d-1")).toBeInTheDocument());
    click("Delete d-1");
    await waitFor(() => expect(screen.getByTestId("delete-modal")).toBeInTheDocument());
  };

  it("stays closed until a row is picked", async () => {
    renderTab();
    await waitFor(() => expect(screen.getByTestId("row-d-1")).toBeInTheDocument());
    expect(screen.queryByTestId("delete-modal")).toBeNull();
    expect(modal.props.message).toContain('"this draft"');
  });

  it("names the pending draft in the confirmation", async () => {
    renderTab();
    await openConfirm();
    expect(screen.getByTestId("delete-modal")).toHaveTextContent(
      'Are you sure you want to delete "Intake draft"?'
    );
  });

  it("falls back to a generic name for a draft saved without one", async () => {
    api.GetDraftsByTenantId.mockResolvedValue({ data: { data: [draft({ name: "" })] } });
    renderTab();
    await waitFor(() => expect(screen.getByTestId("row-d-1")).toBeInTheDocument());
    click("Delete d-1");
    await waitFor(() =>
      expect(screen.getByTestId("delete-modal")).toHaveTextContent('"this draft"')
    );
  });

  it("drops the row, closes and bumps the count down", async () => {
    const { onCountChange } = renderTab();
    await openConfirm();
    await act(async () => {
      modal.props.onConfirm();
    });
    await waitFor(() => expect(screen.queryByTestId("row-d-1")).toBeNull());
    expect(api.DeleteFormsByFormId).toHaveBeenCalledWith({
      formId: "d-1",
      active: "delete",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("Draft deleted successfully", "success");
    expect(screen.queryByTestId("delete-modal")).toBeNull();
    expect(lastCount(onCountChange)).toBe(0);
  });

  it("keeps the row and the modal open when the delete fails", async () => {
    api.DeleteFormsByFormId.mockRejectedValue(new Error("Draft is locked"));
    renderTab();
    await openConfirm();
    await act(async () => {
      modal.props.onConfirm();
    });
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Draft is locked", "error")
    );
    expect(screen.getByTestId("row-d-1")).toBeInTheDocument();
    expect(screen.getByTestId("delete-modal")).toBeInTheDocument();
  });

  it("falls back to a generic complaint when the failure has no message", async () => {
    api.DeleteFormsByFormId.mockRejectedValue({});
    renderTab();
    await openConfirm();
    await act(async () => {
      modal.props.onConfirm();
    });
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to delete draft", "error")
    );
  });

  it("closes without deleting when the confirmation is dismissed", async () => {
    renderTab();
    await openConfirm();
    await act(async () => {
      modal.props.onClose();
    });
    await waitFor(() => expect(screen.queryByTestId("delete-modal")).toBeNull());
    expect(api.DeleteFormsByFormId).not.toHaveBeenCalled();
  });

  // Unreachable through the UI -- the modal is only mounted open with a row --
  // but the handler guards against it, so it is driven off the probe directly.
  it("does nothing if confirmed with no row pending", async () => {
    renderTab();
    await waitFor(() => expect(screen.getByTestId("row-d-1")).toBeInTheDocument());
    await act(async () => {
      modal.props.onConfirm();
    });
    expect(api.DeleteFormsByFormId).not.toHaveBeenCalled();
    expect(modal.props.loading).toBe(false);
  });

  it("marks the confirmation busy while the delete is in flight", async () => {
    let release;
    api.DeleteFormsByFormId.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    renderTab();
    await openConfirm();
    act(() => {
      modal.props.onConfirm();
    });
    await waitFor(() =>
      expect(screen.getByTestId("delete-modal")).toHaveAttribute("data-deleting", "true")
    );
    await act(async () => {
      release({});
    });
    await waitFor(() => expect(screen.queryByTestId("delete-modal")).toBeNull());
  });
});
