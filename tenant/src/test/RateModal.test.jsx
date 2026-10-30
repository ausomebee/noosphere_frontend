import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

/**
 * RateModal records a rate observation: a count of occurrences, a stopwatch for
 * the observation window, and free-text notes. The stopwatch is the interesting
 * part -- it derives its reading from wall-clock time rather than from a tick
 * counter, stops itself when the tab is hidden, and writes its value into the
 * form on every second, which is why these tests run on fake timers and step
 * the clock explicitly.
 *
 * The occurrence box is `type="number"`, so jsdom (like a browser) refuses a
 * non-numeric keystroke outright and blocks submission of a negative value.
 * The schema's own messages are therefore reached by emptying the field, which
 * is the one invalid state the input itself allows.
 *
 * `initialData` comes from a module-level constant: the prop defaults to a
 * fresh `{}` and the modal re-reads it whenever it opens.
 */

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
}));

import RateModal from "../Components/ReusableModal/DataCollectionModal/RateModal";

const EMPTY = {};
const PREFILLED = { numberOfOccurrence: 4, duration: 65, notes: "Second session" };

const renderModal = (props = {}) =>
  render(
    <RateModal
      isOpen
      onClose={vi.fn()}
      onSave={vi.fn()}
      initialData={EMPTY}
      {...props}
    />
  );

const occurrence = () => document.body.querySelector('input[name="numberOfOccurrence"]');
const notes = () => document.body.querySelector('textarea[name="notes"]');
const duration = () => document.body.querySelector('[aria-live="polite"]').textContent;
const save = async () => {
  await act(async () => {
    fireEvent.click(document.body.querySelector('button[type="submit"]'));
  });
};
const button = (label) => screen.getByRole("button", { name: label });

const tick = async (ms) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("opening the modal", () => {
  it("shows an empty form and a stopped clock", () => {
    renderModal();
    expect(screen.getByText("Rate")).toBeInTheDocument();
    expect(occurrence()).toHaveValue(0);
    expect(notes()).toHaveValue("");
    expect(duration()).toContain("00:00");
    expect(button("Start Recording")).toBeInTheDocument();
  });

  it("renders nothing while closed", () => {
    render(
      <RateModal isOpen={false} onClose={vi.fn()} onSave={vi.fn()} initialData={EMPTY} />
    );
    expect(document.body.querySelector(".modal-overlay")).toBeNull();
  });

  it("fills itself from an earlier observation", () => {
    renderModal({ initialData: PREFILLED });
    expect(occurrence()).toHaveValue(4);
    expect(notes()).toHaveValue("Second session");
  });

  it("throws the observation's recorded duration away when it opens", () => {
    // The timer is seeded from `initialData.duration`, but the open effect
    // resets it before the first paint, so an edit always starts at zero.
    // Asserted as it behaves today.
    renderModal({ initialData: PREFILLED });
    expect(duration()).toContain("00:00");
  });

  it("empties itself again when it is closed and reopened", async () => {
    const { rerender } = renderModal({ initialData: PREFILLED });
    fireEvent.change(occurrence(), { target: { value: "9" } });
    fireEvent.change(notes(), { target: { value: "scratch" } });

    await act(async () => {
      rerender(
        <RateModal isOpen={false} onClose={vi.fn()} onSave={vi.fn()} initialData={PREFILLED} />
      );
    });
    await act(async () => {
      rerender(
        <RateModal isOpen onClose={vi.fn()} onSave={vi.fn()} initialData={PREFILLED} />
      );
    });

    expect(occurrence()).toHaveValue(4);
    expect(notes()).toHaveValue("Second session");
    // The timer is reset outright rather than restored, so the clock restarts.
    expect(duration()).toContain("00:00");
  });
});

describe("the stopwatch", () => {
  it("counts up in seconds once recording starts", async () => {
    renderModal();
    fireEvent.click(button("Start Recording"));
    await tick(3000);
    expect(duration()).toContain("00:03");

    await tick(60000);
    expect(duration()).toContain("01:03");
  });

  it("offers only Stop while it is running", async () => {
    renderModal();
    fireEvent.click(button("Start Recording"));
    await tick(2000);
    // The Start button is replaced by Stop, so a repeat start can only arrive
    // from a stray event; the reading must not jump back to zero.
    expect(screen.queryByRole("button", { name: "Start Recording" })).toBeNull();
    expect(duration()).toContain("00:02");
  });

  it("freezes the reading when recording stops", async () => {
    renderModal();
    fireEvent.click(button("Start Recording"));
    await tick(5000);
    fireEvent.click(button("Stop Recording"));

    expect(duration()).toContain("00:05");
    await tick(10000);
    expect(duration()).toContain("00:05");
    expect(button("Stopped")).toBeDisabled();
  });

  it("starts a fresh recording rather than resuming a stopped one", async () => {
    renderModal();
    fireEvent.click(button("Start Recording"));
    await tick(4000);
    fireEvent.click(button("Stop Recording"));
    // Stopped, so the only way back is the Reset button; recording restarts
    // from zero rather than continuing.
    fireEvent.click(button("Reset"));
    expect(duration()).toContain("00:00");
    expect(button("Start Recording")).toBeInTheDocument();
  });

  it("stops itself when the tab is hidden", async () => {
    renderModal();
    fireEvent.click(button("Start Recording"));
    await tick(3000);

    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(button("Stopped")).toBeInTheDocument();

    await tick(5000);
    expect(duration()).toContain("00:03");
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  it("does nothing when the tab is hidden while it was not running", async () => {
    renderModal();
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(button("Start Recording")).toBeInTheDocument();
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  it("keeps the tab visible without touching the clock", async () => {
    renderModal();
    fireEvent.click(button("Start Recording"));
    await tick(2000);
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(button("Stop Recording")).toBeInTheDocument();
  });
});

describe("the reset button", () => {
  it("stays hidden until a recording has been stopped", async () => {
    renderModal();
    expect(screen.queryByRole("button", { name: "Reset" })).toBeNull();

    fireEvent.click(button("Start Recording"));
    await tick(1000);
    expect(screen.queryByRole("button", { name: "Reset" })).toBeNull();

    fireEvent.click(button("Stop Recording"));
    expect(button("Reset")).toBeInTheDocument();
  });

  it("clears the clock and the occurrence count together", async () => {
    renderModal();
    fireEvent.change(occurrence(), { target: { value: "7" } });
    fireEvent.click(button("Start Recording"));
    await tick(9000);
    fireEvent.click(button("Stop Recording"));
    fireEvent.click(button("Reset"));

    expect(duration()).toContain("00:00");
    expect(occurrence()).toHaveValue(0);
    expect(button("Start Recording")).toBeInTheDocument();
  });
});

describe("saving the observation", () => {
  it("sends the count, the recorded duration, the notes and the type", async () => {
    const onSave = vi.fn();
    renderModal({ onSave });
    fireEvent.change(occurrence(), { target: { value: "6" } });
    fireEvent.change(notes(), { target: { value: "Hand raising" } });
    fireEvent.click(button("Start Recording"));
    await tick(7000);
    fireEvent.click(button("Stop Recording"));
    await save();

    expect(onSave).toHaveBeenCalledWith({
      numberOfOccurrence: 6,
      duration: 7,
      notes: "Hand raising",
      dataCollectionType: "Rate",
    });
  });

  it("saves a zero-length observation happily", async () => {
    const onSave = vi.fn();
    renderModal({ onSave });
    await save();
    expect(onSave).toHaveBeenCalledWith({
      numberOfOccurrence: 0,
      duration: 0,
      notes: "",
      dataCollectionType: "Rate",
    });
  });

  it("refuses an empty occurrence count and says why", async () => {
    const onSave = vi.fn();
    renderModal({ onSave });
    fireEvent.change(occurrence(), { target: { value: "" } });
    await save();

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Number of occurrence must be a number")).toBeInTheDocument();
    expect(toast.showToast).toHaveBeenCalledWith(
      "Number of occurrence must be a number",
      "error"
    );
  });

  it("takes the count back once it is filled in again", async () => {
    const onSave = vi.fn();
    renderModal({ onSave });
    fireEvent.change(occurrence(), { target: { value: "" } });
    await save();
    fireEvent.change(occurrence(), { target: { value: "3" } });
    await save();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ numberOfOccurrence: 3 })
    );
  });

  it("closes without saving from Cancel", () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    renderModal({ onClose, onSave });
    fireEvent.click(document.body.querySelector(".modal-btn-secondary"));
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("while the observation is being saved", () => {
  it("shows a loader and locks every control", () => {
    renderModal({ submitting: true });
    expect(screen.getByText("Saving data...")).toBeInTheDocument();
    expect(occurrence()).toBeDisabled();
    expect(notes()).toBeDisabled();
    expect(button("Start Recording")).toBeDisabled();
    expect(document.body.querySelector('button[type="submit"]')).toBeDisabled();
  });

  it("leaves the controls alone the rest of the time", () => {
    renderModal();
    expect(screen.queryByText("Saving data...")).toBeNull();
    expect(occurrence()).not.toBeDisabled();
    expect(button("Start Recording")).not.toBeDisabled();
  });
});
