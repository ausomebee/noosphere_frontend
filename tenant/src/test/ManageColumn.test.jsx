import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

/**
 * ManageColumn is the single-pipeline-stage screen: a "Basic setup" tab that
 * edits the stage's name, description and colour, and an "Intake Candidates"
 * tab holding the stage's candidates in a CustomTable.
 *
 * Everything it does goes through redux thunks, so react-redux is replaced
 * wholesale here: `useSelector` reads a plain object the test owns, and
 * `useDispatch` hands back a spy that turns a mocked thunk into an object with
 * an `unwrap()` resolving from a per-thunk queue. That keeps the fetch arms
 * (resolved / empty / malformed / rejected) under direct control without
 * standing up the real slice, whose thunks would go out to axios.
 *
 * The draft the component renders comes from the store rather than from the
 * dispatches it makes, so the "fills the draft" tests assert on the
 * `updateDraft` payload instead of on the DOM.
 *
 * The modals and the table are probes that expose their callbacks as buttons.
 * `handleAddCandidate` and `handleDeleteStage` deliberately re-throw so the
 * modal can stay open, and an unhandled rejection out of a probe click would
 * fail the run -- so both probes swallow the rejection into `probes.errors`,
 * which is also how those throwing arms are asserted.
 */

const auth = vi.hoisted(() => ({
  tenantId: "tenant-1",
  accessToken: "at",
  refreshToken: "rt",
  userId: "user-9",
}));
vi.mock("../hooks/useAuth", () => ({ default: () => auth }));
vi.mock("../hooks/useFormatSettings", () => ({
  default: () => ({ dateFormat: "MM/dd/yyyy" }),
}));

const route = vi.hoisted(() => ({ pipelineStageId: "stage-1" }));
const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
  useParams: () => route,
}));

const api = vi.hoisted(() => ({
  GetPipelineStage: vi.fn(),
  UpdatePipelineStage: vi.fn(),
}));
vi.mock("../api/TenantApis", () => ({ default: api }));

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
}));

// Each thunk creator becomes a tagged plain object; the dispatch spy turns the
// tag back into the queued result so a test can decide per call.
const redux = vi.hoisted(() => {
  const results = {};
  const dispatch = vi.fn((action) => {
    const name = action && action.__thunk;
    if (!name) return action;
    // Producing the value inside `unwrap` keeps a thrown fixture on the
    // promise, the way a rejected thunk reaches the component.
    return {
      unwrap: () => {
        try {
          const queued = results[name];
          const value = typeof queued === "function" ? queued() : queued;
          return Promise.resolve(value ?? {});
        } catch (error) {
          return Promise.reject(error);
        }
      },
    };
  });
  return { results, dispatch, state: { pipeline: {} } };
});

vi.mock("react-redux", () => ({
  useDispatch: () => redux.dispatch,
  useSelector: (selector) => selector(redux.state),
}));

vi.mock("../ReduxStore/features/PipelineSlice", () => {
  const thunk = (name) => (arg) => ({ __thunk: name, arg });
  return {
    updateDraft: (arg) => ({ type: "pipeline/updateDraft", payload: arg }),
    resetDraft: () => ({ type: "pipeline/resetDraft" }),
    fetchSinglePipelineStages: thunk("fetchSinglePipelineStages"),
    fetchPipelineStages: thunk("fetchPipelineStages"),
    fetchPipelineItems: thunk("fetchPipelineItems"),
    deletePipelineItem: thunk("deletePipelineItem"),
    deletePipelineStage: thunk("deletePipelineStage"),
    createCandidate: thunk("createCandidate"),
  };
});

vi.mock("../Layout/TenantLayout", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

const probes = vi.hoisted(() => ({ props: {}, errors: [] }));

vi.mock("../Components/ColorPicker", () => ({
  default: (received) => {
    probes.props.colorPicker = received;
    return (
      <div data-testid="color-picker">
        <button onClick={() => received.onChange("#ABCDEF")}>pick-colour</button>
        <button onClick={received.onClose}>close-colour</button>
      </div>
    );
  },
}));

// Both delete modals are mounted at once, so each records under its own title.
vi.mock("../Components/ReusableModal/PipelineModal/DeleteConfirmationModal", () => ({
  default: (received) => {
    probes.props[received.confirmButtonText] = received;
    return received.isOpen ? (
      <div data-testid={`delete-${received.confirmButtonText}`}>
        <p>{received.title}</p>
        <button
          onClick={() =>
            Promise.resolve(received.onConfirm()).catch((e) => probes.errors.push(e))
          }
        >
          {`confirm-${received.confirmButtonText}`}
        </button>
        <button onClick={received.onClose}>{`cancel-${received.confirmButtonText}`}</button>
      </div>
    ) : null;
  },
}));

const NEW_CANDIDATE = { firstName: "Ada", lastName: "Lovelace" };
vi.mock("../Components/ReusableModal/ClientModal/AddClientModal", () => ({
  default: (received) => {
    probes.props.addClient = received;
    return received.isOpen ? (
      <div data-testid="add-client">
        <button
          onClick={() =>
            Promise.resolve(received.onSubmit(NEW_CANDIDATE)).catch((e) =>
              probes.errors.push(e)
            )
          }
        >
          submit-candidate
        </button>
      </div>
    ) : null;
  },
}));

vi.mock("../Components/Table/CustomTable", () => ({
  default: (received) => {
    probes.props.table = received;
    return (
      <div data-testid="table">
        {received.data.map((row) => (
          <div key={row.id} data-testid="row">
            {`${row.client} | ${row.added_by} | ${row.dateTime}`}
          </div>
        ))}
        {received.actions.map((action) => (
          <button
            key={action.label}
            onClick={() => action.onClick(received.data[0])}
          >
            {`action-${action.label}`}
          </button>
        ))}
        <button onClick={() => received.onSelectionChange([0], received.data)}>
          select-all
        </button>
        <button onClick={() => received.onDelete(["bulk-1", "bulk-2"])}>
          bulk-delete
        </button>
      </div>
    );
  },
}));

import ManageColumn from "../Components/ManageColumn/ManageColumn";

const STAGE = {
  data: { id: "stage-1", name: "Screening", description: "First pass", colourCode: "#123456" },
};

const ITEM = {
  id: "item-1",
  fullName: "Ada Lovelace",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phoneNumber: "555",
  createdBy: "Grace",
  createdAt: "2026-01-15T00:00:00.000Z",
};

const renderScreen = () => render(<ManageColumn />);

// The mount effect fires three fetches whose promises resolve on the
// microtask queue; flushing them here keeps every test past the first paint.
const settle = () => act(async () => {});

const draftPayloads = () =>
  redux.dispatch.mock.calls
    .map(([action]) => action)
    .filter((action) => action.type === "pipeline/updateDraft")
    .map((action) => action.payload);

const goToCandidates = () => fireEvent.click(screen.getByText(/Intake Candidates/));

beforeEach(() => {
  vi.clearAllMocks();
  probes.props = {};
  probes.errors = [];
  route.pipelineStageId = "stage-1";
  auth.tenantId = "tenant-1";
  redux.state = { pipeline: { pipeline: null, draft: {}, status: "idle" } };
  redux.results.fetchSinglePipelineStages = () => STAGE;
  redux.results.fetchPipelineItems = () => ({ items: [ITEM] });
  redux.results.fetchPipelineStages = () => ({});
  redux.results.createCandidate = () => ({ data: { id: "new-1" } });
  redux.results.deletePipelineItem = () => ({ status: "ok" });
  redux.results.deletePipelineStage = () => ({});
  api.GetPipelineStage.mockResolvedValue({ data: { data: [] } });
  api.UpdatePipelineStage.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the header and the tabs", () => {
  it("titles the screen with the draft's name", async () => {
    redux.state.pipeline.draft = { name: "Screening" };
    renderScreen();
    await settle();
    expect(screen.getByRole("heading", { name: "Screening" })).toBeInTheDocument();
  });

  it("falls back to a generic title while the draft is still empty", async () => {
    renderScreen();
    await settle();
    expect(screen.getByRole("heading", { name: "Pipeline Stage" })).toBeInTheDocument();
  });

  it("goes back a page when the header is clicked", async () => {
    const { container } = renderScreen();
    await settle();
    fireEvent.click(container.querySelector(".manage-column-header"));
    expect(navigate).toHaveBeenCalledWith(-1);
  });

  it("swaps the basic setup for the candidate table and back", async () => {
    renderScreen();
    await settle();
    expect(screen.getByPlaceholderText("Enter column name")).toBeInTheDocument();

    goToCandidates();
    expect(screen.getByTestId("table")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Enter column name")).toBeNull();

    fireEvent.click(screen.getByText("Basic setup"));
    expect(screen.getByPlaceholderText("Enter column name")).toBeInTheDocument();
  });
});

describe("loading the stage", () => {
  it("copies the fetched stage into the draft", async () => {
    renderScreen();
    await waitFor(() => expect(draftPayloads()).toHaveLength(1));
    expect(draftPayloads()[0]).toEqual({
      id: "stage-1",
      name: "Screening",
      description: "First pass",
      colorCode: "#123456",
    });
  });

  it("substitutes blanks and the house blue for a bare stage", async () => {
    redux.results.fetchSinglePipelineStages = () => ({ data: { id: "stage-1" } });
    renderScreen();
    await waitFor(() => expect(draftPayloads()).toHaveLength(1));
    expect(draftPayloads()[0]).toEqual({
      id: "stage-1",
      name: "",
      description: "",
      colorCode: "#1E40AF",
    });
  });

  it("leaves the draft alone when the fetch carries no stage", async () => {
    redux.results.fetchSinglePipelineStages = () => ({ data: null });
    renderScreen();
    await settle();
    // The item fetch runs in the same effect, so a populated count proves the
    // stage fetch has already resolved without touching the draft.
    expect(document.body.querySelector(".candidate-count").textContent).toBe("1");
    expect(draftPayloads()).toHaveLength(0);
  });

  it("swallows a rejected stage fetch", async () => {
    redux.results.fetchSinglePipelineStages = () => {
      throw new Error("stage boom");
    };
    renderScreen();
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(draftPayloads()).toHaveLength(0);
    expect(screen.getByRole("heading", { name: "Pipeline Stage" })).toBeInTheDocument();
  });

  it("fetches nothing when the route carries no stage id", async () => {
    route.pipelineStageId = undefined;
    renderScreen();
    await settle();
    expect(
      redux.dispatch.mock.calls.filter(([a]) => a.__thunk === "fetchSinglePipelineStages")
    ).toHaveLength(0);
    expect(api.GetPipelineStage).not.toHaveBeenCalled();
  });

  it("resets the draft when it unmounts", async () => {
    const { unmount } = renderScreen();
    await settle();
    unmount();
    expect(redux.dispatch).toHaveBeenCalledWith({ type: "pipeline/resetDraft" });
  });
});

describe("the candidate list", () => {
  it("maps a full item into a table row and counts it on the tab", async () => {
    renderScreen();
    await settle();
    goToCandidates();
    expect(screen.getByText("Ada Lovelace | Grace | 01/15/2026")).toBeInTheDocument();
    expect(document.body.querySelector(".candidate-count").textContent).toBe("1");
  });

  it("builds a name from the parts when the item has no full name", async () => {
    redux.results.fetchPipelineItems = () => ({
      items: [{ id: "a", firstName: "Grace", lastName: "Hopper" }],
    });
    renderScreen();
    await settle();
    goToCandidates();
    expect(screen.getByText(/Grace Hopper/)).toBeInTheDocument();
  });

  it("labels a nameless item and an authorless one", async () => {
    // "Unknown Candidate" is only reachable with empty strings: see below.
    redux.results.fetchPipelineItems = () => ({
      items: [{ id: "a", firstName: "", lastName: "" }],
    });
    renderScreen();
    await settle();
    goToCandidates();
    expect(screen.getByText(/Unknown Candidate \| Unknown Admin/)).toBeInTheDocument();
    expect(probes.props.table.data[0]).toMatchObject({
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
    });
  });

  it("prints the word undefined when an item carries no name fields at all", async () => {
    // The name falls back through `${firstName} ${lastName}`, which stringifies
    // two missing fields into a truthy "undefined undefined" and so never
    // reaches "Unknown Candidate". Asserted as-is rather than as intended.
    redux.results.fetchPipelineItems = () => ({ items: [{ id: "a" }] });
    renderScreen();
    await settle();
    goToCandidates();
    expect(probes.props.table.data[0].client).toBe("undefined undefined");
  });

  it("empties the table when the item fetch rejects", async () => {
    redux.results.fetchPipelineItems = () => {
      throw new Error("items boom");
    };
    renderScreen();
    await settle();
    goToCandidates();
    expect(console.error).toHaveBeenCalledWith(
      "Failed to fetch pipeline items:",
      expect.any(Error)
    );
    expect(probes.props.table.data).toEqual([]);
    expect(document.body.querySelector(".candidate-count").textContent).toBe("0");
  });
});

describe("the sibling stage lookup", () => {
  it("asks the api for the pipeline's stages once a pipeline is loaded", async () => {
    redux.state.pipeline.pipeline = { id: "pipe-1" };
    renderScreen();
    await waitFor(() =>
      expect(api.GetPipelineStage).toHaveBeenCalledWith({
        pipelineId: "pipe-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
  });

  it("skips the api entirely when no pipeline is loaded", async () => {
    renderScreen();
    await settle();
    expect(api.GetPipelineStage).not.toHaveBeenCalled();
  });

  it("copes with a stage payload that has no data at all", async () => {
    redux.state.pipeline.pipeline = { id: "pipe-1" };
    api.GetPipelineStage.mockResolvedValue({});
    renderScreen();
    await waitFor(() => expect(api.GetPipelineStage).toHaveBeenCalled());
    expect(screen.getByRole("heading", { name: "Pipeline Stage" })).toBeInTheDocument();
  });

  it("names an unnamed sibling stage rather than dropping it", async () => {
    redux.state.pipeline.pipeline = { id: "pipe-1" };
    api.GetPipelineStage.mockResolvedValue({ data: { data: [{ id: "s2" }] } });
    renderScreen();
    await waitFor(() => expect(api.GetPipelineStage).toHaveBeenCalled());
    expect(console.error).not.toHaveBeenCalled();
  });

  it("logs and carries on when the stage lookup rejects", async () => {
    redux.state.pipeline.pipeline = { id: "pipe-1" };
    api.GetPipelineStage.mockRejectedValue(new Error("stages boom"));
    renderScreen();
    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        "Failed to fetch stages:",
        expect.any(Error)
      )
    );
  });
});

describe("saving the basic setup", () => {
  const save = () => fireEvent.click(screen.getByText("Save Changes"));

  it("sends the draft to the api and reports success", async () => {
    redux.state.pipeline.draft = {
      name: "Screening",
      description: "First pass",
      colorCode: "#123456",
    };
    renderScreen();
    await settle();
    save();

    await waitFor(() =>
      expect(api.UpdatePipelineStage).toHaveBeenCalledWith({
        id: "stage-1",
        name: "Screening",
        description: "First pass",
        colourCode: "#123456",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith(
      "Stage information updated successfully!",
      "success"
    );
  });

  it("shows the server's own complaint when the save fails", async () => {
    api.UpdatePipelineStage.mockRejectedValue({
      response: { data: { message: "Name already taken" } },
    });
    renderScreen();
    await settle();
    save();
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Name already taken", "error")
    );
  });

  it("falls back to a generic complaint when the failure carries no message", async () => {
    api.UpdatePipelineStage.mockRejectedValue(new Error("network"));
    renderScreen();
    await settle();
    save();
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        "Failed to update stage information",
        "error"
      )
    );
  });

  it("does not call the api at all without a stage id", async () => {
    route.pipelineStageId = "";
    renderScreen();
    await settle();
    save();
    expect(api.UpdatePipelineStage).not.toHaveBeenCalled();
  });

  it("covers the screen while the save is in flight", async () => {
    let release;
    api.UpdatePipelineStage.mockReturnValue(new Promise((r) => (release = r)));
    renderScreen();
    await settle();
    save();
    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
    release({});
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
  });
});

describe("editing the stage's fields", () => {
  it("pushes each keystroke of the name and description into the draft", async () => {
    renderScreen();
    await settle();
    fireEvent.change(screen.getByPlaceholderText("Enter column name"), {
      target: { value: "Intake" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter description"), {
      target: { value: "Notes" },
    });
    expect(draftPayloads()).toContainEqual({ name: "Intake" });
    expect(draftPayloads()).toContainEqual({ description: "Notes" });
  });

  it("paints the swatch black until the draft names a colour", async () => {
    const { container } = renderScreen();
    await settle();
    expect(container.querySelector(".color-preview").style.backgroundColor).toBe(
      "rgb(0, 0, 0)"
    );
  });

  it("paints the swatch with the draft's colour", async () => {
    redux.state.pipeline.draft = { colorCode: "#123456" };
    const { container } = renderScreen();
    await settle();
    expect(container.querySelector(".color-preview").style.backgroundColor).toBe(
      "rgb(18, 52, 86)"
    );
  });

  it("opens the picker from the swatch and closes it again", async () => {
    const { container } = renderScreen();
    await settle();
    fireEvent.click(container.querySelector(".color-preview"));
    expect(screen.getByTestId("color-picker")).toBeInTheDocument();

    fireEvent.click(screen.getByText("close-colour"));
    expect(screen.queryByTestId("color-picker")).toBeNull();
  });

  it("opens the picker from the Change link", async () => {
    renderScreen();
    await settle();
    fireEvent.click(screen.getByText("Change"));
    expect(screen.getByTestId("color-picker")).toBeInTheDocument();
  });

  it("opens the picker from the keyboard with Enter or Space but not another key", async () => {
    const { container } = renderScreen();
    await settle();
    const swatch = container.querySelector(".color-preview");

    fireEvent.keyDown(swatch, { key: "Escape" });
    expect(screen.queryByTestId("color-picker")).toBeNull();

    fireEvent.keyDown(swatch, { key: "Enter" });
    expect(screen.getByTestId("color-picker")).toBeInTheDocument();
    fireEvent.click(screen.getByText("close-colour"));

    fireEvent.keyDown(swatch, { key: " " });
    expect(screen.getByTestId("color-picker")).toBeInTheDocument();
  });

  it("writes the chosen colour into the draft", async () => {
    renderScreen();
    await settle();
    fireEvent.click(screen.getByText("Change"));
    fireEvent.click(screen.getByText("pick-colour"));
    expect(draftPayloads()).toContainEqual({ colorCode: "#ABCDEF" });
  });
});

describe("adding a candidate", () => {
  const openAdd = async () => {
    renderScreen();
    await settle();
    goToCandidates();
    fireEvent.click(screen.getByText("Add new candidate"));
  };

  it("creates the candidate and reloads the table", async () => {
    await openAdd();
    redux.dispatch.mockClear();
    fireEvent.click(screen.getByText("submit-candidate"));

    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Candidate added successfully!", "success")
    );
    const created = redux.dispatch.mock.calls
      .map(([a]) => a)
      .find((a) => a.__thunk === "createCandidate");
    expect(created.arg).toEqual({
      ...NEW_CANDIDATE,
      tenantId: "tenant-1",
      pipelineStageId: "stage-1",
      createdBy: "user-9",
      accessToken: "at",
      refreshToken: "rt",
    });
    // The refresh re-runs the item fetch.
    expect(
      redux.dispatch.mock.calls.filter(([a]) => a.__thunk === "fetchPipelineItems")
    ).toHaveLength(1);
  });

  it("refuses to create anything without a tenant", async () => {
    auth.tenantId = "";
    await openAdd();
    fireEvent.click(screen.getByText("submit-candidate"));

    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        "Pipeline stage ID or Tenant ID is not available.",
        "error"
      )
    );
    expect(
      redux.dispatch.mock.calls.filter(([a]) => a.__thunk === "createCandidate")
    ).toHaveLength(0);
  });

  it("throws back to the modal when the server returns no candidate", async () => {
    redux.results.createCandidate = () => ({ data: null });
    await openAdd();
    fireEvent.click(screen.getByText("submit-candidate"));

    await waitFor(() => expect(probes.errors).toHaveLength(1));
    expect(probes.errors[0].message).toBe("Failed to create candidate");
    expect(toast.showToast).not.toHaveBeenCalled();
  });

  it("closes the modal when the modal asks to be closed", async () => {
    await openAdd();
    expect(screen.getByTestId("add-client")).toBeInTheDocument();
    probes.props.addClient.onClose();
    await waitFor(() => expect(screen.queryByTestId("add-client")).toBeNull());
  });
});

describe("deleting candidates", () => {
  const arrive = async () => {
    renderScreen();
    await settle();
    goToCandidates();
    expect(probes.props.table.data).toHaveLength(1);
  };

  it("deletes the single candidate behind a row's trash icon", async () => {
    await arrive();
    fireEvent.click(screen.getByText("action-Delete"));
    expect(screen.getByTestId("delete-Delete")).toBeInTheDocument();
    expect(
      screen.getByText("Are you sure you want to delete 1 candidate(s)?")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("confirm-Delete"));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        "Deleted 1 candidate(s) successfully!",
        "success"
      )
    );
    const del = redux.dispatch.mock.calls
      .map(([a]) => a)
      .find((a) => a.__thunk === "deletePipelineItem");
    expect(del.arg.ids).toEqual(["item-1"]);
    expect(screen.queryByTestId("delete-Delete")).toBeNull();
  });

  it("deletes every id the table hands over in bulk", async () => {
    await arrive();
    fireEvent.click(screen.getByText("bulk-delete"));
    fireEvent.click(screen.getByText("confirm-Delete"));

    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        "Deleted 2 candidate(s) successfully!",
        "success"
      )
    );
    const del = redux.dispatch.mock.calls
      .map(([a]) => a)
      .find((a) => a.__thunk === "deletePipelineItem");
    expect(del.arg.ids).toEqual(["bulk-1", "bulk-2"]);
  });

  it("does nothing at all when nothing is selected", async () => {
    await arrive();
    fireEvent.click(screen.getByText("bulk-delete"));
    // Emptying the selection through the table leaves the modal open with
    // nothing to act on.
    fireEvent.click(screen.getByText("select-all"));
    fireEvent.click(screen.getByText("cancel-Delete"));
    fireEvent.click(screen.getByText("action-Delete"));
    fireEvent.click(screen.getByText("cancel-Delete"));

    probes.props.Delete.onConfirm();
    expect(
      redux.dispatch.mock.calls.filter(([a]) => a.__thunk === "deletePipelineItem")
    ).toHaveLength(0);
  });

  it("keeps the modal open and complains when the server refuses", async () => {
    redux.results.deletePipelineItem = () => ({ status: "error" });
    await arrive();
    fireEvent.click(screen.getByText("action-Delete"));
    fireEvent.click(screen.getByText("confirm-Delete"));

    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to delete candidate(s).", "error")
    );
    expect(screen.getByTestId("delete-Delete")).toBeInTheDocument();
  });

  it("prefers the server's message when the delete rejects", async () => {
    redux.results.deletePipelineItem = () => {
      throw Object.assign(new Error("nope"), {
        response: { data: { message: "Candidate is locked" } },
      });
    };
    await arrive();
    fireEvent.click(screen.getByText("action-Delete"));
    fireEvent.click(screen.getByText("confirm-Delete"));

    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Candidate is locked", "error")
    );
  });

  it("drops the selection when the modal is dismissed", async () => {
    await arrive();
    fireEvent.click(screen.getByText("action-Delete"));
    fireEvent.click(screen.getByText("cancel-Delete"));
    expect(screen.queryByTestId("delete-Delete")).toBeNull();
    expect(probes.props.Delete.title).toBe(
      "Are you sure you want to delete 0 candidate(s)?"
    );
  });

  it("sends the edit icon to the candidate's own page", async () => {
    await arrive();
    fireEvent.click(screen.getByText("action-Edit"));
    expect(navigate).toHaveBeenCalledWith("/client/client-single/stage-1/item-1");
  });
});

describe("deleting the whole stage", () => {
  const openStageDelete = async () => {
    renderScreen();
    await settle();
    fireEvent.click(screen.getByText("Delete this Column"));
  };

  it("refreshes the stage list and the items before removing the stage", async () => {
    redux.state.pipeline.pipeline = { id: "pipe-1" };
    await openStageDelete();
    redux.dispatch.mockClear();
    fireEvent.click(screen.getByText("confirm-Delete stage"));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(-1));
    const order = redux.dispatch.mock.calls.map(([a]) => a.__thunk).filter(Boolean);
    expect(order.slice(0, 3)).toEqual([
      "fetchPipelineStages",
      "fetchPipelineItems",
      "deletePipelineStage",
    ]);
    expect(toast.showToast).toHaveBeenCalledWith("Stage deleted", "success");
  });

  it("goes straight to the delete when no pipeline is loaded", async () => {
    await openStageDelete();
    redux.dispatch.mockClear();
    fireEvent.click(screen.getByText("confirm-Delete stage"));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(-1));
    expect(
      redux.dispatch.mock.calls.filter(([a]) => a.__thunk === "fetchPipelineStages")
    ).toHaveLength(0);
  });

  it("reports the thunk's message and re-throws so the modal stays open", async () => {
    redux.results.deletePipelineStage = () => {
      throw new Error("First stage still holds candidates");
    };
    await openStageDelete();
    fireEvent.click(screen.getByText("confirm-Delete stage"));

    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        "First stage still holds candidates",
        "error"
      )
    );
    expect(probes.errors).toHaveLength(1);
    expect(navigate).not.toHaveBeenCalledWith(-1);
    expect(screen.getByTestId("delete-Delete stage")).toBeInTheDocument();
  });

  it("falls back to a generic message when the failure carries none", async () => {
    redux.results.deletePipelineStage = () => {
      throw { code: 500 };
    };
    await openStageDelete();
    fireEvent.click(screen.getByText("confirm-Delete stage"));

    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        "Failed to delete stage. Please try again.",
        "error"
      )
    );
  });

  it("closes on cancel without deleting anything", async () => {
    await openStageDelete();
    fireEvent.click(screen.getByText("cancel-Delete stage"));
    expect(screen.queryByTestId("delete-Delete stage")).toBeNull();
    expect(
      redux.dispatch.mock.calls.filter(([a]) => a.__thunk === "deletePipelineStage")
    ).toHaveLength(0);
  });
});

describe("the busy overlay", () => {
  it("appears whenever the slice reports it is loading", async () => {
    redux.state.pipeline.status = "loading";
    renderScreen();
    await settle();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("stays away while the slice is idle", async () => {
    renderScreen();
    await settle();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
