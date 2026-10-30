import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import PercentageCorrect from "../Components/ReusableModal/DataCollectionModal/PercentageCorrectModal";
import formDraftsReducer from "../ReduxStore/features/formDraftsSlice";

/**
 * The percentage-correct data collection grid: one row per trial with a
 * four-way performance choice, a prompt level picker and a notes box, plus a
 * running tally that recomputes from the watched performance fields every time
 * one of them changes.
 *
 * The performance "radios" are really four checkboxes bound to a single form
 * field, and their labels carry no `htmlFor`, so they are addressed by position
 * inside the row's performance cell. The prompt level is react-select with a
 * portalled menu, driven off the hidden text box. The form persists itself into
 * the `formDrafts` redux slice on a debounce, so every render needs a real
 * store.
 *
 * The tally and the saved percentage are computed twice from separate code —
 * once in the watch effect and once in the submit handler — which is why both
 * are asserted rather than just the displayed one.
 */

const makeStore = (formDrafts = {}) =>
  configureStore({
    reducer: { formDrafts: formDraftsReducer },
    preloadedState: { formDrafts },
  });

const renderModal = ({ store = makeStore(), ...props } = {}) => {
  const onClose = vi.fn();
  const onSave = vi.fn().mockResolvedValue(undefined);
  const view = render(
    <Provider store={store}>
      <PercentageCorrect isOpen onClose={onClose} onSave={onSave} {...props} />
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
const overallNotes = () => document.body.querySelector(".modal-notes-section textarea");
const tally = () => document.body.querySelector(".percentage-result h3").textContent;
const primary = () => document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.body.querySelector(".modal-btn-secondary");
const errorTexts = () =>
  Array.from(document.body.querySelectorAll(".text-red-500")).map((e) => e.textContent);

const submit = async () => {
  await act(async () => {
    fireEvent.click(primary());
  });
};

// A complete row: one performance choice plus the prompt level the schema
// insists on.
const fillRow = (index, box = CORRECT) => {
  fireEvent.click(performanceBoxes(index)[box]);
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
  it("renders nothing at all while it is closed", () => {
    const { container } = renderModal({ isOpen: false });
    expect(container).toBeEmptyDOMElement();
    expect(rows()).toHaveLength(0);
  });

  it("lays out three trials by default", () => {
    renderModal();
    expect(rows()).toHaveLength(3);
    expect(rows()[0].cells[0]).toHaveTextContent("1");
    expect(rows()[2].cells[0]).toHaveTextContent("3");
    expect(document.body.querySelector(".modal-title-text")).toHaveTextContent(
      "Percentage Correct"
    );
  });

  it("lays out as many trials as it is asked for", () => {
    renderModal({ trialCount: 5 });
    expect(rows()).toHaveLength(5);
    expect(rows()[4].cells[0]).toHaveTextContent("5");
  });

  // Row striping alternates on the index, so both arms need at least two rows.
  it("stripes alternate rows", () => {
    renderModal();
    expect(rows()[0].className).toContain("bg-white");
    expect(rows()[1].className).toContain("bg-gray-50");
    expect(rows()[2].className).toContain("bg-white");
  });

  it("opens with every row blank and the tally at zero", () => {
    renderModal();
    expect(performanceBoxes(0).every((b) => !b.checked)).toBe(true);
    expect(rowNotes(0)).toHaveValue("");
    expect(overallNotes()).toHaveValue("");
    expect(tally()).toBe("Percentage Correct: 0%");
  });

  it("closes from Cancel without saving", () => {
    const { onClose, onSave } = renderModal();
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("closes from Escape", () => {
    const { onClose } = renderModal();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("locks both footer buttons while the caller reports a save in flight", () => {
    renderModal({ submitting: true });
    expect(primary()).toBeDisabled();
  });
});

describe("the running tally", () => {
  it("counts a single correct trial as a third", () => {
    renderModal();
    fireEvent.click(performanceBoxes(0)[CORRECT]);
    expect(tally()).toBe("Percentage Correct: 33%");
  });

  it("reaches a hundred when every trial is correct", () => {
    renderModal();
    fireEvent.click(performanceBoxes(0)[CORRECT]);
    fireEvent.click(performanceBoxes(1)[CORRECT]);
    fireEvent.click(performanceBoxes(2)[CORRECT]);
    expect(tally()).toBe("Percentage Correct: 100%");
  });

  it("ignores the three non-correct outcomes", () => {
    renderModal();
    fireEvent.click(performanceBoxes(0)[INCORRECT]);
    fireEvent.click(performanceBoxes(1)[NO_RESPONSE]);
    fireEvent.click(performanceBoxes(2)[REFUSED]);
    expect(tally()).toBe("Percentage Correct: 0%");
  });

  it("drops back down when a correct trial is changed to incorrect", () => {
    renderModal();
    fireEvent.click(performanceBoxes(0)[CORRECT]);
    fireEvent.click(performanceBoxes(1)[CORRECT]);
    expect(tally()).toBe("Percentage Correct: 67%");
    fireEvent.click(performanceBoxes(1)[REFUSED]);
    expect(tally()).toBe("Percentage Correct: 33%");
  });

  // The effect's empty-trials arm: with nothing to average the tally is pinned
  // at zero rather than left as NaN.
  it("shows zero when there are no trials to score", () => {
    renderModal({ trialCount: 0 });
    expect(rows()).toHaveLength(0);
    expect(tally()).toBe("Percentage Correct: 0%");
  });
});

describe("saving", () => {
  it("refuses a grid with nothing filled in", async () => {
    const { onSave } = renderModal();
    await submit();
    await waitFor(() => expect(errorTexts().length).toBeGreaterThan(0));
    expect(errorTexts()).toContain("Please select a performance option");
    expect(errorTexts()).toContain("Please select a prompt level");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a row with a performance but no prompt level", async () => {
    const { onSave } = renderModal({ trialCount: 1 });
    fireEvent.click(performanceBoxes(0)[CORRECT]);
    await submit();
    await waitFor(() => expect(errorTexts()).toContain("Please select a prompt level"));
    expect(errorTexts()).not.toContain("Please select a performance option");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a row with a prompt level but no performance", async () => {
    const { onSave } = renderModal({ trialCount: 1 });
    choosePrompt(0, "I - Independent");
    await submit();
    await waitFor(() => expect(errorTexts()).toContain("Please select a performance option"));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("hands the caller every row, the notes and the final percentage", async () => {
    const { onSave } = renderModal({ trialCount: 2 });
    fillRow(0, CORRECT);
    fillRow(1, INCORRECT);
    fireEvent.change(rowNotes(0), { target: { value: "clean trial" } });
    fireEvent.change(overallNotes(), { target: { value: "good session" } });
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const payload = onSave.mock.calls[0][0];
    expect(payload.percentageCorrect).toBe(50);
    expect(payload.notes).toBe("good session");
    expect(payload.trials).toHaveLength(2);
    expect(payload.trials[0]).toMatchObject({
      id: 1,
      performance: "correct",
      promptLevel: "I",
      notes: "clean trial",
    });
    expect(payload.trials[1]).toMatchObject({ id: 2, performance: "incorrect" });
  });

  it("saves a hundred percent when every row is correct", async () => {
    const { onSave } = renderModal({ trialCount: 2 });
    fillRow(0, CORRECT);
    fillRow(1, CORRECT);
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].percentageCorrect).toBe(100);
  });

  it("saves an empty overall note as an empty string", async () => {
    const { onSave } = renderModal({ trialCount: 1 });
    fillRow(0, REFUSED);
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].notes).toBe("");
    expect(onSave.mock.calls[0][0].percentageCorrect).toBe(0);
  });

  // A rejected save is swallowed into a toast rather than bubbling, and the
  // draft is deliberately left in place so the grid can be resubmitted.
  it("keeps the draft when the caller rejects the save", async () => {
    const store = makeStore();
    const { onSave } = renderModal({ store, trialCount: 1 });
    onSave.mockRejectedValue(new Error("500"));
    fillRow(0, CORRECT);
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(performanceBoxes(0)[CORRECT].checked).toBe(true);
  });

  it("clears the persisted draft once the save lands", async () => {
    const store = makeStore({
      "percentage-correct": {
        values: { trials: [], overallNotes: "" },
        savedAt: Date.now(),
      },
    });
    const { onSave } = renderModal({ store, trialCount: 1 });
    fillRow(0, CORRECT);
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    await waitFor(() =>
      expect(store.getState().formDrafts["percentage-correct"]).toBeUndefined()
    );
  });
});

describe("reopening", () => {
  // The reset effect keys off `isOpen`, so a modal that is closed and opened
  // again comes back blank rather than showing the previous session's grid.
  it("blanks the grid and the tally when it is reopened", async () => {
    const { rerender, store, onSave, onClose } = renderModal({ trialCount: 2 });
    fireEvent.click(performanceBoxes(0)[CORRECT]);
    expect(tally()).toBe("Percentage Correct: 50%");

    rerender(
      <Provider store={store}>
        <PercentageCorrect
          isOpen={false}
          onClose={onClose}
          onSave={onSave}
          trialCount={2}
        />
      </Provider>
    );
    expect(screen.queryByText(/Percentage Correct:/)).toBeNull();

    rerender(
      <Provider store={store}>
        <PercentageCorrect isOpen onClose={onClose} onSave={onSave} trialCount={2} />
      </Provider>
    );
    await waitFor(() => expect(tally()).toBe("Percentage Correct: 0%"));
  });
});
