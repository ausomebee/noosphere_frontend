import { describe, it, expect, vi } from "vitest";

import {
  NOTIFICATION_ENTITY_TYPE,
  getNotificationAction,
} from "../Data/notificationConfig";

/**
 * Where each notification sends the user when they click it.
 *
 * `getNotificationAction` tries the type-specific action first and falls back
 * to one keyed on the entity type, so a notification of an unknown type still
 * lands somewhere sensible. The entity id is read defensively: flat, or nested
 * under `data` or `metadata`, depending on which service emitted it.
 */

const notif = (over = {}) => ({ type: "UPCOMING_APPOINTMENT", entityId: "a1", ...over });

// Every type in the ACTIONS table, exercised through the public function.
const TYPES = [
  "UPCOMING_APPOINTMENT",
  "APPOINTMENT_START_REMINDER",
  "APPOINTMENT_STARTED",
  "RESCHEDULED_APPOINTMENT",
  "NEW_RESCHEDULE_REQUEST",
  "CANCELLED_APPOINTMENT",
  "COMPLETED_APPOINTMENT",
  "CLIENT_PROFILE_CREATION",
  "DOCUMENT_REQUEST_CREATED",
  "DOCUMENT_REQUEST_COMPLETED",
  "DOCUMENT_REQUEST_NUDGE",
  "AUTHORIZATION_CREATION",
  "AUTHORIZATION_UTILIZATION_ZERO",
  "REPORT_APPROVAL_REQUEST_TO_SUPERVISOR",
  "REPORT_CHANGE_REQUESTED_BY_SUPERVISOR",
  "REPORT_APPROVED_BY_SUPERVISOR",
  "CLIENT_REPORT_SIGNED",
  "CLIENT_REPORT_CHANGE_REQUEST",
  "FORM_CREATED",
  "FORM_FILLED",
  "ORGANIZATION_LICENSE_EXPIRY_SOON",
  "ORGANIZATION_LICENSE_EXPIRED",
  "TIMESHEET_CREATED",
  "TIMESHEET_CHANGE_REQUESTED",
  "TIMESHEET_APPROVED",
  "TIMESHEET_REJECTED",
  "PAYER_AUTHORIZATION_EXPIRY_SOON",
  "UPCOMING_PAYROLL",
  "NEW_PAYROLL_RUN",
  "TICKET_SUBMITTED",
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

  it("sends an upcoming appointment to the scheduler", () => {
    const action = getNotificationAction(notif({ type: "UPCOMING_APPOINTMENT", entityId: "a1" }));
    expect(action.path).toContain("/scheduler");
  });

  it("forwards the slot a reschedule asked for", () => {
    const action = getNotificationAction({
      type: "NEW_RESCHEDULE_REQUEST",
      entityId: "a1",
      metadata: {
        proposedDate: "2026-02-01",
        proposedStartTime: "09:00",
        proposedEndTime: "10:00",
        reason: "Clash",
      },
    });
    expect(action.state).toEqual(
      expect.objectContaining({
        proposedSlot: expect.objectContaining({
          date: "2026-02-01",
          startTime: "09:00",
          endTime: "10:00",
          reason: "Clash",
        }),
      })
    );
  });

  it("carries no proposed slot when the notification has none", () => {
    const action = getNotificationAction({ type: "NEW_RESCHEDULE_REQUEST", entityId: "a1" });
    expect(action.state?.proposedSlot ?? null).toBeNull();
  });

  it("reads the proposed slot from `data` as well as `metadata`", () => {
    const action = getNotificationAction({
      type: "NEW_RESCHEDULE_REQUEST",
      entityId: "a1",
      data: { proposedDate: "2026-03-01" },
    });
    expect(action.state.proposedSlot.date).toBe("2026-03-01");
  });
});

describe("reading the entity id", () => {
  it.each([
    ["flat", { entityId: "e1" }],
    ["under data", { data: { entityId: "e1" } }],
    ["under metadata", { metadata: { entityId: "e1" } }],
  ])("finds an id held %s", (_where, shape) => {
    const action = getNotificationAction({ type: "TIMESHEET_CREATED", ...shape });
    expect(action.path).toContain("e1");
  });

  it("prefers the flat id over the nested ones", () => {
    const action = getNotificationAction({
      type: "TIMESHEET_CREATED",
      entityId: "flat",
      data: { entityId: "nested" },
    });
    expect(action.path).toContain("flat");
  });
});

describe("entity fallbacks", () => {
  it.each([
    ["APPOINTMENT", "/scheduler"],
    ["CLIENT", "/"],
    ["DOCUMENT_REQUEST", "/"],
    ["AUTHORIZATION", "/"],
    ["CLINICAL_REPORT", "/"],
    ["FORM", "/custom-forms"],
    ["LICENSE", "/organization"],
    ["TIMESHEET", "/billing"],
    ["PAYER", "/organization"],
    ["PAYROLL", "/payroll"],
    ["ISSUE", "/help"],
  ])("falls back for an unknown type on a %s", (entityType, pathFragment) => {
    const action = getNotificationAction({ type: "SOMETHING_NEW", entityType, entityId: "e1" });
    expect(action).not.toBeNull();
    expect(action.path).toContain(pathFragment);
  });

  it("sends a form fallback to the list when there is no id", () => {
    const action = getNotificationAction({ type: "SOMETHING_NEW", entityType: "FORM" });
    expect(action.path).toBe("/custom-forms/forms");
  });

  it("sends a timesheet fallback to the list when there is no id", () => {
    const action = getNotificationAction({ type: "SOMETHING_NEW", entityType: "TIMESHEET" });
    expect(action.path).toBe("/billing/timesheets");
  });

  it("sends an issue fallback to the list when there is no id", () => {
    const action = getNotificationAction({ type: "SOMETHING_NEW", entityType: "ISSUE" });
    expect(action.path).toBe("/help/support-requests");
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

describe("client-scoped deep links", () => {
  // Both ids are needed to address the client panel route; the fallbacks above
  // cover what happens when only one (or neither) is present.
  const withIds = (over = {}) => ({
    type: "AUTHORIZATION_CREATION",
    entityId: "auth-1",
    clientId: "cl-1",
    tenantClientId: "tc-1",
    ...over,
  });

  it("addresses the client panel when both client ids are present", () => {
    const action = getNotificationAction(withIds());
    expect(action).toEqual({
      label: "View authorization",
      path: "/client/client-single/cl-1/tc-1",
      state: { focusTab: "authorization", focusId: "auth-1" },
    });
  });

  it("reads the client ids from `data` and from `metadata` as well", () => {
    expect(
      getNotificationAction({
        type: "CLIENT_PROFILE_CREATION",
        data: { clientId: "cl-2", tenantClientId: "tc-2" },
      }).path
    ).toBe("/client/client-single/cl-2/tc-2");
    expect(
      getNotificationAction({
        type: "CLIENT_PROFILE_CREATION",
        metadata: { clientId: "cl-3", tenantClientId: "tc-3" },
      }).path
    ).toBe("/client/client-single/cl-3/tc-3");
  });

  it("lands on the clients list when only one of the two ids arrives", () => {
    expect(getNotificationAction(withIds({ tenantClientId: null })).path).toBe(
      "/clients/client-list"
    );
    expect(getNotificationAction(withIds({ clientId: null })).path).toBe(
      "/clients/client-list"
    );
  });

  it("deep-links a report change request the same way", () => {
    const action = getNotificationAction(
      withIds({ type: "CLIENT_REPORT_CHANGE_REQUEST", entityId: "rep-1" })
    );
    expect(action.state).toEqual({
      focusTab: "clinicalReports",
      focusId: "rep-1",
    });
  });

  it("deep-links through the entity fallback too", () => {
    expect(
      getNotificationAction({
        type: "SOMETHING_NEW",
        entityType: "CLINICAL_REPORT",
        entityId: "rep-2",
        clientId: "cl-9",
        tenantClientId: "tc-9",
      }).path
    ).toBe("/client/client-single/cl-9/tc-9");
  });
});

describe("a proposed slot that is only half filled in", () => {
  it("nulls out the parts the reschedule request never named", () => {
    const action = getNotificationAction({
      type: "NEW_RESCHEDULE_REQUEST",
      entityId: "a1",
      metadata: { proposedStartTime: "09:00" },
    });
    expect(action.state.proposedSlot).toEqual({
      date: null,
      startTime: "09:00",
      endTime: null,
      reason: null,
    });
  });
});

describe("the ticket types the support desk sends back", () => {
  it.each([
    "TICKET_STATUS_IN_PROGRESS",
    "TICKET_STATUS_RESOLVED",
    "TICKET_WITHDRAWN",
  ])("opens the request itself for %s when it names one", (type) => {
    expect(getNotificationAction({ type, entityId: "t7" })).toEqual({
      label: "View request",
      path: "/help/support-requests/t7",
    });
  });

  it.each([
    "TICKET_STATUS_IN_PROGRESS",
    "TICKET_STATUS_RESOLVED",
    "TICKET_WITHDRAWN",
  ])("falls back to the request list for %s with no id", (type) => {
    expect(getNotificationAction({ type })).toEqual({
      label: "View requests",
      path: "/help/support-requests",
    });
  });
});

describe("the longer-dated expiry warnings", () => {
  it("sends a licence expiring in a month to the organisation page", () => {
    expect(
      getNotificationAction({ type: "ORGANIZATION_LICENSE_EXPIRY_1_MONTH" })
    ).toEqual({ label: "View licenses", path: "/organization/general" });
  });

  it("sends a payer authorization expiring in a month to practice settings", () => {
    expect(
      getNotificationAction({ type: "PAYER_AUTHORIZATION_EXPIRY_1_MONTH" })
    ).toEqual({
      label: "View payers",
      path: "/organization/practice-settings",
    });
  });
});

describe("the development-only fallback guard", () => {
  // The guard runs once at import time, so the production arm needs the module
  // re-evaluated with DEV stubbed off rather than a call into it.
  it("says nothing in a production build", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("DEV", false);
    vi.resetModules();
    try {
      const fresh = await import("../Data/notificationConfig");
      expect(fresh.getNotificationAction({ type: "UPCOMING_PAYROLL" })).toEqual({
        label: "View payroll",
        path: "/payroll/payroll-setup",
      });
      expect(error).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
      error.mockRestore();
    }
  });
});
