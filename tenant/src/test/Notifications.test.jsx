import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

/**
 * The notifications page.
 *
 * Two things make this page more than a list. First, every notification is
 * classified twice: `resolveType` picks an icon from substrings of the type
 * string, and `getNotificationAction` (kept real here) picks a destination.
 * Second, clicking a notification does not always navigate -- an appointment or
 * a reschedule request is fetched and shown in a modal on this page, and only a
 * miss, a null payload or a thrown request falls back to routing.
 *
 * The four scheduler modals are replaced with probes that render their open
 * state and expose one button per callback, so the approve / modify / reject
 * handlers can be driven without dragging real modals into jsdom. The socket
 * subscription is captured so a test can push a live notification.
 */

const h = vi.hoisted(() => ({
  auth: {},
  navigate: vi.fn(),
  getNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  emitNotificationRead: vi.fn(),
  showToast: vi.fn(),
  showApiError: vi.fn(),
  appt: {
    GetAppointmentById: vi.fn(),
    GetRescheduleAppointmentReqByTenantId: vi.fn(),
    GetRescheduleAppointmentReqByStaffId: vi.fn(),
    ApproveRescheduledReq: vi.fn(),
    RejectRescheduledReq: vi.fn(),
    RescheduleAppointments: vi.fn(),
  },
  onNotificationCb: null,
  unsub: vi.fn(),
}));

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => h.navigate,
}));

vi.mock("../hooks/useAuth", () => ({ default: () => h.auth }));
vi.mock("../hooks/useFormatSettings", () => ({
  default: () => ({ timeFormat: "12-hour", dateFormat: "MM/DD/YYYY", currency: "USD" }),
}));

vi.mock("../api/notificationApi", () => ({
  default: {
    getNotifications: (...a) => h.getNotifications(...a),
    markNotificationRead: (...a) => h.markNotificationRead(...a),
  },
}));

vi.mock("../api/socketService", () => ({
  emitNotificationRead: (...a) => h.emitNotificationRead(...a),
  onNotification: (fn) => {
    h.onNotificationCb = fn;
    return h.unsub;
  },
}));

vi.mock("../api/AppointmentApi", () => ({
  default: {
    GetAppointmentById: (...a) => h.appt.GetAppointmentById(...a),
    GetRescheduleAppointmentReqByTenantId: (...a) =>
      h.appt.GetRescheduleAppointmentReqByTenantId(...a),
    GetRescheduleAppointmentReqByStaffId: (...a) =>
      h.appt.GetRescheduleAppointmentReqByStaffId(...a),
    ApproveRescheduledReq: (...a) => h.appt.ApproveRescheduledReq(...a),
    RejectRescheduledReq: (...a) => h.appt.RejectRescheduledReq(...a),
    RescheduleAppointments: (...a) => h.appt.RescheduleAppointments(...a),
  },
}));

vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => h.showToast(...a),
  showApiError: (...a) => h.showApiError(...a),
}));

// Probes: each renders only when open, prints the field the page passed in, and
// offers one button per callback the page wired up.
vi.mock("../Components/ReusableModal/SchedulerModal/AppointmentViewModal", () => ({
  default: ({ isOpen, appointment, onClose }) =>
    isOpen ? (
      <div data-testid="view-appt">
        <span data-testid="view-appt-json">{JSON.stringify(appointment)}</span>
        <button onClick={onClose}>close-view</button>
      </div>
    ) : null,
}));

vi.mock("../Components/ReusableModal/SchedulerModal/RescheduleRequestActionModal", () => ({
  default: ({ isOpen, request, onClose, onApprove, onModify, onReject }) =>
    isOpen ? (
      <div data-testid="request-action">
        <span data-testid="request-json">{JSON.stringify(request)}</span>
        <button onClick={onApprove}>approve-request</button>
        <button onClick={onModify}>modify-request</button>
        <button onClick={onReject}>reject-request</button>
        <button onClick={onClose}>close-request</button>
      </div>
    ) : null,
}));

vi.mock("../Components/ReusableModal/SchedulerModal/RescheduleModal", () => ({
  default: ({ isOpen, onClose, onSave }) =>
    isOpen ? (
      <div data-testid="reschedule">
        <button
          onClick={() =>
            onSave({ date: "2026-04-01", startTime: "08:00", endTime: "09:00", scope: "all" })
          }
        >
          save-all
        </button>
        <button
          onClick={() =>
            onSave({ date: "2026-04-02", startTime: "08:00", endTime: "09:00", scope: "one" })
          }
        >
          save-one
        </button>
        <button onClick={onClose}>close-reschedule</button>
      </div>
    ) : null,
}));

vi.mock("../Components/ReusableModal/SchedulerModal/RejectConfirmationModal", () => ({
  default: ({ isOpen, onClose, onConfirm, appointments }) =>
    isOpen ? (
      <div data-testid="reject">
        <span data-testid="reject-count">{appointments.length}</span>
        <button onClick={() => onConfirm({ appointments })}>confirm-many</button>
        <button onClick={() => onConfirm({ appointments: appointments[0] })}>confirm-one</button>
        <button onClick={onClose}>close-reject</button>
      </div>
    ) : null,
}));

import Notifications from "../Pages/Notifications/Notifications";

const notif = (over = {}) => ({
  id: "n1",
  type: "UPCOMING_APPOINTMENT",
  title: "Upcoming session",
  content: "Tomorrow at nine",
  createdAt: "2026-01-05T10:00:00.000Z",
  isRead: false,
  ...over,
});

const withList = (list) => h.getNotifications.mockResolvedValue({ data: { data: list } });

const renderPage = () => render(<Notifications />);

// The page starts in its loading state, so wait for the loader to clear before
// asserting on anything the fetch produced.
const settled = () => waitFor(() => expect(screen.queryByRole("status")).toBeNull());

const cards = () => document.body.querySelectorAll(".notification-card");
const actionButtons = () =>
  Array.from(document.body.querySelectorAll(".notification-card-link"));

beforeEach(() => {
  vi.clearAllMocks();
  h.auth = {
    userId: "staff-1",
    tenantId: "t1",
    accessToken: "at",
    refreshToken: "rt",
    role: { name: "Admin" },
  };
  h.onNotificationCb = null;
  withList([]);
  h.markNotificationRead.mockResolvedValue({});
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the list", () => {
  it("fetches nothing without a signed-in user", async () => {
    h.auth = { userId: undefined, accessToken: "at" };
    renderPage();
    expect(h.getNotifications).not.toHaveBeenCalled();
    // The guard returns before setLoading(false), so the loader is what stays.
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("fetches nothing without an access token", async () => {
    h.auth = { userId: "staff-1", accessToken: undefined };
    renderPage();
    expect(h.getNotifications).not.toHaveBeenCalled();
  });

  it.each([
    ["nested under data.data", (l) => ({ data: { data: l } })],
    ["directly under data", (l) => ({ data: l })],
    ["as the bare response", (l) => l],
  ])("reads a list held %s", async (_shape, wrap) => {
    h.getNotifications.mockResolvedValue(wrap([notif()]));
    renderPage();
    await settled();
    expect(cards()).toHaveLength(1);
  });

  it("unwraps items the server sent as { notification: ... }", async () => {
    withList([{ notification: notif({ title: "Wrapped up" }) }]);
    renderPage();
    await settled();
    expect(screen.getByText("Wrapped up")).toBeInTheDocument();
  });

  it("treats a non-array payload as an empty list", async () => {
    h.getNotifications.mockResolvedValue({ data: { data: { oops: true } } });
    renderPage();
    await settled();
    expect(screen.getByText("No notifications")).toBeInTheDocument();
  });

  it("shows the empty state when the fetch rejects", async () => {
    h.getNotifications.mockRejectedValue(new Error("down"));
    renderPage();
    await settled();
    expect(screen.getByText("No notifications")).toBeInTheDocument();
  });
});

describe("rendering a notification", () => {
  it.each([
    ["appointment", "UPCOMING_APPOINTMENT"],
    ["appointment", "NEW_RESCHEDULE_REQUEST"],
    ["document", "DOCUMENT_REQUEST_CREATED"],
    ["document", "FORM_FILLED"],
    ["document", "TIMESHEET_CREATED"],
    ["client", "CLIENT_PROFILE_CREATION"],
    ["success", "LICENSE_APPROVED"],
    ["alert", "ORGANIZATION_LICENSE_EXPIRED"],
    ["system", "SOMETHING_ENTIRELY_NEW"],
  ])("gives a %s icon to %s", async (icon, type) => {
    withList([notif({ type })]);
    renderPage();
    await settled();
    expect(document.body.querySelector(`.notification-icon-${icon}`)).toBeInTheDocument();
  });

  it("classifies from the category when there is no type", async () => {
    withList([notif({ type: undefined, category: "CLIENT" })]);
    renderPage();
    await settled();
    expect(document.body.querySelector(".notification-icon-client")).toBeInTheDocument();
  });

  it("falls back to the system icon when neither type nor category is set", async () => {
    withList([notif({ type: undefined, category: undefined })]);
    renderPage();
    await settled();
    expect(document.body.querySelector(".notification-icon-system")).toBeInTheDocument();
  });

  it.each([
    ["its title", { title: "A title", message: "A message" }, "A title"],
    ["its message when untitled", { title: undefined, message: "A message" }, "A message"],
    ["a generic label when it has neither", { title: undefined, message: undefined }, "Notification"],
  ])("heads the card with %s", async (_which, over, expected) => {
    withList([notif(over)]);
    renderPage();
    await settled();
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it.each([
    ["content", { content: "from content" }, "from content"],
    ["description", { content: undefined, description: "from description" }, "from description"],
    ["body", { content: undefined, description: undefined, body: "from body" }, "from body"],
  ])("takes the body text from %s", async (_which, over, expected) => {
    withList([notif(over)]);
    renderPage();
    await settled();
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("leaves the body blank when no field carries one", async () => {
    withList([notif({ content: undefined, description: undefined, body: undefined })]);
    renderPage();
    await settled();
    expect(document.body.querySelector(".notification-card-desc").textContent).toBe("");
  });

  it("files an undated notification under Other with no timestamp", async () => {
    withList([notif({ createdAt: undefined })]);
    renderPage();
    await settled();
    expect(screen.getByText("Other")).toBeInTheDocument();
    expect(document.body.querySelector(".notification-card-time").textContent).toBe("");
  });

  it("groups notifications by the day they arrived", async () => {
    withList([
      notif({ id: "a", createdAt: "2026-01-05T10:00:00.000Z" }),
      notif({ id: "b", createdAt: "2026-02-09T10:00:00.000Z" }),
      notif({ id: "c", createdAt: "2026-02-09T12:00:00.000Z" }),
    ]);
    renderPage();
    await settled();
    expect(document.body.querySelectorAll(".notifications-group")).toHaveLength(2);
  });

  it("labels the button with the action it will take", async () => {
    withList([notif({ type: "UPCOMING_APPOINTMENT", entityId: "a1" })]);
    renderPage();
    await settled();
    expect(actionButtons()[0].textContent).not.toBe("View details");
  });

  it("labels the button generically when the notification maps nowhere", async () => {
    withList([notif({ type: "NO_SUCH_TYPE", entityType: "NOTHING" })]);
    renderPage();
    await settled();
    expect(actionButtons()[0]).toHaveTextContent("View details");
  });

  it("marks an unread card apart from a read one", async () => {
    withList([notif({ id: "a" }), notif({ id: "b", isRead: true })]);
    renderPage();
    await settled();
    expect(document.body.querySelectorAll(".notification-card-unread")).toHaveLength(1);
  });
});

describe("the header", () => {
  it("counts the unread and offers to clear them", async () => {
    withList([notif({ id: "a" }), notif({ id: "b" }), notif({ id: "c", isRead: true })]);
    renderPage();
    await settled();
    expect(document.body.querySelector(".notifications-count")).toHaveTextContent("2");
    expect(screen.getByText("Mark all as read")).toBeInTheDocument();
  });

  it("hides the count and the bulk action once everything is read", async () => {
    withList([notif({ isRead: true })]);
    renderPage();
    await settled();
    expect(document.body.querySelector(".notifications-count")).toBeNull();
    expect(screen.queryByText("Mark all as read")).toBeNull();
  });

  it("goes back a step when closed", async () => {
    renderPage();
    await settled();
    fireEvent.click(screen.getByText("Close"));
    expect(h.navigate).toHaveBeenCalledWith(-1);
  });

  it("marks every unread one read and reloads", async () => {
    withList([notif({ id: "a" }), notif({ id: "b" }), notif({ id: "c", isRead: true })]);
    renderPage();
    await settled();
    fireEvent.click(screen.getByText("Mark all as read"));

    await waitFor(() => expect(h.getNotifications).toHaveBeenCalledTimes(2));
    expect(h.markNotificationRead).toHaveBeenCalledTimes(2);
    expect(h.emitNotificationRead).toHaveBeenCalledWith("a");
    expect(h.emitNotificationRead).toHaveBeenCalledWith("b");
  });

  it("swallows a failed bulk mark-read", async () => {
    withList([notif({ id: "a" })]);
    h.markNotificationRead.mockRejectedValue(new Error("nope"));
    renderPage();
    await settled();
    fireEvent.click(screen.getByText("Mark all as read"));
    await waitFor(() => expect(h.getNotifications).toHaveBeenCalledTimes(2));
  });
});

describe("marking one read", () => {
  it("updates optimistically, persists and tells the socket", async () => {
    withList([notif({ id: "a", type: "NO_SUCH_TYPE", entityType: "NOTHING" })]);
    renderPage();
    await settled();
    fireEvent.click(actionButtons()[0]);

    await waitFor(() =>
      expect(document.body.querySelector(".notification-card-unread")).toBeNull()
    );
    expect(h.markNotificationRead).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a" })
    );
    expect(h.emitNotificationRead).toHaveBeenCalledWith("a");
  });

  it("does nothing on the server for one already read", async () => {
    withList([notif({ id: "a", isRead: true, type: "NO_SUCH_TYPE", entityType: "NOTHING" })]);
    renderPage();
    await settled();
    fireEvent.click(actionButtons()[0]);
    expect(h.markNotificationRead).not.toHaveBeenCalled();
    expect(h.emitNotificationRead).not.toHaveBeenCalled();
  });

  it("keeps the optimistic update when the server call fails", async () => {
    withList([notif({ id: "a", type: "NO_SUCH_TYPE", entityType: "NOTHING" })]);
    h.markNotificationRead.mockRejectedValue(new Error("nope"));
    renderPage();
    await settled();
    fireEvent.click(actionButtons()[0]);
    await waitFor(() =>
      expect(document.body.querySelector(".notification-card-unread")).toBeNull()
    );
  });
});

describe("live notifications", () => {
  it("prepends one pushed over the socket", async () => {
    withList([notif({ id: "old", title: "Older" })]);
    renderPage();
    await settled();

    act(() => h.onNotificationCb(notif({ id: "new", title: "Newer" })));
    const titles = Array.from(
      document.body.querySelectorAll(".notification-card-title")
    ).map((n) => n.textContent);
    expect(titles).toEqual(["Newer", "Older"]);
  });

  it("unwraps a pushed { notification: ... } envelope", async () => {
    renderPage();
    await settled();
    act(() => h.onNotificationCb({ notification: notif({ id: "x", title: "Enveloped" }) }));
    expect(screen.getByText("Enveloped")).toBeInTheDocument();
  });

  it("merges a push that repeats an id already on screen", async () => {
    withList([notif({ id: "same", title: "Before" })]);
    renderPage();
    await settled();
    act(() => h.onNotificationCb(notif({ id: "same", title: "After" })));
    expect(cards()).toHaveLength(1);
    expect(screen.getByText("After")).toBeInTheDocument();
  });

  it("prepends a push with no id rather than trying to match it", async () => {
    withList([notif({ id: "old" })]);
    renderPage();
    await settled();
    act(() => h.onNotificationCb(notif({ id: undefined, title: "Anonymous" })));
    expect(cards()).toHaveLength(2);
  });

  it("ignores an empty push", async () => {
    withList([notif()]);
    renderPage();
    await settled();
    act(() => h.onNotificationCb(null));
    expect(cards()).toHaveLength(1);
  });

  it("unsubscribes on unmount", async () => {
    const { unmount } = renderPage();
    await settled();
    unmount();
    expect(h.unsub).toHaveBeenCalled();
  });
});

describe("pagination", () => {
  const many = (n) =>
    Array.from({ length: n }, (_, i) =>
      notif({ id: `n${i}`, title: `Item ${i}`, isRead: true })
    );

  it("stays unpaginated for a single page", async () => {
    withList(many(4));
    renderPage();
    await settled();
    expect(document.body.querySelector(".pagination")).toBeNull();
  });

  it("shows ten at a time and pages through the rest", async () => {
    withList(many(23));
    renderPage();
    await settled();
    expect(cards()).toHaveLength(10);

    fireEvent.click(screen.getByText("3"));
    expect(cards()).toHaveLength(3);
    expect(screen.getByText("Item 22")).toBeInTheDocument();
  });
});

describe("opening an appointment from a notification", () => {
  const appointmentResponse = {
    data: {
      data: {
        id: "appt-1",
        client: { firstName: "Ada", lastName: "Lovelace" },
        clinicians: [{ fullName: "Dr Who" }, { fullName: null }],
        appointmentServices: [{ serviceCode: { code: "H2019" }, modifiers: { modifier: "HN" } }],
        session: { name: "Weekly" },
        date: "2026-03-01",
        startTime: "09:00",
        endTime: "10:00",
      },
    },
  };

  it("loads the appointment and shows it in a modal instead of navigating", async () => {
    withList([notif({ id: "a", type: "UPCOMING_APPOINTMENT", entityId: "appt-1" })]);
    h.appt.GetAppointmentById.mockResolvedValue(appointmentResponse);
    renderPage();
    await settled();
    fireEvent.click(actionButtons()[0]);

    await screen.findByTestId("view-appt");
    expect(h.navigate).not.toHaveBeenCalled();
    const shown = JSON.parse(screen.getByTestId("view-appt-json").textContent);
    expect(shown).toMatchObject({
      clientName: "Ada Lovelace",
      therapistName: "Dr Who",
      serviceType: "H2019 (HN)",
      sessionType: "Weekly",
    });
  });

  it("fills in the unassigned and N/A gaps when the appointment is bare", async () => {
    withList([notif({ id: "a", entityType: "APPOINTMENT", type: "SOMETHING", entityId: "appt-1" })]);
    h.appt.GetAppointmentById.mockResolvedValue({
      data: { id: "appt-1", startTime: null, endTime: null },
    });
    renderPage();
    await settled();
    fireEvent.click(actionButtons()[0]);

    await screen.findByTestId("view-appt");
    const shown = JSON.parse(screen.getByTestId("view-appt-json").textContent);
    expect(shown).toMatchObject({
      clientName: "Unknown Client",
      therapistName: "Unassigned",
      serviceType: "N/A",
      sessionType: "N/A",
      time: "N/A",
    });
  });

  it("closes the appointment modal again", async () => {
    withList([notif({ id: "a", type: "UPCOMING_APPOINTMENT", entityId: "appt-1" })]);
    h.appt.GetAppointmentById.mockResolvedValue(appointmentResponse);
    renderPage();
    await settled();
    fireEvent.click(actionButtons()[0]);
    fireEvent.click(await screen.findByText("close-view"));
    expect(screen.queryByTestId("view-appt")).toBeNull();
  });

  it("routes instead when the appointment comes back empty", async () => {
    withList([notif({ id: "a", type: "UPCOMING_APPOINTMENT", entityId: "appt-1" })]);
    h.appt.GetAppointmentById.mockResolvedValue({ data: null });
    renderPage();
    await settled();
    fireEvent.click(actionButtons()[0]);
    await waitFor(() => expect(h.navigate).toHaveBeenCalled());
    expect(screen.queryByTestId("view-appt")).toBeNull();
  });

  it("routes instead when the appointment fetch throws", async () => {
    withList([notif({ id: "a", type: "UPCOMING_APPOINTMENT", entityId: "appt-1" })]);
    h.appt.GetAppointmentById.mockRejectedValue(new Error("boom"));
    renderPage();
    await settled();
    fireEvent.click(actionButtons()[0]);
    await waitFor(() => expect(h.navigate).toHaveBeenCalled());
  });

  it("disables the action buttons while the record is being fetched", async () => {
    withList([notif({ id: "a", type: "UPCOMING_APPOINTMENT", entityId: "appt-1" })]);
    let release;
    h.appt.GetAppointmentById.mockReturnValue(new Promise((r) => (release = r)));
    renderPage();
    await settled();
    fireEvent.click(actionButtons()[0]);

    await waitFor(() => expect(actionButtons()[0]).toBeDisabled());
    await act(async () => {
      release(appointmentResponse);
    });
    expect(actionButtons()[0]).toBeEnabled();
  });

  it("routes straight away when the notification carries no entity id", async () => {
    withList([notif({ id: "a", type: "UPCOMING_APPOINTMENT", entityId: undefined })]);
    renderPage();
    await settled();
    fireEvent.click(actionButtons()[0]);
    expect(h.appt.GetAppointmentById).not.toHaveBeenCalled();
    expect(h.navigate).toHaveBeenCalled();
  });

  it.each([
    ["flat", { entityId: "appt-1" }],
    ["under data", { data: { entityId: "appt-1" } }],
    ["under metadata", { metadata: { entityId: "appt-1" } }],
  ])("finds an entity id held %s", async (_where, shape) => {
    withList([notif({ id: "a", type: "UPCOMING_APPOINTMENT", entityId: undefined, ...shape })]);
    h.appt.GetAppointmentById.mockResolvedValue(appointmentResponse);
    renderPage();
    await settled();
    fireEvent.click(actionButtons()[0]);
    await waitFor(() =>
      expect(h.appt.GetAppointmentById).toHaveBeenCalledWith(
        expect.objectContaining({ Id: "appt-1" })
      )
    );
  });

  it("navigates with the state a mapped action supplies", async () => {
    withList([
      notif({
        id: "a",
        type: "NEW_RESCHEDULE_REQUEST",
        entityId: undefined,
        metadata: { proposedDate: "2026-05-05" },
      }),
    ]);
    renderPage();
    await settled();
    fireEvent.click(actionButtons()[0]);
    expect(h.navigate).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ state: expect.any(Object) })
    );
  });

  it("does not navigate at all when nothing maps the notification", async () => {
    withList([notif({ id: "a", type: "NO_SUCH_TYPE", entityType: "NOTHING" })]);
    renderPage();
    await settled();
    fireEvent.click(actionButtons()[0]);
    expect(h.navigate).not.toHaveBeenCalled();
  });
});

describe("opening a reschedule request from a notification", () => {
  const rescheduleNotif = (over = {}) =>
    notif({
      id: "r",
      type: "NEW_RESCHEDULE_REQUEST",
      entityId: "appt-1",
      metadata: {
        proposedDate: "2026-03-10",
        proposedStartTime: "11:00",
        proposedEndTime: "12:00",
      },
      ...over,
    });

  const requestRow = {
    id: "req-1",
    appointmentId: "appt-1",
    date: "2026-03-10",
    startTime: "11:00",
    endTime: "12:00",
    appointment: {
      id: "appt-1",
      client: { firstName: "Ada", lastName: "Lovelace" },
      clinicians: [{ fullName: "Dr Who" }],
      session: { name: "Weekly" },
      appointmentServices: [{ serviceCode: { code: "H2019" } }],
      date: "2026-03-01",
      startTime: "09:00",
      endTime: "10:00",
    },
  };

  const openRequest = async (notifOver = {}, response = { data: { data: [requestRow] } }) => {
    withList([rescheduleNotif(notifOver)]);
    h.appt.GetRescheduleAppointmentReqByTenantId.mockResolvedValue(response);
    h.appt.GetRescheduleAppointmentReqByStaffId.mockResolvedValue(response);
    renderPage();
    await settled();
    fireEvent.click(actionButtons()[0]);
  };

  it("looks the request up by tenant for an admin and shows it", async () => {
    await openRequest();
    await screen.findByTestId("request-action");
    expect(h.appt.GetRescheduleAppointmentReqByTenantId).toHaveBeenCalled();
    expect(h.appt.GetRescheduleAppointmentReqByStaffId).not.toHaveBeenCalled();

    const row = JSON.parse(screen.getByTestId("request-json").textContent);
    expect(row).toMatchObject({
      id: "req-1",
      appointmentId: "appt-1",
      clientName: "Ada Lovelace",
      therapistName: "Dr Who",
      serviceType: "H2019",
      sessionType: "Weekly",
    });
    expect(row.prevDateTime.date).toBe("2026-03-01");
    expect(row.newDateTime.time).not.toBe("N/A");
  });

  it("looks the request up by staff id for a Staff role", async () => {
    h.auth = { ...h.auth, role: { name: "Staff" } };
    await openRequest();
    await screen.findByTestId("request-action");
    expect(h.appt.GetRescheduleAppointmentReqByStaffId).toHaveBeenCalled();
  });

  it("treats a missing role as a client and uses the tenant lookup", async () => {
    h.auth = { ...h.auth, role: undefined };
    await openRequest();
    await screen.findByTestId("request-action");
    expect(h.appt.GetRescheduleAppointmentReqByTenantId).toHaveBeenCalled();
  });

  it("matches a request that nests its appointment id", async () => {
    await openRequest({}, { data: { data: [{ ...requestRow, appointmentId: undefined }] } });
    await screen.findByTestId("request-action");
  });

  it("routes instead when no request matches the appointment", async () => {
    await openRequest({}, { data: { data: [] } });
    await waitFor(() => expect(h.navigate).toHaveBeenCalled());
    expect(screen.queryByTestId("request-action")).toBeNull();
  });

  it("routes instead when the lookup response has no data at all", async () => {
    await openRequest({}, {});
    await waitFor(() => expect(h.navigate).toHaveBeenCalled());
  });

  it("falls back to the appointment id when the request row is unwrapped", async () => {
    // An unwrapped row has no request id of its own, so the modal is keyed on
    // the appointment instead.
    await openRequest({}, { data: { data: [{ appointmentId: "appt-1" }] } });
    await screen.findByTestId("request-action");
    const row = JSON.parse(screen.getByTestId("request-json").textContent);
    expect(row.id).toBe("appt-1");
    expect(row.therapistName).toBe("Unassigned");
    expect(row.serviceType).toBe("N/A");
    expect(row.sessionType).toBe("N/A");
    expect(row.prevDateTime).toEqual({ date: "N/A", time: "N/A" });
  });

  it("takes the proposed slot from the notification when the request has none", async () => {
    await openRequest({}, {
      data: { data: [{ appointmentId: "appt-1", appointment: { id: "appt-1" } }] },
    });
    await screen.findByTestId("request-action");
    const row = JSON.parse(screen.getByTestId("request-json").textContent);
    expect(row.newDateTime.date).toBe("2026-03-10");
  });

  it("reads the proposed slot from `data` when there is no metadata", async () => {
    // The request row carries no slot of its own, so the notification's is used.
    await openRequest(
      {
        metadata: undefined,
        data: { proposedDate: "2026-07-07", proposedStartTime: "13:00", proposedEndTime: "14:00" },
      },
      { data: { data: [{ appointmentId: "appt-1", appointment: { id: "appt-1" } }] } }
    );
    await screen.findByTestId("request-action");
    const row = JSON.parse(screen.getByTestId("request-json").textContent);
    expect(row.newDateTime.date).toBe("2026-07-07");
  });

  it("carries no proposed slot when the notification has none", async () => {
    await openRequest(
      { metadata: undefined, data: undefined },
      { data: { data: [{ appointmentId: "appt-1", appointment: { id: "appt-1" } }] } }
    );
    await screen.findByTestId("request-action");
    const row = JSON.parse(screen.getByTestId("request-json").textContent);
    expect(row.newDateTime).toEqual({ date: "N/A", time: "N/A" });
  });

  it("approves the request and closes the modal", async () => {
    h.appt.ApproveRescheduledReq.mockResolvedValue({});
    await openRequest();
    fireEvent.click(await screen.findByText("approve-request"));

    await waitFor(() => expect(screen.queryByTestId("request-action")).toBeNull());
    expect(h.appt.ApproveRescheduledReq).toHaveBeenCalledWith(
      expect.objectContaining({ appointments: [{ id: "req-1" }] })
    );
    expect(h.showToast).toHaveBeenCalledWith("Reschedule request approved", "success");
  });

  it("reports a failed approval and leaves the modal open", async () => {
    h.appt.ApproveRescheduledReq.mockRejectedValue(new Error("no"));
    await openRequest();
    fireEvent.click(await screen.findByText("approve-request"));

    await waitFor(() =>
      expect(h.showApiError).toHaveBeenCalledWith(expect.any(Error), "APPROVE_RESCHEDULE")
    );
    expect(screen.getByTestId("request-action")).toBeInTheDocument();
  });

  it("closes the request modal on demand", async () => {
    await openRequest();
    fireEvent.click(await screen.findByText("close-request"));
    expect(screen.queryByTestId("request-action")).toBeNull();
  });
});

describe("rejecting and modifying from the request modal", () => {
  const rescheduleNotif = notif({
    id: "r",
    type: "NEW_RESCHEDULE_REQUEST",
    entityId: "appt-1",
  });

  const requestRow = {
    id: "req-1",
    appointmentId: "appt-1",
    date: "2026-03-10",
    startTime: "11:00",
    endTime: "12:00",
    appointment: { id: "appt-1" },
  };

  const openRequest = async () => {
    withList([rescheduleNotif]);
    h.appt.GetRescheduleAppointmentReqByTenantId.mockResolvedValue({
      data: { data: [requestRow] },
    });
    renderPage();
    await settled();
    fireEvent.click(actionButtons()[0]);
    await screen.findByTestId("request-action");
  };

  it("hands the reject modal the one request being rejected", async () => {
    await openRequest();
    fireEvent.click(screen.getByText("reject-request"));
    expect(screen.getByTestId("reject-count")).toHaveTextContent("1");
  });

  it("rejects a list of appointments", async () => {
    h.appt.RejectRescheduledReq.mockResolvedValue({});
    await openRequest();
    fireEvent.click(screen.getByText("reject-request"));
    fireEvent.click(screen.getByText("confirm-many"));

    await waitFor(() =>
      expect(h.appt.RejectRescheduledReq).toHaveBeenCalledWith(
        expect.objectContaining({ appointments: [{ id: "req-1" }] })
      )
    );
    expect(h.showToast).toHaveBeenCalledWith("Reschedule request rejected", "success");
    expect(screen.queryByTestId("request-action")).toBeNull();
  });

  it("rejects a single appointment sent on its own", async () => {
    h.appt.RejectRescheduledReq.mockResolvedValue({});
    await openRequest();
    fireEvent.click(screen.getByText("reject-request"));
    fireEvent.click(screen.getByText("confirm-one"));

    await waitFor(() =>
      expect(h.appt.RejectRescheduledReq).toHaveBeenCalledWith(
        expect.objectContaining({ appointments: [{ id: "req-1" }] })
      )
    );
  });

  it("reports a failed rejection", async () => {
    h.appt.RejectRescheduledReq.mockRejectedValue(new Error("no"));
    await openRequest();
    fireEvent.click(screen.getByText("reject-request"));
    fireEvent.click(screen.getByText("confirm-many"));

    await waitFor(() =>
      expect(h.showApiError).toHaveBeenCalledWith(expect.any(Error), "REJECT_RESCHEDULE")
    );
    expect(screen.getByTestId("reject")).toBeInTheDocument();
  });

  it("closes the reject modal on demand", async () => {
    await openRequest();
    fireEvent.click(screen.getByText("reject-request"));
    fireEvent.click(screen.getByText("close-reject"));
    expect(screen.queryByTestId("reject")).toBeNull();
  });

  it("reschedules every occurrence when the whole series is chosen", async () => {
    h.appt.RescheduleAppointments.mockResolvedValue({});
    await openRequest();
    fireEvent.click(screen.getByText("modify-request"));
    fireEvent.click(screen.getByText("save-all"));

    await waitFor(() =>
      expect(h.appt.RescheduleAppointments).toHaveBeenCalledWith(
        expect.objectContaining({ id: "appt-1", forAll: true, date: "2026-04-01" })
      )
    );
    expect(h.showToast).toHaveBeenCalledWith("Appointment rescheduled", "success");
    expect(screen.queryByTestId("reschedule")).toBeNull();
  });

  it("reschedules only this occurrence otherwise", async () => {
    h.appt.RescheduleAppointments.mockResolvedValue({});
    await openRequest();
    fireEvent.click(screen.getByText("modify-request"));
    fireEvent.click(screen.getByText("save-one"));

    await waitFor(() =>
      expect(h.appt.RescheduleAppointments).toHaveBeenCalledWith(
        expect.objectContaining({ forAll: false })
      )
    );
  });

  it("reports a failed reschedule", async () => {
    h.appt.RescheduleAppointments.mockRejectedValue(new Error("no"));
    await openRequest();
    fireEvent.click(screen.getByText("modify-request"));
    fireEvent.click(screen.getByText("save-all"));

    await waitFor(() =>
      expect(h.showApiError).toHaveBeenCalledWith(expect.any(Error), "RESCHEDULE_APPOINTMENT")
    );
    expect(screen.getByTestId("reschedule")).toBeInTheDocument();
  });

  it("closes the reschedule modal on demand", async () => {
    await openRequest();
    fireEvent.click(screen.getByText("modify-request"));
    fireEvent.click(screen.getByText("close-reschedule"));
    expect(screen.queryByTestId("reschedule")).toBeNull();
  });
});

describe("a fetch that answers with nothing at all", () => {
  it("treats an empty response as an empty list", async () => {
    h.getNotifications.mockResolvedValue(undefined);
    renderPage();
    await settled();
    expect(screen.getByText("No notifications")).toBeInTheDocument();
  });
});

describe("a live notification for one the page already holds", () => {
  it("merges the update into the existing card and leaves the others alone", async () => {
    withList([
      notif({ id: "a", title: "First" }),
      notif({ id: "b", title: "Second" }),
    ]);
    renderPage();
    await settled();

    act(() =>
      h.onNotificationCb({ id: "a", title: "First, revised", isRead: true })
    );

    expect(cards()).toHaveLength(2);
    expect(screen.getByText("First, revised")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });
});

describe("a notification the backend sent without a type", () => {
  it("still routes it by its entity type and leaves its neighbour unread", async () => {
    withList([
      notif({ id: "a", type: undefined, entityType: "TIMESHEET", entityId: "ts-1" }),
      notif({ id: "b" }),
    ]);
    renderPage();
    await settled();
    fireEvent.click(actionButtons()[0]);

    // The timesheet destination carries no navigation state, so the second
    // argument is left off entirely.
    expect(h.navigate).toHaveBeenCalledWith("/billing/timesheets/ts-1", undefined);
    expect(h.markNotificationRead).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a" })
    );
    // Only the clicked card lost its unread styling.
    expect(document.body.querySelectorAll(".notification-card-unread")).toHaveLength(1);
  });
});

describe("a reschedule request whose proposal is only half filled in", () => {
  const requestRow = {
    id: "req-1",
    appointmentId: "appt-1",
    appointment: { id: "appt-1" },
  };

  const openWith = async (metadata) => {
    withList([
      notif({ id: "r", type: "NEW_RESCHEDULE_REQUEST", entityId: "appt-1", metadata }),
    ]);
    h.appt.GetRescheduleAppointmentReqByTenantId.mockResolvedValue({
      data: { data: [requestRow] },
    });
    renderPage();
    await settled();
    fireEvent.click(actionButtons()[0]);
    await screen.findByTestId("request-action");
    return JSON.parse(screen.getByTestId("request-json").textContent);
  };

  it("keeps a proposed date that names no times", async () => {
    const row = await openWith({ proposedDate: "2026-03-10" });
    expect(row.newDateTime).toEqual({ date: "2026-03-10", time: "N/A" });
  });

  it("keeps proposed times that name no date", async () => {
    const row = await openWith({
      proposedStartTime: "11:00",
      proposedEndTime: "12:00",
    });
    expect(row.newDateTime.date).toBe("N/A");
    expect(row.newDateTime.time).not.toBe("N/A");
  });
});
