import { describe, it, expect, beforeEach } from "vitest";
import { getFingerprint } from "../Helper/fingerprint";

describe("getFingerprint", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("generates a new fingerprint when none exists", () => {
    const id = getFingerprint();
    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("stores fingerprint in localStorage", () => {
    const id = getFingerprint();
    expect(localStorage.getItem("x-fingerprint")).toBe(id);
  });

  it("returns same fingerprint on subsequent calls", () => {
    const first = getFingerprint();
    const second = getFingerprint();
    expect(first).toBe(second);
  });

  it("returns existing fingerprint from localStorage", () => {
    localStorage.setItem("x-fingerprint", "existing-fp-123");
    const id = getFingerprint();
    expect(id).toBe("existing-fp-123");
  });

  it("generates UUID format fingerprint", () => {
    const id = getFingerprint();
    // UUID v4 format: 8-4-4-4-12 hex chars
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(id).toMatch(uuidRegex);
  });
});
