import { describe, it, expect } from "vitest";

import {
  countryOptions,
  normalizeCountry,
  getStateOptions,
  normalizeState,
} from "../Helper/geoOptions";

/**
 * Countries and their states, backed by `country-region-data`.
 *
 * Option values are display names because that is what the API stores, but
 * older records hold ISO codes ("US"), non-ISO abbreviations ("UK", where the
 * ISO code is "GB"), and free text typed before these were dropdowns. Every
 * one of those has to keep resolving, or a record opens with a blank field and
 * saves the blank back.
 */

describe("countryOptions", () => {
  it("offers every country with its name as the value", () => {
    expect(countryOptions.length).toBeGreaterThan(100);
    const us = countryOptions.find((o) => o.value === "United States");
    expect(us).toEqual({ value: "United States", label: "United States" });
  });
});

describe("normalizeCountry", () => {
  it("passes a display name straight through", () => {
    expect(normalizeCountry("United States")).toBe("United States");
  });

  it("resolves an ISO code", () => {
    expect(normalizeCountry("US")).toBe("United States");
    expect(normalizeCountry("GB")).toBe("United Kingdom");
  });

  it("resolves the non-ISO abbreviation older records hold", () => {
    expect(normalizeCountry("UK")).toBe("United Kingdom");
  });

  it("resolves a name whose case does not match", () => {
    expect(normalizeCountry("united states")).toBe("United States");
    expect(normalizeCountry("UNITED STATES")).toBe("United States");
  });

  it('clears "Other", which has no country behind it', () => {
    expect(normalizeCountry("Other")).toBe("");
  });

  it("clears anything it cannot resolve", () => {
    expect(normalizeCountry("Atlantis")).toBe("");
  });

  it("clears an empty value", () => {
    expect(normalizeCountry("")).toBe("");
    expect(normalizeCountry(null)).toBe("");
    expect(normalizeCountry(undefined)).toBe("");
  });
});

describe("getStateOptions", () => {
  it("lists the states of a country given by name", () => {
    const states = getStateOptions("United States");
    expect(states.length).toBeGreaterThan(40);
    expect(states.find((s) => s.value === "California")).toBeTruthy();
  });

  it("accepts the country's ISO code too", () => {
    expect(getStateOptions("US").length).toBe(getStateOptions("United States").length);
  });

  it("returns nothing for a country it cannot resolve", () => {
    expect(getStateOptions("Atlantis")).toEqual([]);
    expect(getStateOptions("")).toEqual([]);
    expect(getStateOptions(null)).toEqual([]);
  });
});

describe("normalizeState", () => {
  it("passes a state name straight through", () => {
    expect(normalizeState("California", "United States")).toBe("California");
  });

  it("resolves a state name whose case does not match", () => {
    expect(normalizeState("california", "United States")).toBe("California");
  });

  it("resolves a state code", () => {
    expect(normalizeState("CA", "United States")).toBe("California");
  });

  it("clears a state the country does not have", () => {
    expect(normalizeState("Atlantis", "United States")).toBe("");
  });

  it("clears a state when the country cannot be resolved", () => {
    expect(normalizeState("California", "Atlantis")).toBe("");
  });

  it("clears an empty value", () => {
    expect(normalizeState("", "United States")).toBe("");
    expect(normalizeState(null, "United States")).toBe("");
  });
});
