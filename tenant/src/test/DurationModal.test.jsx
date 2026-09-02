import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import DurationModal from "../Components/ReusableModal/DataCollectionModal/DurationModal";

/**
 * The data collection stopwatch: one modal with a start/stop/reset timer and a
 * notes box, saving `{ duration, notes }` upward.
 *
 * The elapsed seconds are recomputed from `Date.now()` on every tick rather
 * than counted, so the clock has to be frozen and advanced deliberately; every
 * test here runs on fake timers and moves time only through
 * `vi.advanceTimersByTime`. The three recording buttons occupy the same slot
 * and are told apart by their labels: "Start Recording" before the first run,
 * "Stop Recording" while running, and a permanently disabled "Stopped"
 * afterwards -- so the stopped state is asserted rather than clicked.
 *
 * The reopen tests document a wrinkle: the effect that resets the modal clears
 * the duration and the started flag but leaves the start timestamp behind, so a
 * timer started after a reopen carries on counting from the original start.
 */

const primary = () => document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.body.querySelector(".modal-btn-secondary");
const display = () => document.body.querySelector(".text-xl").textContent;
const notes = () => screen.getByPlaceholderText("Enter a description...");
const button = (name) => screen.getByRole("button", { name });

const renderModal = (props = {}) => {
  const onClose = vi.fn();
  const onSave = vi.fn();
  const view = render(
    <DurationModal isOpen onClose={onClose} onSave={onSave} {...props} />
  );
  return { ...view, onClose, onSave };
};

const tick = (ms) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

beforeEach(() => {
  // ReusableModal restores the page scroll position on unmount, which jsdom
  // has no implementation for.
  window.scrollTo = vi.fn();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2024-05-01T10:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the modal shell", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(document.body.querySelector(".modal-content")).toBeNull();
  });

  it("titles itself and offers Save and Cancel", () => {
    renderModal();
    expect(document.body.querySelector(".modal-title-text")).toHaveTextContent("Duration");
    expect(primary()).toHaveTextContent("Save");
    expect(secondary()).toHaveTextContent("Cancel");
  });

  it("closes from Cancel", () => {
    const { onClose } = renderModal();
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
  });

  it("closes from Escape", () => {
    const { onClose } = renderModal();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("locks the Save button while a submit is in flight", () => {
    renderModal({ submitting: true });
    expect(primary()).toBeDisabled();
    expect(document.body.querySelector(".modal-btn-spinner")).toBeInTheDocument();
  });
});

describe("the clock face", () => {
  it("opens at zero when nothing has been recorded before", () => {
    renderModal();
    expect(display()).toBe("Duration 00:00");
  });

  it("opens on a duration recorded earlier", () => {
    renderModal({ initialDuration: 125 });
    expect(display()).toBe("Duration 02:05");
  });

  it("pads a single-digit count of seconds", () => {
    renderModal({ initialDuration: 7 });
    expect(display()).toBe("Duration 00:07");
  });
});

describe("recording", () => {
  it("offers only Start Recording before anything has run", () => {
    renderModal();
    expect(button("Start Recording")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reset" })).not.toBeInTheDocument();
  });

  it("counts up once a second while running", () => {
    renderModal();
    fireEvent.click(button("Start Recording"));
    expect(button("Stop Recording")).toBeInTheDocument();
    tick(1000);
    expect(display()).toBe("Duration 00:01");
    tick(64000);
    expect(display()).toBe("Duration 01:05");
  });

  it("overwrites a previously recorded duration once it starts counting", () => {
    renderModal({ initialDuration: 300 });
    fireEvent.click(button("Start Recording"));
    tick(2000);
    expect(display()).toBe("Duration 00:02");
  });

  it("freezes the count on Stop and offers a Reset", () => {
    renderModal();
    fireEvent.click(button("Start Recording"));
    tick(5000);
    fireEvent.click(button("Stop Recording"));
    expect(display()).toBe("Duration 00:05");
    tick(4000);
    expect(display()).toBe("Duration 00:05");
    expect(button("Reset")).toBeInTheDocument();
  });

  it("leaves a stopped timer with a dead Stopped button rather than a restart", () => {
    renderModal();
    fireEvent.click(button("Start Recording"));
    tick(1000);
    fireEvent.click(button("Stop Recording"));
    expect(button("Stopped")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Start Recording" })).not.toBeInTheDocument();
  });

  it("puts the clock back to zero and offers a fresh start on Reset", () => {
    renderModal({ initialDuration: 40 });
    fireEvent.click(button("Start Recording"));
    tick(3000);
    fireEvent.click(button("Stop Recording"));
    fireEvent.click(button("Reset"));
    expect(display()).toBe("Duration 00:00");
    expect(button("Start Recording")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reset" })).not.toBeInTheDocument();
  });

  it("counts from zero again after a Reset", () => {
    renderModal();
    fireEvent.click(button("Start Recording"));
    tick(6000);
    fireEvent.click(button("Stop Recording"));
    fireEvent.click(button("Reset"));
    fireEvent.click(button("Start Recording"));
    tick(2000);
    expect(display()).toBe("Duration 00:02");
  });
});

describe("leaving the tab", () => {
  const hide = (hidden) => {
    Object.defineProperty(document, "hidden", { value: hidden, configurable: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
  };

  afterEach(() => {
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  it("catches the clock up when the tab is hidden mid-recording", () => {
    renderModal();
    fireEvent.click(button("Start Recording"));
    // Move the wall clock without letting the interval fire, the way a
    // backgrounded tab throttles it.
    vi.setSystemTime(Date.now() + 9000);
    hide(true);
    expect(display()).toBe("Duration 00:09");
  });

  it("ignores a tab that comes back into view", () => {
    renderModal();
    fireEvent.click(button("Start Recording"));
    tick(3000);
    vi.setSystemTime(Date.now() + 20000);
    hide(false);
    expect(display()).toBe("Duration 00:03");
  });

  it("ignores a hidden tab when nothing is being recorded", () => {
    renderModal({ initialDuration: 30 });
    vi.setSystemTime(Date.now() + 20000);
    hide(true);
    expect(display()).toBe("Duration 00:30");
  });
});

describe("reopening", () => {
  it("stops a running timer and clears the form", () => {
    const { rerender } = renderModal();
    fireEvent.click(button("Start Recording"));
    tick(4000);
    fireEvent.change(notes(), { target: { value: "Typed then abandoned" } });

    rerender(<DurationModal isOpen={false} onClose={vi.fn()} onSave={vi.fn()} />);
    rerender(<DurationModal isOpen onClose={vi.fn()} onSave={vi.fn()} />);

    expect(display()).toBe("Duration 00:00");
    expect(notes()).toHaveValue("");
    expect(button("Start Recording")).toBeInTheDocument();
    // The cleared interval must not keep writing to the display.
    tick(3000);
    expect(display()).toBe("Duration 00:00");
  });

  it("reseeds the clock from a new initial duration", () => {
    const { rerender } = renderModal({ initialDuration: 0 });
    rerender(<DurationModal isOpen onClose={vi.fn()} onSave={vi.fn()} initialDuration={90} />);
    expect(display()).toBe("Duration 01:30");
  });

  it("keeps counting from the original start when restarted after a reopen", () => {
    const { rerender } = renderModal();
    fireEvent.click(button("Start Recording"));
    tick(5000);

    rerender(<DurationModal isOpen={false} onClose={vi.fn()} onSave={vi.fn()} />);
    rerender(<DurationModal isOpen onClose={vi.fn()} onSave={vi.fn()} />);

    // The start timestamp survived the reset, so the clock resumes at 5s.
    fireEvent.click(button("Start Recording"));
    tick(1000);
    expect(display()).toBe("Duration 00:06");
  });
});

describe("saving", () => {
  it("hands up the untouched duration and empty notes", () => {
    const { onSave } = renderModal({ initialDuration: 45 });
    fireEvent.click(primary());
    expect(onSave).toHaveBeenCalledWith({ duration: 45, notes: "" });
  });

  it("hands up what was recorded and typed", () => {
    const { onSave } = renderModal();
    fireEvent.click(button("Start Recording"));
    tick(12000);
    fireEvent.click(button("Stop Recording"));
    fireEvent.change(notes(), { target: { value: "Client stayed on task" } });
    fireEvent.click(primary());
    expect(onSave).toHaveBeenCalledWith({ duration: 12, notes: "Client stayed on task" });
  });

  it("saves a duration that is still running", () => {
    const { onSave } = renderModal();
    fireEvent.click(button("Start Recording"));
    tick(3000);
    fireEvent.click(primary());
    expect(onSave).toHaveBeenCalledWith({ duration: 3, notes: "" });
  });
});
