import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

/**
 * TargetLibrary is the innermost screen of the Program Library: the targets
 * belonging to one program, with a breadcrumb back up to the domain, an "Add a
 * new Target" button and a permission-gated row menu of view / edit / duplicate
 * / delete.
 *
 * View and Edit are the same handler, and it does not use the row it was given
 * -- it refetches the whole target by id and reshapes it for the form. That
 * mapper is most of this file's branches, so one fixture is complete and
 * another carries only the fields the API always returns, to exercise every
 * fallback in one pass. A prompting strategy arrives either as a plain value or
 * as a JSON string that has to be parsed, and both are covered.
 *
 * The table and both modals are probes; the row menu is driven through the
 * items the table was handed rather than through a real dropdown.
 */

const auth = vi.hoisted(() => ({ accessToken: "at", refreshToken: "rt" }));
vi.mock("../hooks/useAuth", () => ({ default: () => auth }));

const permissions = vi.hoisted(() => ({ granted: null }));
vi.mock("../hooks/usePermissions", () => ({
  default: () => ({
    hasPermission: (name) =>
      permissions.granted === null || permissions.granted.includes(name),
  }),
}));

const api = vi.hoisted(() => ({
  GetProgramsTargetsByProgramId: vi.fn(),
  GetProgramsTargetById: vi.fn(),
  CreateProgramsTarget: vi.fn(),
  editProgramsTarget: vi.fn(),
  deleteProgramsTarget: vi.fn(),
  DuplicateProgramsTarget: vi.fn(),
}));
vi.mock("../api/ProgramLibraryApis", () => ({ default: api }));

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
}));

const probes = vi.hoisted(() => ({ props: {}, errors: [] }));

vi.mock("../Components/Table/CustomTable", () => ({
  default: (received) => {
    probes.props.table = received;
    return (
      <div data-testid="table">
        {received.loading ? <span data-testid="table-loading" /> : null}
        {received.data.map((row) => (
          <div key={row.id}>{`${row.targetName} | ${row.targetDescription}`}</div>
        ))}
        {received.actions[0].items.map((item) => (
          <button
            key={item.label}
            type="button"
            // Two of these handlers are async and one of them can reject, so
            // the rejection is captured rather than left unhandled.
            onClick={() =>
              Promise.resolve(item.onClick(received.data[0])).catch((e) =>
                probes.errors.push(e)
              )
            }
          >
            {`row-${item.label}`}
          </button>
        ))}
      </div>
    );
  },
}));

vi.mock("../Components/ReusableModal/ProgramLibraryModal/AddTargetModal", () => ({
  default: (received) => {
    probes.props.add = received;
    return received.isOpen ? (
      <div data-testid="add-modal">
        <span data-testid="add-mode">{received.mode}</span>
        <span data-testid="add-program">{received.programId}</span>
        <span data-testid="add-initial">{JSON.stringify(received.initialData)}</span>
        <button type="button" onClick={() => received.onSubmit({ name: "Typed target" })}>
          submit-target
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
        <span data-testid="delete-row">{JSON.stringify(received.rowData)}</span>
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

import TargetLibrary from "../Pages/ProgramLibrary/TargetLibrary";

const TARGETS = [
  { id: "t1", name: "Eye contact", description: "Three seconds" },
  { id: "t2", name: "Greeting", description: "On entry" },
];

const FULL_TARGET = {
  id: "t1",
  name: "Eye contact",
  description: "Three seconds",
  sd: "Look at me",
  expectedResponse: "Eyes on speaker",
  teachingProcedure: "DTT",
  teachingOthers: "Use a mirror",
  // Stored strategies come back either as JSON strings or as plain objects.
  promptingStrategy: ['{"value":"gestural"}', { value: "verbal" }],
  numberOfTrials: 10,
  numberOfTasks: 4,
  promptOthers: "Fade quickly",
  dataCollectionType: "Percentage",
  taskSteps: [{ step: "Sit" }],
  baselineDataRequired: true,
  masteryMetric: "percent",
  masteryCriteria: { value: 80 },
  initialStatus: "active",
  notes: "Morning only",
  attachment: { url: "https://cdn/x.pdf" },
};

// Only the fields the list endpoint guarantees, so every `|| ""` fallback in
// the edit mapper is taken.
const BARE_TARGET = {
  id: "t1",
  name: "Eye contact",
  description: "Three seconds",
  sd: "Look at me",
  expectedResponse: "Eyes on speaker",
  teachingProcedure: "DTT",
  dataCollectionType: "Frequency",
  baselineDataRequired: false,
  masteryMetric: "count",
  initialStatus: "draft",
};

const renderLibrary = async (props = {}) => {
  const result = render(
    <TargetLibrary
      programName="Communication"
      domainName="Language"
      programId="prog-1"
      onBack={vi.fn()}
      {...props}
    />
  );
  await act(async () => {});
  return result;
};

// The view/edit handler awaits a fetch before it opens the modal, so the click
// needs a second flush before the form is in the DOM.
const clickRow = async (label) => {
  await act(async () => {
    fireEvent.click(screen.getByText(`row-${label}`));
  });
  await act(async () => {});
};

const initialData = () => JSON.parse(screen.getByTestId("add-initial").textContent);

beforeEach(() => {
  vi.clearAllMocks();
  probes.props = {};
  probes.errors = [];
  permissions.granted = null;
  api.GetProgramsTargetsByProgramId.mockResolvedValue({ data: { data: TARGETS } });
  api.GetProgramsTargetById.mockResolvedValue({ data: { data: FULL_TARGET } });
  api.CreateProgramsTarget.mockResolvedValue({ data: { message: "Target created" } });
  api.editProgramsTarget.mockResolvedValue({ data: { message: "Target updated" } });
  api.deleteProgramsTarget.mockResolvedValue({});
  api.DuplicateProgramsTarget.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the target list", () => {
  it("shows the breadcrumb it was given", async () => {
    await renderLibrary();
    expect(screen.getByText("Language")).toBeInTheDocument();
    expect(screen.getByText("Communication")).toBeInTheDocument();
  });

  it("goes back up from the Back button", async () => {
    const onBack = vi.fn();
    await renderLibrary({ onBack });
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(onBack).toHaveBeenCalled();
  });

  it("lists the program's targets", async () => {
    await renderLibrary();
    expect(api.GetProgramsTargetsByProgramId).toHaveBeenCalledWith({
      programId: "prog-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(screen.getByText("Eye contact | Three seconds")).toBeInTheDocument();
    expect(screen.getByText("Greeting | On entry")).toBeInTheDocument();
  });

  it("shows an empty table for a program with no targets", async () => {
    api.GetProgramsTargetsByProgramId.mockResolvedValue({ data: {} });
    await renderLibrary();
    expect(probes.props.table.data).toEqual([]);
  });

  it("shows an empty table, and no complaint, when the fetch fails", async () => {
    api.GetProgramsTargetsByProgramId.mockRejectedValue(new Error("boom"));
    await renderLibrary();
    expect(probes.props.table.data).toEqual([]);
    expect(toast.showToast).not.toHaveBeenCalled();
  });

  it("fetches nothing, and stays loading, without a program", async () => {
    await renderLibrary({ programId: undefined });
    expect(api.GetProgramsTargetsByProgramId).not.toHaveBeenCalled();
    expect(screen.getByTestId("table-loading")).toBeInTheDocument();
  });

  it("tells the table it is loading until the targets arrive", async () => {
    let release;
    api.GetProgramsTargetsByProgramId.mockReturnValue(new Promise((r) => (release = r)));
    render(
      <TargetLibrary
        programName="Communication"
        domainName="Language"
        programId="prog-1"
        onBack={vi.fn()}
      />
    );
    expect(screen.getByTestId("table-loading")).toBeInTheDocument();

    await act(async () => {
      release({ data: { data: [] } });
    });
    expect(screen.queryByTestId("table-loading")).toBeNull();
  });
});

describe("adding a target", () => {
  it("opens an empty form in add mode, carrying the program", async () => {
    await renderLibrary();
    fireEvent.click(screen.getByText("Add a new Target"));

    expect(screen.getByTestId("add-mode")).toHaveTextContent("add");
    expect(screen.getByTestId("add-program")).toHaveTextContent("prog-1");
    expect(screen.getByTestId("add-initial").textContent).toBe("null");
  });

  it("is not offered without permission to create one", async () => {
    permissions.granted = [];
    await renderLibrary();
    expect(screen.queryByText("Add a new Target")).toBeNull();
  });

  it("creates the target, reports the server's message and reloads", async () => {
    await renderLibrary();
    fireEvent.click(screen.getByText("Add a new Target"));
    api.GetProgramsTargetsByProgramId.mockClear();
    await act(async () => {
      fireEvent.click(screen.getByText("submit-target"));
    });

    expect(api.CreateProgramsTarget).toHaveBeenCalledWith({
      formData: { name: "Typed target" },
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("Target created", "success");
    expect(api.GetProgramsTargetsByProgramId).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("add-modal")).toBeNull();
  });

  it("keeps the form open and complains when the save fails", async () => {
    api.CreateProgramsTarget.mockRejectedValue(new Error("Name already used"));
    await renderLibrary();
    fireEvent.click(screen.getByText("Add a new Target"));
    await act(async () => {
      fireEvent.click(screen.getByText("submit-target"));
    });

    expect(toast.showToast).toHaveBeenCalledWith("Name already used", "error");
    expect(screen.getByTestId("add-modal")).toBeInTheDocument();
  });

  it("falls back to a generic complaint when the failure says nothing", async () => {
    api.CreateProgramsTarget.mockRejectedValue({});
    await renderLibrary();
    fireEvent.click(screen.getByText("Add a new Target"));
    await act(async () => {
      fireEvent.click(screen.getByText("submit-target"));
    });
    expect(toast.showToast).toHaveBeenCalledWith("Failed to save target", "error");
  });

  it("closes the form from its own close button", async () => {
    await renderLibrary();
    fireEvent.click(screen.getByText("Add a new Target"));
    fireEvent.click(screen.getByText("close-add"));
    expect(screen.queryByTestId("add-modal")).toBeNull();
  });
});

describe("opening an existing target", () => {
  it("refetches the whole target and fills the form from it", async () => {
    await renderLibrary();
    await clickRow("Edit");

    expect(api.GetProgramsTargetById).toHaveBeenCalledWith({
      Id: "t1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(screen.getByTestId("add-mode")).toHaveTextContent("edit");
    expect(initialData()).toMatchObject({
      id: "t1",
      name: "Eye contact",
      sd: "Look at me",
      teachingOthers: "Use a mirror",
      numberOfTrials: 10,
      numberOfTasks: 4,
      promptOthers: "Fade quickly",
      dataCollectionType: "Percentage",
      taskSteps: [{ step: "Sit" }],
      baselineDataRequired: true,
      masteryCriteria: { value: 80 },
      statusAndAdmin: "active",
      note: "Morning only",
      attachment: { url: "https://cdn/x.pdf" },
    });
  });

  it("unpacks a prompting strategy however it was stored", async () => {
    await renderLibrary();
    await clickRow("Edit");
    expect(initialData().promptingStrategy).toEqual(["gestural", { value: "verbal" }]);
  });

  it("never opens the form when a strategy is a string that is not JSON", async () => {
    // The mapper JSON.parses every string it finds, so a bare value throws and
    // the modal silently never opens. Asserted as it behaves today.
    api.GetProgramsTargetById.mockResolvedValue({
      data: { data: { ...FULL_TARGET, promptingStrategy: ["verbal"] } },
    });
    await renderLibrary();
    await clickRow("Edit");

    expect(screen.queryByTestId("add-modal")).toBeNull();
    expect(probes.errors).toHaveLength(1);
  });

  it("copies the trial and task counts into the session fields", async () => {
    await renderLibrary();
    await clickRow("Edit");
    expect(initialData().percentageCorrectTrialSession).toBe(10);
    expect(initialData().trialOrOpportunitiesSession).toBe(4);
  });

  it("fills in every gap for a target that carries only the essentials", async () => {
    api.GetProgramsTargetById.mockResolvedValue({ data: { data: BARE_TARGET } });
    await renderLibrary();
    await clickRow("Edit");

    expect(initialData()).toMatchObject({
      teachingOthers: "",
      promptingStrategy: [],
      numberOfTrials: "",
      numberOfTasks: "",
      promptOthers: "",
      percentageCorrectTrialSession: "",
      trialOrOpportunitiesSession: "",
      taskSteps: [],
      masteryCriteria: {},
      note: "",
      attachment: null,
    });
  });

  it("opens the same form from View", async () => {
    await renderLibrary();
    await clickRow("View");
    expect(screen.getByTestId("add-mode")).toHaveTextContent("edit");
    expect(initialData().id).toBe("t1");
  });

  it("updates the target through the edit endpoint", async () => {
    await renderLibrary();
    await clickRow("Edit");
    await act(async () => {
      fireEvent.click(screen.getByText("submit-target"));
    });

    expect(api.editProgramsTarget).toHaveBeenCalledWith({
      formData: { name: "Typed target" },
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(api.CreateProgramsTarget).not.toHaveBeenCalled();
    expect(toast.showToast).toHaveBeenCalledWith("Target updated", "success");
  });
});

describe("duplicating a target", () => {
  it("fetches it, copies it and reloads the list", async () => {
    await renderLibrary();
    api.GetProgramsTargetsByProgramId.mockClear();
    await clickRow("Duplicate");

    expect(api.GetProgramsTargetById).toHaveBeenCalledWith({
      Id: "t1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(api.DuplicateProgramsTarget).toHaveBeenCalledWith({
      id: "t1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("Target duplicated", "success");
    expect(api.GetProgramsTargetsByProgramId).toHaveBeenCalledTimes(1);
  });

  it("complains when the copy fails", async () => {
    api.DuplicateProgramsTarget.mockRejectedValue(new Error("Duplicate failed"));
    await renderLibrary();
    await clickRow("Duplicate");
    expect(toast.showToast).toHaveBeenCalledWith("Duplicate failed", "error");
  });

  it("complains when the target cannot even be read back", async () => {
    api.GetProgramsTargetById.mockRejectedValue(new Error("Not found"));
    await renderLibrary();
    await clickRow("Duplicate");
    expect(api.DuplicateProgramsTarget).not.toHaveBeenCalled();
    expect(toast.showToast).toHaveBeenCalledWith("Not found", "error");
  });
});

describe("deleting a target", () => {
  it("asks first, showing the row it is about to delete", async () => {
    await renderLibrary();
    await clickRow("Delete");
    expect(screen.getByTestId("delete-modal")).toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId("delete-row").textContent)).toMatchObject({
      id: "t1",
      targetName: "Eye contact",
    });
  });

  it("deletes it, says so and reloads the list", async () => {
    await renderLibrary();
    await clickRow("Delete");
    api.GetProgramsTargetsByProgramId.mockClear();
    await act(async () => {
      fireEvent.click(screen.getByText("confirm-delete"));
    });

    expect(api.deleteProgramsTarget).toHaveBeenCalledWith({
      id: "t1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("Target deleted", "success");
    expect(api.GetProgramsTargetsByProgramId).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("delete-modal")).toBeNull();
  });

  it("complains and still closes when the delete fails", async () => {
    api.deleteProgramsTarget.mockRejectedValue(new Error("Target is in use"));
    await renderLibrary();
    await clickRow("Delete");
    await act(async () => {
      fireEvent.click(screen.getByText("confirm-delete"));
    });

    expect(toast.showToast).toHaveBeenCalledWith("Target is in use", "error");
    expect(screen.queryByTestId("delete-modal")).toBeNull();
  });

  it("closes on cancel without deleting anything", async () => {
    await renderLibrary();
    await clickRow("Delete");
    fireEvent.click(screen.getByText("cancel-delete"));
    expect(screen.queryByTestId("delete-modal")).toBeNull();
    expect(api.deleteProgramsTarget).not.toHaveBeenCalled();
  });
});

describe("the row menu's permissions", () => {
  it("offers everything to a user with every permission", async () => {
    await renderLibrary();
    expect(probes.props.table.actions[0].items.map((i) => i.label)).toEqual([
      "View",
      "Edit",
      "Duplicate",
      "Delete",
    ]);
  });

  it("keeps View even for a user with no permissions at all", async () => {
    permissions.granted = [];
    await renderLibrary();
    expect(probes.props.table.actions[0].items.map((i) => i.label)).toEqual(["View"]);
  });

  it("offers only what the user is allowed to do", async () => {
    permissions.granted = ["delete_target"];
    await renderLibrary();
    expect(probes.props.table.actions[0].items.map((i) => i.label)).toEqual([
      "View",
      "Delete",
    ]);
  });
});
