import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The Targets tab of a client's program: a permission-gated "New" dropdown that
 * either imports a target from the tenant library or opens a blank custom
 * target form, a table of the program's targets, and the edit/delete flows
 * hanging off each row's action menu.
 *
 * The table and all three modals are probes. The table probe renders one button
 * per action item per row, which is the only honest way to reach the row
 * handlers, and the modal probes record the props they were handed -- the
 * interesting work in this page is the `initialData` object it builds for
 * AddTargetModal, a long chain of `||` fallbacks plus an inline parser for the
 * prompting strategies, none of which is visible in the DOM.
 *
 * Route params and the query string are swapped per test rather than per
 * render, because the page reads them once through hooks. `usePermissions`
 * treats a user with an EMPTY `roleModuleAccesses` array as an org owner with
 * full access, so the permissive fixture is an empty array and the restricted
 * ones name their keys explicitly.
 */

const apiMock = vi.hoisted(() => ({
  GetProgramsTargetsByProgramId: vi.fn(),
  GetAllTargetByTenantId: vi.fn(),
  AttachTargetToClient: vi.fn(),
  CreateProgramsTargetByClientId: vi.fn(),
  editProgramsTargetByClientId: vi.fn(),
  deleteProgramsTarget: vi.fn(),
}));
vi.mock("../api/clientPanelApis", () => ({ default: apiMock }));

const toastMock = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toastMock.showToast(...a),
  showApiError: vi.fn(),
}));

const route = vi.hoisted(() => ({
  params: {},
  search: "",
  navigate: vi.fn(),
}));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => route.navigate,
  useParams: () => route.params,
  useSearchParams: () => [new URLSearchParams(route.search), vi.fn()],
}));

// One button per action item per row: the row handlers are otherwise sealed
// inside the real table's dropdown.
const table = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/Table/CustomTable", () => ({
  default: (props) => {
    table.props = props;
    return (
      <div data-testid="targets-table" data-loading={String(props.loading)}>
        {props.data.map((row) => (
          <div key={row.id} data-testid={`row-${row.id}`}>
            <span>{row.targetName}</span>
            <span data-testid={`description-${row.id}`}>{row.description}</span>
            {props.actions[0].items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => item.onClick(row)}
              >{`${item.label} ${row.id}`}</button>
            ))}
          </div>
        ))}
      </div>
    );
  },
}));

const addModal = vi.hoisted(() => ({ props: null, submitError: undefined }));
vi.mock("../Components/ReusableModal/ProgramLibraryModal/AddTargetModal", () => ({
  default: (props) => {
    addModal.props = props;
    if (!props.isOpen) return null;
    return (
      <div data-testid="add-target-modal">
        <button
          type="button"
          onClick={async () => {
            addModal.submitError = undefined;
            try {
              await props.onSubmit({ name: "Requests a break" });
            } catch (e) {
              addModal.submitError = e;
            }
          }}
        >
          submit target
        </button>
        <button type="button" onClick={props.onClose}>
          close add modal
        </button>
      </div>
    );
  },
}));

const deleteModal = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/ReusableModal/ProgramLibraryModal/DeleteLibraryModal", () => ({
  default: (props) => {
    deleteModal.props = props;
    if (!props.isOpen) return null;
    return (
      <div data-testid="delete-modal">
        <span data-testid="delete-message">{props.message}</span>
        <button type="button" onClick={props.onDelete}>
          confirm delete
        </button>
        <button type="button" onClick={props.onClose}>
          close delete modal
        </button>
      </div>
    );
  },
}));

const libraryModal = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/ReusableModal/ClientModal/TargetLibraryModal", () => ({
  default: (props) => {
    libraryModal.props = props;
    if (!props.isOpen) return null;
    return (
      <div data-testid="library-modal" data-loading={String(props.loading)}>
        {props.targets.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => props.onSelectTarget(t.id, t.name)}
          >{`import ${t.name}`}</button>
        ))}
      </div>
    );
  },
}));

import ViewPrograms from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ProgramSub/ViewPrograms";

const store = (roleModuleAccesses = [], tenantId = "tenant-1") =>
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
          tenantId,
          accessToken: "at",
          refreshToken: "rt",
          role: { roleModuleAccesses },
        },
      },
    },
  });

const renderPage = ({ roleModuleAccesses = [], tenantId = "tenant-1" } = {}) =>
  render(
    <Provider store={store(roleModuleAccesses, tenantId)}>
      <ViewPrograms />
    </Provider>
  );

/** A row as the API returns it, before the page reshapes it for the table. */
const apiTarget = (over = {}) => ({
  id: "t-1",
  name: "Requests a break",
  description: "Asks for a break",
  ...over,
});

const respondWith = (rows) =>
  apiMock.GetProgramsTargetsByProgramId.mockResolvedValue({
    data: { data: rows },
  });

const openNewMenu = () => fireEvent.click(screen.getByRole("button", { name: "New" }));

/** Opens the edit modal on the single loaded row and returns its initialData. */
const editedInitialData = async (rawData, description = "Asks for a break") => {
  respondWith([apiTarget({ ...rawData, description })]);
  renderPage();
  fireEvent.click(await screen.findByRole("button", { name: "Edit Target t-1" }));
  await screen.findByTestId("add-target-modal");
  return addModal.props.initialData;
};

beforeEach(() => {
  vi.clearAllMocks();
  route.params = { clientId: "c-1", programId: "p-1" };
  route.search = "client=Ada%20Lovelace&name=Communication";
  respondWith([apiTarget()]);
  apiMock.GetAllTargetByTenantId.mockResolvedValue({ data: { data: [] } });
  apiMock.AttachTargetToClient.mockResolvedValue({});
  apiMock.CreateProgramsTargetByClientId.mockResolvedValue({
    data: { message: "Target created" },
  });
  apiMock.editProgramsTargetByClientId.mockResolvedValue({
    data: { message: "Target updated" },
  });
  apiMock.deleteProgramsTarget.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the header and its query string", () => {
  it("names the client and the program it was sent", async () => {
    renderPage();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Communication")).toBeInTheDocument();
    await screen.findByTestId("row-t-1");
  });

  it("falls back to generic names when the query string is empty", async () => {
    route.search = "";
    renderPage();
    expect(screen.getByText("Client")).toBeInTheDocument();
    expect(screen.getByText("Program")).toBeInTheDocument();
    await screen.findByTestId("row-t-1");
  });

  it("goes back a page when Back is pressed", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(route.navigate).toHaveBeenCalledWith(-1);
    await screen.findByTestId("row-t-1");
  });
});

describe("loading the program's targets", () => {
  it("reshapes each target the endpoint returns", async () => {
    respondWith([
      apiTarget(),
      apiTarget({ id: "t-2", name: "Waits turn", description: "" }),
    ]);
    renderPage();
    expect(await screen.findByText("Requests a break")).toBeInTheDocument();
    expect(screen.getByTestId("description-t-1")).toHaveTextContent("Asks for a break");
    // A target with no description gets an em dash rather than an empty cell.
    expect(screen.getByTestId("description-t-2")).toHaveTextContent("—");
  });

  it("shows an empty table when the payload carries no list", async () => {
    apiMock.GetProgramsTargetsByProgramId.mockResolvedValue({ data: {} });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("targets-table")).toHaveAttribute(
        "data-loading",
        "false"
      )
    );
    expect(screen.queryByTestId("row-t-1")).not.toBeInTheDocument();
  });

  it("stays quiet when the fetch is refused", async () => {
    apiMock.GetProgramsTargetsByProgramId.mockRejectedValue(new Error("boom"));
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("targets-table")).toHaveAttribute(
        "data-loading",
        "false"
      )
    );
    expect(toastMock.showToast).not.toHaveBeenCalled();
  });

  it("does not ask for targets without a program in the route", () => {
    route.params = { clientId: "c-1" };
    renderPage();
    expect(apiMock.GetProgramsTargetsByProgramId).not.toHaveBeenCalled();
  });
});

describe("the New dropdown", () => {
  it("stays hidden from a user who cannot add targets", async () => {
    renderPage({
      roleModuleAccesses: [{ module: "CLIENTS", permissions: ["view_client"] }],
    });
    expect(screen.queryByRole("button", { name: "New" })).not.toBeInTheDocument();
    await screen.findByTestId("row-t-1");
  });

  it("opens and closes again on repeated presses", async () => {
    renderPage();
    openNewMenu();
    expect(screen.getByRole("button", { name: "Custom Target" })).toBeInTheDocument();
    openNewMenu();
    expect(
      screen.queryByRole("button", { name: "Custom Target" })
    ).not.toBeInTheDocument();
    await screen.findByTestId("row-t-1");
  });

  it("opens a blank add modal from Custom Target", async () => {
    renderPage();
    openNewMenu();
    fireEvent.click(screen.getByRole("button", { name: "Custom Target" }));
    expect(screen.getByTestId("add-target-modal")).toBeInTheDocument();
    expect(addModal.props.mode).toBe("add");
    expect(addModal.props.initialData).toBeNull();
    expect(addModal.props.programId).toBe("p-1");
    expect(addModal.props.clientId).toBe("c-1");
    await screen.findByTestId("row-t-1");
  });

  it("closes the add modal and forgets the row when asked", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Edit Target t-1" }));
    fireEvent.click(screen.getByRole("button", { name: "close add modal" }));
    expect(screen.queryByTestId("add-target-modal")).not.toBeInTheDocument();
    expect(addModal.props.initialData).toBeNull();
  });
});

describe("importing from the target library", () => {
  it("loads the tenant's library and imports the chosen target", async () => {
    apiMock.GetAllTargetByTenantId.mockResolvedValue({
      data: { data: [{ id: "lib-1", name: "Eye contact", description: "Looks up" }] },
    });
    renderPage();
    openNewMenu();
    fireEvent.click(screen.getByRole("button", { name: "Target from Library" }));
    fireEvent.click(await screen.findByRole("button", { name: "import Eye contact" }));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(
        '"Eye contact" imported successfully',
        "success"
      )
    );
    expect(apiMock.AttachTargetToClient).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: "c-1", targetId: "lib-1", programId: "p-1" })
    );
    // The import refetches, so the table is asked for the program twice.
    expect(apiMock.GetProgramsTargetsByProgramId).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("library-modal")).not.toBeInTheDocument();
  });

  it("shows an empty library when the payload carries no list", async () => {
    apiMock.GetAllTargetByTenantId.mockResolvedValue({ data: {} });
    renderPage();
    openNewMenu();
    fireEvent.click(screen.getByRole("button", { name: "Target from Library" }));
    await waitFor(() =>
      expect(screen.getByTestId("library-modal")).toHaveAttribute(
        "data-loading",
        "false"
      )
    );
    expect(libraryModal.props.targets).toEqual([]);
  });

  it("stays quiet when the library fetch is refused", async () => {
    apiMock.GetAllTargetByTenantId.mockRejectedValue(new Error("boom"));
    renderPage();
    openNewMenu();
    fireEvent.click(screen.getByRole("button", { name: "Target from Library" }));
    await waitFor(() =>
      expect(screen.getByTestId("library-modal")).toHaveAttribute(
        "data-loading",
        "false"
      )
    );
    expect(toastMock.showToast).not.toHaveBeenCalled();
  });

  it("does not ask for a library when there is no tenant", async () => {
    renderPage({ tenantId: null });
    openNewMenu();
    fireEvent.click(screen.getByRole("button", { name: "Target from Library" }));
    expect(apiMock.GetAllTargetByTenantId).not.toHaveBeenCalled();
    await screen.findByTestId("row-t-1");
  });

  it.each([
    [
      "the server's own message",
      { response: { data: { message: "Already attached" } }, message: "Request failed" },
      "Already attached",
    ],
    ["the error's message", new Error("Network down"), "Network down"],
    ["a generic apology", {}, "Failed to import target"],
  ])("reports %s when the import fails", async (_name, thrown, expected) => {
    apiMock.GetAllTargetByTenantId.mockResolvedValue({
      data: { data: [{ id: "lib-1", name: "Eye contact", description: "Looks up" }] },
    });
    apiMock.AttachTargetToClient.mockRejectedValue(thrown);
    renderPage();
    openNewMenu();
    fireEvent.click(screen.getByRole("button", { name: "Target from Library" }));
    fireEvent.click(await screen.findByRole("button", { name: "import Eye contact" }));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(expected, "error")
    );
    // The library modal closes whether the import worked or not.
    expect(screen.queryByTestId("library-modal")).not.toBeInTheDocument();
  });

  it("closes the library modal on its own close button", async () => {
    renderPage();
    openNewMenu();
    fireEvent.click(screen.getByRole("button", { name: "Target from Library" }));
    await screen.findByTestId("library-modal");
    libraryModal.props.onClose();
    await waitFor(() =>
      expect(screen.queryByTestId("library-modal")).not.toBeInTheDocument()
    );
  });
});

describe("saving a target", () => {
  it("creates the target and closes the modal in add mode", async () => {
    renderPage();
    openNewMenu();
    fireEvent.click(screen.getByRole("button", { name: "Custom Target" }));
    fireEvent.click(screen.getByRole("button", { name: "submit target" }));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Target created", "success")
    );
    expect(apiMock.CreateProgramsTargetByClientId).toHaveBeenCalledWith(
      expect.objectContaining({ formData: { name: "Requests a break" } })
    );
    expect(apiMock.editProgramsTargetByClientId).not.toHaveBeenCalled();
    expect(screen.queryByTestId("add-target-modal")).not.toBeInTheDocument();
  });

  it("edits the target instead once a row has been picked", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Edit Target t-1" }));
    fireEvent.click(screen.getByRole("button", { name: "submit target" }));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Target updated", "success")
    );
    expect(apiMock.CreateProgramsTargetByClientId).not.toHaveBeenCalled();
  });

  it("falls back to a generic success line when the server sends none", async () => {
    apiMock.CreateProgramsTargetByClientId.mockResolvedValue({ data: {} });
    renderPage();
    openNewMenu();
    fireEvent.click(screen.getByRole("button", { name: "Custom Target" }));
    fireEvent.click(screen.getByRole("button", { name: "submit target" }));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Target saved", "success")
    );
  });

  it.each([
    ["the error's message", new Error("Name taken"), "Name taken"],
    ["a generic apology", {}, "Operation failed"],
  ])("reports %s and re-throws when the save fails", async (_n, thrown, expected) => {
    apiMock.CreateProgramsTargetByClientId.mockRejectedValue(thrown);
    renderPage();
    openNewMenu();
    fireEvent.click(screen.getByRole("button", { name: "Custom Target" }));
    fireEvent.click(screen.getByRole("button", { name: "submit target" }));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(expected, "error")
    );
    // Re-thrown so the modal can keep itself open and hold the form.
    expect(addModal.submitError).toBe(thrown);
    expect(screen.getByTestId("add-target-modal")).toBeInTheDocument();
  });
});

describe("removing a target", () => {
  it("names the row in the confirmation and removes it", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Remove Target t-1" }));
    expect(screen.getByTestId("delete-message")).toHaveTextContent(
      'Are you sure you want to remove "Requests a break"?'
    );
    fireEvent.click(screen.getByRole("button", { name: "confirm delete" }));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith("Target removed", "success")
    );
    expect(apiMock.deleteProgramsTarget).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t-1" })
    );
    expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
  });

  it.each([
    ["the error's message", new Error("Still in use"), "Still in use"],
    ["a generic apology", {}, "Delete failed"],
  ])("reports %s when the removal fails", async (_n, thrown, expected) => {
    apiMock.deleteProgramsTarget.mockRejectedValue(thrown);
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Remove Target t-1" }));
    fireEvent.click(screen.getByRole("button", { name: "confirm delete" }));
    await waitFor(() =>
      expect(toastMock.showToast).toHaveBeenCalledWith(expected, "error")
    );
    expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
  });

  it("closes the confirmation without removing anything", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Remove Target t-1" }));
    fireEvent.click(screen.getByRole("button", { name: "close delete modal" }));
    expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
    expect(apiMock.deleteProgramsTarget).not.toHaveBeenCalled();
  });

  it("asks about no one in particular before a row is picked", async () => {
    renderPage();
    await screen.findByTestId("row-t-1");
    expect(deleteModal.props.message).toBe(
      'Are you sure you want to remove "undefined"?'
    );
  });
});

describe("the row action menu", () => {
  it("sends View Data to the target page with everything escaped", async () => {
    route.search = "client=Ada%20Lovelace&name=Fine%20Motor%2FSelf%20Care";
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "View Data t-1" }));
    expect(route.navigate).toHaveBeenCalledWith(
      "/target-single/Ada%20Lovelace/Fine%20Motor%2FSelf%20Care/Requests%20a%20break?targetId=t-1&clientId=c-1"
    );
  });

  it("drops the entries a restricted user may not use", async () => {
    renderPage({
      roleModuleAccesses: [{ module: "CLIENTS", permissions: ["add_target"] }],
    });
    await screen.findByTestId("row-t-1");
    expect(table.props.actions[0].items.map((i) => i.label)).toEqual(["Edit Target"]);
  });

  it("keeps every entry for an org owner", async () => {
    renderPage();
    await screen.findByTestId("row-t-1");
    expect(table.props.actions[0].items.map((i) => i.label)).toEqual([
      "View Data",
      "Edit Target",
      "Remove Target",
    ]);
  });
});

describe("the initial data an edited row is opened with", () => {
  it("carries every stored value straight through", async () => {
    const initialData = await editedInitialData({
      sd: "Say 'break'",
      expectedResponse: "Signs break",
      teachingProcedure: "DTT",
      dataCollectionType: "Frequency",
      baselineDataRequired: true,
      initialStatus: "In Progress",
      note: "Runs after lunch",
      masteryMetric: "percentage",
      masteryCriteria: { percentage: 80 },
      numberOfTrials: 10,
      taskSteps: [{ step: "Open the box" }],
    });
    expect(initialData).toMatchObject({
      id: "t-1",
      name: "Requests a break",
      description: "Asks for a break",
      sd: "Say 'break'",
      expectedResponse: "Signs break",
      teachingProcedure: "DTT",
      dataCollectionType: "Frequency",
      baselineDataRequired: true,
      statusAndAdmin: "In Progress",
      note: "Runs after lunch",
      masteryMetric: "percentage",
      masteryCriteria: { percentage: 80 },
      trialOrOpportunitiesSession: 10,
      percentageCorrectTrialSession: 10,
      taskSteps: [{ step: "Open the box" }],
      attachment: null,
    });
  });

  it("reaches for the second name of each doubly-named field", async () => {
    const initialData = await editedInitialData({
      statusAndAdmin: "On Hold",
      notes: "Legacy note",
      numberOfTasks: 4,
    });
    expect(initialData).toMatchObject({
      statusAndAdmin: "On Hold",
      note: "Legacy note",
      trialOrOpportunitiesSession: 4,
      percentageCorrectTrialSession: "",
    });
  });

  it("empties every field the stored target has nothing for", async () => {
    const initialData = await editedInitialData({}, "");
    expect(initialData).toMatchObject({
      // The em dash the table showed is not a real description.
      description: "",
      sd: "",
      expectedResponse: "",
      teachingProcedure: "",
      dataCollectionType: "",
      baselineDataRequired: false,
      statusAndAdmin: "",
      note: "",
      masteryMetric: "",
      masteryCriteria: {},
      trialOrOpportunitiesSession: "",
      taskSteps: [],
      promptingStrategy: [],
    });
  });

  it("ignores task steps that were not stored as a list", async () => {
    const initialData = await editedInitialData({ taskSteps: "one, two" });
    expect(initialData.taskSteps).toEqual([]);
  });

  it("ignores a prompting strategy that was not stored as a list", async () => {
    const initialData = await editedInitialData({ promptingStrategy: "full-physical" });
    expect(initialData.promptingStrategy).toEqual([]);
  });

  it("unpacks prompting strategies however they were stored", async () => {
    const initialData = await editedInitialData({
      promptingStrategy: [
        // JSON strings, the shape the picker used to save
        '{"value":"full-physical","label":"Full physical"}',
        '{"label":"Gestural"}',
        // Valid JSON with neither key falls back to the raw string
        '{"note":"unknown"}',
        // Not JSON at all, so it stands for itself
        "verbal",
        // Plain objects, the shape it saves now
        { value: "partial-physical", label: "Partial physical" },
        { label: "Modelling" },
        // Neither key gives an empty string, which is then dropped
        { code: 7 },
        // Neither a string nor an object, so it passes through untouched
        3,
        // Typed as an object but null, so it passes through and is dropped
        null,
      ],
    });
    expect(initialData.promptingStrategy).toEqual([
      "full-physical",
      "Gestural",
      '{"note":"unknown"}',
      "verbal",
      "partial-physical",
      "Modelling",
      3,
    ]);
  });
});
