import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The Program Library index: two tabs over one domain list, a per-row dropdown,
 * an add/edit modal and a delete confirmation. Choosing View swaps the whole
 * page for the per-domain library rather than opening anything.
 *
 * The tab is not just cosmetic -- it decides the `domainType` sent with every
 * read and write -- so most tests assert on that argument rather than on what
 * the table renders. The drill-down child, both modals and the table are probes
 * that record their props; the modals are also how the two "nothing selected"
 * paths are reached, since neither is ever mounted open without a row.
 */

const api = vi.hoisted(() => ({
  GetProgramsDomainByTenantId: vi.fn(),
  CreateProgramsDomain: vi.fn(),
  editProgramsDomain: vi.fn(),
  deleteProgramsDomain: vi.fn(),
}));
vi.mock("../api/ProgramLibraryApis", () => ({ default: api }));

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
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
            <span>{row.domain}</span>
            {items.map((item, i) => (
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

const probes = vi.hoisted(() => {
  const props = {};
  return { props };
});
vi.mock("../Components/ReusableModal/ProgramLibraryModal/AddDomainModal", () => ({
  default: (received) => {
    probes.props.add = received;
    return received.isOpen ? (
      <div data-testid="add-modal" data-mode={received.mode} data-type={received.type} />
    ) : null;
  },
}));
vi.mock("../Components/ReusableModal/ProgramLibraryModal/DeleteLibraryModal", () => ({
  default: (received) => {
    probes.props.delete = received;
    return received.isOpen ? <div data-testid="delete-modal" /> : null;
  },
}));
vi.mock("../Pages/ProgramLibrary/DomainLibrary", () => ({
  default: (received) => {
    probes.props.library = received;
    return (
      <div data-testid="domain-library">
        <span>{received.domainName}</span>
        <button onClick={received.onBack}>Back to library</button>
      </div>
    );
  },
}));

import ProgramLibrary from "../Pages/ProgramLibrary/ProgramLibrary";

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
            ? { roleModuleAccesses: [{ module: "PROGRAM_LIBRARY", permissions }] }
            : { roleModuleAccesses: [] },
          ...user,
        },
      },
    },
  });

const renderPage = ({ permissions, user } = {}) =>
  render(
    <Provider store={makeStore(permissions, user)}>
      <ProgramLibrary />
    </Provider>
  );

// The endpoint wraps the domain array one level down, inside `data.data`.
const domains = (rows) =>
  api.GetProgramsDomainByTenantId.mockResolvedValue({ data: { data: rows } });

const domain = (over = {}) => ({
  id: "d-1",
  name: "Communication",
  description: "Expressive and receptive language",
  ...over,
});

const listed = () =>
  waitFor(() => expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false"));

const button = (name) => screen.getByRole("button", { name });

const goToBehaviour = async () => {
  fireEvent.click(button("Behaviour Reduction"));
  await waitFor(() =>
    expect(api.GetProgramsDomainByTenantId).toHaveBeenCalledWith(
      expect.objectContaining({ domainType: "BEHAVIOR_REDUCTION" })
    )
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  table.props = null;
  probes.props.add = null;
  probes.props.delete = null;
  probes.props.library = null;
  domains([domain()]);
  api.CreateProgramsDomain.mockResolvedValue({ data: { message: "Domain created" } });
  api.editProgramsDomain.mockResolvedValue({ data: { message: "Domain updated" } });
  api.deleteProgramsDomain.mockResolvedValue({ data: { message: "Domain deleted" } });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("access", () => {
  it("refuses a role granted neither library permission", async () => {
    renderPage({ permissions: ["create_domain"] });
    expect(screen.queryByTestId("table")).not.toBeInTheDocument();
    // The guard sits below the effect, so the fetch still runs underneath it.
    await waitFor(() => expect(api.GetProgramsDomainByTenantId).toHaveBeenCalled());
  });

  it("admits a role holding either library permission on its own", async () => {
    renderPage({ permissions: ["view_program_library"] });
    await listed();
    expect(screen.getByText("Program Library")).toBeInTheDocument();
  });

  it("leaves a read-only role with View alone and no add button", async () => {
    renderPage({ permissions: ["program_library"] });
    await listed();
    expect(screen.queryByRole("button", { name: "Add a new Domain" })).not.toBeInTheDocument();
    expect(button("View")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Duplicate" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("gives an org owner the add button and every row action", async () => {
    renderPage();
    await listed();
    expect(button("Add a new Domain")).toBeInTheDocument();
    expect(button("View")).toBeInTheDocument();
    expect(button("Edit")).toBeInTheDocument();
    expect(button("Duplicate")).toBeInTheDocument();
    expect(button("Delete")).toBeInTheDocument();
  });
});

describe("the two tabs", () => {
  it("opens on skill acquisition and asks for that domain type", async () => {
    renderPage();
    await listed();
    expect(api.GetProgramsDomainByTenantId).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      domainType: "SKILL_ACQUISITION",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(button("Skill Acquisition")).toHaveClass("appointment-sched-view-button-active");
    expect(button("Behaviour Reduction")).toHaveClass("appointment-sched-view-button-inactive");
  });

  it("refetches the other domain type when the tab changes", async () => {
    renderPage();
    await listed();
    await goToBehaviour();
    expect(button("Behaviour Reduction")).toHaveClass("appointment-sched-view-button-active");
    expect(probes.props.add.type).toBe("Behaviour Reduction");
  });

  it("tells the modal which kind of domain it is creating", async () => {
    renderPage();
    await listed();
    expect(probes.props.add.type).toBe("Skill Acquisition");
  });
});

describe("loading the domains", () => {
  it("maps each domain into a row", async () => {
    renderPage();
    await listed();
    expect(table.props.data[0]).toEqual({
      id: "d-1",
      domain: "Communication",
      description: "Expressive and receptive language",
      hasActions: true,
    });
  });

  it("shows an empty table when the response carries no domains", async () => {
    api.GetProgramsDomainByTenantId.mockResolvedValue({ data: {} });
    renderPage();
    await listed();
    expect(table.props.data).toEqual([]);
  });

  it("stays empty and silent when the fetch fails", async () => {
    api.GetProgramsDomainByTenantId.mockRejectedValue(new Error("500"));
    renderPage();
    await listed();
    expect(table.props.data).toEqual([]);
    expect(toast.showToast).not.toHaveBeenCalled();
  });

  it("never fetches without a tenant", () => {
    renderPage({ user: { tenantId: undefined } });
    expect(api.GetProgramsDomainByTenantId).not.toHaveBeenCalled();
    expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "true");
  });
});

describe("drilling into a domain", () => {
  it("replaces the index with the domain's own library", async () => {
    renderPage();
    await listed();
    fireEvent.click(button("View"));
    expect(screen.getByTestId("domain-library")).toBeInTheDocument();
    expect(screen.queryByTestId("table")).not.toBeInTheDocument();
    expect(probes.props.library).toMatchObject({ domainId: "d-1", domainName: "Communication" });
  });

  it("comes back to the index and forgets the domain", async () => {
    renderPage();
    await listed();
    fireEvent.click(button("View"));
    fireEvent.click(button("Back to library"));
    expect(screen.getByTestId("table")).toBeInTheDocument();
    expect(probes.props.add.initialData).toBeNull();
  });
});

describe("duplicating a domain", () => {
  it("creates a copy of the row under the current domain type and reloads", async () => {
    renderPage();
    await listed();
    fireEvent.click(button("Duplicate"));
    await waitFor(() =>
      expect(api.CreateProgramsDomain).toHaveBeenCalledWith({
        name: "Communication (Copy)",
        description: "Expressive and receptive language",
        tenantId: "tenant-1",
        domainType: "SKILL_ACQUISITION",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    await waitFor(() => expect(api.GetProgramsDomainByTenantId).toHaveBeenCalledTimes(2));
    // NOTE: the duplicate action passes (type, message) where every other call
    // site passes (message, type). Asserted as-is rather than as intended.
    expect(toast.showToast).toHaveBeenCalledWith("success", "Domain duplicated");
  });

  it("copies into the behaviour reduction library when that tab is open", async () => {
    renderPage();
    await listed();
    await goToBehaviour();
    fireEvent.click(button("Duplicate"));
    await waitFor(() =>
      expect(api.CreateProgramsDomain).toHaveBeenCalledWith(
        expect.objectContaining({ domainType: "BEHAVIOR_REDUCTION" })
      )
    );
  });

  it("toasts without reloading when the copy is refused", async () => {
    api.CreateProgramsDomain.mockRejectedValue(new Error("name taken"));
    renderPage();
    await listed();
    fireEvent.click(button("Duplicate"));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("error", "name taken")
    );
    expect(api.GetProgramsDomainByTenantId).toHaveBeenCalledTimes(1);
  });
});

describe("adding and editing a domain", () => {
  const form = { domainName: "Play skills", domainDescription: "Independent play" };
  const submit = (data = form) => act(async () => probes.props.add.onSubmit(data));

  it("opens blank in add mode", async () => {
    renderPage();
    await listed();
    fireEvent.click(button("Add a new Domain"));
    expect(await screen.findByTestId("add-modal")).toHaveAttribute("data-mode", "add");
    expect(probes.props.add.initialData).toBeNull();
  });

  it("opens on the chosen row in edit mode", async () => {
    renderPage();
    await listed();
    fireEvent.click(button("Edit"));
    expect(await screen.findByTestId("add-modal")).toHaveAttribute("data-mode", "edit");
    expect(probes.props.add.initialData).toMatchObject({ id: "d-1" });
  });

  it("creates a domain, reports the endpoint's message and reloads", async () => {
    renderPage();
    await listed();
    fireEvent.click(button("Add a new Domain"));
    await submit();
    expect(api.CreateProgramsDomain).toHaveBeenCalledWith({
      name: "Play skills",
      description: "Independent play",
      tenantId: "tenant-1",
      domainType: "SKILL_ACQUISITION",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("Domain created", "success");
    expect(screen.queryByTestId("add-modal")).not.toBeInTheDocument();
    await waitFor(() => expect(api.GetProgramsDomainByTenantId).toHaveBeenCalledTimes(2));
  });

  it("updates the chosen domain instead of creating another one", async () => {
    renderPage();
    await listed();
    fireEvent.click(button("Edit"));
    await submit();
    expect(api.editProgramsDomain).toHaveBeenCalledWith({
      id: "d-1",
      name: "Play skills",
      description: "Independent play",
      domainType: "SKILL_ACQUISITION",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(api.CreateProgramsDomain).not.toHaveBeenCalled();
    expect(toast.showToast).toHaveBeenCalledWith("Domain updated", "success");
  });

  it("reports a refused save and still closes the modal", async () => {
    api.CreateProgramsDomain.mockRejectedValue(new Error("name taken"));
    renderPage();
    await listed();
    fireEvent.click(button("Add a new Domain"));
    await submit();
    expect(toast.showToast).toHaveBeenCalledWith("name taken", "error");
    expect(screen.queryByTestId("add-modal")).not.toBeInTheDocument();
  });

  it("dismisses the modal and forgets the row", async () => {
    renderPage();
    await listed();
    fireEvent.click(button("Edit"));
    await screen.findByTestId("add-modal");
    act(() => probes.props.add.onClose());
    expect(screen.queryByTestId("add-modal")).not.toBeInTheDocument();
    expect(probes.props.add.initialData).toBeNull();
  });
});

describe("deleting a domain", () => {
  const confirm = () => act(async () => probes.props.delete.onDelete());

  it("opens the confirmation on the chosen row", async () => {
    renderPage();
    await listed();
    fireEvent.click(button("Delete"));
    expect(await screen.findByTestId("delete-modal")).toBeInTheDocument();
    expect(probes.props.delete.rowData).toMatchObject({ id: "d-1" });
  });

  it("deletes the domain, reports the endpoint's message and reloads", async () => {
    renderPage();
    await listed();
    fireEvent.click(button("Delete"));
    await confirm();
    expect(api.deleteProgramsDomain).toHaveBeenCalledWith({
      id: "d-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("Domain deleted", "success");
    expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
    await waitFor(() => expect(api.GetProgramsDomainByTenantId).toHaveBeenCalledTimes(2));
  });

  it("reports a refused delete and still closes the confirmation", async () => {
    api.deleteProgramsDomain.mockRejectedValue(new Error("still in use"));
    renderPage();
    await listed();
    fireEvent.click(button("Delete"));
    await confirm();
    expect(toast.showToast).toHaveBeenCalledWith("still in use", "error");
    expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
  });

  it("survives a confirmation raised with no row selected", async () => {
    renderPage();
    await listed();
    await confirm();
    expect(api.deleteProgramsDomain).not.toHaveBeenCalled();
    expect(toast.showToast).toHaveBeenCalledWith(expect.any(String), "error");
  });

  it("dismisses the confirmation without deleting", async () => {
    renderPage();
    await listed();
    fireEvent.click(button("Delete"));
    await screen.findByTestId("delete-modal");
    act(() => probes.props.delete.onClose());
    expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
    expect(api.deleteProgramsDomain).not.toHaveBeenCalled();
  });
});
