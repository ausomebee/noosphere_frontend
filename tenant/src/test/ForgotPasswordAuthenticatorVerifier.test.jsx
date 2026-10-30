import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The authenticator check that guards the forgot-password flow: six code boxes,
 * then a result screen that either offers a login link or the role-aware
 * "we cannot verify you" card.
 *
 * The user is not signed in yet at this point, so both the user id and the role
 * arrive as react-router navigation state and only fall back to the auth slice
 * for an already-authenticated entry point. Each of those two fallbacks is
 * exercised separately here, because the role is what decides whether the
 * failure card points at our support desk or at the tenant's own administrator.
 *
 * The boxes are wired to a single hidden react-hook-form field: every keystroke
 * writes the joined string, but validation is deliberately deferred until all
 * six boxes are filled, so the "6-digit number" complaint only ever appears on
 * submit or once the code is complete.
 */

const api = vi.hoisted(() => ({ Admin2FAVerify: vi.fn() }));
vi.mock("../api/authApis", () => ({ default: api }));

const toast = vi.hoisted(() => ({ showToast: vi.fn(), showApiError: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...args) => toast.showToast(...args),
  showApiError: (...args) => toast.showApiError(...args),
}));

const routing = vi.hoisted(() => ({ navigate: vi.fn(), location: { state: null } }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => routing.navigate,
  useLocation: () => routing.location,
}));

import ForgotPasswordAuthenticatorVerifier from "../Pages/Authentication/ForgotPassword/ForgotPasswordAuthenticatorVerifier";

const store = (user = null) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: Boolean(user),
        loading: false,
        error: null,
        token: null,
        user,
      },
    },
  });

const renderPage = (user) =>
  render(
    <Provider store={store(user)}>
      <ForgotPasswordAuthenticatorVerifier />
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
  routing.location = { state: { userId: "state-user", role: { name: "Admin" } } };
  api.Admin2FAVerify.mockResolvedValue({ data: { status: "ok" } });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("where the user id comes from", () => {
  it("prefers the id the previous step navigated with", async () => {
    renderPage({ id: "store-user", role: { name: "Owner" } });
    await verifyWith("123456");
    expect(api.Admin2FAVerify).toHaveBeenCalledWith({
      userId: "state-user",
      token: "123456",
    });
  });

  it("falls back to the signed-in user when there is no navigation state", async () => {
    routing.location = { state: null };
    renderPage({ id: "store-user" });
    await verifyWith("654321");
    expect(api.Admin2FAVerify).toHaveBeenCalledWith({
      userId: "store-user",
      token: "654321",
    });
  });
});

describe("filling in the code boxes", () => {
  it("carries focus forward as each digit lands", () => {
    renderPage();
    fireEvent.change(boxes()[0], { target: { value: "1" } });
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
    fireEvent.change(boxes()[0], { target: { value: "ab" } });
    expect(boxes()[0]).toHaveValue("");
    expect(document.activeElement).not.toBe(boxes()[1]);
  });

  it("steps back on backspace in an empty box", () => {
    renderPage();
    fireEvent.keyDown(boxes()[3], { key: "Backspace" });
    expect(document.activeElement).toBe(boxes()[2]);
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
    boxes()[3].focus();
    fireEvent.keyDown(boxes()[3], { key: "ArrowLeft" });
    expect(document.activeElement).toBe(boxes()[3]);
  });

  it("spreads a pasted code across the boxes and strips its separators", () => {
    renderPage();
    paste("12 34-56");
    expect(boxes().map((b) => b.value)).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(document.activeElement).toBe(boxes()[5]);
  });

  it("pads a short paste and leaves the code unjudged", () => {
    renderPage();
    paste("99");
    expect(boxes().map((b) => b.value)).toEqual(["9", "9", "", "", "", ""]);
    expect(document.body.querySelector(".auth-error-message")).toBeNull();
  });

  it("survives a paste with no digits in it", () => {
    renderPage();
    paste("----");
    expect(boxes().map((b) => b.value)).toEqual(["", "", "", "", "", ""]);
  });
});

describe("validation before anything is sent", () => {
  it("refuses an empty code", async () => {
    renderPage();
    submitForm();
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("OTP is required", "error")
    );
    expect(api.Admin2FAVerify).not.toHaveBeenCalled();
  });

  it("refuses a half-typed code and marks the boxes", async () => {
    renderPage();
    typeCode("123");
    submitForm();
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        "OTP must be a 6-digit number",
        "error"
      )
    );
    expect(screen.getByText("OTP must be a 6-digit number")).toBeInTheDocument();
    expect(boxes()[0]).toHaveClass("input-error");
    expect(api.Admin2FAVerify).not.toHaveBeenCalled();
  });
});

describe("the result screen", () => {
  it("celebrates an accepted code and offers the login link", async () => {
    renderPage();
    await verifyWith();
    expect(await screen.findByText("Verification successful!")).toBeInTheDocument();
    expect(toast.showToast).toHaveBeenCalledWith(
      "OTP verification successful!",
      "success"
    );
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(routing.navigate).toHaveBeenCalledWith("/");
  });

  it("treats a non-ok response as a failure", async () => {
    api.Admin2FAVerify.mockResolvedValue({ data: { status: "denied" } });
    renderPage();
    await verifyWith();
    expect(
      await screen.findByText("Unable to verify your identity")
    ).toBeInTheDocument();
    expect(toast.showApiError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Verification failed." }),
      "DEFAULT"
    );
  });

  it("reports a failed call through the shared API error helper", async () => {
    const failure = new Error("gateway timeout");
    api.Admin2FAVerify.mockRejectedValue(failure);
    renderPage();
    await verifyWith();
    expect(
      await screen.findByText("Unable to verify your identity")
    ).toBeInTheDocument();
    expect(toast.showApiError).toHaveBeenCalledWith(failure, "DEFAULT");
  });

  it("points an admin at the support desk", async () => {
    api.Admin2FAVerify.mockResolvedValue({ data: { status: "denied" } });
    renderPage();
    await verifyWith();
    expect(await screen.findByText("support@noospherehub.com")).toBeInTheDocument();
  });

  it("points a staff member at their own administrator", async () => {
    routing.location = { state: { userId: "state-user", role: { name: "Clinician" } } };
    api.Admin2FAVerify.mockResolvedValue({ data: { status: "denied" } });
    renderPage();
    await verifyWith();
    expect(
      await screen.findByText(/contact your system administrator/)
    ).toBeInTheDocument();
  });

  it("reads the role off the auth slice when navigation state carries none", async () => {
    // `??` rather than `||`, so an explicitly null role in state still defers to
    // the store rather than being treated as "unknown".
    routing.location = { state: { userId: "state-user" } };
    api.Admin2FAVerify.mockResolvedValue({ data: { status: "denied" } });
    renderPage({ id: "store-user", role: { name: "Owner" } });
    await verifyWith();
    expect(await screen.findByText("support@noospherehub.com")).toBeInTheDocument();
  });

  it("sends a rejected user back to a fresh set of boxes", async () => {
    api.Admin2FAVerify.mockResolvedValue({ data: { status: "denied" } });
    renderPage();
    await verifyWith("123456");
    fireEvent.click(await screen.findByRole("button", { name: "Try Again" }));
    expect(boxes()).toHaveLength(6);
    // The digits are kept, so a mistyped code can be corrected rather than
    // retyped from scratch.
    expect(boxes().map((b) => b.value)).toEqual(["1", "2", "3", "4", "5", "6"]);
  });
});
