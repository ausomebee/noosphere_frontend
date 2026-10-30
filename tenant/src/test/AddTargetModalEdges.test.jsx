import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import AddTargetModal from "../Components/ReusableModal/ProgramLibraryModal/AddTargetModal";
import targetDraftReducer from "../ReduxStore/features/AddTargetDraftSlice";
import formDraftsReducer from "../ReduxStore/features/formDraftsSlice";

/**
 * The corners of the add/edit target modal that the main suite leaves alone:
 * the attachment panel's own life (which icon a file gets, the fake progress
 * bar that has to finish before the form is told about the file, and the four
 * shapes a saved attachment can arrive in), the data-collection types whose
 * counts are only visible in the submitted FormData, and the mastery criteria
 * that arrive half-filled or under an option the main suite never loads.
 *
 * Everything here goes through the real modal. The pickers are react-select, so
 * options are taken by opening the portalled menu and clicking; the mastery
 * rows are radios whose labels carry no htmlFor, so the input itself is
 * clicked. The submit handler hands the parent a FormData, so payload
 * assertions read it back through entries().
 *
 * The progress bar runs on a real interval, so the one test that waits for it
 * to finish drives fake timers and hands them back before it submits.
 */

const toast = vi.hoisted(() => ({ show: vi.fn() }));

vi.mock("../Helper/ShowToast", () => ({
  showToast: toast.show,
  showApiError: vi.fn(),
}));

// The app's root reducer mounts this slice as `addTargetDraft`, while the modal
// reads `s.targetDraft`. The store here is keyed the way the app keys it,
// because a store that happens to answer `s.targetDraft` puts the modal into an
// infinite render loop.
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

const controlFor = (labelText) => groupFor(labelText).querySelector("input, textarea");

// Most of these selects have isSearchable off, so typing filters nothing --
// open the menu and click the option. The menu is portalled to the body.
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

// Every tab's content is mounted at once, so "the last select" is no use. The
// unit select inside a mastery row is the only one on the whole modal with no
// label above it, which is how it is found here.
const pickUnlabelledSelect = (optionLabel) => {
  const input = Array.from(document.body.querySelectorAll(".rs__control input")).find(
    (i) => !i.closest(".input-group")?.querySelector("label.input-group-label")
  );
  if (!input) throw new Error("no unlabelled select on the page");
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
  const menus = document.body.querySelectorAll(".rs__menu");
  const option = Array.from(
    menus[menus.length - 1].querySelectorAll(".rs__option")
  ).find((o) => o.textContent === optionLabel);
  if (!option) throw new Error(`no option "${optionLabel}" in the unlabelled select`);
  fireEvent.click(option);
};

const masteryOption = (value) =>
  document.querySelector(`input[name="masteryCriteriaOption"][value="${value}"]`);

const tab = (name) => screen.getByRole("tab", { name });

const primary = () => document.querySelector(".modal-btn:not(.modal-btn-secondary)");

const fileInput = () => document.querySelector(".upload-input");

const attach = (file) => fireEvent.change(fileInput(), { target: { files: [file] } });

const iconMarkup = () => document.querySelector(".file-icon").innerHTML;

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

const sentBy = (onSubmit) => entriesOf(onSubmit.mock.calls[0][0]);

let errorSpy;

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  errorSpy.mockRestore();
});

describe("a modal that is not open", () => {
  it("renders nothing at all", () => {
    renderModal({ isOpen: false });
    expect(screen.queryByRole("tab", { name: "Basic Info" })).not.toBeInTheDocument();
  });

  it("opens blank on the first tab once it is asked to", () => {
    const store = makeStore();
    const props = {
      onClose: vi.fn(),
      onSubmit: vi.fn(),
      mode: "add",
      programId: "prog-1",
    };
    const { rerender } = render(
      <Provider store={store}>
        <AddTargetModal isOpen={false} {...props} />
      </Provider>
    );
    rerender(
      <Provider store={store}>
        <AddTargetModal isOpen {...props} />
      </Provider>
    );
    expect(tab("Basic Info")).toHaveAttribute("aria-selected", "true");
    expect(controlFor("Target Name").value).toBe("");
  });
});

describe("the icon an attachment is given", () => {
  const openAdmin = (props) => {
    const view = renderModal(props);
    fireEvent.click(tab("Status & Admin"));
    return view;
  };

  it("gives each family of file its own icon", () => {
    const markup = {};
    for (const name of ["notes.pdf", "clip.mp4", "loop.gif", "chart.png", "data.csv"]) {
      const view = openAdmin();
      attach(new File(["x"], name));
      markup[name] = iconMarkup();
      view.unmount();
    }
    expect(new Set(Object.values(markup)).size).toBe(5);
  });

  it.each([
    ["clip.avi"],
    ["clip.mov"],
  ])("treats %s as a video too", (name) => {
    const video = (() => {
      const view = openAdmin();
      attach(new File(["x"], "clip.mp4"));
      const m = iconMarkup();
      view.unmount();
      return m;
    })();
    openAdmin();
    attach(new File(["x"], name));
    expect(iconMarkup()).toBe(video);
  });

  it.each([["photo.jpg"], ["photo.jpeg"], ["photo.webp"]])(
    "treats %s as an image too",
    (name) => {
      const image = (() => {
        const view = openAdmin();
        attach(new File(["x"], "chart.png"));
        const m = iconMarkup();
        view.unmount();
        return m;
      })();
      openAdmin();
      attach(new File(["x"], name));
      expect(iconMarkup()).toBe(image);
    }
  );

  it("falls back to the plain file icon for a name with no extension", () => {
    const unknown = (() => {
      const view = openAdmin();
      attach(new File(["x"], "data.csv"));
      const m = iconMarkup();
      view.unmount();
      return m;
    })();
    openAdmin();
    attach(new File(["x"], "scan"));
    expect(iconMarkup()).toBe(unknown);
  });
});

describe("an attachment that was saved earlier", () => {
  const openAdmin = (attachment) => {
    const view = renderModal({ mode: "edit", initialData: { attachment } });
    fireEvent.click(tab("Status & Admin"));
    return view;
  };

  it.each([
    ["a fileUrl", { fileUrl: "https://files.example.com/plan.pdf" }, "plan.pdf"],
    ["a url and a name", { url: "https://x/y.png", name: "chart.png" }, "chart.png"],
    [
      "a url and a filename",
      { url: "https://x/y.png", filename: "graph.png" },
      "graph.png",
    ],
    [
      "a nested url with no name",
      { documentsUrl: { url: "https://files.example.com/scan.jpg" } },
      "scan.jpg",
    ],
  ])("names the file from %s", (_case, attachment, expected) => {
    openAdmin(attachment);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("marks a saved file complete and hides the progress bar", () => {
    openAdmin("https://files.example.com/plan.pdf");
    expect(document.querySelector(".file-success")).toBeInTheDocument();
    expect(document.querySelector(".progress-bar")).not.toBeInTheDocument();
  });

  it("shows an unfinished progress bar for a file just chosen", () => {
    const view = renderModal();
    fireEvent.click(tab("Status & Admin"));
    attach(new File(["x"], "plan.pdf"));
    expect(document.querySelector(".progress-text")).toHaveTextContent("0%");
    expect(document.querySelector(".file-success")).not.toBeInTheDocument();
    view.unmount();
  });

  it("takes a saved file back off again", () => {
    openAdmin("https://files.example.com/plan.pdf");
    fireEvent.click(screen.getByLabelText("Remove file"));
    expect(screen.queryByText("plan.pdf")).not.toBeInTheDocument();
    expect(document.querySelector(".file-success")).not.toBeInTheDocument();
  });
});

describe("the upload's fake progress bar", () => {
  it("hands the file to the form only once it reaches the end", async () => {
    vi.useFakeTimers();
    const { onSubmit } = renderModal();
    fireEvent.click(tab("Status & Admin"));
    attach(new File(["hello"], "plan.pdf"));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(document.querySelector(".progress-text")).toHaveTextContent("100%");
    expect(document.querySelector(".file-success")).toBeInTheDocument();

    vi.useRealTimers();
    fillRequiredFields();
    fireEvent.click(primary());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(sentBy(onSubmit).attachment.name).toBe("plan.pdf");
  });
});

describe("the counts each data collection type sends", () => {
  const openWithType = (type) => {
    const view = renderModal();
    fireEvent.click(tab("Teaching Details"));
    pickIn("Teaching Procedure", "Shaping");
    fireEvent.click(tab("Data Collection"));
    pickIn("Data Collection Type", type);
    return view;
  };

  const finish = () => {
    fireEvent.click(tab("Status & Admin"));
    pickIn("Initial Status", "In Progress");
    fireEvent.click(primary());
  };

  it.each([["Percentage Correct"], ["Latency"]])(
    "reports the trials per session for %s",
    async (type) => {
      const { onSubmit } = openWithType(type);
      fireEvent.change(fieldNamed("percentageCorrectTrialSession"), {
        target: { value: "6" },
      });
      finish();
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      const sent = sentBy(onSubmit);
      expect(sent.numberOfTrials).toBe("6");
      expect(sent.numberOfTasks).toBeUndefined();
    }
  );

  it("sends no counts for a latency with the trials left blank", async () => {
    const { onSubmit } = openWithType("Latency");
    finish();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(sentBy(onSubmit).numberOfTrials).toBeUndefined();
  });

  it("sends no steps and no task count for a task analysis of zero", async () => {
    const { onSubmit } = openWithType("Task Analysis");
    fireEvent.change(fieldNamed("trialOrOpportunitiesSession"), {
      target: { value: "0" },
    });
    finish();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const sent = sentBy(onSubmit);
    expect(sent.taskSteps).toBeUndefined();
    expect(sent.numberOfTasks).toBeUndefined();
  });
});

describe("the optional fields at submit time", () => {
  it("drops a note that is nothing but spaces", async () => {
    const { onSubmit } = renderModal();
    fillRequiredFields();
    typeIn("Note", "   ");
    fireEvent.click(primary());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(sentBy(onSubmit).notes).toBeUndefined();
  });

  it("sends the free-text strategy beside the strategies themselves", async () => {
    const { onSubmit } = renderModal();
    fireEvent.click(tab("Teaching Details"));
    pickIn("Teaching Procedure", "Shaping");
    pickIn("Prompting Strategy", "Other (specify)");
    fireEvent.change(fieldNamed("promptOthers"), {
      target: { value: "Hand-over-hand" },
    });
    fireEvent.click(tab("Data Collection"));
    pickIn("Data Collection Type", "Frequency");
    fireEvent.click(tab("Status & Admin"));
    pickIn("Initial Status", "In Progress");
    fireEvent.click(primary());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const sent = sentBy(onSubmit);
    expect(sent.promptOthers).toBe("Hand-over-hand");
    expect(sent["promptingStrategy[]"]).toBe(
      JSON.stringify({ label: "Other (specify)", value: "Other (specify)" })
    );
  });

  it("sends the baseline switch as a real boolean", async () => {
    const { onSubmit } = renderModal();
    fillRequiredFields();
    fireEvent.click(primary());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(sentBy(onSubmit).baselineDataRequired).toBe("false");
  });
});

describe("mastery criteria that are only half filled in", () => {
  const openMastery = () => {
    const view = renderModal();
    fireEvent.click(tab("Mastery Criteria"));
    return view;
  };

  it("sends the metric alone when no row was chosen", async () => {
    const { onSubmit } = openMastery();
    pickIn("Mastery Metric", "Rate");
    fillRequiredFields();
    fireEvent.click(primary());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(JSON.parse(sentBy(onSubmit).masteryCriteria)).toEqual({ metric: "Rate" });
  });

  it("leaves out the numbers that were never typed", async () => {
    const { onSubmit } = openMastery();
    pickIn("Mastery Metric", "Frequency Count");
    fireEvent.click(masteryOption("greaterThan"));
    fireEvent.change(fieldNamed("mcFcGtValue"), { target: { value: "5" } });
    fillRequiredFields();
    fireEvent.click(primary());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(JSON.parse(sentBy(onSubmit).masteryCriteria)).toEqual({
      metric: "Frequency Count",
      optionOne: "greaterThan",
      value: 5,
    });
  });

  it("keeps a chosen unit as the text it was picked as", async () => {
    const { onSubmit } = openMastery();
    pickIn("Mastery Metric", "Latency");
    fireEvent.click(masteryOption("latency"));
    fireEvent.change(fieldNamed("mcLatValue"), { target: { value: "10" } });
    pickUnlabelledSelect("Minutes");
    fillRequiredFields();
    fireEvent.click(primary());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(JSON.parse(sentBy(onSubmit).masteryCriteria)).toMatchObject({
      metric: "Latency",
      optionOne: "latency",
      value: 10,
      unit: "minutes",
    });
  });
});

describe("loading saved criteria in edit mode", () => {
  const saved = (masteryCriteria) => ({
    id: 42,
    name: "Tacting",
    teachingProcedure: "Shaping",
    dataCollectionType: "Frequency",
    statusAndAdmin: "In Progress",
    masteryCriteria,
  });

  const openMastery = (masteryCriteria) => {
    const view = renderModal({ mode: "edit", initialData: saved(masteryCriteria) });
    fireEvent.click(tab("Mastery Criteria"));
    return view;
  };

  it("loads a second-slot option into its own boxes", async () => {
    openMastery({
      metric: "Percentage Accuracy",
      optionTwo: "percentageOf",
      value: 90,
      totalSessions: 10,
      sessionCount: 8,
    });
    await waitFor(() => expect(fieldNamed("mcPaPofValue")).toBeTruthy());
    expect(fieldNamed("mcPaPofValue").value).toBe("90");
    expect(fieldNamed("mcPaPofTotal").value).toBe("10");
    expect(fieldNamed("mcPaPofCount").value).toBe("8");
    expect(masteryOption("percentageOf").checked).toBe(true);
  });

  it("loads a third-slot option into its own boxes", async () => {
    openMastery({
      metric: "Percentage Accuracy",
      optionThree: "average",
      value: 75,
      sessionCount: 5,
    });
    await waitFor(() => expect(fieldNamed("mcPaAvgValue")).toBeTruthy());
    expect(fieldNamed("mcPaAvgValue").value).toBe("75");
    expect(fieldNamed("mcPaAvgCount").value).toBe("5");
  });

  it("empties the boxes of an option whose numbers were never saved", async () => {
    openMastery({ metric: "Duration", optionOne: "duration" });
    await waitFor(() => expect(fieldNamed("mcDurValue")).toBeTruthy());
    expect(fieldNamed("mcDurValue").value).toBe("");
    expect(fieldNamed("mcDurSessions").value).toBe("");
  });

  it("loads nothing for a metric the form does not know", () => {
    openMastery({ metric: "Handwriting Legibility", optionOne: "neatness" });
    expect(document.querySelector('input[name="masteryCriteriaOption"]')).toBeNull();
  });

  it("loads no metric at all when the saved criteria name none", () => {
    openMastery({ optionOne: "percentage", value: 80 });
    expect(document.querySelector('input[name="masteryCriteriaOption"]')).toBeNull();
  });

  it("sends no id for an edit of a target that never had one", async () => {
    const { onSubmit } = renderModal({
      mode: "edit",
      initialData: { ...saved(undefined), id: undefined },
    });
    fireEvent.click(tab("Status & Admin"));
    typeIn("Note", "Reviewed with the parent");
    await waitFor(() => expect(primary().textContent).toBe("Save"));
    fireEvent.click(primary());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(sentBy(onSubmit).id).toBeUndefined();
  });
});

describe("a save the parent refuses", () => {
  it("keeps the modal open when what was thrown carries no message", async () => {
    const { onSubmit, onClose } = renderModal();
    onSubmit.mockRejectedValue("server said no");
    fillRequiredFields();
    fireEvent.click(primary());
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("Submit failed:", "server said no");
  });
});
