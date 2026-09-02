import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import RescheduleModal from "../Components/ReusableModal/SchedulerModal/RescheduleModal";

/**
 * The scheduler's reschedule modal: a date and a start/end pair, followed by a
 * question about whether the change applies to one occurrence or the whole
 * series.
 *
 * Most of the branching is in the time normaliser that prefills the form. An
 * appointment's times reach it in whatever shape the API happened to store --
 * 24-hour with or without seconds, 12-hour with or without a space, with or
 * without dots in the meridiem -- and every one has to come out as the "HH:MM"
 * an <input type="time"> will accept, or the field silently renders empty. Each
 * shape is therefore prefilled and read straight back off the input.
 *
 * The confirmation buttons replace the modal's own footer, so the save path is
 * driven from "This Event Only" / "All Events in This Series" rather than from
 * Save.
 */

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));

vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

const today = new Date().toISOString().split("T")[0];

const renderModal = (props = {}) => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const view = render(
    <RescheduleModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      appointment={null}
      {...props}
    />
  );
  return { ...view, onSave, onClose };
};

// The labels carry a "*" span and no htmlFor, so walk up from the label text.
const inputFor = (labelText) => {
  const label = Array.from(
    document.body.querySelectorAll("label.input-group-label")
  ).find((l) => l.textContent.replace("*", "").trim() === labelText);
  if (!label) throw new Error(`no field labelled "${labelText}"`);
  return label.closest(".input-group").querySelector("input");
};

const setField = (labelText, value) =>
  fireEvent.change(inputFor(labelText), { target: { value } });

const times = () => [inputFor("Start Time").value, inputFor("End Time").value];

const save = () => fireEvent.click(screen.getByText("Save"));

const slot = (over = {}) => ({
  id: "a1",
  date: "2030-04-15",
  startTime: "09:00",
  endTime: "10:00",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("prefilling the slot", () => {
  it("takes the date and both times off the appointment", () => {
    renderModal({ appointment: slot() });
    expect(inputFor("Date").value).toBe("2030-04-15");
    expect(times()).toEqual(["09:00", "10:00"]);
  });

  it("strips the time part off an ISO date", () => {
    renderModal({ appointment: slot({ date: "2030-04-15T13:45:00.000Z" }) });
    expect(inputFor("Date").value).toBe("2030-04-15");
  });

  it("drops the seconds off a 24-hour time and pads a single-digit hour", () => {
    renderModal({
      appointment: slot({ startTime: "09:00:00", endTime: "9:05" }),
    });
    expect(times()).toEqual(["09:00", "09:05"]);
  });

  it("converts an afternoon 12-hour time, spaced or not", () => {
    renderModal({
      appointment: slot({ startTime: "1:30 PM", endTime: "3:45pm" }),
    });
    expect(times()).toEqual(["13:30", "15:45"]);
  });

  it("keeps noon at noon and moves midnight to the top of the clock", () => {
    renderModal({
      appointment: slot({ startTime: "12:30 AM", endTime: "12:15 PM" }),
    });
    expect(times()).toEqual(["00:30", "12:15"]);
  });

  it("tolerates a dotted meridiem", () => {
    renderModal({
      appointment: slot({ startTime: "2:15 p.m.", endTime: "4:00 a.m." }),
    });
    expect(times()).toEqual(["14:15", "04:00"]);
  });

  it("leaves a time it cannot read blank", () => {
    renderModal({
      appointment: slot({ startTime: "sometime soon", endTime: null }),
    });
    expect(times()).toEqual(["", ""]);
  });

  it("falls back to today when the appointment names no date", () => {
    renderModal({ appointment: slot({ date: null }) });
    expect(inputFor("Date").value).toBe(today);
  });

  it("stays on its defaults when there is no appointment to read", () => {
    renderModal();
    expect(inputFor("Date").value).toBe(today);
    expect(times()).toEqual(["", ""]);
  });

  it("renders nothing at all while it is shut", () => {
    renderModal({ isOpen: false, appointment: slot() });
    expect(screen.queryByText("Reschedule Appointment")).not.toBeInTheDocument();
  });
});

describe("validating the new slot", () => {
  it("refuses a form with no times and says why", async () => {
    const { onSave } = renderModal();
    save();

    await waitFor(() =>
      expect(screen.getByText("Start time is required")).toBeInTheDocument()
    );
    expect(screen.getByText("End time is required")).toBeInTheDocument();
    expect(toast.showToast).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses an end time with no start time to measure it against", async () => {
    const { onSave } = renderModal({
      appointment: slot({ startTime: null }),
    });
    save();

    await waitFor(() =>
      expect(
        screen.getByText("End time must be after start time")
      ).toBeInTheDocument()
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("accepts a window that runs past midnight", async () => {
    renderModal({
      appointment: slot({ startTime: "23:00", endTime: "01:00" }),
    });
    save();

    await waitFor(() =>
      expect(screen.getByText("This Event Only")).toBeInTheDocument()
    );
  });
});

describe("choosing what the change applies to", () => {
  const openConfirmation = async (props = {}) => {
    const view = renderModal({ appointment: slot(), ...props });
    save();
    await waitFor(() =>
      expect(screen.getByText("This Event Only")).toBeInTheDocument()
    );
    return view;
  };

  it("asks the question instead of saving straight away", async () => {
    const { onSave } = await openConfirmation();
    expect(onSave).not.toHaveBeenCalled();
    // The modal's own footer is replaced by the three choices.
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
  });

  it("saves the new slot for this occurrence and closes", async () => {
    const { onSave, onClose } = await openConfirmation();
    fireEvent.click(screen.getByText("This Event Only"));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    // yup casts `date` on the way through, so the payload carries a Date object
    // rather than the yyyy-MM-dd string the field holds.
    expect(onSave.mock.calls[0][0].date).toBeInstanceOf(Date);
    expect(onSave.mock.calls[0][0]).toMatchObject({
      startTime: "09:00",
      endTime: "10:00",
      scope: "this",
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("This Event Only")).not.toBeInTheDocument();
  });

  it("saves the whole series when asked", async () => {
    const { onSave } = await openConfirmation();
    fireEvent.click(screen.getByText("All Events in This Series"));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].scope).toBe("all");
  });

  it("carries an edited slot into the payload", async () => {
    const view = renderModal({ appointment: slot() });
    setField("Date", "2030-05-01");
    setField("Start Time", "14:00");
    setField("End Time", "15:30");
    save();
    await waitFor(() =>
      expect(screen.getByText("This Event Only")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText("This Event Only"));

    await waitFor(() => expect(view.onSave).toHaveBeenCalledTimes(1));
    expect(view.onSave.mock.calls[0][0]).toMatchObject({
      startTime: "14:00",
      endTime: "15:30",
    });
  });

  it("goes back to the form without saving", async () => {
    const { onSave } = await openConfirmation();
    fireEvent.click(screen.getByText("Go Back"));

    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("reports a failed save and leaves the question on screen", async () => {
    const view = await openConfirmation();
    view.onSave.mockRejectedValue(new Error("slot taken"));
    fireEvent.click(screen.getByText("This Event Only"));

    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        "Failed to reschedule appointment",
        "error"
      )
    );
    expect(screen.getByText("This Event Only")).toBeInTheDocument();
    expect(view.onClose).not.toHaveBeenCalled();
  });
});

describe("leaving without rescheduling", () => {
  it("closes from the footer's Cancel button", () => {
    const { onClose, onSave } = renderModal({ appointment: slot() });
    fireEvent.click(screen.getByText("Cancel"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
