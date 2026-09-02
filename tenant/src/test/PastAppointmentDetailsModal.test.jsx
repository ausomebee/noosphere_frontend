import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

/**
 * The read-only details card for a completed appointment, opened from a
 * notification: six labelled fields and one button through to the timesheet.
 *
 * It holds no state, so the interest is entirely in the three small formatters
 * it leans on. `renderValue` prints an em dash for anything blank and flattens
 * an object into "date · time", dropping either half if it is missing;
 * `formatDate` catches the range error `date-fns` throws on an unparseable
 * value and echoes the raw string back; and the service-type line prefers a
 * non-empty array, falls through an empty one to the singular field, and lands
 * on the dash when neither is set.
 *
 * ReusableModal portals into the body and this modal passes it no button text,
 * so the only control on screen is the timesheet button the modal renders
 * itself.
 */

import PastAppointmentDetailsModal from "../Components/ReusableModal/SchedulerModal/PastAppointmentDetailsModal";

const appointment = (over = {}) => ({
  clientName: "Ada Obi",
  therapistName: "Dr Bello",
  dateTime: "2024-03-15T09:30:00",
  time: "09:30 AM - 10:30 AM",
  serviceTypes: ["ABA", "Speech"],
  sessionType: "Direct Service",
  ...over,
});

const renderModal = (props = {}) => {
  const onClose = vi.fn();
  const onViewTimesheet = vi.fn();
  const view = render(
    <PastAppointmentDetailsModal
      isOpen
      onClose={onClose}
      onViewTimesheet={onViewTimesheet}
      appointment={appointment()}
      {...props}
    />
  );
  return { ...view, onClose, onViewTimesheet };
};

// Each field is a label paragraph followed by its value paragraph, so the value
// is read off the label's sibling rather than by searching for the text.
const fieldValue = (label) => screen.getByText(label).nextElementSibling.textContent;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("when it is shown at all", () => {
  it("draws nothing while it is shut", () => {
    const { container } = render(
      <PastAppointmentDetailsModal
        isOpen={false}
        onClose={vi.fn()}
        onViewTimesheet={vi.fn()}
        appointment={appointment()}
      />
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Appointment details")).not.toBeInTheDocument();
  });

  it("draws nothing when it is open but has no appointment to show", () => {
    render(
      <PastAppointmentDetailsModal isOpen onClose={vi.fn()} onViewTimesheet={vi.fn()} />
    );
    expect(screen.queryByText("Appointment details")).not.toBeInTheDocument();
  });
});

describe("the six fields", () => {
  it("lays out a complete appointment", () => {
    renderModal();
    expect(screen.getByText("Appointment details")).toBeInTheDocument();
    expect(fieldValue("Client")).toBe("Ada Obi");
    expect(fieldValue("Clinician(s)")).toBe("Dr Bello");
    expect(fieldValue("Date")).toBe("Mar 15, 2024");
    expect(fieldValue("Time")).toBe("09:30 AM - 10:30 AM");
    expect(fieldValue("Service Type(s)")).toBe("ABA, Speech");
    expect(fieldValue("Session Type")).toBe("Direct Service");
  });

  it("dashes out a field that is missing, null or blank", () => {
    renderModal({
      appointment: appointment({ clientName: undefined, therapistName: null, sessionType: "" }),
    });
    expect(fieldValue("Client")).toBe("—");
    expect(fieldValue("Clinician(s)")).toBe("—");
    expect(fieldValue("Session Type")).toBe("—");
  });

  it("flattens a field that arrives as a date and time pair", () => {
    renderModal({
      appointment: appointment({ time: { date: "15 Mar", time: "09:30" } }),
    });
    expect(fieldValue("Time")).toBe("15 Mar · 09:30");
  });

  it("drops the empty half of such a pair", () => {
    renderModal({ appointment: appointment({ time: { date: "15 Mar" } }) });
    expect(fieldValue("Time")).toBe("15 Mar");
  });

  it("dashes out a pair with nothing in either half", () => {
    renderModal({ appointment: appointment({ time: {} }) });
    expect(fieldValue("Time")).toBe("—");
  });
});

describe("the date line", () => {
  it("dashes out an appointment with no timestamp", () => {
    renderModal({ appointment: appointment({ dateTime: null }) });
    expect(fieldValue("Date")).toBe("—");
  });

  it("echoes back a timestamp it cannot parse", () => {
    // date-fns throws a RangeError on an invalid date rather than returning a
    // placeholder, so the raw string is what the field ends up showing.
    renderModal({ appointment: appointment({ dateTime: "sometime last week" }) });
    expect(fieldValue("Date")).toBe("sometime last week");
  });
});

describe("the service type line", () => {
  it("joins several service types with commas", () => {
    renderModal({ appointment: appointment({ serviceTypes: ["ABA", "Speech", "OT"] }) });
    expect(fieldValue("Service Type(s)")).toBe("ABA, Speech, OT");
  });

  it("falls back to the singular field when the list is empty", () => {
    renderModal({ appointment: appointment({ serviceTypes: [], serviceType: "ABA Therapy" }) });
    expect(fieldValue("Service Type(s)")).toBe("ABA Therapy");
  });

  it("falls back to the singular field when there is no list at all", () => {
    renderModal({
      appointment: appointment({ serviceTypes: undefined, serviceType: "ABA Therapy" }),
    });
    expect(fieldValue("Service Type(s)")).toBe("ABA Therapy");
  });

  it("dashes out an appointment with neither list nor singular field", () => {
    renderModal({ appointment: appointment({ serviceTypes: [], serviceType: undefined }) });
    expect(fieldValue("Service Type(s)")).toBe("—");
  });
});

describe("the way out", () => {
  it("leads on to the timesheet", () => {
    const { onViewTimesheet } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: "View Timesheet" }));
    expect(onViewTimesheet).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", () => {
    const { onClose } = renderModal();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
