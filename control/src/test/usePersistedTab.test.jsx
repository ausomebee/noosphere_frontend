import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import usePersistedTab from "../hooks/usePersistedTab";

/**
 * A useState that remembers the active tab across a refresh.
 *
 * The stored value is only trusted when it is non-empty and, where an
 * allow-list is given, still one of the tabs this user can see -- a
 * permission-gated tab left behind on a shared workstation must not strand the
 * next person on a panel they cannot open. Every storage access is guarded,
 * because private mode throws rather than returning null.
 */

const KEY = "panel:1";
const STORAGE_KEY = `tab:${KEY}`;

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("initial value", () => {
  it("uses the default when nothing is stored", () => {
    const { result } = renderHook(() => usePersistedTab(KEY, "overview"));
    expect(result.current[0]).toBe("overview");
  });

  it("restores what was stored", () => {
    sessionStorage.setItem(STORAGE_KEY, "billing");
    const { result } = renderHook(() => usePersistedTab(KEY, "overview"));
    expect(result.current[0]).toBe("billing");
  });

  it("ignores a stored empty string", () => {
    sessionStorage.setItem(STORAGE_KEY, "");
    const { result } = renderHook(() => usePersistedTab(KEY, "overview"));
    expect(result.current[0]).toBe("overview");
  });

  it("keys storage per tab bar", () => {
    sessionStorage.setItem("tab:panel:2", "billing");
    const { result } = renderHook(() => usePersistedTab(KEY, "overview"));
    expect(result.current[0]).toBe("overview");
  });
});

describe("the allow-list", () => {
  it("accepts a stored value that is still allowed", () => {
    sessionStorage.setItem(STORAGE_KEY, "billing");
    const { result } = renderHook(() =>
      usePersistedTab(KEY, "overview", ["overview", "billing"])
    );
    expect(result.current[0]).toBe("billing");
  });

  it("falls back when the stored tab is no longer allowed", () => {
    sessionStorage.setItem(STORAGE_KEY, "secret");
    const { result } = renderHook(() =>
      usePersistedTab(KEY, "overview", ["overview", "billing"])
    );
    expect(result.current[0]).toBe("overview");
  });

  it("treats an empty allow-list as no restriction", () => {
    sessionStorage.setItem(STORAGE_KEY, "anything");
    const { result } = renderHook(() => usePersistedTab(KEY, "overview", []));
    expect(result.current[0]).toBe("anything");
  });

  it("treats a non-array allow-list as no restriction", () => {
    sessionStorage.setItem(STORAGE_KEY, "anything");
    const { result } = renderHook(() => usePersistedTab(KEY, "overview", "nope"));
    expect(result.current[0]).toBe("anything");
  });
});

describe("persisting", () => {
  it("writes the tab as it changes", () => {
    const { result } = renderHook(() => usePersistedTab(KEY, "overview"));
    act(() => result.current[1]("billing"));
    expect(result.current[0]).toBe("billing");
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe("billing");
  });

  it("writes the initial tab on mount", () => {
    renderHook(() => usePersistedTab(KEY, "overview"));
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe("overview");
  });

  it.each([["", "empty"], [null, "null"], [undefined, "undefined"]])(
    "does not store a %s tab",
    (value) => {
      const { result } = renderHook(() => usePersistedTab(KEY, "overview"));
      act(() => result.current[1](value));
      expect(sessionStorage.getItem(STORAGE_KEY)).toBe("overview");
    }
  );
});

describe("when storage is unavailable", () => {
  it("falls back to the default if reading throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("private mode");
    });
    const { result } = renderHook(() => usePersistedTab(KEY, "overview"));
    expect(result.current[0]).toBe("overview");
  });

  it("keeps working if writing throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const { result } = renderHook(() => usePersistedTab(KEY, "overview"));
    act(() => result.current[1]("billing"));
    expect(result.current[0]).toBe("billing");
  });
});
