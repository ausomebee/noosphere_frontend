import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import NotificationSettings from "../Pages/Settings/SettingsSubs/NotificationSettings";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The per-user notification preference panel: six hard-coded collapsible
 * categories, each with an "enable all" master checkbox that is derived from
 * its children rather than stored, and a permission-gated footer that saves the
 * whole map in one call.
 *
 * The categories the panel renders come from a constant inside the module, but
 * the checked state comes from the server, so the two can disagree. A fetch
 * that returns only some of the categories is the only way to reach the
 * `settings[cat.key] ?? buildDefaultState()[cat.key]` fallback, and a returned
 * category whose `items` array is empty is the only way to make the "every item
 * is on" master derivation short-circuit on the length test instead of on
 * `every`. Both are exercised below.
 *
 * Nothing here has an accessible association between a checkbox and its label
 * (the labels carry no `htmlFor`), so the checkboxes are addressed by position
 * within their section: index 0 is always "enable all", and the rest follow the
 * category's own item order.
 */

const api = vi.hoisted(() => ({
  getNotificationSettings: vi.fn(),
  saveNotificationSettings: vi.fn(),
}));
vi.mock("../api/notificationApi", () => ({ default: api }));

const toast = vi.hoisted(() => ({ showToast: vi.fn(), showApiError: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: (...a) => toast.showApiError(...a),
}));

const makeStore = (user) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user:
          user === null
            ? null
            : {
                id: "user-1",
                accessToken: "at",
                refreshToken: "rt",
                role: { roleModuleAccesses: [] },
                ...user,
              },
      },
    },
  });

const renderPanel = (user) =>
  render(
    <Provider store={makeStore(user)}>
      <NotificationSettings />
    </Provider>
  );

// The role editor grants nothing but the one key the footer looks for, so a
// role with a different permission proves the footer really is gated.
const withPermissions = (permissions) => ({
  role: { roleModuleAccesses: [{ module: "SETTINGS", permissions }] },
});

const CALENDAR = "CALENDAR & APPOINTMENTS";
const HELP = "HELP & SUPPORT";

const header = (label) => screen.getByRole("button", { name: label });
const section = (label) => header(label).closest(".notif-settings-section");
const boxes = (label) =>
  Array.from(section(label).querySelectorAll("input[type='checkbox']"));
const expand = (label) => fireEvent.click(header(label));

const saveButton = () => screen.getByRole("button", { name: "Save Changes" });
const resetButton = () => screen.getByRole("button", { name: "Reset to Default" });

// The shape the endpoint returns: the same category/item keys the module's own
// constant uses, so the transform lands on the categories that get rendered.
const calendarCategory = (over = {}) => ({
  key: "CALENDAR_APPOINTMENTS",
  items: [
    { key: "upcoming_appointments", enabled: true },
    { key: "canceled_appointments", enabled: true },
    { key: "appointment_reschedule_requests", enabled: true },
    { key: "completed_appointments", enabled: true },
    { key: "approved_reschedule_requests", enabled: true },
    { key: "appointment_start_alerts", enabled: true },
  ],
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  // Deliberately not `[]`: an empty array is an array, so the transform runs
  // and replaces the whole settings map with `{}`. Render survives that via the
  // per-category fallback, but every toggle handler then reads `prev[catKey]`
  // off the empty map and throws. `null` takes the "not a list" early return
  // and leaves the built-in defaults in place, which is what the panel is
  // meant to show for a user who has never saved.
  api.getNotificationSettings.mockResolvedValue(null);
  api.saveNotificationSettings.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the panel shell", () => {
  it("lists every category collapsed", async () => {
    renderPanel();
    await waitFor(() => expect(api.getNotificationSettings).toHaveBeenCalled());
    expect(screen.getByText("Choose the notifications you wish to receive.")).toBeInTheDocument();
    expect(document.body.querySelectorAll(".notif-settings-section")).toHaveLength(6);
    expect(document.body.querySelector(".notif-settings-section-body")).toBeNull();
  });

  it("opens and closes a category from its header", async () => {
    renderPanel();
    await waitFor(() => expect(api.getNotificationSettings).toHaveBeenCalled());
    expand(CALENDAR);
    // Six items plus the enable-all master.
    expect(boxes(CALENDAR)).toHaveLength(7);
    expand(CALENDAR);
    expect(boxes(CALENDAR)).toHaveLength(0);
  });

  it("leaves other categories closed when one is opened", async () => {
    renderPanel();
    await waitFor(() => expect(api.getNotificationSettings).toHaveBeenCalled());
    expand(CALENDAR);
    expect(boxes(HELP)).toHaveLength(0);
    expand(HELP);
    expect(boxes(CALENDAR)).toHaveLength(7);
    expect(boxes(HELP)).toHaveLength(4);
  });
});

describe("loading the stored preferences", () => {
  it("asks the endpoint for the signed-in user", async () => {
    renderPanel();
    await waitFor(() =>
      expect(api.getNotificationSettings).toHaveBeenCalledWith({
        userId: "user-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
  });

  it("fetches nothing without a user id", async () => {
    renderPanel({ id: undefined });
    await waitFor(() => expect(header(CALENDAR)).toBeInTheDocument());
    expect(api.getNotificationSettings).not.toHaveBeenCalled();
  });

  it("fetches nothing without an access token", async () => {
    renderPanel({ accessToken: undefined });
    await waitFor(() => expect(header(CALENDAR)).toBeInTheDocument());
    expect(api.getNotificationSettings).not.toHaveBeenCalled();
  });

  it("ticks the boxes the server says are on", async () => {
    api.getNotificationSettings.mockResolvedValue([
      calendarCategory({
        items: [
          { key: "upcoming_appointments", enabled: true },
          { key: "canceled_appointments", enabled: false },
        ],
      }),
    ]);
    renderPanel();
    await waitFor(() => expect(api.getNotificationSettings).toHaveBeenCalled());
    expand(CALENDAR);
    await waitFor(() => expect(boxes(CALENDAR)[1]).toBeChecked());
    expect(boxes(CALENDAR)[2]).not.toBeChecked();
  });

  it("treats an item with no stored flag as off", async () => {
    api.getNotificationSettings.mockResolvedValue([
      calendarCategory({ items: [{ key: "upcoming_appointments" }] }),
    ]);
    renderPanel();
    await waitFor(() => expect(api.getNotificationSettings).toHaveBeenCalled());
    expand(CALENDAR);
    await waitFor(() => expect(boxes(CALENDAR)[1]).not.toBeChecked());
  });

  it("derives the master box from a category whose items are all on", async () => {
    api.getNotificationSettings.mockResolvedValue([calendarCategory()]);
    renderPanel();
    await waitFor(() => expect(api.getNotificationSettings).toHaveBeenCalled());
    expand(CALENDAR);
    await waitFor(() => expect(boxes(CALENDAR)[0]).toBeChecked());
  });

  // An empty item list would make `every` vacuously true, so the derivation
  // guards on the length first; this is the only way to reach that arm.
  it("leaves the master box off for a category the server sent empty", async () => {
    api.getNotificationSettings.mockResolvedValue([
      calendarCategory({ items: [] }),
    ]);
    renderPanel();
    await waitFor(() => expect(api.getNotificationSettings).toHaveBeenCalled());
    expand(CALENDAR);
    expect(boxes(CALENDAR)[0]).not.toBeChecked();
  });

  // The rendered categories come from a module constant, so any category the
  // response omits has to fall back to the blank defaults rather than crash.
  it("falls back to blank defaults for a category the server never mentions", async () => {
    api.getNotificationSettings.mockResolvedValue([calendarCategory()]);
    renderPanel();
    await waitFor(() => expect(api.getNotificationSettings).toHaveBeenCalled());
    expand(HELP);
    expect(boxes(HELP)).toHaveLength(4);
    expect(boxes(HELP).every((b) => !b.checked)).toBe(true);
  });

  it("keeps the blank defaults when the response is not a list", async () => {
    api.getNotificationSettings.mockResolvedValue({ settings: "nope" });
    renderPanel();
    await waitFor(() => expect(api.getNotificationSettings).toHaveBeenCalled());
    expand(CALENDAR);
    expect(boxes(CALENDAR).every((b) => !b.checked)).toBe(true);
  });

  it("keeps the blank defaults when the fetch fails", async () => {
    api.getNotificationSettings.mockRejectedValue(new Error("500"));
    renderPanel();
    await waitFor(() => expect(api.getNotificationSettings).toHaveBeenCalled());
    expand(CALENDAR);
    expect(boxes(CALENDAR).every((b) => !b.checked)).toBe(true);
  });
});

describe("toggling", () => {
  it("switches a whole category on and off from the master box", async () => {
    renderPanel();
    await waitFor(() => expect(api.getNotificationSettings).toHaveBeenCalled());
    expand(CALENDAR);
    fireEvent.click(boxes(CALENDAR)[0]);
    expect(boxes(CALENDAR).every((b) => b.checked)).toBe(true);
    fireEvent.click(boxes(CALENDAR)[0]);
    expect(boxes(CALENDAR).every((b) => !b.checked)).toBe(true);
  });

  it("switches a single item without touching the master box", async () => {
    renderPanel();
    await waitFor(() => expect(api.getNotificationSettings).toHaveBeenCalled());
    expand(CALENDAR);
    fireEvent.click(boxes(CALENDAR)[1]);
    expect(boxes(CALENDAR)[1]).toBeChecked();
    expect(boxes(CALENDAR)[0]).not.toBeChecked();
  });

  it("ticks the master box once the last item is switched on", async () => {
    renderPanel();
    await waitFor(() => expect(api.getNotificationSettings).toHaveBeenCalled());
    expand(HELP);
    boxes(HELP)
      .slice(1)
      .forEach((box) => fireEvent.click(box));
    expect(boxes(HELP)[0]).toBeChecked();
  });

  it("unticks the master box when one item is switched back off", async () => {
    renderPanel();
    await waitFor(() => expect(api.getNotificationSettings).toHaveBeenCalled());
    expand(HELP);
    fireEvent.click(boxes(HELP)[0]);
    fireEvent.click(boxes(HELP)[1]);
    expect(boxes(HELP)[0]).not.toBeChecked();
    expect(boxes(HELP)[1]).not.toBeChecked();
  });
});

describe("the footer", () => {
  it("is hidden from a role without the edit permission", async () => {
    renderPanel(withPermissions(["view_notification_settings"]));
    await waitFor(() => expect(api.getNotificationSettings).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Save Changes" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reset to Default" })).toBeNull();
  });

  it("is shown to a role that carries the edit permission", async () => {
    renderPanel(withPermissions(["edit_notification_settings"]));
    await waitFor(() => expect(api.getNotificationSettings).toHaveBeenCalled());
    expect(saveButton()).toBeInTheDocument();
  });

  it("sends the whole preference map and re-reads it", async () => {
    renderPanel();
    await waitFor(() => expect(api.getNotificationSettings).toHaveBeenCalled());
    expand(HELP);
    fireEvent.click(boxes(HELP)[1]);
    await act(async () => {
      fireEvent.click(saveButton());
    });
    await waitFor(() => expect(api.saveNotificationSettings).toHaveBeenCalled());
    const sent = api.saveNotificationSettings.mock.calls[0][0];
    expect(sent).toMatchObject({ userId: "user-1", accessToken: "at", refreshToken: "rt" });
    expect(sent.settings.HELP_SUPPORT).toMatchObject({
      enabled: false,
      ticket_submission_alert: true,
      ticket_status_change_alerts: false,
    });
    expect(toast.showToast).toHaveBeenCalledWith("Notification settings saved", "success");
    // The panel re-reads so it shows whatever the server actually stored.
    expect(api.getNotificationSettings).toHaveBeenCalledTimes(2);
  });

  it("reports a failed save and does not re-read", async () => {
    const err = new Error("409");
    api.saveNotificationSettings.mockRejectedValue(err);
    renderPanel();
    await waitFor(() => expect(api.getNotificationSettings).toHaveBeenCalled());
    await act(async () => {
      fireEvent.click(saveButton());
    });
    await waitFor(() =>
      expect(toast.showApiError).toHaveBeenCalledWith(err, "SAVE_SETTINGS")
    );
    expect(toast.showToast).not.toHaveBeenCalled();
    expect(api.getNotificationSettings).toHaveBeenCalledTimes(1);
  });

  it("blocks a second click while the save is in flight", async () => {
    let release;
    api.saveNotificationSettings.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    renderPanel();
    await waitFor(() => expect(api.getNotificationSettings).toHaveBeenCalled());
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Loading" })).toBeDisabled()
    );
    await act(async () => {
      release({});
    });
    await waitFor(() => expect(saveButton()).toBeEnabled());
  });

  it("clears every tick back to the defaults", async () => {
    api.getNotificationSettings.mockResolvedValue([calendarCategory()]);
    renderPanel();
    await waitFor(() => expect(api.getNotificationSettings).toHaveBeenCalled());
    expand(CALENDAR);
    await waitFor(() => expect(boxes(CALENDAR)[0]).toBeChecked());
    fireEvent.click(resetButton());
    expect(boxes(CALENDAR).every((b) => !b.checked)).toBe(true);
  });
});
