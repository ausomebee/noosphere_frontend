import { describe, it, expect } from "vitest";

import {
  clientDisplayName,
  normalizeRescheduleRequest,
  toServiceRows,
} from "../utils/appointmentDisplay";

/**
 * Display helpers for appointment rows.
 *
 * A reschedule request wraps the appointment it refers to, so the client and
 * services live on the nested record while the requested slot lives on the
 * request itself -- reading it flat left those columns blank. The same function
 * also has to accept a bare appointment, which is what the notification
 * deep-link hands it, with the requested slot supplied separately.
 */

describe("clientDisplayName", () => {
  it("joins the first and last name", () => {
    expect(clientDisplayName({ firstName: "Ada", lastName: "Lovelace" })).toBe("Ada Lovelace");
  });

  it("copes with only one of the two", () => {
    expect(clientDisplayName({ firstName: "Ada" })).toBe("Ada");
    expect(clientDisplayName({ lastName: "Lovelace" })).toBe("Lovelace");
  });

  it("falls back to a flat fullName when there are no parts", () => {
    expect(clientDisplayName({ fullName: "Ada Lovelace" })).toBe("Ada Lovelace");
  });

  it("prefers the name parts over a flat fullName", () => {
    expect(clientDisplayName({ firstName: "Ada", fullName: "Someone Else" })).toBe("Ada");
  });

  it("falls back for a missing client, and honours a custom fallback", () => {
    expect(clientDisplayName(null)).toBe("N/A");
    expect(clientDisplayName(undefined)).toBe("N/A");
    expect(clientDisplayName(null, "Unassigned")).toBe("Unassigned");
  });

  it("falls back for a client with nothing usable on it", () => {
    expect(clientDisplayName({})).toBe("N/A");
  });
});

describe("toServiceRows", () => {
  it("renders a code with its modifier in brackets", () => {
    expect(toServiceRows([{ serviceCode: { code: "97153" }, modifiers: { modifier: "GT" } }])).toEqual([
      { serviceType: "97153 (GT)", modifierType: "GT" },
    ]);
  });

  it("omits the brackets when there is no modifier", () => {
    expect(toServiceRows([{ serviceCode: { code: "97153" } }])).toEqual([
      { serviceType: "97153", modifierType: "" },
    ]);
  });

  it("labels a missing code rather than rendering undefined", () => {
    expect(toServiceRows([{}])).toEqual([{ serviceType: "N/A", modifierType: "" }]);
  });

  it("returns nothing for a missing or empty list", () => {
    expect(toServiceRows(undefined)).toEqual([]);
    expect(toServiceRows(null)).toEqual([]);
    expect(toServiceRows([])).toEqual([]);
  });

  it("tolerates a null entry in the list", () => {
    expect(toServiceRows([null])).toEqual([{ serviceType: "N/A", modifierType: "" }]);
  });
});

describe("normalizeRescheduleRequest with a wrapped request", () => {
  const wrapped = {
    id: "req1",
    appointmentId: "a1",
    clientId: "c1",
    date: "2026-02-01",
    startTime: "09:00",
    endTime: "10:00",
    reasonForReschedule: "Clash",
    status: "PENDING",
    appointment: {
      id: "a1",
      clientId: "c1",
      date: "2026-01-05",
      startTime: "13:00",
      endTime: "14:00",
      client: { firstName: "Ada", lastName: "Lovelace" },
      clinicians: [{ id: "cl1" }],
      session: { id: "s1" },
      appointmentServices: [{ serviceCode: { code: "97153" } }],
    },
  };

  it("takes the requested slot from the request itself", () => {
    const out = normalizeRescheduleRequest(wrapped);
    expect(out.requested).toEqual({ date: "2026-02-01", startTime: "09:00", endTime: "10:00" });
  });

  it("takes the previous slot from the appointment it wraps", () => {
    const out = normalizeRescheduleRequest(wrapped);
    expect(out.previous).toEqual({ date: "2026-01-05", startTime: "13:00", endTime: "14:00" });
  });

  it("prefers an explicit previous slot when the API sends one", () => {
    const out = normalizeRescheduleRequest({
      ...wrapped,
      appointment: {
        ...wrapped.appointment,
        previousDate: "2025-12-01",
        previousStartTime: "08:00",
        previousEndTime: "09:00",
      },
    });
    expect(out.previous).toEqual({ date: "2025-12-01", startTime: "08:00", endTime: "09:00" });
  });

  it("reads the client, clinicians, session and services off the nested record", () => {
    const out = normalizeRescheduleRequest(wrapped);
    expect(out.client).toEqual({ firstName: "Ada", lastName: "Lovelace" });
    expect(out.clinicians).toHaveLength(1);
    expect(out.session).toEqual({ id: "s1" });
    expect(out.services).toEqual([{ serviceType: "97153", modifierType: "" }]);
  });

  it("carries the request id, reason and status", () => {
    const out = normalizeRescheduleRequest(wrapped);
    expect(out.requestId).toBe("req1");
    expect(out.reason).toBe("Clash");
    expect(out.status).toBe("PENDING");
  });
});

describe("normalizeRescheduleRequest with a bare appointment", () => {
  const bare = {
    id: "a1",
    clientId: "c1",
    date: "2026-01-05",
    startTime: "13:00",
    endTime: "14:00",
    client: { firstName: "Ada" },
    reasonForReschedule: "From the appointment",
  };

  it("has no request id, since there is no request", () => {
    expect(normalizeRescheduleRequest(bare).requestId).toBeNull();
  });

  it("takes the requested slot from the proposal it is handed", () => {
    const out = normalizeRescheduleRequest(bare, {
      date: "2026-03-01",
      startTime: "11:00",
      endTime: "12:00",
    });
    expect(out.requested).toEqual({ date: "2026-03-01", startTime: "11:00", endTime: "12:00" });
  });

  it("leaves the requested slot empty with no proposal", () => {
    expect(normalizeRescheduleRequest(bare).requested).toEqual({
      date: null,
      startTime: null,
      endTime: null,
    });
  });

  it("still reports the appointment's own slot as previous", () => {
    const out = normalizeRescheduleRequest(bare);
    expect(out.previous.date).toBe("2026-01-05");
    expect(out.appointmentId).toBe("a1");
  });

  it("reads the reason off the appointment", () => {
    expect(normalizeRescheduleRequest(bare).reason).toBe("From the appointment");
  });
});

describe("normalizeRescheduleRequest with nothing usable", () => {
  it.each([[null], [undefined], [{}]])("returns a blank row for %s", (input) => {
    const out = normalizeRescheduleRequest(input);
    expect(out.requestId).toBeNull();
    expect(out.appointmentId).toBeNull();
    expect(out.client).toBeNull();
    expect(out.clinicians).toEqual([]);
    expect(out.services).toEqual([]);
    expect(out.reason).toBe("");
    expect(out.status).toBeNull();
  });
});
