import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Routes, Route, Link } from "react-router-dom";
import authReducer, { logout } from "../ReduxStore/features/authentication";

/**
 * The pending-2FA gate, end to end through the real auth slice and router.
 *
 * A password login returns full tokens before the second factor, so the slice
 * marks the session pending and the route guard keeps it on its 2FA page: a
 * typed /dashboard must not skip the challenge. Passing the challenge (or a
 * tenant with 2FA off) clears it.
 */

const api = vi.hoisted(() => ({
  AdminLogin: vi.fn(),
  GetSuperAdminChoices: vi.fn(),
  Admin2FAVerify: vi.fn(),
}));
vi.mock("../api/authApis", () => ({ default: api }));

vi.mock("../api/socketService", () => ({ connectSocket: vi.fn() }));

vi.mock("../Helper/ShowToast", () => ({
  showToast: vi.fn(),
  showApiError: vi.fn(),
}));

import ProtectedRoute from "../Components/ProtectedRoute";
import AdminLogin from "../Pages/Authentication/Login/AdminLogin";
import Admin2FAAuthenticatorLogin from "../Pages/Authentication/Login/Admin2FAAuthenticatorLogin.";

const makeStore = (authentication) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: authentication ? { authentication } : undefined,
  });

const signedIn = (over = {}) => ({
  isAuthenticated: true,
  loading: false,
  error: null,
  token: "at",
  refreshToken: "rt",
  user: { id: "u-1", tenantId: "t-1", accessToken: "at", refreshToken: "rt" },
  ...over,
});

const renderApp = (store, initialEntries) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/" element={<AdminLogin />} />
          <Route
            path="/auth/2fa/login-authenticator"
            element={
              <>
                <Admin2FAAuthenticatorLogin />
                <Link to="/dashboard">typed-dashboard</Link>
              </>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the route guard", () => {
  it("sends a user still owing 2FA back to their 2FA page", () => {
    const store = makeStore(
      signedIn({ pending2FA: true, pending2FARoute: "/auth/2fa/login-authenticator" })
    );
    renderApp(store, ["/dashboard"]);
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.getByText("Two-Factor Authentication")).toBeInTheDocument();
  });

  it("falls back to the login page when no 2FA page was recorded", () => {
    const store = makeStore(signedIn({ pending2FA: true, pending2FARoute: null }));
    renderApp(store, ["/dashboard"]);
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.getByText("Welcome Back")).toBeInTheDocument();
  });

  it("lets in a session persisted before the pending flag existed", () => {
    const legacy = signedIn();
    delete legacy.pending2FA;
    renderApp(makeStore(legacy), ["/dashboard"]);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("is lifted by logout along with the session", () => {
    const store = makeStore(
      signedIn({ pending2FA: true, pending2FARoute: "/auth/2fa/login-authenticator" })
    );
    store.dispatch(logout());
    expect(store.getState().authentication.pending2FA).toBe(false);
    expect(store.getState().authentication.pending2FARoute).toBeNull();
  });
});

describe("finishing 2FA", () => {
  it("gets the user in once the code verifies", async () => {
    api.Admin2FAVerify.mockResolvedValue({ data: { status: "ok" } });
    const store = makeStore(
      signedIn({ pending2FA: true, pending2FARoute: "/auth/2fa/login-authenticator" })
    );
    renderApp(store, ["/auth/2fa/login-authenticator"]);

    // Typing the URL before verifying bounces straight back.
    fireEvent.click(screen.getByText("typed-dashboard"));
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();

    const boxes = Array.from(document.body.querySelectorAll(".code-input"));
    "123456".split("").forEach((digit, i) =>
      fireEvent.change(boxes[i], { target: { value: digit } })
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    });

    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument());
    expect(store.getState().authentication.pending2FA).toBe(false);
  });
});

describe("logging in", () => {
  const login = async (choices, user) => {
    api.AdminLogin.mockResolvedValue({
      data: { data: { id: "u-1", tenantId: "t-1", accessToken: "at", ...user } },
    });
    api.GetSuperAdminChoices.mockResolvedValue({ data: { data: choices } });
    const store = makeStore();
    renderApp(store, ["/"]);
    fireEvent.change(screen.getByPlaceholderText("Enter your mail"), {
      target: { value: "olivia@therapyco.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter your Password"), {
      target: { value: "sup3rsecret" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    });
    return store;
  };

  it("goes straight in when the tenant has 2FA switched off", async () => {
    const store = await login(
      { setForAll: true, Authenticator2FA: true, securityQuestion: false, isEnabled: false },
      { auth2FADone: true, authType: "AUTHENTICATOR" }
    );
    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument());
    expect(store.getState().authentication.pending2FA).toBe(false);
  });

  it("stays pending on the challenge page when 2FA applies", async () => {
    const store = await login(
      { setForAll: true, Authenticator2FA: true, securityQuestion: false, isEnabled: true },
      { auth2FADone: true }
    );
    await waitFor(() =>
      expect(screen.getByText("Two-Factor Authentication")).toBeInTheDocument()
    );
    expect(store.getState().authentication).toMatchObject({
      isAuthenticated: true,
      pending2FA: true,
      pending2FARoute: "/auth/2fa/login-authenticator",
    });
  });
});
