import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

const authApi = vi.hoisted(() => ({
  ClientLogin: vi.fn(),
  ClientSetPassword: vi.fn(),
}));
vi.mock("../api/authApis", () => ({ default: authApi }));

const showToast = vi.fn();
vi.mock("../Helper/ShowToast", () => ({ showToast: (...a) => showToast(...a) }));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

import ClientLogin from "../Pages/Authentication/Login/ClientLogin";
import InitialLogin from "../Pages/Authentication/NewClientLogin/IntialLogin";
import InitialResetPassword from "../Pages/Authentication/NewClientLogin/IntialResetPassword";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The two sign-in screens and the forced password change that follows the
 * first one.
 *
 * Both login pages dispatch the same `ClientLogin` thunk and then read the
 * result action rather than catching, so the suite drives them through a real
 * store with only the API stubbed -- mocking the thunk itself would skip the
 * `fulfilled.match` branch that decides where the user lands. The thunk always
 * resolves to an action, so the `try/catch` wrapped around the dispatch on both
 * pages can never fire; the branches that matter are the ones reading
 * `resultAction.payload`.
 *
 * The two pages differ in where the spinner comes from: the returning-client
 * screen keeps its own local flag, while the first-time screen reads
 * `auth.loading` off the slice.
 */

const type = (placeholder, value) =>
  fireEvent.input(screen.getByPlaceholderText(placeholder), { target: { value } });

const submit = () =>
  act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  });

const makeStore = (preloadedState) =>
  configureStore({
    reducer: { auth: authReducer },
    ...(preloadedState ? { preloadedState } : {}),
  });

const renderWith = (ui, store = makeStore()) => ({
  store,
  ...render(
    <Provider store={store}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>
  ),
});

// The shape the thunk stores on a successful login.
const session = {
  data: {
    id: "u1",
    accessToken: "at",
    refreshToken: "rt",
    tenantLinks: [{ id: "tc1", clientId: "cl1", tenantId: "t1" }],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("signing in as a returning client", () => {
  const renderPage = (store) => renderWith(<ClientLogin />, store);

  const fill = () => {
    type("Enter email", "ada@example.com");
    type("Password", "StrongPass1!");
  };

  it("offers the way to a password reset", () => {
    renderPage();
    expect(screen.getByText("Forgot password?").closest("a")).toHaveAttribute(
      "href",
      "/forgotPassword"
    );
  });

  it("refuses a blank form", async () => {
    renderPage();
    await submit();
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining("Email is required"),
      "error"
    );
    expect(authApi.ClientLogin).not.toHaveBeenCalled();
  });

  it("refuses a password shorter than eight characters", async () => {
    renderPage();
    type("Enter email", "ada@example.com");
    type("Password", "short");
    await submit();
    expect(showToast).toHaveBeenCalledWith(
      "Password must be at least 8 characters",
      "error"
    );
    expect(authApi.ClientLogin).not.toHaveBeenCalled();
  });

  it("signs in and lands on the dashboard", async () => {
    authApi.ClientLogin.mockResolvedValue({ data: session });
    const { store } = renderPage();
    fill();
    await submit();

    expect(authApi.ClientLogin).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "StrongPass1!",
    });
    expect(showToast).toHaveBeenCalledWith("Login successful", "success");
    expect(navigate).toHaveBeenCalledWith("/dashboard");
    expect(store.getState().auth.isAuthenticated).toBe(true);
  });

  it("reports the reason the server refused", async () => {
    authApi.ClientLogin.mockRejectedValue({
      response: { data: { message: "Invalid credentials" } },
    });
    renderPage();
    fill();
    await submit();

    expect(showToast).toHaveBeenCalledWith("Invalid credentials", "error");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("unwraps a refusal the server sent as an object", async () => {
    authApi.ClientLogin.mockRejectedValue({
      response: { data: { message: { message: "Account locked" } } },
    });
    renderPage();
    fill();
    await submit();
    expect(showToast).toHaveBeenCalledWith("Account locked", "error");
  });

  it("falls back to a generic refusal when nothing explains it", async () => {
    authApi.ClientLogin.mockRejectedValue({});
    renderPage();
    fill();
    await submit();
    expect(showToast).toHaveBeenCalledWith("Login failed", "error");
  });

  it("holds the button while the sign-in is in flight", async () => {
    let settle;
    authApi.ClientLogin.mockReturnValue(
      new Promise((resolve) => {
        settle = resolve;
      })
    );
    renderPage();
    fill();
    await submit();
    expect(screen.getByRole("button", { name: "Loading" })).toBeDisabled();

    await act(async () => {
      settle({ data: session });
    });
    expect(screen.getByRole("button", { name: "Continue" })).not.toBeDisabled();
  });
});

describe("signing in for the first time", () => {
  const renderPage = (store) => renderWith(<InitialLogin />, store);

  const fill = () => {
    type("Please Enter your email", "ada@example.com");
    type("Enter your Password", "StrongPass1!");
  };

  it("refuses a blank form", async () => {
    renderPage();
    await submit();
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining("Email is required"),
      "error"
    );
    expect(authApi.ClientLogin).not.toHaveBeenCalled();
  });

  it("signs in and sends the client straight to choosing a password", async () => {
    authApi.ClientLogin.mockResolvedValue({ data: session });
    renderPage();
    fill();
    await submit();

    expect(showToast).toHaveBeenCalledWith("Login successful", "success");
    expect(navigate).toHaveBeenCalledWith("/intialResetPassword");
  });

  it("reports the reason the server refused", async () => {
    authApi.ClientLogin.mockRejectedValue({
      response: { data: { message: "Invalid credentials" } },
    });
    renderPage();
    fill();
    await submit();
    expect(showToast).toHaveBeenCalledWith("Invalid credentials", "error");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("unwraps a refusal the server sent as an object", async () => {
    authApi.ClientLogin.mockRejectedValue({
      response: { data: { message: { message: "Account locked" } } },
    });
    renderPage();
    fill();
    await submit();
    expect(showToast).toHaveBeenCalledWith("Account locked", "error");
  });

  it("falls back to a generic refusal when nothing explains it", async () => {
    authApi.ClientLogin.mockRejectedValue({});
    renderPage();
    fill();
    await submit();
    expect(showToast).toHaveBeenCalledWith("Login failed", "error");
  });

  it("takes its spinner from the shared auth state, not a local flag", async () => {
    // Seeded rather than triggered: this page never sets `loading` itself, so
    // the only way it can spin is if it is reading the slice.
    const store = makeStore({
      auth: {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        loading: true,
        error: null,
      },
    });
    renderPage(store);
    expect(screen.getByRole("button", { name: "Loading" })).toBeDisabled();
  });
});

describe("choosing a password on first login", () => {
  const signedIn = (user) => ({
    auth: {
      isAuthenticated: true,
      user,
      accessToken: "at",
      refreshToken: "rt",
      loading: false,
      error: null,
    },
  });

  const linked = signedIn({ id: "u1", tenantLinks: [{ id: "tc1" }] });

  const renderPage = (preloadedState = linked) =>
    renderWith(<InitialResetPassword />, makeStore(preloadedState));

  const fill = (password, confirmPassword) => {
    type("Enter Password", password);
    type("Confirm Password", confirmPassword);
  };

  it("refuses a blank form", async () => {
    renderPage();
    await submit();
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining("Password is required"),
      "error"
    );
    expect(authApi.ClientSetPassword).not.toHaveBeenCalled();
  });

  it("refuses a password that breaks the strength rules", async () => {
    renderPage();
    fill("weakpass", "weakpass");
    await submit();
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining("One uppercase letter"),
      "error"
    );
    expect(authApi.ClientSetPassword).not.toHaveBeenCalled();
  });

  it("refuses a confirmation that does not match", async () => {
    renderPage();
    fill("StrongPass1!", "StrongPass2!");
    await submit();
    expect(showToast).toHaveBeenCalledWith("Passwords must match", "error");
    expect(authApi.ClientSetPassword).not.toHaveBeenCalled();
  });

  it("sets the password against the signed-in client's tenant link", async () => {
    authApi.ClientSetPassword.mockResolvedValue({ data: { message: "all set" } });
    renderPage();
    fill("StrongPass1!", "StrongPass1!");
    await submit();

    expect(authApi.ClientSetPassword).toHaveBeenCalledWith({
      clientTenantId: "tc1",
      password: "StrongPass1!",
    });
    expect(showToast).toHaveBeenCalledWith("all set", "success");
    expect(navigate).toHaveBeenCalledWith("/intialResetSuccessful");
  });

  it("confirms in its own words when the server sends no message", async () => {
    authApi.ClientSetPassword.mockResolvedValue({});
    renderPage();
    fill("StrongPass1!", "StrongPass1!");
    await submit();
    expect(showToast).toHaveBeenCalledWith("Password updated successfully!", "success");
  });

  it("stays put when the server rejects the change", async () => {
    authApi.ClientSetPassword.mockRejectedValue(new Error("link expired"));
    renderPage();
    fill("StrongPass1!", "StrongPass1!");
    await submit();

    expect(showToast).toHaveBeenCalledWith(
      "Password reset failed. Please try again.",
      "error"
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("submits without a tenant link when nobody is signed in", async () => {
    authApi.ClientSetPassword.mockResolvedValue({});
    renderPage(signedIn(null));
    fill("StrongPass1!", "StrongPass1!");
    await submit();
    expect(authApi.ClientSetPassword).toHaveBeenCalledWith({
      clientTenantId: undefined,
      password: "StrongPass1!",
    });
  });

  it("crashes on a signed-in user whose tenant links are missing", () => {
    // Documented, not endorsed: the selector indexes `tenantLinks[0]` without
    // guarding the array itself, so a user record shaped this way takes the
    // page down instead of falling back the way the surrounding chain does.
    expect(() => renderPage(signedIn({ id: "u1" }))).toThrow(TypeError);
  });

  it("confirms the two entries agree", async () => {
    renderPage();
    fill("StrongPass1!", "StrongPass1!");
    await waitFor(() => expect(screen.getByText("✓ Passwords match")).toBeInTheDocument());
  });
});
