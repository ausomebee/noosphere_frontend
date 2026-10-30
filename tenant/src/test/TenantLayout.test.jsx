import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

/**
 * The shell every signed-in tenant page renders inside: sidebar, header,
 * notification bell, message modal and profile menu.
 *
 * Nearly all of its behaviour is conditional on things jsdom does not model on
 * its own -- `window.innerWidth` decides mobile versus desktop and is read
 * during the first render as well as on every resize, and `navigator.onLine`
 * drives the connectivity banner -- so both are set explicitly before each
 * render rather than left at their defaults.
 *
 * The sidebar is built by filtering a fixed nav table through `hasModule` and
 * `hasPermission`; the hook supplying those is mocked so a test can deny one
 * module or one child page and watch the tree collapse. The router is real (the
 * active-link classes are derived from the location) apart from `useNavigate`,
 * which is spied on.
 */

const h = vi.hoisted(() => ({
  auth: {},
  allowedModules: null,
  allowedPermissions: null,
  navigate: vi.fn(),
  dispatch: vi.fn(),
  purge: vi.fn(),
  disconnectSocket: vi.fn(),
  getNotifications: vi.fn(),
  socketOpts: null,
  isConnected: true,
}));

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => h.navigate,
}));

vi.mock("react-redux", async (importOriginal) => ({
  ...(await importOriginal()),
  useDispatch: () => h.dispatch,
}));

vi.mock("../hooks/useAuth", () => ({ default: () => h.auth }));

vi.mock("../hooks/usePermissions", () => ({
  default: () => ({
    // null means "allow everything"; an array is an allow-list.
    hasModule: (key) => (h.allowedModules === null ? true : h.allowedModules.includes(key)),
    hasPermission: (key) =>
      h.allowedPermissions === null ? true : h.allowedPermissions.includes(key),
  }),
}));

vi.mock("../hooks/useIdleTimeout", () => ({ default: () => {} }));

vi.mock("../hooks/useSocket", () => ({
  default: (opts) => {
    h.socketOpts = opts;
    return { isConnected: h.isConnected };
  },
}));

vi.mock("../api/notificationApi", () => ({
  default: { getNotifications: (...a) => h.getNotifications(...a) },
}));

vi.mock("../api/socketService", () => ({
  disconnectSocket: (...a) => h.disconnectSocket(...a),
}));

vi.mock("../ReduxStore/store", () => ({
  persistor: { purge: (...a) => h.purge(...a) },
  default: {},
}));

vi.mock("../ReduxStore/features/authentication", () => ({
  logout: () => ({ type: "authentication/logout" }),
}));

vi.mock("../Components/MessageModal/MessageModal", () => ({
  default: ({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="message-modal">
        <button onClick={onClose}>close-messages</button>
      </div>
    ) : null,
}));

vi.mock("../Components/ConnectionStatus/ConnectionStatus", () => ({
  default: ({ isConnected }) => (
    <span data-testid="connection-status">{isConnected ? "online" : "offline"}</span>
  ),
}));

import DashboardLayout, { LayoutRoute } from "../Layout/TenantLayout";

const setViewport = (width) => {
  window.innerWidth = width;
};

const setOnline = (value) => {
  Object.defineProperty(window.navigator, "onLine", { value, configurable: true });
};

const renderLayout = ({ path = "/dashboard", children = <p>Page body</p> } = {}) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <DashboardLayout>{children}</DashboardLayout>
    </MemoryRouter>
  );

const navLinks = () =>
  Array.from(document.body.querySelectorAll(".nav-list > .nav-item")).map(
    (li) => li.textContent
  );

const openProfile = () => fireEvent.click(document.body.querySelector(".user-profile"));

beforeEach(() => {
  vi.clearAllMocks();
  h.auth = {
    user: { fullName: "Ada Lovelace", role: { name: "Clinician" } },
    userId: "staff-1",
    accessToken: "at",
    refreshToken: "rt",
  };
  h.allowedModules = null;
  h.allowedPermissions = null;
  h.isConnected = true;
  h.socketOpts = null;
  h.getNotifications.mockResolvedValue({ data: { data: [] } });
  setViewport(1200);
  setOnline(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the sidebar", () => {
  it("lists every section the user has access to", () => {
    renderLayout();
    expect(navLinks()).toHaveLength(11);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("drops a module the user has no access to", () => {
    h.allowedModules = ["DASHBOARD", "SETTINGS"];
    renderLayout();
    expect(navLinks()).toHaveLength(2);
    expect(screen.queryByText("Scheduler")).toBeNull();
  });

  it("drops a section whose every child page is denied", () => {
    h.allowedModules = ["SCHEDULER", "DASHBOARD"];
    h.allowedPermissions = [];
    renderLayout();
    expect(navLinks()).toEqual(["Dashboard"]);
  });

  it("keeps a section when a single child page is allowed", () => {
    h.allowedModules = ["SCHEDULER"];
    h.allowedPermissions = ["view_calendar"];
    renderLayout();
    fireEvent.click(screen.getByText("Scheduler"));
    expect(screen.getByText("Calendar")).toBeInTheDocument();
    expect(screen.queryByText("Appointments")).toBeNull();
  });

  it("expands and collapses a section", () => {
    renderLayout();
    const scheduler = screen.getByText("Scheduler").closest("button");
    expect(scheduler).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(scheduler);
    expect(scheduler).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Calendar")).toBeInTheDocument();

    fireEvent.click(scheduler);
    expect(scheduler).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Calendar")).toBeNull();
  });

  it("marks the section containing the current page active", () => {
    renderLayout({ path: "/scheduler/calendar" });
    expect(screen.getByText("Scheduler").closest("button")).toHaveClass("active");
    expect(screen.getByText("Dashboard").closest("a")).not.toHaveClass("active");
  });

  it("marks the exact child page active and leaves its sibling alone", () => {
    renderLayout({ path: "/scheduler/calendar" });
    fireEvent.click(screen.getByText("Scheduler"));
    expect(screen.getByText("Calendar").closest("a")).toHaveClass("active");
    expect(screen.getByText("Appointments").closest("a")).not.toHaveClass("active");
  });

  it("marks a flat page active on an exact match only", () => {
    renderLayout({ path: "/dashboard" });
    expect(screen.getByText("Dashboard").closest("a")).toHaveClass("active");
  });

  it("hides the labels and forgets what was expanded once collapsed", () => {
    // Only the narrow layout can collapse the sidebar -- on desktop it has no
    // toggle at all -- so this arm has to be driven from a mobile viewport.
    setViewport(500);
    renderLayout();
    fireEvent.click(screen.getByLabelText("Toggle sidebar menu"));
    fireEvent.click(screen.getByText("Scheduler"));
    expect(screen.getByText("Calendar")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Toggle sidebar menu"));
    expect(screen.queryByText("Calendar")).toBeNull();
    expect(screen.queryByText("Scheduler")).toBeNull();
    expect(document.body.querySelector(".sidebar")).toHaveClass("closed");

    fireEvent.click(screen.getByLabelText("Toggle sidebar menu"));
    expect(screen.getByText("Scheduler")).toBeInTheDocument();
    expect(screen.queryByText("Calendar")).toBeNull();
  });

  it("offers a skip link ahead of the navigation", () => {
    renderLayout();
    expect(screen.getByText("Skip to main content")).toHaveAttribute("href", "#main-content");
  });
});

describe("on a narrow viewport", () => {
  const renderMobile = (props) => {
    setViewport(500);
    return renderLayout(props);
  };

  it("starts with the sidebar shut and the menu button showing", () => {
    renderMobile();
    expect(document.body.querySelector(".sidebar")).toHaveClass("mobile", "closed");
    expect(screen.getByLabelText("Toggle sidebar menu")).toBeInTheDocument();
  });

  it("opens the sidebar over an overlay and closes from the cross", () => {
    renderMobile();
    fireEvent.click(screen.getByLabelText("Toggle sidebar menu"));
    expect(document.body.querySelector(".sidebar")).toHaveClass("open");
    expect(document.body.querySelector(".sidebar-overlay")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Close menu", { selector: "button" }));
    expect(document.body.querySelector(".sidebar")).toHaveClass("closed");
  });

  it("closes from the overlay, by click and by Enter", () => {
    renderMobile();
    fireEvent.click(screen.getByLabelText("Toggle sidebar menu"));
    fireEvent.click(document.body.querySelector(".sidebar-overlay"));
    expect(document.body.querySelector(".sidebar")).toHaveClass("closed");

    fireEvent.click(screen.getByLabelText("Toggle sidebar menu"));
    fireEvent.keyDown(document.body.querySelector(".sidebar-overlay"), { key: "Escape" });
    expect(document.body.querySelector(".sidebar")).toHaveClass("open");

    fireEvent.keyDown(document.body.querySelector(".sidebar-overlay"), { key: "Enter" });
    expect(document.body.querySelector(".sidebar")).toHaveClass("closed");
  });

  it("closes the sidebar when a flat page is picked", () => {
    renderMobile();
    fireEvent.click(screen.getByLabelText("Toggle sidebar menu"));
    fireEvent.click(screen.getByText("Dashboard"));
    expect(document.body.querySelector(".sidebar")).toHaveClass("closed");
  });

  it("closes the sidebar when a child page is picked", () => {
    renderMobile();
    fireEvent.click(screen.getByLabelText("Toggle sidebar menu"));
    fireEvent.click(screen.getByText("Scheduler"));
    fireEvent.click(screen.getByText("Calendar"));
    expect(document.body.querySelector(".sidebar")).toHaveClass("closed");
  });

  it("keeps the sidebar open when the panel itself is clicked", () => {
    renderMobile();
    fireEvent.click(screen.getByLabelText("Toggle sidebar menu"));
    fireEvent.click(document.body.querySelector(".sidebar"));
    expect(document.body.querySelector(".sidebar")).toHaveClass("open");
  });

  it("hides the name and role beside the avatar", () => {
    renderMobile();
    expect(document.body.querySelector(".user-info")).toBeNull();
    expect(document.body.querySelector(".dropdown-arrow")).toBeNull();
  });

  it("reopens the sidebar when the window grows back to desktop", () => {
    renderMobile();
    expect(document.body.querySelector(".sidebar")).toHaveClass("closed");

    act(() => {
      setViewport(1400);
      window.dispatchEvent(new Event("resize"));
    });
    expect(document.body.querySelector(".sidebar")).toHaveClass("open");
    expect(screen.queryByLabelText("Toggle sidebar menu")).toBeNull();
  });

  it("shuts the sidebar when the window shrinks to mobile", () => {
    renderLayout();
    expect(document.body.querySelector(".sidebar")).toHaveClass("open");

    act(() => {
      setViewport(500);
      window.dispatchEvent(new Event("resize"));
    });
    expect(document.body.querySelector(".sidebar")).toHaveClass("closed", "mobile");
  });
});

describe("the connectivity banner", () => {
  it("stays out of the way while the connection is fine", () => {
    renderLayout();
    expect(document.body.querySelector(".network-status-banner")).toBeNull();
  });

  it("warns straight away when the browser starts offline", () => {
    setOnline(false);
    renderLayout();
    expect(
      screen.getByText("You are offline — check your connection")
    ).toBeInTheDocument();
    expect(document.body.querySelector(".network-status-banner")).toHaveClass("offline");
  });

  it("acknowledges coming back and then clears itself", () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      setOnline(false);
      renderLayout();
      act(() => {
        setOnline(true);
        window.dispatchEvent(new Event("online"));
      });
      expect(screen.getByText("Back online")).toBeInTheDocument();
      expect(document.body.querySelector(".network-status-banner")).toHaveClass("online");

      act(() => vi.advanceTimersByTime(3100));
      expect(document.body.querySelector(".network-status-banner")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("replaces the back-online notice immediately if the link drops again", () => {
    renderLayout();
    act(() => window.dispatchEvent(new Event("online")));
    expect(screen.getByText("Back online")).toBeInTheDocument();

    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByText("You are offline — check your connection")).toBeInTheDocument();
  });
});

describe("the notification bell", () => {
  it("seeds itself with the unread notifications already on the server", async () => {
    h.getNotifications.mockResolvedValue({
      data: { data: [{ id: "a" }, { id: "b", isRead: true }, { notification: { id: "c" } }] },
    });
    renderLayout();
    expect(await screen.findByText("2")).toBeInTheDocument();
  });

  it.each([
    ["nested under data.data", (l) => ({ data: { data: l } })],
    ["directly under data", (l) => ({ data: l })],
    ["as the bare response", (l) => l],
  ])("reads a count from a list held %s", async (_shape, wrap) => {
    h.getNotifications.mockResolvedValue(wrap([{ id: "a" }]));
    renderLayout();
    expect(await screen.findByText("1")).toBeInTheDocument();
  });

  it("shows no badge for a malformed payload", async () => {
    h.getNotifications.mockResolvedValue({ data: { data: { nope: true } } });
    renderLayout();
    await waitFor(() => expect(h.getNotifications).toHaveBeenCalled());
    expect(document.body.querySelector(".notification-badge")).toBeNull();
  });

  it("shows no badge when the fetch fails", async () => {
    h.getNotifications.mockRejectedValue(new Error("down"));
    renderLayout();
    await waitFor(() => expect(h.getNotifications).toHaveBeenCalled());
    expect(document.body.querySelector(".notification-badge")).toBeNull();
  });

  it("asks for nothing when nobody is signed in", () => {
    h.auth = { user: null, userId: undefined, accessToken: undefined };
    renderLayout();
    expect(h.getNotifications).not.toHaveBeenCalled();
  });

  it("caps a very large count", async () => {
    h.getNotifications.mockResolvedValue({
      data: { data: Array.from({ length: 120 }, (_, i) => ({ id: `n${i}` })) },
    });
    renderLayout();
    expect(await screen.findByText("99+")).toBeInTheDocument();
  });

  it("counts a live notification and clears the badge when opened", async () => {
    renderLayout();
    await waitFor(() => expect(h.socketOpts).not.toBeNull());

    act(() => h.socketOpts.onNotification());
    expect(screen.getByText("1")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Notifications"));
    expect(document.body.querySelector(".notification-badge")).toBeNull();
    expect(h.navigate).toHaveBeenCalledWith("/notifications");
  });
});

describe("the message button", () => {
  it("counts live messages, caps the badge and clears it on open", async () => {
    renderLayout();
    await waitFor(() => expect(h.socketOpts).not.toBeNull());

    act(() => {
      for (let i = 0; i < 101; i += 1) h.socketOpts.onMessage();
    });
    expect(screen.getByText("99+")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Messages"));
    expect(screen.getByTestId("message-modal")).toBeInTheDocument();
    expect(document.body.querySelector(".notification-badge")).toBeNull();
  });

  it("closes the message modal again", () => {
    renderLayout();
    fireEvent.click(screen.getByLabelText("Messages"));
    fireEvent.click(screen.getByText("close-messages"));
    expect(screen.queryByTestId("message-modal")).toBeNull();
  });
});

describe("the profile area", () => {
  it.each([
    ["a full name", { fullName: "Ada Lovelace" }, "Ada Lovelace", "AL"],
    ["a first name only", { firstName: "Ada" }, "Ada", "A"],
    ["an email when there is no name", { email: "ada@example.com" }, "ada@example.com", "A"],
    ["a placeholder when there is nothing", {}, "User", "U"],
  ])("shows %s", (_case, user, expectedName, expectedInitials) => {
    h.auth = { ...h.auth, user: { ...user, role: "Admin" } };
    renderLayout();
    expect(screen.getByText(expectedName)).toBeInTheDocument();
    expect(document.body.querySelector(".user-avatar").textContent).toContain(expectedInitials);
  });

  it("falls back to a placeholder when the name is not even a string", () => {
    h.auth = { ...h.auth, user: { fullName: { first: "Ada" } } };
    renderLayout();
    expect(screen.getByText("User")).toBeInTheDocument();
  });

  it("reads a role given as an object and one given as a plain string", () => {
    renderLayout();
    expect(screen.getByText("Clinician")).toBeInTheDocument();

    h.auth = { ...h.auth, user: { fullName: "Ada Lovelace", role: "Supervisor" } };
    renderLayout();
    expect(screen.getByText("Supervisor")).toBeInTheDocument();
  });

  it("labels a user with no role as Staff", () => {
    h.auth = { ...h.auth, user: { fullName: "Ada Lovelace" } };
    renderLayout();
    expect(screen.getByText("Staff")).toBeInTheDocument();
  });

  it("shows the socket's presence badge", () => {
    h.isConnected = false;
    renderLayout();
    expect(screen.getByTestId("connection-status")).toHaveTextContent("offline");
  });

  it("opens and closes the profile menu", () => {
    renderLayout();
    expect(document.body.querySelector(".profile-dropdown")).toBeNull();

    openProfile();
    expect(document.body.querySelector(".profile-dropdown")).toBeInTheDocument();

    openProfile();
    expect(document.body.querySelector(".profile-dropdown")).toBeNull();
  });

  it("closes the menu on a mousedown elsewhere but not inside it", () => {
    renderLayout();
    openProfile();
    fireEvent.mouseDown(document.body.querySelector(".profile-dropdown"));
    expect(document.body.querySelector(".profile-dropdown")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(document.body.querySelector(".profile-dropdown")).toBeNull();
  });

  it("goes to the notifications page from the menu", () => {
    renderLayout();
    openProfile();
    fireEvent.click(screen.getByText("Notifications"));
    expect(h.navigate).toHaveBeenCalledWith("/notifications");
    expect(document.body.querySelector(".profile-dropdown")).toBeNull();
  });

  it("goes to settings from the menu", () => {
    renderLayout();
    openProfile();
    fireEvent.click(screen.getAllByText("Settings").at(-1));
    expect(h.navigate).toHaveBeenCalledWith("/settings");
  });

  it("tears down the session on log out", () => {
    renderLayout();
    openProfile();
    fireEvent.click(screen.getByText("Log out"));

    expect(h.disconnectSocket).toHaveBeenCalled();
    expect(h.dispatch).toHaveBeenCalledWith({ type: "authentication/logout" });
    expect(h.purge).toHaveBeenCalled();
    expect(h.navigate).toHaveBeenCalledWith("/");
    expect(document.body.querySelector(".profile-dropdown")).toBeNull();
  });
});

describe("the page body", () => {
  it("renders whatever the route put inside it", () => {
    renderLayout({ children: <p>Page body</p> });
    expect(screen.getByText("Page body")).toBeInTheDocument();
    expect(document.body.querySelector("#main-content")).toBeInTheDocument();
  });

  it("renders the routed outlet through LayoutRoute", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<LayoutRoute />}>
            <Route path="/dashboard" element={<p>Routed page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("Routed page")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
});
