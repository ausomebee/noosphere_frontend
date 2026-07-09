import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import useAuth from "../hooks/useAuth";

const createTestStore = (authState) =>
  configureStore({
    reducer: { auth: () => authState },
  });

const wrapper = (store) => ({ children }) => (
  <Provider store={store}>{children}</Provider>
);

describe("useAuth hook", () => {
  it("returns isAuthenticated false when not logged in", () => {
    const store = createTestStore({ isAuthenticated: false, user: null, accessToken: null, refreshToken: null });
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(store) });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("returns user data when authenticated", () => {
    const store = createTestStore({
      isAuthenticated: true,
      user: { id: "u1", firstName: "John", lastName: "Doe", avatarUrl: "avatar.png", tenantLinks: [{ id: "tl1", clientId: "c1", tenantId: "t1" }] },
      accessToken: "access123",
      refreshToken: "refresh123",
    });
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(store) });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.firstName).toBe("John");
    expect(result.current.lastName).toBe("Doe");
    expect(result.current.userId).toBe("u1");
    expect(result.current.avatarUrl).toBe("avatar.png");
  });

  it("returns tokens from auth state", () => {
    const store = createTestStore({
      isAuthenticated: true,
      user: { id: "u1", tenantLinks: [] },
      accessToken: "access-tok",
      refreshToken: "refresh-tok",
    });
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(store) });
    expect(result.current.accessToken).toBe("access-tok");
    expect(result.current.refreshToken).toBe("refresh-tok");
  });

  it("extracts tenant link IDs", () => {
    const store = createTestStore({
      isAuthenticated: true,
      user: { id: "u1", tenantLinks: [{ id: "tl1", clientId: "c1", tenantId: "t1" }] },
      accessToken: "a", refreshToken: "r",
    });
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(store) });
    expect(result.current.clientId).toBe("c1");
    expect(result.current.tenantClientId).toBe("tl1");
    expect(result.current.tenantId).toBe("t1");
  });

  it("returns null for tenant IDs when no tenant links", () => {
    const store = createTestStore({
      isAuthenticated: true,
      user: { id: "u1", tenantLinks: [] },
      accessToken: "a", refreshToken: "r",
    });
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(store) });
    expect(result.current.clientId).toBeNull();
    expect(result.current.tenantClientId).toBeNull();
    expect(result.current.tenantId).toBeNull();
  });

  it("returns defaults when user is null", () => {
    const store = createTestStore({ isAuthenticated: false, user: null, accessToken: null, refreshToken: null });
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(store) });
    expect(result.current.userId).toBeNull();
    expect(result.current.firstName).toBe("");
    expect(result.current.lastName).toBe("");
    expect(result.current.avatarUrl).toBeNull();
  });

  it("falls back to user tokens if top-level missing", () => {
    const store = createTestStore({
      isAuthenticated: true,
      user: { id: "u1", accessToken: "user-access", refreshToken: "user-refresh", tenantLinks: [] },
      accessToken: null, refreshToken: null,
    });
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(store) });
    expect(result.current.accessToken).toBe("user-access");
    expect(result.current.refreshToken).toBe("user-refresh");
  });
});
