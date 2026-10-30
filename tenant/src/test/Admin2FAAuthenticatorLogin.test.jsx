import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The authenticator challenge that stands between a successful password login
 * and the dashboard: six code boxes, a verification call, and a "can't access
 * your app?" escape hatch that swaps the whole panel for a role-aware recovery
 * message.
 *
 * Unlike the forgot-password variant of this screen, everything it needs is
 * already in the auth slice -- the user id it verifies against and the tokens it
 * opens the socket with both come from redux, so the store here is real.
 *
 * The boxes write into a single hidden react-hook-form field, and validation is
 * deliberately deferred until all six are filled so a half-typed code is never
 * scolded mid-entry.
 *
 * The subject's filename carries a stray second dot, so the import path ends in
 * one too -- that is not a typo here.
 */

const api = vi.hoisted(() => ({ Admin2FAVerify: vi.fn() }));
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

import Admin2FAAuthenticatorLogin from "../Pages/Authentication/Login/Admin2FAAuthenticatorLogin.";

const signedInUser = (over = {}) => ({
  id: "u-1",
  tenantId: "t-1",
  accessToken: "at",
  refreshToken: "rt",
  role: { name: "Admin" },
  ...over,
});

const store = (user) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user,
      },
    },
  });

const renderPage = (user = signedInUser()) =>
  render(
    <Provider store={store(user)}>
      <Admin2FAAuthenticatorLogin />
    </Provider>
  );

const boxes = () => Array.from(document.body.querySelectorAll(".code-input"));

const typeCode = (digits) => {
  digits.split("").forEach((digit, index) => {
    fireEvent.change(boxes()[index], { target: { value: digit } });
  });
};

const paste = (text) =>
  fireEvent.paste(boxes()[0], { clipboardData: { getData: () => text } });

const submitForm = () =>
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

const verifyWith = async (digits = "123456") => {
  typeCode(digits);
  submitForm();
  await waitFor(() => expect(api.Admin2FAVerify).toHaveBeenCalled());
};

beforeEach(() => {
  vi.clearAllMocks();
  api.Admin2FAVerify.mockResolvedValue({ data: { status: "ok" } });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("filling in the code boxes", () => {
  it("carries focus forward as each digit lands", () => {
    renderPage();
    fireEvent.change(boxes()[0], { target: { value: "4" } });
    expect(document.activeElement).toBe(boxes()[1]);
  });

  it("leaves focus on the last box", () => {
    renderPage();
    typeCode("12345");
    fireEvent.change(boxes()[5], { target: { value: "6" } });
    expect(boxes()[5]).toHaveValue("6");
    expect(document.activeElement).toBe(boxes()[5]);
  });

  it("ignores anything that is not a single digit", () => {
    renderPage();
    fireEvent.change(boxes()[0], { target: { value: "no" } });
    expect(boxes()[0]).toHaveValue("");
  });

  it("steps back on backspace in an empty box", () => {
    renderPage();
    fireEvent.keyDown(boxes()[4], { key: "Backspace" });
    expect(document.activeElement).toBe(boxes()[3]);
  });

  it("stays put on backspace in a box that still holds a digit", () => {
    renderPage();
    typeCode("1");
    boxes()[0].focus();
    fireEvent.keyDown(boxes()[0], { key: "Backspace" });
    expect(document.activeElement).toBe(boxes()[0]);
  });

  it("stays put on any other key", () => {
    renderPage();
    boxes()[2].focus();
    fireEvent.keyDown(boxes()[2], { key: "Enter" });
    expect(document.activeElement).toBe(boxes()[2]);
  });

  it("spreads a pasted code across the boxes and strips its separators", () => {
    renderPage();
    paste("98-76 54");
    expect(boxes().map((b) => b.value)).toEqual(["9", "8", "7", "6", "5", "4"]);
    expect(document.activeElement).toBe(boxes()[5]);
  });

  it("pads a short paste and leaves the code unjudged", () => {
    renderPage();
    paste("98");
    expect(boxes().map((b) => b.value)).toEqual(["9", "8", "", "", "", ""]);
    expect(document.body.querySelector(".auth-error-message")).toBeNull();
  });

  it("survives a paste with no digits in it", () => {
    renderPage();
    paste("??");
    expect(boxes().map((b) => b.value)).toEqual(["", "", "", "", "", ""]);
  });

  it("stops complaining once a corrected code is complete again", async () => {
    renderPage();
    typeCode("123");
    submitForm();
    expect(
      await screen.findByText("OTP must be a 6-digit number")
    ).toBeInTheDocument();
    typeCode("123456");
    await waitFor(() =>
      expect(
        screen.queryByText("OTP must be a 6-digit number")
      ).not.toBeInTheDocument()
    );
  });
});

describe("validation before anything is sent", () => {
  it("refuses an empty code", async () => {
    renderPage();
    submitForm();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("OTP is required", "error")
    );
    expect(api.Admin2FAVerify).not.toHaveBeenCalled();
  });

  it("refuses a half-typed code and marks the boxes", async () => {
    renderPage();
    typeCode("12");
    submitForm();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("OTP must be a 6-digit number", "error")
    );
    expect(boxes()[0]).toHaveClass("input-error");
    expect(api.Admin2FAVerify).not.toHaveBeenCalled();
  });
});

describe("verifying the code", () => {
  it("opens the socket and lands on the dashboard", async () => {
    renderPage();
    await verifyWith("123456");
    expect(api.Admin2FAVerify).toHaveBeenCalledWith({
      userId: "u-1",
      token: "123456",
    });
    expect(toast).toHaveBeenCalledWith("OTP verification successful!", "success");
    await waitFor(() =>
      expect(socket.connectSocket).toHaveBeenCalledWith({
        accessToken: "at",
        userId: "u-1",
        tenantId: "t-1",
      })
    );
    expect(navigate).toHaveBeenCalledWith("/dashboard");
  });

  it("treats a non-ok response as a refusal", async () => {
    api.Admin2FAVerify.mockResolvedValue({ data: { status: "denied" } });
    renderPage();
    await verifyWith();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Verification failed.", "error")
    );
    expect(navigate).not.toHaveBeenCalled();
    expect(socket.connectSocket).not.toHaveBeenCalled();
  });

  it("shows the message a failed call returned", async () => {
    api.Admin2FAVerify.mockRejectedValue({
      response: { data: { message: "Too many attempts" } },
    });
    renderPage();
    await verifyWith();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Too many attempts", "error")
    );
  });

  it("falls back to generic copy when the failure carried no message", async () => {
    api.Admin2FAVerify.mockRejectedValue(new Error("socket hang up"));
    renderPage();
    await verifyWith();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Verification failed.", "error")
    );
  });

  it("leaves the boxes usable for another attempt", async () => {
    api.Admin2FAVerify.mockRejectedValue(new Error("nope"));
    renderPage();
    await verifyWith();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled()
    );
    expect(boxes()).toHaveLength(6);
  });
});

describe("the recovery escape hatch", () => {
  it("swaps the code panel for a support message an admin can act on", () => {
    renderPage();
    fireEvent.click(screen.getByText("Can't access your authenticator app?"));
    expect(screen.getByText("Unable to verify your identity")).toBeInTheDocument();
    expect(screen.getByText("support@noospherehub.com")).toBeInTheDocument();
    expect(boxes()).toHaveLength(0);
  });

  it("points a non-admin at their own administrator instead", () => {
    renderPage(signedInUser({ role: { name: "Clinician" } }));
    fireEvent.click(screen.getByText("Can't access your authenticator app?"));
    expect(
      screen.getByText(/contact your system administrator/)
    ).toBeInTheDocument();
  });

  it("comes back to the code boxes", () => {
    renderPage();
    fireEvent.click(screen.getByText("Can't access your authenticator app?"));
    fireEvent.click(screen.getByRole("button", { name: "I understand" }));
    expect(boxes()).toHaveLength(6);
  });
});
