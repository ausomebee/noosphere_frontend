import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer, { AdminLogin } from "../ReduxStore/features/authentication";

/**
 * The tenant admin login screen. Signing in is two lines of it; the rest is a
 * routing table.
 *
 * Where a successful login lands depends on four inputs that arrive from two
 * different places -- whether the tenant enables 2FA at all and which method it
 * mandates (from the super-admin choices endpoint), and whether this user has
 * already enrolled and what method they picked for themselves (from the login
 * response). "Set for all" decides which of the two method sources wins, and an
 * Admin with no method at all is sent to password onboarding rather than to the
 * self-service method picker. Every one of those exits is asserted here.
 *
 * `dispatch` is mocked so each test can hand the screen the exact result action
 * it wants to route on, including a rejection whose payload is a bare string --
 * which is what the thunk actually rejects with, and which the fallback chain
 * has to read differently from an object.
 */

const api = vi.hoisted(() => ({ GetSuperAdminChoices: vi.fn() }));
vi.mock("../api/authApis", () => ({ default: api }));

const socket = vi.hoisted(() => ({ connectSocket: vi.fn() }));
vi.mock("../api/socketService", () => ({
  connectSocket: (...args) => socket.connectSocket(...args),
}));

const toast = vi.hoisted(() => vi.fn());
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...args) => toast(...args),
  showApiError: vi.fn(),
}));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

const dispatch = vi.hoisted(() => vi.fn());
vi.mock("react-redux", async (importOriginal) => ({
  ...(await importOriginal()),
  useDispatch: () => dispatch,
}));

import AdminCLogin from "../Pages/Authentication/Login/AdminLogin";

const CREDENTIALS = { email: "olivia@therapyco.com", password: "sup3rsecret" };

const loggedInAs = (user) => ({
  type: AdminLogin.fulfilled.type,
  payload: { data: { id: "u-1", tenantId: "t-1", accessToken: "at", ...user } },
});
const refusedWith = (payload) => ({ type: AdminLogin.rejected.type, payload });

const store = (loading = false) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: false,
        loading,
        error: null,
        token: null,
        user: null,
      },
    },
  });

const renderPage = ({ loading } = {}) =>
  render(
    <Provider store={store(loading)}>
      <AdminCLogin />
    </Provider>
  );

const fillCredentials = ({ email, password } = CREDENTIALS) => {
  fireEvent.change(screen.getByPlaceholderText("Enter your mail"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter your Password"), {
    target: { value: password },
  });
};

const submitForm = () =>
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

// One successful login under a given tenant policy and user record, waited out
// to the point where the routing decision has been taken.
const loginUnder = async ({ choices, user }) => {
  api.GetSuperAdminChoices.mockResolvedValue({ data: { data: choices } });
  dispatch.mockResolvedValue(loggedInAs(user));
  renderPage();
  fillCredentials();
  submitForm();
  await waitFor(() => expect(api.GetSuperAdminChoices).toHaveBeenCalled());
};

const POLICY_OFF = {
  setForAll: false,
  Authenticator2FA: false,
  securityQuestion: false,
  isEnabled: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  api.GetSuperAdminChoices.mockResolvedValue({ data: { data: POLICY_OFF } });
  dispatch.mockResolvedValue(loggedInAs({ auth2FADone: true }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("validating the credentials", () => {
  it("refuses an empty form", async () => {
    renderPage();
    submitForm();
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("refuses an address that is not an email", async () => {
    renderPage();
    fillCredentials({ email: "not-an-email", password: "sup3rsecret" });
    submitForm();
    expect(await screen.findByText("Invalid email")).toBeInTheDocument();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("refuses a password under six characters", async () => {
    renderPage();
    fillCredentials({ email: CREDENTIALS.email, password: "abc" });
    submitForm();
    expect(
      await screen.findByText("Password must be at least 6 characters")
    ).toBeInTheDocument();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("confirms a successful sign-in", async () => {
    await loginUnder({ choices: POLICY_OFF, user: { auth2FADone: true } });
    expect(toast).toHaveBeenCalledWith("Login successful", "success");
    expect(api.GetSuperAdminChoices).toHaveBeenCalledWith({ id: "t-1" });
  });
});

describe("when the tenant has 2FA switched off entirely", () => {
  it("goes straight to the dashboard even for an unenrolled user", async () => {
    await loginUnder({
      choices: { ...POLICY_OFF, setForAll: true, Authenticator2FA: true, isEnabled: false },
      user: { auth2FADone: false },
    });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/dashboard"));
    expect(socket.connectSocket).toHaveBeenCalledWith({
      accessToken: "at",
      userId: "u-1",
      tenantId: "t-1",
    });
  });

  it("still enforces 2FA when the master switch is merely absent", async () => {
    // Only an explicit `false` skips 2FA; `undefined` must not.
    await loginUnder({
      choices: { setForAll: true, Authenticator2FA: true, securityQuestion: false },
      user: { auth2FADone: false },
    });
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/auth/2fa/authenticator")
    );
  });
});

describe("routing a user who has not enrolled yet", () => {
  it("sends them to the method the tenant mandates for everyone", async () => {
    await loginUnder({
      choices: { ...POLICY_OFF, setForAll: true, Authenticator2FA: true },
      user: { auth2FADone: false, authType: "SECRETMESSAGE" },
    });
    // The tenant-wide choice overrides whatever the user picked before.
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/auth/2fa/authenticator")
    );
  });

  it("prefers the authenticator when the tenant enabled both methods", async () => {
    await loginUnder({
      choices: {
        setForAll: true,
        Authenticator2FA: true,
        securityQuestion: true,
        isEnabled: true,
      },
      user: { auth2FADone: false },
    });
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/auth/2fa/authenticator")
    );
  });

  it("sends them to the security question when that is the mandated method", async () => {
    await loginUnder({
      choices: { ...POLICY_OFF, setForAll: true, securityQuestion: true },
      user: { auth2FADone: false },
    });
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/auth/2fa/security-question")
    );
  });

  it("falls back to the user's own method when nothing is mandated", async () => {
    await loginUnder({
      choices: POLICY_OFF,
      user: { auth2FADone: false, authType: "SECRETMESSAGE" },
    });
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/auth/2fa/security-question")
    );
  });

  it("sends a brand-new admin to password onboarding", async () => {
    await loginUnder({
      choices: POLICY_OFF,
      user: { auth2FADone: false, role: { name: "Admin" } },
    });
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/auth/change-password")
    );
  });

  it("lets a non-admin with no method pick one for themselves", async () => {
    await loginUnder({
      choices: POLICY_OFF,
      user: { auth2FADone: false, role: { name: "Clinician" } },
    });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/auth/2fa/choice"));
  });

  it("treats a mandated policy with no method chosen as no method", async () => {
    await loginUnder({
      choices: { ...POLICY_OFF, setForAll: true },
      user: { auth2FADone: false, authType: "AUTHENTICATOR", role: { name: "Admin" } },
    });
    // `setForAll` wins, and it names nothing -- so the user's own AUTHENTICATOR
    // is ignored and the admin is sent to onboarding.
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/auth/change-password")
    );
  });
});

describe("routing a user who is already enrolled", () => {
  it("sends them to the authenticator challenge", async () => {
    await loginUnder({
      choices: POLICY_OFF,
      user: { auth2FADone: true, authType: "AUTHENTICATOR" },
    });
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/auth/2fa/login-authenticator")
    );
  });

  it("sends them to the security-question challenge", async () => {
    await loginUnder({
      choices: { ...POLICY_OFF, setForAll: true, securityQuestion: true },
      user: { auth2FADone: true },
    });
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/auth/2fa/login-question")
    );
  });

  it("lets them in when no method applies to them any more", async () => {
    await loginUnder({ choices: POLICY_OFF, user: { auth2FADone: true } });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/dashboard"));
    expect(socket.connectSocket).toHaveBeenCalled();
  });

  it("keeps enforcing 2FA when the tenant policy cannot be read", async () => {
    // The failure path deliberately defaults the master switch to on, so an
    // unreachable policy service can never silently skip the challenge.
    api.GetSuperAdminChoices.mockRejectedValue(new Error("policy service down"));
    dispatch.mockResolvedValue(
      loggedInAs({ auth2FADone: true, authType: "AUTHENTICATOR" })
    );
    renderPage();
    fillCredentials();
    submitForm();
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/auth/2fa/login-authenticator")
    );
    expect(socket.connectSocket).not.toHaveBeenCalled();
  });
});

describe("a refused login", () => {
  it("shows the bare message string the thunk rejected with", async () => {
    dispatch.mockResolvedValue(refusedWith("Invalid credentials"));
    renderPage();
    fillCredentials();
    submitForm();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Invalid credentials", "error")
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("reads a message out of an object payload", async () => {
    dispatch.mockResolvedValue(refusedWith({ message: "Account locked" }));
    renderPage();
    fillCredentials();
    submitForm();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Account locked", "error")
    );
  });

  it("falls back to generic copy when there is no payload at all", async () => {
    dispatch.mockResolvedValue(refusedWith(undefined));
    renderPage();
    fillCredentials();
    submitForm();
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Login failed", "error"));
  });

  it("catches a dispatch that throws outright", async () => {
    dispatch.mockRejectedValue(new Error("network down"));
    renderPage();
    fillCredentials();
    submitForm();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        "An unexpected error occurred. Please try again.",
        "error"
      )
    );
  });
});

describe("the rest of the screen", () => {
  it("spins the submit button while the auth slice is loading", () => {
    renderPage({ loading: true });
    expect(screen.getByRole("button", { name: "Loading" })).toBeDisabled();
  });

  it("offers the forgot-password route", () => {
    renderPage();
    fireEvent.click(screen.getByText("Forgot Password?"));
    expect(navigate).toHaveBeenCalledWith("/auth/forgot-password");
  });
});
