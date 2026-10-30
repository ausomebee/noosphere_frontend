import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const getSettings = vi.fn();
const createSettings = vi.fn();
const updateSettings = vi.fn();
vi.mock("../api/profileAndSettingsApi", () => ({
  default: {
    GetNotificationSettings: (...a) => getSettings(...a),
    CreateNotificationSettings: (...a) => createSettings(...a),
    UpdateNotificationSettings: (...a) => updateSettings(...a),
  },
}));

const showToast = vi.fn();
vi.mock("../Helper/ShowToast", () => ({ showToast: (...a) => showToast(...a) }));

import { useNotificationSettings } from "../hooks/useNotificationSettings";

/**
 * The client's notification preference toggles.
 *
 * Each toggle updates the UI first and reconciles afterwards, so the two paths
 * that matter are: a settings record already exists (update it) or it does not
 * (create one and keep the id). A failed call has to put the switch back where
 * the user found it rather than leaving it showing a preference that was never
 * saved.
 *
 * Note for anyone extending this: on a 404 the hook creates a default record
 * and then re-reads it. If that read 404s again the pair recurse without a
 * bound, so a mock that always rejects will hang the worker rather than fail
 * the test. The 404 cases below reject exactly once.
 */

const setup = (id = "tc1", token = "at") =>
  renderHook(() => useNotificationSettings(id, token, "rt"));

const savedSettings = (over = {}) => ({
  data: { data: { id: "ns1", appointmentScheduled: true, ...over } },
});

beforeEach(() => {
  vi.clearAllMocks();
  getSettings.mockResolvedValue(savedSettings());
  createSettings.mockResolvedValue({ data: { data: { id: "new-1" } } });
  updateSettings.mockResolvedValue({});
});

describe("loading", () => {
  it("fetches the saved preferences on mount", async () => {
    setup();
    await waitFor(() => expect(getSettings).toHaveBeenCalled());
    expect(getSettings).toHaveBeenCalledWith(
      expect.objectContaining({ tenantClientId: "tc1", accessToken: "at", refreshToken: "rt" })
    );
  });

  it("applies what came back", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.notifications.appointmentScheduled).toBe(true));
  });

  it("defaults an absent preference to off", async () => {
    const { result } = setup();
    await waitFor(() => expect(getSettings).toHaveBeenCalled());
    expect(result.current.notifications.signatureRequested).toBe(false);
  });

  it("does not fetch without a client id or a token", async () => {
    setup(null, "at");
    setup("tc1", null);
    await new Promise((r) => setTimeout(r, 0));
    expect(getSettings).not.toHaveBeenCalled();
  });

  it("copes with a response carrying no settings", async () => {
    getSettings.mockResolvedValue({ data: {} });
    const { result } = setup();
    await waitFor(() => expect(getSettings).toHaveBeenCalled());
    expect(result.current.notifications.appointmentScheduled).toBe(false);
  });

  it("logs rather than toasting when the fetch fails for an ordinary reason", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    getSettings.mockRejectedValue(new Error("offline"));
    setup();
    await waitFor(() => expect(err).toHaveBeenCalled());
    expect(createSettings).not.toHaveBeenCalled();
    err.mockRestore();
  });

  it.each([["404"], ["not found"]])(
    "creates defaults when the fetch says %s",
    async (message) => {
      // Reject once, then succeed. createDefaultNotificationSettings calls
      // loadNotificationSettings again on success, so a mock that always 404s
      // recurses without bound -- see the note in the suite header.
      getSettings
        .mockRejectedValueOnce(new Error(`Request failed: ${message}`))
        .mockResolvedValue(savedSettings());
      setup();
      await waitFor(() => expect(createSettings).toHaveBeenCalled());
    }
  );

  it("re-fetches when asked to reset", async () => {
    const { result } = setup();
    await waitFor(() => expect(getSettings).toHaveBeenCalledTimes(1));
    await act(async () => { result.current.resetToSaved(); });
    expect(getSettings).toHaveBeenCalledTimes(2);
  });
});

describe("toggling", () => {
  it("flips the switch straight away", async () => {
    const { result } = setup();
    await waitFor(() => expect(getSettings).toHaveBeenCalled());
    await act(async () => { await result.current.toggleNotification("formShared"); });
    expect(result.current.notifications.formShared).toBe(true);
  });

  it("updates the existing record when there is one", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.notifications.appointmentScheduled).toBe(true));
    await act(async () => { await result.current.toggleNotification("formShared"); });
    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ns1", formShared: true })
    );
    expect(createSettings).not.toHaveBeenCalled();
  });

  it("creates a record the first time, and remembers its id", async () => {
    getSettings.mockResolvedValue({ data: {} });
    const { result } = setup();
    await waitFor(() => expect(getSettings).toHaveBeenCalled());

    await act(async () => { await result.current.toggleNotification("formShared"); });
    expect(createSettings).toHaveBeenCalledWith(
      expect.objectContaining({ tenantClientId: "tc1", formShared: true })
    );

    // The id it just learned means the next toggle updates rather than creates.
    await act(async () => { await result.current.toggleNotification("appointmentStarted"); });
    expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({ id: "new-1" }));
  });

  it("copes with a create that returns no id", async () => {
    getSettings.mockResolvedValue({ data: {} });
    createSettings.mockResolvedValue({ data: {} });
    const { result } = setup();
    await waitFor(() => expect(getSettings).toHaveBeenCalled());
    await act(async () => { await result.current.toggleNotification("formShared"); });
    await act(async () => { await result.current.toggleNotification("appointmentStarted"); });
    expect(createSettings).toHaveBeenCalledTimes(2);
  });

  it("puts the switch back when the save fails", async () => {
    updateSettings.mockRejectedValue(new Error("server said no"));
    const { result } = setup();
    await waitFor(() => expect(result.current.notifications.appointmentScheduled).toBe(true));

    await act(async () => { await result.current.toggleNotification("formShared"); });
    expect(result.current.notifications.formShared).toBe(false);
    expect(showToast).toHaveBeenCalledWith("Failed to update notification settings", "error");
  });

  it("clears the per-key busy flag whether it succeeds or fails", async () => {
    const { result } = setup();
    await waitFor(() => expect(getSettings).toHaveBeenCalled());
    await act(async () => { await result.current.toggleNotification("formShared"); });
    expect(result.current.loadingKeys.has("formShared")).toBe(false);

    updateSettings.mockRejectedValue(new Error("nope"));
    await act(async () => { await result.current.toggleNotification("formShared"); });
    expect(result.current.loadingKeys.has("formShared")).toBe(false);
  });

  it("toggles a preference back off again", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.notifications.appointmentScheduled).toBe(true));
    await act(async () => { await result.current.toggleNotification("appointmentScheduled"); });
    expect(result.current.notifications.appointmentScheduled).toBe(false);
  });
});

describe("a record saved with a preference switched off", () => {
  it("reads a false preference as false rather than dropping it", async () => {
    // Every key is defended with `|| false`; the saved fixture has this one on,
    // so an explicitly-off record is the only way through the other arm.
    getSettings.mockResolvedValue(savedSettings({ appointmentScheduled: false }));
    const { result } = setup();
    await waitFor(() => expect(getSettings).toHaveBeenCalled());
    await waitFor(() =>
      expect(result.current.notifications.appointmentScheduled).toBe(false)
    );
  });
});
