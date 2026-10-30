import { describe, it, expect, vi, beforeEach } from "vitest";

const verbs = { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() };
vi.mock("../Helper/AxiosInterceptor", () => ({ default: () => verbs }));

import api from "../api/reportsApi";

/**
 * The three read-only report endpoints.
 *
 * Unlike most wrappers in this codebase these unwrap the envelope themselves --
 * `res.data.data` -- and substitute a safe empty value when the backend answers
 * with a bare success and no payload, so the report pages never have to guard.
 * `getActivityLogs` also builds its own query string by hand: paging has
 * defaults, and the feature filter is appended only when one was chosen.
 */

const tokens = { accessToken: "at", refreshToken: "rt" };

const urlOf = () => verbs.get.mock.calls[0][0];

beforeEach(() => {
  Object.values(verbs).forEach((v) => v.mockReset());
});

describe("sessions by service code", () => {
  it("returns the rows out of the envelope", async () => {
    verbs.get.mockResolvedValue({ data: { data: [{ id: "s1" }] } });
    await expect(
      api.getSessionsByServiceCode({ tenantId: "t1", serviceCodeId: "sc1", ...tokens }),
    ).resolves.toEqual([{ id: "s1" }]);
    expect(urlOf()).toContain("/sessions/service/t1/sc1");
  });

  it("returns an empty list when the envelope carries no data", async () => {
    verbs.get.mockResolvedValue({ data: { message: "ok" } });
    await expect(
      api.getSessionsByServiceCode({ tenantId: "t1", serviceCodeId: "sc1", ...tokens }),
    ).resolves.toEqual([]);
  });

  it("survives a response with no body at all", async () => {
    verbs.get.mockResolvedValue({});
    await expect(
      api.getSessionsByServiceCode({ tenantId: "t1", serviceCodeId: "sc1", ...tokens }),
    ).resolves.toEqual([]);
  });

  it("surfaces the backend message", async () => {
    verbs.get.mockRejectedValue({ response: { data: { message: "no such code" } } });
    await expect(
      api.getSessionsByServiceCode({ tenantId: "t1", serviceCodeId: "sc1", ...tokens }),
    ).rejects.toThrow("no such code");
  });

  it("falls back to its own copy when the failure carries no message", async () => {
    verbs.get.mockRejectedValue(new Error(""));
    await expect(
      api.getSessionsByServiceCode({ tenantId: "t1", serviceCodeId: "sc1", ...tokens }),
    ).rejects.toThrow("Failed to fetch sessions by service code");
  });
});

describe("sessions by session type", () => {
  it("returns the rows out of the envelope", async () => {
    verbs.get.mockResolvedValue({ data: { data: [{ id: "s2" }] } });
    await expect(
      api.getSessionsBySessionType({ tenantId: "t1", sessionTypeId: "st1", ...tokens }),
    ).resolves.toEqual([{ id: "s2" }]);
    expect(urlOf()).toContain("/sessions/session-type/t1/st1");
  });

  it("returns an empty list when the envelope carries no data", async () => {
    verbs.get.mockResolvedValue({ data: {} });
    await expect(
      api.getSessionsBySessionType({ tenantId: "t1", sessionTypeId: "st1", ...tokens }),
    ).resolves.toEqual([]);
  });

  it("surfaces the backend message", async () => {
    verbs.get.mockRejectedValue({ response: { data: { message: "unknown type" } } });
    await expect(
      api.getSessionsBySessionType({ tenantId: "t1", sessionTypeId: "st1", ...tokens }),
    ).rejects.toThrow("unknown type");
  });

  it("falls back to its own copy when the failure carries no message", async () => {
    verbs.get.mockRejectedValue({});
    await expect(
      api.getSessionsBySessionType({ tenantId: "t1", sessionTypeId: "st1", ...tokens }),
    ).rejects.toThrow("Failed to fetch sessions by session type");
  });
});

describe("activity logs", () => {
  it("pages from one with fifty rows unless told otherwise", async () => {
    verbs.get.mockResolvedValue({ data: { data: { data: [], meta: {} } } });
    await api.getActivityLogs({ tenantId: "t1", ...tokens });
    expect(urlOf()).toContain("tenantId=t1&page=1&limit=50");
  });

  it("uses the paging it was given", async () => {
    verbs.get.mockResolvedValue({ data: { data: { data: [] } } });
    await api.getActivityLogs({ tenantId: "t1", page: 3, limit: 10, ...tokens });
    expect(urlOf()).toContain("page=3&limit=10");
  });

  it("appends the feature filter only when one was chosen", async () => {
    verbs.get.mockResolvedValue({ data: { data: {} } });
    await api.getActivityLogs({ tenantId: "t1", featureNames: "Billing", ...tokens });
    expect(urlOf()).toContain("&featureNames=Billing");
  });

  it("leaves the filter off when none was chosen", async () => {
    verbs.get.mockResolvedValue({ data: { data: {} } });
    await api.getActivityLogs({ tenantId: "t1", ...tokens });
    expect(urlOf()).not.toContain("featureNames");
  });

  it("returns the paged payload the backend sent", async () => {
    const payload = { data: [{ id: "l1" }], meta: { total: 1, page: 1, limit: 50, totalPages: 1 } };
    verbs.get.mockResolvedValue({ data: { data: payload } });
    await expect(api.getActivityLogs({ tenantId: "t1", ...tokens })).resolves.toEqual(payload);
  });

  it("synthesises an empty page, echoing the requested limit, when there is no payload", async () => {
    verbs.get.mockResolvedValue({ data: {} });
    await expect(
      api.getActivityLogs({ tenantId: "t1", limit: 25, ...tokens }),
    ).resolves.toEqual({
      data: [],
      meta: { total: 0, page: 1, limit: 25, totalPages: 1 },
    });
  });

  it("surfaces the backend message", async () => {
    verbs.get.mockRejectedValue({ response: { data: { message: "logs unavailable" } } });
    await expect(api.getActivityLogs({ tenantId: "t1", ...tokens })).rejects.toThrow(
      "logs unavailable",
    );
  });

  it("falls back to its own copy when the failure carries no message", async () => {
    verbs.get.mockRejectedValue(new Error(""));
    await expect(api.getActivityLogs({ tenantId: "t1", ...tokens })).rejects.toThrow(
      "Failed to fetch logs",
    );
  });
});
