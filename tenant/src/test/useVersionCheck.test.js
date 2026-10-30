import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

import useVersionCheck from "../hooks/useVersionCheck";

/**
 * The tab knows the version it loaded with; version.json says what the server
 * has now. The hook only ever reports "newer exists" — it never reloads — so
 * these tests are about when it checks and what it makes of the answer.
 */

const serverHas = (version) =>
  vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ version }) });

const setVisibility = (state) => {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
};

describe("useVersionCheck", () => {
  beforeEach(() => {
    setVisibility("visible");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports nothing while the server serves the version this tab loaded", async () => {
    const fetchMock = serverHas("abc1234");
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useVersionCheck({ currentVersion: "abc1234", enabled: true })
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(result.current.updateAvailable).toBe(false);
  });

  it("reports a newer deploy, bypassing the HTTP cache", async () => {
    const fetchMock = serverHas("def5678");
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useVersionCheck({ currentVersion: "abc1234", enabled: true })
    );

    await waitFor(() => expect(result.current.updateAvailable).toBe(true));
    expect(result.current.latestVersion).toBe("def5678");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/version\.json$/),
      { cache: "no-store" }
    );
  });

  it("keeps checking on its interval and stops once it has found one", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ version: "abc1234" }) })
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ version: "def5678" }) });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useVersionCheck({ currentVersion: "abc1234", enabled: true, intervalMs: 20 })
    );

    await waitFor(() => expect(result.current.updateAvailable).toBe(true));
    const callsWhenFound = fetchMock.mock.calls.length;
    await new Promise((r) => setTimeout(r, 80));
    expect(fetchMock).toHaveBeenCalledTimes(callsWhenFound);
  });

  it("checks again when the tab comes back into view", async () => {
    const fetchMock = serverHas("abc1234");
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useVersionCheck({ currentVersion: "abc1234", enabled: true }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    act(() => setVisibility("hidden"));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => setVisibility("visible"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it.each([
    ["the request fails", () => vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))],
    ["the file is missing", () => vi.fn().mockResolvedValue({ ok: false })],
    ["the file has no version", () => serverHas(undefined)],
  ])("stays quiet when %s", async (_case, makeFetch) => {
    const fetchMock = makeFetch();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useVersionCheck({ currentVersion: "abc1234", enabled: true })
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await act(() => Promise.resolve());
    expect(result.current.updateAvailable).toBe(false);
  });

  it.each([
    ["it is disabled (dev and test builds)", { currentVersion: "abc1234", enabled: false }],
    ["the build carries no version", { currentVersion: null, enabled: true }],
  ])("never fetches when %s", async (_case, options) => {
    const fetchMock = serverHas("def5678");
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useVersionCheck(options));
    await act(() => Promise.resolve());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops listening once unmounted", async () => {
    const fetchMock = serverHas("abc1234");
    vi.stubGlobal("fetch", fetchMock);

    const { unmount } = renderHook(() =>
      useVersionCheck({ currentVersion: "abc1234", enabled: true })
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    unmount();
    act(() => setVisibility("visible"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
