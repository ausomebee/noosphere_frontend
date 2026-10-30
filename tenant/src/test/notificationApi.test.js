import { describe, it, expect, vi, beforeEach } from "vitest";

const verbs = { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() };
vi.mock("../Helper/AxiosInterceptor", () => ({ default: () => verbs }));

import api from "../api/notificationApi";

/**
 * Notification fetching and the per-user notification settings.
 *
 * Two things here are worth pinning down. The bell is used by staff far more
 * than anyone else, so `getNotifications` defaults `userType` to TENANT_STAFF
 * and bakes both values into the path. And the settings screen holds its state
 * as a nested object keyed by category, each carrying an `enabled` roll-up for
 * the header toggle; `saveNotificationSettings` has to turn that back into the
 * array the API wants, dropping the roll-up (which the backend derives itself)
 * and skipping any numeric key, which would mean the object had degraded into
 * something array-like.
 */

const tokens = { accessToken: "at", refreshToken: "rt" };

const bodyOf = () => verbs.put.mock.calls[0][1];

beforeEach(() => {
  Object.values(verbs).forEach((v) => v.mockReset());
});

describe("loading notifications", () => {
  it("asks for the signed-in staff member by default", async () => {
    verbs.get.mockResolvedValue({ data: [{ id: "n1" }] });
    await expect(api.getNotifications({ userId: "u1", ...tokens })).resolves.toEqual([
      { id: "n1" },
    ]);
    expect(verbs.get.mock.calls[0][0]).toContain("/notifications/user/u1/TENANT_STAFF");
  });

  it("honours an explicit user type", async () => {
    verbs.get.mockResolvedValue({ data: [] });
    await api.getNotifications({ userId: "u1", userType: "CLIENT", ...tokens });
    expect(verbs.get.mock.calls[0][0]).toContain("/notifications/user/u1/CLIENT");
  });

  it("surfaces the backend message", async () => {
    verbs.get.mockRejectedValue({ response: { data: { message: "bell is down" } } });
    await expect(api.getNotifications({ userId: "u1", ...tokens })).rejects.toThrow(
      "bell is down",
    );
  });

  it("falls back to its own copy when the failure carries no message", async () => {
    verbs.get.mockRejectedValue(new Error(""));
    await expect(api.getNotifications({ userId: "u1", ...tokens })).rejects.toThrow(
      "Failed to load notifications",
    );
  });
});

describe("marking one read", () => {
  it("patches the notification and returns the body", async () => {
    verbs.patch.mockResolvedValue({ data: { ok: true } });
    await expect(api.markNotificationRead({ id: "n1", ...tokens })).resolves.toEqual({
      ok: true,
    });
    expect(verbs.patch.mock.calls[0][0]).toContain("/notifications/read/n1");
  });

  it("surfaces the backend message", async () => {
    verbs.patch.mockRejectedValue({ response: { data: { message: "already read" } } });
    await expect(api.markNotificationRead({ id: "n1", ...tokens })).rejects.toThrow(
      "already read",
    );
  });

  it("falls back to its own copy when the failure carries no message", async () => {
    verbs.patch.mockRejectedValue({});
    await expect(api.markNotificationRead({ id: "n1", ...tokens })).rejects.toThrow(
      "Failed to mark notification as read",
    );
  });
});

describe("loading settings", () => {
  it("unwraps the envelope", async () => {
    verbs.get.mockResolvedValue({ data: { data: [{ key: "Appointments" }] } });
    await expect(api.getNotificationSettings({ userId: "u1", ...tokens })).resolves.toEqual([
      { key: "Appointments" },
    ]);
  });

  it("returns null for a user who has never saved any", async () => {
    verbs.get.mockResolvedValue({ data: { message: "ok" } });
    await expect(api.getNotificationSettings({ userId: "u1", ...tokens })).resolves.toBeNull();
  });

  it("returns null when the response has no body at all", async () => {
    verbs.get.mockResolvedValue({});
    await expect(api.getNotificationSettings({ userId: "u1", ...tokens })).resolves.toBeNull();
  });

  it("surfaces the backend message", async () => {
    verbs.get.mockRejectedValue({ response: { data: { message: "settings unavailable" } } });
    await expect(api.getNotificationSettings({ userId: "u1", ...tokens })).rejects.toThrow(
      "settings unavailable",
    );
  });

  it("falls back to its own copy when the failure carries no message", async () => {
    verbs.get.mockRejectedValue(new Error(""));
    await expect(api.getNotificationSettings({ userId: "u1", ...tokens })).rejects.toThrow(
      "Failed to load notification settings",
    );
  });
});

describe("saving settings", () => {
  // One category, its header roll-up, and two items in opposite states.
  const settings = {
    Appointments: { enabled: true, UPCOMING_APPOINTMENT: true, CANCELLED_APPOINTMENT: false },
  };

  it("flattens each category into a key and its items", async () => {
    verbs.put.mockResolvedValue({ data: { ok: true } });
    await api.saveNotificationSettings({ userId: "u1", settings, ...tokens });
    expect(bodyOf()).toEqual({
      userId: "u1",
      settings: [
        {
          key: "Appointments",
          items: [
            { key: "UPCOMING_APPOINTMENT", enabled: true },
            { key: "CANCELLED_APPOINTMENT", enabled: false },
          ],
        },
      ],
    });
  });

  it("does not send the header roll-up, which the backend derives itself", async () => {
    verbs.put.mockResolvedValue({ data: {} });
    await api.saveNotificationSettings({ userId: "u1", settings, ...tokens });
    expect(bodyOf().settings[0].items.map((i) => i.key)).not.toContain("enabled");
  });

  it("skips a numeric key, which would mean the object had gone array-like", async () => {
    verbs.put.mockResolvedValue({ data: {} });
    await api.saveNotificationSettings({
      userId: "u1",
      settings: { ...settings, 0: { enabled: true, STRAY: true } },
      ...tokens,
    });
    expect(bodyOf().settings.map((c) => c.key)).toEqual(["Appointments"]);
  });

  it("sends an empty list when nothing is configured", async () => {
    verbs.put.mockResolvedValue({ data: {} });
    await api.saveNotificationSettings({ userId: "u1", settings: {}, ...tokens });
    expect(bodyOf().settings).toEqual([]);
  });

  it("keeps a category whose only key is the roll-up, with no items", async () => {
    verbs.put.mockResolvedValue({ data: {} });
    await api.saveNotificationSettings({
      userId: "u1",
      settings: { Billing: { enabled: false } },
      ...tokens,
    });
    expect(bodyOf().settings).toEqual([{ key: "Billing", items: [] }]);
  });

  it("surfaces the backend message", async () => {
    verbs.put.mockRejectedValue({ response: { data: { message: "rejected" } } });
    await expect(
      api.saveNotificationSettings({ userId: "u1", settings, ...tokens }),
    ).rejects.toThrow("rejected");
  });

  it("falls back to its own copy when the failure carries no message", async () => {
    verbs.put.mockRejectedValue({});
    await expect(
      api.saveNotificationSettings({ userId: "u1", settings, ...tokens }),
    ).rejects.toThrow("Failed to save notification settings");
  });
});
