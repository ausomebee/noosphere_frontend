import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";

import JiraBoard from "../Components/JiraBoard/JiraBoard";
import authReducer from "../ReduxStore/features/authentication";
import pipelineReducer, {
  updateColumnTaskIds,
} from "../ReduxStore/features/PipelineSlice";

/**
 * The client pipeline board's container. It owns the whole load sequence
 * (pipeline, then stages, then a batched fetch of the items in each stage), the
 * drag handlers that persist a reorder or a move, and the four modals that add
 * a stage, add a candidate, delete a candidate and delete a stage.
 *
 * The presentation is left to Board/Column/Task and the modals, so all of those
 * are replaced by probes that record their props: the point of these tests is
 * the container's own logic, and driving it through a real board would mean
 * dragging in jsdom. dnd-kit's DndContext is a probe too, which is what makes
 * the drag handlers reachable — the tests hand them synthetic active/over pairs
 * rather than simulating pointer movement.
 *
 * Only the async thunks are mocked; the pipeline reducer and its plain actions
 * are real, so the column and task bookkeeping the handlers dispatch is
 * genuinely exercised through the store. One consequence of mocking the thunks
 * is that a column's taskIds are normally filled in by fetchPipelineItems'
 * fulfilled reducer, which no longer runs — tests that need cards on the board
 * seed them through the plain action instead.
 */

// `dispatch(thunk(arg))` must hand back a promise carrying `.unwrap()`, the way
// createAsyncThunk's does, because every call site awaits that. Hoisted with
// the spies because the mock factories below are lifted above this file's body.
const { asThunk } = vi.hoisted(() => ({
  asThunk: (spy) => (arg) => () => {
    const promise = Promise.resolve().then(() => spy(arg));
    promise.unwrap = () => promise;
    return promise;
  },
}));

const spies = vi.hoisted(() => ({
  fetchPipeline: vi.fn(),
  fetchItems: vi.fn(),
  createStage: vi.fn(),
  reorderStage: vi.fn(),
  updateActivity: vi.fn(),
  deleteStage: vi.fn(),
  deleteItem: vi.fn(),
  createCandidate: vi.fn(),
  fetchStages: vi.fn(),
  getPipelineStage: vi.fn(),
  toast: vi.fn(),
  apiError: vi.fn(),
  navigate: vi.fn(),
}));


vi.mock("../ReduxStore/features/PipelineSlice", async () => {
  const actual = await vi.importActual("../ReduxStore/features/PipelineSlice");
  return {
    ...actual,
    fetchPipelineByTenantId: asThunk(spies.fetchPipeline),
    fetchPipelineItems: asThunk(spies.fetchItems),
    fetchPipelineStages: asThunk(spies.fetchStages),
    createPipelineStage: asThunk(spies.createStage),
    reorderPipelineStage: asThunk(spies.reorderStage),
    updatePipelineItemActivity: asThunk(spies.updateActivity),
    deletePipelineStage: asThunk(spies.deleteStage),
    deletePipelineItem: asThunk(spies.deleteItem),
    createCandidate: asThunk(spies.createCandidate),
  };
});

vi.mock("../api/TenantApis", () => ({
  default: { GetPipelineStage: spies.getPipelineStage },
}));

vi.mock("../Helper/ShowToast", () => ({
  showToast: spies.toast,
  showApiError: spies.apiError,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => spies.navigate };
});

const dnd = vi.hoisted(() => ({ props: null }));

vi.mock("@dnd-kit/core", async () => {
  const actual = await vi.importActual("@dnd-kit/core");
  return {
    ...actual,
    DndContext: (props) => {
      dnd.props = props;
      return <div data-testid="dnd-context">{props.children}</div>;
    },
    DragOverlay: ({ children }) => (
      <div data-testid="drag-overlay">{children}</div>
    ),
  };
});

const board = vi.hoisted(() => ({ props: null }));

vi.mock("../Components/JiraBoard/Board", () => ({
  default: (props) => {
    board.props = props;
    return <div data-testid="board" />;
  },
}));

vi.mock("../Components/JiraBoard/Task", () => ({
  default: ({ task }) => <div data-testid="overlay-task">{task?.fullName}</div>,
}));

vi.mock("../Components/JiraBoard/Column", () => ({
  default: ({ column }) => (
    <div data-testid="overlay-column">{column?.title}</div>
  ),
}));

vi.mock("../Components/JiraBoard/EmptyState", () => ({
  default: ({ onAddFirstStage }) => (
    <button type="button" onClick={() => onAddFirstStage({ name: "Intake" })}>
      add first stage
    </button>
  ),
}));

vi.mock("../Components/ReusableModal/PipelineModal/NewPipelineColumnModal", () => ({
  default: ({ isOpen, onSave, onClose }) =>
    isOpen ? (
      <div data-testid="add-column-modal">
        <button
          type="button"
          onClick={() =>
            Promise.resolve(
              onSave({ name: " Screening ", colorCode: "#abcdef" })
            ).catch(() => {})
          }
        >
          save column
        </button>
        <button type="button" onClick={onClose}>
          close column modal
        </button>
      </div>
    ) : null,
}));

vi.mock("../Components/ReusableModal/ClientModal/AddClientModal", () => ({
  default: ({ isOpen, onSubmit, onClose }) =>
    isOpen ? (
      <div data-testid="add-client-modal">
        <button
          type="button"
          onClick={() =>
            Promise.resolve(onSubmit({ firstName: "Ada" })).catch(() => {})
          }
        >
          save candidate
        </button>
        <button type="button" onClick={onClose}>
          close client modal
        </button>
      </div>
    ) : null,
}));

vi.mock("../Components/ReusableModal/PipelineModal/DeleteConfirmationModal", () => ({
  default: ({ isOpen, onConfirm, onClose, title, message }) =>
    isOpen ? (
      <div data-testid="delete-modal">
        <p>{title}</p>
        <p>{message}</p>
        <button type="button" onClick={onConfirm}>
          confirm delete
        </button>
        <button type="button" onClick={onClose}>
          cancel delete
        </button>
      </div>
    ) : null,
}));

const stage = (id, name, colourCode) => ({ id, name, colourCode });

// Every mutation ends with setIsDataLoaded(false), which reloads the whole
// board and would overwrite the state under assertion. Answering the second
// stage request with nothing makes that reload abort early, leaving what the
// handler just did visible.
const stagesRespondWith = (first) => {
  spies.getPipelineStage.mockReset();
  spies.getPipelineStage
    .mockResolvedValueOnce({ data: { data: first } })
    .mockResolvedValue({ data: { data: [] } });
};

const candidate = (id, fullName) => ({ id, fullName, clientId: `cl-${id}` });

const makeStore = ({ permissions, pipeline = { id: "p1", name: "Intake pipeline", description: "How clients arrive" }, status = "idle", user } = {}) =>
  configureStore({
    reducer: { authentication: authReducer, pipeline: pipelineReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "t",
        refreshToken: "rt",
        user: {
          id: "u1",
          tenantId: "tenant-1",
          accessToken: "access-1",
          refreshToken: "refresh-1",
          // No roleModuleAccesses at all means full access, so a test that
          // wants a restricted role passes an explicit (possibly empty) list.
          ...(permissions
            ? { role: { roleModuleAccesses: [{ module: "CLIENTS", permissions }] } }
            : {}),
          ...user,
        },
      },
      pipeline: {
        draft: { name: "", description: "", colorCode: "#1E40AF" },
        pipeline,
        columns: {},
        columnOrder: [],
        stages: [],
        status,
        error: null,
        pipelineItem: null,
      },
    },
  });

const renderBoard = (options = {}) => {
  const store = makeStore(options);
  const view = render(
    <Provider store={store}>
      <MemoryRouter>
        <JiraBoard />
      </MemoryRouter>
    </Provider>
  );
  return { ...view, store };
};

// The container starts with a loader and only swaps in the board once the
// pipeline, stages and items have all landed.
const renderLoadedBoard = async (options) => {
  const view = renderBoard(options);
  await waitFor(() => expect(screen.getByTestId("board")).toBeInTheDocument());
  return view;
};

const seedColumn = (store, columnId, taskIds) =>
  act(() => {
    store.dispatch(updateColumnTaskIds({ columnId, taskIds }));
  });

let errorSpy;
let warnSpy;

beforeEach(() => {
  // reset, not clear: the stage responses are queued with `once`, and an
  // unconsumed queue would leak into the next test.
  vi.resetAllMocks();
  board.props = null;
  dnd.props = null;
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  spies.fetchPipeline.mockResolvedValue({ data: [{ id: "p1" }] });
  stagesRespondWith([stage("s1", "Applied", "#111111"), stage("s2", "Screening")]);
  spies.fetchItems.mockImplementation(({ stageId }) =>
    stageId === "s1"
      ? { items: [candidate("t1", "Ada Lovelace")] }
      : { items: [] }
  );
  spies.createStage.mockResolvedValue({ data: { id: "s3" } });
  spies.fetchStages.mockResolvedValue({});
  spies.reorderStage.mockResolvedValue({});
  spies.updateActivity.mockResolvedValue({});
  spies.deleteStage.mockResolvedValue({});
  spies.deleteItem.mockResolvedValue({ status: "ok" });
  spies.createCandidate.mockResolvedValue({
    data: { id: "t9", firstName: "Grace", lastName: "Hopper" },
  });
});

afterEach(() => {
  errorSpy.mockRestore();
  warnSpy.mockRestore();
});

describe("board loading", () => {
  it("shows a loader while the pipeline is still arriving", () => {
    renderBoard();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("names the pipeline once it has loaded", async () => {
    await renderLoadedBoard();
    expect(screen.getByText("Intake pipeline")).toBeInTheDocument();
    expect(screen.getByText("How clients arrive")).toBeInTheDocument();
  });

  it("falls back to generic header text without a pipeline record", async () => {
    await renderLoadedBoard({ pipeline: null });
    expect(screen.getByText("Pipeline")).toBeInTheDocument();
    expect(
      screen.getByText("Manage your client intake process seamlessly")
    ).toBeInTheDocument();
  });

  it("builds a column per stage and hands them to the board", async () => {
    const { store } = await renderLoadedBoard();
    expect(store.getState().pipeline.columnOrder).toEqual(["s1", "s2"]);
    expect(board.props.data.columns.s1).toMatchObject({
      title: "Applied",
      colorCode: "#111111",
    });
    // A stage with no colour of its own gets the default rather than undefined.
    expect(board.props.data.columns.s2.colorCode).toBe("#000000");
  });

  it("names a stage that has none", async () => {
    stagesRespondWith([{ id: "s1" }]);
    await renderLoadedBoard();
    expect(board.props.data.columns.s1.title).toBe("Unnamed Stage");
  });

  it("loads the candidates in each stage", async () => {
    await renderLoadedBoard();
    expect(board.props.data.tasks.t1).toMatchObject({
      id: "t1",
      fullName: "Ada Lovelace",
    });
  });

  it("names a candidate the API left unnamed", async () => {
    spies.fetchItems.mockResolvedValue({
      items: [{ id: "abcdefgh-ijkl", clientId: "c1" }],
    });
    await renderLoadedBoard();
    expect(board.props.data.tasks["abcdefgh-ijkl"].fullName).toBe(
      "Candidate abcdefgh"
    );
  });

  it("skips an item with no usable id", async () => {
    spies.fetchItems.mockImplementation(({ stageId }) =>
      stageId === "s1"
        ? { items: [candidate("t1", "Ada"), { id: 7 }, {}] }
        : { items: [] }
    );
    await renderLoadedBoard();
    expect(Object.keys(board.props.data.tasks)).toEqual(["t1"]);
  });

  it("copes with a stage whose items are not a list", async () => {
    spies.fetchItems.mockResolvedValue({ items: null });
    await renderLoadedBoard();
    expect(board.props.data.tasks).toEqual({});
  });

  it("reports how many stages failed to load their items", async () => {
    spies.fetchItems.mockImplementation(({ stageId }) => {
      if (stageId === "s2") throw new Error("stage unavailable");
      return { items: [] };
    });
    await renderLoadedBoard();
    expect(spies.toast).toHaveBeenCalledWith(
      "Failed to fetch items for 1 stage(s).",
      "error"
    );
  });

  it("stops when the tenant has no pipeline", async () => {
    spies.fetchPipeline.mockResolvedValue({ data: [] });
    renderBoard();
    await waitFor(() =>
      expect(spies.toast).toHaveBeenCalledWith("No pipeline found.", "warning")
    );
    expect(spies.getPipelineStage).not.toHaveBeenCalled();
  });

  it("stops when the pipeline has no stages", async () => {
    stagesRespondWith([]);
    renderBoard();
    await waitFor(() =>
      expect(spies.toast).toHaveBeenCalledWith(
        "No stages found for pipeline.",
        "warning"
      )
    );
  });

  it("stops when every stage is missing an id", async () => {
    stagesRespondWith([{ name: "Broken" }]);
    renderBoard();
    await waitFor(() =>
      expect(spies.toast).toHaveBeenCalledWith("No valid stages found.", "warning")
    );
  });

  it("refuses to load without auth tokens", async () => {
    renderBoard({ user: { accessToken: undefined } });
    await waitFor(() =>
      expect(spies.toast).toHaveBeenCalledWith(
        "Authentication tokens not available.",
        "error"
      )
    );
    expect(spies.fetchPipeline).not.toHaveBeenCalled();
  });

  it("refuses to load without a tenant", async () => {
    renderBoard({ user: { tenantId: undefined } });
    await waitFor(() =>
      expect(spies.toast).toHaveBeenCalledWith(
        "Tenant ID is not available.",
        "error"
      )
    );
  });

  it("swallows a failed pipeline fetch into the console", async () => {
    spies.fetchPipeline.mockRejectedValue(new Error("pipeline down"));
    renderBoard();
    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith("Fetch error:", expect.any(Error))
    );
  });

  it("offers a retry when the slice itself reports a failure", async () => {
    renderBoard({ status: "failed" });
    await waitFor(() =>
      expect(
        screen.getByText(/Something went wrong loading the pipeline/)
      ).toBeInTheDocument()
    );
  });

  it("shows the empty state when the board has no columns", async () => {
    stagesRespondWith([]);
    renderBoard();
    await waitFor(() =>
      expect(screen.getByText("add first stage")).toBeInTheDocument()
    );
  });
});

describe("dragging columns", () => {
  const dragColumn = async (activeId, overId) =>
    act(async () => {
      await dnd.props.onDragEnd({
        active: { id: activeId, data: { current: { type: "Column" } } },
        over: { id: overId },
      });
    });

  it("persists a reorder with the new one-based position", async () => {
    const { store } = await renderLoadedBoard();
    await dragColumn("s1", "s2");

    expect(store.getState().pipeline.columnOrder).toEqual(["s2", "s1"]);
    expect(spies.reorderStage).toHaveBeenCalledWith(
      expect.objectContaining({ id: "s1", order: 2 })
    );
  });

  it("does nothing when the column lands where it started", async () => {
    await renderLoadedBoard();
    await dragColumn("s1", "s1");
    expect(spies.reorderStage).not.toHaveBeenCalled();
  });

  it("reports a reorder the server rejected", async () => {
    spies.reorderStage.mockRejectedValue(new Error("nope"));
    await renderLoadedBoard();
    await dragColumn("s1", "s2");

    expect(spies.toast).toHaveBeenCalledWith(
      "Failed to update column order.",
      "error"
    );
  });

  it("refuses a reorder from a role without pipeline setup rights", async () => {
    await renderLoadedBoard({ permissions: ["view_pipeline"] });
    await dragColumn("s1", "s2");
    expect(spies.reorderStage).not.toHaveBeenCalled();
  });

  it("ignores a drag dropped outside the board", async () => {
    await renderLoadedBoard();
    await act(async () => {
      await dnd.props.onDragEnd({
        active: { id: "s1", data: { current: { type: "Column" } } },
        over: null,
      });
    });
    expect(spies.reorderStage).not.toHaveBeenCalled();
  });

  it("shows the dragged column in the overlay", async () => {
    await renderLoadedBoard();
    act(() => {
      dnd.props.onDragStart({
        active: { id: "s1", data: { current: { type: "Column" } } },
      });
    });
    expect(screen.getByTestId("overlay-column")).toHaveTextContent("Applied");
  });
});

describe("dragging candidates", () => {
  const dragTask = async (activeId, overId) =>
    act(async () => {
      await dnd.props.onDragEnd({
        active: { id: activeId, data: { current: { type: "Task" } } },
        over: { id: overId },
      });
    });

  it("moves a candidate onto another column and persists the stage", async () => {
    const { store } = await renderLoadedBoard();
    await seedColumn(store, "s1", ["t1"]);
    await dragTask("t1", "s2");

    const { columns } = store.getState().pipeline;
    expect(columns.s1.taskIds).toEqual([]);
    expect(columns.s2.taskIds).toEqual(["t1"]);
    expect(spies.updateActivity).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ["t1"], pipelineStageId: "s2" })
    );
  });

  it("reorders within a column without changing its stage", async () => {
    spies.fetchItems.mockImplementation(({ stageId }) =>
      stageId === "s1"
        ? { items: [candidate("t1", "Ada"), candidate("t2", "Grace")] }
        : { items: [] }
    );
    const { store } = await renderLoadedBoard();
    await seedColumn(store, "s1", ["t1", "t2"]);
    await dragTask("t1", "t2");

    expect(store.getState().pipeline.columns.s1.taskIds).toEqual(["t2", "t1"]);
    expect(spies.updateActivity).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ["t1"], pipelineStageId: "s1" })
    );
  });

  it("reports a move the server rejected", async () => {
    spies.updateActivity.mockRejectedValue(new Error("nope"));
    const { store } = await renderLoadedBoard();
    await seedColumn(store, "s1", ["t1"]);
    await dragTask("t1", "s2");
    expect(spies.toast).toHaveBeenCalledWith("Failed to move task.", "error");
  });

  it("refuses a move from a role without candidate management rights", async () => {
    await renderLoadedBoard({ permissions: ["view_pipeline"] });
    await dragTask("t1", "s2");
    expect(spies.updateActivity).not.toHaveBeenCalled();
  });

  it("ignores a candidate that is not on the board", async () => {
    await renderLoadedBoard();
    await dragTask("ghost", "s2");
    expect(spies.updateActivity).not.toHaveBeenCalled();
  });

  it("shows the dragged candidate in the overlay", async () => {
    await renderLoadedBoard();
    act(() => {
      dnd.props.onDragStart({ active: { id: "t1", data: { current: {} } } });
    });
    expect(screen.getByTestId("overlay-task")).toHaveTextContent(
      "Ada Lovelace"
    );
  });
});

describe("adding a candidate", () => {
  it("creates the candidate and drops it into the column", async () => {
    const { store } = await renderLoadedBoard();
    await act(async () => {
      await board.props.onAddTask("s2", { firstName: "Grace" });
    });

    expect(spies.createCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ pipelineStageId: "s2", tenantId: "tenant-1" })
    );
    expect(store.getState().pipeline.columns.s2.taskIds).toContain("t9");
    expect(spies.toast).toHaveBeenCalledWith(
      "Candidate added successfully!",
      "success"
    );
  });

  it("names the new candidate from the parts the API returned", async () => {
    await renderLoadedBoard();
    await act(async () => {
      await board.props.onAddTask("s2", {});
    });
    expect(board.props.data.tasks.t9.fullName).toBe("Grace Hopper");
  });

  it("refuses a column that is not on the board", async () => {
    await renderLoadedBoard();
    await act(async () => {
      await board.props.onAddTask("ghost", {});
    });

    expect(spies.toast).toHaveBeenCalledWith("Invalid column selected.", "error");
    expect(spies.createCandidate).not.toHaveBeenCalled();
  });

  it("lets a creation failure reach the modal", async () => {
    spies.createCandidate.mockRejectedValue(new Error("duplicate email"));
    await renderLoadedBoard();

    await expect(
      act(async () => {
        await board.props.onAddTask("s2", {});
      })
    ).rejects.toThrow("duplicate email");
  });

  it("opens the add-client modal from the header button", async () => {
    await renderLoadedBoard();
    fireEvent.click(screen.getByText("Add new candidate"));
    expect(screen.getByTestId("add-client-modal")).toBeInTheDocument();
  });

  it("hides the header button from a role that cannot create candidates", async () => {
    await renderLoadedBoard({ permissions: ["view_pipeline"] });
    expect(screen.queryByText("Add new candidate")).not.toBeInTheDocument();
  });

  it("submits the add-client modal into the chosen stage", async () => {
    await renderLoadedBoard();
    act(() => {
      board.props.onOpenAddClientModal("s2");
    });
    await act(async () => {
      fireEvent.click(screen.getByText("save candidate"));
    });

    expect(spies.createCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ pipelineStageId: "s2", firstName: "Ada" })
    );
  });

  it("closes the add-client modal again", async () => {
    await renderLoadedBoard();
    fireEvent.click(screen.getByText("Add new candidate"));
    fireEvent.click(screen.getByText("close client modal"));
    expect(screen.queryByTestId("add-client-modal")).not.toBeInTheDocument();
  });
});

describe("deleting a candidate", () => {
  const openDeletePrompt = async () => {
    const view = await renderLoadedBoard();
    act(() => {
      board.props.onRemoveTask("t1");
    });
    return view;
  };

  it("asks before deleting", async () => {
    await openDeletePrompt();
    expect(
      screen.getByText("Are you sure you want to delete 1 candidate(s)?")
    ).toBeInTheDocument();
  });

  it("deletes the candidate and takes it off the board", async () => {
    const { store } = await openDeletePrompt();
    await act(async () => {
      fireEvent.click(screen.getByText("confirm delete"));
    });

    expect(spies.deleteItem).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ["t1"] })
    );
    expect(store.getState().pipeline.columns.s1.taskIds).toEqual([]);
    expect(spies.toast).toHaveBeenCalledWith(
      "Deleted 1 candidate(s) successfully!",
      "success"
    );
  });

  it("reports a deletion the server refused", async () => {
    spies.deleteItem.mockResolvedValue({ status: "error" });
    await openDeletePrompt();
    await act(async () => {
      fireEvent.click(screen.getByText("confirm delete"));
    });

    expect(spies.apiError).toHaveBeenCalledWith(
      expect.any(Error),
      "DELETE_CANDIDATE"
    );
  });

  it("refuses a deletion from a role without candidate management rights", async () => {
    await renderLoadedBoard({ permissions: ["view_pipeline"] });
    act(() => {
      board.props.onRemoveTask("t1");
    });
    await act(async () => {
      fireEvent.click(screen.getByText("confirm delete"));
    });
    expect(spies.deleteItem).not.toHaveBeenCalled();
  });

  it("drops the selection when the prompt is dismissed", async () => {
    await openDeletePrompt();
    fireEvent.click(screen.getByText("cancel delete"));
    expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
  });
});

describe("stages", () => {
  const openColumnDeletePrompt = async (columnId, options) => {
    const view = await renderLoadedBoard(options);
    act(() => {
      board.props.onDeleteColumn(columnId);
    });
    return view;
  };

  it("explains that candidates move to the first column", async () => {
    await openColumnDeletePrompt("s2");
    expect(
      screen.getByText(
        "All candidates within this column will be moved to the first column."
      )
    ).toBeInTheDocument();
  });

  it("explains that an empty first column is safe to delete", async () => {
    await openColumnDeletePrompt("s1");
    expect(
      screen.getByText("This column can be deleted since it has no candidates.")
    ).toBeInTheDocument();
  });

  it("refuses to delete the first column while it holds candidates", async () => {
    const { store } = await renderLoadedBoard();
    await seedColumn(store, "s1", ["t1"]);
    act(() => {
      board.props.onDeleteColumn("s1");
    });
    await act(async () => {
      fireEvent.click(screen.getByText("confirm delete"));
    });

    expect(spies.toast).toHaveBeenCalledWith(
      "Cannot delete first column with candidates. Move or delete candidates first.",
      "error"
    );
    expect(spies.deleteStage).not.toHaveBeenCalled();
  });

  it("moves a later column's candidates to the first column before deleting", async () => {
    const { store } = await renderLoadedBoard();
    await seedColumn(store, "s2", ["t2"]);
    act(() => {
      board.props.onDeleteColumn("s2");
    });
    await act(async () => {
      fireEvent.click(screen.getByText("confirm delete"));
    });

    expect(spies.updateActivity).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ["t2"], pipelineStageId: "s1" })
    );
    expect(store.getState().pipeline.columns.s1.taskIds).toContain("t2");
    expect(store.getState().pipeline.columns.s2).toBeUndefined();
    expect(spies.toast).toHaveBeenCalledWith(
      "Column deleted successfully!",
      "success"
    );
  });

  it("deletes an empty column outright", async () => {
    const { store } = await openColumnDeletePrompt("s2");
    await act(async () => {
      fireEvent.click(screen.getByText("confirm delete"));
    });

    expect(spies.updateActivity).not.toHaveBeenCalled();
    expect(store.getState().pipeline.columns.s2).toBeUndefined();
  });

  it("reports a column deletion the server refused", async () => {
    spies.deleteStage.mockRejectedValue(new Error("stage in use"));
    await openColumnDeletePrompt("s2");
    await act(async () => {
      fireEvent.click(screen.getByText("confirm delete"));
    });

    expect(spies.apiError).toHaveBeenCalledWith(expect.any(Error), "DELETE_COLUMN");
  });

  it("creates a stage from the add-column modal and closes it", async () => {
    await renderLoadedBoard();
    act(() => {
      board.props.onAddColumn(1);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("save column"));
    });

    expect(spies.createStage).toHaveBeenCalledWith(
      expect.objectContaining({
        pipelineId: "p1",
        name: "Screening",
        colourCode: "#abcdef",
      })
    );
    expect(spies.fetchStages).toHaveBeenCalled();
    expect(spies.toast).toHaveBeenCalledWith(
      "Stage created successfully!",
      "success"
    );
    expect(screen.queryByTestId("add-column-modal")).not.toBeInTheDocument();
  });

  it("keeps the add-column modal open when creation fails", async () => {
    spies.createStage.mockRejectedValue(new Error("duplicate stage"));
    await renderLoadedBoard();
    act(() => {
      board.props.onAddColumn(0);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("save column"));
    });

    expect(spies.apiError).toHaveBeenCalledWith(expect.any(Error), "CREATE_STAGE");
    expect(screen.getByTestId("add-column-modal")).toBeInTheDocument();
  });

  it("refuses to create a stage before the pipeline has loaded", async () => {
    await renderLoadedBoard({ pipeline: null });
    act(() => {
      board.props.onAddColumn(0);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("save column"));
    });

    expect(spies.toast).toHaveBeenCalledWith(
      "Pipeline not loaded yet. Please wait.",
      "error"
    );
    expect(spies.createStage).not.toHaveBeenCalled();
  });

  it("names an unnamed stage before sending it", async () => {
    stagesRespondWith([]);
    renderBoard();
    await waitFor(() =>
      expect(screen.getByText("add first stage")).toBeInTheDocument()
    );
    await act(async () => {
      fireEvent.click(screen.getByText("add first stage"));
    });

    expect(spies.createStage).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Intake", colourCode: "#1E40AF" })
    );
  });

  it("closes the add-column modal on its own close button", async () => {
    await renderLoadedBoard();
    act(() => {
      board.props.onAddColumn(0);
    });
    fireEvent.click(screen.getByText("close column modal"));
    expect(screen.queryByTestId("add-column-modal")).not.toBeInTheDocument();
  });
});

describe("candidate navigation and selection", () => {
  it("opens a candidate's client record", async () => {
    await renderLoadedBoard();
    act(() => {
      board.props.onViewCandidate("cl-1", "tenant-1");
    });
    expect(spies.navigate).toHaveBeenCalledWith(
      "/client/client-single/cl-1/tenant-1"
    );
  });

  it("adds and removes a candidate from the selection", async () => {
    await renderLoadedBoard();
    act(() => {
      board.props.toggleTaskSelection("t1");
    });
    expect(board.props.selectedTaskIds).toEqual(["t1"]);

    act(() => {
      board.props.toggleTaskSelection("t1");
    });
    expect(board.props.selectedTaskIds).toEqual([]);
  });
});

describe("the load watchdog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("gives up on a load that never comes back", async () => {
    // The pipeline request is left hanging, so the loading counter never falls
    // back to zero and the thirty-second escape hatch is the only way out.
    spies.fetchPipeline.mockReturnValue(new Promise(() => {}));
    renderBoard();

    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    expect(spies.toast).toHaveBeenCalledWith(
      "Operation timed out. Please try again.",
      "error"
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("responses the loader has to make do with", () => {
  it("treats a stage response with no payload as no stages", async () => {
    spies.getPipelineStage.mockReset();
    spies.getPipelineStage.mockResolvedValue({});
    renderBoard();
    await waitFor(() =>
      expect(spies.toast).toHaveBeenCalledWith(
        "No stages found for pipeline.",
        "warning"
      )
    );
  });

  it("leaves a candidate with no client record an empty client id", async () => {
    spies.fetchItems.mockImplementation(({ stageId }) =>
      stageId === "s1" ? { items: [{ id: "t1", fullName: "Ada" }] } : { items: [] }
    );
    await renderLoadedBoard();
    expect(board.props.data.tasks.t1.clientId).toBe("");
  });
});

describe("the developer-only warnings", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("says nothing about a stage with no id outside development", async () => {
    vi.stubEnv("DEV", false);
    stagesRespondWith([{ colourCode: "#ffffff" }, stage("s1", "Applied", "#111111")]);
    await renderLoadedBoard();
    expect(board.props.data.columnOrder).toEqual(["s1"]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("says nothing about an unusable candidate id outside development", async () => {
    vi.stubEnv("DEV", false);
    spies.fetchItems.mockImplementation(({ stageId }) =>
      stageId === "s1" ? { items: [{ id: 7 }] } : { items: [] }
    );
    await renderLoadedBoard();
    expect(board.props.data.tasks).toEqual({});
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("does not log the slice's failure outside development", async () => {
    vi.stubEnv("DEV", false);
    renderBoard({ status: "failed" });
    await waitFor(() =>
      expect(
        screen.getByText(/Something went wrong loading the pipeline/)
      ).toBeInTheDocument()
    );
    expect(errorSpy).not.toHaveBeenCalledWith("Pipeline error:", expect.anything());
  });
});

describe("drags the board cannot act on", () => {
  const dragTask = async (activeId, overId) =>
    act(async () => {
      await dnd.props.onDragEnd({
        active: { id: activeId, data: { current: { type: "Task" } } },
        over: { id: overId },
      });
    });

  it("ignores a drop on something that is neither a column nor a card", async () => {
    const { store } = await renderLoadedBoard();
    await seedColumn(store, "s1", ["t1"]);
    await dragTask("t1", "somewhere-else");

    expect(spies.updateActivity).not.toHaveBeenCalled();
    expect(store.getState().pipeline.columns.s1.taskIds).toEqual(["t1"]);
  });

  it("ignores a card the board holds no record of", async () => {
    // The column claims the id, but the fetch never produced a task for it.
    const { store } = await renderLoadedBoard();
    await seedColumn(store, "s1", ["ghost"]);
    await dragTask("ghost", "s2");

    expect(spies.updateActivity).not.toHaveBeenCalled();
    expect(store.getState().pipeline.columns.s2.taskIds).toEqual([]);
  });

  it("does nothing when a card is dropped back on itself", async () => {
    spies.fetchItems.mockImplementation(({ stageId }) =>
      stageId === "s1"
        ? { items: [candidate("t1", "Ada"), candidate("t2", "Grace")] }
        : { items: [] }
    );
    const { store } = await renderLoadedBoard();
    await seedColumn(store, "s1", ["t1", "t2"]);
    await dragTask("t1", "t1");

    expect(spies.updateActivity).not.toHaveBeenCalled();
    expect(store.getState().pipeline.columns.s1.taskIds).toEqual(["t1", "t2"]);
  });

  it("reports a reorder within one column that the server rejected", async () => {
    spies.updateActivity.mockRejectedValue(new Error("nope"));
    spies.fetchItems.mockImplementation(({ stageId }) =>
      stageId === "s1"
        ? { items: [candidate("t1", "Ada"), candidate("t2", "Grace")] }
        : { items: [] }
    );
    const { store } = await renderLoadedBoard();
    await seedColumn(store, "s1", ["t1", "t2"]);
    await dragTask("t1", "t2");

    expect(spies.toast).toHaveBeenCalledWith(
      "Failed to update task order.",
      "error"
    );
  });

  it("drops a card into the place of the card it landed on", async () => {
    spies.fetchItems.mockImplementation(({ stageId }) =>
      stageId === "s1"
        ? { items: [candidate("t1", "Ada")] }
        : { items: [candidate("t2", "Grace")] }
    );
    const { store } = await renderLoadedBoard();
    await seedColumn(store, "s1", ["t1"]);
    await seedColumn(store, "s2", ["t2"]);
    await dragTask("t1", "t2");

    // Dropped on a card rather than on the column, so it takes that card's
    // index instead of going to the end.
    expect(store.getState().pipeline.columns.s2.taskIds).toEqual(["t1", "t2"]);
    expect(spies.updateActivity).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ["t1"], pipelineStageId: "s2" })
    );
  });
});

describe("a candidate the creation API describes sparsely", () => {
  it("labels a candidate returned with nothing but an id", async () => {
    spies.createCandidate.mockResolvedValue({ data: { id: "t9" } });
    await renderLoadedBoard();
    await act(async () => {
      await board.props.onAddTask("s2", { firstName: "Grace" });
    });

    expect(board.props.data.tasks.t9).toMatchObject({
      id: "t9",
      firstName: "",
      lastName: "",
      fullName: "New Candidate",
      createdBy: "Unknown Admin",
      clientPortalAccess: false,
    });
  });

  it("treats a creation that returned no record as a failure", async () => {
    spies.createCandidate.mockResolvedValue({});
    await renderLoadedBoard();
    await act(async () => {
      await expect(
        board.props.onAddTask("s2", { firstName: "Grace" })
      ).rejects.toThrow("Failed to create candidate");
    });
    expect(spies.toast).not.toHaveBeenCalledWith(
      "Candidate added successfully!",
      "success"
    );
  });
});

describe("deleting a candidate that a column still lists", () => {
  it("takes the candidate out of the column that held it", async () => {
    const { store } = await renderLoadedBoard();
    await seedColumn(store, "s1", ["t1"]);
    act(() => {
      board.props.onRemoveTask("t1");
    });
    await act(async () => {
      fireEvent.click(screen.getByText("confirm delete"));
    });

    expect(store.getState().pipeline.columns.s1.taskIds).toEqual([]);
    expect(spies.toast).toHaveBeenCalledWith(
      "Deleted 1 candidate(s) successfully!",
      "success"
    );
  });
});

describe("stage creation the server answers emptily", () => {
  it("closes the modal without announcing a stage that was never returned", async () => {
    spies.createStage.mockResolvedValue({});
    await renderLoadedBoard();
    act(() => {
      board.props.onAddColumn(0);
    });
    await act(async () => {
      fireEvent.click(screen.getByText("save column"));
    });

    expect(spies.toast).not.toHaveBeenCalledWith(
      "Stage created successfully!",
      "success"
    );
    expect(screen.queryByTestId("add-column-modal")).not.toBeInTheDocument();
  });
});

describe("dismissing the column delete prompt", () => {
  it("forgets the column it was asked about", async () => {
    await renderLoadedBoard();
    act(() => {
      board.props.onDeleteColumn("s2");
    });
    expect(screen.getByTestId("delete-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByText("cancel delete"));
    expect(screen.queryByTestId("delete-modal")).not.toBeInTheDocument();
    expect(spies.deleteStage).not.toHaveBeenCalled();
  });
});
