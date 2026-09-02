import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

/**
 * The Programs tab of the client panel: a table of the programs attached to a
 * client, and a "New" menu offering either an import from the tenant's program
 * library or a custom program typed in by hand. Every row carries a permission-
 * gated dropdown -- view, edit, remove.
 *
 * The table and all three modals are probes here; the tab's own work is the
 * four api calls and the shape of what it hands each modal, so the probes
 * expose their callbacks as buttons and print the props worth asserting on.
 *
 * Note that the remove call is made with `programId` -- the library program's
 * id -- rather than with the client-program link id, which is what the list
 * itself is keyed by; the delete test pins the id that is actually sent.
 */

const auth = vi.hoisted(() => ({
  tenantId: "tenant-1",
  accessToken: "at",
  refreshToken: "rt",
}));
vi.mock("../hooks/useAuth", () => ({ default: () => auth }));

const permissions = vi.hoisted(() => ({ granted: null }));
vi.mock("../hooks/usePermissions", () => ({
  default: () => ({
    hasPermission: (name) =>
      permissions.granted === null || permissions.granted.includes(name),
  }),
}));

const route = vi.hoisted(() => ({ clientId: "client-1" }));
const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
  useParams: () => route,
}));

const api = vi.hoisted(() => ({
  GetClientsProgramByClientId: vi.fn(),
  GetProgramsByTenantId: vi.fn(),
  CreateClientsProgram: vi.fn(),
  EditClientsProgram: vi.fn(),
  deleteClientsProgram: vi.fn(),
  AttachProgramToClient: vi.fn(),
}));
vi.mock("../api/clientPanelApis", () => ({ default: api }));

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
}));

const probes = vi.hoisted(() => ({ props: {} }));

vi.mock("../Components/Table/CustomTable", () => ({
  default: (received) => {
    probes.props.table = received;
    const items = received.actions[0].items;
    return (
      <div data-testid="table">
        {received.loading ? <span data-testid="table-loading" /> : null}
        {received.data.map((row) => (
          <div key={row.id}>{`${row.programName} | ${row.description}`}</div>
        ))}
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => item.onClick(received.data[0])}
          >
            {`row-${item.label}`}
          </button>
        ))}
      </div>
    );
  },
}));

vi.mock("../Components/ReusableModal/ClientModal/ProgramLibraryModal", () => ({
  default: (received) => {
    probes.props.library = received;
    return received.isOpen ? (
      <div data-testid="library-modal">
        {received.loading ? <span data-testid="library-loading" /> : null}
        {received.programs.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => received.onSelectProgram(p.id, p.name)}
          >
            {`import-${p.name} (${p.description})`}
          </button>
        ))}
        <button type="button" onClick={received.onClose}>
          close-library
        </button>
      </div>
    ) : null;
  },
}));

vi.mock("../Components/ReusableModal/ProgramLibraryModal/AddProgramModal", () => ({
  default: (received) => {
    probes.props.add = received;
    return received.isOpen ? (
      <div data-testid="add-modal">
        <span data-testid="add-mode">{received.mode}</span>
        <span data-testid="add-initial">{JSON.stringify(received.initialData)}</span>
        <button
          type="button"
          onClick={() =>
            received.onSubmit({
              programName: "Morning Routine",
              programDescription: "Steps before school",
            })
          }
        >
          submit-program
        </button>
        <button
          type="button"
          onClick={() => received.onSubmit({ programName: "Nameless" })}
        >
          submit-without-description
        </button>
        <button type="button" onClick={received.onClose}>
          close-add
        </button>
      </div>
    ) : null;
  },
}));

vi.mock("../Components/ReusableModal/ProgramLibraryModal/DeleteLibraryModal", () => ({
  default: (received) => {
    probes.props.delete = received;
    return received.isOpen ? (
      <div data-testid="delete-modal">
        <span>{received.title}</span>
        <button type="button" onClick={received.onDelete}>
          confirm-delete
        </button>
        <button type="button" onClick={received.onClose}>
          cancel-delete
        </button>
      </div>
    ) : null;
  },
}));

import ProgramsTab from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/Programs";

const LINKED = [
  {
    id: "link-1",
    program: { id: "prog-1", name: "Morning Routine", description: "Steps before school" },
  },
  { id: "link-2", program: { id: "prog-2", name: "Toileting" } },
];

const LIBRARY = [
  { id: "lib-1", name: "Social Skills", description: "Turn taking" },
  { id: "lib-2", name: "Handwriting" },
];

const renderTab = async (props = {}) => {
  const result = render(<ProgramsTab fullName="Ada Lovelace" {...props} />);
  await act(async () => {});
  return result;
};

const openMenu = () => fireEvent.click(screen.getByText("New"));

const openLibrary = async () => {
  openMenu();
  await act(async () => {
    fireEvent.click(screen.getByText("Program from Library"));
  });
};

const openCustom = () => {
  openMenu();
  fireEvent.click(screen.getByText("Custom Program"));
};

beforeEach(() => {
  vi.clearAllMocks();
  probes.props = {};
  permissions.granted = null;
  route.clientId = "client-1";
  auth.tenantId = "tenant-1";
  api.GetClientsProgramByClientId.mockResolvedValue({ data: { data: LINKED } });
  api.GetProgramsByTenantId.mockResolvedValue({ data: { data: LIBRARY } });
  api.CreateClientsProgram.mockResolvedValue({});
  api.EditClientsProgram.mockResolvedValue({});
  api.deleteClientsProgram.mockResolvedValue({});
  api.AttachProgramToClient.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the client's programs", () => {
  it("lists each attached program with its description", async () => {
    await renderTab();
    expect(api.GetClientsProgramByClientId).toHaveBeenCalledWith({
      id: "client-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(screen.getByText("Morning Routine | Steps before school")).toBeInTheDocument();
  });

  it("dashes out a program that has no description", async () => {
    await renderTab();
    expect(screen.getByText("Toileting | —")).toBeInTheDocument();
  });

  it("shows an empty table when the client has no programs", async () => {
    api.GetClientsProgramByClientId.mockResolvedValue({ data: {} });
    await renderTab();
    expect(probes.props.table.data).toEqual([]);
  });

  it("shows an empty table, and no complaint, when the fetch fails", async () => {
    api.GetClientsProgramByClientId.mockRejectedValue(new Error("boom"));
    await renderTab();
    expect(probes.props.table.data).toEqual([]);
    expect(toast.showToast).not.toHaveBeenCalled();
  });

  it("fetches nothing without a client in the route", async () => {
    route.clientId = undefined;
    await renderTab();
    expect(api.GetClientsProgramByClientId).not.toHaveBeenCalled();
  });

  it("tells the table it is loading until the programs arrive", async () => {
    let release;
    api.GetClientsProgramByClientId.mockReturnValue(new Promise((r) => (release = r)));
    render(<ProgramsTab fullName="Ada Lovelace" />);
    expect(screen.getByTestId("table-loading")).toBeInTheDocument();

    await act(async () => {
      release({ data: { data: [] } });
    });
    expect(screen.queryByTestId("table-loading")).toBeNull();
  });
});

describe("the New menu", () => {
  it("opens and closes from the button", async () => {
    await renderTab();
    expect(screen.queryByText("Custom Program")).toBeNull();

    openMenu();
    expect(screen.getByText("Custom Program")).toBeInTheDocument();

    openMenu();
    expect(screen.queryByText("Custom Program")).toBeNull();
  });

  it("is not offered at all without permission to add a program", async () => {
    permissions.granted = [];
    await renderTab();
    expect(screen.queryByText("New")).toBeNull();
  });

  it("closes itself once a choice is made", async () => {
    await renderTab();
    openCustom();
    expect(screen.queryByText("Custom Program")).toBeNull();
    expect(screen.getByTestId("add-modal")).toBeInTheDocument();
  });
});

describe("importing from the library", () => {
  it("fetches the tenant's library and opens the picker", async () => {
    await renderTab();
    await openLibrary();

    expect(api.GetProgramsByTenantId).toHaveBeenCalledWith({
      id: "tenant-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(screen.getByText("import-Social Skills (Turn taking)")).toBeInTheDocument();
  });

  it("stands in for a library program with no description", async () => {
    await renderTab();
    await openLibrary();
    expect(screen.getByText("import-Handwriting (No description)")).toBeInTheDocument();
  });

  it("opens the picker empty when the library cannot be read", async () => {
    api.GetProgramsByTenantId.mockRejectedValue(new Error("boom"));
    await renderTab();
    await openLibrary();
    expect(probes.props.library.programs).toEqual([]);
  });

  it("opens the picker empty when the tenant has no library", async () => {
    api.GetProgramsByTenantId.mockResolvedValue({ data: {} });
    await renderTab();
    await openLibrary();
    expect(probes.props.library.programs).toEqual([]);
  });

  it("does not go looking for a library without a tenant", async () => {
    auth.tenantId = "";
    await renderTab();
    await openLibrary();
    expect(api.GetProgramsByTenantId).not.toHaveBeenCalled();
    expect(screen.getByTestId("library-modal")).toBeInTheDocument();
  });

  it("marks the picker as loading while the library is on its way", async () => {
    let release;
    api.GetProgramsByTenantId.mockReturnValue(new Promise((r) => (release = r)));
    await renderTab();
    await openLibrary();
    expect(screen.getByTestId("library-loading")).toBeInTheDocument();

    await act(async () => {
      release({ data: { data: [] } });
    });
    expect(screen.queryByTestId("library-loading")).toBeNull();
  });

  it("attaches the chosen program and reloads the list", async () => {
    await renderTab();
    await openLibrary();
    api.GetClientsProgramByClientId.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByText("import-Social Skills (Turn taking)"));
    });

    expect(api.AttachProgramToClient).toHaveBeenCalledWith({
      clientId: "client-1",
      programId: "lib-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith(
      '"Social Skills" added successfully',
      "success"
    );
    expect(api.GetClientsProgramByClientId).toHaveBeenCalledTimes(1);
  });

  it("complains when the import fails", async () => {
    api.AttachProgramToClient.mockRejectedValue(new Error("Already attached"));
    await renderTab();
    await openLibrary();
    await act(async () => {
      fireEvent.click(screen.getByText("import-Handwriting (No description)"));
    });
    expect(toast.showToast).toHaveBeenCalledWith("Already attached", "error");
  });

  it("falls back to a generic message when the import failure says nothing", async () => {
    api.AttachProgramToClient.mockRejectedValue({});
    await renderTab();
    await openLibrary();
    await act(async () => {
      fireEvent.click(screen.getByText("import-Handwriting (No description)"));
    });
    expect(toast.showToast).toHaveBeenCalledWith("Import failed", "error");
  });

  it("closes the picker again", async () => {
    await renderTab();
    await openLibrary();
    fireEvent.click(screen.getByText("close-library"));
    expect(screen.queryByTestId("library-modal")).toBeNull();
  });
});

describe("adding a custom program", () => {
  it("opens the form empty, in add mode", async () => {
    await renderTab();
    openCustom();
    expect(screen.getByTestId("add-mode")).toHaveTextContent("add");
    expect(screen.getByTestId("add-initial")).toHaveTextContent("{}");
  });

  it("creates the program, reloads the list and closes", async () => {
    await renderTab();
    openCustom();
    api.GetClientsProgramByClientId.mockClear();
    await act(async () => {
      fireEvent.click(screen.getByText("submit-program"));
    });

    expect(api.CreateClientsProgram).toHaveBeenCalledWith({
      name: "Morning Routine",
      description: "Steps before school",
      clientId: "client-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("Program added successfully", "success");
    expect(api.GetClientsProgramByClientId).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("add-modal")).toBeNull();
  });

  it("sends an empty description rather than none at all", async () => {
    await renderTab();
    openCustom();
    await act(async () => {
      fireEvent.click(screen.getByText("submit-without-description"));
    });
    expect(api.CreateClientsProgram).toHaveBeenCalledWith(
      expect.objectContaining({ description: "" })
    );
  });

  it("keeps the form open and shows the server's complaint", async () => {
    api.CreateClientsProgram.mockRejectedValue({
      response: { data: { message: "That name is taken" } },
    });
    await renderTab();
    openCustom();
    await act(async () => {
      fireEvent.click(screen.getByText("submit-program"));
    });

    expect(toast.showToast).toHaveBeenCalledWith("That name is taken", "error");
    expect(screen.getByTestId("add-modal")).toBeInTheDocument();
  });

  it("falls back to the error's own message", async () => {
    api.CreateClientsProgram.mockRejectedValue(new Error("Network down"));
    await renderTab();
    openCustom();
    await act(async () => {
      fireEvent.click(screen.getByText("submit-program"));
    });
    expect(toast.showToast).toHaveBeenCalledWith("Network down", "error");
  });

  it("falls back again when the failure has no message at all", async () => {
    api.CreateClientsProgram.mockRejectedValue({});
    await renderTab();
    openCustom();
    await act(async () => {
      fireEvent.click(screen.getByText("submit-program"));
    });
    expect(toast.showToast).toHaveBeenCalledWith("Operation failed", "error");
  });

  it("closes the form from its own close button", async () => {
    await renderTab();
    openCustom();
    fireEvent.click(screen.getByText("close-add"));
    expect(screen.queryByTestId("add-modal")).toBeNull();
  });
});

describe("editing a program from the row menu", () => {
  it("opens the form filled in, in edit mode", async () => {
    await renderTab();
    fireEvent.click(screen.getByText("row-Edit Program"));

    expect(screen.getByTestId("add-mode")).toHaveTextContent("edit");
    expect(JSON.parse(screen.getByTestId("add-initial").textContent)).toEqual({
      id: "link-1",
      programId: "prog-1",
      programName: "Morning Routine",
      programDescription: "Steps before school",
    });
  });

  it("blanks the description of a program that never had one", async () => {
    api.GetClientsProgramByClientId.mockResolvedValue({
      data: { data: [LINKED[1]] },
    });
    await renderTab();
    fireEvent.click(screen.getByText("row-Edit Program"));
    expect(JSON.parse(screen.getByTestId("add-initial").textContent).programDescription).toBe(
      ""
    );
  });

  it("updates the program against its library id", async () => {
    await renderTab();
    fireEvent.click(screen.getByText("row-Edit Program"));
    await act(async () => {
      fireEvent.click(screen.getByText("submit-program"));
    });

    expect(api.EditClientsProgram).toHaveBeenCalledWith({
      id: "prog-1",
      name: "Morning Routine",
      description: "Steps before school",
      clientId: "client-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("Program updated successfully", "success");
  });
});

describe("removing a program", () => {
  it("asks first", async () => {
    await renderTab();
    fireEvent.click(screen.getByText("row-Remove Program"));
    expect(screen.getByTestId("delete-modal")).toBeInTheDocument();
    expect(screen.getByText("Remove Program")).toBeInTheDocument();
  });

  it("removes it, says so and reloads the list", async () => {
    await renderTab();
    fireEvent.click(screen.getByText("row-Remove Program"));
    api.GetClientsProgramByClientId.mockClear();
    await act(async () => {
      fireEvent.click(screen.getByText("confirm-delete"));
    });

    expect(api.deleteClientsProgram).toHaveBeenCalledWith({
      id: "prog-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("Program removed successfully", "success");
    await waitFor(() => expect(api.GetClientsProgramByClientId).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId("delete-modal")).toBeNull();
  });

  it("shows the server's complaint and still closes", async () => {
    api.deleteClientsProgram.mockRejectedValue({
      response: { data: { message: "Program is in use" } },
    });
    await renderTab();
    fireEvent.click(screen.getByText("row-Remove Program"));
    await act(async () => {
      fireEvent.click(screen.getByText("confirm-delete"));
    });

    expect(toast.showToast).toHaveBeenCalledWith("Program is in use", "error");
    expect(screen.queryByTestId("delete-modal")).toBeNull();
  });

  it("falls back to a generic complaint", async () => {
    api.deleteClientsProgram.mockRejectedValue(new Error("boom"));
    await renderTab();
    fireEvent.click(screen.getByText("row-Remove Program"));
    await act(async () => {
      fireEvent.click(screen.getByText("confirm-delete"));
    });
    expect(toast.showToast).toHaveBeenCalledWith("Failed to remove program", "error");
  });

  it("does nothing at all when there is no program to remove", async () => {
    await renderTab();
    fireEvent.click(screen.getByText("row-Remove Program"));
    // Dismissing clears the selection; confirming afterwards has nothing to act
    // on, which is the guard at the top of the confirm handler.
    fireEvent.click(screen.getByText("cancel-delete"));
    await act(async () => {
      probes.props.delete.onDelete();
    });
    expect(api.deleteClientsProgram).not.toHaveBeenCalled();
  });

  it("closes on cancel without removing anything", async () => {
    await renderTab();
    fireEvent.click(screen.getByText("row-Remove Program"));
    fireEvent.click(screen.getByText("cancel-delete"));
    expect(screen.queryByTestId("delete-modal")).toBeNull();
    expect(api.deleteClientsProgram).not.toHaveBeenCalled();
  });
});

describe("the row menu's permissions", () => {
  it("offers all three entries to a user with every permission", async () => {
    await renderTab();
    expect(probes.props.table.actions[0].items.map((i) => i.label)).toEqual([
      "View Program",
      "Edit Program",
      "Remove Program",
    ]);
  });

  it("offers only what the user is allowed to do", async () => {
    permissions.granted = ["add_new_program", "view_program"];
    await renderTab();
    expect(probes.props.table.actions[0].items.map((i) => i.label)).toEqual([
      "View Program",
    ]);
  });

  it("offers nothing at all to a user with no permissions", async () => {
    permissions.granted = [];
    await renderTab();
    expect(probes.props.table.actions[0].items).toEqual([]);
  });

  it("opens a program's targets, carrying the names in the query string", async () => {
    await renderTab();
    fireEvent.click(screen.getByText("row-View Program"));
    expect(navigate).toHaveBeenCalledWith(
      "/client/view-program/client-1/target/prog-1?name=Morning%20Routine&client=Ada%20Lovelace"
    );
  });

  it("copes with a client whose name was never passed down", async () => {
    await renderTab({ fullName: undefined });
    fireEvent.click(screen.getByText("row-View Program"));
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining("&client=undefined"));
  });
});
