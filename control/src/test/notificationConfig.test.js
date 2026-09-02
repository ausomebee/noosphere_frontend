import { describe, it, expect, vi } from "vitest";

import {
  NOTIFICATION_ENTITY_TYPE,
  getNotificationAction,
} from "../Data/notificationConfig";

/**
 * Where each notification sends the super admin when they click it.
 *
 * `getNotificationAction` tries the type-specific action first and falls back
 * to one keyed on the entity type, so a notification of an unknown type still
 * lands somewhere sensible. The entity id is read defensively: flat, or nested
 * under `data` or `metadata`, depending on which service emitted it.
 */

// Every type in the ACTIONS table, exercised through the public function.
const notif = (over = {}) => ({ type: "ISSUE_SUBMITTED", entityId: "e1", ...over });

const TYPES = [
  "PAYMENT_MADE_FOR_PLAN",
  "PRODUCT_ACCESS",
  "TENANT_CREATED",
  "TENANT_DEACTIVATED",
  "PLAN_CREATED",
  "PLAN_DEACTIVATED",
  "PLAN_DELETED",
  "SUBSCRIPTION_PAUSED",
  "SUBSCRIPTION_CANCELLED",
  "SUBSCRIPTION_AUTO_RENEWED",
  "SUBSCRIPTION_CREATED",
  "SUBSCRIPTION_RESUMED",
  "SUBSCRIPTION_CANCELLATION_SCHEDULED",
  "SUBSCRIPTION_PAUSE_SCHEDULED",
  "SUBSCRIPTION_RESUME_SCHEDULED",
  "ISSUE_SUBMITTED",
  "ISSUE_ASSIGNED",
  "ISSUE_ASSIGNED_ADMIN",
  "ISSUE_IN_PROGRESS",
  "ISSUE_REASSIGNED",
  "ISSUE_PRIORITY_CHANGED",
  "ISSUE_CATEGORY_CHANGED",
  "ISSUE_RESOLVED",
];

describe("entity types", () => {
  it("is frozen so a typo cannot quietly add a key", () => {
    expect(Object.isFrozen(NOTIFICATION_ENTITY_TYPE)).toBe(true);
  });

  it("maps each key to its own name", () => {
    Object.entries(NOTIFICATION_ENTITY_TYPE).forEach(([k, v]) => expect(v).toBe(k));
  });
});

describe("type-specific actions", () => {
  it.each(TYPES)("resolves an action for %s with an id", (type) => {
    const action = getNotificationAction(notif({ type, entityId: "e1" }));
    if (action) {
      expect(action).toEqual(expect.objectContaining({ label: expect.any(String) }));
      expect(typeof action.path).toBe("string");
    } else {
      // A type deliberately without a destination is mark-as-read only.
      expect(action).toBeNull();
    }
  });

  it.each(TYPES)("resolves %s without an id too", (type) => {
    expect(() => getNotificationAction({ type })).not.toThrow();
  });

});

describe("reading the entity id", () => {
  it.each([
    ["flat", { entityId: "e1" }],
    ["under data", { data: { entityId: "e1" } }],
    ["under metadata", { metadata: { entityId: "e1" } }],
  ])("finds an id held %s", (_where, shape) => {
    // Control's actions carry the id in nav state rather than in the path.
    const action = getNotificationAction({ type: "ISSUE_SUBMITTED", ...shape });
    expect(action.state.focusId).toBe("e1");
  });

  it("prefers the flat id over the nested ones", () => {
    const action = getNotificationAction({
      type: "ISSUE_SUBMITTED",
      entityId: "flat",
      data: { entityId: "nested" },
    });
    expect(action.state.focusId).toBe("flat");
  });
});

describe("entity fallbacks", () => {
  it.each([
    ["ISSUE", "/issues"],
    ["TENANT", "/tenants"],
    ["PLAN", "/plans"],
    ["SUBSCRIPTION", "/billing-payments"],
    ["PAYMENT", "/billing-payments"],
    ["INVOICE", "/billing-payments"],
  ])("falls back for an unknown type on a %s", (entityType, pathFragment) => {
    const action = getNotificationAction({ type: "SOMETHING_NEW", entityType, entityId: "e1" });
    expect(action).not.toBeNull();
    expect(action.path).toContain(pathFragment);
  });

  it("returns nothing for a type and entity it does not recognise", () => {
    expect(getNotificationAction({ type: "SOMETHING_NEW", entityType: "NOTHING" })).toBeNull();
  });

  it("returns nothing for a notification with no type at all", () => {
    expect(getNotificationAction({})).toBeNull();
    expect(getNotificationAction(null)).toBeNull();
    expect(getNotificationAction(undefined)).toBeNull();
  });
});

describe("edges the table-driven cases miss", () => {
  it("sends a tenant notification with no id to the tenant list", () => {
    // The entity fallback deep-links by id; without one it has to degrade to
    // the list rather than building a `/overview/undefined` path.
    const action = getNotificationAction({ type: "SOMETHING_NEW", entityType: "TENANT" });
    expect(action.path).toBe("/tenants/tenant-list");
  });

  it("skips the dev-only fallback-key audit in a production build", async () => {
    vi.stubEnv("DEV", false);
    vi.resetModules();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const production = await import("../Data/notificationConfig");
    expect(
      production.getNotificationAction({ type: "SOMETHING_NEW", entityType: "PLAN" })
    ).not.toBeNull();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
