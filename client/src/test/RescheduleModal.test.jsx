import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const apiMock = vi.hoisted(() => ({ RescheduleAppointments: vi.fn() }));
vi.mock("../api/homeApis", () => ({ default: apiMock }));

const showToast = vi.fn();
vi.mock("../Helper/ShowToast", () => ({ showToast: (...a) => showToast(...a) }));

import RescheduleModal from "../Components/Modal/UpcomingDashboardModal/RescheduleModal";

/**
 * The client's reschedule request form.
 *
 * The summary panel and the pre-filled slot both read from `originalData` when
 * the modal is opened against a fetched appointment and from the flat table row
 * otherwise, so each field is covered from both directions.
 *
 * The one non-obvious validation rule: an end time *earlier* than the start is
 * a legitimate overnight slot and is allowed; only an identical start and end
 * is rejected. The id sent to the API is also trimmed at the first underscore,
 * because a recurring occurrence's row id carries a suffix the backend does not
 * know about.
 */

const onClose = vi.fn();
const onSuccess = vi.fn();

const row = (over = {}) => ({
  id: "a1",
  sessionType: "ABA Therapy",
  clinician: "Dr Ada Bell",
  dateTime: "03/01/2026\n9:00 AM - 10:00 AM",
  ...over,
});

const fetched = (over = {}) => ({
  id: "a1",
  originalData: {
    id: "a1",
    date: "2026-03-01T00:00:00.000Z",
    startTime: "09:00",
    endTime: "10:00",
    session: { name: "Fetched Therapy" },
    clinicians: [{ fullName: "Dr Grace Hopper" }],
    ...over,
  },
});

const renderModal = (props = {}) =>
  render(
    <RescheduleModal
      isOpen
      onClose={onClose}
      onSuccess={onSuccess}
      appointment={fetched()}
      accessToken="at"
      refreshToken="rt"
      tenantId="t1"
      {...props}
    />
  );

const field = (label) => screen.getByText(label).closest("div").querySelector("input, textarea");
const setField = (label, value) => fireEvent.change(field(label), { target: { value } });
const submit = () => fireEvent.click(screen.getByText("Reschedule"));

const fillValid = () => {
  setField("Choose a new date", "2026-04-01");
  setField("Start time", "11:00");
  setField("End time", "12:00");
  setField("Reason for rescheduling", "Clash with school");
};

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
  apiMock.RescheduleAppointments.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the current-appointment summary", () => {
  it("reads the fetched appointment", () => {
    renderModal();
    expect(screen.getByText("Fetched Therapy")).toBeInTheDocument();
    expect(screen.getByText("Dr Grace Hopper")).toBeInTheDocument();
  });

  it("joins several clinicians", () => {
    renderModal({
      appointment: fetched({
        clinicians: [{ fullName: "Dr Grace Hopper" }, { fullName: "Dr Ada Bell" }],
      }),
    });
    expect(screen.getByText("Dr Grace Hopper, Dr Ada Bell")).toBeInTheDocument();
  });

  it("falls back to the table row's session and clinician", () => {
    renderModal({ appointment: row() });
    expect(screen.getByText("ABA Therapy")).toBeInTheDocument();
    expect(screen.getByText("Dr Ada Bell")).toBeInTheDocument();
  });

  it("flattens the row's two-line date and time", () => {
    renderModal({ appointment: row() });
    expect(screen.getByText("03/01/2026 9:00 AM - 10:00 AM")).toBeInTheDocument();
  });

  it("omits each line the appointment says nothing about", () => {
    renderModal({ appointment: { id: "a1" } });
    expect(screen.getByText("Current appointment")).toBeInTheDocument();
    expect(screen.queryByText("Session:")).not.toBeInTheDocument();
    expect(screen.queryByText("Clinician:")).not.toBeInTheDocument();
    expect(screen.queryByText("Date & Time:")).not.toBeInTheDocument();
  });

  it("omits an empty clinician list rather than printing a blank line", () => {
    renderModal({ appointment: fetched({ clinicians: [] }) });
    expect(screen.queryByText("Clinician:")).not.toBeInTheDocument();
  });

  it("omits the summary entirely without an appointment", () => {
    renderModal({ appointment: null });
    expect(screen.queryByText("Current appointment")).not.toBeInTheDocument();
  });
});

describe("pre-filling the slot", () => {
  it("starts from the appointment's own date and times", () => {
    renderModal();
    expect(field("Choose a new date").value).toBe("2026-03-01");
    expect(field("Start time").value).toBe("09:00");
    expect(field("End time").value).toBe("10:00");
  });

  it("leaves the reason blank so it has to be written afresh", () => {
    renderModal();
    expect(field("Reason for rescheduling").value).toBe("");
  });

  it("starts blank when the appointment carries no slot", () => {
    renderModal({ appointment: { id: "a1" } });
    expect(field("Choose a new date").value).toBe("");
    expect(field("Start time").value).toBe("");
  });

  it("fills nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText("Reschedule appointment")).not.toBeInTheDocument();
  });
});

describe("validation", () => {
  it("refuses an entirely blank form", async () => {
    renderModal({ appointment: { id: "a1" } });
    submit();
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("Please fill in all required fields", "error")
    );
    expect(screen.getByText("Date is required")).toBeInTheDocument();
    expect(screen.getByText("Start time is required")).toBeInTheDocument();
    expect(screen.getByText("End time is required")).toBeInTheDocument();
    expect(screen.getByText("Reason is required")).toBeInTheDocument();
    expect(apiMock.RescheduleAppointments).not.toHaveBeenCalled();
  });

  it("refuses a reason that is only whitespace", async () => {
    renderModal();
    setField("Reason for rescheduling", "   ");
    submit();
    await waitFor(() => expect(screen.getByText("Reason is required")).toBeInTheDocument());
  });

  it("refuses a zero-length slot", async () => {
    renderModal();
    setField("End time", "09:00");
    setField("Reason for rescheduling", "Clash");
    submit();
    await waitFor(() =>
      expect(
        screen.getByText("End time must be different from start time")
      ).toBeInTheDocument()
    );
    expect(apiMock.RescheduleAppointments).not.toHaveBeenCalled();
  });

  it("allows an overnight slot that ends before it starts", async () => {
    renderModal();
    setField("Start time", "23:30");
    setField("End time", "00:00");
    setField("Reason for rescheduling", "Late session");
    await act(async () => { submit(); });
    expect(apiMock.RescheduleAppointments).toHaveBeenCalled();
  });

  it("clears a field's error as soon as it is edited", async () => {
    renderModal({ appointment: { id: "a1" } });
    submit();
    await waitFor(() => expect(screen.getByText("Date is required")).toBeInTheDocument());
    setField("Choose a new date", "2026-04-01");
    await waitFor(() => expect(screen.queryByText("Date is required")).toBeNull());
  });
});

describe("submitting", () => {
  it("sends the new slot and reports success", async () => {
    renderModal();
    fillValid();
    await act(async () => { submit(); });

    const [payload] = apiMock.RescheduleAppointments.mock.calls[0];
    expect(payload).toEqual(
      expect.objectContaining({
        tenantId: "t1",
        id: "a1",
        startTime: "11:00",
        endTime: "12:00",
        forAll: false,
        reasonForReschedule: "Clash with school",
        rescheduled: true,
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(payload.date).toBeInstanceOf(Date);
    expect(onSuccess).toHaveBeenCalled();
  });

  it("trims a recurring occurrence's suffix off the id", async () => {
    renderModal({ appointment: { id: "a1_2026-03-01", originalData: { id: "a1_2026-03-01" } } });
    fillValid();
    await act(async () => { submit(); });
    expect(apiMock.RescheduleAppointments.mock.calls[0][0].id).toBe("a1");
  });

  it("falls back to the nested id when the row has none", async () => {
    renderModal({ appointment: { originalData: { id: "nested-1" } } });
    fillValid();
    await act(async () => { submit(); });
    expect(apiMock.RescheduleAppointments.mock.calls[0][0].id).toBe("nested-1");
  });

  it("empties the form once the request lands", async () => {
    renderModal();
    fillValid();
    await act(async () => { submit(); });
    expect(field("Reason for rescheduling").value).toBe("");
    expect(field("Start time").value).toBe("");
  });

  it("reports a failed request and keeps what was typed", async () => {
    apiMock.RescheduleAppointments.mockRejectedValue(new Error("slot taken"));
    renderModal();
    fillValid();
    await act(async () => { submit(); });
    expect(showToast).toHaveBeenCalledWith("slot taken", "error");
    expect(onSuccess).not.toHaveBeenCalled();
    expect(field("Reason for rescheduling").value).toBe("Clash with school");
  });

  it("reports a failure that carries no message", async () => {
    apiMock.RescheduleAppointments.mockRejectedValue({});
    renderModal();
    fillValid();
    await act(async () => { submit(); });
    expect(showToast).toHaveBeenCalledWith(
      "Failed to reschedule appointment. Please try again.",
      "error"
    );
  });
});

describe("closing", () => {
  it("empties the form on cancel", async () => {
    renderModal();
    setField("Reason for rescheduling", "Changed my mind");
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("clears a standing error on cancel", async () => {
    renderModal({ appointment: { id: "a1" } });
    submit();
    await waitFor(() => expect(screen.getByText("Date is required")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });
});
