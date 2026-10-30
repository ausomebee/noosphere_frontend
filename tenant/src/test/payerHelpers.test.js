import { describe, it, expect } from "vitest";

import omitEmpty from "../Helper/omitEmpty";
import { toBackendServiceCode } from "../Helper/payerServiceCode";

/**
 * Two payload shapers used on the way to the backend.
 *
 * `omitEmpty` drops optional keys the user left blank so they never reach the
 * API as "" or []. `toBackendServiceCode` reshapes a payer's service code,
 * which the backend reads differently depending on whether it is an existing
 * code or a custom one.
 */

describe("omitEmpty", () => {
  it("drops undefined, null, blank strings and empty arrays", () => {
    expect(
      omitEmpty({ a: undefined, b: null, c: "", d: "   ", e: [], f: "keep" })
    ).toEqual({ f: "keep" });
  });

  it("keeps false, zero and non-empty values", () => {
    const input = { flag: false, count: 0, list: [1], nested: {}, text: "x" };
    expect(omitEmpty(input)).toEqual(input);
  });

  it("keeps an empty object, since only arrays and strings are checked for emptiness", () => {
    expect(omitEmpty({ payroll: {} })).toEqual({ payroll: {} });
  });

  it("leaves nesting untouched", () => {
    const input = { payroll: { ratePerHour: "", other: "keep" } };
    expect(omitEmpty(input)).toEqual(input);
  });

  it("returns anything that is not a plain object unchanged", () => {
    expect(omitEmpty(null)).toBeNull();
    expect(omitEmpty(undefined)).toBeUndefined();
    expect(omitEmpty("text")).toBe("text");
    expect(omitEmpty(7)).toBe(7);
    expect(omitEmpty([1, 2])).toEqual([1, 2]);
  });

  it("returns an empty object for one with nothing worth keeping", () => {
    expect(omitEmpty({ a: "", b: null })).toEqual({});
  });
});

describe("toBackendServiceCode", () => {
  const base = {
    code: "97153",
    description: "Direct",
    unitCurrency: "USD",
    ratePerUnit: 10,
    billable: true,
  };

  it("sends an existing code by id, with its modifiers as plain codes", () => {
    const out = toBackendServiceCode({
      ...base,
      serviceCodeId: "sc1",
      modifiers: [{ modifier: "GT" }, { modifier: "59" }],
    });
    expect(out.serviceCodeId).toBe("sc1");
    expect(out.modifiers).toEqual(["GT", "59"]);
  });

  it("sends a custom code with no id, and its modifiers as objects", () => {
    const out = toBackendServiceCode({ ...base, modifiers: [{ modifier: "U3" }] });
    expect(out.serviceCodeId).toBeUndefined();
    expect(out.modifiers).toEqual([{ modifier: "U3" }]);
  });

  it("accepts modifiers given as bare strings", () => {
    const out = toBackendServiceCode({ ...base, serviceCodeId: "sc1", modifiers: ["GT"] });
    expect(out.modifiers).toEqual(["GT"]);
  });

  it("trims modifiers and drops the blank ones", () => {
    const out = toBackendServiceCode({
      ...base,
      serviceCodeId: "sc1",
      modifiers: ["  GT  ", "", "   ", null, { modifier: "  59" }, { other: "x" }],
    });
    expect(out.modifiers).toEqual(["GT", "59"]);
  });

  it("treats a non-array modifiers value as none", () => {
    const out = toBackendServiceCode({ ...base, modifiers: "nope" });
    expect(out.modifiers).toEqual([]);
  });

  it("carries a real row id but drops a temporary one", () => {
    expect(toBackendServiceCode({ ...base, id: "real-1" }).id).toBe("real-1");
    expect(toBackendServiceCode({ ...base, id: "temp-1" }).id).toBeUndefined();
    expect(toBackendServiceCode({ ...base }).id).toBeUndefined();
  });

  it("reads the rounding rule from either key, defaulting to blank", () => {
    expect(toBackendServiceCode({ ...base, roundingRuleId: "r1" }).roundingRuleId).toBe("r1");
    expect(toBackendServiceCode({ ...base, roundingRule: "r2" }).roundingRuleId).toBe("r2");
    expect(toBackendServiceCode({ ...base }).roundingRuleId).toBe("");
  });

  it("never sends the flags the backend does not want", () => {
    const out = toBackendServiceCode({
      ...base,
      serviceCodeId: "sc1",
      isDeleted: true,
      isActive: false,
      payerId: "p1",
    });
    expect(out).not.toHaveProperty("isDeleted");
    expect(out).not.toHaveProperty("isActive");
    expect(out).not.toHaveProperty("payerId");
  });

  it("carries the plain fields straight through", () => {
    const out = toBackendServiceCode({ ...base, serviceCodeId: "sc1" });
    expect(out).toEqual(
      expect.objectContaining({
        code: "97153",
        description: "Direct",
        unitCurrency: "USD",
        ratePerUnit: 10,
        billable: true,
      })
    );
  });
});
