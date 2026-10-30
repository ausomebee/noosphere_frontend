import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import RescheduleRequestActionModal from "../Components/ReusableModal/SchedulerModal/RescheduleRequestActionModal";

/**
 * The compact reschedule-request viewer opened from a notification: four
 * read-only fields over the three actions the requests table also offers.
 *
 * All the branching lives in `renderValue`, which has to cope with the two
 * shapes the row fields arrive in — a plain string for the names, and a
 * `{ date, time }` pair for the two timestamps — and with any of them being
 * absent, in which case an em dash stands in. The fields carry no accessible
 * name of their own, so they are read positionally out of the detail grid.
 *
 * The three actions sit in `footerContent`, which replaces ReusableModal's own
 * footer entirely: there is no Save or Cancel here, only Reject/Modify/Accept.
 */

const REQUEST = Object.freeze({
  clientName: "Sam Okafor",
  therapistName: "Dr. Adaeze Nwosu",
  prevDateTime: { date: "12 Mar 2026", time: "09:00" },
  newDateTime: { date: "14 Mar 2026", time: "11:30" },
});

const renderModal = ({ request = REQUEST, ...props } = {}) => {
  const onClose = vi.fn();
  const onApprove = vi.fn();
  const onModify = vi.fn();
  const onReject = vi.fn();
  const view = render(
    <RescheduleRequestActionModal
      isOpen
      onClose={onClose}
      request={request}
      onApprove={onApprove}
      onModify={onModify}
      onReject={onReject}
      {...props}
    />
  );
  return { ...view, onClose, onApprove, onModify, onReject };
};

const fields = () => Array.from(document.body.querySelectorAll(".modal-detail-field"));
const fieldLabels = () => fields().map((f) => f.querySelector(".label").textContent);
const valueAt = (index) => fields()[index].querySelector(".value").textContent;
const CLIENT = 0;
const CLINICIAN = 1;
const PREVIOUS = 2;
const REQUESTED = 3;

const action = (name) => screen.getByRole("button", { name });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the guard on opening", () => {
  it("renders nothing while closed", () => {
    const { container } = renderModal({ isOpen: false });
    expect(container).toBeEmptyDOMElement();
    expect(document.body.querySelector(".modal-content")).toBeNull();
  });

  // Notifications can point at a request that has already been resolved and
  // dropped from the page's state, so the request itself is guarded too.
  it("renders nothing when there is no request to show", () => {
    renderModal({ request: null });
    expect(document.body.querySelector(".modal-content")).toBeNull();
  });

  it("renders nothing when closed and requestless at once", () => {
    renderModal({ isOpen: false, request: undefined });
    expect(document.body.querySelector(".modal-content")).toBeNull();
  });
});

describe("the request details", () => {
  it("lays the four fields out in order", () => {
    renderModal();
    expect(document.body.querySelector(".modal-title-text")).toHaveTextContent(
      "Reschedule request"
    );
    expect(fieldLabels()).toEqual([
      "Client",
      "Clinician(s)",
      "Previous date & time",
      "Requested date & time",
    ]);
  });

  it("shows the plain string fields as they are", () => {
    renderModal();
    expect(valueAt(CLIENT)).toBe("Sam Okafor");
    expect(valueAt(CLINICIAN)).toBe("Dr. Adaeze Nwosu");
  });

  it("joins a date and time pair with a separator", () => {
    renderModal();
    expect(valueAt(PREVIOUS)).toBe("12 Mar 2026 · 09:00");
    expect(valueAt(REQUESTED)).toBe("14 Mar 2026 · 11:30");
  });

  it("drops the missing half of a half-filled pair", () => {
    renderModal({
      request: { ...REQUEST, prevDateTime: { date: "12 Mar 2026" }, newDateTime: { time: "11:30" } },
    });
    expect(valueAt(PREVIOUS)).toBe("12 Mar 2026");
    expect(valueAt(REQUESTED)).toBe("11:30");
  });

  // An object with neither half joins to an empty string, which the `||` then
  // turns into the same dash an absent field gets.
  it("falls back to a dash for a pair with nothing in it", () => {
    renderModal({ request: { ...REQUEST, prevDateTime: {} } });
    expect(valueAt(PREVIOUS)).toBe("—");
  });

  it("falls back to a dash for a field left null", () => {
    renderModal({ request: { ...REQUEST, clientName: null } });
    expect(valueAt(CLIENT)).toBe("—");
  });

  it("falls back to a dash for a field never set", () => {
    renderModal({ request: { clientName: "Sam Okafor" } });
    expect(valueAt(CLINICIAN)).toBe("—");
    expect(valueAt(PREVIOUS)).toBe("—");
    expect(valueAt(REQUESTED)).toBe("—");
  });

  it("falls back to a dash for a field that is an empty string", () => {
    renderModal({ request: { ...REQUEST, therapistName: "" } });
    expect(valueAt(CLINICIAN)).toBe("—");
  });
});

describe("the three actions", () => {
  it("offers reject, modify and accept in place of the usual footer", () => {
    renderModal();
    expect(action("Reject")).toBeInTheDocument();
    expect(action("Modify")).toBeInTheDocument();
    expect(action("Accept")).toBeInTheDocument();
    expect(document.body.querySelector(".modal-btn")).toBeNull();
  });

  it("delegates an accept to the page's handler", () => {
    const { onApprove, onModify, onReject, onClose } = renderModal();
    fireEvent.click(action("Accept"));
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onModify).not.toHaveBeenCalled();
    expect(onReject).not.toHaveBeenCalled();
    // Dismissing is the page's job once its handler has run.
    expect(onClose).not.toHaveBeenCalled();
  });

  it("delegates a modify to the page's handler", () => {
    const { onModify, onApprove } = renderModal();
    fireEvent.click(action("Modify"));
    expect(onModify).toHaveBeenCalledTimes(1);
    expect(onApprove).not.toHaveBeenCalled();
  });

  it("delegates a reject to the page's handler", () => {
    const { onReject, onApprove } = renderModal();
    fireEvent.click(action("Reject"));
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onApprove).not.toHaveBeenCalled();
  });
});

describe("dismissing", () => {
  it("closes from the header cross", () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes from Escape", () => {
    const { onClose } = renderModal();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // This one opts into `closeOnOverlayClick`, unlike most modals in the app.
  it("closes from a click on the backdrop", () => {
    const { onClose } = renderModal();
    const overlay = document.body.querySelector(".modal-overlay");
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stays open when the click lands inside the modal", () => {
    const { onClose } = renderModal();
    fireEvent.click(document.body.querySelector(".modal-detail-card"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
