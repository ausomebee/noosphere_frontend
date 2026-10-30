import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/**
 * The scheduler's "Set your availability" modal: seven day rows, each a switch
 * that swaps a disabled "Not Available" box for a pair of time inputs, all held
 * in a single react-hook-form field named `availability`.
 *
 * Two things drive most of the branches. The first is `enforceTimeRange`, which
 * clamps a start time into the morning and an end time into the afternoon, so
 * every time change has a passed-through arm and a rewritten arm. The second is
 * the merge of `initialValues` over the all-off defaults: a day whose entry is
 * missing entirely falls back to the default row, which is why one fixture sets
 * a day to `undefined` rather than omitting it.
 *
 * `initialValues` is memoised on identity and sits in the open effect's
 * dependency list, so every render below passes one stable object from a
 * module-level constant rather than a fresh literal.
 *
 * ReusableModal portals into the body and renders its primary button as the
 * form's submit, so the save tests click that button and read `onSave`; the
 * modal owns no validation, so the submit always reaches the handler.
 */

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

import AvailabilityModal from "../Components/ReusableModal/SchedulerModal/AvailabilityModal";

// A fresh `{}` here would be a new dependency of the reset effect on every
// render, so the whole file shares one frozen empty object instead.
const NOTHING_STORED = {};

const renderModal = ({ initialValues = NOTHING_STORED, ...props } = {}) => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const view = render(
    <AvailabilityModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      initialValues={initialValues}
      {...props}
    />
  );
  return { ...view, onSave, onClose };
};

const switches = () => [...document.querySelectorAll('input[type="checkbox"]')];
const timeInputs = () => [...document.querySelectorAll('input[type="time"]')];
// While a save is in flight the label is replaced by a spinner, so the button
// is addressed by its type rather than its accessible name.
const saveButton = () => document.querySelector('button[type="submit"]');

// The rows render Monday first, so a day's switch is at its index in this list.
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const switchFor = (day) => switches()[DAYS.indexOf(day)];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the day rows", () => {
  it("renders a switch for every day of the week", () => {
    renderModal();
    expect(switches()).toHaveLength(7);
    expect(screen.getByText("monday")).toBeInTheDocument();
    expect(screen.getByText("sunday")).toBeInTheDocument();
  });

  it("shows a disabled placeholder instead of times on a day that is off", () => {
    renderModal();
    expect(timeInputs()).toHaveLength(0);
    expect(screen.getAllByPlaceholderText("Not Available")).toHaveLength(7);
    expect(screen.getAllByPlaceholderText("Not Available")[0]).toBeDisabled();
  });

  it("swaps in a start and end time once a day is switched on", () => {
    renderModal();
    fireEvent.click(switchFor("monday"));
    expect(timeInputs().map((i) => i.value)).toEqual(["09:00", "17:00"]);
    expect(screen.getAllByPlaceholderText("Not Available")).toHaveLength(6);
  });

  it("opens the days named in the initial values already on", () => {
    renderModal({
      initialValues: {
        tuesday: { available: true, startTime: "08:30", endTime: "16:45" },
      },
    });
    expect(switchFor("tuesday")).toBeChecked();
    expect(switchFor("monday")).not.toBeChecked();
    expect(timeInputs().map((i) => i.value)).toEqual(["08:30", "16:45"]);
  });

  it("switches an open day back off", () => {
    renderModal({ initialValues: { friday: { available: true, startTime: "09:00", endTime: "17:00" } } });
    fireEvent.click(switchFor("friday"));
    expect(switchFor("friday")).not.toBeChecked();
    expect(timeInputs()).toHaveLength(0);
  });

  it("falls back to the default row for a day the initial values blank out", () => {
    // A day present but undefined survives the spread, so the row has to reach
    // for the default entry rather than read `available` off nothing.
    renderModal({ initialValues: { wednesday: undefined } });
    expect(switchFor("wednesday")).not.toBeChecked();
    fireEvent.click(switchFor("wednesday"));
    expect(switchFor("wednesday")).toBeChecked();
    // Switching it on writes only `available`, so the row is rebuilt without
    // the default 09:00-17:00 pair and the inputs show their own fallbacks.
    expect(timeInputs().map((i) => i.value)).toEqual(["00:00", "12:00"]);
  });

  it("falls back to midnight and midday when an open day carries no times", () => {
    renderModal({ initialValues: { monday: { available: true } } });
    expect(timeInputs().map((i) => i.value)).toEqual(["00:00", "12:00"]);
  });
});

describe("the enforced morning and afternoon range", () => {
  const openMonday = () => {
    const view = renderModal({
      initialValues: { monday: { available: true, startTime: "09:00", endTime: "17:00" } },
    });
    const [start, end] = timeInputs();
    return { ...view, start, end };
  };

  it("keeps a start time that is already before noon", () => {
    const { start } = openMonday();
    fireEvent.change(start, { target: { value: "07:00" } });
    expect(start.value).toBe("07:00");
  });

  it("pulls an afternoon start back to the last minute of the morning", () => {
    const { start } = openMonday();
    fireEvent.change(start, { target: { value: "13:00" } });
    expect(start.value).toBe("11:59");
  });

  it("treats noon itself as too late for a start", () => {
    const { start } = openMonday();
    fireEvent.change(start, { target: { value: "12:00" } });
    expect(start.value).toBe("11:59");
  });

  it("keeps an end time that is already past noon", () => {
    const { end } = openMonday();
    fireEvent.change(end, { target: { value: "19:00" } });
    expect(end.value).toBe("19:00");
  });

  it("pushes a morning end forward to noon", () => {
    const { end } = openMonday();
    fireEvent.change(end, { target: { value: "08:00" } });
    expect(end.value).toBe("12:00");
  });
});

describe("saving", () => {
  it("hands the whole week to the caller", async () => {
    const { onSave } = renderModal();
    fireEvent.click(switchFor("monday"));
    fireEvent.click(saveButton());
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const saved = onSave.mock.calls[0][0];
    expect(Object.keys(saved)).toEqual(DAYS);
    expect(saved.monday).toEqual({ available: true, startTime: "09:00", endTime: "17:00" });
    expect(saved.tuesday.available).toBe(false);
  });

  it("saves the clamped times rather than the ones that were typed", async () => {
    const { onSave } = renderModal({
      initialValues: { monday: { available: true, startTime: "09:00", endTime: "17:00" } },
    });
    const [start, end] = timeInputs();
    fireEvent.change(start, { target: { value: "15:00" } });
    fireEvent.change(end, { target: { value: "10:00" } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].monday).toEqual({
      available: true,
      startTime: "11:59",
      endTime: "12:00",
    });
  });

  it("toasts rather than throwing when the save is rejected", async () => {
    const { onSave } = renderModal();
    onSave.mockRejectedValue(new Error("network"));
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to save availability", "error")
    );
  });

  it("says nothing when the save goes through", async () => {
    const { onSave } = renderModal();
    fireEvent.click(saveButton());
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(toast.showToast).not.toHaveBeenCalled();
  });

  it("shows a spinner and refuses a second click while a save is in flight", () => {
    renderModal({ isLoading: true });
    expect(saveButton()).toBeDisabled();
    expect(saveButton()).toHaveTextContent("");
  });
});

describe("closing", () => {
  it("discards the day switches that were flipped and tells the caller", () => {
    const { onClose } = renderModal();
    fireEvent.click(switchFor("monday"));
    expect(switchFor("monday")).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(switchFor("monday")).not.toBeChecked();
  });

  it("closes on Escape as well", () => {
    const { onClose } = renderModal();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing at all while it is shut", () => {
    render(
      <AvailabilityModal
        isOpen={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialValues={NOTHING_STORED}
      />
    );
    expect(screen.queryByText("Set your availability")).not.toBeInTheDocument();
  });

  it("reloads the saved week when it is reopened after a shut", () => {
    // The reset only fires on the closed-to-open edge, so the toggled day has
    // to survive a re-render while open and be dropped by the reopen.
    const stored = { thursday: { available: true, startTime: "10:00", endTime: "14:00" } };
    const { rerender } = render(
      <AvailabilityModal isOpen={false} onClose={vi.fn()} onSave={vi.fn()} initialValues={stored} />
    );
    rerender(
      <AvailabilityModal isOpen onClose={vi.fn()} onSave={vi.fn()} initialValues={stored} />
    );
    expect(switchFor("thursday")).toBeChecked();
    fireEvent.click(switchFor("thursday"));
    expect(switchFor("thursday")).not.toBeChecked();
    rerender(
      <AvailabilityModal
        isOpen={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialValues={stored}
      />
    );
    rerender(
      <AvailabilityModal isOpen onClose={vi.fn()} onSave={vi.fn()} initialValues={stored} />
    );
    expect(switchFor("thursday")).toBeChecked();
  });
});
