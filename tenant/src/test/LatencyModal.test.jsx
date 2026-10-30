import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";

import LatencyModal from "../Components/ReusableModal/DataCollectionModal/LatencyModal";

/**
 * Latency data collection: one row per trial, each of which is stamped with the
 * moment the stimulus was presented, then timed until the behaviour starts.
 *
 * Everything on this screen is a clock reading, so the tests run on a fake one
 * pinned to 10:20:30 local time. Midnight would be a poor choice: the helper
 * that parses a HH:MM:SS stamp back into seconds returns 0 for "00:00:00", and
 * the modal reads a zero as "no stimulus recorded" and refuses to start.
 *
 * Row identity is read positionally (`row.cells[n]`) rather than by text,
 * because an untouched row renders the same "--:--:--" placeholder in three of
 * its four columns.
 */

const onSave = vi.fn();
const onClose = vi.fn();

const rows = () => Array.from(document.body.querySelectorAll("tbody tr"));
const cellText = (rowIdx, cellIdx) => rows()[rowIdx].cells[cellIdx].textContent;

const buttonIn = (rowIdx, name) =>
  within(rows()[rowIdx]).getByRole("button", { name });

const clickIn = (rowIdx, name) => {
  act(() => {
    fireEvent.click(buttonIn(rowIdx, name));
  });
};

const renderModal = (props = {}) =>
  render(
    <LatencyModal isOpen onClose={onClose} onSave={onSave} {...props} />
  );

const advance = (ms) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

// A whole trial: stamp the stimulus, start the timer, let it run, stop it.
const runTrial = (rowIdx, seconds) => {
  clickIn(rowIdx, "Present Stimulus");
  clickIn(rowIdx, "Record Behaviour");
  advance(seconds * 1000);
  clickIn(rowIdx, "Stop Recording");
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // Local time, because the stamp is built from getHours()/getMinutes().
  vi.setSystemTime(new Date(2026, 0, 1, 10, 20, 30));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("opening the modal", () => {
  it("renders nothing at all while it is closed", () => {
    const { container } = render(
      <LatencyModal isOpen={false} onClose={onClose} onSave={onSave} />
    );
    expect(container).toBeEmptyDOMElement();
    expect(rows()).toHaveLength(0);
  });

  it("lays out four trials by default", () => {
    renderModal();
    expect(rows()).toHaveLength(4);
    expect(cellText(0, 0)).toBe("1");
    expect(cellText(3, 0)).toBe("4");
  });

  it("lays out as many trials as it is asked for", () => {
    renderModal({ trialCount: 2 });
    expect(rows()).toHaveLength(2);
  });

  it("starts every trial blank", () => {
    renderModal({ trialCount: 1 });
    expect(cellText(0, 1)).toBe("--:--:--");
    expect(cellText(0, 2)).toBe("--:--:--");
    expect(cellText(0, 3)).toBe("--:--:--");
  });

  it("stripes alternate rows", () => {
    renderModal({ trialCount: 2 });
    expect(rows()[0]).toHaveClass("bg-white");
    expect(rows()[1]).toHaveClass("bg-gray-50");
  });

  it("rebuilds the trials when the count changes underneath it", () => {
    const { rerender } = renderModal({ trialCount: 2 });
    clickIn(0, "Present Stimulus");
    expect(cellText(0, 1)).toBe("10:20:30");
    rerender(
      <LatencyModal isOpen onClose={onClose} onSave={onSave} trialCount={3} />
    );
    expect(rows()).toHaveLength(3);
    expect(cellText(0, 1)).toBe("--:--:--");
  });
});

describe("timing one trial", () => {
  it("stamps the stimulus with the current time", () => {
    renderModal({ trialCount: 1 });
    clickIn(0, "Present Stimulus");
    expect(cellText(0, 1)).toBe("10:20:30");
    expect(buttonIn(0, "Record Behaviour")).toBeInTheDocument();
  });

  it("counts up from the stimulus time while it runs", () => {
    renderModal({ trialCount: 1 });
    clickIn(0, "Present Stimulus");
    clickIn(0, "Record Behaviour");
    expect(buttonIn(0, "Stop Recording")).toBeInTheDocument();
    advance(3000);
    expect(cellText(0, 2)).toBe("10:20:33");
  });

  it("records the elapsed latency when it is stopped", () => {
    renderModal({ trialCount: 1 });
    runTrial(0, 7);
    expect(cellText(0, 2)).toBe("10:20:37");
    expect(cellText(0, 3)).toBe("00hr:00mm:07ss");
    expect(buttonIn(0, "Reset")).toBeInTheDocument();
  });

  it("records a zero latency for a behaviour that starts immediately", () => {
    renderModal({ trialCount: 1 });
    clickIn(0, "Present Stimulus");
    clickIn(0, "Record Behaviour");
    clickIn(0, "Stop Recording");
    expect(cellText(0, 3)).toBe("00hr:00mm:00ss");
  });

  it("stops ticking once the trial is stopped", () => {
    renderModal({ trialCount: 1 });
    runTrial(0, 2);
    advance(10000);
    expect(cellText(0, 2)).toBe("10:20:32");
  });

  it("locks the other rows' stimulus buttons while one trial is running", () => {
    renderModal({ trialCount: 2 });
    clickIn(0, "Present Stimulus");
    clickIn(0, "Record Behaviour");
    expect(buttonIn(1, "Present Stimulus")).toBeDisabled();
  });
});

describe("resetting a trial", () => {
  it("clears the row back to its blank state", () => {
    renderModal({ trialCount: 1 });
    runTrial(0, 4);
    clickIn(0, "Reset");
    expect(cellText(0, 1)).toBe("--:--:--");
    expect(cellText(0, 2)).toBe("--:--:--");
    expect(cellText(0, 3)).toBe("--:--:--");
    expect(buttonIn(0, "Present Stimulus")).toBeEnabled();
  });

  it("leaves the other trials untouched", () => {
    renderModal({ trialCount: 2 });
    runTrial(0, 4);
    runTrial(1, 6);
    clickIn(1, "Reset");
    expect(cellText(0, 3)).toBe("00hr:00mm:04ss");
    expect(cellText(1, 3)).toBe("--:--:--");
  });

  it("can be timed again after a reset", () => {
    renderModal({ trialCount: 1 });
    runTrial(0, 4);
    clickIn(0, "Reset");
    runTrial(0, 2);
    expect(cellText(0, 3)).toBe("00hr:00mm:02ss");
  });
});

describe("the current-trial pointer", () => {
  it("follows whichever row was stamped last", () => {
    renderModal({ trialCount: 3 });
    clickIn(2, "Present Stimulus");
    clickIn(2, "Record Behaviour");
    advance(2000);
    // Only the row the pointer sits on shows the live count.
    expect(cellText(2, 2)).toBe("10:20:32");
    expect(cellText(0, 2)).toBe("--:--:--");
  });

  it("stamps a latency onto the wrong row when a finished trial is reset", () => {
    // Live defect, pinned to current behaviour rather than fixed: `resetTrial`
    // calls `stopLatency` unconditionally, and `stopLatency` writes to whichever
    // row the pointer is on -- by this point the row stamped most recently, not
    // the row being reset. Trial 2 ends up with a latency nobody recorded.
    renderModal({ trialCount: 2 });
    runTrial(0, 3);
    clickIn(1, "Present Stimulus");
    clickIn(0, "Reset");
    expect(cellText(0, 3)).toBe("--:--:--");
    expect(cellText(1, 3)).toBe("00hr:00mm:03ss");
  });

  it("refuses to start a trial when the pointer has been moved to a cleared row", () => {
    // The other half of the same defect: `startLatency` reads the stimulus off
    // the row the pointer is on, so once Reset has parked the pointer on a
    // cleared row, no other trial can be started at all.
    renderModal({ trialCount: 2 });
    clickIn(1, "Present Stimulus");
    runTrial(0, 3);
    clickIn(0, "Reset");
    clickIn(1, "Record Behaviour");
    expect(
      within(rows()[1]).queryByRole("button", { name: "Stop Recording" })
    ).not.toBeInTheDocument();
    expect(cellText(1, 2)).toBe("--:--:--");
  });
});

describe("saving", () => {
  it("hands back every trial together with the notes", () => {
    renderModal({ trialCount: 2 });
    runTrial(0, 5);
    fireEvent.change(screen.getByPlaceholderText("Enter a description..."), {
      target: { value: "Client was distracted" },
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    const { trials, notes } = onSave.mock.calls[0][0];
    expect(notes).toBe("Client was distracted");
    expect(trials).toHaveLength(2);
    expect(trials[0]).toMatchObject({
      trial: 1,
      stimulusPresented: "10:20:30",
      behaviourStart: "10:20:35",
      latency: 5,
    });
    // An untouched trial is still handed back, with nothing recorded on it.
    expect(trials[1]).toMatchObject({
      trial: 2,
      stimulusPresented: "",
      latency: null,
    });
  });

  it("closes without saving", () => {
    renderModal({ trialCount: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("holds the save button while a submit is already in flight", () => {
    renderModal({ trialCount: 1, submitting: true });
    // The label is replaced by a spinner while loading, so the button has no
    // accessible name left to query by.
    expect(document.body.querySelector('button[type="submit"]')).toBeDisabled();
  });
});
