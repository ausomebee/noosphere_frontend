import { describe, it, expect, vi, beforeEach } from "vitest";

const verbs = { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() };
vi.mock("../Helper/AxiosInterceptor", () => ({ default: () => verbs }));

import api from "../api/payrollApi";

/**
 * How income items and deductions have their rate narrowed before being saved.
 *
 * The rate editor is one form that shows different inputs per compensation
 * type, and it keeps the fields the user has already filled in when they switch
 * types. So the object reaching these four wrappers can carry leftovers from a
 * type the user abandoned, and each wrapper rebuilds `rate` from scratch,
 * copying across only the keys its own type uses. The four wrappers share that
 * logic verbatim, which is why they are driven from one table here; the rest of
 * payrollApi is covered by payrollApi.generated.test.js.
 */

const tokens = { accessToken: "at", refreshToken: "rt" };

// Deliberately over-full: every key any type could want, so a wrapper that
// forgot to narrow would be caught copying a key belonging to another type.
const fullRate = {
  rate: "50",
  unit: "hour",
  unitMinutes: "60",
  duration: "2",
  stale: "left over from a type the user switched away from",
};

// [ label, api method, HTTP verb, extra args the update variants need ]
const WRAPPERS = [
  ["CreateIncomeItems", "post", {}],
  ["UpdateIncomeItems", "put", { id: "i1", isActive: true, isDeleted: false }],
  ["CreateDeductions", "post", {}],
  ["UpdateDeductions", "put", { id: "d1", isActive: true, isDeleted: false }],
];

const call = (name, verb, extra, type, rate = fullRate) => {
  verbs[verb].mockResolvedValue({ data: { ok: true } });
  return api[name]({ tenantId: "t1", name: "Overtime", type, rate, ...extra, ...tokens });
};

const sentRate = (verb) => verbs[verb].mock.calls[0][1].rate;

beforeEach(() => {
  Object.values(verbs).forEach((v) => v.mockReset());
});

describe("narrowing the rate to its type", () => {
  it.each(WRAPPERS)("%s keeps only the amount for a flat rate", async (name, verb, extra) => {
    await call(name, verb, extra, "Flat Rate");
    expect(sentRate(verb)).toEqual({ rate: "50" });
  });

  it.each(WRAPPERS)("%s keeps unit, minutes and duration for a time based rate", async (name, verb, extra) => {
    await call(name, verb, extra, "Time based");
    expect(sentRate(verb)).toEqual({ unit: "hour", unitMinutes: "60", duration: "2" });
  });

  it.each(WRAPPERS)("%s drops the minutes for a percentage based rate", async (name, verb, extra) => {
    await call(name, verb, extra, "Percentage based");
    expect(sentRate(verb)).toEqual({ unit: "hour", duration: "2" });
  });

  it.each(WRAPPERS)("%s sends an empty rate for a type it does not know", async (name, verb, extra) => {
    // Nothing is copied across, so an unrecognised type silently loses the
    // amount the user typed rather than failing loudly.
    await call(name, verb, extra, "Piecework");
    expect(sentRate(verb)).toEqual({});
  });

  it.each(WRAPPERS)("%s copies a missing key across as undefined rather than omitting it", async (name, verb, extra) => {
    await call(name, verb, extra, "Time based", { unit: "session" });
    expect(sentRate(verb)).toEqual({
      unit: "session",
      unitMinutes: undefined,
      duration: undefined,
    });
  });
});

describe("the rest of the saved payload", () => {
  it("sends the tenant, name and type when creating an income item", async () => {
    await call("CreateIncomeItems", "post", {}, "Flat Rate");
    expect(verbs.post.mock.calls[0][1]).toMatchObject({
      tenantId: "t1",
      name: "Overtime",
      type: "Flat Rate",
    });
  });

  it("carries the id and the active/deleted flags when updating a deduction", async () => {
    await call("UpdateDeductions", "put", { id: "d1", isActive: false, isDeleted: true }, "Flat Rate");
    expect(verbs.put.mock.calls[0][1]).toMatchObject({
      id: "d1",
      isActive: false,
      isDeleted: true,
    });
  });
});

describe("a rate object the form never supplied", () => {
  it.each(WRAPPERS)("%s reports the crash as its own failure", async (name, verb, extra) => {
    // Reading `rate.rate` off undefined throws inside the try, so the caller
    // sees the TypeError's message instead of a wrapper-specific one.
    verbs[verb].mockResolvedValue({ data: {} });
    await expect(
      api[name]({ tenantId: "t1", name: "Overtime", type: "Flat Rate", ...extra, ...tokens }),
    ).rejects.toThrow(/rate/);
    expect(verbs[verb]).not.toHaveBeenCalled();
  });
});
