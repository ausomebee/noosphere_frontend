import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import TrialsOpportunities from "../Components/ReusableModal/DataCollectionModal/TrialsOpportunitiesModal";
import formDraftsReducer from "../ReduxStore/features/formDraftsSlice";

/**
 * The trials/opportunities data collection grid: one row per trial, each with a
 * four-way performance choice, a prompt level picker and a notes box, over a
 * yup schema that makes both choices compulsory on every row.
 *
 * The performance "radio" buttons are really four checkboxes bound to the same
 * form field with no `htmlFor` on their labels, so they are addressed by
 * position within the row's performance cell rather than by label text. The
 * prompt level is react-select with its menu portalled to the body, driven here
 * off the hidden text box with ArrowDown/Enter.
 *
 * The form persists itself into the `formDrafts` redux slice as it is filled
 * in, so every render needs a real store; the draft is written on a 300ms
 * debounce, which is why the draft tests advance fake timers rather than
 * waiting. Validation is `onTouched`, so the inline messages only appear once a
 * submit has been attempted.
 */

const makeStore = (formDrafts = {}) =>
  configureStore({
    reducer: { formDrafts: formDraftsReducer },
    preloadedState: { formDrafts },
  });

const renderModal = ({ store = makeStore(), ...props } = {}) => {
  const onClose = vi.fn();
  const onSave = vi.fn();
  const view = render(
    <Provider store={store}>
      <TrialsOpportunities isOpen onClose={onClose} onSave={onSave} {...props} />
    </Provider>
  );
  return { ...view, onClose, onSave, store };
};

const rows = () => Array.from(document.body.querySelectorAll("tbody tr"));
const performanceBoxes = (index) =>
  Array.from(rows()[index].querySelectorAll(".performance-cell input[type='checkbox']"));
const CORRECT = 0;
const INCORRECT = 1;
const NO_RESPONSE = 2;
const REFUSED = 3;

const promptInput = (index) => rows()[index].querySelector(".select-input-wrapper input");
const promptValue = (index) =>
  rows()[index].querySelector(".rs__single-value")?.textContent ?? "";

const choosePrompt = (index, label) => {
  const input = promptInput(index);
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
  const menus = document.body.querySelectorAll(".rs__menu");
  const option = Array.from(
    menus[menus.length - 1].querySelectorAll(".rs__option")
  ).find((o) => o.textContent === label);
  if (!option) throw new Error(`no prompt level "${label}"`);
  fireEvent.click(option);
};

const rowNotes = (index) => rows()[index].querySelector(".notes-cell textarea");
const overallNotes = () =>
  document.body.querySelector(".modal-notes-section textarea");

const primary = () => document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.body.querySelector(".modal-btn-secondary");
const errorTexts = () =>
  Array.from(document.body.querySelectorAll(".text-red-500")).map((e) => e.textContent);

const submit = async () =>
  act(async () => {
    fireEvent.click(primary());
  });

const fillRow = (index) => {
  fireEvent.click(performanceBoxes(index)[CORRECT]);
  choosePrompt(index, "I - Independent");
};

beforeEach(() => {
  window.scrollTo = vi.fn();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the grid", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(document.body.querySelector(".modal-content")).toBeNull();
  });

  it("opens with three empty trials by default", () => {
    renderModal();
    expect(document.body.querySelector(".modal-title-text")).toHaveTextContent(
      "Trials/Opportunities"
    );
    expect(rows()).toHaveLength(3);
    expect(rows().map((r) => r.querySelector(".trial-number").textContent)).toEqual([
      "1",
      "2",
      "3",
    ]);
    performanceBoxes(0).forEach((box) => expect(box).not.toBeChecked());
    expect(promptValue(0)).toBe("");
    expect(rowNotes(0)).toHaveValue("");
    expect(overallNotes()).toHaveValue("");
  });

  it("draws as many rows as the target asks for", () => {
    renderModal({ trialCount: 5 });
    expect(rows()).toHaveLength(5);
  });

  it("draws no rows at all for a zero trial count", () => {
    renderModal({ trialCount: 0 });
    expect(rows()).toHaveLength(0);
  });

  it("stripes alternate rows", () => {
    renderModal({ trialCount: 4 });
    expect(rows()[0]).toHaveClass("bg-white");
    expect(rows()[1]).toHaveClass("bg-gray-50");
    expect(rows()[2]).toHaveClass("bg-white");
    expect(rows()[3]).toHaveClass("bg-gray-50");
  });

  it("offers the eight prompt levels", () => {
    renderModal({ trialCount: 1 });
    const input = promptInput(0);
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
    const labels = Array.from(document.body.querySelectorAll(".rs__option")).map(
      (o) => o.textContent
    );
    expect(labels).toEqual([
      "I - Independent",
      "VP - Verbal Prompt",
      "GP - Gesture Prompt",
      "MP - Model Prompt",
      "PPP - Partial Physical Prompt",
      "FPP - Full Physical Prompt",
      "VIS - Visual Prompt",
      "POS - Positional Prompt",
    ]);
  });

  it("rebuilds the grid when the trial count changes", () => {
    const store = makeStore();
    const { rerender } = renderModal({ trialCount: 2, store });
    fireEvent.click(performanceBoxes(0)[CORRECT]);
    rerender(
      <Provider store={store}>
        <TrialsOpportunities isOpen onClose={vi.fn()} onSave={vi.fn()} trialCount={4} />
      </Provider>
    );
    expect(rows()).toHaveLength(4);
    expect(performanceBoxes(0)[CORRECT]).not.toBeChecked();
  });
});

describe("picking a performance", () => {
  it("checks only the option that was clicked", () => {
    renderModal({ trialCount: 1 });
    fireEvent.click(performanceBoxes(0)[INCORRECT]);
    expect(performanceBoxes(0)[CORRECT]).not.toBeChecked();
    expect(performanceBoxes(0)[INCORRECT]).toBeChecked();
    expect(performanceBoxes(0)[NO_RESPONSE]).not.toBeChecked();
    expect(performanceBoxes(0)[REFUSED]).not.toBeChecked();
  });

  it("moves the choice when another option is clicked", () => {
    renderModal({ trialCount: 1 });
    fireEvent.click(performanceBoxes(0)[NO_RESPONSE]);
    fireEvent.click(performanceBoxes(0)[REFUSED]);
    expect(performanceBoxes(0)[NO_RESPONSE]).not.toBeChecked();
    expect(performanceBoxes(0)[REFUSED]).toBeChecked();
  });

  it("keeps each trial's choice to itself", () => {
    renderModal({ trialCount: 2 });
    fireEvent.click(performanceBoxes(0)[CORRECT]);
    expect(performanceBoxes(1)[CORRECT]).not.toBeChecked();
  });
});

describe("validation", () => {
  it("refuses a grid where nothing has been filled in", async () => {
    const { onSave } = renderModal({ trialCount: 1 });
    await submit();
    await waitFor(() =>
      expect(screen.getByText("Performance is required")).toBeInTheDocument()
    );
    expect(screen.getByText("Prompt level is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("complains about every unfilled row, not just the first", async () => {
    renderModal({ trialCount: 3 });
    await submit();
    await waitFor(() =>
      expect(screen.getAllByText("Performance is required")).toHaveLength(3)
    );
  });

  it("refuses a row with a performance but no prompt level", async () => {
    const { onSave } = renderModal({ trialCount: 1 });
    fireEvent.click(performanceBoxes(0)[CORRECT]);
    await submit();
    await waitFor(() =>
      expect(screen.getByText("Prompt level is required")).toBeInTheDocument()
    );
    expect(screen.queryByText("Performance is required")).not.toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a row with a prompt level but no performance", async () => {
    const { onSave } = renderModal({ trialCount: 1 });
    choosePrompt(0, "VP - Verbal Prompt");
    await submit();
    await waitFor(() =>
      expect(screen.getByText("Performance is required")).toBeInTheDocument()
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("clears the inline complaints once the row is completed", async () => {
    renderModal({ trialCount: 1 });
    await submit();
    await waitFor(() => expect(errorTexts()).toHaveLength(2));
    fillRow(0);
    await submit();
    await waitFor(() => expect(errorTexts()).toEqual([]));
  });
});

describe("saving", () => {
  it("hands up one entry per trial with the empty notes filled in as blanks", async () => {
    const { onSave } = renderModal({ trialCount: 2 });
    fillRow(0);
    fireEvent.click(performanceBoxes(1)[REFUSED]);
    choosePrompt(1, "FPP - Full Physical Prompt");
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toEqual({
      trials: [
        { id: 1, performance: "correct", promptLevel: "I", notes: "" },
        { id: 2, performance: "refused", promptLevel: "FPP", notes: "" },
      ],
      // The form field is `overallNotes`; the payload calls it `notes`.
      notes: "",
    });
  });

  it("carries the per-row and overall notes through", async () => {
    const { onSave } = renderModal({ trialCount: 1 });
    fillRow(0);
    fireEvent.change(rowNotes(0), { target: { value: "Prompted twice" } });
    fireEvent.change(overallNotes(), { target: { value: "Good session" } });
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toEqual({
      trials: [{ id: 1, performance: "correct", promptLevel: "I", notes: "Prompted twice" }],
      notes: "Good session",
    });
  });

  it("saves an empty payload for a grid with no rows to fill in", async () => {
    const { onSave } = renderModal({ trialCount: 0 });
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toEqual({ trials: [], notes: "" });
  });

  it("locks the Save button while a submit is in flight", () => {
    renderModal({ submitting: true });
    expect(primary()).toBeDisabled();
  });
});

describe("the modal shell", () => {
  it("closes from Cancel without saving", () => {
    const { onClose, onSave } = renderModal({ trialCount: 1 });
    fillRow(0);
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("closes from Escape", () => {
    const { onClose } = renderModal({ trialCount: 1 });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("the saved draft", () => {
  it("keeps what was filled in when the modal is closed without saving", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { store } = renderModal({ trialCount: 1 });
    fireEvent.click(performanceBoxes(0)[INCORRECT]);
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(store.getState().formDrafts["trials-opportunities"].values.trials[0]).toMatchObject(
      { performance: "incorrect" }
    );
    vi.useRealTimers();
  });

  it("restores a fresh draft over the blank defaults when it reopens", async () => {
    const store = makeStore({
      "trials-opportunities": {
        values: {
          trials: [{ id: 1, performance: "noResponse", promptLevel: "MP", notes: "From draft" }],
          overallNotes: "Earlier notes",
        },
        savedAt: Date.now(),
      },
    });
    renderModal({ trialCount: 1, store });
    await waitFor(() => expect(performanceBoxes(0)[NO_RESPONSE]).toBeChecked());
    expect(promptValue(0)).toBe("MP - Model Prompt");
    expect(rowNotes(0)).toHaveValue("From draft");
    expect(overallNotes()).toHaveValue("Earlier notes");
  });

  it("throws away a draft that is older than its lifetime", async () => {
    const store = makeStore({
      "trials-opportunities": {
        values: { trials: [{ id: 1, performance: "correct", promptLevel: "I", notes: "Stale" }] },
        // Eight days old, past the seven-day default.
        savedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
      },
    });
    renderModal({ trialCount: 1, store });
    await waitFor(() =>
      expect(store.getState().formDrafts["trials-opportunities"]).toBeUndefined()
    );
    expect(performanceBoxes(0)[CORRECT]).not.toBeChecked();
  });

  it("drops the draft once the grid is saved", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { store } = renderModal({ trialCount: 1 });
    fillRow(0);
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(store.getState().formDrafts["trials-opportunities"]).toBeDefined();
    await submit();
    await waitFor(() =>
      expect(store.getState().formDrafts["trials-opportunities"]).toBeUndefined()
    );
    vi.useRealTimers();
  });
});
