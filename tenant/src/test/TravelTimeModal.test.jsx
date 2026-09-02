import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";

/**
 * The travel-time modal opened from a session: two time fields, a guard that
 * insists on both, and a save that hands the caller two plain HH:mm strings.
 *
 * The two inputs are `type="time"` and carry no accessible label wiring, so
 * they are read positionally. The guard is the only validation, and it fires on
 * either field being empty, so both halves are exercised. Cancel and Escape
 * both blank the fields on the way out, but a successful save does not -- it
 * closes on the caller's behalf while leaving the typed times in the state.
 */

const toast = vi.hoisted(() => vi.fn());
vi.mock("../Helper/ShowToast", () => ({ showToast: toast, showApiError: vi.fn() }));

import TravelTimeModal from "../Components/ReusableModal/StartAppointmentModal/TravelTimeModal";

const renderModal = (props = {}) => {
  const onClose = vi.fn();
  const onSave = vi.fn();
  const view = render(
    <TravelTimeModal isOpen onClose={onClose} onSave={onSave} {...props} />
  );
  return { ...view, onClose, onSave };
};

const timeInputs = () =>
  Array.from(document.body.querySelectorAll("input[type='time']"));
const startInput = () => timeInputs()[0];
const endInput = () => timeInputs()[1];
const primary = () => document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.body.querySelector(".modal-btn-secondary");

const save = async () => {
  await act(async () => {
    fireEvent.click(primary());
  });
};

const enterTimes = ({ start, end }) => {
  if (start !== undefined) fireEvent.change(startInput(), { target: { value: start } });
  if (end !== undefined) fireEvent.change(endInput(), { target: { value: end } });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the modal", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(document.body.querySelector(".modal-content")).toBeNull();
  });

  it("opens on two empty time fields", () => {
    renderModal();
    expect(document.body.querySelector(".modal-title-text")).toHaveTextContent(
      "Log Travel Time"
    );
    expect(timeInputs()).toHaveLength(2);
    expect(startInput()).toHaveValue("");
    expect(endInput()).toHaveValue("");
    expect(primary()).toHaveTextContent("Save");
    expect(secondary()).toHaveTextContent("Cancel");
  });

  it("locks the Save button while the caller reports a save in flight", () => {
    renderModal({ loading: true });
    expect(primary()).toBeDisabled();
  });
});

describe("the both-times guard", () => {
  it("refuses a save with neither time set", async () => {
    const { onSave, onClose } = renderModal();
    await save();
    expect(toast).toHaveBeenCalledWith("Please select both start and end time", "error");
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("refuses a save with only a start time", async () => {
    const { onSave } = renderModal();
    enterTimes({ start: "09:00" });
    await save();
    expect(toast).toHaveBeenCalledWith("Please select both start and end time", "error");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a save with only an end time", async () => {
    const { onSave } = renderModal();
    enterTimes({ end: "09:45" });
    await save();
    expect(toast).toHaveBeenCalledWith("Please select both start and end time", "error");
    expect(onSave).not.toHaveBeenCalled();
  });

  // Clearing a field that was filled has to re-arm the guard, not leave the
  // last accepted value behind.
  it("refuses again once a filled time is cleared", async () => {
    const { onSave } = renderModal();
    enterTimes({ start: "09:00", end: "09:45" });
    enterTimes({ end: "" });
    await save();
    expect(toast).toHaveBeenCalledWith("Please select both start and end time", "error");
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("saving", () => {
  it("hands the caller both times and closes", async () => {
    const { onSave, onClose } = renderModal();
    enterTimes({ start: "09:00", end: "09:45" });
    await save();
    expect(onSave).toHaveBeenCalledWith({ start: "09:00", end: "09:45" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(toast).not.toHaveBeenCalled();
  });

  // Only the Cancel path blanks the fields, so a saved entry is still on screen
  // when the caller unmounts the modal.
  it("leaves the times in place after a save", async () => {
    renderModal();
    enterTimes({ start: "09:00", end: "09:45" });
    await save();
    expect(startInput()).toHaveValue("09:00");
    expect(endInput()).toHaveValue("09:45");
  });
});

describe("backing out", () => {
  it("blanks both fields and closes from Cancel", () => {
    const { onClose, onSave } = renderModal();
    enterTimes({ start: "09:00", end: "09:45" });
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
    expect(startInput()).toHaveValue("");
    expect(endInput()).toHaveValue("");
  });

  it("blanks both fields and closes from Escape", () => {
    const { onClose } = renderModal();
    enterTimes({ start: "09:00", end: "09:45" });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(startInput()).toHaveValue("");
  });
});
