import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The Program Library's middle level: the programs inside one domain, plus the
 * drill-down into a program's targets, which replaces the whole panel rather
 * than navigating anywhere.
 *
 * "View" is the only row action that changes the view; everything else opens a
 * modal, so the tests below check the target-library probe's props to prove the
 * right program was drilled into and that coming back clears the selection.
 * The add/edit modal is keyed on the mode and the selected row, so it is
 * remounted rather than updated between opens -- the probe records the props of
 * whichever instance is live.
 *
 * The toast messages all run through the same
 * `e.response?.data?.message || e.message || <fallback>` chain, so each arm is
 * driven with a differently shaped rejection.
 */

const api = vi.hoisted(() => ({
  GetProgramsProgramsByDomainId: vi.fn(),
  CreateProgramsProgram: vi.fn(),
  editProgramsProgram: vi.fn(),
  deleteProgramsProgram: vi.fn(),
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
    return (
      <div data-testid="table" data-loading={String(received.loading)}>
        {received.data.map((row) => (
          <div key={row.id}>
            <span>{row.programName}</span>
            {received.actions[0].items.map((item) => (
              <button key={item.label} onClick={() => item.onClick(row)}>
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    );
  },
}));

const addModal = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/ReusableModal/ProgramLibraryModal/AddProgramModal", () => ({
  default: (received) => {
    addModal.props = received;
    return received.isOpen ? (
      <div data-testid="program-modal" data-mode={received.mode} />
    ) : null;
  },
}));

const deleteModal = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/ReusableModal/ProgramLibraryModal/DeleteLibraryModal", () => ({
  default: (received) => {
    deleteModal.props = received;
    return received.isOpen ? <div data-testid="delete-modal" /> : null;
  },
}));

const targets = vi.hoisted(() => ({ props: null }));
vi.mock("../Pages/ProgramLibrary/TargetLibrary", () => ({
  default: (received) => {
    targets.props = received;
    return <div data-testid="target-library">{received.programName}</div>;
  },
}));

import DomainLibrary from "../Pages/ProgramLibrary/DomainLibrary";

const makeStore = (permissions) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user: {
          id: "u-1",
          tenantId: "tenant-1",
          accessToken: "at",
          refreshToken: "rt",
          // No module entries at all means org owner, i.e. every permission.
          role: permissions
            ? { roleModuleAccesses: [{ module: "PROGRAM_LIBRARY", permissions }] }
            : { roleModuleAccesses: [] },
        },
      },
    },
  });

const renderLibrary = ({ permissions, ...props } = {}) => {
  const onBack = vi.fn();
  const view = render(
    <Provider store={makeStore(permissions)}>
      <DomainLibrary domainId="dom-1" domainName="Communication" onBack={onBack} {...props} />
    </Provider>
  );
  return { ...view, onBack };
};

const program = (over = {}) => ({
  id: "prog-1",
  name: "Receptive Language",
  description: "Following one-step instructions",
  ...over,
});

const listed = () =>
  waitFor(() => expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false"));

const button = (name) => screen.getByRole("button", { name });

beforeEach(() => {
  vi.clearAllMocks();
  table.props = null;
  addModal.props = null;
  deleteModal.props = null;
  targets.props = null;
  api.GetProgramsProgramsByDomainId.mockResolvedValue({ data: { data: [program()] } });
  api.CreateProgramsProgram.mockResolvedValue({ data: { message: "Program created" } });
  api.editProgramsProgram.mockResolvedValue({ data: { message: "Program updated" } });
  api.deleteProgramsProgram.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the programs", () => {
  it("asks for the domain's programs and maps each into a row", async () => {
    renderLibrary();
    await listed();
    expect(api.GetProgramsProgramsByDomainId).toHaveBeenCalledWith({
      domainId: "dom-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(table.props.data).toEqual([
      {
        id: "prog-1",
        programName: "Receptive Language",
        programDescription: "Following one-step instructions",
        hasActions: true,
      },
    ]);
  });

  it("shows an empty table when the response carries no list", async () => {
    api.GetProgramsProgramsByDomainId.mockResolvedValue({ data: {} });
    renderLibrary();
    await listed();
    expect(table.props.data).toEqual([]);
  });

  it("stays empty and silent when the response has no payload at all", async () => {
    api.GetProgramsProgramsByDomainId.mockResolvedValue({});
    renderLibrary();
    await listed();
    expect(table.props.data).toEqual([]);
    expect(toast.showToast).not.toHaveBeenCalled();
  });

  it("stays empty and silent when the fetch fails", async () => {
    api.GetProgramsProgramsByDomainId.mockRejectedValue(new Error("500"));
    renderLibrary();
    await listed();
    expect(table.props.data).toEqual([]);
    expect(toast.showToast).not.toHaveBeenCalled();
  });

  it("never fetches without a domain and leaves the table spinning", () => {
    renderLibrary({ domainId: undefined });
    expect(api.GetProgramsProgramsByDomainId).not.toHaveBeenCalled();
    expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "true");
  });
});

describe("permissions", () => {
  it("gives an org owner the add button and every row action", async () => {
    renderLibrary();
    await listed();
    expect(button("Add a new Program")).toBeInTheDocument();
    expect(table.props.actions[0].items.map((i) => i.label)).toEqual([
      "View",
      "Edit",
      "Duplicate",
      "Delete",
    ]);
  });

  it("leaves a read-only role with View alone", async () => {
    renderLibrary({ permissions: ["view_program"] });
    await listed();
    expect(screen.queryByRole("button", { name: "Add a new Program" })).not.toBeInTheDocument();
    expect(table.props.actions[0].items.map((i) => i.label)).toEqual(["View"]);
  });

  it("honours the library-specific edit and delete keys", async () => {
    renderLibrary({ permissions: ["edit_library_program", "delete_library_program"] });
    await listed();
    const items = table.props.actions[0].items;
    expect(items.map((i) => i.label)).toEqual(["View", "Edit", "Delete"]);
    expect(items[2].className).toBe("remove");
  });

  it("expands a legacy edit_program grant into the library-specific key", async () => {
    // Roles saved before the key split still carry the shared key.
    renderLibrary({ permissions: ["edit_program"] });
    await listed();
    expect(table.props.actions[0].items.map((i) => i.label)).toEqual(["View", "Edit"]);
  });

  it("ties the add button and Duplicate to the same create permission", async () => {
    renderLibrary({ permissions: ["create_program"] });
    await listed();
    expect(button("Add a new Program")).toBeInTheDocument();
    expect(table.props.actions[0].items.map((i) => i.label)).toEqual(["View", "Duplicate"]);
  });
});

describe("drilling into a program", () => {
  it("swaps the whole panel for that program's targets", async () => {
    renderLibrary();
    await listed();
    fireEvent.click(button("View"));
    expect(screen.getByTestId("target-library")).toBeInTheDocument();
    expect(screen.queryByTestId("table")).not.toBeInTheDocument();
    expect(targets.props).toMatchObject({
      programId: "prog-1",
      programName: "Receptive Language",
      domainName: "Communication",
    });
  });

  it("comes back to the program list and forgets the selection", async () => {
    renderLibrary();
    await listed();
    fireEvent.click(button("View"));
    act(() => targets.props.onBack());
    expect(screen.getByTestId("table")).toBeInTheDocument();
    expect(addModal.props.initialData).toBeNull();
  });
});

describe("the header", () => {
  it("traces the path down from the library", async () => {
    renderLibrary();
    await listed();
    expect(screen.getByText("Program Library")).toBeInTheDocument();
    expect(screen.getByText("Communication")).toBeInTheDocument();
  });

  it("goes back up a level from the Back button", async () => {
    const { onBack } = renderLibrary();
    await listed();
    fireEvent.click(button("Back"));
    expect(onBack).toHaveBeenCalled();
  });
});

describe("saving a program", () => {
  const submit = (formData) => act(async () => addModal.props.onSubmit(formData));
  const form = { programName: "Expressive Language", programDescription: "Requesting" };

  it("opens blank in add mode", async () => {
    renderLibrary();
    await listed();
    fireEvent.click(button("Add a new Program"));
    expect(await screen.findByTestId("program-modal")).toHaveAttribute("data-mode", "add");
    expect(addModal.props.initialData).toBeNull();
  });

  it("opens the chosen row in edit mode", async () => {
    renderLibrary();
    await listed();
    fireEvent.click(button("Edit"));
    expect(await screen.findByTestId("program-modal")).toHaveAttribute("data-mode", "edit");
    expect(addModal.props.initialData).toMatchObject({ id: "prog-1" });
  });

  it("clears the selection when the modal is dismissed", async () => {
    renderLibrary();
    await listed();
    fireEvent.click(button("Edit"));
    await screen.findByTestId("program-modal");
    act(() => addModal.props.onClose());
    expect(screen.queryByTestId("program-modal")).not.toBeInTheDocument();
    expect(addModal.props.initialData).toBeNull();
  });

  it("creates a program under the current domain and reloads", async () => {
    renderLibrary();
    await listed();
    fireEvent.click(button("Add a new Program"));
    await submit(form);
    expect(api.CreateProgramsProgram).toHaveBeenCalledWith({
      name: "Expressive Language",
      description: "Requesting",
      domainId: "dom-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("Program created", "success");
    expect(api.GetProgramsProgramsByDomainId).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("program-modal")).not.toBeInTheDocument();
  });

  it("updates the selected program with its id attached", async () => {
    renderLibrary();
    await listed();
    fireEvent.click(button("Edit"));
    await submit(form);
    expect(api.editProgramsProgram).toHaveBeenCalledWith({
      name: "Expressive Language",
      description: "Requesting",
      domainId: "dom-1",
      accessToken: "at",
      refreshToken: "rt",
      id: "prog-1",
    });
    expect(api.CreateProgramsProgram).not.toHaveBeenCalled();
    expect(toast.showToast).toHaveBeenCalledWith("Program updated", "success");
  });

  it("prefers the server's own complaint about a refused save", async () => {
    api.CreateProgramsProgram.mockRejectedValue({
      response: { data: { message: "Name already used in this domain" } },
      message: "Request failed",
    });
    renderLibrary();
    await listed();
    fireEvent.click(button("Add a new Program"));
    await submit(form);
    expect(toast.showToast).toHaveBeenCalledWith("Name already used in this domain", "error");
    expect(screen.getByTestId("program-modal")).toBeInTheDocument();
  });

  it("falls back to the thrown error's message", async () => {
    api.CreateProgramsProgram.mockRejectedValue(new Error("Network Error"));
    renderLibrary();
    await listed();
    fireEvent.click(button("Add a new Program"));
    await submit(form);
    expect(toast.showToast).toHaveBeenCalledWith("Network Error", "error");
  });

  it("falls back to a generic complaint when the failure says nothing", async () => {
    api.CreateProgramsProgram.mockRejectedValue({ response: { data: {} } });
    renderLibrary();
    await listed();
    fireEvent.click(button("Add a new Program"));
    await submit(form);
    expect(toast.showToast).toHaveBeenCalledWith("Operation failed", "error");
  });
});

describe("duplicating a program", () => {
  const duplicate = () => act(async () => {
    fireEvent.click(button("Duplicate"));
  });

  it("creates a copy named after the original and reloads", async () => {
    renderLibrary();
    await listed();
    await duplicate();
    expect(api.CreateProgramsProgram).toHaveBeenCalledWith({
      name: "Receptive Language (Copy)",
      description: "Following one-step instructions",
      domainId: "dom-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("Program duplicated", "success");
    expect(api.GetProgramsProgramsByDomainId).toHaveBeenCalledTimes(2);
  });

  it("reports a refused copy without reloading", async () => {
    api.CreateProgramsProgram.mockRejectedValue(new Error("Limit reached"));
    renderLibrary();
    await listed();
    await duplicate();
    expect(toast.showToast).toHaveBeenCalledWith("Limit reached", "error");
    expect(api.GetProgramsProgramsByDomainId).toHaveBeenCalledTimes(1);
  });
});

describe("deleting a program", () => {
  const openDelete = async () => {
    renderLibrary();
    await listed();
    fireEvent.click(button("Delete"));
    await screen.findByTestId("delete-modal");
  };

  it("opens the confirmation on the chosen row", async () => {
    await openDelete();
    expect(deleteModal.props.rowData).toMatchObject({ id: "prog-1" });
  });

  it("closes the confirmation without deleting anything", async () => {
    await openDelete();
    act(() => deleteModal.props.onClose());
    expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
    expect(api.deleteProgramsProgram).not.toHaveBeenCalled();
  });

  it("deletes on confirmation and reloads the list", async () => {
    await openDelete();
    await act(async () => deleteModal.props.onDelete());
    expect(api.deleteProgramsProgram).toHaveBeenCalledWith({
      id: "prog-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("Program deleted successfully", "success");
    expect(api.GetProgramsProgramsByDomainId).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
  });

  it("prefers the server's own complaint about a refused delete", async () => {
    api.deleteProgramsProgram.mockRejectedValue({
      response: { data: { message: "Program has targets" } },
    });
    await openDelete();
    await act(async () => deleteModal.props.onDelete());
    expect(toast.showToast).toHaveBeenCalledWith("Program has targets", "error");
    expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
  });

  it("falls back to the thrown error's message on a refused delete", async () => {
    await openDelete();
    api.deleteProgramsProgram.mockRejectedValue(new Error("Network Error"));
    await act(async () => deleteModal.props.onDelete());
    expect(toast.showToast).toHaveBeenCalledWith("Network Error", "error");
  });

  it("falls back to a generic complaint when the delete failure says nothing", async () => {
    api.deleteProgramsProgram.mockRejectedValue({});
    await openDelete();
    await act(async () => deleteModal.props.onDelete());
    expect(toast.showToast).toHaveBeenCalledWith("Delete failed", "error");
  });
});
