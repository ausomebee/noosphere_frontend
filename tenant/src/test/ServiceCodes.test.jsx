import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The billing settings' Service Codes panel: a list of CPT codes, a per-row
 * dropdown that edits or flips a code, and one modal that both creates and
 * updates.
 *
 * Two shape conversions run in opposite directions and are the real subject
 * here: reading, a modifiers *object* is flattened into a comma-joined string
 * for the table; writing, the modal's modifiers *array* is folded back into an
 * object keyed `modifier1`, `modifier2`, ... with blank entries dropped, so the
 * indices in that key do not always match the array positions.
 *
 * `actions` reaches the table as a function of the row rather than an array, so
 * the table probe calls it per row. `handleSave` re-throws after toasting so
 * the modal can stay open, which is why the failure test awaits the rejection.
 */

const api = vi.hoisted(() => ({
  GetTenantServiceCodeByTenantId: vi.fn(),
  UpdateServiceCodeActiveness: vi.fn(),
  CreateTenantServiceCode: vi.fn(),
  UpdateTenantServiceCode: vi.fn(),
}));
vi.mock("../api/billingAndPaymentsApi", () => ({ default: api }));

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

const table = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/Table/CustomTable", () => ({
  default: (received) => {
    table.props = received;
    return (
      <div data-testid="table" data-loading={String(received.loading)}>
        {received.data.map((row) => (
          <div key={row.id} data-testid={`row-${row.id}`}>
            <span>{row.serviceCodes}</span>
            {received.actions(row)[0].items.map((item, i) => (
              <button key={i} onClick={() => item.onClick(row)}>
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    );
  },
}));

const modal = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/ReusableModal/BillingAndPaymentModal/AddServiceCodeModal", () => ({
  default: (received) => {
    modal.props = received;
    return received.isOpen ? (
      <div
        data-testid="code-modal"
        data-mode={received.mode}
        data-saving={String(received.loading)}
      />
    ) : null;
  },
}));

import ServiceCodes from "../Pages/BillingAndPayment/Settings/SettingSubs/ServiceCodes";

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
            ? { roleModuleAccesses: [{ module: "BILLINGS_PAYMENTS", permissions }] }
            : { roleModuleAccesses: [] },
          ...user,
        },
      },
    },
  });

const renderPanel = ({ permissions, user } = {}) =>
  render(
    <Provider store={makeStore(permissions, user)}>
      <ServiceCodes />
    </Provider>
  );

// The endpoint returns the codes directly on `data`; `modifiers` is an object
// keyed modifier1..n and soft-deleted rows are still included.
const code = (over = {}) => ({
  id: "sc-1",
  code: "97153",
  description: "Adaptive behavior treatment",
  modifiers: { modifier1: "HN", modifier2: "U1" },
  isActive: true,
  isDeleted: false,
  ...over,
});

const listed = () =>
  waitFor(() => expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false"));

const button = (name) => screen.getByRole("button", { name });

beforeEach(() => {
  vi.clearAllMocks();
  table.props = null;
  modal.props = null;
  api.GetTenantServiceCodeByTenantId.mockResolvedValue({ data: [code()] });
  api.UpdateServiceCodeActiveness.mockResolvedValue({});
  api.CreateTenantServiceCode.mockResolvedValue({ id: "sc-new" });
  api.UpdateTenantServiceCode.mockResolvedValue({ id: "sc-1" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("access", () => {
  it("refuses a role granted neither view permission", async () => {
    renderPanel({ permissions: ["add_service_code"] });
    expect(screen.queryByTestId("table")).not.toBeInTheDocument();
    // The guard sits below the effect, so the fetch still runs underneath it.
    await waitFor(() => expect(api.GetTenantServiceCodeByTenantId).toHaveBeenCalled());
  });

  it("admits a role holding either view permission on its own", async () => {
    renderPanel({ permissions: ["view_service_code"] });
    await listed();
    expect(screen.getByTestId("table")).toBeInTheDocument();
  });

  it("leaves a read-only role with no add button, no row actions and no switch", async () => {
    renderPanel({ permissions: ["view_service_codes_list"] });
    await listed();
    expect(screen.queryByRole("button", { name: "Add a Service Code" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Deactivate" })).not.toBeInTheDocument();
    expect(table.props.onToggleActive).toBeUndefined();
  });

  it("gives an org owner the add button, both row actions and the switch", async () => {
    renderPanel();
    await listed();
    expect(button("Add a Service Code")).toBeInTheDocument();
    expect(button("Edit")).toBeInTheDocument();
    expect(button("Deactivate")).toBeInTheDocument();
    expect(table.props.onToggleActive).toBeTypeOf("function");
  });

  it("gives an editor the row action without the status switch", async () => {
    renderPanel({ permissions: ["view_service_code", "edit_service_code"] });
    await listed();
    expect(button("Edit")).toBeInTheDocument();
    expect(table.props.onToggleActive).toBeUndefined();
  });
});

describe("loading the codes", () => {
  it("asks for the tenant's codes and joins each one's modifiers for display", async () => {
    renderPanel();
    await listed();
    expect(api.GetTenantServiceCodeByTenantId).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(table.props.data[0]).toEqual({
      id: "sc-1",
      serviceCodes: "97153",
      modifiers: "HN, U1",
      description: "Adaptive behavior treatment",
      isActive: true,
      hasActions: true,
    });
  });

  it("reads a code with no modifiers as None", async () => {
    api.GetTenantServiceCodeByTenantId.mockResolvedValue({
      data: [code({ modifiers: null })],
    });
    renderPanel();
    await listed();
    expect(table.props.data[0].modifiers).toBe("None");
  });

  it("hides soft-deleted codes", async () => {
    api.GetTenantServiceCodeByTenantId.mockResolvedValue({
      data: [code(), code({ id: "sc-2", code: "97155", isDeleted: true })],
    });
    renderPanel();
    await listed();
    expect(table.props.data.map((r) => r.id)).toEqual(["sc-1"]);
  });

  it("shows an empty table when the response carries no codes", async () => {
    api.GetTenantServiceCodeByTenantId.mockResolvedValue({});
    renderPanel();
    await listed();
    expect(table.props.data).toEqual([]);
  });

  it("stays empty and silent when the fetch fails", async () => {
    api.GetTenantServiceCodeByTenantId.mockRejectedValue(new Error("500"));
    renderPanel();
    await listed();
    expect(table.props.data).toEqual([]);
    expect(toast.showToast).not.toHaveBeenCalled();
  });

  it("never fetches without a tenant", () => {
    renderPanel({ user: { tenantId: undefined } });
    expect(api.GetTenantServiceCodeByTenantId).not.toHaveBeenCalled();
    expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "true");
  });
});

describe("flipping a code's status", () => {
  it("deactivates an active code and reloads the list", async () => {
    renderPanel();
    await listed();
    fireEvent.click(button("Deactivate"));
    await waitFor(() =>
      expect(api.UpdateServiceCodeActiveness).toHaveBeenCalledWith({
        id: "sc-1",
        isActive: false,
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith(
      "Service code deactivated successfully",
      "success"
    );
    expect(api.GetTenantServiceCodeByTenantId).toHaveBeenCalledTimes(2);
  });

  it("activates an inactive code", async () => {
    api.GetTenantServiceCodeByTenantId.mockResolvedValue({
      data: [code({ isActive: false })],
    });
    renderPanel();
    await listed();
    fireEvent.click(button("Activate"));
    await waitFor(() =>
      expect(api.UpdateServiceCodeActiveness).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true })
      )
    );
    expect(toast.showToast).toHaveBeenCalledWith(
      "Service code activated successfully",
      "success"
    );
  });

  it("reports a refused status change", async () => {
    api.UpdateServiceCodeActiveness.mockRejectedValue(new Error("locked"));
    renderPanel();
    await listed();
    fireEvent.click(button("Deactivate"));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        "Failed to update service code status",
        "error"
      )
    );
  });

  it("flips a code from the table's own status switch too", async () => {
    renderPanel();
    await listed();
    await act(async () => table.props.onToggleActive(table.props.data[0]));
    expect(api.UpdateServiceCodeActiveness).toHaveBeenCalledWith(
      expect.objectContaining({ id: "sc-1", isActive: false })
    );
  });
});

describe("the add and edit modal", () => {
  const openAdd = async () => {
    renderPanel();
    await listed();
    fireEvent.click(button("Add a Service Code"));
    await screen.findByTestId("code-modal");
  };

  const openEdit = async () => {
    renderPanel();
    await listed();
    fireEvent.click(button("Edit"));
    await screen.findByTestId("code-modal");
  };

  it("stays closed in add mode with an empty record until something opens it", async () => {
    renderPanel();
    await listed();
    expect(screen.queryByTestId("code-modal")).not.toBeInTheDocument();
    expect(modal.props.mode).toBe("add");
    expect(modal.props.initialData).toEqual({});
  });

  it("opens blank for a new code", async () => {
    await openAdd();
    expect(screen.getByTestId("code-modal")).toHaveAttribute("data-mode", "add");
    expect(modal.props.initialData).toEqual({});
  });

  it("opens on the chosen row for an edit", async () => {
    await openEdit();
    expect(screen.getByTestId("code-modal")).toHaveAttribute("data-mode", "edit");
    expect(modal.props.initialData).toMatchObject({ id: "sc-1", serviceCodes: "97153" });
  });

  it("forgets the chosen row when dismissed", async () => {
    await openEdit();
    act(() => modal.props.onClose());
    expect(screen.queryByTestId("code-modal")).not.toBeInTheDocument();
    expect(modal.props.mode).toBe("add");
  });
});

describe("saving a code", () => {
  const form = {
    code: "97155",
    description: "Protocol modification",
    status: true,
    modifiers: [{ modifier: "HO" }, { modifier: "U2" }],
  };

  const openAdd = async () => {
    renderPanel();
    await listed();
    fireEvent.click(button("Add a Service Code"));
    await screen.findByTestId("code-modal");
  };

  const save = (data) => act(async () => modal.props.onSave(data));

  it("creates a code and folds the modifier rows into an object", async () => {
    await openAdd();
    await save(form);
    expect(api.CreateTenantServiceCode).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      code: "97155",
      description: "Protocol modification",
      isActive: true,
      modifiers: { modifier1: "HO", modifier2: "U2" },
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("Service code saved successfully", "success");
    expect(api.GetTenantServiceCodeByTenantId).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("code-modal")).not.toBeInTheDocument();
  });

  it("drops blank modifier rows but keeps the surviving ones' original positions", async () => {
    await openAdd();
    await save({ ...form, modifiers: [{ modifier: "" }, { modifier: "U2" }] });
    expect(api.CreateTenantServiceCode).toHaveBeenCalledWith(
      expect.objectContaining({ modifiers: { modifier2: "U2" } })
    );
  });

  it("sends no modifiers at all when every row is blank", async () => {
    await openAdd();
    await save({ ...form, modifiers: [{ modifier: "" }] });
    expect(api.CreateTenantServiceCode).toHaveBeenCalledWith(
      expect.objectContaining({ modifiers: {} })
    );
  });

  it("updates the chosen code instead of creating another one", async () => {
    renderPanel();
    await listed();
    fireEvent.click(button("Edit"));
    await screen.findByTestId("code-modal");
    await save(form);
    expect(api.UpdateTenantServiceCode).toHaveBeenCalledWith(
      expect.objectContaining({ id: "sc-1", code: "97155" })
    );
    expect(api.CreateTenantServiceCode).not.toHaveBeenCalled();
  });

  it("hands the endpoint's response back to the modal", async () => {
    await openAdd();
    let result;
    await act(async () => {
      result = await modal.props.onSave(form);
    });
    expect(result).toEqual({ id: "sc-new" });
  });

  it("reports a refused save and leaves the modal open", async () => {
    api.CreateTenantServiceCode.mockRejectedValue(new Error("duplicate code"));
    await openAdd();
    await expect(
      act(async () => {
        await modal.props.onSave(form);
      })
    ).rejects.toThrow("duplicate code");
    expect(toast.showToast).toHaveBeenCalledWith("Failed to save service code", "error");
    expect(screen.getByTestId("code-modal")).toBeInTheDocument();
  });

  it("marks the modal as saving and disables the add button while in flight", async () => {
    let release;
    api.CreateTenantServiceCode.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    await openAdd();
    let pending;
    act(() => {
      pending = modal.props.onSave(form);
    });
    await waitFor(() =>
      expect(screen.getByTestId("code-modal")).toHaveAttribute("data-saving", "true")
    );
    expect(button("Add a Service Code")).toBeDisabled();
    await act(async () => {
      release({});
      await pending;
    });
    expect(screen.queryByTestId("code-modal")).not.toBeInTheDocument();
  });
});
