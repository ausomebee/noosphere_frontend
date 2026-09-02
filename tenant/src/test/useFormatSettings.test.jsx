import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import generalSettings from "../ReduxStore/features/generalSettingsSlice";

const auth = { tenantId: "t1", accessToken: "at", refreshToken: "rt" };
vi.mock("../hooks/useAuth", () => ({ default: () => auth }));

const GetGeneralSettingsByTenantId = vi.fn();
vi.mock("../api/generalSettingsApi", () => ({
  default: { GetGeneralSettingsByTenantId: (...a) => GetGeneralSettingsByTenantId(...a) },
}));

import useFormatSettings from "../hooks/useFormatSettings";

/**
 * The date/time/currency formats every screen renders through.
 *
 * Many components call this hook, so it must fetch at most once per session:
 * the `loaded` flag on the slice is both the cache and the guard, and it is
 * only ever set by a successful load. Until then the slice's own defaults are
 * what callers get, which is also what happens when the request fails --
 * formatting is not worth blocking a page over, so the error is swallowed.
 *
 * The hook also declines to fetch before the user is authenticated, since it is
 * mounted by layout components that render during the login handshake.
 */

let store;

const wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;

const makeStore = (preloadedState) =>
  configureStore({ reducer: { generalSettings }, preloadedState });

const DEFAULTS = { dateFormat: "MM/DD/YYYY", timeFormat: "12-hour", currency: "USD" };

beforeEach(() => {
  GetGeneralSettingsByTenantId.mockReset();
  store = makeStore();
  Object.assign(auth, { tenantId: "t1", accessToken: "at", refreshToken: "rt" });
});

describe("loading the tenant's formats", () => {
  it("fetches for the signed-in tenant and publishes what came back", async () => {
    GetGeneralSettingsByTenantId.mockResolvedValue({
      data: { dateFormat: "DD/MM/YYYY", timeFormat: "24-hour", currency: "NGN" },
    });
    const { result } = renderHook(() => useFormatSettings(), { wrapper });

    expect(GetGeneralSettingsByTenantId).toHaveBeenCalledWith({
      tenantId: "t1",
      accessToken: "at",
      refreshToken: "rt",
    });
    await waitFor(() =>
      expect(result.current).toEqual({
        dateFormat: "DD/MM/YYYY",
        timeFormat: "24-hour",
        currency: "NGN",
      }),
    );
    expect(store.getState().generalSettings.loaded).toBe(true);
  });

  it("serves the defaults until the request comes back", () => {
    GetGeneralSettingsByTenantId.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useFormatSettings(), { wrapper });
    expect(result.current).toEqual(DEFAULTS);
  });

  it("leaves the slice untouched when the response has no settings", async () => {
    GetGeneralSettingsByTenantId.mockResolvedValue({ message: "none configured" });
    const { result } = renderHook(() => useFormatSettings(), { wrapper });

    await waitFor(() => expect(GetGeneralSettingsByTenantId).toHaveBeenCalled());
    expect(result.current).toEqual(DEFAULTS);
    // Still unloaded, so a later mount will try again.
    expect(store.getState().generalSettings.loaded).toBe(false);
  });

  it("survives a response of nothing at all", async () => {
    GetGeneralSettingsByTenantId.mockResolvedValue(undefined);
    const { result } = renderHook(() => useFormatSettings(), { wrapper });
    await waitFor(() => expect(GetGeneralSettingsByTenantId).toHaveBeenCalled());
    expect(result.current).toEqual(DEFAULTS);
  });

  it("falls back to the defaults when the request fails", async () => {
    GetGeneralSettingsByTenantId.mockRejectedValue(new Error("500"));
    const { result } = renderHook(() => useFormatSettings(), { wrapper });

    await waitFor(() => expect(GetGeneralSettingsByTenantId).toHaveBeenCalled());
    expect(result.current).toEqual(DEFAULTS);
    expect(store.getState().generalSettings.loaded).toBe(false);
  });
});

describe("not fetching", () => {
  it("skips the request once the settings are loaded", () => {
    store = makeStore({ generalSettings: { ...DEFAULTS, currency: "NGN", loaded: true } });
    const { result } = renderHook(() => useFormatSettings(), { wrapper });

    expect(GetGeneralSettingsByTenantId).not.toHaveBeenCalled();
    expect(result.current.currency).toBe("NGN");
  });

  it("waits for a tenant before asking", () => {
    auth.tenantId = undefined;
    renderHook(() => useFormatSettings(), { wrapper });
    expect(GetGeneralSettingsByTenantId).not.toHaveBeenCalled();
  });

  it("waits for an access token before asking", () => {
    auth.accessToken = undefined;
    renderHook(() => useFormatSettings(), { wrapper });
    expect(GetGeneralSettingsByTenantId).not.toHaveBeenCalled();
  });

  it("fetches once for the whole app, however many components mount it", async () => {
    GetGeneralSettingsByTenantId.mockResolvedValue({ data: { currency: "NGN" } });
    const { rerender } = renderHook(() => useFormatSettings(), { wrapper });
    await waitFor(() => expect(store.getState().generalSettings.loaded).toBe(true));

    rerender();
    renderHook(() => useFormatSettings(), { wrapper });
    expect(GetGeneralSettingsByTenantId).toHaveBeenCalledTimes(1);
  });
});
