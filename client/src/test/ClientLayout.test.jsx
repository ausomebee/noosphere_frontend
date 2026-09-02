import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

const messageApiMock = vi.hoisted(() => ({ GetNotifications: vi.fn() }));
vi.mock("../api/messageApi", () => ({ default: messageApiMock }));

const disconnectSocket = vi.hoisted(() => vi.fn());
vi.mock("../api/socketService", () => ({ disconnectSocket }));

// The layout reaches for the real persistor at import time; stubbing the whole
// module keeps redux-persist (and its storage writes) out of this suite while
// still letting a test prove logout purges.
const purge = vi.hoisted(() => vi.fn());
vi.mock("../ReduxStore/store", () => ({ persistor: { purge }, store: {} }));

vi.mock("../hooks/useIdleTimeout", () => ({ default: () => {} }));

// useSocket is the layout's only source of live counts, so the mock hands the
// callbacks back to the test and lets it choose the connection state.
const { socket } = vi.hoisted(() => ({ socket: { opts: null, isConnected: true } }));
vi.mock("../hooks/useSocket", () => ({
  default: (opts) => {
    socket.opts = opts;
    return { isConnected: socket.isConnected };
  },
}));

vi.mock("../Components/Modal/MessageModal", () => ({
  default: ({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="message-modal">
        <button onClick={onClose}>close messages</button>
      </div>
    ) : null,
}));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

import ClientLayout from "../layouts/ClientLayout";
import authReducer, { updateUser } from "../ReduxStore/features/authentication";

/**
 * The shell every signed-in client page renders inside.
 *
 * Three independent pieces of state make it branchy. The network banner is
 * driven by `window`'s online/offline events and hides itself on a timer, so
 * "back online" is transient while "you are offline" is not. The two badges
 * count differently: messages only ever come from the socket, while the
 * notification badge is seeded from the server so it survives a refresh --
 * and that seed has to cope with the four response shapes the API has used.
 * Finally the avatar falls back to initials both when there is no stored image
 * and when the stored one fails to load, and resets that failure whenever the
 * url changes.
 */

const makeStore = (user = { id: "u1", firstName: "Ada", lastName: "Bell" }) =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        isAuthenticated: true,
        loading: false,
        error: null,
        accessToken: "at",
        refreshToken: "rt",
        user,
      },
    },
  });

const renderLayout = async (store = makeStore()) => {
  const view = render(
    <Provider store={store}>
      <MemoryRouter>
        <ClientLayout>
          <p>page body</p>
        </ClientLayout>
      </MemoryRouter>
    </Provider>
  );
  await waitFor(() => expect(screen.getByText("page body")).toBeInTheDocument());
  return { ...view, store };
};

const sidebar = () => document.body.querySelector(".dashboard-sidebar");
const overlay = () => document.body.querySelector(".sidebar-overlay");
const banner = () => document.body.querySelector(".network-status-banner");
const avatarImg = () => document.body.querySelector(".profile-avatar img");
const initials = () => document.body.querySelector(".profile-avatar div");

beforeEach(() => {
  vi.clearAllMocks();
  socket.opts = null;
  socket.isConnected = true;
  messageApiMock.GetNotifications.mockResolvedValue({ data: { data: [] } });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the network banner", () => {
  it("stays hidden while the browser reports a connection", async () => {
    await renderLayout();
    expect(banner()).toBeNull();
  });

  it("shows an offline warning as soon as the connection drops", async () => {
    await renderLayout();
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(banner()).toHaveClass("offline");
    expect(
      screen.getByText("You are offline — check your connection")
    ).toBeInTheDocument();
  });

  it("warns from the first render when the browser is already offline", async () => {
    // navigator.onLine seeds the initial state, so it has to be false before
    // the component mounts rather than toggled afterwards.
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => false,
    });
    try {
      await renderLayout();
      expect(banner()).toHaveClass("offline");
    } finally {
      Object.defineProperty(window.navigator, "onLine", {
        configurable: true,
        get: () => true,
      });
    }
  });

  it("confirms the connection is back, then takes the notice away", async () => {
    vi.useFakeTimers();
    try {
      const view = render(
        <Provider store={makeStore()}>
          <MemoryRouter>
            <ClientLayout />
          </MemoryRouter>
        </Provider>
      );
      await act(async () => {
        window.dispatchEvent(new Event("offline"));
      });
      await act(async () => {
        window.dispatchEvent(new Event("online"));
      });
      expect(banner()).toHaveClass("online");
      expect(screen.getByText("Back online")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(banner()).toBeNull();
      view.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it("drops the back-online notice immediately if the connection goes again", async () => {
    await renderLayout();
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.getByText("Back online")).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.queryByText("Back online")).toBeNull();
    expect(banner()).toHaveClass("offline");
  });

  it("stops listening once the layout goes away", async () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const view = await renderLayout();
    view.unmount();
    const events = remove.mock.calls.map(([name]) => name);
    expect(events).toContain("online");
    expect(events).toContain("offline");
  });
});

describe("the notification badge", () => {
  it("seeds itself with the unread notifications on the server", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({
      data: { data: [{ isRead: false }, { isRead: true }, { isRead: false }] },
    });
    await renderLayout();
    expect(messageApiMock.GetNotifications).toHaveBeenCalledWith({
      userId: "u1",
      userType: "CLIENT",
      accessToken: "at",
      refreshToken: "rt",
    });
    await waitFor(() =>
      expect(document.body.querySelector(".nav-badge")).toHaveTextContent("2")
    );
  });

  it("unwraps notifications the API nests under a key", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({
      data: { data: [{ notification: { isRead: false } }] },
    });
    await renderLayout();
    await waitFor(() =>
      expect(document.body.querySelector(".nav-badge")).toHaveTextContent("1")
    );
  });

  it.each([
    ["the list one level up", { data: [{ isRead: false }] }],
    ["a bare array", [{ isRead: false }]],
  ])("reads %s", async (_case, response) => {
    messageApiMock.GetNotifications.mockResolvedValue(response);
    await renderLayout();
    await waitFor(() =>
      expect(document.body.querySelector(".nav-badge")).toHaveTextContent("1")
    );
  });

  it("counts nothing when the payload is not a list", async () => {
    messageApiMock.GetNotifications.mockResolvedValue({ data: { data: { oops: true } } });
    await renderLayout();
    expect(document.body.querySelector(".nav-badge")).toBeNull();
  });

  it("counts nothing when the response is empty", async () => {
    messageApiMock.GetNotifications.mockResolvedValue(undefined);
    await renderLayout();
    expect(document.body.querySelector(".nav-badge")).toBeNull();
  });

  it("stays quiet when the seed request fails", async () => {
    messageApiMock.GetNotifications.mockRejectedValue(new Error("offline"));
    await renderLayout();
    expect(document.body.querySelector(".nav-badge")).toBeNull();
  });

  it("asks for nothing without a signed-in user", async () => {
    await renderLayout(makeStore(null));
    expect(messageApiMock.GetNotifications).not.toHaveBeenCalled();
  });

  it("asks for nothing without an access token", async () => {
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: {
        auth: { isAuthenticated: true, user: { id: "u1" }, accessToken: null },
      },
    });
    await renderLayout(store);
    expect(messageApiMock.GetNotifications).not.toHaveBeenCalled();
  });

  it("counts notifications pushed over the socket", async () => {
    await renderLayout();
    act(() => {
      socket.opts.onNotification();
    });
    expect(document.body.querySelector(".nav-badge")).toHaveTextContent("1");
  });

  it("caps the badge once past ninety-nine", async () => {
    await renderLayout();
    act(() => {
      for (let i = 0; i < 100; i += 1) socket.opts.onNotification();
    });
    expect(document.body.querySelector(".nav-badge")).toHaveTextContent("99+");
  });

  it("clears the badge when the notifications page is opened", async () => {
    await renderLayout();
    act(() => {
      socket.opts.onNotification();
    });
    fireEvent.click(screen.getByText("Notifications"));
    expect(document.body.querySelector(".nav-badge")).toBeNull();
  });

  it("keeps the badge when some other page is opened", async () => {
    await renderLayout();
    act(() => {
      socket.opts.onNotification();
    });
    fireEvent.click(screen.getByText("My programs"));
    expect(document.body.querySelector(".nav-badge")).toHaveTextContent("1");
  });
});

describe("the message badge", () => {
  const badge = () => document.body.querySelector(".header-msg-badge");

  it("starts with nothing waiting", async () => {
    await renderLayout();
    expect(badge()).toBeNull();
  });

  it("counts messages pushed over the socket", async () => {
    await renderLayout();
    act(() => {
      socket.opts.onMessage();
      socket.opts.onMessage();
    });
    expect(badge()).toHaveTextContent("2");
  });

  it("caps the badge once past ninety-nine", async () => {
    await renderLayout();
    act(() => {
      for (let i = 0; i < 100; i += 1) socket.opts.onMessage();
    });
    expect(badge()).toHaveTextContent("99+");
  });

  it("opens the message dialog and clears the count", async () => {
    await renderLayout();
    act(() => {
      socket.opts.onMessage();
    });
    fireEvent.click(screen.getByLabelText("Messages"));
    expect(screen.getByTestId("message-modal")).toBeInTheDocument();
    expect(badge()).toBeNull();
  });

  it("closes the message dialog again", async () => {
    await renderLayout();
    fireEvent.click(screen.getByLabelText("Messages"));
    fireEvent.click(screen.getByText("close messages"));
    expect(screen.queryByTestId("message-modal")).toBeNull();
  });
});

describe("the sidebar", () => {
  it("starts closed", async () => {
    await renderLayout();
    expect(sidebar()).not.toHaveClass("open");
    expect(overlay()).not.toHaveClass("active");
  });

  it("opens and closes from the menu button", async () => {
    await renderLayout();
    fireEvent.click(screen.getByLabelText("Toggle menu"));
    expect(sidebar()).toHaveClass("open");
    expect(overlay()).toHaveClass("active");

    fireEvent.click(screen.getByLabelText("Toggle menu"));
    expect(sidebar()).not.toHaveClass("open");
  });

  it("closes when the overlay behind it is clicked", async () => {
    await renderLayout();
    fireEvent.click(screen.getByLabelText("Toggle menu"));
    fireEvent.click(overlay());
    expect(sidebar()).not.toHaveClass("open");
  });

  it("closes when a destination is chosen", async () => {
    await renderLayout();
    fireEvent.click(screen.getByLabelText("Toggle menu"));
    fireEvent.click(screen.getByText("Documents & Forms"));
    expect(sidebar()).not.toHaveClass("open");
  });

  it("marks the destination matching the current route", async () => {
    render(
      <Provider store={makeStore()}>
        <MemoryRouter initialEntries={["/programs"]}>
          <ClientLayout />
        </MemoryRouter>
      </Provider>
    );
    await waitFor(() => expect(screen.getByText("My programs")).toBeInTheDocument());
    expect(screen.getByText("My programs").closest("a")).toHaveClass("active");
    expect(screen.getByText("Home").closest("a")).not.toHaveClass("active");
  });
});

describe("the profile summary", () => {
  it("greets the client by their full name", async () => {
    await renderLayout();
    expect(screen.getByText("Ada Bell")).toBeInTheDocument();
  });

  it("falls back to a generic greeting when no name is stored", async () => {
    await renderLayout(makeStore({ id: "u1" }));
    expect(screen.getByText("User")).toBeInTheDocument();
  });

  it("draws both initials when there is no avatar", async () => {
    await renderLayout();
    expect(initials()).toHaveTextContent("AB");
  });

  it("draws a placeholder initial when the client has no name at all", async () => {
    await renderLayout(makeStore({ id: "u1" }));
    expect(initials()).toHaveTextContent("U");
  });

  it("draws only the first initial when there is no surname", async () => {
    await renderLayout(makeStore({ id: "u1", firstName: "Ada" }));
    expect(initials()).toHaveTextContent("A");
  });

  it("shows the stored avatar when there is one", async () => {
    await renderLayout(
      makeStore({ id: "u1", firstName: "Ada", lastName: "Bell", avatarUrl: "https://cdn/a.png" })
    );
    expect(avatarImg()).toHaveAttribute("src", "https://cdn/a.png");
    expect(avatarImg()).toHaveAttribute("alt", "Ada Bell");
  });

  it("falls back to initials when the stored avatar will not load", async () => {
    await renderLayout(
      makeStore({ id: "u1", firstName: "Ada", lastName: "Bell", avatarUrl: "https://cdn/a.png" })
    );
    fireEvent.error(avatarImg());
    expect(avatarImg()).toBeNull();
    expect(initials()).toHaveTextContent("AB");
  });

  it("gives a newly stored avatar another chance after one failed", async () => {
    const { store } = await renderLayout(
      makeStore({ id: "u1", firstName: "Ada", lastName: "Bell", avatarUrl: "https://cdn/a.png" })
    );
    fireEvent.error(avatarImg());
    expect(avatarImg()).toBeNull();

    act(() => {
      store.dispatch(updateUser({ avatarUrl: "https://cdn/b.png" }));
    });
    expect(avatarImg()).toHaveAttribute("src", "https://cdn/b.png");
  });

  it.each([
    ["online", true, "is-online"],
    ["offline", false, "is-offline"],
  ])("badges the socket as %s", async (_case, isConnected, className) => {
    socket.isConnected = isConnected;
    await renderLayout();
    expect(document.body.querySelector(".conn-status")).toHaveClass(className);
  });
});

describe("logging out", () => {
  it("drops the socket, clears the session and returns to the login page", async () => {
    const { store } = await renderLayout();
    fireEvent.click(screen.getByText("Logout"));

    expect(disconnectSocket).toHaveBeenCalled();
    expect(store.getState().auth.user).toBeNull();
    expect(purge).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/");
  });
});
