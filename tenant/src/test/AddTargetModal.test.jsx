import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import AddTargetModal from "../Components/ReusableModal/ProgramLibraryModal/AddTargetModal";
import targetDraftReducer from "../ReduxStore/features/AddTargetDraftSlice";
import formDraftsReducer from "../ReduxStore/features/formDraftsSlice";

/**
 * The program library's add/edit target modal: a five-tab wizard whose Save
 * button only appears on the last tab (or, in edit mode, as soon as anything
 * changes), and whose middle tabs each reveal a different sub-form depending on
 * the option picked above them. The mastery tab is the extreme case — nine
 * metrics, each with its own radio rows and its own uniquely named number
 * inputs, all collapsed back into one masteryCriteria object at submit time.
 *
 * Three things shape these tests. The target's name, description, SD and
 * expected response are plain component state rather than react-hook-form
 * fields, so they never appear in the schema and are only visible in the
 * FormData the modal builds. The pickers are react-select, so options are taken
 * by keyboard. And the submit handler hands the parent a FormData rather than a
 * plain object, which is why assertions read it back through entries().
 */

const toast = vi.hoisted(() => ({ show: vi.fn() }));

vi.mock("../Helper/ShowToast", () => ({
  showToast: toast.show,
  showApiError: vi.fn(),
}));

// The app's root reducer mounts this slice as `addTargetDraft`, while the modal
// reads `s.targetDraft` -- so the recovery draft it writes is never read back.
// The store here is keyed the way the app keys it, because a store that happens
// to answer `s.targetDraft` puts the modal into an infinite render loop.
const makeStore = () =>
  configureStore({
    reducer: { addTargetDraft: targetDraftReducer, formDrafts: formDraftsReducer },
  });

const renderModal = (props = {}) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const store = makeStore();
  const view = render(
    <Provider store={store}>
      <AddTargetModal
        isOpen
        onClose={onClose}
        onSubmit={onSubmit}
        mode="add"
        programId="prog-1"
        {...props}
      />
    </Provider>
  );
  return { ...view, onSubmit, onClose, store };
};

// Labels carry a trailing "*" span and are not tied to their controls, so walk
// up from the label text to the input group instead of using getByLabelText.
const groupFor = (labelText) => {
  const label = Array.from(
    document.body.querySelectorAll(
      "label.input-group-label, label.input-textarea-label"
    )
  ).find((l) => l.textContent.replace("*", "").trim() === labelText);
  if (!label) throw new Error(`no field labelled "${labelText}"`);
  return label.closest(".input-group, .input-textarea-group");
};

const controlFor = (labelText) =>
  groupFor(labelText).querySelector("input, textarea");

// Most of these selects are built with isSearchable off, so their text box is a
// read-only stand-in and typing filters nothing -- open the menu and click the
// option instead. The menu is portalled to the body, hence the global lookup.
const pickIn = (labelText, optionLabel) => {
  const input = groupFor(labelText).querySelector("input");
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
  const menus = document.body.querySelectorAll(".rs__menu");
  const option = Array.from(
    menus[menus.length - 1].querySelectorAll(".rs__option")
  ).find((o) => o.textContent === optionLabel);
  if (!option) throw new Error(`no option "${optionLabel}" under "${labelText}"`);
  fireEvent.click(option);
};

const typeIn = (labelText, value) =>
  fireEvent.change(controlFor(labelText), { target: { value } });

const fieldNamed = (name) => document.querySelector(`[name="${name}"]`);

const tab = (name) => screen.getByRole("tab", { name });

const primary = () => document.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.querySelector(".modal-btn-secondary");

const entriesOf = (formData) => {
  const out = {};
  for (const [key, value] of formData.entries()) {
    if (key in out) {
      out[key] = [].concat(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
};

// The minimum the schema accepts: a teaching procedure, a data collection type
// and a status. Everything else is optional, name included.
const fillRequiredFields = () => {
  fireEvent.click(tab("Teaching Details"));
  pickIn("Teaching Procedure", "Shaping");
  fireEvent.click(tab("Data Collection"));
  pickIn("Data Collection Type", "Frequency");
  fireEvent.click(tab("Status & Admin"));
  pickIn("Initial Status", "In Progress");
};

let errorSpy;

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe("target modal shell", () => {
  it("opens on the first tab of the create wizard", () => {
    renderModal();
    expect(screen.getByText("Add a new Target")).toBeInTheDocument();
    expect(tab("Basic Info").getAttribute("aria-selected")).toBe("true");
    expect(primary().textContent).toBe("Next");
    expect(secondary().textContent).toBe("Cancel");
  });

  it("renames itself for editing", () => {
    renderModal({ mode: "edit", initialData: { name: "Tacting" } });
    expect(screen.getByText("Edit Target")).toBeInTheDocument();
  });

  it("walks forward and back through the tabs", () => {
    renderModal();
    fireEvent.click(primary());
    expect(tab("Teaching Details").getAttribute("aria-selected")).toBe("true");
    expect(secondary().textContent).toBe("Previous");

    fireEvent.click(secondary());
    expect(tab("Basic Info").getAttribute("aria-selected")).toBe("true");
  });

  it("offers Save only on the last tab", () => {
    renderModal();
    fireEvent.click(tab("Status & Admin"));
    expect(primary().textContent).toBe("Save");
  });

  it("stays put when Next is pressed on the last tab", () => {
    renderModal();
    fireEvent.click(tab("Mastery Criteria"));
    fireEvent.click(tab("Status & Admin"));
    fireEvent.click(tab("Status & Admin"));
    expect(tab("Status & Admin").getAttribute("aria-selected")).toBe("true");
  });

  it("jumps straight to a tab that is clicked", () => {
    renderModal();
    fireEvent.click(tab("Mastery Criteria"));
    expect(screen.getByText("Mastery Metric")).toBeInTheDocument();
  });

  it("discards everything on Cancel", async () => {
    const { onClose, store } = renderModal();
    typeIn("Target Name", "Tacting");
    fireEvent.click(tab("Data Collection"));
    pickIn("Data Collection Type", "Frequency");
    await waitFor(() =>
      expect(store.getState().addTargetDraft.dataCollectionType).toBe("Frequency")
    );

    // Cancel only closes from the first tab; elsewhere the same button is
    // Previous.
    fireEvent.click(tab("Basic Info"));
    fireEvent.click(secondary());

    expect(onClose).toHaveBeenCalled();
    expect(controlFor("Target Name").value).toBe("");
  });

  it("leaves the persisted draft behind after Cancel", async () => {
    // handleClose resets the slice and then calls reset(), and the reset is
    // what re-persists: the watch subscription fires with the values as they
    // were, writing them straight back over the freshly cleared draft.
    const { store } = renderModal();
    fireEvent.click(tab("Data Collection"));
    pickIn("Data Collection Type", "Frequency");
    await waitFor(() =>
      expect(store.getState().addTargetDraft.dataCollectionType).toBe("Frequency")
    );

    fireEvent.click(tab("Basic Info"));
    fireEvent.click(secondary());
    expect(store.getState().addTargetDraft.dataCollectionType).toBe("Frequency");
  });
});

describe("basic info", () => {
  it("keeps the name and description outside the schema", () => {
    renderModal();
    typeIn("Target Name", "Tacting");
    typeIn("Description", "Labels common objects");

    expect(controlFor("Target Name").value).toBe("Tacting");
    expect(controlFor("Description").value).toBe("Labels common objects");
  });
});

describe("teaching details", () => {
  const openTeaching = () => {
    renderModal();
    fireEvent.click(tab("Teaching Details"));
  };

  it("asks for a free-text procedure only when Other is chosen", () => {
    openTeaching();
    expect(fieldNamed("teachingOthers")).toBeNull();

    pickIn("Teaching Procedure", "Other (specify)");
    expect(fieldNamed("teachingOthers")).toBeTruthy();
  });

  it("asks for a free-text strategy only when Other is among the strategies", () => {
    openTeaching();
    expect(fieldNamed("promptOthers")).toBeNull();

    pickIn("Prompting Strategy", "Other (specify)");
    expect(fieldNamed("promptOthers")).toBeTruthy();
  });

  it("collects several prompting strategies at once", () => {
    openTeaching();
    pickIn("Prompting Strategy", "Prompt Fading");
    pickIn("Prompting Strategy", "Graduated Guidance");

    const group = groupFor("Prompting Strategy");
    expect(group.textContent).toContain("Prompt Fading");
    expect(group.textContent).toContain("Graduated Guidance");
  });
});

describe("data collection", () => {
  const openData = () => {
    renderModal();
    fireEvent.click(tab("Data Collection"));
  };

  it("shows no trial settings for a plain frequency count", () => {
    openData();
    pickIn("Data Collection Type", "Frequency");
    expect(screen.queryByText("Trial Settings")).not.toBeInTheDocument();
  });

  it("asks for trials per session for percentage correct", () => {
    openData();
    pickIn("Data Collection Type", "Percentage Correct");
    expect(screen.getByText("Trial Settings")).toBeInTheDocument();
    expect(fieldNamed("percentageCorrectTrialSession")).toBeTruthy();
  });

  it("asks for trials per session for latency", () => {
    openData();
    pickIn("Data Collection Type", "Latency");
    expect(fieldNamed("percentageCorrectTrialSession")).toBeTruthy();
  });

  it("asks for opportunities per session for trials/opportunities", () => {
    openData();
    pickIn("Data Collection Type", "Trials/Opportunities");
    expect(fieldNamed("trialOrOpportunitiesSession")).toBeTruthy();
  });

  it("grows one input per step for a task analysis", async () => {
    openData();
    pickIn("Data Collection Type", "Task Analysis");
    fireEvent.change(fieldNamed("trialOrOpportunitiesSession"), {
      target: { value: "3" },
    });

    await waitFor(() =>
      expect(screen.getByText("Step 3")).toBeInTheDocument()
    );
    expect(fieldNamed("taskSteps.0")).toBeTruthy();
    expect(fieldNamed("taskSteps.2")).toBeTruthy();
  });

  it("keeps steps already typed when the count grows", async () => {
    openData();
    pickIn("Data Collection Type", "Task Analysis");
    fireEvent.change(fieldNamed("trialOrOpportunitiesSession"), {
      target: { value: "1" },
    });
    await waitFor(() => expect(fieldNamed("taskSteps.0")).toBeTruthy());
    fireEvent.change(fieldNamed("taskSteps.0"), {
      target: { value: "Pick up cup" },
    });

    fireEvent.change(fieldNamed("trialOrOpportunitiesSession"), {
      target: { value: "2" },
    });
    await waitFor(() => expect(fieldNamed("taskSteps.1")).toBeTruthy());
    expect(fieldNamed("taskSteps.0").value).toBe("Pick up cup");
  });

  it("builds no steps for a count of zero", () => {
    openData();
    pickIn("Data Collection Type", "Task Analysis");
    fireEvent.change(fieldNamed("trialOrOpportunitiesSession"), {
      target: { value: "0" },
    });
    expect(screen.queryByText("Step 1")).not.toBeInTheDocument();
  });
});

describe("mastery criteria", () => {
  const openMastery = (metric) => {
    const view = renderModal();
    fireEvent.click(tab("Mastery Criteria"));
    if (metric) pickIn("Mastery Metric", metric);
    return view;
  };

  it("shows nothing until a metric is chosen", () => {
    openMastery();
    expect(screen.queryByText("Mastery Criteria", { selector: "p" })).toBeNull();
  });

  it("offers three rows for percentage accuracy", () => {
    openMastery("Percentage Accuracy");
    expect(fieldNamed("mcPaPctValue")).toBeTruthy();
    expect(fieldNamed("mcPaPofValue")).toBeTruthy();
    expect(fieldNamed("mcPaAvgValue")).toBeTruthy();
  });

  it("offers a consecutive and a proportional row for trials correct", () => {
    openMastery("Trials Correct");
    expect(fieldNamed("mcTcConValue")).toBeTruthy();
    expect(fieldNamed("mcTcPofCount")).toBeTruthy();
  });

  it("counts sessions rather than trials for independent responses", () => {
    openMastery("Independent Responses");
    expect(fieldNamed("mcIrConSessions")).toBeTruthy();
    expect(fieldNamed("mcIrPofTotal")).toBeTruthy();
  });

  it("offers a single threshold row for a frequency count", () => {
    openMastery("Frequency Count");
    expect(fieldNamed("mcFcGtValue")).toBeTruthy();
  });

  it("offers a single threshold row for a rate", () => {
    openMastery("Rate");
    expect(fieldNamed("mcRtGtValue")).toBeTruthy();
  });

  it("pairs a duration with a unit", () => {
    openMastery("Duration");
    expect(fieldNamed("mcDurValue")).toBeTruthy();
    expect(screen.getByText("Maintain behaviour for")).toBeInTheDocument();
  });

  it("pairs a latency with a unit", () => {
    openMastery("Latency");
    expect(fieldNamed("mcLatValue")).toBeTruthy();
    expect(screen.getByText(/Response latency/)).toBeInTheDocument();
  });

  it("offers a value-free option for all steps independent", () => {
    openMastery("Percentage of Steps Independent");
    expect(fieldNamed("mcPsiValue")).toBeTruthy();
    expect(
      screen.getByText("All steps performed independently once or more")
    ).toBeInTheDocument();
  });

  it("counts consecutive sessions for full task completion", () => {
    openMastery("Full Task Completion");
    expect(fieldNamed("mcFtcSessions")).toBeTruthy();
  });
});

describe("attachments", () => {
  const openAdmin = (props) => {
    const view = renderModal(props);
    fireEvent.click(tab("Status & Admin"));
    return view;
  };

  const fileInput = () => document.querySelector(".upload-input");

  const attach = (file) =>
    fireEvent.change(fileInput(), { target: { files: [file] } });

  it("shows the chosen file and its size", () => {
    openAdmin();
    attach(new File(["hello"], "notes.pdf", { type: "application/pdf" }));
    expect(screen.getByText(/notes\.pdf/)).toBeInTheDocument();
  });

  it("refuses a file over the size limit", () => {
    openAdmin();
    const big = new File(["x"], "huge.pdf");
    Object.defineProperty(big, "size", { value: 60 * 1024 * 1024 });
    attach(big);

    expect(toast.show).toHaveBeenCalledWith("File must be ≤ 50 MB", "error");
    expect(screen.queryByText(/huge\.pdf/)).not.toBeInTheDocument();
  });

  it("ignores a change event that carries no file", () => {
    openAdmin();
    fireEvent.change(fileInput(), { target: { files: [] } });
    expect(screen.queryByLabelText("Remove file")).not.toBeInTheDocument();
  });

  it("removes the file again", () => {
    openAdmin();
    attach(new File(["hello"], "notes.pdf"));
    fireEvent.click(screen.getByLabelText("Remove file"));
    expect(screen.queryByText(/notes\.pdf/)).not.toBeInTheDocument();
  });

  it("renders a saved attachment given as a url", () => {
    openAdmin({
      mode: "edit",
      initialData: { attachment: "https://files.example.com/plan.pdf" },
    });
    expect(screen.getByText("plan.pdf")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "plan.pdf" })).toHaveAttribute(
      "href",
      "https://files.example.com/plan.pdf"
    );
  });

  it("renders a saved attachment given as a record", () => {
    openAdmin({
      mode: "edit",
      initialData: {
        attachment: { documentsUrl: { url: "https://x/y.png", filename: "chart.png" } },
      },
    });
    expect(screen.getByText("chart.png")).toBeInTheDocument();
  });

  it("falls back to a generic name for a record with neither name nor url", () => {
    openAdmin({ mode: "edit", initialData: { attachment: {} } });
    expect(screen.getByText("Attachment")).toBeInTheDocument();
  });

  it("shows a saved attachment that is already a File", () => {
    openAdmin({
      mode: "edit",
      initialData: { attachment: new File(["hi"], "scan.jpg") },
    });
    expect(screen.getByText(/scan\.jpg/)).toBeInTheDocument();
  });
});

describe("submitting", () => {
  it("refuses to save while required fields are missing", async () => {
    const { onSubmit } = renderModal();
    fireEvent.click(tab("Status & Admin"));
    fireEvent.click(primary());

    await waitFor(() => expect(toast.show).toHaveBeenCalled());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("jumps to the tab holding the first error", async () => {
    renderModal();
    fireEvent.click(tab("Status & Admin"));
    fireEvent.click(primary());

    await waitFor(() =>
      expect(tab("Teaching Details").getAttribute("aria-selected")).toBe("true")
    );
  });

  it("hands the parent a FormData carrying the whole target", async () => {
    const { onSubmit, onClose } = renderModal();
    typeIn("Target Name", "Tacting");
    typeIn("Description", "  Labels objects  ");
    fillRequiredFields();
    fireEvent.click(primary());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const sent = entriesOf(onSubmit.mock.calls[0][0]);
    expect(sent).toMatchObject({
      name: "Tacting",
      description: "Labels objects",
      programId: "prog-1",
      teachingProcedure: "Shaping",
      dataCollectionType: "Frequency",
      initialStatus: "In Progress",
      baselineDataRequired: "false",
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("omits the optional text fields left blank", async () => {
    const { onSubmit } = renderModal();
    fillRequiredFields();
    fireEvent.click(primary());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const sent = entriesOf(onSubmit.mock.calls[0][0]);
    expect(sent.description).toBeUndefined();
    expect(sent.sd).toBeUndefined();
    expect(sent.notes).toBeUndefined();
  });

  it("sends each prompting strategy as its own array entry", async () => {
    const { onSubmit } = renderModal();
    fireEvent.click(tab("Teaching Details"));
    pickIn("Teaching Procedure", "Shaping");
    pickIn("Prompting Strategy", "Prompt Fading");
    fireEvent.click(tab("Data Collection"));
    pickIn("Data Collection Type", "Frequency");
    fireEvent.click(tab("Status & Admin"));
    pickIn("Initial Status", "In Progress");
    fireEvent.click(primary());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const sent = entriesOf(onSubmit.mock.calls[0][0]);
    expect(sent["promptingStrategy[]"]).toBe(
      JSON.stringify({ label: "Prompt Fading", value: "Prompt Fading" })
    );
  });

  it("sends the task steps and the task count for a task analysis", async () => {
    const { onSubmit } = renderModal();
    fireEvent.click(tab("Teaching Details"));
    pickIn("Teaching Procedure", "Shaping");
    fireEvent.click(tab("Data Collection"));
    pickIn("Data Collection Type", "Task Analysis");
    fireEvent.change(fieldNamed("trialOrOpportunitiesSession"), {
      target: { value: "2" },
    });
    await waitFor(() => expect(fieldNamed("taskSteps.1")).toBeTruthy());
    fireEvent.change(fieldNamed("taskSteps.0"), { target: { value: "Open tap" } });
    fireEvent.change(fieldNamed("taskSteps.1"), { target: { value: "Wash hands" } });
    fireEvent.click(tab("Status & Admin"));
    pickIn("Initial Status", "In Progress");
    fireEvent.click(primary());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const sent = entriesOf(onSubmit.mock.calls[0][0]);
    expect(sent.taskSteps).toEqual(["Open tap", "Wash hands"]);
    expect(sent.numberOfTasks).toBe("2");
    // A task analysis reports tasks, never trials.
    expect(sent.numberOfTrials).toBeUndefined();
  });

  it("reports a trials/opportunities count as both trials and tasks", async () => {
    const { onSubmit } = renderModal();
    fireEvent.click(tab("Teaching Details"));
    pickIn("Teaching Procedure", "Shaping");
    fireEvent.click(tab("Data Collection"));
    pickIn("Data Collection Type", "Trials/Opportunities");
    fireEvent.change(fieldNamed("trialOrOpportunitiesSession"), {
      target: { value: "5" },
    });
    fireEvent.click(tab("Status & Admin"));
    pickIn("Initial Status", "In Progress");
    fireEvent.click(primary());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const sent = entriesOf(onSubmit.mock.calls[0][0]);
    expect(sent.numberOfTrials).toBe("5");
    expect(sent.numberOfTasks).toBe("5");
  });

  it("folds the chosen mastery row into one criteria object", async () => {
    const { onSubmit } = renderModal();
    fireEvent.click(tab("Mastery Criteria"));
    pickIn("Mastery Metric", "Percentage Accuracy");
    fireEvent.click(
      document.querySelector('input[name="masteryCriteriaOption"][value="percentage"]')
    );
    fireEvent.change(fieldNamed("mcPaPctValue"), { target: { value: "80" } });
    fireEvent.change(fieldNamed("mcPaPctSessions"), { target: { value: "3" } });
    fillRequiredFields();
    fireEvent.click(primary());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const sent = entriesOf(onSubmit.mock.calls[0][0]);
    expect(JSON.parse(sent.masteryCriteria)).toEqual({
      metric: "Percentage Accuracy",
      optionOne: "percentage",
      value: 80,
      sessions: 3,
    });
    expect(sent.masteryMetric).toBe("Percentage Accuracy");
  });

  it("keeps the unit as text rather than a number", async () => {
    const { onSubmit } = renderModal();
    fireEvent.click(tab("Mastery Criteria"));
    pickIn("Mastery Metric", "Duration");
    fireEvent.click(
      document.querySelector('input[name="masteryCriteriaOption"][value="duration"]')
    );
    fireEvent.change(fieldNamed("mcDurValue"), { target: { value: "30" } });
    fireEvent.change(fieldNamed("mcDurSessions"), { target: { value: "4" } });
    fillRequiredFields();
    fireEvent.click(primary());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const sent = entriesOf(onSubmit.mock.calls[0][0]);
    expect(JSON.parse(sent.masteryCriteria)).toMatchObject({
      metric: "Duration",
      optionOne: "duration",
      value: 30,
      sessions: 4,
    });
  });

  it("sends no criteria at all when no metric was chosen", async () => {
    const { onSubmit } = renderModal();
    fillRequiredFields();
    fireEvent.click(primary());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(entriesOf(onSubmit.mock.calls[0][0]).masteryCriteria).toBeUndefined();
  });

  it("attaches a chosen file to the payload", async () => {
    const { onSubmit } = renderModal();
    fillRequiredFields();
    fireEvent.change(document.querySelector(".upload-input"), {
      target: { files: [new File(["hi"], "plan.pdf")] },
    });
    fireEvent.click(primary());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const sent = entriesOf(onSubmit.mock.calls[0][0]);
    // The upload only reaches the form once its fake progress bar completes, so
    // a file attached mid-submit is deliberately not part of this payload.
    expect(sent.attachment).toBeUndefined();
  });

  it("keeps the modal open when the parent's save throws", async () => {
    const { onSubmit, onClose } = renderModal();
    onSubmit.mockRejectedValue(new Error("server said no"));
    fillRequiredFields();
    fireEvent.click(primary());

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("Submit failed:", expect.any(Error));
  });

  it("saves a target with no name at all", async () => {
    // The schema never mentions `name`, so a blank one submits cleanly.
    const { onSubmit } = renderModal();
    fillRequiredFields();
    fireEvent.click(primary());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(entriesOf(onSubmit.mock.calls[0][0]).name).toBe("");
  });
});

describe("editing an existing target", () => {
  const saved = {
    id: 42,
    name: "Tacting",
    description: "Labels objects",
    sd: "What is it?",
    expectedResponse: "Names the item",
    teachingProcedure: "Shaping",
    dataCollectionType: "Frequency",
    statusAndAdmin: "In Progress",
    masteryCriteria: {
      metric: "Percentage Accuracy",
      optionOne: "percentage",
      value: 80,
      sessions: 3,
    },
  };

  it("repopulates the plain-state fields", () => {
    renderModal({ mode: "edit", initialData: saved });
    expect(controlFor("Target Name").value).toBe("Tacting");
    fireEvent.click(tab("Teaching Details"));
    expect(controlFor("SD").value).toBe("What is it?");
  });

  it("loads saved criteria into the row it came from", async () => {
    renderModal({ mode: "edit", initialData: saved });
    fireEvent.click(tab("Mastery Criteria"));

    await waitFor(() => expect(fieldNamed("mcPaPctValue")).toBeTruthy());
    expect(fieldNamed("mcPaPctValue").value).toBe("80");
    expect(fieldNamed("mcPaPctSessions").value).toBe("3");
    expect(
      document.querySelector(
        'input[name="masteryCriteriaOption"][value="percentage"]'
      ).checked
    ).toBe(true);
  });

  it("offers Next until something is edited", () => {
    renderModal({ mode: "edit", initialData: saved });
    expect(primary().textContent).toBe("Next");
  });

  it("switches to Save once a form field changes", async () => {
    renderModal({ mode: "edit", initialData: saved });
    fireEvent.click(tab("Status & Admin"));
    typeIn("Note", "Reviewed with the parent");
    await waitFor(() => expect(primary().textContent).toBe("Save"));
  });

  it("stays on Next when only the target name is edited", async () => {
    // Name, description, SD and expected response are component state rather
    // than form fields, so they never reach the watch subscription that decides
    // whether anything changed.
    renderModal({ mode: "edit", initialData: saved });
    typeIn("Target Name", "Tacting v2");
    await waitFor(() =>
      expect(controlFor("Target Name").value).toBe("Tacting v2")
    );
    expect(primary().textContent).toBe("Next");
  });

  it("sends the target's id back with the update", async () => {
    const { onSubmit } = renderModal({ mode: "edit", initialData: saved });
    typeIn("Target Name", "Tacting v2");
    fireEvent.click(tab("Status & Admin"));
    typeIn("Note", "Reviewed with the parent");
    await waitFor(() => expect(primary().textContent).toBe("Save"));
    fireEvent.click(primary());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const sent = entriesOf(onSubmit.mock.calls[0][0]);
    expect(sent.id).toBe("42");
    expect(sent.name).toBe("Tacting v2");
    expect(sent.notes).toBe("Reviewed with the parent");
  });

  it("closes without saving on Cancel", () => {
    const { onClose, onSubmit } = renderModal({
      mode: "edit",
      initialData: saved,
    });
    expect(secondary().textContent).toBe("Cancel");
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("leaves the criteria fields blank for an option with none", () => {
    renderModal({
      mode: "edit",
      initialData: {
        ...saved,
        masteryCriteria: {
          metric: "Percentage of Steps Independent",
          optionTwo: "allSteps",
        },
      },
    });
    fireEvent.click(tab("Mastery Criteria"));
    expect(
      within(document.body).getByText(
        "All steps performed independently once or more"
      )
    ).toBeInTheDocument();
  });
});

describe("walking the wizard with Next", () => {
  // Edit mode keeps the primary button on "Next" for every tab, which is the
  // only way to reach the per-tab validation for the later tabs.
  const savedTarget = {
    id: 7,
    name: "Tacting",
    teachingProcedure: "Shaping",
    dataCollectionType: "Frequency",
    statusAndAdmin: "In Progress",
  };

  // One Next per test: the modal locks its primary button for 600ms after a
  // press, so consecutive clicks in a single test are swallowed.
  it("advances from the teaching tab", () => {
    renderModal();
    fireEvent.click(tab("Teaching Details"));
    fireEvent.click(primary());
    expect(tab("Data Collection").getAttribute("aria-selected")).toBe("true");
  });

  it("advances from the data collection tab", () => {
    renderModal();
    fireEvent.click(tab("Data Collection"));
    fireEvent.click(primary());
    expect(tab("Mastery Criteria").getAttribute("aria-selected")).toBe("true");
  });

  it("advances from the mastery tab", () => {
    renderModal();
    fireEvent.click(tab("Mastery Criteria"));
    fireEvent.click(primary());
    expect(tab("Status & Admin").getAttribute("aria-selected")).toBe("true");
  });

  it("has nowhere to go from the last tab", () => {
    renderModal({ mode: "edit", initialData: savedTarget });
    fireEvent.click(tab("Status & Admin"));
    fireEvent.click(primary());
    expect(tab("Status & Admin").getAttribute("aria-selected")).toBe("true");
  });

  it("refuses to move on while the tab it is showing holds an error", async () => {
    renderModal();
    fireEvent.click(tab("Status & Admin"));
    fireEvent.click(primary());
    await waitFor(() =>
      expect(tab("Teaching Details").getAttribute("aria-selected")).toBe("true")
    );

    toast.show.mockClear();
    fireEvent.click(primary());
    expect(toast.show).toHaveBeenCalledWith(
      "Please fill in all required fields before proceeding",
      "error"
    );
    expect(tab("Teaching Details").getAttribute("aria-selected")).toBe("true");
  });

  it("saves normally on the attempt after a failed one", async () => {
    const { onSubmit } = renderModal();
    fireEvent.click(tab("Status & Admin"));
    fireEvent.click(primary());
    await waitFor(() => expect(toast.show).toHaveBeenCalled());

    fillRequiredFields();
    fireEvent.click(primary());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });
});

describe("mastery criteria the form cannot place", () => {
  const savedWith = (masteryCriteria) => ({
    id: 7,
    name: "Tacting",
    teachingProcedure: "Shaping",
    dataCollectionType: "Frequency",
    statusAndAdmin: "In Progress",
    masteryCriteria,
  });

  const saveEdit = async (initialData) => {
    const view = renderModal({ mode: "edit", initialData });
    fireEvent.click(tab("Status & Admin"));
    typeIn("Note", "Reviewed");
    await waitFor(() => expect(primary().textContent).toBe("Save"));
    fireEvent.click(primary());
    await waitFor(() => expect(view.onSubmit).toHaveBeenCalledTimes(1));
    return entriesOf(view.onSubmit.mock.calls[0][0]);
  };

  it("sends a metric it does not recognise on its own", async () => {
    const sent = await saveEdit(
      savedWith({ metric: "Vibes", optionOne: "vibe", value: 3 })
    );
    // No slot table for the metric, so the option cannot be placed and only
    // the metric survives.
    expect(JSON.parse(sent.masteryCriteria)).toEqual({ metric: "Vibes" });
  });

  it("drops an option that belongs to a different metric", async () => {
    const sent = await saveEdit(
      savedWith({ metric: "Rate", optionThree: "average" })
    );
    expect(JSON.parse(sent.masteryCriteria)).toEqual({ metric: "Rate" });
  });

  it("sends a metric saved with no option at all", async () => {
    const sent = await saveEdit(savedWith({ metric: "Rate" }));
    expect(JSON.parse(sent.masteryCriteria)).toEqual({ metric: "Rate" });
  });
});
