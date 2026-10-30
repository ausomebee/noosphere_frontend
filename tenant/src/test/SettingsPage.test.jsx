import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The settings page itself: three permission-gated tabs over three panels. It
 * owns almost no behaviour of its own, so what is worth exercising is the
 * gating — which tabs a role can see, which one opens first, and the fact that
 * a role with none of the three permissions gets no page at all.
 *
 * The three panels are probes; each pulls in a large slice of the app on its
 * own and none of their behaviour belongs to this file. Permissions run for
 * real off a seeded auth slice: an empty `roleModuleAccesses` means org owner
 * and grants everything, so every restricted case here seeds an explicit
 * non-empty set.
 *
 * The active tab is persisted in sessionStorage under "tab:tenant:settings",
 * which is cleared before each test and seeded directly where the restore path
 * is what is under test.
 */

vi.mock("../Pages/Settings/SettingsSubs/GeneralSettings", () => ({
  default: () => <div data-testid="general-panel" />,
}));
vi.mock("../Pages/Settings/SettingsSubs/NotificationSettings", () => ({
  default: () => <div data-testid="notification-panel" />,
}));
vi.mock("../Pages/Settings/SettingsSubs/ClinicalReports", () => ({
  default: () => <div data-testid="clinical-panel" />,
}));

import Settings from "../Pages/Settings/settings";

const makeStore = (permissions) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user: {
          id: "u-1",
          tenantId: "t-1",
          accessToken: "at",
          refreshToken: "rt",
          // An empty roleModuleAccesses means org owner, i.e. every permission.
          role: permissions
            ? { roleModuleAccesses: [{ module: "SETTINGS", permissions }] }
            : { roleModuleAccesses: [] },
        },
      },
    },
  });

const renderPage = ({ permissions } = {}) =>
  render(
    <Provider store={makeStore(permissions)}>
      <Settings />
    </Provider>
  );

const tabs = () => Array.from(document.body.querySelectorAll(".tabs .tab"));
const tabLabels = () => tabs().map((t) => t.textContent);
const activeTabLabels = () =>
  tabs()
    .filter((t) => t.classList.contains("active"))
    .map((t) => t.textContent);
const tabNamed = (label) => tabs().find((t) => t.textContent === label);
const storedTab = () => sessionStorage.getItem("tab:tenant:settings");

const GENERAL = "General Settings";
const NOTIFICATIONS = "Notification Settings";
const CLINICAL = "Clinical Reports (Template Library)";

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe("the page for a full-access role", () => {
  it("offers all three tabs and opens on the first", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(tabLabels()).toEqual([GENERAL, NOTIFICATIONS, CLINICAL]);
    expect(activeTabLabels()).toEqual([GENERAL]);
    expect(screen.getByTestId("general-panel")).toBeInTheDocument();
  });

  it("swaps to the notification panel", () => {
    renderPage();
    fireEvent.click(tabNamed(NOTIFICATIONS));
    expect(activeTabLabels()).toEqual([NOTIFICATIONS]);
    expect(screen.getByTestId("notification-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("general-panel")).toBeNull();
  });

  it("swaps to the clinical reports panel", () => {
    renderPage();
    fireEvent.click(tabNamed(CLINICAL));
    expect(activeTabLabels()).toEqual([CLINICAL]);
    expect(screen.getByTestId("clinical-panel")).toBeInTheDocument();
  });

  it("swaps back to the general panel", () => {
    renderPage();
    fireEvent.click(tabNamed(CLINICAL));
    fireEvent.click(tabNamed(GENERAL));
    expect(screen.getByTestId("general-panel")).toBeInTheDocument();
  });
});

describe("permission gating", () => {
  // Each tab accepts either of two keys, an older module-level one and a
  // narrower view-only one; both arms are exercised across these cases.
  it("shows only the general tab for a general-settings-only role", () => {
    renderPage({ permissions: ["general_settings"] });
    expect(tabLabels()).toEqual([GENERAL]);
    expect(screen.getByTestId("general-panel")).toBeInTheDocument();
  });

  it("accepts the view-only key for the notification tab", () => {
    renderPage({ permissions: ["view_notification_settings"] });
    expect(tabLabels()).toEqual([NOTIFICATIONS]);
    expect(screen.getByTestId("notification-panel")).toBeInTheDocument();
  });

  it("accepts the view-only key for the clinical reports tab", () => {
    renderPage({ permissions: ["view_clinical_report_template_list"] });
    expect(tabLabels()).toEqual([CLINICAL]);
    expect(screen.getByTestId("clinical-panel")).toBeInTheDocument();
  });

  it("keeps the tabs in their declared order for a partial role", () => {
    renderPage({ permissions: ["clinical_reports_template_library", "general_settings"] });
    expect(tabLabels()).toEqual([GENERAL, CLINICAL]);
    expect(activeTabLabels()).toEqual([GENERAL]);
  });

  it("renders nothing at all for a role with none of the three", () => {
    const { container } = renderPage({ permissions: ["view_dashboard"] });
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("heading", { name: "Settings" })).toBeNull();
  });
});

describe("remembering the tab", () => {
  it("writes the chosen tab to session storage", () => {
    renderPage();
    fireEvent.click(tabNamed(CLINICAL));
    expect(storedTab()).toBe("clinicalReports");
  });

  it("reopens on the tab that was stored", () => {
    sessionStorage.setItem("tab:tenant:settings", "notificationSettings");
    renderPage();
    expect(activeTabLabels()).toEqual([NOTIFICATIONS]);
    expect(screen.getByTestId("notification-panel")).toBeInTheDocument();
  });

  // A stored tab the current role can no longer see -- a shared workstation, or
  // a role that was narrowed -- falls back to the first tab that is left.
  it("falls back to the first visible tab when the stored one is now hidden", () => {
    sessionStorage.setItem("tab:tenant:settings", "clinicalReports");
    renderPage({ permissions: ["notification_settings"] });
    expect(activeTabLabels()).toEqual([NOTIFICATIONS]);
    expect(screen.getByTestId("notification-panel")).toBeInTheDocument();
  });
});
