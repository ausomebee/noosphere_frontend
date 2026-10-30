import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

const messageApiMock = vi.hoisted(() => ({
  GetNotifications: vi.fn(),
  MarkNotificationRead: vi.fn(),
}));
vi.mock("../api/messageApi", () => ({ default: messageApiMock }));

const homeApiMock = vi.hoisted(() => ({ GetAppointmentById: vi.fn() }));
vi.mock("../api/homeApis", () => ({ default: homeApiMock }));

// The socket registrar hands its callback back so a test can push a live
// notification into the page.
const { socket } = vi.hoisted(() => ({ socket: { push: null, reads: [] } }));
vi.mock("../api/socketService", () => ({
  onNotification: (cb) => {
    socket.push = cb;
    return () => { socket.push = null; };
  },
  emitNotificationRead: (id) => socket.reads.push(id),
}));

vi.mock("../layouts/ClientLayout", () => ({
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

const { modalProps } = vi.hoisted(() => ({ modalProps: {} }));
vi.mock("../Components/Modal/UpcomingDashboardModal/AppointmentDetailsModal", () => ({
  default: (props) => {
    modalProps.current = props;
    return props.isOpen ? <div data-testid="details-open" /> : null;
  },
}));

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

import Notifications from "../Pages/Notification/Notifications";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The client's notification feed.
 *
 * Items arrive either flat or wrapped as `{ notification: {...} }`, and the
 * socket pushes the same two shapes live -- a push either updates an item
 * already on screen or is prepended as new. Reading is optimistic: the card
 * greys out before the API call, and a failed call is deliberately swallowed.
 *
 * Clicking a card's action is where the branching lives. A notification that
 * names an appointment opens the read-only details modal in place; anything
 * else is routed through `getNotificationAction`. The appointment id can be
 * flat or nested under `data`/`metadata`, and the modal only wins if the
 * lookup actually returns something.
 *
 * Relative times are computed against the real clock, so timestamps below are
 * offsets from now rather than fixed dates.
 */

const ago = (ms) => new Date(Date.now() - ms).toISOString();

const notification = (over = {}) => ({
  id: "n1",
  title: "Upcoming appointment",
  content: "Your session starts at 9am.",
  type: "UPCOMING_APPOINTMENT",
  entityType: "APPOINTMENT",
  entityId: "a1",
  isRead: false,
  createdAt: ago(5 * 60 * 1000),
  ...over,
});

const makeStore = () =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        isAuthenticated: true,
        loading: false,
        error: null,
        accessToken: "at",
        refreshToken: "rt",
        user: { id: "u1", tenantLinks: [{ id: "tc1", clientId: "cl1", tenantId: "t1" }] },
      },
    },
  });

const renderPage = async (store = makeStore()) => {
  const view = render(
    <Provider store={store}>
      <MemoryRouter>
        <Notifications />
      </MemoryRouter>
    </Provider>
  );
  await waitFor(() => expect(document.body.querySelector(".notifications-page")).toBeTruthy());
  return view;
};

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
  socket.push = null;
  socket.reads.length = 0;
  delete modalProps.current;
  messageApiMock.GetNotifications.mockResolvedValue({ data: { data: [notification()] } });
  messageApiMock.MarkNotificationRead.mockResolvedValue({});
  homeApiMock.GetAppointmentById.mockResolvedValue({ data: { data: { id: "a1" } } });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the feed", () => {
  it("fetches for the signed-in client", async () => {
    await renderPage();
    await waitFor(() =>
      expect(messageApiMock.GetNotifications).toHaveBeenCalledWith({
        userId: "u1",
        userType: "CLIENT",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
  });

  it("fetches nothing without a signed-in user", async () => {
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: { auth: { isAuthenticated: false, user: null } },
    });
    await renderPage(store);
    expect(messageApiMock.GetNotifications).not.toHaveBeenCalled();
  });

  it("renders a card per notification", async () => {
    await renderPage();
    await waitFor(() =>
      expect(screen.getByText("Upcoming appointment")).toBeInTheDocument()
    );
    expect(screen.getByText("Your session starts at 9am.")).toBeInTheDocument();
  });

  it("unwraps items delivered as { notification }", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({
      data: { data: [{ notification: notification({ title: "Wrapped" }) }] },
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText("Wrapped")).toBeInTheDocument());
  });

  it("reads a list delivered without the data envelope", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({ data: [notification()] });
    await renderPage();
    await waitFor(() =>
      expect(screen.getByText("Upcoming appointment")).toBeInTheDocument()
    );
  });

  it("reads a bare array", async () => {
    messageApiMock.GetNotifications.mockResolvedValue([notification()]);
    await renderPage();
    await waitFor(() =>
      expect(screen.getByText("Upcoming appointment")).toBeInTheDocument()
    );
  });

  it("shows the empty state when there is nothing", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({ data: { data: [] } });
    await renderPage();
    await waitFor(() => expect(screen.getByText("No notifications")).toBeInTheDocument());
  });

  it("treats a response that is not a list as empty", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({ data: { data: { nope: true } } });
    await renderPage();
    await waitFor(() => expect(screen.getByText("No notifications")).toBeInTheDocument());
  });

  it("shows the empty state when the fetch fails", async () => {
    messageApiMock.GetNotifications.mockRejectedValue(new Error("offline"));
    await renderPage();
    await waitFor(() => expect(screen.getByText("No notifications")).toBeInTheDocument());
  });

  it("titles a notification the API left blank", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({
      data: { data: [notification({ title: null, content: null })] },
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText("Notification")).toBeInTheDocument());
  });

  it.each([
    ["description", { content: null, description: "From description" }],
    ["body", { content: null, description: null, body: "From body" }],
  ])("falls back to the %s field for the message", async (_field, over) => {
    messageApiMock.GetNotifications.mockResolvedValue({
      data: { data: [notification(over)] },
    });
    await renderPage();
    await waitFor(() =>
      expect(screen.getByText(over.description || over.body)).toBeInTheDocument()
    );
  });
});

describe("relative times", () => {
  const timeOf = () => document.body.querySelector(".notification-time").textContent;

  it.each([
    ["Just now", 10 * 1000],
    ["1 minute ago", 61 * 1000],
    ["5 minutes ago", 5 * 60 * 1000],
    ["1 hour ago", 61 * 60 * 1000],
    ["3 hours ago", 3 * 60 * 60 * 1000],
    ["1 day ago", 25 * 60 * 60 * 1000],
    ["3 days ago", 3 * 24 * 60 * 60 * 1000],
  ])("renders %s", async (label, offset) => {
    messageApiMock.GetNotifications.mockResolvedValue({
      data: { data: [notification({ createdAt: ago(offset) })] },
    });
    await renderPage();
    await waitFor(() => expect(timeOf()).toBe(label));
  });

  it("renders nothing for a notification with no timestamp", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({
      data: { data: [notification({ createdAt: null })] },
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText("Earlier")).toBeInTheDocument());
    expect(timeOf()).toBe("");
  });
});

describe("marking as read", () => {
  it("greys the card and persists the read on both channels", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText("Upcoming appointment")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(document.body.querySelector(".notification-action"));
    });

    expect(messageApiMock.MarkNotificationRead).toHaveBeenCalledWith({
      id: "n1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(socket.reads).toContain("n1");
    await waitFor(() =>
      expect(document.body.querySelector(".notification-card--unread")).toBeNull()
    );
  });

  it("swallows a failed read so the card stays marked", async () => {
    messageApiMock.MarkNotificationRead.mockRejectedValue(new Error("offline"));
    await renderPage();
    await waitFor(() => expect(screen.getByText("Upcoming appointment")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(document.body.querySelector(".notification-action"));
    });
    await waitFor(() =>
      expect(document.body.querySelector(".notification-card--unread")).toBeNull()
    );
  });

  it("does not persist a read twice for an already-read notification", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({
      data: { data: [notification({ isRead: true, entityType: "OTHER", type: "FORM_CREATED" })] },
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText("Upcoming appointment")).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(document.body.querySelector(".notification-action"));
    });
    expect(messageApiMock.MarkNotificationRead).not.toHaveBeenCalled();
  });

  it("marks every unread notification at once and reloads", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({
      data: { data: [notification(), notification({ id: "n2", isRead: true })] },
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText("Mark all as read")).toBeInTheDocument());

    const before = messageApiMock.GetNotifications.mock.calls.length;
    await act(async () => { fireEvent.click(screen.getByText("Mark all as read")); });

    expect(messageApiMock.MarkNotificationRead).toHaveBeenCalledTimes(1);
    expect(socket.reads).toEqual(["n1"]);
    expect(messageApiMock.GetNotifications.mock.calls.length).toBe(before + 1);
  });

  it("hides the mark-all button once everything is read", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({
      data: { data: [notification({ isRead: true })] },
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText("Upcoming appointment")).toBeInTheDocument());
    expect(screen.queryByText("Mark all as read")).not.toBeInTheDocument();
  });
});

describe("live pushes", () => {
  it("prepends a notification the socket delivers", async () => {
    await renderPage();
    await waitFor(() => expect(socket.push).toBeTypeOf("function"));
    act(() => socket.push(notification({ id: "n2", title: "Just arrived" })));
    await waitFor(() => expect(screen.getByText("Just arrived")).toBeInTheDocument());
  });

  it("unwraps a push delivered as { notification }", async () => {
    await renderPage();
    await waitFor(() => expect(socket.push).toBeTypeOf("function"));
    act(() => socket.push({ notification: notification({ id: "n2", title: "Wrapped push" }) }));
    await waitFor(() => expect(screen.getByText("Wrapped push")).toBeInTheDocument());
  });

  it("updates an item already on screen rather than duplicating it", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText("Upcoming appointment")).toBeInTheDocument());
    act(() => socket.push(notification({ title: "Now rescheduled" })));
    await waitFor(() => expect(screen.getByText("Now rescheduled")).toBeInTheDocument());
    expect(document.body.querySelectorAll(".notification-card")).toHaveLength(1);
  });

  it("ignores an empty push", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText("Upcoming appointment")).toBeInTheDocument());
    act(() => socket.push(null));
    expect(document.body.querySelectorAll(".notification-card")).toHaveLength(1);
  });

  it("prepends a push carrying no id", async () => {
    await renderPage();
    await waitFor(() => expect(socket.push).toBeTypeOf("function"));
    act(() => socket.push({ title: "Anonymous", createdAt: ago(1000) }));
    await waitFor(() => expect(screen.getByText("Anonymous")).toBeInTheDocument());
  });
});

describe("acting on a notification", () => {
  const act1 = async () => {
    await waitFor(() => expect(document.body.querySelector(".notification-action")).toBeTruthy());
    await act(async () => {
      fireEvent.click(document.body.querySelector(".notification-action"));
    });
  };

  it("opens the appointment in place rather than routing away", async () => {
    await renderPage();
    await act1();
    expect(homeApiMock.GetAppointmentById).toHaveBeenCalledWith({
      id: "a1",
      accessToken: "at",
      refreshToken: "rt",
    });
    await waitFor(() => expect(screen.getByTestId("details-open")).toBeInTheDocument());
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each([
    ["under data", { entityId: undefined, data: { entityId: "a1" } }],
    ["under metadata", { entityId: undefined, metadata: { entityId: "a1" } }],
  ])("finds an appointment id held %s", async (_where, over) => {
    messageApiMock.GetNotifications.mockResolvedValue({
      data: { data: [notification(over)] },
    });
    await renderPage();
    await act1();
    expect(homeApiMock.GetAppointmentById).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a1" })
    );
  });

  it("treats any APPOINTMENT-shaped type as an appointment", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({
      data: { data: [notification({ entityType: "OTHER", type: "CANCELLED_APPOINTMENT" })] },
    });
    await renderPage();
    await act1();
    expect(homeApiMock.GetAppointmentById).toHaveBeenCalled();
  });

  it("routes instead when the lookup returns nothing", async () => {
    homeApiMock.GetAppointmentById.mockResolvedValue({});
    await renderPage();
    await act1();
    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(screen.queryByTestId("details-open")).toBeNull();
  });

  it("still opens the modal when only the inner appointment is null", async () => {
    // `res.data.data ?? res.data` falls through to the envelope itself, which
    // is truthy, so an explicitly-null appointment does not route away.
    homeApiMock.GetAppointmentById.mockResolvedValue({ data: { data: null } });
    await renderPage();
    await act1();
    await waitFor(() => expect(screen.getByTestId("details-open")).toBeInTheDocument());
    expect(navigate).not.toHaveBeenCalled();
  });

  it("routes instead when the lookup fails", async () => {
    homeApiMock.GetAppointmentById.mockRejectedValue(new Error("offline"));
    await renderPage();
    await act1();
    await waitFor(() => expect(navigate).toHaveBeenCalled());
  });

  it("reads an appointment delivered without the data envelope", async () => {
    homeApiMock.GetAppointmentById.mockResolvedValue({ data: { id: "a1" } });
    await renderPage();
    await act1();
    await waitFor(() => expect(screen.getByTestId("details-open")).toBeInTheDocument());
  });

  it("routes a non-appointment notification to its mapped destination", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({
      data: {
        data: [
          notification({ entityType: "FORM", type: "FORM_CREATED", entityId: "f1" }),
        ],
      },
    });
    await renderPage();
    await act1();
    expect(homeApiMock.GetAppointmentById).not.toHaveBeenCalled();
    await waitFor(() => expect(navigate).toHaveBeenCalled());
  });

  it("routes nowhere for a notification with no mapped destination", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({
      data: { data: [notification({ entityType: "NOTHING", type: "UNKNOWN", entityId: null })] },
    });
    await renderPage();
    await act1();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("labels the button from the mapped action", async () => {
    await renderPage();
    await waitFor(() =>
      expect(document.body.querySelector(".notification-action").textContent).toBeTruthy()
    );
  });

  it("falls back to a generic label when there is no mapped action", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({
      data: { data: [notification({ entityType: "NOTHING", type: "UNKNOWN", entityId: null })] },
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText("View details")).toBeInTheDocument());
  });
});

describe("the appointment modal opened from a notification", () => {
  const openModal = async () => {
    await renderPage();
    await waitFor(() => expect(document.body.querySelector(".notification-action")).toBeTruthy());
    await act(async () => {
      fireEvent.click(document.body.querySelector(".notification-action"));
    });
    await waitFor(() => expect(screen.getByTestId("details-open")).toBeInTheDocument());
  };

  it("closes without routing", async () => {
    await openModal();
    act(() => modalProps.current.onClose());
    await waitFor(() => expect(screen.queryByTestId("details-open")).toBeNull());
    expect(navigate).not.toHaveBeenCalled();
  });

  it("sends a reschedule request to the dashboard's upcoming tab", async () => {
    await openModal();
    act(() => modalProps.current.onReschedule());
    expect(navigate).toHaveBeenCalledWith("/dashboard", {
      state: { focusTab: "upcoming" },
    });
    await waitFor(() => expect(screen.queryByTestId("details-open")).toBeNull());
  });
});

describe("paging", () => {
  const many = Array.from({ length: 23 }, (_, i) =>
    notification({
      id: `n${i}`,
      title: `Notice ${i}`,
      // Descending timestamps so the sort order is deterministic.
      createdAt: ago((i + 1) * 60 * 1000),
    })
  );

  it("shows one page at a time, newest first", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({ data: { data: many } });
    await renderPage();
    await waitFor(() => expect(screen.getByText("Notice 0")).toBeInTheDocument());
    expect(document.body.querySelectorAll(".notification-card")).toHaveLength(10);
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
  });

  it("steps forward and back", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({ data: { data: many } });
    await renderPage();
    await waitFor(() => expect(screen.getByText("Notice 0")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Next"));
    await waitFor(() => expect(screen.getByText("Notice 10")).toBeInTheDocument());
    expect(screen.queryByText("Notice 0")).toBeNull();

    fireEvent.click(screen.getByText("Previous"));
    await waitFor(() => expect(screen.getByText("Notice 0")).toBeInTheDocument());
  });

  it("disables the ends of the range", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({ data: { data: many } });
    await renderPage();
    await waitFor(() => expect(screen.getByText("Previous")).toBeDisabled());

    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    await waitFor(() => expect(screen.getByText("Next")).toBeDisabled());
  });

  it("hides the pager when everything fits on one page", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText("Upcoming appointment")).toBeInTheDocument());
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
  });

  it("groups a page by its date headers", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({
      data: {
        data: [
          notification({ id: "a", createdAt: ago(60 * 1000) }),
          notification({ id: "b", createdAt: ago(30 * 60 * 60 * 1000) }),
        ],
      },
    });
    await renderPage();
    await waitFor(() =>
      expect(document.body.querySelectorAll(".notifications-section").length).toBe(2)
    );
  });
});

describe("shapes the feed can arrive in", () => {
  it("treats a response of nothing at all as an empty feed", async () => {
    messageApiMock.GetNotifications.mockResolvedValue(null);
    await renderPage();
    await waitFor(() => expect(screen.getByText("No notifications")).toBeInTheDocument());
  });

  it("leaves the other notifications alone when a push updates one", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({
      data: { data: [notification(), notification({ id: "n2", title: "Second" })] },
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText("Second")).toBeInTheDocument());

    act(() => socket.push(notification({ id: "n2", title: "Second, revised" })));
    await waitFor(() => expect(screen.getByText("Second, revised")).toBeInTheDocument());
    expect(screen.getByText("Upcoming appointment")).toBeInTheDocument();
  });

  it("marks only the notification that was clicked", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({
      data: { data: [notification(), notification({ id: "n2", title: "Second" })] },
    });
    await renderPage();
    await waitFor(() =>
      expect(document.body.querySelectorAll(".notification-card--unread")).toHaveLength(2)
    );
    await act(async () => {
      fireEvent.click(document.body.querySelectorAll(".notification-action")[0]);
    });
    await waitFor(() =>
      expect(document.body.querySelectorAll(".notification-card--unread")).toHaveLength(1)
    );
  });

  it("does not mistake a notification with no type for an appointment", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({
      data: { data: [notification({ type: undefined, entityType: "FORM", entityId: "f1" })] },
    });
    await renderPage();
    await waitFor(() => expect(document.body.querySelector(".notification-action")).toBeTruthy());
    await act(async () => {
      fireEvent.click(document.body.querySelector(".notification-action"));
    });
    expect(homeApiMock.GetAppointmentById).not.toHaveBeenCalled();
  });

  it("sorts an undated notification below the dated ones", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({
      data: {
        data: [
          notification({ id: "old", title: "Undated", createdAt: null }),
          notification({ id: "new", title: "Recent", createdAt: ago(60 * 1000) }),
        ],
      },
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText("Undated")).toBeInTheDocument());
    const titles = Array.from(document.body.querySelectorAll(".notification-title")).map(
      (n) => n.textContent
    );
    expect(titles).toEqual(["Recent", "Undated"]);
  });
});

describe("sorting when nothing carries a date", () => {
  it("leaves two undated notifications in the order they arrived", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({
      data: {
        data: [
          notification({ id: "a", title: "First", createdAt: null }),
          notification({ id: "b", title: "Second", createdAt: null }),
        ],
      },
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText("First")).toBeInTheDocument());
    // Both sides of the comparator fall back to zero, so the sort is a no-op.
    const titles = Array.from(document.body.querySelectorAll(".notification-title")).map(
      (n) => n.textContent
    );
    expect(titles).toEqual(["First", "Second"]);
  });
});
