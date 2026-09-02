import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

import TaskAnalysisModal from "../Components/ReusableModal/DataCollectionModal/TaskAnalysisModal";

/**
 * Task analysis data collection: one row per step of the task, each needing a
 * performance rating and a prompt level before the sheet can be saved.
 *
 * Two things make this awkward to drive. The pickers are react-select, so they
 * are worked with arrow keys on their combobox rather than by setting a value.
 * And the `steps` prop sits in the reset effect's dependency list while
 * defaulting to a fresh `[]` -- so every fixture here is a module-level constant
 * and is never rebuilt inline, or the effect would re-run on every render.
 *
 * The form holds unanswered cells as `null` and only converts them to empty
 * strings on the way out, so the shape the caller receives is asserted directly.
 */

const ONE_STEP = [{ id: "s-1", description: "Turn on the tap" }];
const TWO_STEPS = [
  { id: "s-1", description: "Turn on the tap" },
  { id: "s-2", description: "Wet hands" },
];
const NO_STEPS = [];

const onSave = vi.fn();
const onClose = vi.fn();

const renderModal = (props = {}) =>
  render(
    <TaskAnalysisModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      steps={ONE_STEP}
      {...props}
    />
  );

const rows = () => Array.from(document.body.querySelectorAll("tbody tr"));

const pickersIn = (rowIdx) =>
  Array.from(rows()[rowIdx].querySelectorAll("input[role='combobox']"));

// react-select opens on the first ArrowDown with the first option highlighted,
// so reaching option `index` takes that press plus `index` more.
const choose = (combobox, index) => {
  fireEvent.keyDown(combobox, { key: "ArrowDown" });
  for (let i = 0; i < index; i += 1) {
    fireEvent.keyDown(combobox, { key: "ArrowDown" });
  }
  fireEvent.keyDown(combobox, { key: "Enter" });
};

const answerRow = (rowIdx, performanceIdx = 0, promptIdx = 0) => {
  const [performance, promptLevel] = pickersIn(rowIdx);
  choose(performance, performanceIdx);
  choose(promptLevel, promptIdx);
};

const noteFields = () =>
  screen.getAllByPlaceholderText("Enter a description...");

const save = () => fireEvent.click(screen.getByRole("button", { name: "Save" }));

beforeEach(() => {
  vi.clearAllMocks();
  // react-select scrolls its highlighted option into view, which jsdom has no
  // implementation for.
  Element.prototype.scrollIntoView = vi.fn();
});

describe("laying out the steps", () => {
  it("renders one row per step, in order", () => {
    renderModal({ steps: TWO_STEPS });
    expect(rows()).toHaveLength(2);
    expect(rows()[0]).toHaveTextContent("Turn on the tap");
    expect(rows()[1]).toHaveTextContent("Wet hands");
  });

  it("stripes alternate rows", () => {
    renderModal({ steps: TWO_STEPS });
    expect(rows()[0]).toHaveClass("bg-white");
    expect(rows()[1]).toHaveClass("bg-gray-50");
  });

  it("gives every row its own pair of pickers and a note", () => {
    renderModal({ steps: TWO_STEPS });
    expect(pickersIn(0)).toHaveLength(2);
    expect(pickersIn(1)).toHaveLength(2);
    // Two per-step notes plus the sheet's overall note.
    expect(noteFields()).toHaveLength(3);
  });

  it("copes with a task that has no steps recorded", () => {
    renderModal({ steps: NO_STEPS });
    expect(rows()).toHaveLength(0);
    expect(screen.getByText("Task Analysis")).toBeInTheDocument();
  });

  it("renders nothing while it is closed", () => {
    const { container } = render(
      <TaskAnalysisModal
        isOpen={false}
        onClose={onClose}
        onSave={onSave}
        steps={ONE_STEP}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("opens with every cell unanswered", () => {
    renderModal();
    expect(within(rows()[0]).getAllByText("Select")).toHaveLength(2);
    expect(noteFields()[0]).toHaveValue("");
  });
});

describe("validation", () => {
  it("refuses to save a row with nothing chosen", async () => {
    renderModal();
    save();
    expect(await screen.findByText("Performance is required")).toBeInTheDocument();
    expect(screen.getByText("Prompt level is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("still refuses when only the performance has been chosen", async () => {
    renderModal();
    choose(pickersIn(0)[0], 0);
    save();
    expect(await screen.findByText("Prompt level is required")).toBeInTheDocument();
    expect(screen.queryByText("Performance is required")).not.toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("complains about each unanswered row separately", async () => {
    renderModal({ steps: TWO_STEPS });
    answerRow(0);
    save();
    await waitFor(() =>
      expect(screen.getAllByText("Performance is required")).toHaveLength(1)
    );
    expect(within(rows()[1]).getByText("Performance is required")).toBeInTheDocument();
  });
});

describe("saving a completed sheet", () => {
  it("hands back the chosen codes alongside the original step data", async () => {
    renderModal();
    // Second performance option (VP) and third prompt level (GP).
    answerRow(0, 1, 2);
    fireEvent.change(noteFields()[0], { target: { value: "Needed a reminder" } });
    fireEvent.change(noteFields()[1], { target: { value: "Good session" } });
    save();
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      steps: [
        {
          id: "s-1",
          description: "Turn on the tap",
          performance: "VP",
          promptLevel: "GP",
          notes: "Needed a reminder",
        },
      ],
      notes: "Good session",
    });
  });

  it("turns untouched notes into empty strings", async () => {
    renderModal();
    answerRow(0);
    save();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const payload = onSave.mock.calls[0][0];
    expect(payload.steps[0].notes).toBe("");
    expect(payload.notes).toBe("");
  });

  it("saves an empty sheet when the task has no steps", async () => {
    renderModal({ steps: NO_STEPS });
    save();
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ steps: [], notes: "" }));
  });

  it("keeps each row's answers with its own step", async () => {
    renderModal({ steps: TWO_STEPS });
    answerRow(0, 0, 0);
    answerRow(1, 7, 7);
    save();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const { steps } = onSave.mock.calls[0][0];
    expect(steps[0]).toMatchObject({ id: "s-1", performance: "I", promptLevel: "I" });
    expect(steps[1]).toMatchObject({
      id: "s-2",
      performance: "Error",
      promptLevel: "POS",
    });
  });
});

describe("dismissing the modal", () => {
  it("closes without saving", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("holds the save button while a submit is already in flight", () => {
    renderModal({ submitting: true });
    // The label is swapped for a spinner while loading, so there is no
    // accessible name left to query by.
    expect(document.body.querySelector('button[type="submit"]')).toBeDisabled();
  });
});
