import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The Program Library's target list: the third level of the library drill-down,
 * reached from a program, showing that program's targets in a table with a
 * per-row dropdown that views, edits, duplicates or deletes.
 *
 * Two things shape these tests. First, "View" and "Edit" run the same handler,
 * which re-fetches the whole target by id and then flattens it into the shape
 * the setup modal's form wants -- a mapper stuffed with `|| ""` fallbacks and a
 * prompting-strategy list whose entries may be JSON strings or plain values --
 * so the mapping is asserted through the modal probe's `initialData` rather
 * than through the DOM. Second, the row actions are built from `hasPermission`
 * at render time, so the permission tests seed a role with an explicit
 * `roleModuleAccesses` entry; a user with none at all is the org owner and sees
 * everything.
 *
 * `fetchTargets` swallows its own failure without a toast, on the grounds that
 * an unavailable list is not an error, so the failure test asserts silence.
 */

const api = vi.hoisted(() => ({
  GetProgramsTargetsByProgramId: vi.fn(),
  GetProgramsTargetById: vi.fn(),
  CreateProgramsTarget: vi.fn(),
  editProgramsTarget: vi.fn(),
  DuplicateProgramsTarget: vi.fn(),
  deleteProgramsTarget: vi.fn(),
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
          <div key={row.id} data-testid={`row-${row.id}`}>
            <span>{row.targetName}</span>
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
vi.mock("../Components/ReusableModal/ProgramLibraryModal/AddTargetModal", () => ({
  default: (received) => {
    addModal.props = received;
    return received.isOpen ? (
      <div data-testid="target-modal" data-mode={received.mode} />
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

import TargetLibrary from "../Pages/ProgramLibrary/TargetLibrary";

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
          // An empty roleModuleAccesses means org owner, i.e. full access.
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
      <TargetLibrary
        programId="prog-1"
        programName="Receptive Language"
        domainName="Communication"
        onBack={onBack}
        {...props}
      />
    </Provider>
  );
  return { ...view, onBack };
};

const target = (over = {}) => ({
  id: "t-1",
  name: "Point to picture",
  description: "Learner points to the named picture",
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
  api.GetProgramsTargetsByProgramId.mockResolvedValue({ data: { data: [target()] } });
  api.GetProgramsTargetById.mockResolvedValue({ data: { data: target() } });
  api.CreateProgramsTarget.mockResolvedValue({ data: { message: "Target created" } });
  api.editProgramsTarget.mockResolvedValue({ data: { message: "Target updated" } });
  api.DuplicateProgramsTarget.mockResolvedValue({});
  api.deleteProgramsTarget.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the targets", () => {
  it("asks for the program's targets and maps each into a row", async () => {
    renderLibrary();
    await listed();
    expect(api.GetProgramsTargetsByProgramId).toHaveBeenCalledWith({
      programId: "prog-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(table.props.data).toEqual([
      {
        id: "t-1",
        targetName: "Point to picture",
        targetDescription: "Learner points to the named picture",
        hasActions: true,
      },
    ]);
  });

  it("shows an empty table when the response carries no list", async () => {
    api.GetProgramsTargetsByProgramId.mockResolvedValue({ data: {} });
    renderLibrary();
    await listed();
    expect(table.props.data).toEqual([]);
  });

  it("shows an empty table when the response has no payload at all", async () => {
    api.GetProgramsTargetsByProgramId.mockResolvedValue({});
    renderLibrary();
    await listed();
    expect(table.props.data).toEqual([]);
  });

  it("stays empty and silent when the fetch fails", async () => {
    api.GetProgramsTargetsByProgramId.mockRejectedValue(new Error("500"));
    renderLibrary();
    await listed();
    expect(table.props.data).toEqual([]);
    expect(toast.showToast).not.toHaveBeenCalled();
  });

  it("never fetches without a program and leaves the table spinning", () => {
    renderLibrary({ programId: undefined });
    expect(api.GetProgramsTargetsByProgramId).not.toHaveBeenCalled();
    expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "true");
  });

  it("re-fetches when the program being viewed changes", async () => {
    const { rerender } = renderLibrary();
    await listed();
    rerender(
      <Provider store={makeStore()}>
        <TargetLibrary programId="prog-2" programName="P" domainName="D" onBack={vi.fn()} />
      </Provider>
    );
    await waitFor(() =>
      expect(api.GetProgramsTargetsByProgramId).toHaveBeenCalledWith(
        expect.objectContaining({ programId: "prog-2" })
      )
    );
  });
});

describe("the header", () => {
  it("traces the path down from the library through the domain", async () => {
    renderLibrary();
    await listed();
    expect(screen.getByText("Program Library")).toBeInTheDocument();
    expect(screen.getByText("Communication")).toBeInTheDocument();
    expect(screen.getByText("Receptive Language")).toBeInTheDocument();
  });

  it("goes back up a level from the Back button", async () => {
    const { onBack } = renderLibrary();
    await listed();
    fireEvent.click(button("Back"));
    expect(onBack).toHaveBeenCalled();
  });
});

describe("permissions", () => {
  it("gives an org owner the add button and every row action", async () => {
    renderLibrary();
    await listed();
    expect(button("Add a new Target")).toBeInTheDocument();
    expect(table.props.actions[0].items.map((i) => i.label)).toEqual([
      "View",
      "Edit",
      "Duplicate",
      "Delete",
    ]);
  });

  it("leaves a read-only role with View alone and no add button", async () => {
    renderLibrary({ permissions: ["view_target"] });
    await listed();
    expect(screen.queryByRole("button", { name: "Add a new Target" })).not.toBeInTheDocument();
    expect(table.props.actions[0].items.map((i) => i.label)).toEqual(["View"]);
  });

  it("gives an editor View and Edit but nothing destructive", async () => {
    renderLibrary({ permissions: ["edit_target"] });
    await listed();
    expect(table.props.actions[0].items.map((i) => i.label)).toEqual(["View", "Edit"]);
  });

  it("ties the add button and Duplicate to the same create permission", async () => {
    renderLibrary({ permissions: ["create_target"] });
    await listed();
    expect(button("Add a new Target")).toBeInTheDocument();
    expect(table.props.actions[0].items.map((i) => i.label)).toEqual(["View", "Duplicate"]);
  });

  it("offers Delete on its own to a role that can only delete", async () => {
    renderLibrary({ permissions: ["delete_target"] });
    await listed();
    const items = table.props.actions[0].items;
    expect(items.map((i) => i.label)).toEqual(["View", "Delete"]);
    expect(items[1].className).toBe("remove");
  });
});

describe("opening the setup modal", () => {
  it("opens blank in add mode from the add button", async () => {
    renderLibrary();
    await listed();
    fireEvent.click(button("Add a new Target"));
    expect(await screen.findByTestId("target-modal")).toHaveAttribute("data-mode", "add");
    expect(addModal.props.initialData).toBeNull();
    expect(addModal.props.programId).toBe("prog-1");
  });

  it("closes again on dismissal without clearing the selected row", async () => {
    renderLibrary();
    await listed();
    fireEvent.click(button("Add a new Target"));
    await screen.findByTestId("target-modal");
    act(() => addModal.props.onClose());
    expect(screen.queryByTestId("target-modal")).not.toBeInTheDocument();
  });

  it("fetches the whole target before opening it from View", async () => {
    renderLibrary();
    await listed();
    await act(async () => {
      fireEvent.click(button("View"));
    });
    expect(api.GetProgramsTargetById).toHaveBeenCalledWith({
      Id: "t-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(screen.getByTestId("target-modal")).toHaveAttribute("data-mode", "edit");
  });

  it("opens the same prefilled modal from Edit", async () => {
    renderLibrary();
    await listed();
    await act(async () => {
      fireEvent.click(button("Edit"));
    });
    expect(screen.getByTestId("target-modal")).toHaveAttribute("data-mode", "edit");
  });
});

describe("flattening a fetched target for the form", () => {
  const openEdit = async (full) => {
    api.GetProgramsTargetById.mockResolvedValue({ data: { data: full } });
    renderLibrary();
    await listed();
    await act(async () => {
      fireEvent.click(button("Edit"));
    });
    return addModal.props.initialData;
  };

  it("carries every stored field straight across", async () => {
    const data = await openEdit(
      target({
        sd: "Show me the ball",
        expectedResponse: "Points to ball",
        teachingProcedure: "DTT",
        teachingOthers: "Use edibles",
        numberOfTrials: 10,
        numberOfTasks: 4,
        promptOthers: "Gestural fade",
        dataCollectionType: "percentage",
        taskSteps: ["step one"],
        baselineDataRequired: true,
        masteryMetric: "percentage",
        masteryCriteria: { percent: 80 },
        initialStatus: "active",
        notes: "Watch for scrolling",
        attachment: "file.pdf",
      })
    );
    expect(data).toMatchObject({
      id: "t-1",
      name: "Point to picture",
      sd: "Show me the ball",
      teachingOthers: "Use edibles",
      numberOfTrials: 10,
      numberOfTasks: 4,
      promptOthers: "Gestural fade",
      taskSteps: ["step one"],
      baselineDataRequired: true,
      masteryCriteria: { percent: 80 },
      // The API calls it initialStatus; the form calls it statusAndAdmin.
      statusAndAdmin: "active",
      note: "Watch for scrolling",
      attachment: "file.pdf",
    });
  });

  it("mirrors the trial and task counts into the session fields", async () => {
    const data = await openEdit(target({ numberOfTrials: 12, numberOfTasks: 5 }));
    expect(data.percentageCorrectTrialSession).toBe(12);
    expect(data.trialOrOpportunitiesSession).toBe(5);
  });

  it("blanks and empties everything the stored target left unset", async () => {
    const data = await openEdit(target());
    expect(data).toMatchObject({
      teachingOthers: "",
      numberOfTrials: "",
      numberOfTasks: "",
      promptOthers: "",
      percentageCorrectTrialSession: "",
      trialOrOpportunitiesSession: "",
      note: "",
    });
    expect(data.promptingStrategy).toEqual([]);
    expect(data.taskSteps).toEqual([]);
    expect(data.masteryCriteria).toEqual({});
    expect(data.attachment).toBeNull();
  });

  it("unwraps prompting strategies that were stored as JSON strings", async () => {
    const data = await openEdit(
      target({
        promptingStrategy: [
          '{"value":"full_physical","label":"Full physical"}',
          // Anything that is not a string is already in its final form.
          { value: "verbal" },
        ],
      })
    );
    expect(data.promptingStrategy).toEqual(["full_physical", { value: "verbal" }]);
  });

  // Documents current behaviour, not intended behaviour: the mapper assumes any
  // string entry is JSON, so a bare key throws out of the row action and the
  // modal never opens. See the note in the final report.
  it("throws instead of opening when a prompting strategy is a bare string", async () => {
    api.GetProgramsTargetById.mockResolvedValue({
      data: { data: target({ promptingStrategy: ["verbal"] }) },
    });
    renderLibrary();
    await listed();
    const edit = table.props.actions[0].items.find((i) => i.label === "Edit");
    await expect(edit.onClick(table.props.data[0])).rejects.toThrow(SyntaxError);
    expect(screen.queryByTestId("target-modal")).not.toBeInTheDocument();
  });
});

describe("saving from the modal", () => {
  const submit = (formData) => act(async () => addModal.props.onSubmit(formData));

  it("creates a target in add mode and reloads the list", async () => {
    renderLibrary();
    await listed();
    fireEvent.click(button("Add a new Target"));
    await submit({ name: "New target" });
    expect(api.CreateProgramsTarget).toHaveBeenCalledWith({
      formData: { name: "New target" },
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(api.editProgramsTarget).not.toHaveBeenCalled();
    expect(toast.showToast).toHaveBeenCalledWith("Target created", "success");
    expect(api.GetProgramsTargetsByProgramId).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("target-modal")).not.toBeInTheDocument();
  });

  it("updates the target instead of creating another one in edit mode", async () => {
    renderLibrary();
    await listed();
    await act(async () => {
      fireEvent.click(button("Edit"));
    });
    await submit({ id: "t-1", name: "Renamed" });
    expect(api.editProgramsTarget).toHaveBeenCalledWith({
      formData: { id: "t-1", name: "Renamed" },
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(api.CreateProgramsTarget).not.toHaveBeenCalled();
    expect(toast.showToast).toHaveBeenCalledWith("Target updated", "success");
  });

  it("reports a refused save and leaves the modal open", async () => {
    api.CreateProgramsTarget.mockRejectedValue(new Error("Name already taken"));
    renderLibrary();
    await listed();
    fireEvent.click(button("Add a new Target"));
    await submit({ name: "Duplicate" });
    expect(toast.showToast).toHaveBeenCalledWith("Name already taken", "error");
    expect(screen.getByTestId("target-modal")).toBeInTheDocument();
  });

  it("falls back to a generic complaint when the failure says nothing", async () => {
    api.CreateProgramsTarget.mockRejectedValue(new Error(""));
    renderLibrary();
    await listed();
    fireEvent.click(button("Add a new Target"));
    await submit({ name: "Anything" });
    expect(toast.showToast).toHaveBeenCalledWith("Failed to save target", "error");
  });
});

describe("duplicating a target", () => {
  const duplicate = () => act(async () => {
    fireEvent.click(button("Duplicate"));
  });

  it("fetches the target and copies it, then reloads", async () => {
    renderLibrary();
    await listed();
    await duplicate();
    expect(api.GetProgramsTargetById).toHaveBeenCalledWith({
      Id: "t-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(api.DuplicateProgramsTarget).toHaveBeenCalledWith({
      id: "t-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("Target duplicated", "success");
    expect(api.GetProgramsTargetsByProgramId).toHaveBeenCalledTimes(2);
  });

  it("reports a refused copy without reloading", async () => {
    api.DuplicateProgramsTarget.mockRejectedValue(new Error("Limit reached"));
    renderLibrary();
    await listed();
    await duplicate();
    expect(toast.showToast).toHaveBeenCalledWith("Limit reached", "error");
    expect(api.GetProgramsTargetsByProgramId).toHaveBeenCalledTimes(1);
  });

  it("reports a failure to read the target back before copying it", async () => {
    api.GetProgramsTargetById.mockRejectedValue(new Error("Not found"));
    renderLibrary();
    await listed();
    await duplicate();
    expect(api.DuplicateProgramsTarget).not.toHaveBeenCalled();
    expect(toast.showToast).toHaveBeenCalledWith("Not found", "error");
  });
});

describe("deleting a target", () => {
  const openDelete = async () => {
    renderLibrary();
    await listed();
    fireEvent.click(button("Delete"));
    await screen.findByTestId("delete-modal");
  };

  it("opens the confirmation on the chosen row", async () => {
    await openDelete();
    expect(deleteModal.props.rowData).toMatchObject({ id: "t-1", targetName: "Point to picture" });
  });

  it("closes the confirmation without deleting anything", async () => {
    await openDelete();
    act(() => deleteModal.props.onClose());
    expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
    expect(api.deleteProgramsTarget).not.toHaveBeenCalled();
  });

  it("deletes on confirmation and reloads the list", async () => {
    await openDelete();
    await act(async () => deleteModal.props.onDelete());
    expect(api.deleteProgramsTarget).toHaveBeenCalledWith({
      id: "t-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("Target deleted", "success");
    expect(api.GetProgramsTargetsByProgramId).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
  });

  it("reports a refused delete and still closes the confirmation", async () => {
    api.deleteProgramsTarget.mockRejectedValue(new Error("Target is in use"));
    await openDelete();
    await act(async () => deleteModal.props.onDelete());
    expect(toast.showToast).toHaveBeenCalledWith("Target is in use", "error");
    expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
    expect(api.GetProgramsTargetsByProgramId).toHaveBeenCalledTimes(1);
  });
});
