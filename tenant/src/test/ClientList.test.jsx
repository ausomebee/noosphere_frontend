import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The client list: one fetch, a row transform, a permission-gated dropdown per
 * row, and an add/edit modal whose submissions are turned into either a create
 * or an update payload.
 *
 * Both the table and the modal are probes. The table probe records the props it
 * was handed and renders a button per dropdown item per row, which is what lets
 * the row actions be driven through the DOM while the date filter's predicate
 * is called directly on both arms. The modal probe is how a submission is
 * pushed back into the page: `handleSubmitClient` has no catch of its own (a
 * failure is deliberately left to propagate so the modal can stay open), so the
 * failure test awaits the rejected promise itself.
 *
 * Permissions come from a real store: an empty `roleModuleAccesses` array is
 * the org-owner case and grants everything, so restricted roles pass an
 * explicit list.
 */

const clientApi = vi.hoisted(() => ({
  GetAllTenantsClient: vi.fn(),
  UpdateActiveClient: vi.fn(),
}));
vi.mock("../api/clientPanelApis", () => ({ default: clientApi }));

const tenantApi = vi.hoisted(() => ({
  CreateCandidate: vi.fn(),
  UpdateCandidate: vi.fn(),
}));
vi.mock("../api/TenantApis", () => ({ default: tenantApi }));

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
    const items = received.actions[0].items;
    return (
      <div data-testid="table" data-loading={String(received.loading)}>
        {received.data.map((row) => (
          <div key={row.id} data-testid={`row-${row.id}`}>
            <span>{row.name}</span>
            {items.map((item, i) => (
              <button
                key={i}
                className={typeof item.className === "function" ? item.className(row) : ""}
                onClick={() => item.onClick(row)}
              >
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
vi.mock("../Components/ReusableModal/ClientModal/AddClientModal", () => ({
  default: (received) => {
    modal.props = received;
    return received.isOpen ? (
      <div data-testid="client-modal" data-saving={String(received.primaryButtonLoading)} />
    ) : null;
  },
}));

import ClientList from "../Pages/Client/ClientList/ClientList";

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
            ? { roleModuleAccesses: [{ module: "CLIENTS", permissions }] }
            : { roleModuleAccesses: [] },
          ...user,
        },
      },
    },
  });

const renderList = ({ permissions, user } = {}) =>
  render(
    <Provider store={makeStore(permissions, user)}>
      <ClientList />
    </Provider>
  );

// The endpoint returns the client-tenant join row, so the client's own fields
// sit one level down and the join row carries the id, timestamp and active flag.
const record = (over = {}) => ({
  id: "ct-1",
  createdAt: "2026-02-14T08:30:00.000Z",
  active: true,
  client: {
    id: "c-1",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    phoneNumber: "555-0100",
  },
  ...over,
});

const listed = () => waitFor(() => expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false"));

const rowButton = (name) => screen.getByRole("button", { name });

beforeEach(() => {
  vi.clearAllMocks();
  table.props = null;
  modal.props = null;
  clientApi.GetAllTenantsClient.mockResolvedValue({ data: { data: [record()] } });
  clientApi.UpdateActiveClient.mockResolvedValue({});
  tenantApi.CreateCandidate.mockResolvedValue({});
  tenantApi.UpdateCandidate.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("access", () => {
  it("refuses a role that cannot view the client list", async () => {
    renderList({ permissions: ["add_client"] });
    expect(screen.queryByTestId("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add a New Client" })).not.toBeInTheDocument();
    // The guard sits below the effect, so the fetch still runs underneath it.
    await waitFor(() => expect(clientApi.GetAllTenantsClient).toHaveBeenCalled());
  });

  it("hides the add button from a role that may only look", async () => {
    renderList({ permissions: ["view_client_list"] });
    await listed();
    expect(screen.queryByRole("button", { name: "Add a New Client" })).not.toBeInTheDocument();
  });

  it("offers only the row actions the role is granted", async () => {
    renderList({ permissions: ["view_client_list", "view_client_profile"] });
    await listed();
    expect(rowButton("View Client")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Client Information" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Deactivate Client" })).not.toBeInTheDocument();
  });

  it("gives an org owner every action", async () => {
    renderList();
    await listed();
    expect(rowButton("View Client")).toBeInTheDocument();
    expect(rowButton("Edit Client Information")).toBeInTheDocument();
    expect(rowButton("Deactivate Client")).toBeInTheDocument();
  });
});

describe("loading the list", () => {
  it("asks for the tenant's clients and maps each join row", async () => {
    renderList();
    await listed();
    expect(clientApi.GetAllTenantsClient).toHaveBeenCalledWith({
      id: "tenant-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(table.props.data[0]).toMatchObject({
      id: "ct-1",
      clientId: "c-1",
      name: "Ada Lovelace",
      dateAdded: "2026-02-14",
      email: "ada@example.com",
      phone: "555-0100",
      ToggleActive: true,
      hasActions: true,
    });
  });

  it("shows an empty table when the tenant has no clients yet", async () => {
    clientApi.GetAllTenantsClient.mockResolvedValue({ data: { data: null } });
    renderList();
    await listed();
    expect(table.props.data).toEqual([]);
  });

  it("reports a malformed response instead of rendering rows", async () => {
    clientApi.GetAllTenantsClient.mockResolvedValue({});
    renderList();
    await listed();
    expect(toast.showApiError).toHaveBeenCalledWith(expect.any(Error), "LOAD_CLIENTS");
    expect(table.props.data).toEqual([]);
  });

  it("reports a refused fetch", async () => {
    const boom = new Error("500");
    clientApi.GetAllTenantsClient.mockRejectedValue(boom);
    renderList();
    await listed();
    expect(toast.showApiError).toHaveBeenCalledWith(boom, "LOAD_CLIENTS");
  });

  it("never fetches without a tenant, and stops showing the spinner", async () => {
    renderList({ user: { tenantId: undefined } });
    expect(clientApi.GetAllTenantsClient).not.toHaveBeenCalled();
    // The early return leaves `loading` on its initial true.
    expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "true");
  });
});

describe("the date filter", () => {
  it("offers one option per distinct date, newest first", async () => {
    clientApi.GetAllTenantsClient.mockResolvedValue({
      data: {
        data: [
          record({ id: "ct-1", createdAt: "2026-02-14T08:30:00.000Z" }),
          record({ id: "ct-2", createdAt: "2026-03-01T08:30:00.000Z" }),
          record({ id: "ct-3", createdAt: "2026-02-14T22:00:00.000Z" }),
        ],
      },
    });
    renderList();
    await listed();
    expect(table.props.filters[0].filterValues).toEqual([
      { value: "2026-03-01", label: "2026-03-01" },
      { value: "2026-02-14", label: "2026-02-14" },
    ]);
  });

  it("keeps every row when no date is chosen and only matches otherwise", async () => {
    renderList();
    await listed();
    const { filterFunction } = table.props.filters[0];
    const row = table.props.data[0];
    expect(filterFunction(row, "")).toBe(true);
    expect(filterFunction(row, "2026-02-14")).toBe(true);
    expect(filterFunction(row, "2026-01-01")).toBe(false);
  });
});

describe("row actions", () => {
  it("navigates to a client's profile", async () => {
    renderList();
    await listed();
    fireEvent.click(rowButton("View Client"));
    expect(navigate).toHaveBeenCalledWith("/client/view-client/c-1/ct-1");
  });

  it("labels an active client's toggle as deactivate, in red", async () => {
    renderList();
    await listed();
    expect(rowButton("Deactivate Client")).toHaveClass("text-red-600");
  });

  it("labels an inactive client's toggle as activate, in green", async () => {
    clientApi.GetAllTenantsClient.mockResolvedValue({
      data: { data: [record({ active: false })] },
    });
    renderList();
    await listed();
    expect(rowButton("Activate Client")).toHaveClass("text-green-600");
  });

  it("deactivates an active client and reloads the list", async () => {
    renderList();
    await listed();
    fireEvent.click(rowButton("Deactivate Client"));
    await waitFor(() =>
      expect(clientApi.UpdateActiveClient).toHaveBeenCalledWith({
        clientTenantId: "ct-1",
        active: false,
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith("Client deactivated", "success");
    expect(clientApi.GetAllTenantsClient).toHaveBeenCalledTimes(2);
  });

  it("activates an inactive client", async () => {
    clientApi.GetAllTenantsClient.mockResolvedValue({
      data: { data: [record({ active: false })] },
    });
    renderList();
    await listed();
    fireEvent.click(rowButton("Activate Client"));
    await waitFor(() =>
      expect(clientApi.UpdateActiveClient).toHaveBeenCalledWith(
        expect.objectContaining({ active: true })
      )
    );
    expect(toast.showToast).toHaveBeenCalledWith("Client activated", "success");
  });

  it("reports a refused status change without reloading", async () => {
    const boom = new Error("locked");
    clientApi.UpdateActiveClient.mockRejectedValue(boom);
    renderList();
    await listed();
    fireEvent.click(rowButton("Deactivate Client"));
    await waitFor(() =>
      expect(toast.showApiError).toHaveBeenCalledWith(boom, "UPDATE_CLIENT_STATUS")
    );
    expect(clientApi.GetAllTenantsClient).toHaveBeenCalledTimes(1);
  });

  it("also exposes the toggle to the table's own status column", async () => {
    renderList();
    await listed();
    await act(async () => table.props.onToggleActive(table.props.data[0]));
    expect(clientApi.UpdateActiveClient).toHaveBeenCalled();
  });
});

describe("the add and edit modal", () => {
  const openAdd = async () => {
    renderList();
    await listed();
    fireEvent.click(rowButton("Add a New Client"));
    await screen.findByTestId("client-modal");
  };

  const openEdit = async () => {
    renderList();
    await listed();
    fireEvent.click(rowButton("Edit Client Information"));
    await screen.findByTestId("client-modal");
  };

  const submit = (formData) => act(async () => modal.props.onSubmit(formData));

  it("stays closed until the add button is used", async () => {
    renderList();
    await listed();
    expect(screen.queryByTestId("client-modal")).not.toBeInTheDocument();
    expect(modal.props.initialData).toBeNull();
  });

  it("opens with no initial data for a brand new client", async () => {
    await openAdd();
    expect(modal.props.initialData).toBeNull();
  });

  it("opens on the raw join row when editing", async () => {
    await openEdit();
    expect(modal.props.initialData).toMatchObject({ id: "ct-1", client: { id: "c-1" } });
  });

  it("closes itself", async () => {
    await openAdd();
    act(() => modal.props.onClose());
    expect(screen.queryByTestId("client-modal")).not.toBeInTheDocument();
  });

  it("creates a client from a fresh form", async () => {
    await openAdd();
    await submit({ firstName: "Grace", phone: "555-0199", documents: [{ id: "d-1" }] });
    expect(tenantApi.CreateCandidate).toHaveBeenCalledWith({
      firstName: "Grace",
      phone: "555-0199",
      tenantId: "tenant-1",
      createdBy: "user-1",
      phoneNumber: "555-0199",
      clientPortalAccess: true,
      documents: [{ id: "d-1" }],
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("Client created successfully", "success");
    expect(clientApi.GetAllTenantsClient).toHaveBeenCalledTimes(2);
  });

  it("nulls the phone and empties the documents a new client left blank", async () => {
    await openAdd();
    await submit({ firstName: "Grace", phone: "" });
    expect(tenantApi.CreateCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ phoneNumber: null, documents: [] })
    );
  });

  it("updates the client being edited by its nested client id", async () => {
    await openEdit();
    await submit({ firstName: "Ada", phone: "555-0100", documents: [{ id: "d-2" }] });
    expect(tenantApi.UpdateCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "c-1",
        tenantId: "tenant-1",
        phoneNumber: "555-0100",
        documents: [{ id: "d-2" }],
      })
    );
    expect(tenantApi.CreateCandidate).not.toHaveBeenCalled();
    expect(toast.showToast).toHaveBeenCalledWith("Client updated successfully", "success");
  });

  it("nulls the phone and empties the documents an edit left blank", async () => {
    await openEdit();
    await submit({ firstName: "Ada", phone: undefined });
    expect(tenantApi.UpdateCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ phoneNumber: null, documents: [] })
    );
  });

  it("marks the modal as saving while a submission is in flight, then clears it", async () => {
    let release;
    tenantApi.CreateCandidate.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    await openAdd();
    let pending;
    act(() => {
      pending = modal.props.onSubmit({ firstName: "Grace" });
    });
    await waitFor(() =>
      expect(screen.getByTestId("client-modal")).toHaveAttribute("data-saving", "true")
    );
    await act(async () => {
      release({});
      await pending;
    });
    expect(screen.getByTestId("client-modal")).toHaveAttribute("data-saving", "false");
  });

  it("lets a failed save propagate so the modal can stay open", async () => {
    const boom = new Error("duplicate email");
    tenantApi.CreateCandidate.mockRejectedValue(boom);
    await openAdd();
    await expect(
      act(async () => {
        await modal.props.onSubmit({ firstName: "Grace" });
      })
    ).rejects.toThrow("duplicate email");
    expect(toast.showToast).not.toHaveBeenCalled();
    expect(screen.getByTestId("client-modal")).toHaveAttribute("data-saving", "false");
  });
});
