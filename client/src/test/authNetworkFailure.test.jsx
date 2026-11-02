import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import axios from "axios";

vi.mock("axios");
vi.mock("../Helper/fingerprint", () => ({ getFingerprint: () => "fp" }));

const showToast = vi.fn();
vi.mock("../Helper/ShowToast", () => ({ showToast: (...a) => showToast(...a) }));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

import ClientLogin from "../Pages/Authentication/Login/ClientLogin";
import InitialLogin from "../Pages/Authentication/NewClientLogin/IntialLogin";
import InitialResetPassword from "../Pages/Authentication/NewClientLogin/IntialResetPassword";
import ForgotPassword from "../Pages/Authentication/ForgotPassword/ForgotPassword";
import authReducer from "../ReduxStore/features/authentication";

/**
 * A timeout or dropped connection on the unauthenticated pages. The real
 * authApis runs against a stubbed axios so the whole path — no response,
 * mapped message, page toast, button released — is exercised end to end.
 */

const NETWORK_MESSAGE = "Can't reach the server. Check your connection and try again.";

const type = (placeholder, value) =>
  fireEvent.input(screen.getByPlaceholderText(placeholder), { target: { value } });

const click = (name) =>
  act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });

const renderWith = (ui, preloadedState) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    ...(preloadedState ? { preloadedState } : {}),
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>
  );
};

const timeout = () =>
  Object.assign(new Error("timeout of 20000ms exceeded"), { code: "ECONNABORTED" });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("auth pages when the server can't be reached", () => {
  it("login shows the connection message and re-enables Continue", async () => {
    axios.post.mockRejectedValue(timeout());
    renderWith(<ClientLogin />);
    type("Enter email", "ada@example.com");
    type("Password", "StrongPass1!");
    await click("Continue");

    expect(axios.post.mock.calls[0][2]).toMatchObject({ timeout: 20000 });
    expect(showToast).toHaveBeenCalledWith(NETWORK_MESSAGE, "error");
    expect(screen.getByRole("button", { name: "Continue" })).not.toBeDisabled();
  });

  it("first login shows the connection message and re-enables Continue", async () => {
    axios.post.mockRejectedValue(new Error("Network Error"));
    renderWith(<InitialLogin />);
    type("Please Enter your email", "ada@example.com");
    type("Enter your Password", "StrongPass1!");
    await click("Continue");

    expect(showToast).toHaveBeenCalledWith(NETWORK_MESSAGE, "error");
    expect(screen.getByRole("button", { name: "Continue" })).not.toBeDisabled();
  });

  it("first-login password choice shows the connection message", async () => {
    axios.patch.mockRejectedValue(new Error("Network Error"));
    renderWith(<InitialResetPassword />, {
      auth: {
        isAuthenticated: true,
        user: { id: "u1", tenantLinks: [{ id: "tc1" }] },
        accessToken: "at",
        refreshToken: "rt",
        loading: false,
        error: null,
      },
    });
    type("Enter Password", "StrongPass1!");
    type("Confirm Password", "StrongPass1!");
    await click("Continue");

    expect(showToast).toHaveBeenCalledWith(NETWORK_MESSAGE, "error");
    expect(screen.getByRole("button", { name: "Continue" })).not.toBeDisabled();
  });

  it("forgot password shows the connection message and re-enables the button", async () => {
    axios.patch.mockRejectedValue(timeout());
    renderWith(<ForgotPassword />);
    type("Enter your email", "ada@example.com");
    await click("Reset password");

    expect(showToast).toHaveBeenCalledWith(NETWORK_MESSAGE, "error");
    expect(screen.getByRole("button", { name: "Reset password" })).not.toBeDisabled();
  });
});
